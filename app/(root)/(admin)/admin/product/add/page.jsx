"use client";

// Add Food — AmarSolution style: Name / Category / Branch, Image / Price /
// Discount, VAT, Description and a Recipe table, with Save / List at the bottom.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { List, Loader2, Plus, Save, Trash2, X, ImagePlus } from "lucide-react";
import { showToast } from "@/lib/showToast";
import { ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";

const emptyRow = () => ({ key: Math.random().toString(36).slice(2), ingredient: "", unit: "", quantity: "" });
const label = "mb-1.5 block text-[13px] font-semibold text-foreground";
const input = "h-10 w-full rounded border border-input bg-background px-3 text-sm outline-none transition focus:border-[#188ae2] focus:ring-2 focus:ring-[#2F6B16]/15";

function SearchSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);
  const list = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${input} flex items-center justify-between text-left`}>
        <span className={selected ? "" : "text-muted-foreground"}>{selected?.label || placeholder}</span>
        <span className="text-xs text-muted-foreground">▼</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded border bg-popover shadow-lg">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-full border-b bg-transparent px-3 text-sm outline-none" />
          <ul className="max-h-60 overflow-y-auto py-1">
            {list.map((o) => (
              <li key={o.value}>
                <button type="button" onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#e2f6eb] ${o.value === value ? "bg-[#e2f6eb] font-semibold text-[#1bab70]" : ""}`}>
                  {o.label}
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3 py-2 text-sm text-muted-foreground">No match</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AddFoodPage() {
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState({ name: "", category: "", price: "", discountType: "amount", discount: "", vat: "", description: "", badge: "", isMostLoved: false, available: true });
  const [image, setImage] = useState(null); // { _id, url }
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState([emptyRow()]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    axios.get("/api/category", { params: { deleteType: "SD", size: 10000 } })
      .then(({ data }) => setCategories((data.data || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((c) => ({ value: c._id, label: c.name }))))
      .catch(() => {});
    axios.get("/api/admin/inventory/ingredients")
      .then(({ data }) => setIngredients(data.data?.ingredients || []))
      .catch(() => {});
  }, []);

  const ingOptions = useMemo(() => ingredients.map((i) => ({ value: i._id, label: `${i.name} (${i.usageUnit})` })), [ingredients]);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const price = Number(form.price) || 0;
  const disc = Number(form.discount) || 0;
  const finalPrice = Math.max(0, form.discountType === "percent" ? price - (price * Math.min(disc, 100)) / 100 : price - disc);

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.name || file.name);
      const { data } = await axios.post("/api/admin/upload", fd);
      if (!data.success) throw new Error(data.message);
      setImage(data.data);
    } catch (e) {
      showToast("error", e.response?.data?.message || e.message);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  const setRow = (key, patch) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function save() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Name is required";
    if (!form.category) e.category = "Category is required";
    if (form.price === "" || price < 0) e.price = "Price is required";
    setErrors(e);
    if (Object.keys(e).length) return showToast("error", "Please fill in the required fields");

    setSaving(true);
    try {
      const recipe = rows.filter((r) => r.ingredient && Number(r.quantity) > 0).map((r) => ({ ingredient: r.ingredient, unit: r.unit, quantity: Number(r.quantity) }));
      const { data } = await axios.post("/api/admin/foods", {
        ...form,
        price,
        discount: disc,
        vat: Number(form.vat) || 0,
        media: image?._id || null,
        recipe,
      });
      if (!data.success) throw new Error(data.message);
      showToast("success", `${form.name} added${data.data.recipeItems ? ` with ${data.data.recipeItems}-item recipe` : ""}`);
      setForm({ name: "", category: form.category, price: "", discountType: "amount", discount: "", vat: "", description: "", badge: "", isMostLoved: false, available: true });
      setImage(null);
      setRows([emptyRow()]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="rounded-[8px] border border-[#e6ebf1] bg-white p-5 shadow-sm sm:p-6">
        <h1 className="mb-5 text-lg font-bold">Add Food</h1>

        {/* row 1 */}
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className={label}>Name <span className="text-[#E1262D]">*</span></label>
            <input className={`${input} ${errors.name ? "border-[#E1262D]" : ""}`} value={form.name} onChange={set("name")} placeholder="e.g. Chicken Biryani" />
            {errors.name && <p className="mt-1 text-xs text-[#E1262D]">{errors.name}</p>}
          </div>
          <div>
            <label className={label}>Category <span className="text-[#E1262D]">*</span></label>
            <SearchSelect value={form.category} onChange={(v) => { setForm((f) => ({ ...f, category: v })); setErrors((x) => ({ ...x, category: undefined })); }} options={categories} placeholder="Search Category" />
            {errors.category && <p className="mt-1 text-xs text-[#E1262D]">{errors.category}</p>}
          </div>
          <div>
            <label className={label}>Branch <span className="text-[#E1262D]">*</span></label>
            <select className={input} disabled defaultValue="main"><option value="main">Shawon Food Gate — Forest Gate</option></select>
          </div>
        </div>

        {/* row 2 */}
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <label className={label}>Image</label>
            <div className="flex items-center gap-3">
              <label className={`${input} flex cursor-pointer items-center gap-2 text-muted-foreground`}>
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                <span className="truncate">{uploading ? "Uploading…" : image ? "Change image" : "Choose file"}</span>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {image && (
                <span className="relative h-10 w-10 flex-none overflow-hidden rounded border">
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ""; }} className="absolute -right-0.5 -top-0.5 rounded-full bg-[#E1262D] p-0.5 text-white" aria-label="Remove image"><X size={10} /></button>
                </span>
              )}
            </div>
          </div>
          <div>
            <label className={label}>Price (£) <span className="text-[#E1262D]">*</span></label>
            <input type="number" min="0" step="0.01" className={`${input} ${errors.price ? "border-[#E1262D]" : ""}`} value={form.price} onChange={set("price")} placeholder="0.00" />
            {errors.price && <p className="mt-1 text-xs text-[#E1262D]">{errors.price}</p>}
          </div>
          <div>
            <label className={label}>Discount</label>
            <div className="flex">
              <select value={form.discountType} onChange={set("discountType")} className="h-10 rounded-l border border-[#F7C318] bg-[#F7C318] px-3 text-sm font-semibold text-[#1A2614] outline-none">
                <option value="amount">Amount (£)</option>
                <option value="percent">Percent (%)</option>
              </select>
              <input type="number" min="0" step="0.01" className={`${input} rounded-l-none`} value={form.discount} onChange={set("discount")} placeholder="0" />
            </div>
            {disc > 0 && price > 0 && <p className="mt-1 text-xs text-[#1bab70]">Customer pays £{finalPrice.toFixed(2)}</p>}
          </div>
        </div>

        {/* row 3 */}
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <label className={label}>Vat (%)</label>
            <input type="number" min="0" max="100" step="0.1" className={input} value={form.vat} onChange={set("vat")} placeholder="0" />
          </div>
          <div>
            <label className={label}>Badge (website)</label>
            <select className={input} value={form.badge} onChange={set("badge")}>
              <option value="">None</option>
              {["Popular", "Best Seller", "Must Try", "New", "Spicy", "Fri & Sat"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isMostLoved} onChange={set("isMostLoved")} className="h-4 w-4 accent-[#1bab70]" /> Show in Popular</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.available} onChange={set("available")} className="h-4 w-4 accent-[#1bab70]" /> Available</label>
          </div>
        </div>

        <div className="mt-5">
          <label className={label}>Description</label>
          <textarea rows={3} className={`${input} h-auto py-2`} value={form.description} onChange={set("description")} placeholder="Description" />
        </div>

        {/* recipe */}
        <div className="mt-6">
          <h2 className="mb-2 text-[15px] font-bold">Recipe:</h2>
          <div className="overflow-x-auto rounded border">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left">
                  <th className="px-3 py-2.5 font-semibold">Product</th>
                  <th className="w-36 px-3 py-2.5 font-semibold">Unit</th>
                  <th className="w-44 px-3 py-2.5 font-semibold">Quantity</th>
                  <th className="w-28 px-3 py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <SearchSelect value={r.ingredient} placeholder="Search Product" options={ingOptions}
                        onChange={(v) => setRow(r.key, { ingredient: v, unit: ingredients.find((x) => x._id === v)?.usageUnit || "" })} />
                    </td>
                    <td className="px-2 py-2"><input className={`${input} bg-muted/40`} value={r.unit} readOnly placeholder="—" /></td>
                    <td className="px-2 py-2"><input type="number" min="0" step="0.001" className={input} value={r.quantity} onChange={(e) => setRow(r.key, { quantity: e.target.value })} placeholder="0" /></td>
                    <td className="px-2 py-2">
                      <div className="flex">
                        <button type="button" onClick={() => setRows((x) => [...x.slice(0, i + 1), emptyRow(), ...x.slice(i + 1)])} className="flex h-9 w-9 items-center justify-center rounded-l bg-[#188ae2] text-white hover:brightness-110" aria-label="Add row"><Plus size={16} /></button>
                        <button type="button" onClick={() => setRows((x) => (x.length > 1 ? x.filter((y) => y.key !== r.key) : [emptyRow()]))} className="flex h-9 w-9 items-center justify-center rounded-r bg-[#ff5b5b] text-white hover:brightness-110" aria-label="Remove row"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Ingredients used per portion. Leave empty if this food has no recipe yet.</p>
        </div>
      </div>

      {/* bottom actions */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center gap-2 border-t bg-background/95 py-3 backdrop-blur md:left-64">
        <button type="button" onClick={save} disabled={saving || uploading} className="flex h-10 items-center gap-2 rounded bg-[#188ae2] px-6 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
        </button>
        <Link href={ADMIN_PRODUCT_SHOW} className="flex h-10 items-center gap-2 rounded bg-[#10c469] px-6 text-sm font-semibold text-white hover:brightness-110">
          <List size={16} /> List
        </Link>
      </div>
    </div>
  );
}
