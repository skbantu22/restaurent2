"use client";

// Demo 1 checkout — step-by-step wizard with a paper-receipt order card.
// Same logic as Demo 2's card checkout (useSfgCheckout), different layout.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bike,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Loader2,
  LocateFixed,
  Lock,
  MapPin,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import useSfgCheckout, { imageOf, MAX_MILES, money, priceOf } from "./useSfgCheckout";
import { decreaseQuantity, increaseQuantity, removeFromCart } from "@/store/reducer/cartReducer";

const STEPS = ["Order type", "Your details", "Time & payment", "Review"];

const input =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#F7C318] focus:bg-white/[0.06]";

function Label({ children, error }) {
  return (
    <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
      {children}
      {error && <span className="normal-case tracking-normal text-[#FF7A7F]">{error}</span>}
    </span>
  );
}

function BigOption({ on, onClick, image, icon: Icon, title, sub }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-44 overflow-hidden rounded-3xl text-left transition-all duration-300 sm:h-56 ${
        on ? "ring-4 ring-[#F7C318]" : "ring-1 ring-white/10 hover:ring-white/30"
      }`}
    >
      <Image src={image} alt="" fill sizes="(max-width:640px) 100vw, 40vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
      <span className={`absolute inset-0 transition-colors ${on ? "bg-gradient-to-t from-[#0A1806] via-[#0A1806]/60 to-[#0A1806]/10" : "bg-gradient-to-t from-[#0A1806] via-[#0A1806]/75 to-[#0A1806]/40"}`} />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
        <span>
          <span className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl ${on ? "bg-[#F7C318] text-[#0A1806]" : "bg-white/15 text-white"}`}>
            <Icon size={22} />
          </span>
          <span className="font-display block text-2xl font-black text-white">{title}</span>
          <span className="text-sm text-white/75">{sub}</span>
        </span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${on ? "border-[#F7C318] bg-[#F7C318] text-[#0A1806]" : "border-white/40"}`}>
          {on && <Check size={16} strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
}

function Pill({ on, onClick, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? "border-[#F7C318] bg-[#F7C318]/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
      }`}
    >
      <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${on ? "border-[#F7C318]" : "border-white/30"}`}>
        {on && <span className="h-2.5 w-2.5 rounded-full bg-[#F7C318]" />}
      </span>
      {children}
    </button>
  );
}

export default function SfgCheckoutWizard() {
  const c = useSfgCheckout({ theme: "dark", successBase: "" });
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const delivery = c.orderType === "delivery";

  const go = (n) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Validates only the fields that belong to the current step
  function stepValid(s) {
    const e = {};
    const f = c.form;
    if (s === 1) {
      if (f.name.trim().length < 2) e.name = "Required";
      if (f.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid number";
      if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Check email";
      if (delivery) {
        if (f.address.trim().length < 3) e.address = "Required";
        if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(f.postcode.trim())) e.postcode = "e.g. E7 9BB";
      }
    }
    if (s === 2 && c.when === "scheduled" && !c.slot) e.slot = "Pick a time";
    c.setErrors(e);
    if (s === 1 && c.outOfRange) return false;
    return Object.keys(e).length === 0;
  }

  const next = () => stepValid(step) && go(step + 1);

  if (!c.lines.length) {
    return (
      <div className="sfg-dots flex min-h-[72vh] items-center justify-center bg-[#0A1806] px-4 py-16 text-white">
        <div className="text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F7C318] text-[#0A1806]">
            <ShoppingBag size={34} />
          </span>
          <h1 className="font-display mt-5 text-4xl font-black">Your basket is empty</h1>
          <p className="mt-2 text-white/60">Pick something delicious from our menu first.</p>
          <Link href="/#our-menu" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#E1262D] px-7 text-sm font-bold">
            Browse the Menu <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- receipt ---------------- */
  const Receipt = (
    <div className="relative rounded-[6px] bg-[#FFFDF6] text-[#1A2614] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.8)]">
      {/* zig-zag top & bottom edges */}
      <div className="absolute -top-2 left-0 right-0 h-2 bg-[linear-gradient(135deg,transparent_50%,#FFFDF6_50%),linear-gradient(225deg,transparent_50%,#FFFDF6_50%)] bg-[length:16px_16px] bg-repeat-x" />
      <div className="absolute -bottom-2 left-0 right-0 h-2 rotate-180 bg-[linear-gradient(135deg,transparent_50%,#FFFDF6_50%),linear-gradient(225deg,transparent_50%,#FFFDF6_50%)] bg-[length:16px_16px] bg-repeat-x" />

      <div className="px-6 pb-6 pt-5">
        <div className="text-center">
          <p className="font-display text-xl font-black tracking-tight">Shawon Food Gate</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#1A2614]/50">179 Forest Ln · E7 9BB</p>
          <p className="mt-1 inline-block rounded-full bg-[#E1262D] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {delivery ? "Delivery" : "Collection"} · {c.when === "asap" ? "ASAP" : c.slot || "Scheduled"}
          </p>
        </div>

        <div className="my-4 border-t-2 border-dashed border-[#1A2614]/15" />

        <ul className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {c.lines.map((it) => (
              <motion.li key={it.productId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 20 }} className="flex gap-3">
                <span className="relative h-11 w-11 flex-none overflow-hidden rounded-lg bg-[#1A2614]/10">
                  {imageOf(it) && <Image src={imageOf(it)} alt="" fill sizes="44px" className="object-cover" unoptimized />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2 text-[13px] font-semibold">
                    <span className="line-clamp-1">{it.name || it.title}</span>
                    <span className="tabular-nums">{money(priceOf(it) * Number(it.quantity || 1))}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    {it.itemType !== "bundle" && (
                      <>
                        <button type="button" aria-label="Less" onClick={() => c.dispatch(decreaseQuantity({ productId: it.productId }))} className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1A2614]/8 hover:bg-[#1A2614]/15">
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{it.quantity}</span>
                        <button type="button" aria-label="More" onClick={() => c.dispatch(increaseQuantity({ productId: it.productId }))} className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1A2614]/8 hover:bg-[#1A2614]/15">
                          <Plus size={12} />
                        </button>
                      </>
                    )}
                    <button type="button" aria-label="Remove" onClick={() => c.dispatch(removeFromCart({ productId: it.productId }))} className="ml-auto text-[#1A2614]/40 hover:text-[#E1262D]">
                      <Trash2 size={13} />
                    </button>
                  </span>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <div className="my-4 border-t-2 border-dashed border-[#1A2614]/15" />

        {c.coupon ? (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-[#4A8A22]/10 px-3 py-2 text-xs font-bold text-[#2F6B16]">
            <span className="flex items-center gap-1.5"><Tag size={13} /> {c.coupon.code} −{c.coupon.discountPercentage}%</span>
            <button type="button" aria-label="Remove coupon" onClick={() => c.setCoupon(null)}><X size={14} /></button>
          </div>
        ) : (
          <div className="mb-3 flex gap-2">
            <input
              value={c.couponInput}
              onChange={(e) => c.setCouponInput(e.target.value)}
              placeholder="Coupon code"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#1A2614]/15 bg-white px-3 text-xs uppercase outline-none placeholder:normal-case focus:border-[#E1262D]"
            />
            <button type="button" onClick={c.applyCoupon} disabled={c.couponBusy} className="h-10 rounded-lg bg-[#1A2614] px-3 text-xs font-bold text-white disabled:opacity-60">
              {c.couponBusy ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
            </button>
          </div>
        )}

        <dl className="space-y-1.5 text-[13px] tabular-nums">
          <div className="flex justify-between"><dt className="text-[#1A2614]/60">Subtotal ({c.itemCount})</dt><dd>{money(c.subtotal)}</dd></div>
          {c.discount > 0 && <div className="flex justify-between text-[#2F6B16]"><dt>Discount</dt><dd>−{money(c.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-[#1A2614]/60">{delivery ? "Delivery" : "Collection"}</dt><dd>{c.fee ? money(c.fee) : "FREE"}</dd></div>
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t-2 border-[#1A2614] pt-3">
          <span className="text-sm font-black uppercase tracking-wider">Total</span>
          <span className="font-display text-3xl font-black text-[#E1262D]">{money(c.total)}</span>
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.25em] text-[#1A2614]/40">★ 100% Halal · Thank you ★</p>
      </div>
    </div>
  );

  /* ---------------- steps ---------------- */
  const steps = [
    // 0 — order type
    <div key="s0">
      <h2 className="font-display text-3xl font-black sm:text-4xl">How would you like it?</h2>
      <p className="mt-1 text-white/60">Choose delivery to your door or collect from our kitchen.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <BigOption on={delivery} onClick={() => c.setOrderType("delivery")} image="/assets/food/doner.jpg" icon={Bike} title="Delivery" sub={`30–45 min · ${money(c.deliveryFee)}`} />
        <BigOption on={!delivery} onClick={() => c.setOrderType("pickup")} image="/assets/food/interior.jpg" icon={Store} title="Collection" sub="Ready in ~15 min · Free" />
      </div>
    </div>,

    // 1 — details
    <div key="s1">
      <h2 className="font-display text-3xl font-black sm:text-4xl">Your details</h2>
      <p className="mt-1 text-white/60">So we can confirm your order and keep you updated.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label><Label error={c.errors.name}>Full name</Label><input className={input} value={c.form.name} onChange={c.set("name")} autoComplete="name" placeholder="Aisha Rahman" /></label>
        <label><Label error={c.errors.phone}>Phone</Label><input className={input} value={c.form.phone} onChange={c.set("phone")} autoComplete="tel" inputMode="tel" placeholder="07700 900000" /></label>
        <label className="sm:col-span-2"><Label error={c.errors.email}>Email · for your receipt</Label><input className={input} value={c.form.email} onChange={c.set("email")} autoComplete="email" inputMode="email" placeholder="you@example.com" /></label>
      </div>

      {delivery && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold"><MapPin size={18} className="text-[#E1262D]" /> Delivery address</h3>
            <button type="button" onClick={c.useMyLocation} disabled={c.locating} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/15">
              {c.locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />} Use my location
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <label><Label error={c.errors.address}>Address</Label><input className={input} value={c.form.address} onChange={c.set("address")} onBlur={() => c.checkAddress(`${c.form.address} ${c.form.postcode}`)} autoComplete="street-address" placeholder="House number and street" /></label>
            <label><Label error={c.errors.postcode}>Postcode</Label><input className={`${input} uppercase`} value={c.form.postcode} onChange={c.set("postcode")} onBlur={() => c.checkAddress(`${c.form.address} ${c.form.postcode}`)} autoComplete="postal-code" placeholder="E7 9BB" /></label>
            <label className="sm:col-span-2"><Label>Delivery notes (optional)</Label><input className={input} value={c.form.notes} onChange={c.set("notes")} placeholder="Flat, buzzer, landmark…" /></label>
          </div>
          {(c.checking || c.distance !== null) && (
            <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${c.outOfRange ? "text-[#FF7A7F]" : "text-[#9BE07A]"}`}>
              {c.checking ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
              {c.checking
                ? "Checking your address…"
                : c.outOfRange
                  ? `About ${c.distance.toFixed(1)} miles away, outside our ${MAX_MILES}-mile delivery area. Switch to Collection?`
                  : `We deliver to you (about ${c.distance.toFixed(1)} miles away).`}
            </p>
          )}
        </div>
      )}
    </div>,

    // 2 — time & payment
    <div key="s2">
      <h2 className="font-display text-3xl font-black sm:text-4xl">When & how to pay</h2>
      <p className="mt-1 text-white/60">Order now, or schedule for later today.</p>

      <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-white/60"><Clock size={15} /> {delivery ? "Delivery" : "Collection"} time</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Pill on={c.when === "asap"} onClick={() => c.setWhen("asap")}>
          <span><b className="block">As soon as possible</b><span className="text-xs text-white/55">{delivery ? "Usually 30–45 min" : "Ready in about 15–20 min"}</span></span>
        </Pill>
        <Pill on={c.when === "scheduled"} onClick={() => c.setWhen("scheduled")} disabled={!c.slots.length}>
          <span><b className="block">Schedule for later</b><span className="text-xs text-white/55">{c.slots.length ? "Choose a time today" : "No more slots today"}</span></span>
        </Pill>
      </div>
      <AnimatePresence initial={false}>
        {c.when === "scheduled" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {c.slots.slice(0, 24).map((s) => (
                <button key={s} type="button" onClick={() => { c.setSlot(s); c.setErrors((e) => ({ ...e, slot: undefined })); }}
                  className={`h-10 rounded-xl text-sm font-bold tabular-nums transition ${c.slot === s ? "bg-[#F7C318] text-[#0A1806]" : "bg-white/[0.05] hover:bg-white/10"}`}>
                  {s}
                </button>
              ))}
            </div>
            {c.errors.slot && <p className="mt-2 text-xs font-semibold text-[#FF7A7F]">{c.errors.slot}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <label className="mt-5 block"><Label>Note for the kitchen (optional)</Label><input className={input} value={c.form.orderNotes} onChange={c.set("orderNotes")} placeholder="Extra spicy 🌶️, no onions…" /></label>

      <h3 className="mb-3 mt-7 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-white/60"><CreditCard size={15} /> Payment</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Pill on={c.payment === "stripe"} onClick={() => c.setPayment("stripe")}>
          <CreditCard size={20} className="text-[#F7C318]" />
          <span><b className="block">Card</b><span className="text-xs text-white/55">Visa, Mastercard, Amex · secure via Stripe</span></span>
        </Pill>
        <Pill on={c.payment === "cod"} onClick={() => c.setPayment("cod")} disabled={delivery}>
          <Banknote size={20} className="text-[#F7C318]" />
          <span><b className="block">Cash on collection</b><span className="text-xs text-white/55">{delivery ? "Collection orders only" : "Pay when you pick up"}</span></span>
        </Pill>
      </div>
    </div>,

    // 3 — review
    <div key="s3">
      <h2 className="font-display text-3xl font-black sm:text-4xl">Check & confirm</h2>
      <p className="mt-1 text-white/60">Everything look right?</p>
      <div className="mt-6 divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
        {[
          [0, delivery ? Bike : Store, delivery ? "Delivery" : "Collection", delivery ? `${money(c.fee)} delivery fee` : "179 Forest Ln, London E7 9BB"],
          [1, ShoppingBag, c.form.name || "Your details", [c.form.phone, c.form.email].filter(Boolean).join(" · ")],
          ...(delivery ? [[1, MapPin, c.form.address, `${c.form.postcode.toUpperCase()}${c.form.notes ? " · " + c.form.notes : ""}`]] : []),
          [2, Clock, c.when === "asap" ? "As soon as possible" : `Scheduled for ${c.slot}`, c.form.orderNotes || "No kitchen note"],
          [2, c.payment === "stripe" ? CreditCard : Banknote, c.payment === "stripe" ? "Card payment" : "Cash on collection", c.payment === "stripe" ? "You'll pay on Stripe's secure page" : "Pay when you collect"],
        ].map(([s, Icon, title, sub], i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/10 text-[#F7C318]"><Icon size={18} /></span>
            <span className="min-w-0 flex-1"><b className="block truncate">{title}</b><span className="block truncate text-sm text-white/55">{sub}</span></span>
            <button type="button" onClick={() => go(s)} className="flex items-center gap-1 text-xs font-bold text-[#F7C318] hover:underline"><Pencil size={12} /> Edit</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={c.placeOrder}
        disabled={c.placing || c.outOfRange}
        className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#E1262D] text-lg font-extrabold shadow-[0_18px_40px_-14px_rgba(225,38,45,0.9)] transition hover:-translate-y-0.5 hover:bg-[#C41D23] disabled:opacity-60"
      >
        {c.placing ? <Loader2 className="animate-spin" /> : <Lock size={20} />}
        {c.placing ? "Placing your order…" : c.payment === "stripe" ? `Pay ${money(c.total)} securely` : `Place order · ${money(c.total)}`}
      </button>
    </div>,
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A1806] pb-28 text-white lg:pb-16">
      <div className="sfg-dots pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#E1262D]/15 blur-[120px]" />

      <div className="relative mx-auto max-w-[1180px] px-4 pt-8 lg:px-8 lg:pt-10">
        {/* stepper */}
        <div className="mb-8 flex items-center gap-2 sm:gap-3">
          {STEPS.map((s, i) => (
            <button key={s} type="button" onClick={() => i < step && go(i)} disabled={i > step} className="group flex flex-1 flex-col gap-2 text-left disabled:cursor-default">
              <span className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.span className="absolute inset-y-0 left-0 rounded-full bg-[#F7C318]" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </span>
              <span className={`hidden text-xs font-bold uppercase tracking-[0.12em] sm:block ${i === step ? "text-[#F7C318]" : i < step ? "text-white/80" : "text-white/35"}`}>
                {i < step ? "✓ " : `${i + 1}. `}{s}
              </span>
            </button>
          ))}
        </div>
        <p className="-mt-5 mb-6 text-xs font-bold uppercase tracking-[0.14em] text-[#F7C318] sm:hidden">Step {step + 1} of 4 · {STEPS[step]}</p>

        {c.canceled && (
          <div className="mb-5 rounded-2xl border border-[#E1262D]/40 bg-[#E1262D]/10 px-4 py-3 text-sm">
            Payment was cancelled, so nothing was charged. Your order is saved; you can try again.
          </div>
        )}

        {/* mobile receipt toggle */}
        <div className="mb-5 lg:hidden">
          <button type="button" onClick={() => setReceiptOpen((o) => !o)} className="flex w-full items-center justify-between rounded-2xl bg-[#FFFDF6] px-4 py-3 text-[#1A2614]">
            <span className="flex items-center gap-2 text-sm font-bold"><ShoppingBag size={16} /> {c.itemCount} items</span>
            <span className="flex items-center gap-2 font-display text-xl font-black text-[#E1262D]">{money(c.total)} <ChevronDown size={18} className={`transition ${receiptOpen ? "rotate-180" : ""}`} /></span>
          </button>
          <AnimatePresence initial={false}>
            {receiptOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-4">
                {Receipt}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: 40 * dir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 * dir }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>

            {step < 3 && (
              <div className="mt-8 hidden items-center justify-between lg:flex">
                {step > 0 ? (
                  <button type="button" onClick={() => go(step - 1)} className="flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold text-white/70 hover:text-white"><ArrowLeft size={16} /> Back</button>
                ) : (
                  <Link href="/#our-menu" className="flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold text-white/70 hover:text-white"><ArrowLeft size={16} /> Menu</Link>
                )}
                <button type="button" onClick={next} disabled={c.checking} className="group flex h-12 items-center gap-2 rounded-full bg-[#F7C318] px-8 text-sm font-extrabold text-[#0A1806] transition hover:-translate-y-0.5 disabled:opacity-60">
                  Continue <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </button>
              </div>
            )}
            {step === 3 && (
              <button type="button" onClick={() => go(2)} className="mt-4 hidden items-center gap-2 text-sm font-bold text-white/60 hover:text-white lg:flex"><ArrowLeft size={16} /> Back</button>
            )}
          </div>

          <aside className="hidden pt-2 lg:sticky lg:top-28 lg:block">{Receipt}</aside>
        </div>
      </div>

      {/* mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-white/10 bg-[#0A1806]/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} aria-label="Back" className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/10"><ArrowLeft /></button>
        )}
        {step < 3 ? (
          <button type="button" onClick={next} disabled={c.checking} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#F7C318] text-base font-extrabold text-[#0A1806] disabled:opacity-60">
            Continue <ArrowRight size={18} />
          </button>
        ) : (
          <button type="button" onClick={c.placeOrder} disabled={c.placing || c.outOfRange} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#E1262D] text-base font-extrabold disabled:opacity-60">
            {c.placing ? <Loader2 className="animate-spin" /> : <Lock size={18} />} {c.payment === "stripe" ? `Pay ${money(c.total)}` : `Place order · ${money(c.total)}`}
          </button>
        )}
      </div>
    </div>
  );
}
