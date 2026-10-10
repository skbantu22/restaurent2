"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ArrowDownLeft, ArrowUpRight, Banknote, Landmark, Loader2, Wallet } from "lucide-react";
import { showToast } from "@/lib/showToast";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const money = (n) => `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const input = "h-10 w-full rounded border border-input bg-background px-3 text-sm outline-none focus:border-[#188ae2]";
const ICON = { Cash: Banknote, Bank: Landmark };

export default function AccountsPage() {
  const [range, setRange] = useState({ from: `${today().slice(0, 7)}-01`, to: today() });
  const [account, setAccount] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r) => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/accounts", { params: r });
      setData(data.data);
    } catch (e) {
      showToast("error", e.response?.data?.message || "Could not load accounts");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(range); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tx = useMemo(() => (data?.transactions || []).filter((t) => !account || t.account === account), [data, account]);

  return (
    <div className="space-y-5 pb-8">
      <h1 className="flex items-center gap-2 text-xl font-bold"><Wallet className="text-[#1bab70]" /> Accounts · Cash Book</h1>

      <form onSubmit={(e) => { e.preventDefault(); load(range); }} className="grid gap-3 rounded-[8px] border border-[#e6ebf1] bg-white p-4 shadow-sm grid-cols-2 sm:grid-cols-4">
        <label className="text-xs font-semibold text-muted-foreground">From<input type="date" className={`${input} mt-1`} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label className="text-xs font-semibold text-muted-foreground">To<input type="date" className={`${input} mt-1`} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        <label className="text-xs font-semibold text-muted-foreground">Account
          <select className={`${input} mt-1`} value={account} onChange={(e) => setAccount(e.target.value)}><option value="">All accounts</option><option>Cash</option><option>Bank</option></select>
        </label>
        <div className="col-span-2 flex items-end sm:col-span-1"><button type="submit" className="h-10 w-full rounded bg-[#188ae2] text-sm font-semibold text-white">Search</button></div>
      </form>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {(data?.accounts || []).map((a) => {
              const Icon = ICON[a.name] || Wallet;
              return (
                <div key={a.name} className="rounded-[8px] border border-[#e6ebf1] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 font-bold"><Icon size={18} className="text-[#1bab70]" /> {a.name === "Bank" ? "Bank (card & online)" : "Cash in hand"}</p>
                    <span className="text-xs text-muted-foreground">{a.count} entries</span>
                  </div>
                  <p className={`mt-3 text-2xl font-black sm:text-3xl tabular-nums ${a.balance < 0 ? "text-[#E2344F]" : "text-[#1A2614] dark:text-white"}`}>{money(a.balance)}</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="text-[#0AA553]">In {money(a.in)}</span>
                    <span className="text-[#E2344F]">Out {money(a.out)}</span>
                  </div>
                </div>
              );
            })}
            <div className="rounded-[8px] bg-[#1bab70] p-5 text-white">
              <p className="font-bold">Total balance</p>
              <p className="mt-3 text-2xl font-black sm:text-3xl tabular-nums">{money(data?.total?.balance)}</p>
              <div className="mt-2 flex gap-4 text-sm text-white/85"><span>In {money(data?.total?.in)}</span><span>Out {money(data?.total?.out)}</span></div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="h-fit rounded-[8px] border border-[#e6ebf1] bg-white p-4">
              <p className="mb-3 text-sm font-bold">Breakdown</p>
              <ul className="space-y-2 text-sm">
                {(data?.breakdown || []).sort((a, b) => (a.direction === b.direction ? b.amount - a.amount : a.direction === "in" ? -1 : 1)).map((b) => (
                  <li key={`${b.direction}${b.type}`} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      {b.direction === "in" ? <ArrowDownLeft size={15} className="text-[#0AA553]" /> : <ArrowUpRight size={15} className="text-[#E2344F]" />} {b.type}
                    </span>
                    <b className={`tabular-nums ${b.direction === "in" ? "text-[#0AA553]" : "text-[#E2344F]"}`}>{money(b.amount)}</b>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">Card and online (Stripe) payments are counted in Bank. Supplier purchases are paid from Bank.</p>
            </div>

            <div className="overflow-x-auto rounded-[8px] border border-[#e6ebf1] bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="bg-[#00801a] text-left text-white">
                  <th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Account</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Description</th><th className="px-3 py-2.5 text-right">In</th><th className="px-3 py-2.5 text-right">Out</th>
                </tr></thead>
                <tbody>
                  {!tx.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No transactions in this period.</td></tr>}
                  {tx.map((t, i) => (
                    <tr key={i} className="border-t odd:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2">{new Date(`${t.date}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                      <td className="px-3 py-2">{t.account}</td>
                      <td className="px-3 py-2">{t.type}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.description}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-[#0AA553]">{t.direction === "in" ? money(t.amount) : ""}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-[#E2344F]">{t.direction === "out" ? money(t.amount) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
