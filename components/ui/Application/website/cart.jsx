"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BsCart2 } from "react-icons/bs";
import {
  Minus,
  Plus,
  X,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import {
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
} from "@/store/reducer/cartReducer";
import { Button } from "@/components/ui/button";
import imgPlaceholder from "@/public/assets/img-placeholder.webp";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { trackMetaEvent } from "@/lib/meta/metaTrack";
import { CUSTOM_MEAL_DISCOUNT_LABEL } from "@/lib/mealDeal";

const getPrice = (price) => {
  if (!price) return 0;
  return parseFloat(String(price).replace(/[^\d.]/g, "")) || 0;
};

// `nested`: true when rendered inside a bundle package card (see
// below) — drops its own border/background so it reads as one row
// within the package rather than a box inside a box.
function CartItemRow({ item, dispatch, nested = false }) {
  const itemPrice = getPrice(item.price);
  // The custom-meal builder's base-protein line (e.g. "Category:
  // Beef") is informational only — £0, always qty 1, and never shows
  // quantity controls, here or on the checkout page (see
  // app/(root)/(website)/checkout/page.jsx).
  const isCategoryItem = String(item.productId || "").startsWith("category-");
  // Items inside a bundle package aren't deleted individually — the
  // whole package has one delete button on its header instead (see
  // the bundle card below).
  const showDelete = !nested;

  return (
    <div
      className={
        nested
          ? "flex gap-3 py-2 border-b border-[#214419] last:border-b-0"
          : "flex gap-4 p-3 rounded-xl bg-[#183310] border border-[#214419] hover:border-[#2D5A22] transition-all"
      }
    >
      {/* Thumbnail */}
      <div
        className={`relative flex-shrink-0 overflow-hidden bg-[#1C3A13] border border-[#264D1D] ${
          nested ? "h-12 w-12 rounded-md" : "h-20 w-20 rounded-lg"
        }`}
      >
        <Image
          src={
            item.img ||
            item.image ||
            item.media?.[0]?.secure_url ||
            item.media?.[0]?.url ||
            imgPlaceholder
          }
          alt={item.title || "Product Image"}
          fill
          sizes={nested ? "48px" : "80px"}
          className="object-cover"
        />
      </div>

      {/* Info & Action */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h3 className={`font-semibold text-gray-100 line-clamp-1 ${nested ? "text-xs" : "text-sm"}`}>
              {item.name || item.title}
            </h3>
            {showDelete && (
              <button
                onClick={() => dispatch(removeFromCart({ productId: item.productId }))}
                className="text-gray-500 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 size={nested ? 13 : 15} />
              </button>
            )}
          </div>

          {itemPrice > 0 && (
            <p className={`text-[#E1262D] font-bold mt-0.5 ${nested ? "text-xs" : "text-sm"}`}>
              £{itemPrice.toLocaleString()}
            </p>
          )}
        </div>

        {/* Quantity Control — nested rows (a bundle's selections) are
            always qty 1 and not individually adjustable; only the
            bundle itself (rendered separately, see the bundle card
            below) has a quantity stepper. */}
        {isCategoryItem ? (
          <p className="mt-2 text-xs text-gray-500 italic">Base selection — included</p>
        ) : nested ? (
          <p className="mt-1 text-[11px] text-gray-500">Qty: {item.quantity}</p>
        ) : (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center bg-[#214419] rounded-lg border border-[#2D5A22]">
              <button
                className="p-1.5 text-gray-300 hover:text-[#E1262D] transition-colors"
                onClick={() => dispatch(decreaseQuantity({ productId: item.productId }))}
              >
                <Minus size={13} />
              </button>
              <span className="px-3 text-xs font-semibold text-white">{item.quantity}</span>
              <button
                className="p-1.5 text-gray-300 hover:text-[#E1262D] transition-colors"
                onClick={() => dispatch(increaseQuantity({ productId: item.productId }))}
              >
                <Plus size={13} />
              </button>
            </div>

            <span className="text-xs text-gray-400 font-medium">
              Total: £{(itemPrice * item.quantity).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const Cart = ({ active }) => {
  const dispatch = useDispatch();
  const { products, count } = useSelector((store) => store.cartStore);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Route change হলে Cart Auto Close হবে
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const subtotal = useMemo(() => {
    return products.reduce(
      (acc, item) => acc + getPrice(item.price) * Number(item.quantity || 0),
      0,
    );
  }, [products]);

  // A Custom Meal is one cart entry with itemType "bundle" and its
  // selections nested in `items` (see customorders.jsx / cartReducer) —
  // no more client-side grouping of scattered same-bundleId rows.
  const bundleItems = useMemo(
    () => products.filter((item) => item.itemType === "bundle"),
    [products],
  );
  const singleItems = useMemo(
    () => products.filter((item) => item.itemType !== "bundle"),
    [products],
  );

  const handleCheckoutClick = () => {
    if (products.length > 0) {
      trackMetaEvent("InitiateCheckout", {
        content_type: "product",
        num_items: count,
        value: subtotal,
        currency: "GBP",
      });
    }
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={
            active
              ? "relative flex items-center justify-center p-2 text-white hover:text-[#E1262D] transition-colors focus:outline-none"
              : // navbar: red pill with bag icon, live total and gold count badge
                "group relative flex h-11 items-center gap-2 rounded-full bg-[#E1262D] pl-3.5 pr-4 text-white shadow-[0_8px_24px_-6px_rgba(225,38,45,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C41D23] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C318]/70"
          }
          aria-label="Open Cart Drawer"
        >
          {active ? (
            <BsCart2 size={24} />
          ) : (
            <>
              <ShoppingBag
                strokeWidth={2.4}
                className="h-[20px] w-[20px] transition-transform duration-300 group-hover:-rotate-12"
              />
              <span className="hidden sm:inline text-sm font-extrabold tabular-nums">
                £{subtotal.toFixed(2)}
              </span>
            </>
          )}
          {count > 0 && (
            <span
              key={count}
              className={`absolute flex items-center justify-center rounded-full font-black shadow-lg animate-in zoom-in-50 ${
                active
                  ? "-top-0.5 -right-0.5 h-5 w-5 bg-[#E1262D] text-[10px] text-white"
                  : "-top-1.5 -right-1.5 h-[20px] min-w-[20px] px-1 bg-[#F7C318] text-[10px] text-[#0A1806] ring-2 ring-[#0A1806]"
              }`}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-72 !sm:w-60 md:w-[400px] lg:w-[400px] p-0 bg-[#0F2109] border-l border-[#1C3A13] text-white flex flex-col shadow-2xl z-[150] will-change-transform ease-out data-[state=open]:duration-300 data-[state=closed]:duration-200"
      >
        {/* HEADER */}
        <SheetHeader className="px-6 py-4 border-b border-[#1C3A13] flex flex-row items-center justify-between">
          <SheetTitle className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#E1262D]" />
            Your Order
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E1262D]/10 text-[#E1262D] border border-[#E1262D]/20">
              {count} items
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* CART ITEM LIST */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {products.length === 0 ? (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-gray-500 gap-3">
              <ShoppingBag size={56} className="opacity-20 text-[#E1262D]" />
              <p className="text-sm font-medium">
                Your order feels a bit light!
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-2 text-xs text-[#E1262D] uppercase font-bold hover:underline"
              >
                Browse the Menu
              </button>
            </div>
          ) : (
            <>
              {bundleItems.map((bundle) => {
                const bundleUnitPrice = getPrice(bundle.price);
                const bundleQty = Number(bundle.quantity || 1);
                const nestedVisible = (bundle.items || []).filter(
                  (item) => item.itemType !== "category",
                );

                return (
                  <div
                    key={bundle.productId}
                    className="rounded-xl border border-[#E1262D]/30 bg-[#183310] overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 bg-[#E1262D]/10 border-b border-[#E1262D]/20">
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#E1262D]">
                        {bundle.name}
                        <span className="rounded-full bg-[#F7C318] px-1.5 py-px text-[9px] font-black text-black">
                          {CUSTOM_MEAL_DISCOUNT_LABEL}
                        </span>
                      </span>
                      <button
                        onClick={() => dispatch(removeFromCart({ productId: bundle.productId }))}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Remove this meal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="px-3 py-1">
                      {nestedVisible.map((item, i) => (
                        <CartItemRow
                          key={`${bundle.productId}-${item.productId || i}`}
                          item={item}
                          dispatch={dispatch}
                          nested
                        />
                      ))}
                    </div>

                    {/* Bundle-level quantity — increases/decreases the
                        WHOLE Custom Meal, not any individual selection
                        inside it. */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-t border-[#214419]">
                      <div className="flex items-center bg-[#214419] rounded-lg border border-[#2D5A22]">
                        <button
                          className="p-1.5 text-gray-300 hover:text-[#E1262D] transition-colors"
                          onClick={() => dispatch(decreaseQuantity({ productId: bundle.productId }))}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-3 text-xs font-semibold text-white">{bundleQty}</span>
                        <button
                          className="p-1.5 text-gray-300 hover:text-[#E1262D] transition-colors"
                          onClick={() => dispatch(increaseQuantity({ productId: bundle.productId }))}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span className="text-xs text-gray-300 font-semibold">
                        Total: £{(bundleUnitPrice * bundleQty).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}

              {singleItems.map((item) => (
                <CartItemRow key={item.productId} item={item} dispatch={dispatch} />
              ))}
            </>
          )}
        </div>

        {/* FOOTER & CHECKOUT */}
        {products.length > 0 && (
          <div className="border-t border-[#1C3A13] p-6 bg-[#161616] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm font-medium">
                Subtotal
              </span>
              <span className="text-xl font-extrabold text-white">
                £{subtotal.toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Delivery and taxes calculated at checkout.
            </p>

            <Link
              href="/checkout"
              onClick={handleCheckoutClick}
              className="block"
            >
              <Button className="w-full h-12 bg-[#E1262D] hover:bg-[#EE3B41] text-white text-base font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                Proceed to Checkout
                <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Cart;
