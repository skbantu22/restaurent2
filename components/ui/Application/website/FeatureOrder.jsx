"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addIntoCart, removeFromCart } from "@/store/reducer/cartReducer";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { Flame, Check, Plus } from "lucide-react";
import { cloudinaryResize } from "@/lib/cloudinaryUrl";

// 🛠️ Safe Plain Text extraction from HTML & HTML Entities
const getPlainText = (html) => {
  if (!html) return "";

  try {
    const parser = new DOMParser();
    const decodedString =
      parser.parseFromString(html, "text/html").body.textContent || "";

    return decodedString
      .replace(/<[^>]*>/g, "")
      .replace(/style="[^"]*"/gi, "")
      .trim();
  } catch (err) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&[a-z0-9]+;/gi, " ")
      .trim();
  }
};

export default function MostLovedMenu() {
  const dispatch = useDispatch();
  const cartProducts = useSelector((store) => store.cartStore?.products) || [];

  // ✅ Fetch products
  const {
    data: productsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["most-loved-products"],
    queryFn: async () => {
      const res = await axios.get("/api/product?isMostLoved=true&limit=10");
      return res.data;
    },
  });

  const products = productsData?.data || [];

  useEffect(() => {
    if (isError) {
      console.error("❌ [MostLovedMenu] API Fetch Error:", error);
    }
  }, [isError, error]);

  const isProductInCart = (prodId) => {
    return cartProducts.some((item) => item.productId === prodId);
  };

  const handleToggleCart = (item) => {
    const isAdded = isProductInCart(item._id);

    if (isAdded) {
      dispatch(removeFromCart({ productId: item._id }));
    } else {
      const itemImage =
        item.media && item.media.length > 0
          ? item.media[0]?.url || item.media[0]?.secure_url || item.media[0]
          : "/placeholder.png";

      const payload = {
        productId: item._id,
        variantId: "default",
        title: item.name,
        price: item.sellingPrice || item.mrp,
        image: itemImage,
        quantity: 1,
      };

      dispatch(addIntoCart(payload));
    }
  };

  if (isLoading) {
    return (
      // 🟢 এখানে px মোবাইল এবং পিসির জন্য অ্যাড করা হয়েছে
      <section className="w-full bg-[#0F2109] px-4 py-14 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="mb-8 text-center">
          <p className="font-script text-2xl text-[#F7C318]">Customer favourites</p>
          <h2 className="font-display mt-1 text-[34px] sm:text-5xl font-black leading-[1.05] tracking-tight text-white">
            Popular <span className="text-[#E1262D]">Items</span>
          </h2>
        </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-[360px] animate-pulse rounded-xl border border-zinc-800/70 bg-[#13290C] p-4"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError || !products.length) {
    return null;
  }

  return (
    // 🟢 মূল সেকশনে রেসপনসিভ প্যাডিং (px-4 sm:px-8 lg:px-16) দেওয়া হয়েছে যাতে পিসিতে ডান-বামে গ্যাপ থাকে
    <section className="w-full bg-[#0F2109] px-4 py-14 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-8 text-center">
          <p className="font-script text-2xl text-[#F7C318]">Customer favourites</p>
          <h2 className="font-display mt-1 text-[34px] sm:text-5xl font-black leading-[1.05] tracking-tight text-white">
            Popular <span className="text-[#E1262D]">Items</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {products.map((item) => {
            const imageUrl =
              item.media && item.media.length > 0
                ? item.media[0]?.url ||
                  item.media[0]?.secure_url ||
                  item.media[0]
                : "/placeholder.png";

            const cleanDescription = getPlainText(item.description);
            const added = isProductInCart(item._id);
            const caloriesValue = item.calories ?? item.cal ?? null;

            return (
              <div
                key={item._id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#13290C] p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#F7C318]/40 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]"
              >
                {item.badge && (
                  <span
                    className={`absolute left-3 top-3 z-10 rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-md ${
                      item.badge.toLowerCase() === "must try" ||
                      item.badge.toLowerCase() === "popular"
                        ? "bg-emerald-600"
                        : "bg-red-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                <div>
                  <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-black">
                    <Image
                      src={cloudinaryResize(imageUrl, { width: 480, height: 480 })}
                      alt={item.name}
                      fill
                      unoptimized
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {caloriesValue && (
                      <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-black/80 backdrop-blur-md px-2 py-1 text-[10px] font-semibold text-amber-400 border border-zinc-800 shadow-md">
                        <Flame size={12} className="text-orange-400 shrink-0" />
                        <span>{caloriesValue} kcal</span>
                      </div>
                    )}
                  </div>

                  <h3 className="mb-1 text-base font-bold text-zinc-100 line-clamp-1">
                    {item.name}
                  </h3>

                  <p className="min-h-[42px] text-xs leading-relaxed text-zinc-400 line-clamp-2">
                    {cleanDescription ||
                      "Delicious food item cooked fresh for you."}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="mb-3 flex items-center justify-between">
                    {item.mrp && item.mrp > item.sellingPrice ? (
                      <span className="text-xs text-zinc-500 line-through">
                        £{item.mrp}
                      </span>
                    ) : (
                      <div />
                    )}
                    <span className="text-base font-bold text-orange-500">
                      £{item.sellingPrice || item.mrp}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleCart(item)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      added
                        ? "border-red-600/50 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white"
                        : "border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                    }`}
                  >
                    {added ? (
                      <>
                        <Check size={14} />
                        <span>ADDED</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>ADD</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
