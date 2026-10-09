"use client";

import React, { useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

import { WEBSITE_PRODUCT_DETAILS, WEBSITE_SHOP } from "@/Route/Websiteroute";
import imgPlaceholder from "@/public/assets/img-placeholder.webp";
import { trackMetaEvent } from "@/lib/meta/metaTrack";

import {
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
} from "@/store/reducer/cartReducer";

const formatCurrency = (amount) =>
  `£${Number(amount || 0).toLocaleString("en-GB")}`;

export default function Page() {
  const cart = useSelector((store) => store.cartStore);
  const dispatch = useDispatch();
  const hasTrackedView = useRef(false);

  const products = Array.isArray(cart?.products) ? cart.products : [];

  // Calculate Subtotal and Total Savings based on MRP
  const { subtotal, totalSavings } = useMemo(() => {
    return products.reduce(
      (acc, item) => {
        const price = Number(item?.sellingPrice || 0);
        const mrp = Number(item?.mrp || price); // Fallback to sellingPrice if MRP is missing
        const qty = Number(item?.quantity || 1);

        acc.subtotal += price * qty;
        if (mrp > price) {
          acc.totalSavings += (mrp - price) * qty;
        }
        return acc;
      },
      { subtotal: 0, totalSavings: 0 },
    );
  }, [products]);

  const total = subtotal;

  // --- TRACKING LOGIC ---
  useEffect(() => {
    if (products.length > 0 && !hasTrackedView.current) {
      trackMetaEvent("ViewCart", {
        content_ids: products.map((p) => String(p.productId)),
        content_type: "product",
        value: Number(subtotal),
        currency: "GBP",
        num_items: products.length,
      });
      hasTrackedView.current = true;
    }
  }, [products.length, subtotal]);

  const onDec = (p) => {
    dispatch(
      decreaseQuantity({ productId: p.productId, variantId: p.variantId }),
    );
  };

  const onInc = (p) => {
    dispatch(
      increaseQuantity({ productId: p.productId, variantId: p.variantId }),
    );
  };

  const onRemove = (p) => {
    dispatch(
      removeFromCart({ productId: p.productId, variantId: p.variantId }),
    );
  };

  const handleCheckoutClick = () => {
    trackMetaEvent("InitiateCheckout", {
      content_ids: products.map((p) => String(p.productId)),
      content_type: "product",
      value: Number(total),
      currency: "GBP",
      num_items: products.length,
    });
  };

  if (!products.length) {
    return (
      <div className="storefront-theme bg-background text-foreground w-full min-h-[60vh] flex flex-col justify-center items-center px-4">
        <ShoppingBag size={48} className="text-[#E1262D] opacity-40 mb-4" />
        <h4 className="text-2xl font-black uppercase tracking-wide mb-6">
          Your Order is Empty
        </h4>
        <Link
          href={WEBSITE_SHOP}
          className="bg-[#E1262D] hover:bg-[#EE3B41] text-white px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] rounded-md transition-colors"
        >
          Browse the Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="storefront-theme bg-background text-foreground w-full antialiased min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="border-b border-[#214419] pb-8 mb-12 flex items-center gap-3">
          <ShoppingBag size={28} className="text-[#E1262D]" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">
              Your Order
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mt-2">
              {products.length} {products.length > 1 ? "Items" : "Item"} Selected
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8">
            <div className="divide-y divide-[#183310]">
              {products.map((p) => {
                const qty = Number(p?.quantity || 1);
                const price = Number(p?.sellingPrice || 0);
                const mrp = Number(p?.mrp || price);
                const lineTotal = price * qty;
                const savingsPerItem = mrp > price ? mrp - price : 0;
                const imgSrc =
                  p?.img ||
                  p?.image ||
                  p?.media?.[0]?.secure_url ||
                  p?.media?.[0]?.url ||
                  imgPlaceholder.src;

                return (
                  <div
                    key={`${p.productId}-${p.variantId}`}
                    className="py-8 first:pt-0 group"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="relative h-40 w-32 bg-[#0F2109] overflow-hidden shrink-0 border border-[#214419] rounded-lg">
                        <Image
                          src={imgSrc}
                          alt={p?.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start">
                            <Link
                              href={WEBSITE_PRODUCT_DETAILS(p?.slug)}
                              className="text-lg font-bold uppercase tracking-tight text-white hover:text-[#E1262D] transition-colors"
                            >
                              {p?.name}
                            </Link>
                            <button
                              onClick={() => onRemove(p)}
                              className="text-zinc-500 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            {p?.color && <span>Color: {p.color}</span>}
                            {p?.size && <span>Size: {p.size}</span>}
                          </div>

                          {/* Item Level Savings Display */}
                          {savingsPerItem > 0 && (
                            <p className="text-[9px] font-bold text-emerald-500 mt-2 uppercase tracking-tighter">
                              You save {formatCurrency(savingsPerItem * qty)} on
                              this item
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-end justify-between mt-6 gap-4">
                          <div className="flex items-center border border-[#214419] rounded-md overflow-hidden">
                            <button
                              onClick={() => onDec(p)}
                              className="h-7 w-7 flex items-center justify-center text-zinc-300 hover:text-[#E1262D] transition-colors"
                              disabled={qty <= 1}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-[12px] font-bold border-x border-[#214419] text-white">
                              {qty}
                            </span>
                            <button
                              onClick={() => onInc(p)}
                              className="h-7 w-7 flex items-center justify-center text-zinc-300 hover:text-[#E1262D] transition-colors"
                              disabled={p.stock !== undefined && qty >= p.stock}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                              Total
                            </p>
                            <div className="flex flex-col items-end">
                              {mrp > price && (
                                <span className="text-[10px] text-zinc-600 line-through">
                                  {formatCurrency(mrp * qty)}
                                </span>
                              )}
                              <p className="text-lg font-bold text-[#E1262D]">
                                {formatCurrency(lineTotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-[#0F2109] p-8 sticky top-24 border border-[#214419] rounded-xl">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-8 border-b border-[#214419] pb-4 text-white">
                Order Summary
              </h3>

              <div className="space-y-4 text-[11px] font-bold uppercase tracking-widest">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="text-white">
                    {formatCurrency(subtotal + totalSavings)}
                  </span>
                </div>

                {/* The "MRP Discount" row */}
                {totalSavings > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Discount (MRP)</span>
                    <span className="text-emerald-500">
                      -{formatCurrency(totalSavings)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-base pt-4 border-t border-[#214419]">
                  <span className="text-white tracking-tighter">
                    Estimated Total
                  </span>
                  <span className="text-[#E1262D] text-xl">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={handleCheckoutClick}
                className="w-full mt-10 bg-[#E1262D] hover:bg-[#EE3B41] text-white py-5 text-[11px] font-bold uppercase tracking-[0.3em] flex items-center justify-center rounded-md transition-colors shadow-lg shadow-orange-500/20"
              >
                Proceed to Checkout
              </Link>

              {totalSavings > 0 && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-center rounded-md">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    You are saving {formatCurrency(totalSavings)} on this order!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
