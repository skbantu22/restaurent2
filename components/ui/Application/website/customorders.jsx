"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useDispatch } from "react-redux";
import { addIntoCart } from "@/store/reducer/cartReducer";
import { X, Plus, Loader2, Flame, Check } from "lucide-react";
import { showToast } from "@/lib/showToast";
import {
  CUSTOM_MEAL_DISCOUNT_LABEL,
  customMealPrice,
  customMealSaving,
} from "@/lib/mealDeal";

// ---------------- ICONS (Enlarged) ----------------
const ICONS = {
  beef: (
    <svg
      className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 transition-transform group-hover:scale-110 duration-300"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path
        d="M12 28c0-8 8-12 20-12s20 4 20 12v4H12v-4z"
        strokeLinecap="round"
      />
      <path
        d="M10 38h44v4c0 6-6 10-22 10S10 48 10 42v-4z"
        strokeLinecap="round"
      />
      <path d="M14 32h36" strokeDasharray="3 3" />
    </svg>
  ),
  chicken: (
    <svg
      className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 transition-transform group-hover:scale-110 duration-300"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path
        d="M46 14c-6-6-16-4-22 2-4 4-6 10-4 16l-12 12c-2 2-2 6 0 8s6 2 8 0l12-12c6 2 12 0 16-4 6-6 8-16 2-22z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  plant: (
    <svg
      className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 transition-transform group-hover:scale-110 duration-300"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path
        d="M32 50V22M32 26c6-6 14-6 16 2s-6 12-16 14M32 32c-6-6-14-6-16 2s6 12 16 14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

// ---------------- BASE CATEGORIES ----------------
const BASE_OPTIONS = [
  { id: "beef", label: "Beef", icon: ICONS.beef },
  { id: "chicken", label: "Chicken", icon: ICONS.chicken },
  { id: "plant", label: "Plant Based", icon: ICONS.plant },
];

// ---------------- SIDES ----------------
const EXTRA_OPTIONS = [
  {
    id: "classic-fries",
    label: "Classic Fries",
    price: 3.5,
    img: "/assets/Custom/classic-fries.jpg",
  },
  {
    id: "seasoned-fries",
    label: "Signature Seasoned Fries",
    price: 3.49,
    img: "/assets/Custom/Signature%20Seasoned%20Fries.jpg",
  },
  {
    id: "onion-rings",
    label: "Crispy Onion Rings",
    price: 4.49,
    img: "/assets/Crispy%20Onion%20Rings.jpg",
  },
  {
    id: "chicken-stripes",
    label: "Crispy Chicken Stripes",
    price: 6.49,
    img: "/assets/chicken-wallfies.png",
  },
  {
    id: "potato-wedges",
    label: "Potato Wedges",
    price: 4.5,
    img: "/assets/Custom/Potatoes%20Wedges.jpg",
  },
];

// ---------------- DRINKS ----------------
const DRINK_OPTIONS = [
  {
    id: "coke",
    label: "Coke Zero",
    price: 1.5,
    img: "/assets/Custom/code2.png",
  },
  { id: "water", label: "Water", price: 1.0, img: "/assets/Custom/water.png" },
  {
    id: "sprite",
    label: "Sprite Zero",
    price: 1.5,
    img: "/assets/Custom/sprite.png",
  },
  {
    id: "redbull",
    label: "Red Bull",
    price: 2.5,
    img: "/assets/Custom/redbull.png",
  },
];

export default function PremiumMealBuilder() {
  const dispatch = useDispatch();

  const [base, setBase] = useState(null);
  const [extras, setExtras] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [activeModalBase, setActiveModalBase] = useState(null);
  // brief "Added" confirmation on the Add to Cart button, which also
  // blocks a double tap adding the same meal twice
  const [justAdded, setJustAdded] = useState(false);
  const [cartProducts, setCartProducts] = useState([]);
  // Product descriptions are stored HTML-encoded (sometimes twice), so a
  // single decode still left "<p>…</p><p>&nbsp;</p>" showing as text.
  // Decode until stable, then drop tags/&nbsp; and tidy the spaces.
  function toPlainText(html = "") {
    let text = String(html || "");
    const txt = document.createElement("textarea");
    for (let i = 0; i < 3; i++) {
      txt.innerHTML = text;
      if (txt.value === text) break;
      text = txt.value;
    }
    return text
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;| /g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const [categoryProducts, setCategoryProducts] = useState({
    beef: [],
    chicken: [],
    plant: [],
  });
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Prevent the page behind the "Select Items" modal from scrolling
  // while it's open (iOS Safari in particular will happily scroll the
  // body underneath a `position: fixed` overlay otherwise).
  useEffect(() => {
    if (!activeModalBase) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeModalBase]);

  useEffect(() => {
    async function fetchFilteredProducts() {
      try {
        setLoadingProducts(true);

        const [beefRes, chickenRes, plantRes] = await Promise.all([
          fetch("/api/product/filter?type=beef")
            .then((res) => res.json())
            .catch(() => ({ products: [] })),
          fetch("/api/product/filter?type=chicken")
            .then((res) => res.json())
            .catch(() => ({ products: [] })),
          fetch("/api/product/filter?type=plant")
            .then((res) => res.json())
            .catch(() => ({ products: [] })),
        ]);

        setCategoryProducts({
          beef: beefRes.products || [],
          chicken: chickenRes.products || [],
          plant: plantRes.products || [],
        });
      } catch (error) {
        console.error("Failed to fetch filtered products:", error);
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchFilteredProducts();
  }, []);

  const selectExtra = (id) => {
    setExtras([id]);
  };

  const selectDrink = (id) => {
    setDrinks([id]);
  };

  const selectedDrinks = useMemo(
    () => DRINK_OPTIONS.filter((x) => drinks.includes(x.id)),
    [drinks],
  );

  const selectedExtras = useMemo(
    () => EXTRA_OPTIONS.filter((x) => extras.includes(x.id)),
    [extras],
  );

  const selectedBase = useMemo(
    () => BASE_OPTIONS.find((x) => x.id === base) || null,
    [base],
  );

  const drinksPrice = selectedDrinks.reduce((sum, item) => sum + item.price, 0);
  const extrasPrice = selectedExtras.reduce((sum, item) => sum + item.price, 0);
  const productsPrice = cartProducts.reduce(
    (sum, item) =>
      sum + (item.sellingPrice || item.price || 0) * (item.quantity || 1),
    0,
  );

  // Custom Meal deal — 20% off the items combined in the builder
  const subtotal = drinksPrice + extrasPrice + productsPrice;
  const saving = customMealSaving(subtotal);
  const total = customMealPrice(subtotal);
  const totalItems =
    selectedExtras.length + selectedDrinks.length + cartProducts.length;
  const hasSelection = totalItems > 0 || !!base;

  // A custom meal is the full set — burger + side + drink (one of each;
  // selectExtra/selectDrink replace the pick) — and the 20% deal only
  // applies to that, so all three are required. The Add to Cart button
  // stays clickable and tells the customer what is still missing.
  const missingSteps = [];
  if (!base) missingSteps.push("a category");
  if (cartProducts.length === 0) missingSteps.push("an item from your chosen category");
  if (selectedExtras.length === 0) missingSteps.push("a side");
  if (selectedDrinks.length === 0) missingSteps.push("a drink");
  const canCheckout = missingSteps.length === 0;

  const handleBaseClick = (baseId) => {
    setActiveModalBase(baseId);
  };

  const isProductInCart = (prodId) => {
    return cartProducts.some(
      (item) => String(item.productId || item._id) === String(prodId),
    );
  };

  // Single-select: this builder is for one custom meal at a time, so
  // picking a product (even from a different category's modal)
  // replaces whatever was previously chosen rather than adding to a list.
  const handleToggleProductCart = (prod) => {
    const prodId = prod._id || prod.productId || "";
    if (isProductInCart(prodId)) {
      setCartProducts([]);
      showToast("info", `Removed ${prod.name} from selection`);
    } else {
      setCartProducts([{ ...prod, productId: prodId, quantity: 1 }]);
      showToast("success", `Added ${prod.name} to selection`);
    }
  };

  const handleAddToCart = () => {
    if (!canCheckout) {
      showToast(
        "error",
        `Please select ${missingSteps.join(", ")} before adding to cart.`,
      );
      return;
    }

    // A Custom Meal is ONE cart line (quantity 1), not N separate
    // top-level entries sharing a bundleId — the burger/extra/drink
    // selections live in this one entry's nested `items` array instead.
    // See store/reducer/cartReducer.js (a plain productId-keyed entry —
    // no reducer changes needed) and app/api/checkout/route.js (which
    // re-prices every nested item server-side, same as it always has
    // for top-level items — a bundle is never trusted as one flat price).
    const bundleId = `bundle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const bundleLabel = `Custom Meal: ${selectedBase?.label || ""}`.trim();

    const nestedItems = [];

    if (selectedBase) {
      nestedItems.push({
        productId: `category-${selectedBase.id}`,
        itemType: "category",
        name: `Category: ${selectedBase.label}`,
        price: 0,
        quantity: 1,
      });
    }

    cartProducts.forEach((prod) => {
      nestedItems.push({
        productId: prod.productId || prod._id,
        itemType: "product",
        name: prod.name,
        price: Number(prod.price ?? prod.sellingPrice ?? 0),
        quantity: prod.quantity || 1,
        image: prod.media?.[0]?.secure_url || prod.media?.[0]?.url || "",
      });
    });

    selectedExtras.forEach((extra) => {
      nestedItems.push({
        productId: `extra-${extra.id}`,
        itemType: "extra",
        name: extra.label,
        price: extra.price,
        quantity: 1,
        image: extra.img,
      });
    });

    selectedDrinks.forEach((drink) => {
      nestedItems.push({
        productId: `drink-${drink.id}`,
        itemType: "drink",
        name: drink.label,
        price: drink.price,
        quantity: 1,
        image: drink.img,
      });
    });

    const bundleTotal = nestedItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0,
    );

    // the deal price — the checkout API applies the same 20% again
    // server-side, so this is never trusted on its own
    const bundlePrice = customMealPrice(bundleTotal);

    dispatch(
      addIntoCart({
        productId: bundleId,
        itemType: "bundle",
        name: bundleLabel,
        sellingPrice: bundlePrice,
        price: bundlePrice,
        quantity: 1,
        image: cartProducts[0]?.media?.[0]?.secure_url || "",
        items: nestedItems,
      }),
    );

    showToast(
      "success",
      `Custom meal added to cart — ${CUSTOM_MEAL_DISCOUNT_LABEL} applied!`,
    );

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const clearSelection = () => {
    if (!hasSelection) {
      showToast("error", "Nothing to clear");
      return;
    }

    setBase(null);
    setExtras([]);
    setDrinks([]);
    setCartProducts([]);
    showToast("success", "Cleared all selections");
  };

  return (
    <div className="bg-[#0A1806] text-white border border-zinc-800 p-4 md:p-6 rounded-none">
      <div className="max-w-7xl mx-auto">
        {/* Deal note — every meal built here gets the discount */}
        <div className="mb-3 flex justify-end">
          <span className="inline-flex items-center gap-2 border border-[#F7C318]/40 bg-[#F7C318]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#F7C318]">
            <span className="bg-[#F7C318] px-1.5 py-px text-black">
              {CUSTOM_MEAL_DISCOUNT_LABEL}
            </span>
            on every custom meal
          </span>
        </div>

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-3 border border-[#1C3A13] rounded-none overflow-hidden">
          {/* BASE CATEGORIES */}
          <div className="bg-[#0A1806] p-6 lg:p-8 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1C3A13]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,195,24,0.12),transparent_40%)] pointer-events-none" />

            <div className="flex items-center justify-center gap-4 mb-8 relative z-10">
              <div className="w-9 h-9 rounded-none bg-[#F7C318] flex items-center justify-center text-black font-black text-sm shadow-[0_0_20px_rgba(247,195,24,0.4)]">
                1
              </div>
              <h2 className="text-white uppercase tracking-widest font-extrabold text-lg">
                Choose Category
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3 relative z-10">
              {BASE_OPTIONS.map((item) => {
                const active = base === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      // Switching category drops the item picked from the
                      // old one — otherwise the meal could be labelled
                      // "Custom Meal: Plant Based" while still holding the
                      // beef burger chosen a moment earlier.
                      if (base !== item.id) setCartProducts([]);
                      setBase(item.id);
                      handleBaseClick(item.id);
                    }}
                    className="group flex w-full flex-col items-center gap-2.5 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div
                      className={`relative w-full aspect-square flex items-center justify-center rounded-xl border transition-all duration-300 ${
                        active
                          ? "border-[#F7C318] bg-[#F7C318]/10 text-[#F7C318] shadow-[0_0_24px_rgba(247,195,24,0.25)]"
                          : "border-white/10 bg-white/[0.03] text-white group-hover:border-[#F7C318]/50 group-hover:text-[#F7C318]"
                      }`}
                    >
                      {item.icon}
                      {active && (
                        <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#F7C318] text-black">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span
                      className={`min-h-[2.2em] text-center text-xs lg:text-sm font-bold uppercase leading-tight tracking-wide ${
                        active ? "text-[#F7C318]" : "text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* EXTRAS */}
          <div className="bg-[#0A1806] p-6 lg:p-8 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1C3A13]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,195,24,0.12),transparent_40%)] pointer-events-none" />

            <div className="flex items-center justify-center gap-4 mb-5 relative z-10">
              <div className="w-9 h-9 rounded-none bg-[#F7C318] flex items-center justify-center text-black font-black text-sm shadow-[0_0_20px_rgba(247,195,24,0.4)]">
                2
              </div>
              <h2 className="text-white uppercase tracking-widest font-extrabold text-lg">
                Choose Sides
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 relative z-10">
              {EXTRA_OPTIONS.map((item) => {
                const isSelected = extras.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => selectExtra(item.id)}
                    className="group flex w-full flex-col items-center gap-2.5 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div
                      className={`relative w-full aspect-square overflow-hidden rounded-xl border transition-all duration-300 ${
                        isSelected
                          ? "border-[#F7C318] bg-[#F7C318]/10 shadow-[0_0_24px_rgba(247,195,24,0.25)]"
                          : "border-white/10 bg-white/[0.03] group-hover:border-[#F7C318]/50"
                      }`}
                    >
                      <Image
                        src={item.img}
                        alt={item.label}
                        fill
                        sizes="(max-width: 1024px) 40vw, 200px"
                        className="object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"
                      />
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#F7C318] text-black">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span
                      className={`min-h-[2.4em] text-center text-[11px] lg:text-xs font-bold uppercase leading-tight tracking-wide ${
                        isSelected ? "text-[#F7C318]" : "text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] lg:text-[11px] font-bold text-orange-400">
                      +£{item.price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DRINKS */}
          <div className="bg-[#0A1806] p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,195,24,0.12),transparent_40%)] pointer-events-none" />

            <div className="flex items-center justify-center gap-4 mb-5 relative z-10">
              <div className="w-9 h-9 rounded-none bg-[#F7C318] flex items-center justify-center text-black font-black text-sm shadow-[0_0_20px_rgba(247,195,24,0.4)]">
                3
              </div>
              <h2 className="text-white uppercase tracking-widest font-extrabold text-lg">
                Choose Your Drinks
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4 relative z-10">
              {DRINK_OPTIONS.map((item) => {
                const active = drinks.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => selectDrink(item.id)}
                    className="group flex w-full flex-col items-center gap-2.5 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div
                      className={`relative w-full aspect-square overflow-hidden rounded-xl border transition-all duration-300 ${
                        active
                          ? "border-[#F7C318] bg-[#F7C318]/10 shadow-[0_0_24px_rgba(247,195,24,0.25)]"
                          : "border-white/10 bg-white/[0.03] group-hover:border-[#F7C318]/50"
                      }`}
                    >
                      <Image
                        src={item.img}
                        alt={item.label}
                        fill
                        sizes="(max-width: 1024px) 40vw, 200px"
                        className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                      />
                      {active && (
                        <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#F7C318] text-black">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span
                      className={`min-h-[2.2em] text-center text-xs lg:text-sm font-bold uppercase leading-tight tracking-wide ${
                        active ? "text-[#F7C318]" : "text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[11px] lg:text-xs font-bold text-orange-400">
                      +£{item.price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BILL SECTION */}
        <div
          className={`transition-all duration-700 ease-out transform origin-top overflow-hidden ${
            hasSelection
              ? "max-h-[1000px] opacity-100 scale-100 translate-y-0 mt-6"
              : "max-h-0 opacity-0 scale-95 -translate-y-2 mt-0"
          }`}
        >
          <div className="bg-neutral-950 outline outline-1 outline-[#F7C318]/30 rounded-none overflow-hidden shadow-2xl">
            <div className="border-b border-[#F7C318]/20 px-6 py-5 flex justify-between items-center">
              <h4 className="uppercase tracking-[0.25em] text-xs text-[#F7C318] font-black">
                Live Order Summary
              </h4>
              <div className="flex items-center gap-2">
                <div className="bg-black outline outline-1 outline-[#F7C318]/30 px-3 py-1 rounded-none text-[10px] uppercase tracking-widest text-[#F7C318]">
                  {totalItems} items
                </div>
                <button
                  onClick={clearSelection}
                  className="text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-none outline outline-1 outline-[#F7C318]/30 text-[#F7C318] hover:bg-[#F7C318] hover:text-black transition-all duration-300 active:scale-95"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {cartProducts.map((prod) => (
                <div
                  key={prod._id || prod.productId}
                  className="flex justify-between items-center text-sm bg-neutral-900/40 px-4 py-3 rounded-none outline outline-1 outline-neutral-800"
                >
                  <span className="text-neutral-300">
                    Product Item →{" "}
                    <strong className="text-[#F7C318]">{prod.name}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-white">
                      £{(prod.sellingPrice || prod.price || 0).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleToggleProductCart(prod)}
                      className="text-red-400 hover:text-red-300 text-xs font-black"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {(selectedExtras.length > 0 || selectedDrinks.length > 0) && (
                <div className="rounded-none outline outline-1 outline-[#F7C318]/40 overflow-hidden">
                  <div className="px-4 py-2 bg-[#F7C318]/10 border-b border-[#F7C318]/20">
                    <span className="text-[10px] uppercase tracking-widest font-black text-[#F7C318]">
                      Custom Meal{selectedBase ? `: ${selectedBase.label}` : ""}
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-800">
                    {selectedExtras.map((extra) => (
                      <div
                        key={extra.id}
                        className="flex justify-between items-center text-sm px-4 py-3 bg-neutral-900/20"
                      >
                        <span className="text-neutral-400">
                          + <span className="text-white">{extra.label}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-neutral-300">
                            £{extra.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() =>
                              setExtras((prev) => prev.filter((x) => x !== extra.id))
                            }
                            className="text-red-400 hover:text-red-300 text-xs font-black"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}

                    {selectedDrinks.map((drink) => (
                      <div
                        key={drink.id}
                        className="flex justify-between items-center text-sm px-4 py-3 bg-neutral-900/40"
                      >
                        <span className="text-neutral-300">
                          Drink →{" "}
                          <strong className="text-[#F7C318]">{drink.label}</strong>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-white">
                            £{drink.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() =>
                              setDrinks((prev) => prev.filter((x) => x !== drink.id))
                            }
                            className="text-red-400 hover:text-red-300 text-xs font-black"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#F7C318]/20 bg-black/60 px-6 py-5 flex flex-col md:flex-row gap-5 items-center justify-between">
              <div>
                <p className="uppercase tracking-[0.25em] text-[10px] text-[#F7C318] font-black">
                  Total Cost
                </p>
                <div className="flex items-end gap-3 mt-2">
                  <h2 className="text-4xl font-black text-white">
                    £{total.toFixed(2)}
                  </h2>
                  {saving > 0 && (
                    <span className="mb-1 text-lg font-bold text-neutral-500 line-through">
                      £{subtotal.toFixed(2)}
                    </span>
                  )}
                </div>
                {saving > 0 && (
                  <p className="mt-1 text-xs font-black uppercase tracking-wide text-[#F7C318]">
                    {CUSTOM_MEAL_DISCOUNT_LABEL} applied — you save £
                    {saving.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto">
                {/* Always clickable and always styled the same — picking
                    something is enforced by handleAddToCart, which shows
                    what's still missing, instead of a greyed-out button. */}
                <button
                  onClick={handleAddToCart}
                  disabled={justAdded}
                  className={`w-full md:w-auto font-black px-10 py-4 rounded-none transition-all duration-300 ${
                    justAdded
                      ? "bg-[#F7C318] text-black cursor-default"
                      : "cursor-pointer bg-[#E1262D] text-white hover:bg-[#EE3B41] active:scale-[0.98] shadow-lg shadow-orange-500/20"
                  }`}
                >
                  {justAdded ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check size={18} /> ADDED
                    </span>
                  ) : (
                    "ADD TO CART"
                  )}
                </button>
                {!canCheckout && (
                  <p className="text-red-400 text-[11px] uppercase tracking-wide text-center md:text-right">
                    Please select {missingSteps.join(", ")} to continue.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY PRODUCTS POPUP MODAL
            z-[60] (above MobileBottomNav's z-50, both `fixed`) — at
            equal z-index the bottom nav, being later in the DOM
            (rendered in the website layout after page content), was
            painting on top of this modal and covering its bottom
            portion regardless of scroll position. That, plus 85vh
            (unreliable on Safari's dynamic toolbar — use 85dvh) and no
            safe-area padding, is why the last item could end up
            hidden/unreachable on iPhone. */}
        {activeModalBase && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setActiveModalBase(null)}
          >
            <div
              className="bg-zinc-950 outline outline-1 outline-zinc-800 w-full max-w-lg rounded-none p-6 relative shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveModalBase(null)}
                className="absolute top-4 right-4 bg-zinc-900 outline outline-1 outline-zinc-800 p-2 rounded-none hover:bg-[#F7C318] hover:text-black text-white transition-all z-50"
              >
                <X size={18} />
              </button>

              <div className="mb-4 pb-3 border-b border-zinc-900">
                <h2 className="text-xl font-black text-white uppercase tracking-wide">
                  Select {activeModalBase} Items
                </h2>
                <p className="text-zinc-400 text-xs mt-1">
                  Choose one item for your meal — selecting a new item replaces your current choice.
                </p>
              </div>

              {/* pb-safe-bottom (globals.css): clears the Home
                  Indicator safe area so the last card is fully
                  scrollable into view, not just up to the modal's own
                  edge. */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 pb-safe-bottom">
                {loadingProducts ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2
                      className="animate-spin text-[#F7C318]"
                      size={32}
                    />
                  </div>
                ) : categoryProducts[activeModalBase] &&
                  categoryProducts[activeModalBase].length > 0 ? (
                  categoryProducts[activeModalBase].map((prod) => {
                    const prodId = prod._id || prod.productId || "";
                    const added = isProductInCart(prodId);

                    const imageUrl =
                      (Array.isArray(prod.media) &&
                        prod.media[0]?.secure_url) ||
                      prod.media?.secure_url ||
                      prod.media ||
                      prod.image ||
                      "/assets/Custom/bacon.png";

                    return (
                      <div
                        key={prodId}
                        className="flex items-center justify-between gap-4 bg-zinc-900/60 p-3.5 rounded-none outline outline-1 outline-zinc-800"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-none overflow-hidden shrink-0 bg-zinc-950 outline outline-1 outline-zinc-800">
                            <Image
                              src={imageUrl}
                              alt={prod.name || "Product image"}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-white font-extrabold text-base lg:text-lg leading-tight truncate">
                              {prod.name}
                            </h4>
                            {toPlainText(prod.description) && (
                              <p className="mt-1 text-xs lg:text-sm font-semibold text-zinc-300 leading-snug line-clamp-2">
                                {toPlainText(prod.description)}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5">
                              <p className="text-[#F7C318] font-black text-base lg:text-lg">
                                £{prod.sellingPrice || prod.price}
                              </p>
                              {prod.calories && (
                                <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded-none text-[10px] text-amber-400 font-medium">
                                  <Flame
                                    size={12}
                                    className="text-orange-400"
                                  />
                                  <span>{prod.calories} kcal</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleProductCart(prod)}
                          className={`px-4 py-2 rounded-none font-bold text-xs flex items-center gap-1 transition-all shrink-0 ${
                            added
                              ? "bg-red-500/10 text-red-400 outline outline-1 outline-red-500/30 hover:bg-red-500 hover:text-white"
                              : "bg-[#F7C318] hover:bg-[#F7C318] text-black shadow-md"
                          }`}
                        >
                          {added ? (
                            <>
                              <Check size={14} /> <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-xs uppercase tracking-widest">
                    No items available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
