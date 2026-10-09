"use client";

// Restaurant online ordering (Just Eat / Deliveroo style) — replaces the
// e-commerce /shop page. Category tabs with scroll-spy, dish rows with
// quick add, and a sticky basket that goes straight to checkout.

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bike, Minus, Plus, Search, ShoppingBag, Star, Store, Trash2 } from "lucide-react";
import { addIntoCart, decreaseQuantity, increaseQuantity, removeFromCart } from "@/store/reducer/cartReducer";

export const ORDER_TYPE_KEY = "sfg_order_type";
const money = (n) => `£${Number(n || 0).toFixed(2)}`;
const imgOf = (p) => {
  const m = p?.media?.[0];
  return (typeof m === "string" ? m : m?.url || m?.secure_url) || "/assets/food/spread.jpg";
};

function useOpenNow() {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" }).format(new Date()));
    setOpen(h >= 8);
  }, []);
  return open;
}

export default function OrderOnline() {
  const dispatch = useDispatch();
  const cart = useSelector((s) => s.cartStore?.products) || [];
  const [orderType, setOrderType] = useState("delivery");
  const [q, setQ] = useState("");
  const [active, setActive] = useState("");
  const [fee, setFee] = useState(3.99);
  const open = useOpenNow();
  const tabsRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDER_TYPE_KEY);
      if (saved === "pickup" || saved === "delivery") setOrderType(saved);
    } catch {}
    const sp = new URLSearchParams(window.location.search).get("q");
    if (sp) setQ(sp);
    axios.get("/api/settings/public").then(({ data }) => typeof data?.data?.deliveryFee === "number" && setFee(data.data.deliveryFee)).catch(() => {});
  }, []);

  const chooseType = (t) => {
    setOrderType(t);
    try {
      localStorage.setItem(ORDER_TYPE_KEY, t);
    } catch {}
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["oo-categories"],
    queryFn: async () => (await axios.get("/api/category?size=100")).data?.data || [],
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["oo-products"],
    queryFn: async () => (await axios.get("/api/product?size=500")).data?.data || [],
  });

  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    const byCat = new Map();
    for (const p of products) {
      if (p.onlineVisible === false) continue;
      if (term && !p.name.toLowerCase().includes(term) && !(p.description || "").toLowerCase().includes(term)) continue;
      const k = String(p.categoryId);
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k).push(p);
    }
    return [...categories]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((c) => ({ ...c, items: (byCat.get(String(c._id)) || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) }))
      .filter((c) => c.items.length);
  }, [categories, products, q]);

  // scroll-spy: highlight the category currently on screen
  useEffect(() => {
    if (!sections.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id.replace("cat-", ""));
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(`cat-${s._id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  useEffect(() => {
    const el = tabsRef.current?.querySelector(`[data-cat="${active}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  const jump = (id) => {
    const el = document.getElementById(`cat-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
  };

  const qtyOf = (id) => cart.find((c) => String(c.productId) === String(id))?.quantity || 0;
  const add = (p) =>
    dispatch(addIntoCart({ productId: p._id, variantId: "default", title: p.name, name: p.name, price: p.sellingPrice || p.mrp, image: imgOf(p), quantity: 1 }));

  const lines = cart.filter((c) => !String(c.productId || "").startsWith("category-"));
  const count = lines.reduce((s, c) => s + Number(c.quantity || 1), 0);
  const subtotal = lines.reduce((s, c) => s + Number(c.price || 0) * Number(c.quantity || 1), 0);
  const delivery = orderType === "delivery" ? fee : 0;

  const Basket = (
    <div className="flex max-h-[calc(100vh-150px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0F2109]">
      <div className="border-b border-white/10 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingBag size={19} className="text-[#F7C318]" /> Your basket</h2>
        <div className="mt-3 grid grid-cols-2 rounded-full bg-black/30 p-1 text-sm font-bold">
          {[["delivery", "Delivery", Bike], ["pickup", "Collection", Store]].map(([v, l, Icon]) => (
            <button key={v} type="button" onClick={() => chooseType(v)} className={`flex items-center justify-center gap-1.5 rounded-full py-2 transition ${orderType === v ? "bg-[#F7C318] text-[#0A1806]" : "text-white/70"}`}>
              <Icon size={15} /> {l}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {!lines.length ? (
          <div className="py-8 text-center text-sm text-white/50">
            <ShoppingBag className="mx-auto mb-2 opacity-30" size={40} />
            Your basket is empty. Add something tasty!
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {lines.map((c) => (
                <motion.li key={c.productId} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-3">
                  <div className="flex items-center rounded-full bg-white/[0.06]">
                    <button type="button" aria-label="Less" onClick={() => dispatch(decreaseQuantity({ productId: c.productId }))} className="flex h-7 w-7 items-center justify-center"><Minus size={12} /></button>
                    <span className="w-5 text-center text-xs font-bold">{c.quantity}</span>
                    <button type="button" aria-label="More" onClick={() => dispatch(increaseQuantity({ productId: c.productId }))} className="flex h-7 w-7 items-center justify-center"><Plus size={12} /></button>
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name || c.title}</span>
                  <span className="text-sm font-bold tabular-nums">{money(c.price * c.quantity)}</span>
                  <button type="button" aria-label="Remove" onClick={() => dispatch(removeFromCart({ productId: c.productId }))} className="text-white/30 hover:text-[#E1262D]"><Trash2 size={14} /></button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      <div className="border-t border-white/10 p-5">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-white/60"><span>Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
          <div className="flex justify-between text-white/60"><span>{orderType === "delivery" ? "Delivery fee" : "Collection"}</span><span>{delivery ? money(delivery) : "Free"}</span></div>
          <div className="flex justify-between pt-1 text-base font-bold"><span>Total</span><span className="tabular-nums text-[#F7C318]">{money(subtotal + (lines.length ? delivery : 0))}</span></div>
        </div>
        <Link
          href={lines.length ? "/checkout" : "#"}
          aria-disabled={!lines.length}
          className={`mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition ${lines.length ? "bg-[#E1262D] text-white hover:bg-[#C41D23]" : "pointer-events-none bg-white/10 text-white/40"}`}
        >
          Go to checkout <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A1806] pb-28 text-white lg:pb-16">
      {/* restaurant banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/assets/food/spread.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1806] via-[#0A1806]/70 to-[#0A1806]/30" />
        </div>
        <div className="relative mx-auto max-w-[1320px] px-4 pb-6 pt-10 lg:px-8 lg:pt-14">
          <p className="font-script text-2xl text-[#F7C318]">Order online</p>
          <h1 className="font-display text-4xl font-black sm:text-5xl">Shawon Food Gate</h1>
          <p className="mt-1 text-white/70">Biryani · Grill · Döner · Curry · Breakfast · 100% Halal</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] font-semibold">
            {open !== null && (
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${open ? "bg-[#4A8A22]/30 text-[#9BE07A]" : "bg-[#E1262D]/25 text-[#FFB4B6]"}`}>
                <span className={`h-2 w-2 rounded-full ${open ? "animate-pulse bg-[#5BE36B]" : "bg-[#E1262D]"}`} /> {open ? "Open now · till 12AM" : "Closed · opens 8AM"}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Bike size={14} className="text-[#F7C318]" /> Delivery 30–45 min · {money(fee)}</span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Store size={14} className="text-[#F7C318]" /> Collection ~15 min · Free</span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Star size={14} className="fill-[#F7C318] text-[#F7C318]" /> Loved in Forest Gate</span>
          </div>
        </div>
      </section>

      {/* sticky category tabs + search */}
      <div className="sticky top-[64px] z-30 border-y border-white/10 bg-[#0A1806]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2.5 lg:px-8">
          <label className="relative hidden w-64 flex-none sm:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" className="h-10 w-full rounded-full border border-white/10 bg-white/[0.05] pl-9 pr-3 text-sm outline-none placeholder:text-white/35 focus:border-[#F7C318]" />
          </label>
          <div ref={tabsRef} className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {sections.map((s) => (
              <button key={s._id} data-cat={s._id} type="button" onClick={() => jump(s._id)}
                className={`flex-none rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${active === String(s._id) ? "bg-[#E1262D] text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                {s.name.split(" · ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 pt-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div>
          <label className="relative mb-5 block sm:hidden">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" className="h-11 w-full rounded-full border border-white/10 bg-white/[0.05] pl-9 pr-3 text-sm outline-none" />
          </label>

          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[0.05]" />)}
            </div>
          )}

          {sections.map((s) => (
            <section key={s._id} id={`cat-${s._id}`} className="mb-10 scroll-mt-40">
              <h2 className="font-display text-2xl font-black sm:text-3xl">{s.name}</h2>
              {s.description && <p className="mt-1 text-sm text-white/55">{s.description}</p>}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {s.items.map((p) => {
                  const n = qtyOf(p._id);
                  const soldOut = p.available === false;
                  return (
                    <div key={p._id} className={`group flex gap-3 rounded-2xl border bg-[#0F2109] p-3 transition ${n ? "border-[#F7C318]/50" : "border-white/[0.07] hover:border-white/20"} ${soldOut ? "opacity-50" : ""}`}>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="font-bold leading-snug">{p.name}</h3>
                        {p.badge && <span className="mt-1 w-fit rounded-full bg-[#E1262D]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF7A7F]">{p.badge}</span>}
                        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/55">{p.description}</p>
                        <p className="mt-auto pt-2 font-bold text-[#F7C318]">{money(p.sellingPrice)}</p>
                      </div>
                      <div className="relative h-28 w-28 flex-none overflow-hidden rounded-xl sm:h-32 sm:w-32">
                        <Image src={imgOf(p)} alt={p.name} fill sizes="128px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                        {soldOut ? (
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[11px] font-bold">Sold out</span>
                        ) : n ? (
                          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center rounded-full bg-[#F7C318] text-[#0A1806] shadow-lg">
                            <button type="button" aria-label={`Remove one ${p.name}`} onClick={() => dispatch(decreaseQuantity({ productId: p._id }))} className="flex h-8 w-8 items-center justify-center"><Minus size={14} /></button>
                            <span className="w-5 text-center text-sm font-black">{n}</span>
                            <button type="button" aria-label={`Add one ${p.name}`} onClick={() => dispatch(increaseQuantity({ productId: p._id }))} className="flex h-8 w-8 items-center justify-center"><Plus size={14} /></button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => add(p)} aria-label={`Add ${p.name}`}
                            className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0A1806] shadow-lg transition hover:scale-110 hover:bg-[#F7C318]">
                            <Plus size={18} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {!isLoading && !sections.length && (
            <p className="py-16 text-center text-white/55">
              No dishes match “{q}”. <button type="button" onClick={() => setQ("")} className="font-bold text-[#F7C318] underline">Clear search</button>
            </p>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[140px]">{Basket}</div>
        </aside>
      </div>

      {/* mobile basket bar */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-3 pb-2 lg:hidden">
          <Link href="/checkout" className="flex h-14 items-center justify-between rounded-2xl bg-[#E1262D] px-5 font-extrabold text-white shadow-2xl">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/20 px-2 text-sm">{count}</span>
            View basket & checkout
            <span className="tabular-nums">{money(subtotal + delivery)}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
