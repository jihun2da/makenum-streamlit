"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ActivityLog, ActivityEventType } from "@/lib/types";

const EVENT_LABELS: Record<ActivityEventType, string> = {
  status_change:        "상태 변경",
  re_upload:            "재업로드(변경)",
  re_upload_no_change:  "재업로드(동일)",
  new_upload:           "신규 업로드",
};

const EVENT_COLORS: Record<ActivityEventType, string> = {
  status_change:        "bg-blue-100 text-blue-800",
  re_upload:            "bg-orange-100 text-orange-800",
  re_upload_no_change:  "bg-gray-100 text-gray-600",
  new_upload:           "bg-green-100 text-green-800",
};

interface Props {
  managers: string[];
}

export default function ActivityLogPanel({ managers }: Props) {
  const [logs,          setLogs]          = useState<ActivityLog[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filterManager, setFilterManager] = useState("");
  const [filterEvent,   setFilterEvent]   = useState<ActivityEventType | "">("");
  const [filterDate,    setFilterDate]    = useState("");
  const [search,        setSearch]        = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filterManager) q = q.eq("manager_code", filterManager);
      if (filterEvent)   q = q.eq("event_type",   filterEvent);
      if (filterDate)    q = q.gte("created_at",  filterDate + "T00:00:00");

      const { data, error } = await q;
      if (error) throw error;
      setLogs((data as ActivityLog[]) || []);
    } finally {
      setLoading(false);
    }
  }, [filterManager, filterEvent, filterDate]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const displayedLogs = search.trim()
    ? logs.filter((l) => {
        const q = search.toLowerCase();
        return (
          (l.order_no      ?? "").toLowerCase().includes(q) ||
          (l.product_name  ?? "").toLowerCase().includes(q) ||
          (l.manager_code  ?? "").toLowerCase().includes(q) ||
          (l.old_value     ?? "").toLowerCase().includes(q) ||
          (l.new_value     ?? "").toLowerCase().includes(q)
        );
      })
    : logs;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="space-y-3">
      {/* 필터 바 */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="주문번호 / 상품명 검색..."
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        <select
          value={filterManager}
          onChange={(e) => setFilterManager(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="">전체 담당자</option>
          {managers.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value as ActivityEventType | "")}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="">전체 이벤트</option>
          {(Object.keys(EVENT_LABELS) as ActivityEventType[]).map((k) => (
            <option key={k} value={k}>{EVENT_LABELS[k]}</option>
          ))}
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
        />

        <button
          onClick={() => { setFilterManager(""); setFilterEvent(""); setFilterDate(""); setSearch(""); }}
          className="text-xs text-blue-600 hover:underline px-2"
        >
          초기화
        </button>

        <button
          onClick={loadLogs}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          새로고침
        </button>
      </div>

      {/* 건수 요약 */}
      <p className="text-xs text-gray-400">총 {displayedLogs.length}건</p>

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">로딩 중...</div>
      ) : displayedLogs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">변경 이력이 없습니다.</div>
      ) : (
        <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {["일시","이벤트","담당자","주문번호","상품명","변경 전","변경 후","비고"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedLogs.map((log, i) => (
                <tr
                  key={log.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_COLORS[log.event_type]}`}>
                      {EVENT_LABELS[log.event_type]}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                    {log.manager_code ?? "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                    {log.order_no ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                    {log.product_name ?? "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                    {log.old_value ?? "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-800 font-medium">
                    {log.new_value ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs max-w-[200px] truncate">
                    {log.note ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
