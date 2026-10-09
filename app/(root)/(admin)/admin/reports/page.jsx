"use client";

// Reports (like the 360 report engine): pick a report, filter, search,
// sort, page, and export to CSV / Excel / Print (save as PDF).

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Loader2, Printer, Search, BarChart3 } from "lucide-react";
import { REPORTS } from "@/lib/reportsCatalog";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const firstOfMonth = () => `${today().slice(0, 7)}-01`;
const money = (n) => `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (type, v) =>
  v === null || v === undefined || v === ""
    ? ""
    : type === "money"
      ? money(v)
      : type === "qty"
        ? Number(v).toLocaleString("en-GB", { maximumFractionDigits: 2 })
        : type === "date"
          ? new Date(`${v}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : String(v);
const isNum = (t) => t === "money" || t === "qty";
const BADGE = { Paid: "bg-[#10B759]", Due: "bg-[#F1556C]" };

const GROUPS = Object.entries(REPORTS).reduce((g, [key, r]) => ((g[r.group] ||= []).push([key, r.title]), g), {});

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
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
  const cols = data?.key === report ? data.columns : [];
  const rows = useMemo(() => {
    let list = data?.key === report ? data.rows : [];
    const t = find.trim().toLowerCase();
    if (t) list = list.filter((r) => cols.some(([k]) => String(r[k] ?? "").toLowerCase().includes(t)));
    if (sort) {
      const [k, dir, type] = sort;
      list = [...list].sort((a, b) => dir * (isNum(type) ? (Number(a[k]) || 0) - (Number(b[k]) || 0) : String(a[k] ?? "").localeCompare(String(b[k] ?? ""), undefined, { numeric: true })));
    }
    return list;
  }, [data, report, find, sort, cols]);

  const size = perPage === "all" ? rows.length || 1 : perPage;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * size, cur * size);
  const totals = data?.key === report ? data.totals || {} : {};
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const exportCsv = (ext) => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Sl", ...cols.map((c) => c[1])].map(esc).join(",")];
    rows.forEach((r, i) => lines.push([i + 1, ...cols.map(([k, , t]) => (isNum(t) ? r[k] ?? "" : fmt(t, r[k])))].map(esc).join(",")));
    if (Object.keys(totals).length) lines.push(["Total", ...cols.map(([k]) => totals[k] ?? "")].map(esc).join(","));
    download(`${def.title} ${q.from || q.year}.${ext}`, "﻿" + lines.join("\r\n"), ext === "csv" ? "text/csv" : "application/vnd.ms-excel");
  };

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const head = `<tr><th>Sl</th>${cols.map(([, l, t]) => `<th style="text-align:${isNum(t) ? "right" : "left"}">${l}</th>`).join("")}</tr>`;
    const body = rows.map((r, i) => `<tr><td>${i + 1}</td>${cols.map(([k, , t]) => `<td style="text-align:${isNum(t) ? "right" : "left"}">${fmt(t, r[k])}</td>`).join("")}</tr>`).join("");
    const foot = Object.keys(totals).length ? `<tr class="t"><td>Total</td>${cols.map(([k, , t]) => `<td style="text-align:right">${k in totals ? fmt(t, totals[k]) : ""}</td>`).join("")}</tr>` : "";
    const period = def.filters.includes("year") ? `Year ${q.year}` : def.filters.includes("dates") ? `${fmt("date", q.from)} – ${fmt("date", q.to)}` : `As of ${fmt("date", today())}`;
    w.document.write(`<!doctype html><html><head><title>${def.title}</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#222}h1{margin:0;font-size:20px}p{margin:4px 0 14px;color:#555;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:12px}th{background:#2F6B16;color:#fff;padding:7px;border:1px solid #2F6B16}
      td{padding:6px 7px;border:1px solid #ddd}tr:nth-child(even) td{background:#f6f8f3}.t td{font-weight:bold;background:#eef3ea}
    </style></head><body><h1>Shawon Food Gate — ${def.title}</h1><p>${period} · 179 Forest Ln, London E7 9BB · printed ${new Date().toLocaleString("en-GB")}</p>
    <table><thead>${head}</thead><tbody>${body || `<tr><td colspan="${cols.length + 1}">No data</td></tr>`}${foot}</tbody></table>
    <script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  };

  const input = "h-10 rounded border border-input bg-background px-3 text-sm outline-none focus:border-[#2F6B16]";

  return (
    <div className="grid gap-5 pb-8 lg:grid-cols-[240px_1fr]">
      {/* report list */}
      <aside className="h-fit rounded-xl border-t-4 border-[#2F6B16] bg-card p-3 shadow-sm lg:sticky lg:top-20">
        <h2 className="mb-2 flex items-center gap-2 px-2 font-bold"><BarChart3 size={18} className="text-[#2F6B16]" /> Reports</h2>
        {Object.entries(GROUPS).map(([group, list]) => (
          <div key={group} className="mb-2">
            <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{group}</p>
            {list.map(([key, title]) => (
              <button key={key} type="button" onClick={() => pick(key)}
                className={`block w-full rounded px-2 py-1.5 text-left text-sm transition ${report === key ? "bg-[#E9F4E2] font-semibold text-[#2F6B16] shadow-[inset_3px_0_0_#2F6B16]" : "hover:bg-muted"}`}>
                {title.replace(" Report", "")}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* report */}
      <section className="min-w-0 rounded-xl border-t-4 border-[#2F6B16] bg-card p-5 shadow-sm">
        <h1 className="mb-4 text-xl font-bold">{def.title}</h1>

        {def.filters.length > 0 && (
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(draft); }} className="rounded-lg bg-muted/50 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {def.filters.includes("dates") && (
                <>
                  <label className="text-xs font-semibold text-muted-foreground">From<input type="date" className={`${input} mt-1 w-full`} value={draft.from} onChange={(e) => set("from", e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted-foreground">To<input type="date" className={`${input} mt-1 w-full`} value={draft.to} onChange={(e) => set("to", e.target.value)} /></label>
                </>
              )}
              {def.filters.includes("year") && (
                <label className="text-xs font-semibold text-muted-foreground">Year
                  <select className={`${input} mt-1 w-full`} value={draft.year} onChange={(e) => set("year", e.target.value)}>
                    {Array.from({ length: 6 }, (_, i) => String(Number(today().slice(0, 4)) - i)).map((y) => <option key={y}>{y}</option>)}
                  </select>
                </label>
              )}
              {def.filters.includes("type") && (
                <label className="text-xs font-semibold text-muted-foreground">Order type
                  <select className={`${input} mt-1 w-full`} value={draft.type} onChange={(e) => set("type", e.target.value)}>
                    <option value="">All types</option><option value="dine_in">Dine In</option><option value="takeaway">Takeaway</option><option value="pickup">Collection</option><option value="delivery">Delivery</option>
                  </select>
                </label>
              )}
              {def.filters.includes("payment") && (
                <label className="text-xs font-semibold text-muted-foreground">Payment
                  <select className={`${input} mt-1 w-full`} value={draft.payment} onChange={(e) => set("payment", e.target.value)}>
                    <option value="">All</option><option value="paid">Paid</option><option value="pending">Due</option>
                  </select>
                </label>
              )}
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button type="submit" className="h-9 min-w-[90px] rounded bg-[#2D7DD2] px-4 text-sm font-semibold text-white hover:brightness-110">Search</button>
              <button type="button" onClick={() => { setDraft(init); setQ(init); setPage(1); setFind(""); setSort(null); }} className="h-9 min-w-[90px] rounded bg-[#F7941D] px-4 text-sm font-semibold text-white hover:brightness-110">Clear</button>
            </div>
          </form>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5">Show
              <select className="h-9 rounded border border-input bg-background px-2" value={perPage} onChange={(e) => { setPerPage(e.target.value === "all" ? "all" : Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}<option value="all">All</option>
              </select> entries</label>
            <div className="flex overflow-hidden rounded">
              <button type="button" onClick={() => exportCsv("csv")} className="flex h-9 items-center gap-1.5 bg-zinc-600 px-3 text-xs font-semibold text-white hover:bg-zinc-700"><FileText size={13} /> CSV</button>
              <button type="button" onClick={() => exportCsv("xls")} className="flex h-9 items-center gap-1.5 border-x border-zinc-500 bg-zinc-600 px-3 text-xs font-semibold text-white hover:bg-zinc-700"><FileSpreadsheet size={13} /> Excel</button>
              <button type="button" onClick={print} className="flex h-9 items-center gap-1.5 bg-zinc-600 px-3 text-xs font-semibold text-white hover:bg-zinc-700"><Printer size={13} /> Print / PDF</button>
            </div>
            {isFetching && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
          </div>
          <label className="flex items-center gap-1.5 rounded bg-[#2D7DD2] px-2 py-1 text-sm text-white">
            <Search size={14} />
            <input value={find} onChange={(e) => { setFind(e.target.value); setPage(1); }} placeholder="Search…" className="h-7 w-40 rounded-sm bg-white px-2 text-zinc-800 outline-none" />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error.response?.data?.message || error.message}</p>}

        <div className="mt-3 overflow-x-auto rounded border">
          <table className="w-full text-sm" style={{ minWidth: Math.max(640, (cols.length + 1) * 110) }}>
            <thead>
              <tr className="bg-[#2F6B16] text-white">
                <th className="px-3 py-2.5 text-left font-semibold">Sl</th>
                {cols.map(([k, label, type]) => (
                  <th key={k} onClick={() => setSort((s) => (s?.[0] === k ? [k, -s[1], type] : [k, 1, type]))}
                    className={`cursor-pointer select-none px-3 py-2.5 font-semibold ${isNum(type) ? "text-right" : "text-left"}`}>
                    {label}<span className="ml-1 text-[10px] opacity-70">{sort?.[0] === k ? (sort[1] > 0 ? "▲" : "▼") : "⇅"}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data && <tr><td colSpan={9} className="p-6 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr>}
              {data && !rows.length && <tr><td colSpan={cols.length + 1} className="p-8 text-center text-muted-foreground">No data available for this period</td></tr>}
              {shown.map((r, i) => (
                <tr key={i} className="border-t odd:bg-muted/30 hover:bg-[#F1F7EC]">
                  <td className="px-3 py-2 text-muted-foreground">{(cur - 1) * size + i + 1}</td>
                  {cols.map(([k, , type]) => (
                    <td key={k} className={`whitespace-nowrap px-3 py-2 ${isNum(type) ? "text-right tabular-nums" : ""} ${isNum(type) && Number(r[k]) < 0 ? "text-red-600" : ""}`}>
                      {type === "status" ? <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${BADGE[r[k]] || "bg-zinc-500"}`}>{r[k]}</span> : fmt(type, r[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && Object.keys(totals).length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#2F6B16] bg-[#EEF3EA] font-bold">
                  <td className="px-3 py-2.5">Total</td>
                  {cols.map(([k, , type]) => <td key={k} className="px-3 py-2.5 text-right tabular-nums">{k in totals ? fmt(type, totals[k]) : ""}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Showing {rows.length ? (cur - 1) * size + 1 : 0} to {Math.min(cur * size, rows.length)} of {rows.length} entries</span>
          {pages > 1 && (
            <div className="flex">
              <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="h-9 border px-3 disabled:opacity-40">Previous</button>
              {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - cur) <= 1).map((n) => (
                <button key={n} type="button" onClick={() => setPage(n)} className={`h-9 border-y border-r px-3 ${n === cur ? "bg-[#2F6B16] text-white" : ""}`}>{n}</button>
              ))}
              <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="h-9 border-y border-r px-3 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
