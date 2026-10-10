"use client";

// Edit a simple list stored in restaurant settings (tables or waiters).
import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { showToast } from "@/lib/showToast";

export default function FloorListPage({ field, title, singular, hint, icon: Icon, placeholder }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    axios.get("/api/admin/floor").then(({ data }) => setItems(data.data?.[field] || [])).catch(() => showToast("error", "Could not load")).finally(() => setLoading(false));
  }, [field]);

  const add = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (items.some((x) => x.toLowerCase() === n.toLowerCase())) return showToast("error", `${n} already exists`);
    setItems((x) => [...x, n]);
    setName("");
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put("/api/admin/floor", { [field]: items });
      if (!data.success) throw new Error(data.message);
      setItems(data.data[field]);
      setDirty(false);
      showToast("success", `${title} saved`);
    } catch (e) {
      showToast("error", e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-[8px] border border-[#e6ebf1] bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-bold"><Icon className="text-[#1bab70]" size={20} /> {title}</h1>
        <button type="button" onClick={save} disabled={!dirty || saving} className="flex h-9 items-center gap-2 rounded bg-[#188ae2] px-4 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
        </button>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">{hint}</p>

      <form onSubmit={add} className="mb-5 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={placeholder} className="h-10 min-w-0 flex-1 rounded border border-input bg-background px-3 text-sm outline-none focus:border-[#188ae2]" />
        <button type="submit" className="flex h-10 items-center gap-1.5 rounded bg-[#10c469] px-4 text-sm font-semibold text-white"><Plus size={16} /> <span className="hidden sm:inline">Add {singular}</span><span className="sm:hidden">Add</span></button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : !items.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>
      ) : (
        <div className="overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#00801a] text-left text-white"><th className="w-14 px-3 py-2.5">Sl</th><th className="px-3 py-2.5">{singular} name</th><th className="w-24 px-3 py-2.5 text-right">Action</th></tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={`${it}-${i}`} className="border-t odd:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-1.5">
                    <input value={it} maxLength={40} onChange={(e) => { const v = e.target.value; setItems((x) => x.map((y, j) => (j === i ? v : y))); setDirty(true); }}
                      className="h-8 w-full rounded border border-transparent bg-transparent px-2 hover:border-input focus:border-[#188ae2] focus:outline-none" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => { setItems((x) => x.filter((_, j) => j !== i)); setDirty(true); }} className="rounded bg-[#ff5b5b] p-1.5 text-white" aria-label={`Remove ${it}`}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dirty && <p className="mt-3 text-sm font-medium text-[#E08A00]">You have unsaved changes. Press Save.</p>}
    </div>
  );
}
