"use client";

// AmarSolution-style restaurant POS (full screen): categories | food grid |
// bill, with Dine In tables, waiter, Hold / Clear / Order (kitchen, pay
// later) / Instant Payment, plus On Going and Today's orders.
// Prices are always recalculated on the server (/api/pos/checkout).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  ChevronsLeft,
  ClipboardList,
  CreditCard,
  Banknote,
  Home,
  List,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
  User,
  UtensilsCrossed,
  X,
  ChefHat,
  Table2,
  CheckCircle2,
} from "lucide-react";
import { showToast } from "@/lib/showToast";

const ALLOWED_ROLES = ["admin", "manager", "staff"];
const ORDER_TYPES = [
  ["dine_in", "Dine In"],
  ["takeaway", "Takeaway"],
  ["pickup", "Collection"],
  ["delivery", "Delivery"],
];
const STATUS = {
  placed: ["New", "bg-sky-100 text-sky-700"],
  preparing: ["Preparing", "bg-amber-100 text-amber-700"],
  ready: ["Ready", "bg-emerald-100 text-emerald-700"],
  out_for_delivery: ["On the way", "bg-violet-100 text-violet-700"],
  delivered: ["Completed", "bg-zinc-100 text-zinc-600"],
  cancelled: ["Cancelled", "bg-red-100 text-red-700"],
};
const HOLD_KEY = "sfg_pos_holds";

const money = (n) => `£${Number(n || 0).toFixed(2)}`;
const newKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const readHolds = () => {
  try {
    return JSON.parse(localStorage.getItem(HOLD_KEY)) || [];
  } catch {
    return [];
  }
};
const writeHolds = (h) => {
  try {
    localStorage.setItem(HOLD_KEY, JSON.stringify(h));
  } catch {}
};
const printUrl = (id, kitchen) => `/admin/orders/print/${id}${kitchen ? "?type=kitchen" : ""}`;

function Modal({ title, onClose, children, wide, color = "bg-[#2F6B16]" }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl ${wide ? "max-w-4xl" : "max-w-md"}`}>
        <div className={`flex items-center justify-between px-5 py-3 text-white ${color}`}>
          <h3 className="font-bold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-5 text-zinc-800">{children}</div>
      </div>
    </div>
  );
}

function PaymentModal({ total, onClose, onPay, busy, title = "Instant Payment" }) {
  const [method, setMethod] = useState("cash");
  const [received, setReceived] = useState("");
  const change = received !== "" ? Number(received) - total : null;
  const ok = method === "card" || (received !== "" && Number(received) >= total - 0.001);
  return (
    <Modal title={title} onClose={onClose} color="bg-[#1E9E50]">
      <div className="rounded-lg bg-zinc-900 px-4 py-3 text-center text-white">
        <p className="text-xs uppercase tracking-wider text-white/60">Total payable</p>
        <p className="text-4xl font-black">{money(total)}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[["cash", "Cash", Banknote], ["card", "Card", CreditCard]].map(([v, l, Icon]) => (
          <button key={v} type="button" onClick={() => setMethod(v)}
            className={`flex h-14 items-center justify-center gap-2 rounded-lg border-2 text-base font-bold ${method === v ? "border-[#1E9E50] bg-[#1E9E50]/10 text-[#1E9E50]" : "border-zinc-200"}`}>
            <Icon size={20} /> {l}
          </button>
        ))}
      </div>
      {method === "cash" && (
        <>
          <label className="mt-4 block text-sm font-semibold">Cash received</label>
          <input autoFocus type="number" min="0" step="0.01" value={received} onChange={(e) => setReceived(e.target.value)}
            className="mt-1 h-12 w-full rounded-lg border border-zinc-300 px-3 text-right text-xl font-bold outline-none focus:border-[#1E9E50]" placeholder="0.00" />
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {[5, 10, 20, 50].map((v) => (
              <button key={v} type="button" onClick={() => setReceived(String(v))} className="h-10 rounded-md bg-zinc-100 text-sm font-bold hover:bg-zinc-200">£{v}</button>
            ))}
            <button type="button" onClick={() => setReceived(total.toFixed(2))} className="h-10 rounded-md bg-zinc-800 text-sm font-bold text-white">Exact</button>
          </div>
          <div className={`mt-3 flex justify-between rounded-lg px-4 py-3 text-lg font-bold ${change != null && change < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
            <span>Change</span><span>{change == null ? "—" : money(Math.max(change, 0))}</span>
          </div>
        </>
      )}
      <button type="button" disabled={!ok || busy} onClick={() => onPay({ method, received: method === "cash" ? Number(received) : null })}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#1E9E50] text-lg font-black text-white disabled:opacity-50">
        {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Complete Payment
      </button>
    </Modal>
  );
}

export default function POSPage() {
  const auth = useSelector((s) => s.authStore.auth);
  const role = auth?.data?.user?.role;

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("dine_in");
  const [table, setTable] = useState("");
  const [waiter, setWaiter] = useState("");
  const [customer, setCustomer] = useState(null); // {userId, name, phone, email}
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState([]);
  const [custOpen, setCustOpen] = useState(false);
  const [address, setAddress] = useState({ address: "", postcode: "" });
  const [discount, setDiscount] = useState("");
  const [editDiscount, setEditDiscount] = useState(false);
  const [notes, setNotes] = useState("");

  const [meta, setMeta] = useState({ tables: [], waiters: [] });
  const [deliveryFee, setDeliveryFee] = useState(3.99);
  const [modal, setModal] = useState(null); // pay | ongoing | today | holds | payOrder
  const [payOrder, setPayOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [holds, setHolds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(newKey);
  const searchRef = useRef(null);

  /* ---------------- data ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([
          axios.get("/api/category", { params: { deleteType: "SD", size: 200 } }),
          axios.get("/api/product", { params: { deleteType: "SD", size: 1000 } }),
        ]);
        setCategories([...(c.data.data || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        setProducts(p.data.data || []);
      } catch {
        showToast("error", "Failed to load the menu");
      } finally {
        setLoading(false);
      }
    })();
    axios.get("/api/settings/public").then(({ data }) => typeof data?.data?.deliveryFee === "number" && setDeliveryFee(data.data.deliveryFee)).catch(() => {});
    setHolds(readHolds());
  }, []);

  const loadMeta = useCallback(() => {
    axios.get("/api/pos/meta").then(({ data }) => data.success && setMeta(data.data)).catch(() => {});
  }, []);
  useEffect(() => loadMeta(), [loadMeta]);

  useEffect(() => {
    if (custQuery.trim().length < 2) return setCustResults([]);
    const t = setTimeout(() => {
      axios.get("/api/pos/customers/search", { params: { q: custQuery.trim() } }).then(({ data }) => data.success && setCustResults(data.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [custQuery]);

  const loadOrders = async (scope) => {
    setOrdersLoading(true);
    setModal(scope);
    try {
      const { data } = await axios.get("/api/pos/orders", { params: { scope } });
      setOrders(data.data || []);
    } catch {
      showToast("error", "Could not load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  /* ---------------- cart ---------------- */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => p.posVisible !== false && (!category || p.categoryId === category) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, category, search]);

  const add = (p) => {
    if (p.available === false) return showToast("error", `${p.name} is sold out`);
    setCart((c) => {
      const f = c.find((i) => i.productId === p._id);
      return f ? c.map((i) => (i.productId === p._id ? { ...i, quantity: i.quantity + 1 } : i)) : [...c, { productId: p._id, name: p.name, price: p.sellingPrice || 0, quantity: 1 }];
    });
  };
  const qty = (id, d) => setCart((c) => c.map((i) => (i.productId === id ? { ...i, quantity: i.quantity + d } : i)).filter((i) => i.quantity > 0));
  const setQty = (id, v) => setCart((c) => c.map((i) => (i.productId === id ? { ...i, quantity: Math.max(1, Number(v) || 1) } : i)));

  const items = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const fee = orderType === "delivery" ? deliveryFee : 0;
  const payable = Math.max(subtotal - disc + fee, 0);

  const reset = () => {
    setCart([]);
    setDiscount("");
    setNotes("");
    setCustomer(null);
    setCustQuery("");
    setAddress({ address: "", postcode: "" });
    setTable("");
    setKey(newKey());
  };

  const checks = () => {
    if (!cart.length) return showToast("error", "Add some food first"), false;
    if (orderType === "dine_in" && !table) return showToast("error", "Please select a table"), false;
    if (orderType === "delivery" && !address.address.trim()) return showToast("error", "Enter the delivery address"), false;
    return true;
  };

  async function submit(paymentMethod, cashReceived) {
    const kot = window.open("", "_blank");
    setBusy(true);
    try {
      const { data } = await axios.post("/api/pos/checkout", {
        orderType,
        table,
        waiter,
        customer: {
          userId: customer?.userId || null,
          name: customer?.name || "Guest",
          phone: customer?.phone || "N/A",
          email: customer?.email || "",
        },
        deliveryAddress: orderType === "delivery" ? { ...address, city: "London" } : undefined,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        discountType: "fixed",
        discountValue: disc,
        notes,
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashReceived : undefined,
        idempotencyKey: key,
      });
      if (!data.success) throw new Error(data.message);
      const o = data.data.order;
      if (kot) kot.location.href = printUrl(o._id, true);
      showToast("success", paymentMethod === "pending" ? `Order ${o.orderNumber} sent to kitchen` : `Paid · ${o.orderNumber}`);
      reset();
      setModal(null);
      loadMeta();
    } catch (e) {
      kot?.close();
      showToast("error", e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function settle(order, { method, received }) {
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/pos/orders/${order._id}/pay`, { paymentMethod: method, cashReceived: received });
      if (!data.success) throw new Error(data.message);
      showToast("success", `${order.orderNumber} paid${data.data.changeDue ? ` · change ${money(data.data.changeDue)}` : ""}`);
      window.open(printUrl(order._id, false), "_blank");
      setPayOrder(null);
      loadMeta();
      loadOrders("ongoing");
    } catch (e) {
      showToast("error", e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  const hold = () => {
    if (!cart.length) return showToast("error", "Nothing to hold");
    const h = [{ id: Date.now(), at: new Date().toISOString(), cart, orderType, table, waiter, customer, discount, notes, total: payable }, ...holds].slice(0, 30);
    setHolds(h);
    writeHolds(h);
    reset();
    showToast("success", "Order put on hold");
  };
  const restore = (h) => {
    setCart(h.cart);
    setOrderType(h.orderType);
    setTable(h.table || "");
    setWaiter(h.waiter || "");
    setCustomer(h.customer || null);
    setDiscount(h.discount || "");
    setNotes(h.notes || "");
    const rest = holds.filter((x) => x.id !== h.id);
    setHolds(rest);
    writeHolds(rest);
    setModal(null);
  };

  // Keyboard: F2 search, F8 hold, F9 instant payment
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F2") (e.preventDefault(), searchRef.current?.focus());
      if (e.key === "F8") (e.preventDefault(), hold());
      if (e.key === "F9") (e.preventDefault(), checks() && setModal("pay"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (auth !== null && role && !ALLOWED_ROLES.includes(role)) {
    return <div className="flex h-[60vh] items-center justify-center text-center"><h2 className="text-xl font-bold">The POS is for staff accounts only.</h2></div>;
  }

  const sel = "h-9 w-full rounded border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-[#1E9E50]";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#EEF1EC] text-zinc-800">
      {/* ===== top bar ===== */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
        <Link href="/admin/dashboard" className="flex h-10 w-12 items-center justify-center rounded bg-[#2F6B16] text-white" title="Back to dashboard"><Home size={18} /></Link>
        <button type="button" onClick={reset} className="h-10 rounded bg-[#1F4FD8] px-4 text-sm font-semibold text-white hover:brightness-110">New Order</button>
        <button type="button" onClick={() => loadOrders("ongoing")} className="h-10 rounded bg-[#7B2CBF] px-4 text-sm font-semibold text-white hover:brightness-110">On Going Order</button>
        <button type="button" onClick={() => loadOrders("today")} className="h-10 rounded bg-[#2D8EB5] px-4 text-sm font-semibold text-white hover:brightness-110">Today&apos;s Order</button>
        <Link href="/admin/kitchen" className="flex h-10 items-center gap-1.5 rounded bg-[#E1262D] px-4 text-sm font-semibold text-white hover:brightness-110"><ChefHat size={16} /> Kitchen</Link>

        <div className="ml-auto flex overflow-hidden rounded border border-zinc-300 bg-white">
          {ORDER_TYPES.map(([v, l]) => (
            <button key={v} type="button" onClick={() => setOrderType(v)} className={`h-10 px-3.5 text-sm font-semibold transition ${orderType === v ? "bg-[#2F6B16] text-white" : "hover:bg-zinc-100"}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* ===== body ===== */}
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {/* categories */}
        <div className="hidden w-[150px] flex-none space-y-1.5 overflow-y-auto pr-1 md:block">
          {[{ _id: null, name: "All" }, ...categories].map((c) => (
            <button key={c._id || "all"} type="button" onClick={() => setCategory(c._id)}
              className={`w-full rounded px-3 py-2.5 text-left text-[13px] font-semibold leading-tight shadow-sm transition ${category === c._id ? "bg-[#5DADE2] text-white" : "bg-[#2F6B16] text-white hover:bg-[#245511]"}`}>
              {c.name.split(" · ")[0]}
            </button>
          ))}
        </div>

        {/* food grid */}
        <div className="min-w-0 flex-1 overflow-y-auto rounded bg-white p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[#2F6B16]" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visible.map((p) => {
                const inCart = cart.find((i) => i.productId === p._id);
                return (
                  <button key={p._id} type="button" onClick={() => add(p)}
                    className={`relative overflow-hidden rounded border bg-white text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${inCart ? "border-[#1E9E50] ring-2 ring-[#1E9E50]/30" : "border-zinc-200"} ${p.available === false ? "opacity-50" : ""}`}>
                    <span className="relative block aspect-[4/3] bg-zinc-100">
                      {p.media?.[0]?.url && <Image src={p.media[0].url} alt={p.name} fill sizes="200px" className="object-cover" unoptimized />}
                      {inCart && <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1E9E50] px-1.5 text-xs font-black text-white">{inCart.quantity}</span>}
                      {p.available === false && <span className="absolute inset-x-0 bottom-0 bg-red-600 py-0.5 text-[10px] font-bold text-white">SOLD OUT</span>}
                    </span>
                    <span className="block px-2 pt-2 text-[13px] font-semibold leading-tight line-clamp-2">{p.name}</span>
                    <span className="block pb-2 text-[13px] font-bold text-[#2F6B16]">{money(p.sellingPrice)}</span>
                  </button>
                );
              })}
              {!visible.length && <p className="col-span-full py-16 text-center text-sm text-zinc-500">No food found.</p>}
            </div>
          )}
        </div>

        {/* bill */}
        <div className="flex w-full max-w-[560px] flex-none flex-col overflow-hidden rounded bg-white lg:w-[44%]">
          <div className="flex h-11 items-center border-b">
            <span className="flex h-full w-11 items-center justify-center border-r bg-zinc-50 text-zinc-500"><Search size={17} /></span>
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Enter food name (F2)" className="h-full flex-1 px-3 text-sm outline-none" />
            {search && <button type="button" onClick={() => setSearch("")} className="px-3 text-zinc-400"><X size={16} /></button>}
          </div>

          <div className="grid grid-cols-3 gap-2 border-b p-3">
            {/* customer */}
            <div className="relative">
              <div className="flex h-9 items-center gap-1.5 rounded border border-zinc-300 bg-white px-2 text-sm">
                <User size={15} className="text-zinc-500" />
                <input value={custOpen ? custQuery : customer?.name || ""} placeholder="Guest" onFocus={() => { setCustOpen(true); setCustQuery(""); }} onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                  onChange={(e) => setCustQuery(e.target.value)} className="min-w-0 flex-1 outline-none" />
                {customer && <button type="button" onClick={() => setCustomer(null)} className="text-zinc-400"><X size={13} /></button>}
              </div>
              {custOpen && (custResults.length > 0 || custQuery.trim().length >= 2) && (
                <div className="absolute left-0 right-0 top-10 z-20 max-h-56 overflow-y-auto rounded border bg-white shadow-lg">
                  {custResults.map((c) => (
                    <button key={c._id || c.phone} type="button" onMouseDown={() => setCustomer({ userId: c._id || c.userId, name: c.name, phone: c.phone, email: c.email })} className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50">
                      <b>{c.name}</b> <span className="text-xs text-zinc-500">{c.phone}</span>
                    </button>
                  ))}
                  {custQuery.trim().length >= 2 && (
                    <button type="button" onMouseDown={() => setCustomer(/\d{5,}/.test(custQuery) ? { name: "Customer", phone: custQuery.trim() } : { name: custQuery.trim(), phone: "N/A" })} className="block w-full border-t bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-700">
                      + Use “{custQuery.trim()}”
                    </button>
                  )}
                </div>
              )}
            </div>
            <select className={sel} value={waiter} onChange={(e) => setWaiter(e.target.value)} aria-label="Waiter">
              <option value="">Select waiter</option>
              {meta.waiters.map((w) => <option key={w._id} value={w.name}>{w.name}</option>)}
            </select>
            {orderType === "dine_in" ? (
              <select className={`${sel} ${!table ? "border-amber-400" : ""}`} value={table} onChange={(e) => setTable(e.target.value)} aria-label="Table">
                <option value="">Select table</option>
                {meta.tables.map((t) => <option key={t.name} value={t.name}>{t.name}{t.busy ? ` · busy ${money(t.total)}` : ""}</option>)}
              </select>
            ) : (
              <span className="flex h-9 items-center justify-center rounded bg-zinc-100 text-xs font-semibold text-zinc-500">{ORDER_TYPES.find((o) => o[0] === orderType)[1]}</span>
            )}
          </div>

          {orderType === "delivery" && (
            <div className="grid grid-cols-[1fr_110px] gap-2 border-b p-3">
              <input className={sel} placeholder="Delivery address *" value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} />
              <input className={`${sel} uppercase`} placeholder="Postcode" value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value })} />
            </div>
          )}

          {/* cart table */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-[#1E9E50] text-white">
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="w-[110px] px-2 py-2 font-semibold">Quantity</th>
                  <th className="w-[70px] px-2 py-2 text-right font-semibold">Price</th>
                  <th className="w-[80px] px-2 py-2 text-right font-semibold">Total</th>
                  <th className="w-9 py-2"><button type="button" onClick={() => setCart([])} title="Clear items" className="mx-auto block opacity-90 hover:opacity-100"><Trash2 size={14} /></button></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((i) => (
                  <tr key={i.productId} className="border-b">
                    <td className="px-3 py-2 font-medium leading-tight">{i.name}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center">
                        <button type="button" onClick={() => qty(i.productId, -1)} className="flex h-7 w-7 items-center justify-center rounded-l border bg-zinc-50"><Minus size={12} /></button>
                        <input value={i.quantity} onChange={(e) => setQty(i.productId, e.target.value)} className="h-7 w-10 border-y text-center text-sm outline-none" inputMode="numeric" />
                        <button type="button" onClick={() => qty(i.productId, 1)} className="flex h-7 w-7 items-center justify-center rounded-r border bg-zinc-50"><Plus size={12} /></button>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{i.price.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{(i.price * i.quantity).toFixed(2)}</td>
                    <td className="py-2 text-center"><button type="button" onClick={() => qty(i.productId, -i.quantity)} className="text-red-500 hover:text-red-700"><X size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!cart.length && <p className="py-14 text-center text-sm text-zinc-400">Tap food on the left to add it to the bill.</p>}
          </div>

          {/* summary */}
          <div className="border-t bg-zinc-50 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-3 py-2">
              <span className="flex justify-between"><span>Items</span><b>{items}</b></span>
              <span className="flex justify-between"><span>Total</span><b className="tabular-nums">{subtotal.toFixed(2)}</b></span>
              <span className="flex justify-between"><span>{orderType === "delivery" ? "Delivery fee" : "VAT"}</span><b className="tabular-nums">{orderType === "delivery" ? fee.toFixed(2) : "Incl."}</b></span>
              <span className="flex items-center justify-between">
                <button type="button" onClick={() => setEditDiscount(true)} className="flex items-center gap-1 underline decoration-dotted">Discount</button>
                {editDiscount ? (
                  <input autoFocus type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} onBlur={() => setEditDiscount(false)} onKeyDown={(e) => e.key === "Enter" && setEditDiscount(false)} className="h-7 w-20 rounded border px-1.5 text-right" />
                ) : (
                  <b className="tabular-nums">({disc.toFixed(2)})</b>
                )}
              </span>
            </div>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Order note for the kitchen (e.g. no onions)" className="h-9 w-full border-t bg-white px-3 text-sm outline-none" />
            <div className="flex items-center justify-between bg-zinc-900 px-3 py-2.5 font-bold text-white">
              <span>Total Payable</span><span className="text-lg tabular-nums">{money(payable)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== bottom action bar ===== */}
      <div className="flex h-16 flex-none items-stretch text-white">
        <button type="button" onClick={reset} title="New order" className="flex w-16 items-center justify-center bg-[#8E7CC3] hover:brightness-110"><ChevronsLeft size={30} /></button>
        <div className="flex flex-1 items-center justify-center bg-[#5B4BA6] text-2xl font-black tracking-wide">Total : {money(payable)}</div>
        <button type="button" onClick={() => setModal("holds")} title="Hold list" className="relative flex w-16 items-center justify-center bg-[#B77B3C] hover:brightness-110">
          <List size={24} />{holds.length > 0 && <span className="absolute right-2 top-2 rounded-full bg-white px-1.5 text-[11px] font-black text-[#B77B3C]">{holds.length}</span>}
        </button>
        <button type="button" onClick={hold} className="w-24 bg-[#F7941D] text-xl font-bold hover:brightness-110 sm:w-32">Hold</button>
        <button type="button" onClick={reset} className="w-24 bg-[#E81E4D] text-xl font-bold hover:brightness-110 sm:w-32">Clear</button>
        <button type="button" disabled={busy} onClick={() => checks() && submit("pending")} className="w-24 bg-[#1F2BEA] text-xl font-bold hover:brightness-110 disabled:opacity-60 sm:w-36">
          {busy && modal !== "pay" ? <Loader2 className="mx-auto animate-spin" /> : "Order"}
        </button>
        <button type="button" onClick={() => checks() && setModal("pay")} className="w-36 bg-[#1E9E50] text-lg font-bold leading-tight hover:brightness-110 sm:w-48 sm:text-xl">Instant Payment</button>
      </div>

      {/* ===== modals ===== */}
      {modal === "pay" && <PaymentModal total={payable} busy={busy} onClose={() => setModal(null)} onPay={({ method, received }) => submit(method, received)} />}
      {payOrder && <PaymentModal title={`Bill · ${payOrder.orderNumber}${payOrder.table ? ` · ${payOrder.table}` : ""}`} total={payOrder.total} busy={busy} onClose={() => setPayOrder(null)} onPay={(p) => settle(payOrder, p)} />}

      {modal === "holds" && (
        <Modal title={`Hold List (${holds.length})`} onClose={() => setModal(null)} color="bg-[#B77B3C]">
          {!holds.length ? <p className="py-6 text-center text-sm text-zinc-500">No orders on hold.</p> : (
            <ul className="divide-y">
              {holds.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 text-sm">
                    <b>{h.customer?.name || "Guest"}</b> · {ORDER_TYPES.find((o) => o[0] === h.orderType)?.[1]}{h.table ? ` · ${h.table}` : ""}
                    <p className="truncate text-xs text-zinc-500">{h.cart.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <b className="tabular-nums">{money(h.total)}</b>
                    <button type="button" onClick={() => restore(h)} className="rounded bg-[#1E9E50] px-3 py-1.5 text-xs font-bold text-white">Restore</button>
                    <button type="button" onClick={() => { const r = holds.filter((x) => x.id !== h.id); setHolds(r); writeHolds(r); }} className="text-red-500"><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {(modal === "ongoing" || modal === "today") && (
        <Modal wide title={modal === "ongoing" ? "On Going Orders" : "Today's Orders"} onClose={() => setModal(null)} color={modal === "ongoing" ? "bg-[#7B2CBF]" : "bg-[#2D8EB5]"}>
          {modal === "ongoing" && meta.tables.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500"><Table2 size={14} /> Tables</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {meta.tables.map((t) => (
                  <div key={t.name} className={`rounded-lg border-2 p-2 text-center ${t.busy ? "border-[#E1262D] bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
                    <UtensilsCrossed size={16} className={`mx-auto ${t.busy ? "text-[#E1262D]" : "text-emerald-600"}`} />
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className={`text-[11px] font-semibold ${t.busy ? "text-[#E1262D]" : "text-emerald-700"}`}>{t.busy ? money(t.total) : "Free"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ordersLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : !orders.length ? (
            <p className="py-8 text-center text-sm text-zinc-500">No orders.</p>
          ) : (
            <div className="overflow-x-auto rounded border">
              <table className="w-full min-w-[680px] text-sm">
                <thead><tr className="bg-zinc-800 text-left text-white">
                  <th className="px-3 py-2">Order</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {orders.map((o) => {
                    const [label, cls] = STATUS[o.orderStatus] || [o.orderStatus, "bg-zinc-100"];
                    const unpaid = o.payment?.status !== "paid";
                    return (
                      <tr key={o._id} className="border-t">
                        <td className="px-3 py-2"><b>{o.orderNumber}</b><p className="text-[11px] text-zinc-500">{new Date(o.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {o.source === "pos" ? "POS" : "Online"}</p></td>
                        <td className="px-3 py-2">{ORDER_TYPES.find((t) => t[0] === o.orderType)?.[1] || o.orderType}{o.table ? ` · ${o.table}` : ""}</td>
                        <td className="px-3 py-2">{o.customer?.name}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{label}</span></td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums">{money(o.total)}</td>
                        <td className="px-3 py-2">{unpaid ? <span className="text-xs font-bold text-[#E1262D]">Unpaid</span> : <span className="text-xs font-bold text-emerald-600">Paid · {o.payment?.method}</span>}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1.5">
                            <a href={printUrl(o._id, true)} target="_blank" rel="noreferrer" title="Print KOT" className="flex h-8 items-center gap-1 rounded bg-zinc-100 px-2 text-xs font-semibold hover:bg-zinc-200"><ChefHat size={13} /> KOT</a>
                            <a href={printUrl(o._id, false)} target="_blank" rel="noreferrer" title="Print bill" className="flex h-8 items-center gap-1 rounded bg-zinc-100 px-2 text-xs font-semibold hover:bg-zinc-200"><Printer size={13} /> Bill</a>
                            {unpaid && o.orderStatus !== "cancelled" && (
                              <button type="button" onClick={() => setPayOrder(o)} className="h-8 rounded bg-[#1E9E50] px-3 text-xs font-bold text-white">Pay</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {modal === "today" && orders.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-zinc-100 p-3"><p className="text-xs text-zinc-500">Orders</p><p className="text-xl font-black">{orders.filter((o) => o.orderStatus !== "cancelled").length}</p></div>
              <div className="rounded-lg bg-zinc-100 p-3"><p className="text-xs text-zinc-500">Sales</p><p className="text-xl font-black">{money(orders.filter((o) => o.orderStatus !== "cancelled").reduce((s, o) => s + o.total, 0))}</p></div>
              <div className="rounded-lg bg-zinc-100 p-3"><p className="text-xs text-zinc-500">Unpaid</p><p className="text-xl font-black text-[#E1262D]">{money(orders.filter((o) => o.orderStatus !== "cancelled" && o.payment?.status !== "paid").reduce((s, o) => s + o.total, 0))}</p></div>
            </div>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500"><ClipboardList size={13} /> Unpaid dine-in orders keep their table busy until the bill is paid.</p>
        </Modal>
      )}
    </div>
  );
}
