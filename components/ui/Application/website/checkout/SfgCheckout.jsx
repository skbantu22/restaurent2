"use client";

// Shawon Food Gate checkout — card layout (used by Demo 2, theme="light").
// Demo 1 uses the step-by-step SfgCheckoutWizard. Both share the logic in
// useSfgCheckout (posts to /api/checkout; the server re-prices every item).

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Bike,
  Check,
  Clock,
  CreditCard,
  Loader2,
  LocateFixed,
  Lock,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import useSfgCheckout, { imageOf, MAX_MILES, money, priceOf } from "./useSfgCheckout";
import {
  decreaseQuantity,
  increaseQuantity,
  removeFromCart,
} from "@/store/reducer/cartReducer";

const THEMES = {
  dark: {
    page: "bg-[#0A1806] text-white",
    card: "bg-[#0F2109] border border-[#214419]",
    soft: "bg-[#0A1806]/70 border border-[#214419]",
    muted: "text-white/60",
    heading: "font-display font-black text-white",
    input:
      "bg-[#0A1806] border border-[#214419] text-white placeholder:text-white/35 focus:border-[#F7C318] focus:ring-2 focus:ring-[#F7C318]/20",
    choice: "border-[#214419] bg-[#0A1806]/60 hover:border-[#F7C318]/50",
    choiceOn: "border-[#F7C318] bg-[#F7C318]/10 ring-2 ring-[#F7C318]/25",
    tick: "bg-[#F7C318] text-[#0A1806]",
    accentText: "text-[#F7C318]",
    stepDot: "bg-[#F7C318] text-[#0A1806]",
    divider: "border-[#214419]",
    primary: "bg-[#E1262D] hover:bg-[#C41D23] text-white",
    back: "text-white/70 hover:text-[#F7C318]",
    shopHref: "/#our-menu",
    successBase: "",
  },
  light: {
    page: "bg-[#FFFBF2] text-[#1F3313] font-d2-body",
    card: "bg-white shadow-[0_12px_34px_-18px_rgba(31,51,19,0.35)] ring-1 ring-[#1F3313]/5",
    soft: "bg-[#FFFBF2] ring-1 ring-[#1F3313]/8",
    muted: "text-[#5B6B52]",
    heading: "font-d2-display text-[#1F3313]",
    input:
      "bg-white border border-[#1F3313]/15 text-[#1F3313] placeholder:text-[#1F3313]/35 focus:border-[#E1262D] focus:ring-2 focus:ring-[#E1262D]/15",
    choice: "border-[#1F3313]/12 bg-white hover:border-[#2F6B16]/50",
    choiceOn: "border-[#2F6B16] bg-[#2F6B16]/5 ring-2 ring-[#2F6B16]/20",
    tick: "bg-[#2F6B16] text-white",
    accentText: "text-[#2F6B16]",
    stepDot: "bg-[#E1262D] text-white",
    divider: "border-[#1F3313]/10",
    primary: "bg-[#E1262D] hover:bg-[#C41D23] text-white",
    back: "text-[#2F6B16] hover:text-[#E1262D]",
    shopHref: "/demo-2#menu",
    successBase: "/demo-2",
  },
};

function Choice({ on, onClick, icon: Icon, title, sub, t, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
        on ? t.choiceOn : t.choice
      }`}
    >
      <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${on ? t.tick : "bg-black/5 dark:bg-white/5"}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{title}</span>
        {sub && <span className={`block text-xs ${t.muted}`}>{sub}</span>}
      </span>
      {on && (
        <span className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ${t.tick}`}>
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Step({ n, title, t, children, right }) {
  return (
    <section className={`rounded-3xl p-5 sm:p-6 ${t.card}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-bold">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${t.stepDot}`}>{n}</span>
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, error, t, children }) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${t.muted}`}>{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-[#FF6B70]">{error}</span>}
    </label>
  );
}

export default function SfgCheckout({ theme = "dark" }) {
  const t = THEMES[theme] || THEMES.dark;
  const { dispatch, products, lines, itemCount, subtotal, discount, fee, total, outOfRange, orderType, setOrderType, payment, setPayment, when, setWhen, slot, setSlot, slots, form, set, errors, setErrors, deliveryFee, distance, checking, locating, couponInput, setCouponInput, coupon, setCoupon, couponBusy, placing, canceled, checkAddress, useMyLocation, applyCoupon, placeOrder } = useSfgCheckout({ theme, successBase: t.successBase });
  /* ---------------- empty basket ---------------- */
  if (!lines.length) {
    return (
      <div className={`flex min-h-[70vh] items-center justify-center px-4 py-16 ${t.page}`}>
        <div className={`w-full max-w-md rounded-3xl p-8 text-center ${t.card}`}>
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${t.tick}`}>
            <ShoppingBag size={28} />
          </span>
          <h1 className={`mt-4 text-3xl ${t.heading}`}>Your basket is empty</h1>
          <p className={`mt-2 text-sm ${t.muted}`}>Add some of our biryani, grill or breakfast favourites to get started.</p>
          <Link href={t.shopHref} className={`mt-6 inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-bold ${t.primary}`}>
            Browse the Menu
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- summary (shared by desktop + mobile) ---------------- */
  const Summary = (
    <div className={`rounded-3xl p-5 sm:p-6 ${t.card}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Your Order</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${t.tick}`}>
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
      </div>

      <ul className={`max-h-[320px] space-y-3 overflow-y-auto pr-1`}>
        <AnimatePresence initial={false}>
          {lines.map((it) => (
            <motion.li
              key={it.productId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="flex gap-3"
            >
              <span className="relative h-14 w-14 flex-none overflow-hidden rounded-xl bg-black/10">
                {imageOf(it) && <Image src={imageOf(it)} alt="" fill sizes="56px" className="object-cover" unoptimized />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="line-clamp-1 text-sm font-semibold">{it.name || it.title}</span>
                  <button
                    type="button"
                    onClick={() => dispatch(removeFromCart({ productId: it.productId }))}
                    aria-label="Remove"
                    className={`${t.muted} hover:text-[#E1262D]`}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
                <span className="mt-1.5 flex items-center justify-between">
                  {it.itemType === "bundle" ? (
                    <span className={`text-xs ${t.muted}`}>Qty {it.quantity}</span>
                  ) : (
                    <span className={`flex items-center rounded-full ${t.soft}`}>
                      <button type="button" aria-label="Less" onClick={() => dispatch(decreaseQuantity({ productId: it.productId }))} className="flex h-7 w-7 items-center justify-center">
                        <Minus size={13} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{it.quantity}</span>
                      <button type="button" aria-label="More" onClick={() => dispatch(increaseQuantity({ productId: it.productId }))} className="flex h-7 w-7 items-center justify-center">
                        <Plus size={13} />
                      </button>
                    </span>
                  )}
                  <span className="text-sm font-bold">{money(priceOf(it) * Number(it.quantity || 1))}</span>
                </span>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* coupon */}
      <div className={`mt-5 border-t pt-4 ${t.divider}`}>
        {coupon ? (
          <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${t.soft}`}>
            <span className="flex items-center gap-2 font-semibold">
              <Tag size={15} className={t.accentText} /> {coupon.code} · {coupon.discountPercentage}% off
            </span>
            <button type="button" onClick={() => setCoupon(null)} aria-label="Remove coupon" className={t.muted}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Coupon code"
              className={`h-11 min-w-0 flex-1 rounded-xl px-3 text-sm uppercase outline-none placeholder:normal-case ${t.input}`}
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={couponBusy}
              className={`h-11 rounded-xl px-4 text-sm font-bold ${t.tick} disabled:opacity-60`}
            >
              {couponBusy ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
            </button>
          </div>
        )}
      </div>

      {/* totals */}
      <dl className={`mt-4 space-y-2 border-t pt-4 text-sm ${t.divider}`}>
        <div className="flex justify-between"><dt className={t.muted}>Subtotal</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
        {discount > 0 && (
          <div className="flex justify-between text-[#4CAF50]"><dt>Discount</dt><dd className="font-semibold">−{money(discount)}</dd></div>
        )}
        <div className="flex justify-between">
          <dt className={t.muted}>{orderType === "pickup" ? "Collection" : "Delivery fee"}</dt>
          <dd className="font-semibold">{fee ? money(fee) : "Free"}</dd>
        </div>
        <div className={`flex items-baseline justify-between border-t pt-3 ${t.divider}`}>
          <dt className="text-base font-bold">Total</dt>
          <dd className={`text-2xl ${t.heading}`}>{money(total)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={placeOrder}
        disabled={placing || outOfRange || checking}
        className={`mt-5 hidden h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold shadow-[0_14px_30px_-12px_rgba(225,38,45,0.75)] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 lg:flex ${t.primary}`}
      >
        {placing ? <Loader2 className="animate-spin" size={20} /> : <Lock size={18} />}
        {placing ? "Placing order…" : payment === "stripe" ? `Pay ${money(total)}` : `Place order · ${money(total)}`}
      </button>
      <p className={`mt-3 flex items-center justify-center gap-1.5 text-xs ${t.muted}`}>
        <ShieldCheck size={14} /> Secure checkout · 100% Halal
      </p>
    </div>
  );

  /* ---------------- page ---------------- */
  return (
    <div className={`min-h-screen pb-28 lg:pb-16 ${t.page}`}>
      <div className="mx-auto max-w-[1180px] px-4 pt-8 lg:px-8 lg:pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href={t.shopHref} className={`mb-2 inline-flex items-center gap-1.5 text-sm font-semibold ${t.back}`}>
              <ArrowLeft size={16} /> Back to menu
            </Link>
            <h1 className={`text-4xl sm:text-5xl ${t.heading}`}>Checkout</h1>
          </div>
          <ol className={`flex items-center gap-2 text-xs font-semibold ${t.muted}`}>
            {["Basket", "Details", "Payment"].map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${i < 2 ? t.stepDot : t.soft}`}>
                  {i === 0 ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                {s}
                {i < 2 && <span className="h-px w-6 bg-current opacity-30" />}
              </li>
            ))}
          </ol>
        </div>

        {canceled && (
          <div className="mb-5 rounded-2xl border border-[#E1262D]/40 bg-[#E1262D]/10 px-4 py-3 text-sm">
            Payment was cancelled, so nothing was charged. Your basket is saved below; you can try again.
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-5">
            <Step n={1} title="How would you like your order?" t={t}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice t={t} on={orderType === "delivery"} onClick={() => setOrderType("delivery")} icon={Bike} title="Delivery" sub={`To your door · ${money(deliveryFee)}`} />
                <Choice t={t} on={orderType === "pickup"} onClick={() => setOrderType("pickup")} icon={Store} title="Collection" sub="179 Forest Ln · Free" />
              </div>
            </Step>

            <Step n={2} title="Your details" t={t}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field t={t} label="Full name" error={errors.name}>
                  <input value={form.name} onChange={set("name")} autoComplete="name" className={`h-12 w-full rounded-xl px-4 text-sm outline-none ${t.input}`} placeholder="e.g. Aisha Rahman" />
                </Field>
                <Field t={t} label="Phone" error={errors.phone}>
                  <input value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" className={`h-12 w-full rounded-xl px-4 text-sm outline-none ${t.input}`} placeholder="07700 900000" />
                </Field>
                <div className="sm:col-span-2">
                  <Field t={t} label="Email (for your receipt)" error={errors.email}>
                    <input value={form.email} onChange={set("email")} autoComplete="email" inputMode="email" className={`h-12 w-full rounded-xl px-4 text-sm outline-none ${t.input}`} placeholder="you@example.com" />
                  </Field>
                </div>
              </div>
            </Step>

            <AnimatePresence initial={false}>
              {orderType === "delivery" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <Step
                    n={3}
                    title="Delivery address"
                    t={t}
                    right={
                      <button type="button" onClick={useMyLocation} disabled={locating} className={`flex items-center gap-1.5 text-xs font-bold ${t.accentText}`}>
                        {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />} Use my location
                      </button>
                    }
                  >
                    <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                      <Field t={t} label="Address" error={errors.address}>
                        <input
                          value={form.address}
                          onChange={set("address")}
                          onBlur={() => checkAddress(`${form.address} ${form.postcode}`)}
                          autoComplete="street-address"
                          className={`h-12 w-full rounded-xl px-4 text-sm outline-none ${t.input}`}
                          placeholder="House number and street"
                        />
                      </Field>
                      <Field t={t} label="Postcode" error={errors.postcode}>
                        <input
                          value={form.postcode}
                          onChange={set("postcode")}
                          onBlur={() => checkAddress(`${form.address} ${form.postcode}`)}
                          autoComplete="postal-code"
                          className={`h-12 w-full rounded-xl px-4 text-sm uppercase outline-none ${t.input}`}
                          placeholder="E7 9BB"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field t={t} label="Delivery notes (optional)">
                          <input value={form.notes} onChange={set("notes")} className={`h-12 w-full rounded-xl px-4 text-sm outline-none ${t.input}`} placeholder="Flat number, buzzer, landmarks…" />
                        </Field>
                      </div>
                    </div>
                    {(checking || distance !== null) && (
                      <p className={`mt-3 flex items-center gap-2 text-sm font-medium ${outOfRange ? "text-[#FF6B70]" : t.accentText}`}>
                        {checking ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                        {checking
                          ? "Checking your address…"
                          : outOfRange
                            ? `About ${distance.toFixed(1)} miles away, outside our ${MAX_MILES}-mile delivery area. Collection is available.`
                            : `Great, we deliver to you (about ${distance.toFixed(1)} miles away).`}
                      </p>
                    )}
                  </Step>
                </motion.div>
              )}
            </AnimatePresence>

            <Step n={orderType === "delivery" ? 4 : 3} title={orderType === "pickup" ? "Collection time" : "Delivery time"} t={t}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice t={t} on={when === "asap"} onClick={() => setWhen("asap")} icon={Clock} title="As soon as possible" sub={orderType === "pickup" ? "Ready in about 15–20 min" : "Usually 30–45 min"} />
                <Choice t={t} on={when === "scheduled"} onClick={() => setWhen("scheduled")} icon={Clock} title="Schedule for later" sub="Pick a time today" disabled={!slots.length} />
              </div>
              <AnimatePresence initial={false}>
                {when === "scheduled" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-4 flex flex-wrap gap-2">
                      {slots.slice(0, 24).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSlot(s);
                            setErrors((e) => ({ ...e, slot: undefined }));
                          }}
                          className={`h-10 rounded-xl border px-3.5 text-sm font-semibold transition-all ${slot === s ? t.choiceOn : t.choice}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {errors.slot && <p className="mt-2 text-xs font-medium text-[#FF6B70]">{errors.slot}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-4">
                <Field t={t} label="Note for the kitchen (optional)">
                  <input value={form.orderNotes} onChange={set("orderNotes")} className={`h-12 w-full rounded-xl px-4 text-sm outline-none ${t.input}`} placeholder="e.g. extra spicy, no onions" />
                </Field>
              </div>
            </Step>

            <Step n={orderType === "delivery" ? 5 : 4} title="Payment" t={t}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice t={t} on={payment === "stripe"} onClick={() => setPayment("stripe")} icon={CreditCard} title="Pay by card" sub="Visa · Mastercard · Amex, via Stripe" />
                <Choice
                  t={t}
                  on={payment === "cod"}
                  onClick={() => setPayment("cod")}
                  icon={Banknote}
                  title="Cash on collection"
                  sub={orderType === "pickup" ? "Pay when you collect" : "Only for collection orders"}
                  disabled={orderType !== "pickup"}
                />
              </div>
              <p className={`mt-3 flex items-center gap-1.5 text-xs ${t.muted}`}>
                <Lock size={13} /> Card details are entered on Stripe&apos;s secure page; we never see or store them.
              </p>
            </Step>

            <div className="lg:hidden">{Summary}</div>
          </div>

          <aside className="hidden lg:sticky lg:top-28 lg:block">{Summary}</aside>
        </div>
      </div>

      {/* mobile pay bar */}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden ${t.divider} ${theme === "light" ? "bg-white/95" : "bg-[#0A1806]/95"}`}>
        <button
          type="button"
          onClick={placeOrder}
          disabled={placing || outOfRange || checking}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold disabled:opacity-60 ${t.primary}`}
        >
          {placing ? <Loader2 className="animate-spin" size={20} /> : <Lock size={18} />}
          {placing ? "Placing order…" : payment === "stripe" ? `Pay ${money(total)}` : `Place order · ${money(total)}`}
        </button>
      </div>
    </div>
  );
}
