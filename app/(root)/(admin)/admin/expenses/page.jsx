"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Pencil, Plus, Receipt, Trash2, X } from "lucide-react";
import { showToast } from "@/lib/showToast";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const money = (n) => `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const METHOD = { cash: "Cash", bank: "Bank transfer", card: "Card" };
const input = "h-10 w-full rounded border border-input bg-background px-3 text-sm outline-none focus:border-[#188ae2]";
const blank = () => ({ date: today(), category: "", amount: "", paymentMethod: "cash", paidTo: "", note: "" });

export default function ExpensesPage() {
  const [filter, setFilter] = useState({ from: `${today().slice(0, 7)}-01`, to: today(), category: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { id?, ...fields }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (f) => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/expenses", { params: f });
      setData(data.data);
    } catch (e) {
      showToast("error", e.response?.data?.message || "Could not load expenses");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(filter); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    if (!modal.category || !(Number(modal.amount) > 0)) return showToast("error", "Choose a category and enter an amount");
    setSaving(true);
    try {
      const body = { ...modal, amount: Number(modal.amount) };
      const { data } = modal.id ? await axios.put(`/api/admin/expenses/${modal.id}`, body) : await axios.post("/api/admin/expenses", body);
      if (!data.success) throw new Error(data.message);
      showToast("success", data.message);
      setModal(null);
      load(filter);
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (x) => {
    if (!window.confirm(`Delete this ${x.category} expense of ${money(x.amount)}?`)) return;
    try {
      await axios.delete(`/api/admin/expenses/${x._id}`);
      showToast("success", "Expense deleted");
      load(filter);
    } catch (e) {
      showToast("error", e.response?.data?.message || e.message);
    }
  };

  const cats = data?.categories || [];
  const top = Object.entries(data?.byCategory || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Receipt className="text-[#1bab70]" /> Expenses</h1>
        <button type="button" onClick={() => setModal(blank())} className="flex h-10 items-center gap-2 rounded bg-[#10c469] px-4 text-sm font-semibold text-white"><Plus size={16} /> Add Expense</button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load(filter); }} className="grid gap-3 rounded-[8px] border border-[#e6ebf1] bg-white p-4 shadow-sm grid-cols-2 sm:grid-cols-4">
        <label className="text-xs font-semibold text-muted-foreground">From<input type="date" className={`${input} mt-1`} value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></label>
        <label className="text-xs font-semibold text-muted-foreground">To<input type="date" className={`${input} mt-1`} value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></label>
        <label className="text-xs font-semibold text-muted-foreground">Category
          <select className={`${input} mt-1`} value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
            <option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <div className="col-span-2 flex items-end sm:col-span-1"><button type="submit" className="h-10 w-full rounded bg-[#188ae2] text-sm font-semibold text-white">Search</button></div>
      </form>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <div className="rounded-[8px] bg-[#ff5b5b] p-5 text-white">
            <p className="text-sm text-white/85">Total expenses</p>
            <p className="text-2xl font-black sm:text-3xl">{money(data?.total)}</p>
            <p className="text-xs text-white/75">{data?.expenses?.length || 0} entries</p>
          </div>
          <div className="rounded-[8px] border border-[#e6ebf1] bg-white p-4">
            <p className="mb-2 text-sm font-bold">By category</p>
            {!top.length ? <p className="text-sm text-muted-foreground">No expenses.</p> : top.map(([c, v]) => (
              <div key={c} className="mb-2">
                <div className="flex justify-between text-sm"><span>{c}</span><b className="tabular-nums">{money(v)}</b></div>
                <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-full rounded bg-[#E2344F]" style={{ width: `${(v / (top[0][1] || 1)) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-[8px] border border-[#e6ebf1] bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="bg-[#00801a] text-left text-white">
              <th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Paid to / Note</th><th className="px-3 py-2.5">Method</th><th className="px-3 py-2.5 text-right">Amount</th><th className="px-3 py-2.5 text-right">Action</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr>}
              {!loading && !data?.expenses?.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No expenses in this period. Use “Add Expense” to record one.</td></tr>}
              {!loading && data?.expenses?.map((x) => (
                <tr key={x._id} className="border-t odd:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2">{new Date(x.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-3 py-2 font-medium">{x.category}</td>
                  <td className="px-3 py-2 text-muted-foreground">{[x.paidTo, x.note].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-3 py-2">{METHOD[x.paymentMethod]}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(x.amount)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" onClick={() => setModal({ id: x._id, date: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(x.date)), category: x.category, amount: String(x.amount), paymentMethod: x.paymentMethod, paidTo: x.paidTo, note: x.note })} className="rounded bg-[#2D7DD2] p-1.5 text-white" aria-label="Edit"><Pencil size={14} /></button>
                      <button type="button" onClick={() => remove(x)} className="rounded bg-[#ff5b5b] p-1.5 text-white" aria-label="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-lg bg-card shadow-2xl">
            <div className="flex items-center justify-between bg-[#1bab70] px-5 py-3 text-white">
              <h3 className="font-bold">{modal.id ? "Edit Expense" : "Add Expense"}</h3>
              <button type="button" onClick={() => setModal(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <label className="text-xs font-semibold">Date *<input type="date" required className={`${input} mt-1`} value={modal.date} onChange={(e) => setModal({ ...modal, date: e.target.value })} /></label>
              <label className="text-xs font-semibold">Amount (£) *<input type="number" min="0.01" step="0.01" required className={`${input} mt-1`} value={modal.amount} onChange={(e) => setModal({ ...modal, amount: e.target.value })} /></label>
              <label className="text-xs font-semibold">Category *
                <select required className={`${input} mt-1`} value={modal.category} onChange={(e) => setModal({ ...modal, category: e.target.value })}>
                  <option value="">Select category</option>{cats.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold">Paid by
                <select className={`${input} mt-1`} value={modal.paymentMethod} onChange={(e) => setModal({ ...modal, paymentMethod: e.target.value })}>
                  {Object.entries(METHOD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold sm:col-span-2">Paid to<input className={`${input} mt-1`} value={modal.paidTo} onChange={(e) => setModal({ ...modal, paidTo: e.target.value })} placeholder="e.g. British Gas" /></label>
              <label className="text-xs font-semibold sm:col-span-2">Note<input className={`${input} mt-1`} value={modal.note} onChange={(e) => setModal({ ...modal, note: e.target.value })} placeholder="Optional" /></label>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button type="button" onClick={() => setModal(null)} className="h-10 rounded border px-4 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={saving} className="flex h-10 items-center gap-2 rounded bg-[#10c469] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 size={15} className="animate-spin" />} Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
