"use client";

// Reports — laid out like the 360 report pages: title card with a report
// picker, filters, Search / Clear, show-entries, PDF / Excel / Print,
// green-headed table with a grey totals row and pagination.

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { REPORTS } from "@/lib/reportsCatalog";
import { btn, EmptyRow, filterInput, labelClass, ListCard, tdClass, thClass, theadClass, totalRowClass } from "@/components/ui/Application/Admin/kit";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const firstOfMonth = () => `${today().slice(0, 7)}-01`;
const money = (n) => Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isNum = (t) => t === "money" || t === "qty";
const fmt = (type, v) =>
  v === null || v === undefined || v === ""
    ? ""
    : type === "money"
      ? `£${money(v)}`
      : type === "qty"
        ? Number(v).toLocaleString("en-GB", { maximumFractionDigits: 2 })
        : type === "date"
          ? new Date(`${v}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : String(v);
const BADGE = { Paid: "bg-[#10b759]", Due: "bg-[#f1556c]" };
const QUICK = ["daily-sales", "master-sales", "item-sales", "monthly-sales", "customer-due", "profit-loss"];
const GROUPS = Object.entries(REPORTS).reduce((g, [key, r]) => ((g[r.group] ||= []).push([key, r.title]), g), {});
const grp = "flex h-[34px] items-center gap-[5px] bg-[#6c757d] px-[12px] text-[13px] text-white transition hover:bg-[#5a6268]";

function download(name, text, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ReportsPage() {
  const [report, setReport] = useState("daily-sales");
  const init = { from: firstOfMonth(), to: today(), type: "", payment: "", year: today().slice(0, 4) };
  const [draft, setDraft] = useState(init);
  const [q, setQ] = useState(init);
  const [find, setFind] = useState("");
  const [sort, setSort] = useState(null);
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("r");
    if (r && REPORTS[r]) setReport(r);
  }, []);

  const pick = (key) => {
    setReport(key);
    setPage(1);
    setFind("");
    setSort(null);
    window.history.replaceState(null, "", `?r=${key}`);
  };

  const { data, isFetching, error } = useQuery({
    queryKey: ["report", report, q],
    queryFn: async () => (await axios.get(`/api/admin/reports/${report}`, { params: q })).data?.data,
    placeholderData: (prev) => prev,
  });

  const def = REPORTS[report];
  const ready = data?.key === report;
  const cols = ready ? data.columns : [];
  const totals = ready ? data.totals || {} : {};
  const rows = useMemo(() => {
    let list = ready ? data.rows : [];
    const t = find.trim().toLowerCase();
    if (t) list = list.filter((r) => cols.some(([k]) => String(r[k] ?? "").toLowerCase().includes(t)));
    if (sort) {
      const [k, dir, type] = sort;
      list = [...list].sort((a, b) => dir * (isNum(type) ? (Number(a[k]) || 0) - (Number(b[k]) || 0) : String(a[k] ?? "").localeCompare(String(b[k] ?? ""), undefined, { numeric: true })));
    }
    return list;
  }, [data, ready, find, sort, cols]);

  const size = perPage === "all" ? rows.length || 1 : perPage;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * size, cur * size);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const period = def.filters.includes("year") ? `Year ${q.year}` : def.filters.includes("dates") ? `${fmt("date", q.from)} – ${fmt("date", q.to)}` : `As of ${fmt("date", today())}`;

  const exportCsv = (ext) => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Sl", ...cols.map((c) => c[1])].map(esc).join(",")];
    rows.forEach((r, i) => lines.push([i + 1, ...cols.map(([k, , t]) => (isNum(t) ? r[k] ?? "" : fmt(t, r[k])))].map(esc).join(",")));
    if (Object.keys(totals).length) lines.push(["Total", ...cols.map(([k]) => totals[k] ?? "")].map(esc).join(","));
    download(`${def.title}.${ext}`, "﻿" + lines.join("\r\n"), ext === "csv" ? "text/csv" : "application/vnd.ms-excel");
  };

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const al = (t) => (isNum(t) ? "right" : "left");
    const head = `<tr><th>Sl</th>${cols.map(([, l, t]) => `<th style="text-align:${al(t)}">${l}</th>`).join("")}</tr>`;
    const body = rows.map((r, i) => `<tr><td>${i + 1}</td>${cols.map(([k, , t]) => `<td style="text-align:${al(t)}">${fmt(t, r[k])}</td>`).join("")}</tr>`).join("");
    const foot = Object.keys(totals).length ? `<tr class="t"><td>Total</td>${cols.map(([k, , t]) => `<td style="text-align:right">${k in totals ? fmt(t, totals[k]) : ""}</td>`).join("")}</tr>` : "";
    w.document.write(`<!doctype html><html><head><title>${def.title}</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#212529}h1{margin:0;font-size:20px;text-align:center}p{margin:4px 0 14px;text-align:center;color:#555;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:12px}th{background:#00801a;color:#fff;padding:6px 8px;border:1px solid #ebeff2}
      td{padding:6px 8px;border:1px solid #dfe3e8}.t td{font-weight:bold;background:#cbd5e1}
    </style></head><body><h1>Shawon Food Gate</h1><p>179 Forest Ln, London E7 9BB · 020 3995 6692</p><h1 style="font-size:16px">${def.title}</h1><p>${period}</p>
    <table><thead>${head}</thead><tbody>${body || `<tr><td colspan="${cols.length + 1}" style="text-align:center">No data</td></tr>`}${foot}</tbody></table>
    <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-[18px] pb-8">
      <ListCard
        title={def.title}
        actions={
          <select className={`${filterInput} w-full sm:w-[260px]`} value={report} onChange={(e) => pick(e.target.value)} aria-label="Change report">
            {Object.entries(GROUPS).map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map(([key, title]) => <option key={key} value={key}>{title}</option>)}
              </optgroup>
            ))}
          </select>
        }
      >
        {/* most used reports */}
        <div className="mb-[16px] flex flex-wrap gap-[6px]">
          {QUICK.map((k) => (
            <button key={k} type="button" onClick={() => pick(k)}
              className={`rounded-[6px] border px-[12px] py-[5px] text-[13px] transition ${report === k ? "border-[#1bab70] bg-[#e2f6eb] font-semibold text-[#15965f]" : "border-[#e3e3e3] bg-white text-[#495057] hover:border-[#1bab70]"}`}>
              {REPORTS[k].title.replace(" Report", "").replace(" Summary", "")}
            </button>
          ))}
        </div>

        {def.filters.length > 0 && (
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(draft); }}>
            <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-4">
              {def.filters.includes("dates") && (
                <>
                  <label><span className={labelClass}>From Date</span><input type="date" className={filterInput} value={draft.from} onChange={(e) => set("from", e.target.value)} /></label>
                  <label><span className={labelClass}>To Date</span><input type="date" className={filterInput} value={draft.to} onChange={(e) => set("to", e.target.value)} /></label>
                </>
              )}
              {def.filters.includes("year") && (
                <label><span className={labelClass}>Year</span>
                  <select className={filterInput} value={draft.year} onChange={(e) => set("year", e.target.value)}>
                    {Array.from({ length: 6 }, (_, i) => String(Number(today().slice(0, 4)) - i)).map((y) => <option key={y}>{y}</option>)}
                  </select>
                </label>
              )}
              {def.filters.includes("type") && (
                <label><span className={labelClass}>Order Type</span>
                  <select className={filterInput} value={draft.type} onChange={(e) => set("type", e.target.value)}>
                    <option value="">All Type</option><option value="dine_in">Dine In</option><option value="takeaway">Takeaway</option><option value="pickup">Collection</option><option value="delivery">Delivery</option>
                  </select>
                </label>
              )}
              {def.filters.includes("payment") && (
                <label><span className={labelClass}>Payment Status</span>
                  <select className={filterInput} value={draft.payment} onChange={(e) => set("payment", e.target.value)}>
                    <option value="">All</option><option value="paid">Paid</option><option value="pending">Due</option>
                  </select>
                </label>
              )}
            </div>
            <div className="mt-[14px] flex justify-center gap-[10px]">
              <button type="submit" className={`${btn.info} min-w-[80px]`}>Search</button>
              <button type="button" className={`${btn.warning} min-w-[80px]`} onClick={() => { setDraft(init); setQ(init); setPage(1); setFind(""); setSort(null); }}>Clear</button>
            </div>
          </form>
        )}

        <div className="mt-[20px] flex flex-wrap items-center justify-between gap-[10px]">
          <div className="flex flex-wrap items-center gap-[10px]">
            <label className="flex items-center gap-[6px] text-[14px] text-[#343a40]">Show
              <select className="h-[34px] border border-[#ced4da] bg-white px-[8px] text-[14px]" value={perPage} onChange={(e) => { setPerPage(e.target.value === "all" ? "all" : Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}<option value="all">All</option>
              </select> entries
            </label>
            <div className="flex flex-wrap">
              <button type="button" className={grp} onClick={print}><FileText size={13} /> PDF</button>
              <button type="button" className={grp} onClick={() => exportCsv("xls")}><FileSpreadsheet size={13} /> Excel</button>
              <button type="button" className={grp} onClick={() => exportCsv("csv")}><FileText size={13} /> CSV</button>
              <button type="button" className={grp} onClick={print}><Printer size={13} /> Print</button>
            </div>
            {isFetching && <span className="text-[12px] text-[#98a6ad]">Refreshing…</span>}
          </div>
          <label className="flex w-full items-center gap-[6px] bg-[#188ae2] px-[6px] py-[4px] text-[14px] text-white sm:w-auto">Search:
            <input className="h-[30px] min-w-0 flex-1 sm:w-[160px] sm:flex-none border-0 bg-white px-[8px] text-[14px] text-[#212529] outline-none" value={find} onChange={(e) => { setFind(e.target.value); setPage(1); }} aria-label="Search table" />
          </label>
        </div>

        {error && <p className="mt-3 text-[14px] text-rose-600">{error.response?.data?.message || error.message}</p>}

        <div className="mt-[12px] overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: Math.max(720, (cols.length + 1) * 105) }}>
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>Sl</th>
                {cols.map(([k, label, type]) => (
                  <th key={k} onClick={() => setSort((s) => (s?.[0] === k ? [k, -s[1], type] : [k, 1, type]))} className={`${thClass} cursor-pointer select-none ${isNum(type) ? "!text-right" : ""}`}>
                    {label}<span className="ml-[4px] text-[10px] opacity-70">{sort?.[0] === k ? (sort[1] > 0 ? "▲" : "▼") : "⇅"}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!ready && !error && [1, 2, 3].map((i) => <tr key={i}><td colSpan={9} className={tdClass}><div className="h-4 animate-pulse bg-slate-100" /></td></tr>)}
              {ready && !rows.length && <EmptyRow colSpan={cols.length + 1} title="No data available in table" />}
              {shown.map((r, i) => (
                <tr key={i} className="hover:bg-[#f8fafc]">
                  <td className={tdClass}>{(cur - 1) * size + i + 1}</td>
                  {cols.map(([k, , type]) => (
                    <td key={k} className={`${tdClass} ${isNum(type) || type === "date" ? "whitespace-nowrap" : ""} ${isNum(type) ? "text-right" : ""} ${isNum(type) && Number(r[k]) < 0 ? "!text-[#d63939]" : ""}`}>
                      {type === "status" ? <span className={`px-[7px] py-[2px] text-[12px] font-semibold text-white ${BADGE[r[k]] || "bg-[#6c757d]"}`}>{r[k]}</span> : fmt(type, r[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && Object.keys(totals).length > 0 && (
              <tfoot>
                <tr className={totalRowClass}>
                  <td className={tdClass}>Total</td>
                  {cols.map(([k, , type]) => <td key={k} className={`${tdClass} text-right`}>{k in totals ? fmt(type, totals[k]) : ""}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-[14px] flex flex-wrap items-center justify-between gap-[10px] text-[14px] text-[#495057]">
          <span>Showing {rows.length ? (cur - 1) * size + 1 : 0} to {Math.min(cur * size, rows.length)} of {rows.length} entries</span>
          {pages > 1 && (
            <div className="flex max-w-full overflow-x-auto">
              <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="h-[36px] border border-[#dee2e6] bg-white px-[12px] text-[#6c757d] disabled:opacity-50">Previous</button>
              {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - cur) <= 2).map((n) => (
                <button key={n} type="button" onClick={() => setPage(n)} className={`h-[36px] border border-l-0 border-[#dee2e6] px-[12px] ${n === cur ? "border-[#007bff] bg-[#007bff] text-white" : "bg-white text-[#6c757d] hover:bg-[#f1f5f9]"}`}>{n}</button>
              ))}
              <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="h-[36px] border border-l-0 border-[#dee2e6] bg-white px-[12px] text-[#6c757d] disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      </ListCard>
    </div>
  );
}
