"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { KeyRound, Loader2, Plus, ShieldCheck, UserCog, X } from "lucide-react";
import { showToast } from "@/lib/showToast";

const ROLES = { admin: "Admin", manager: "Manager", staff: "Staff (Kitchen / POS)" };
const ROLE_CLS = { admin: "bg-[#00801a] text-white", manager: "bg-[#188ae2] text-white", staff: "bg-[#7B2CBF] text-white" };
const input = "h-10 w-full rounded border border-input bg-background px-3 text-sm outline-none focus:border-[#188ae2]";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState("");
  const [modal, setModal] = useState(null); // {mode:"add"|"edit"|"password", ...}
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/users");
      setUsers(data.data || []);
    } catch (e) {
      setDenied(e.response?.data?.message || "Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (modal.mode === "add") res = await axios.post("/api/admin/users", { name: modal.name, email: modal.email, phone: modal.phone, role: modal.role, password: modal.password });
      else if (modal.mode === "edit") res = await axios.put(`/api/admin/users/${modal._id}`, { name: modal.name, phone: modal.phone, role: modal.role });
      else res = await axios.put(`/api/admin/users/${modal._id}`, { password: modal.password });
      if (!res.data.success) throw new Error(res.data.message);
      showToast("success", res.data.message);
      setModal(null);
      load();
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (u) => {
    if (!window.confirm(`${u.active ? "Disable" : "Enable"} ${u.name}? ${u.active ? "They will not be able to log in." : ""}`)) return;
    try {
      const { data } = await axios.put(`/api/admin/users/${u._id}`, { active: !u.active });
      if (!data.success) throw new Error(data.message);
      showToast("success", u.active ? "User disabled" : "User enabled");
      load();
    } catch (e) {
      showToast("error", e.response?.data?.message || e.message);
    }
  };

  if (denied) return <div className="rounded-lg border bg-card p-10 text-center"><ShieldCheck className="mx-auto mb-2 text-muted-foreground" /><p className="font-semibold">{denied}</p></div>;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><UserCog className="text-[#1bab70]" /> Users</h1>
          <p className="text-sm text-muted-foreground">Staff logins for the admin panel, POS and kitchen. Customers are under Customer.</p>
        </div>
        <button type="button" onClick={() => setModal({ mode: "add", name: "", email: "", phone: "", role: "staff", password: "" })} className="flex h-10 items-center gap-2 rounded bg-[#10c469] px-4 text-sm font-semibold text-white"><Plus size={16} /> Add User</button>
      </div>

      <div className="overflow-x-auto rounded-[8px] border border-[#e6ebf1] bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="bg-[#00801a] text-left text-white">
            <th className="px-3 py-2.5">Sl</th><th className="px-3 py-2.5">Name</th><th className="px-3 py-2.5">Email</th><th className="px-3 py-2.5">Phone</th><th className="px-3 py-2.5">Role</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Action</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr>}
            {!loading && users.map((u, i) => (
              <tr key={u._id} className={`border-t ${u.active ? "odd:bg-muted/30" : "bg-muted/60 text-muted-foreground"}`}>
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{u.name}{u.isMe && <span className="ml-1.5 rounded bg-[#F7C318] px-1.5 py-0.5 text-[10px] font-bold text-[#1A2614]">YOU</span>}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.phone || "—"}</td>
                <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs font-bold ${ROLE_CLS[u.role]}`}>{ROLES[u.role]}</span></td>
                <td className="px-3 py-2">{u.active ? <span className="font-semibold text-[#0AA553]">Active</span> : <span className="font-semibold text-[#E2344F]">Disabled</span>}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => setModal({ mode: "edit", ...u })} className="rounded bg-[#188ae2] px-2.5 py-1 text-xs font-semibold text-white">Edit</button>
                    <button type="button" onClick={() => setModal({ mode: "password", _id: u._id, name: u.name, password: "" })} className="flex items-center gap-1 rounded bg-[#F7941D] px-2.5 py-1 text-xs font-semibold text-white"><KeyRound size={12} /> Password</button>
                    {!u.isMe && <button type="button" onClick={() => toggle(u)} className={`rounded px-2.5 py-1 text-xs font-semibold text-white ${u.active ? "bg-[#ff5b5b]" : "bg-[#0AA553]"}`}>{u.active ? "Disable" : "Enable"}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-lg bg-card shadow-2xl">
            <div className="flex items-center justify-between bg-[#1bab70] px-5 py-3 text-white">
              <h3 className="font-bold">{modal.mode === "add" ? "Add User" : modal.mode === "edit" ? `Edit ${modal.name}` : `New password for ${modal.name}`}</h3>
              <button type="button" onClick={() => setModal(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="grid gap-3 p-5">
              {modal.mode !== "password" && (
                <>
                  <label className="text-xs font-semibold">Name *<input required className={`${input} mt-1`} value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} /></label>
                  {modal.mode === "add" && <label className="text-xs font-semibold">Email (login) *<input required type="email" className={`${input} mt-1`} value={modal.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} /></label>}
                  <label className="text-xs font-semibold">Phone<input className={`${input} mt-1`} value={modal.phone || ""} onChange={(e) => setModal({ ...modal, phone: e.target.value })} /></label>
                  <label className="text-xs font-semibold">Role *
                    <select className={`${input} mt-1`} value={modal.role} disabled={modal.isMe} onChange={(e) => setModal({ ...modal, role: e.target.value })}>
                      {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                </>
              )}
              {modal.mode !== "edit" && (
                <label className="text-xs font-semibold">Password * <span className="font-normal text-muted-foreground">(at least 6 characters)</span>
                  <input required minLength={6} type="password" autoComplete="new-password" className={`${input} mt-1`} value={modal.password} onChange={(e) => setModal({ ...modal, password: e.target.value })} />
                </label>
              )}
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
