"use client";
import { useState, useRef, useEffect } from "react";
import { uploadExcel, getUploadStatus } from "@/lib/api";

interface Props { onSuccess: () => void; }

export default function UploadSection({ onSuccess }: Props) {
  const [file,     setFile]     = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<{ success: boolean; msg: string } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = (uploadId: string) => {
    let attempts = 0;
    const MAX = 120;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const status = await getUploadStatus(uploadId);
        if (!status.processing) {
          stopPolling();
          setLoading(false);
          setProgress(null);
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";
          if (status.success) {
            setResult({
              success: true,
              msg: `완료 — 신규 ${status.inserted}건, 수정 ${status.updated}건 (총 ${status.rows}행)`,
            });
            onSuccess();
          } else {
            setResult({ success: false, msg: status.error || "처리 실패" });
          }
        } else {
          setProgress(`백그라운드 처리 중... (${attempts * 5}초 경과)`);
        }
      } catch {
        if (attempts >= MAX) {
          stopPolling();
          setLoading(false);
          setProgress(null);
          setResult({ success: false, msg: "처리 시간 초과. 업로드 이력을 확인해 주세요." });
        }
      }
    }, 5000);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setProgress(null);
    try {
      const res = await uploadExcel(file);
      if (res.processing) {
        setProgress("파일 수신 완료. 백그라운드에서 처리 중...");
        startPolling(res.upload_id);
      } else {
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        setLoading(false);
        setResult({
          success: true,
          msg: `완료 — 신규 ${res.inserted}건, 수정 ${res.updated}건${
            res.errors?.length ? ` (오류 ${res.errors.length}건)` : ""
          }`,
        });
        onSuccess();
      }
    } catch (e: unknown) {
      setLoading(false);
      setResult({ success: false, msg: String(e instanceof Error ? e.message : e) });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="font-semibold text-gray-700 mb-3">엑셀 업로드</h2>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 transition"
        >
          {loading ? "처리 중..." : "업로드 실행"}
        </button>
      </div>

      {progress && (
        <div className="mt-3 px-3 py-2 rounded-lg text-sm bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-2">
          <span className="inline-block">⏳</span> {progress}
        </div>
      )}

      {result && (
        <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${
          result.success
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}
