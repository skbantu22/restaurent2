import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, MapPin, Phone, Receipt, Store, Bike } from "lucide-react";

import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";
import PurchaseTracker from "@/components/ui/Application/website/PurchaseTracker";
import OrderSuccessClient from "@/components/ui/Application/website/OrderSuccessClient";

export const metadata = { title: "Order confirmed | Shawon Food Gate" };

const money = (n) => `£${Number(n || 0).toFixed(2)}`;

const STEPS = [
  ["placed", "Received"],
  ["preparing", "Preparing"],
  ["ready", "Ready"],
  ["out_for_delivery", "On the way"],
  ["delivered", "Delivered"],
];

export default async function Demo2OrderSuccess({ searchParams }) {
  const params = await searchParams;
  const id = params?.orderId;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return notFound();

  await connectDB();
  const raw = await OrderModel.findById(id).lean();
  if (!raw) return notFound();
  const order = JSON.parse(JSON.stringify(raw));

  const pickup = order.orderType === "pickup";
  const steps = pickup ? STEPS.filter(([k]) => k !== "out_for_delivery") : STEPS;
  const current = Math.max(0, steps.findIndex(([k]) => k === order.orderStatus));
  const paid = order.payment?.status === "paid";

  return (
    <div className="font-d2-body min-h-screen bg-[#FFFBF2] px-4 py-10 text-[#1F3313] lg:py-14">
      <PurchaseTracker order={order} />
      <OrderSuccessClient order={order} />

      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-[28px] bg-[#2F6B16] p-8 text-center text-white sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1.5px,transparent_1.6px)] [background-size:22px_22px]" />
          <div className="relative">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#2F6B16] shadow-xl">
              <CheckCircle2 size={36} />
            </span>
            <p className="font-script mt-4 text-3xl text-[#F7C318]">Thank you!</p>
            <h1 className="font-d2-display text-4xl sm:text-5xl">Your order is confirmed</h1>
            <p className="mt-2 text-white/80">
              {pickup ? "We'll have it ready for collection at 179 Forest Ln." : "We're getting it ready for delivery."}
            </p>
            <p className="mt-4 inline-block rounded-full bg-white/15 px-4 py-1.5 font-mono text-lg tracking-wider">
              {order.orderNumber}
            </p>
          </div>
        </div>

        {/* progress */}
        <div className="mt-5 rounded-3xl bg-white p-6 shadow-[0_12px_34px_-18px_rgba(31,51,19,0.35)]">
          <div className="flex items-center justify-between">
            {steps.map(([key, label], i) => (
              <div key={key} className="flex flex-1 flex-col items-center text-center last:flex-none">
                <div className="flex w-full items-center">
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold ${
                      i <= current ? "bg-[#E1262D] text-white" : "bg-[#F3EFE4] text-[#1F3313]/40"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span className={`mx-1 h-1 flex-1 rounded-full ${i < current ? "bg-[#E1262D]" : "bg-[#F3EFE4]"}`} />
                  )}
                </div>
                <span className={`mt-2 w-full pr-6 text-left text-xs font-semibold ${i <= current ? "text-[#1F3313]" : "text-[#1F3313]/40"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-[0_12px_34px_-18px_rgba(31,51,19,0.35)]">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              {pickup ? <Store size={18} className="text-[#2F6B16]" /> : <Bike size={18} className="text-[#2F6B16]" />}
              {pickup ? "Collection" : "Delivery"}
            </h2>
            <p className="font-semibold">{order.customer?.name}</p>
            <p className="flex items-center gap-2 text-sm text-[#5B6B52]"><Phone size={14} /> {order.customer?.phone}</p>
            {pickup ? (
              <p className="mt-2 flex items-start gap-2 text-sm text-[#5B6B52]"><MapPin size={14} className="mt-0.5" /> 179 Forest Ln, London E7 9BB</p>
            ) : (
              <p className="mt-2 flex items-start gap-2 text-sm text-[#5B6B52]">
                <MapPin size={14} className="mt-0.5" />
                {[order.deliveryAddress?.address, order.deliveryAddress?.postcode].filter(Boolean).join(", ")}
              </p>
            )}
            {order.notes && <p className="mt-2 flex items-start gap-2 text-sm text-[#5B6B52]"><Clock size={14} className="mt-0.5" /> {order.notes}</p>}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-[0_12px_34px_-18px_rgba(31,51,19,0.35)]">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><Receipt size={18} className="text-[#2F6B16]" /> Payment</h2>
            <p className="text-sm text-[#5B6B52]">
              {order.payment?.method === "stripe" ? "Card (Stripe)" : "Cash on collection"}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                paid ? "bg-[#2F6B16]/10 text-[#2F6B16]" : "bg-[#F7C318]/25 text-[#8A6A00]"
              }`}
            >
              {paid ? "Paid" : order.payment?.method === "stripe" ? "Confirming payment…" : "Pay on collection"}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-white p-6 shadow-[0_12px_34px_-18px_rgba(31,51,19,0.35)]">
          <h2 className="mb-4 font-bold">Order summary</h2>
          <ul className="divide-y divide-[#1F3313]/8">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4 py-2.5 text-sm">
                <span><b className="text-[#E1262D]">{it.quantity}×</b> {it.name}</span>
                <span className="font-semibold">{money(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-[#1F3313]/10 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-[#5B6B52]">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-[#2F6B16]"><dt>Discount</dt><dd>−{money(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-[#5B6B52]">{pickup ? "Collection" : "Delivery"}</dt><dd>{order.deliveryFee ? money(order.deliveryFee) : "Free"}</dd></div>
            <div className="flex items-baseline justify-between pt-1"><dt className="font-bold">Total</dt><dd className="font-d2-display text-2xl text-[#E1262D]">{money(order.total)}</dd></div>
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/track-order?orderId=${order.orderNumber}`} className="flex h-12 items-center rounded-full bg-[#E1262D] px-7 text-sm font-bold text-white">
            Track my order
          </Link>
          <Link href="/demo-2#menu" className="flex h-12 items-center rounded-full border-2 border-[#2F6B16] px-7 text-sm font-bold text-[#2F6B16]">
            Back to menu
          </Link>
        </div>
      </div>
    </div>
  );
}
