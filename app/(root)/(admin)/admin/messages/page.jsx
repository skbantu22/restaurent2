"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { showToast } from "@/lib/showToast";

const input = "w-full rounded border border-input bg-background px-3 text-sm outline-none focus:border-[#188ae2]";
const STATUS = { sent: ["Sent", "bg-[#0AA553]"], partial: ["Partly sent", "bg-[#F7941D]"], not_sent: ["Not sent", "bg-[#E2344F]"] };

export default function MessagesPage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ subject: "", body: "", audience: "all" });
  const [picked, setPicked] = useState([]);
  const [find, setFind] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    axios.get("/api/admin/messages").then(({ data }) => setData(data.data)).catch((e) => showToast("error", e.response?.data?.message || "Could not load messages"));
  }, []);
  useEffect(() => load(), [load]);

  const customers = useMemo(() => {
    const t = find.trim().toLowerCase();
    return (data?.customers || []).filter((c) => !t || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(t));
  }, [data, find]);

  const send = async (e) => {
    e.preventDefault();
    if (form.audience === "selected" && !picked.length) return showToast("error", "Choose at least one customer");
    setSending(true);
    try {
      const { data: res } = await axios.post("/api/admin/messages", { ...form, customerIds: picked });
      if (!res.success) throw new Error(res.message);
      showToast(res.data.sent ? "success" : "error", res.message);
      setForm({ subject: "", body: "", audience: form.audience });
      setPicked([]);
      load();
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <h1 className="flex items-center gap-2 text-xl font-bold"><Mail className="text-[#1bab70]" /> Messages</h1>

      {data && !data.emailConfigured && (
        <div className="flex gap-3 rounded-lg border border-[#F7941D]/50 bg-[#FFF5E8] p-4 text-sm text-[#7A4A00]">
          <AlertTriangle className="flex-none" size={18} />
          <p>Email sending is not set up yet, so messages are saved but not delivered. Add <b>NODEMAILER_HOST</b>, <b>NODEMAILER_PORT</b>, <b>NODEMAILER_EMAIL</b> and <b>NODEMAILER_PASSWORD</b> (e.g. a Gmail app password) to the environment.</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <form onSubmit={send} className="space-y-4 rounded-[8px] border border-[#e6ebf1] bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold">Subject *
            <input required className={`${input} mt-1 h-10`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. 10% off this weekend 🍛" />
          </label>
          <label className="block text-sm font-semibold">Message *
            <textarea required rows={8} className={`${input} mt-1 py-2`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write your message to customers…" />
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={form.audience === "all"} onChange={() => setForm({ ...form, audience: "all" })} className="accent-[#1bab70]" /> All customers ({data?.customers?.length || 0})</label>
            <label className="flex items-center gap-2"><input type="radio" checked={form.audience === "selected"} onChange={() => setForm({ ...form, audience: "selected" })} className="accent-[#1bab70]" /> Selected customers ({picked.length})</label>
          </div>
          <button type="submit" disabled={sending} className="flex h-10 items-center gap-2 rounded bg-[#10c469] px-5 text-sm font-semibold text-white disabled:opacity-60">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send message
          </button>
        </form>

        <div className={`rounded-[8px] border border-[#e6ebf1] bg-white p-4 ${form.audience === "selected" ? "" : "opacity-60"}`}>
          <p className="mb-2 text-sm font-bold">Customers</p>
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search name, email, phone" className={`${input} mb-2 h-9`} />
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {customers.map((c) => (
              <li key={c._id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                  <input type="checkbox" disabled={form.audience !== "selected"} checked={picked.includes(c._id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c._id] : p.filter((x) => x !== c._id)))} className="accent-[#1bab70]" />
                  <span className="min-w-0"><span className="block truncate font-medium">{c.name}</span><span className="block truncate text-xs text-muted-foreground">{c.email}</span></span>
                </label>
              </li>
            ))}
            {!customers.length && <li className="px-2 py-4 text-sm text-muted-foreground">No customers found.</li>}
          </ul>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[8px] border border-[#e6ebf1] bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="bg-[#00801a] text-left text-white"><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Subject</th><th className="px-3 py-2.5">Recipients</th><th className="px-3 py-2.5">Delivered</th><th className="px-3 py-2.5">Status</th></tr></thead>
          <tbody>
            {!data?.messages?.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No messages yet.</td></tr>}
            {data?.messages?.map((m) => {
              const [l, cls] = STATUS[m.status] || STATUS.not_sent;
              return (
                <tr key={m._id} className="border-t odd:bg-muted/30" title={m.error || ""}>
                  <td className="whitespace-nowrap px-3 py-2">{new Date(m.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-3 py-2 font-medium">{m.subject}</td>
                  <td className="px-3 py-2">{m.audience === "all" ? "All customers" : "Selected"} · {m.recipients?.length || 0}</td>
                  <td className="px-3 py-2">{m.sent} / {m.recipients?.length || 0}</td>
                  <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold text-white ${cls}`}>{m.status === "sent" && <CheckCircle2 size={12} />}{l}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
