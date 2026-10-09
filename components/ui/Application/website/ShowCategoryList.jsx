"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X, ShoppingBag, Plus, Loader2, Flame, Check } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addIntoCart, removeFromCart } from "@/store/reducer/cartReducer";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { cloudinaryResize } from "@/lib/cloudinaryUrl";

// 🟢 Helper to ensure valid Image URL
const getValidImageUrl = (mediaArray) => {
  if (!mediaArray) return "/placeholder.png";

  let first = mediaArray;

  if (Array.isArray(mediaArray)) {
    if (mediaArray.length === 0) return "/placeholder.png";
    first = mediaArray[0];
  }

  if (typeof first === "string") {
    if (
      first.startsWith("http://") ||
      first.startsWith("https://") ||
      first.startsWith("/")
    ) {
      return first;
    }
  } else if (typeof first === "object" && first !== null) {
    return first.secure_url || first.url || "/placeholder.png";
  }

  return "/placeholder.png";
};

// 🟢 Strip HTML tags for clean card description preview
const stripHtml = (htmlString = "") => {
  if (!htmlString) return "";

  // Decode HTML entities like &lt;p&gt; → <p>
  const textarea = document.createElement("textarea");
  textarea.innerHTML = htmlString;

  // Remove HTML tags
  return textarea.value.replace(/<[^>]*>/g, "").trim();
};

// Used for both "OUR MENU" (default props: categories shown in the menu)
// and the "Bangladeshi Special" section (listing="special": categories
// ticked "Bangladeshi Special" in Admin > Category, e.g. Dhaka Flavours).
export default function CategoryGrid({
  listing = "menu",
  sectionId = "our-menu",
  title = "OUR",
  accent = "MENU",
  eyebrow,
  showCartButton = true,
  hideWhenEmpty = false,
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const dispatch = useDispatch();

  const cartProducts = useSelector((store) => store.cartStore?.products) || [];
  const totalCount = useSelector((store) => store.cartStore?.count) || 0;

  // 1. 🟢 DB থেকে ক্যাটাগরি লিস্ট ফেচ করা
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories-list", listing],
    queryFn: async () => {
      const res = await axios.get(
        listing === "special" ? "/api/category?special=1" : "/api/category?menu=1",
      );
      return res.data?.data || [];
    },
  });

  // 2. 🟢 সিলেক্ট করা ক্যাটাগরির প্রোডাক্ট লিস্ট DB থেকে নিয়ে আসা
  const { data: categoryProducts, isLoading: isProductsLoading } = useQuery({
    queryKey: ["category-products", selectedCategory?._id],
    queryFn: async () => {
      if (!selectedCategory?._id) return [];
      const res = await axios.get(
        `/api/product?category=${selectedCategory._id}`,
      );
      return res.data?.data || [];
    },
    enabled: !!selectedCategory?._id,
  });

  const categories = categoriesData || [];

  // While the popup is open: stop the page behind it scrolling (iOS
  // Safari scrolls the body under a fixed overlay otherwise) and let
  // Escape close it.
  useEffect(() => {
    if (!selectedCategory) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setSelectedCategory(null);
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedCategory]);

  const isProductInCart = (prod) => {
    return cartProducts.some((item) => item.productId === prod._id);
  };

  const handleToggleCart = (prod) => {
    const isAdded = isProductInCart(prod);
    const prodImg = getValidImageUrl(prod.media);

    if (isAdded) {
      dispatch(removeFromCart({ productId: prod._id }));
    } else {
      dispatch(
        addIntoCart({
          productId: prod._id,
          variantId: "default",
          title: prod.name,
          price: prod.sellingPrice || prod.mrp,
          image: prodImg,
          quantity: 1,
        }),
      );
    }
  };

  if (hideWhenEmpty && !isCategoriesLoading && categories.length === 0) {
    return null;
  }

  return (
    // Our Menu and Bangladeshi Special sit back to back, so keep the space
    // between them tight: small bottom padding on the menu, almost no top
    // padding on the special section.
    <section
      id={sectionId}
      className={`bg-[#0A1806] px-4 lg:px-8 scroll-mt-28 ${
        listing === "special" ? "pt-4 pb-14" : "pt-14 pb-8"
      }`}
    >
      {/* Header */}
      <div className="max-w-[1400px] mx-auto flex justify-between items-center mb-8">
        <div>
          {eyebrow && (
            <p className="font-script text-2xl text-[#F7C318]">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display mt-1 text-[34px] sm:text-5xl font-black leading-[1.05] tracking-tight text-white">
            {title} <span className="text-[#E1262D]">{accent}</span>
          </h2>
        </div>

        {/* Cart Counter */}
        {showCartButton && (
        <button className="relative p-3 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 text-orange-500 hover:bg-orange-500 hover:text-black transition-all duration-300 shadow-lg group">
          <ShoppingBag
            size={22}
            className="transition-transform group-hover:scale-110"
          />
          {totalCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-black text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full ring-4 ring-black animate-pulse">
              {totalCount}
            </span>
          )}
        </button>
        )}
      </div>

      {/* Menu Grid Loading Skeleton */}
      {isCategoriesLoading ? (
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="h-[320px] bg-zinc-900/50 border border-zinc-800/80 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        /* Dynamic Menu Grid */
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((item) => {
            const catImage = cloudinaryResize(getValidImageUrl(item.media || item.image), {
              width: 560,
              height: 480,
            });
            const cleanDescription = stripHtml(item.description);

            return (
              <button
                key={item._id}
                onClick={() => setSelectedCategory(item)}
                className="group text-left bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-orange-500/60 hover:shadow-[0_0_30px_rgba(225,38,45,0.15)] transition-all duration-500 flex flex-col justify-between transform hover:-translate-y-1"
              >
                {/* Image Wrapper */}
                <div className="relative w-full h-[170px] md:h-[200px] overflow-hidden bg-zinc-950 shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10 opacity-60"></div>
                  <Image
                    src={catImage}
                    alt={item.name || "Menu Category"}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-white text-base md:text-lg font-bold leading-snug mb-1.5 group-hover:text-orange-500 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-zinc-400 text-xs md:text-sm leading-relaxed line-clamp-2">
                      {cleanDescription ||
                        "Delicious items available in this category."}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center text-orange-500 text-xs font-semibold gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Explore Items</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Category Popup Modal */}
      {selectedCategory && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedCategory(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800/90 w-full max-w-2xl rounded-3xl p-4 sm:p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedCategory.name}
          >
            {/* Header: name + description, no cover photo */}
            <div className="flex items-start justify-between gap-4 border-b border-zinc-900 pb-4 mb-4 shrink-0">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                  {selectedCategory.name}
                </h2>
                {selectedCategory.description && (
                  <p className="text-zinc-400 text-sm mt-1 leading-relaxed line-clamp-2">
                    {stripHtml(selectedCategory.description)}
                  </p>
                )}
                {!isProductsLoading && categoryProducts?.length > 0 && (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-orange-500">
                    {categoryProducts.length} item{categoryProducts.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                aria-label="Close"
                className="shrink-0 bg-zinc-900 border border-zinc-800 p-2.5 rounded-full hover:bg-orange-500 hover:text-black text-white transition-all duration-300 shadow-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Products List */}
            <div className="space-y-3 overflow-y-auto pr-1.5 -mr-1.5 flex-1 overscroll-contain [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
              {isProductsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
                  <Loader2 size={32} className="animate-spin text-orange-500" />
                  <p className="text-sm font-medium">Loading items...</p>
                </div>
              ) : categoryProducts && categoryProducts.length > 0 ? (
                categoryProducts.map((prod) => {
                  const added = isProductInCart(prod);
                  const prodImg = cloudinaryResize(getValidImageUrl(prod.media), {
                    width: 360,
                    height: 360,
                  });
                  const calories = prod.calories || prod.kCal;
                  const description = stripHtml(prod.description);

                  return (
                    <div
                      key={prod._id}
                      className="group flex gap-3.5 sm:gap-4 bg-zinc-900/60 hover:bg-zinc-900 p-3 rounded-2xl border border-zinc-800/60 hover:border-zinc-700 transition-all duration-300"
                    >
                      {/* Product photo */}
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden shrink-0 bg-zinc-950 border border-zinc-800">
                        <Image
                          src={prodImg}
                          alt={prod.name}
                          fill
                          unoptimized
                          sizes="128px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h4 className="text-white font-bold text-base sm:text-lg leading-snug line-clamp-1">
                          {prod.name}
                        </h4>
                        {description && (
                          <p className="mt-1 text-zinc-400 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3">
                            {description}
                          </p>
                        )}

                        <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-orange-500 font-black text-base sm:text-lg leading-none">
                              £{Number(prod.sellingPrice || prod.mrp || 0).toFixed(2)}
                            </p>
                            {calories ? (
                              <span className="inline-flex items-center gap-1 bg-zinc-950/80 border border-zinc-800/60 px-2 py-0.5 rounded-full text-[11px] text-amber-400 font-medium">
                                <Flame size={12} className="text-orange-400 shrink-0" />
                                {calories} kcal
                              </span>
                            ) : null}
                          </div>

                          <button
                            onClick={() => handleToggleCart(prod)}
                            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all duration-300 shrink-0 ${
                              added
                                ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white"
                                : "bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/25 active:scale-95"
                            }`}
                          >
                            {added ? (
                              <>
                                <Check size={15} />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus size={15} />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16">
                  <p className="text-zinc-500 text-sm">
                    No items found in this category.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
