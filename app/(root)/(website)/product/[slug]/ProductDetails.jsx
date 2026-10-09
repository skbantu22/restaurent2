"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { Phone, MessageCircle } from "lucide-react";
import { addIntoCart } from "@/store/reducer/cartReducer";
import { showToast } from "@/lib/showToast";
import Link from "next/link";
import { WEBSITE_CART } from "@/Route/Websiteroute";
import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import { AccordionBasic } from "./Acording";
import WishlistButton from "@/components/ui/Application/website/WishlistButton";

import DetailsSlider from "@/components/ui/Application/website/detailsslider";
import { ShoppingCart } from "lucide-react";
import ProductGallery from "@/components/ui/Application/website/productgalary";

// মেটা ট্র্যাকিং ফাংশন ইমপোর্ট
import { trackMetaEvent } from "@/lib/meta/metaTrack";

const ProductDetails = ({
  product,
  initialVariant,
  allVariants = [],
  colors = [],
  similarProducts = [],
}) => {
  const cartStore = useSelector((store) => store.cartStore);
  const dispatch = useDispatch();

  // ট্র্যাকিং রেফারেন্স (যাতে ডুপ্লিকেট ইভেন্ট ফায়ার না হয়)
  const hasTrackedView = useRef(false);

  // স্লাইডারের একটিভ ইনডেক্স স্টেট (STEP 3)
  const [activeIndex, setActiveIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddedIntoCart, setIsAddedIntoCart] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  // The restaurant's real phone, from Settings — was a hardcoded
  // "8801XXXXXXXXX" placeholder that was never actually filled in.
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((res) => {
        if (res?.success && res.data?.phone) setContactPhone(res.data.phone);
      })
      .catch(() => {});
  }, []);

  // UK-format → E.164-ish digits (44 + local number, no leading 0),
  // suitable for both tel: and wa.me links.
  const intlPhone = useMemo(() => {
    const digits = contactPhone.replace(/[^0-9]/g, "");
    if (!digits) return "";
    if (digits.startsWith("44")) return digits;
    const local = digits.startsWith("0") ? digits.slice(1) : digits;
    return `44${local}`;
  }, [contactPhone]);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    {
      label: product?.category?.name || "Category",
      href: `/shop?category=${product?.category?.slug || ""}`,
    },
    { label: product?.name || "Product" },
  ];

  const handleWhatsAppOrder = () => {
    if (!intlPhone) return;

    const message = `
🛍️ Order Request

Product: ${product?.name}
Quantity: ${quantity}

Price: £${displaySellingPrice}

Product Link:
${window.location.href}
  `;

    const whatsappUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  };

  const handleCallOrder = () => {
    if (!intlPhone) return;
    window.location.href = `tel:+${intlPhone}`;
  };
  // ==========================================
  // STEP 1: Create Flat Gallery List
  // ==========================================
  const flatGallery = useMemo(() => {
    if (!allVariants?.length) return [];

    return allVariants.flatMap((v) =>
      (v.media || []).map((m) => ({
        image: m?.secure_url,
        color: v.color ?? null,
        size: v.size,
        sku: v.sku,
        variantId: v._id,
        sellingPrice: v.sellingPrice,
        mrp: v.mrp,
        stock: v.stock || 0,
      })),
    );
  }, [allVariants]);

  // ==========================================
  // STEP 4: Current Slide Data
  // ==========================================
  const currentSlide = flatGallery[activeIndex] || {};

  // Selected Color & Size States (Synced with current slide)
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const hasColors = useMemo(() => {
    return allVariants?.some((v) => !!v.color);
  }, [allVariants]);

  // স্লাইড চেঞ্জ হলে কালার এবং সাইজ অটোমেটিক সিঙ্ক করার জন্য ইফেক্ট
  useEffect(() => {
    setSelectedColor(currentSlide.color || "");
    setSelectedSize(currentSlide.size || "");
  }, [activeIndex]);

  // কালার বা সাইজ বাটন ক্লিক করলে স্লাইডারের পজিশন চেঞ্জ করার লজিক
  const handleVariantSelection = (color, size) => {
    // CASE 1: NO COLOR SYSTEM
    if (!hasColors) {
      const targetSize = size || selectedSize;

      const index = flatGallery.findIndex((item) => item.size === targetSize);

      if (index !== -1) setActiveIndex(index);
      return;
    }

    // CASE 2: COLOR SYSTEM (OLD LOGIC)
    const targetColor = color || selectedColor;
    const targetSize = size || selectedSize;

    const targetIndex = flatGallery.findIndex(
      (item) => item.color === targetColor && item.size === targetSize,
    );

    if (targetIndex !== -1) {
      setActiveIndex(targetIndex);
    } else if (color) {
      const colorIndex = flatGallery.findIndex((item) => item.color === color);
      if (colorIndex !== -1) setActiveIndex(colorIndex);
    }
  };

  // কালার ওয়াইজ ডাইনামিক সাইজ লিস্ট (স্টক চেক করার জন্য)
  const dynamicSizes = useMemo(() => {
    if (!hasColors) {
      return allVariants.map((v) => ({
        size: v.size,
        stock: v.stock || 0,
        id: v._id,
      }));
    }

    return allVariants
      .filter((v) => v.color === selectedColor)
      .map((v) => ({
        size: v.size,
        stock: v.stock || 0,
        id: v._id,
      }));
  }, [selectedColor, allVariants, hasColors]);

  // ==========================================
  // STEP 5: Dynamic Price, SKU, Stock
  // ==========================================
  const displaySellingPrice =
    currentSlide.sellingPrice ?? product?.sellingPrice ?? product?.price ?? 0;

  const displayMrp = currentSlide.mrp ?? product?.mrp ?? displaySellingPrice;

  const displaySku = currentSlide.sku || initialVariant?.sku || "N/A";

  const isOutOfStock =
    currentSlide.stock !== undefined ? currentSlide.stock <= 0 : false;

  // --- META VIEW CONTENT TRACKING ---
  useEffect(() => {
    if (product?._id && !hasTrackedView.current) {
      trackMetaEvent("ViewContent", {
        content_name: product.name,
        content_ids: [product._id],
        content_type: "product",
        value: displaySellingPrice,
        currency: "BDT",
      });
      hasTrackedView.current = true;
    }
  }, [product, displaySellingPrice]);

  // ==========================================
  // STEP 6: Arrow Navigation Logic
  // ==========================================
  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1 >= flatGallery.length ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setActiveIndex((prev) =>
      prev - 1 < 0 ? flatGallery.length - 1 : prev - 1,
    );
  };

  // Check if already in cart
  useEffect(() => {
    const pid = product?._id;
    const vid = currentSlide?.variantId;

    if (!pid) {
      setIsAddedIntoCart(false);
      return;
    }

    const exists = cartStore?.products?.some((p) =>
      vid ? p.productId === pid && p.variantId === vid : p.productId === pid,
    );

    setIsAddedIntoCart(!!exists);
  }, [cartStore?.products, product?._id, currentSlide?.variantId]);

  // Handle Add to Cart
  const handleAddtoCart = () => {
    if (isOutOfStock) {
      showToast("error", "This product is out of stock.");
      return false;
    }
    if (!product?._id) {
      showToast("error", "Product not available.");
      return false;
    }

    const cartProduct = {
      productId: product._id,
      variantId: currentSlide?.variantId || null,
      name: product.name,
      slug: product.slug,
      size: selectedSize || null,
      color: selectedColor || null,
      mrp: displayMrp,
      sellingPrice: displaySellingPrice,
      media: currentSlide?.image || product?.media?.[0]?.secure_url || "",
      quantity: Number(quantity ?? 1),
      discount: product?.discountPercentage || 0,
      stock: currentSlide?.stock ?? null,
    };

    // --- META ADD TO CART TRACKING ---
    trackMetaEvent("AddToCart", {
      content_name: product.name,
      content_ids: [product._id],
      content_type: "product",
      value: displaySellingPrice * (quantity ?? 1),
      currency: "GBP",
    });

    dispatch(addIntoCart(cartProduct));
    showToast("success", "Product added into cart", {
      position: "bottom-center",
    });

    return true;
  };

  // Quantity check
  useEffect(() => {
    if (currentSlide?.stock && quantity > currentSlide.stock) {
      setToastMessage(`Stock limit crossed! Only ${currentSlide.stock} left`);
      setQuantity(currentSlide.stock || 1);
    }
  }, [quantity, currentSlide?.stock]);

  useEffect(() => {
    if (toastMessage) {
      showToast("error", toastMessage);
      setToastMessage("");
    }
  }, [toastMessage]);

  useEffect(() => {
    if (!hasColors && flatGallery.length > 0) {
      // first variant = default active
      setActiveIndex(0);
      setSelectedColor("");
    }
  }, [hasColors, flatGallery.length]);

  return (
    <div className="storefront-theme bg-background text-foreground min-h-screen antialiased">
      <div className="max-w-7xl mx-auto px-2 md:px-6 py-2 md:py-6 flex items-center gap-2 text-[9px] uppercase text-zinc-500">
        <Breadcums items={breadcrumbItems} />
      </div>

      <main className="max-w-7xl mx-auto px-2 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-10 pb-20">
        <div className="lg:col-span-7">
          <div className="relative">
            {/* STEP 7: Connect ProductGallery */}
            <ProductGallery
              galleryMedia={flatGallery.map((i) => i.image)}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              onNext={handleNext}
              onPrev={handlePrev}
            />
            {isOutOfStock && (
              <div className="absolute top-4 left-[110px] z-30 bg-black text-white px-3 py-1 text-[10px] font-bold tracking-tighter uppercase pointer-events-none">
                Out of Stock
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <div className="w-full max-w-md mx-auto lg:mx-0 flex flex-col ">
            <div className="flex items-start justify-between gap-3 ">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight leading-snug text-white break-words">
                {product?.name}
              </h1>
              <div className="shrink-0 ">
                <WishlistButton
                  productId={product?._id}
                  variantId={currentSlide?.variantId}
                />
              </div>
            </div>

            <div className="text-[12px] md:text-sm tracking-wide text-zinc-500">
              <span className="uppercase font-medium text-zinc-500">SKU: </span>
              <span className="uppercase font-semibold text-zinc-300">{displaySku}</span>
            </div>

            <div className="flex items-center gap-4 mb-4 md:mb-8 mt-2">
              <span className="text-2xl font-bold text-[#E1262D]">
                £{Number(displaySellingPrice).toLocaleString("en-GB")}
              </span>
              {Number(displayMrp) > Number(displaySellingPrice) && (
                <span className="text-base text-zinc-600 line-through font-light">
                  £{Number(displayMrp).toLocaleString("en-GB")}
                </span>
              )}
            </div>

            {/* Colour/size variants only apply to the legacy retail
                catalogue (ProductVariantModel) — real menu items have
                none, so this whole block simply doesn't render for
                food, instead of showing an empty "Size: Select" with
                a disabled dash. */}
            {flatGallery.length > 0 && (
              <div className="space-y-4 md:space-y-5 mb-3 md:mb-4 ">
                {hasColors ? (
                  <div className="select-none">
                    <h3 className="text-xs md:text-lg font-medium mb-2 text-white">
                      Color
                    </h3>

                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {colors.map((color) => {
                        const isSelected = selectedColor === color;

                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleVariantSelection(color, null)}
                            className={`min-w-[30px] h-[25px] md:h-[40px] px-4 rounded-full border transition-all ${
                              isSelected
                                ? "border-[#E1262D] bg-[#E1262D]/10 text-[#E1262D] shadow-sm scale-105"
                                : "border-[#214419] bg-[#0F2109] text-zinc-400 hover:border-zinc-600"
                            }`}
                          >
                            <span className="text-[9px] md:text-[12px] tracking-wider">
                              {color}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // ✅ THIS IS YOUR ELSE PART (NO COLOR CASE)
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white">Colors:</h3>

                    <div className="flex flex-wrap gap-2">
                      {flatGallery
                        .filter(
                          (v, index, self) =>
                            index === self.findIndex((t) => t.image === v.image),
                        )
                        .slice(0, 6)
                        .map((item) => {
                          const realIndex = flatGallery.findIndex(
                            (v) => v.image === item.image,
                          );

                          const isActive = activeIndex === realIndex;

                          return (
                            <button
                              key={realIndex}
                              onClick={() => setActiveIndex(realIndex)}
                              className={`w-14 h-14 rounded-md overflow-hidden border transition-all ${
                                isActive
                                  ? "border-[#E1262D] scale-105 shadow-md"
                                  : "border-[#214419]"
                              }`}
                            >
                              <img
                                src={item.image}
                                alt="variant"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {dynamicSizes.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs md:text-lg font-medium mb-2 text-white ">
                      Size:
                      <span className="font-normal text-zinc-400 ml-1">
                        {selectedSize || "Select"}
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 ">
                      {dynamicSizes.map((item) => {
                        const isSelected = selectedSize === item.size;
                        return (
                          <button
                            key={item.size}
                            type="button"
                            disabled={item.stock === 0}
                            onClick={() =>
                              handleVariantSelection(null, item.size)
                            }
                            className={`
                              relative flex items-center justify-center
                              min-w-[30px] h-[25px] md:h-[40px] px-4
                              text-sm transition-all duration-200
                              ${
                                isSelected
                                  ? "border border-[#E1262D] rounded-full text-[#E1262D] shadow-[0_4px_12px_rgba(255,107,0,0.15)] scale-105"
                                  : "border border-zinc-600 text-zinc-400 rounded-full hover:text-white"
                              }
                              ${item.stock === 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                            `}
                          >
                            <span
                              className={
                                isSelected ? "font-semibold" : "font-normal"
                              }
                            >
                              {item.size}
                            </span>
                            {item.stock === 0 && (
                              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="w-full h-[1px] bg-zinc-600"></span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 mb-4 md:mb-12 mt-2">
              <div className="flex flex-col gap-2 items-stretch">
                <div className="flex gap-1 md:gap-2 items-stretch">
                  <div className="flex items-center border border-[#214419] bg-[#0F2109] w-[110px] md:w-[130px] h-[40px] md:h-[42px] select-none rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-full flex items-center justify-center text-white hover:bg-[#183310] hover:text-[#E1262D] transition-colors"
                    >
                      <span className="text-xl font-light leading-none">-</span>
                    </button>
                    <div className="flex-1 h-full flex items-center justify-center">
                      <span className="text-sm md:text-base font-bold text-white">
                        {quantity}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) =>
                          currentSlide?.stock && q + 1 > currentSlide.stock
                            ? q
                            : q + 1,
                        )
                      }
                      className="w-10 h-full flex items-center justify-center text-white hover:bg-[#183310] hover:text-[#E1262D] transition-colors"
                    >
                      <span className="text-lg font-light leading-none">+</span>
                    </button>
                  </div>

                  {!isAddedIntoCart ? (
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={handleAddtoCart}
                      className={`w-full flex items-center justify-center gap-2 font-bold uppercase text-[13px] tracking-widest py-2.5 rounded-md transition-all duration-300 border ${
                        isOutOfStock
                          ? "bg-[#183310] text-zinc-600 border-[#183310] cursor-not-allowed"
                          : "bg-[#E1262D] text-white border-[#E1262D] hover:bg-[#EE3B41]"
                      }`}
                    >
                      {!isOutOfStock && (
                        <ShoppingCart size={18} strokeWidth={2.5} />
                      )}
                      {isOutOfStock ? "Out of Stock" : "Add To Cart"}
                    </button>
                  ) : (
                    <Link href={WEBSITE_CART} className="w-full">
                      <button className="w-full flex items-center justify-center gap-2 bg-[#0F2109] text-white border-2 border-[#E1262D] rounded-md font-bold uppercase text-[13px] tracking-widest py-3 hover:bg-[#E1262D] transition-all duration-300">
                        <ShoppingCart size={18} strokeWidth={2.5} />
                        View Your Order
                      </button>
                    </Link>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    const added = handleAddtoCart();
                    if (added) window.location.href = WEBSITE_CART;
                  }}
                  className={`w-full flex items-center justify-center font-bold uppercase text-[13px] tracking-widest py-3 rounded-md transition-all duration-300 border ${
                    isOutOfStock
                      ? "bg-[#183310] text-zinc-600 border-[#183310] cursor-not-allowed"
                      : "bg-[#183310] text-white border-[#214419] hover:border-[#E1262D] hover:text-[#E1262D] shadow-sm"
                  }`}
                >
                  {isOutOfStock ? "Out of Stock" : "Buy It Now"}
                </button>

                {intlPhone && (
                  <div className="grid grid-cols-2 gap-2">
                    {/* CALL BUTTON */}
                    <button
                      type="button"
                      onClick={handleCallOrder}
                      className="w-full flex items-center justify-center gap-2 bg-[#0F2109] text-white border border-[#214419] rounded-md font-bold uppercase text-[12px] tracking-widest py-3 hover:border-[#E1262D] hover:text-[#E1262D] transition-all duration-300"
                    >
                      <Phone size={18} strokeWidth={2.2} />
                      Call For Order
                    </button>

                    {/* WHATSAPP BUTTON */}
                    <button
                      type="button"
                      onClick={handleWhatsAppOrder}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 text-white border border-green-600 rounded-md font-bold uppercase text-[12px] tracking-widest py-3 hover:bg-green-700 transition-all duration-300"
                    >
                      <MessageCircle size={18} strokeWidth={2.2} />
                      Order On WhatsApp
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <AccordionBasic product={product} />
            </div>
          </div>
        </div>
      </main>

      {similarProducts && similarProducts.length > 0 && (
        <section className="px-1 md:px-30 lg:px-40 pb-4">
          <div className="flex justify-center items-center px-2 text-center mb-2 lg:mb-4">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide text-white">
              You May Also Like
            </h1>
          </div>
          <DetailsSlider products={similarProducts} />
        </section>
      )}
    </div>
  );
};

export default ProductDetails;
