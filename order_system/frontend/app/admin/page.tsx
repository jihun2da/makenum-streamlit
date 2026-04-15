"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ActivityLog, ActivityEventType } from "@/lib/types";

const ADMIN_EMAIL = "jihun2da@naver.com";

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

const EVENT_BG: Record<ActivityEventType, string> = {
  status_change:        "bg-blue-50 border-blue-200 text-blue-700",
  re_upload:            "bg-orange-50 border-orange-200 text-orange-700",
  re_upload_no_change:  "bg-gray-50 border-gray-200 text-gray-600",
  new_upload:           "bg-green-50 border-green-200 text-green-700",
};

export default function AdminPage() {
  const router = useRouter();
  const [adminEmail,    setAdminEmail]    = useState<string | null>(null);
  const [logs,          setLogs]          = useState<ActivityLog[]>([]);
  const [managers,      setManagers]      = useState<string[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filterManager, setFilterManager] = useState("");
  const [filterEvent,   setFilterEvent]   = useState<ActivityEventType | "">("");
  const [filterDate,    setFilterDate]    = useState("");
  const [search,        setSearch]        = useState("");

  // ── 관리자 권한 확인 ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      if (session.user.email !== ADMIN_EMAIL) {
        router.replace("/orders");
        return;
      }
      setAdminEmail(session.user.email);
    });
  }, [router]);

  // ── 담당자 목록 ──
  useEffect(() => {
    supabase.from("managers").select("code").eq("is_active", true).order("code")
      .then(({ data }) => { if (data) setManagers(data.map((m) => m.code)); });
  }, []);

  // ── 변경이력 로드 ──
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
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

  useEffect(() => {
    if (adminEmail) loadLogs();
  }, [adminEmail, loadLogs]);

  // ── 검색 필터 ──
  const displayedLogs = search.trim()
    ? logs.filter((l) => {
        const q = search.toLowerCase();
        return (
          (l.order_no     ?? "").toLowerCase().includes(q) ||
          (l.product_name ?? "").toLowerCase().includes(q) ||
          (l.manager_code ?? "").toLowerCase().includes(q) ||
          (l.old_value    ?? "").toLowerCase().includes(q) ||
          (l.new_value    ?? "").toLowerCase().includes(q) ||
          (l.note         ?? "").toLowerCase().includes(q)
        );
      })
    : logs;

  // ── 통계 집계 ──
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((l) => l.created_at.startsWith(todayStr));
  const stats: Record<ActivityEventType, number> = {
    status_change: 0, re_upload: 0, re_upload_no_change: 0, new_upload: 0,
  };
  logs.forEach((l) => { stats[l.event_type] = (stats[l.event_type] ?? 0) + 1; });

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  if (!adminEmail) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        권한 확인 중...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── 헤더 ── */}
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs bg-yellow-400 text-gray-900 font-bold px-2 py-0.5 rounded-full">ADMIN</span>
          <h1 className="text-lg font-bold">시스템 관리자 대시보드</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{adminEmail}</span>
          <button
            onClick={() => router.push("/orders")}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            주문 관리로
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-screen-2xl mx-auto w-full space-y-6">

        {/* ── 통계 카드 ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* 오늘 총 이벤트 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">오늘 활동</p>
            <p className="text-3xl font-bold text-gray-800">{todayLogs.length}</p>
            <p className="text-xs text-gray-400 mt-1">건</p>
          </div>
          {/* 이벤트 타입별 */}
          {(Object.keys(EVENT_LABELS) as ActivityEventType[]).map((evt) => (
            <div
              key={evt}
              className={`rounded-xl border shadow-sm p-4 ${EVENT_BG[evt]}`}
            >
              <p className="text-xs mb-1 opacity-70">{EVENT_LABELS[evt]}</p>
              <p className="text-3xl font-bold">{stats[evt]}</p>
              <p className="text-xs opacity-60 mt-1">누적</p>
            </div>
          ))}
        </div>

        {/* ── 변경이력 테이블 ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-gray-800">전체 변경 이력</h2>
            <button
              onClick={loadLogs}
              className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition"
            >
              새로고침
            </button>
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="주문번호 / 상품명 / 담당자 검색..."
              className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
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
          </div>

          <p className="text-xs text-gray-400">총 {displayedLogs.length}건 표시 중</p>

          {/* 테이블 */}
          {loading ? (
            <div className="text-center py-16 text-gray-400">데이터 로딩 중...</div>
          ) : displayedLogs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">변경 이력이 없습니다.</div>
          ) : (
            <div className="overflow-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {["일시","이벤트","담당자","주문번호","상품명","변경 전","변경 후","비고"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200"
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
                      className={`border-b border-gray-100 hover:bg-blue-50/30 transition ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-400 text-xs">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_COLORS[log.event_type]}`}>
                          {EVENT_LABELS[log.event_type]}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {log.manager_code ?? "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-mono text-xs">
                        {log.order_no ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={log.product_name ?? ""}>
                        {log.product_name ?? "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-400 text-xs">
                        {log.old_value ?? "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-800 font-semibold text-xs">
                        {log.new_value ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs max-w-[220px] truncate" title={log.note ?? ""}>
                        {log.note ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
