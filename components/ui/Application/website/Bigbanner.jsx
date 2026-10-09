"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Star, Truck } from "lucide-react";

// Homepage hero — Special Offers / Best Sellers slider with real food
// photography (public/assets/food). Autoplays, pauses on hover, swipeable.
const SLIDES = [
  {
    image: "/assets/food/kacchi.jpg",
    eyebrow: "Weekend Special · Fri & Sat",
    title: ["Sultan's", "Kacchi Biryani"],
    text: "Slow-cooked, fragrant and layered with tender meat. Our most-loved weekend feast.",
    price: "8.99",
    badge: "Best Seller",
  },
  {
    image: "/assets/food/peri-chicken.jpg",
    eyebrow: "Flame Grill & Peri Peri",
    title: ["Flame-Grilled", "Peri Peri Chicken"],
    text: "Marinated overnight and grilled over open flame. Served with house salted fries and signature sauces.",
    price: "5.99",
    badge: "From",
  },
  {
    image: "/assets/food/full-english.jpg",
    eyebrow: "Breakfast · Served All Day",
    title: ["The Big", "English Breakfast"],
    text: "Eggs, sausages, turkey rashers, hash browns, beans and a toasted bagel. Proper London fuel from 8AM.",
    price: "11.99",
    badge: "All Day",
  },
  {
    image: "/assets/food/grill-platter.jpg",
    eyebrow: "Grill Platters · Share the Feast",
    title: ["Mixed Grill", "Platter for 2"],
    text: "Lamb chops, chicken tikka, lamb and chicken seekh kebabs, fries and salad, all on one platter.",
    price: "19.99",
    badge: "Sharing",
  },
];

const AUTOPLAY_MS = 6000;

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (dir) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length),
    [],
  );

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => go(1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, paused, go]);

  const slide = SLIDES[index];

  return (
    <section
      className="relative isolate overflow-hidden bg-[#0A1806]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative h-[540px] sm:h-[600px] lg:h-[calc(100svh-116px)] lg:min-h-[560px] lg:max-h-[720px]">
        {/* Background photo with slow zoom */}
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={slide.image}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.9 }, scale: { duration: AUTOPLAY_MS / 1000 + 1, ease: "linear" } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
          >
            <Image
              src={slide.image}
              alt={slide.title.join(" ")}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Legibility overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A1806] via-[#0A1806]/80 to-[#0A1806]/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A1806] via-transparent to-transparent" />
        <div className="sfg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(90deg,black,transparent_60%)]" />

        {/* Copy */}
        <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-[1400px] items-center px-4 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="pointer-events-auto max-w-[640px]"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F7C318]/40 bg-[#F7C318]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F7C318] backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F7C318]" />
                {slide.eyebrow}
              </span>

              <h1 className="font-display mt-4 text-[44px] font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-[76px]">
                {slide.title[0]}
                <br />
                <span className="bg-gradient-to-r from-[#FF5A5F] to-[#E1262D] bg-clip-text text-transparent">
                  {slide.title[1]}
                </span>
              </h1>

              <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-white/75 sm:text-base">
                {slide.text}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/order-online"
                  className="group flex h-12 items-center gap-2 rounded-full bg-[#E1262D] px-7 text-sm font-extrabold text-white shadow-[0_12px_30px_-10px_rgba(225,38,45,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C41D23]"
                >
                  View Menu
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="tel:+442039956692"
                  className="flex h-12 items-center rounded-full border border-white/25 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur transition-colors hover:border-[#F7C318] hover:text-[#F7C318]"
                >
                  Call to order
                </a>
                <div className="flex items-baseline gap-1.5 pl-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    {slide.badge}
                  </span>
                  <span className="font-display text-3xl font-black text-[#F7C318]">£{slide.price}</span>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium text-white/70">
                <span className="flex items-center gap-1.5">
                  <Star size={15} className="fill-[#F7C318] text-[#F7C318]" /> Loved in Forest Gate
                </span>
                <span className="flex items-center gap-1.5">
                  <Truck size={15} className="text-[#F7C318]" /> Delivery &amp; Collection
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-[#F7C318]" /> Open 8AM – 12AM
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Halal seal */}
        <div className="absolute right-6 top-6 z-10 hidden h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#E1262D] text-center text-white shadow-2xl md:flex lg:right-10 lg:top-10">
          <div className="leading-none">
            <span className="block text-2xl font-black" lang="ar">حلال</span>
            <span className="mt-1 block text-[10px] font-black tracking-[0.2em]">100% HALAL</span>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-5 z-10 mx-auto flex max-w-[1400px] items-center justify-between px-4 lg:bottom-8 lg:px-8">
          <div className="flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.image}
                onClick={() => setIndex(i)}
                aria-label={`Show slide ${i + 1}`}
                className={`relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-all duration-300 ${
                  i === index ? "w-12" : "w-5 hover:bg-white/50"
                }`}
              >
                {i === index && (
                  <motion.span
                    key={`${index}-${paused}`}
                    className="absolute inset-y-0 left-0 bg-[#F7C318]"
                    initial={{ width: "0%" }}
                    animate={{ width: paused ? "0%" : "100%" }}
                    transition={{ duration: paused ? 0 : AUTOPLAY_MS / 1000, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur transition-colors hover:border-[#E1262D] hover:bg-[#E1262D]"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next slide"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur transition-colors hover:border-[#E1262D] hover:bg-[#E1262D]"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrolling ticker */}
      <div className="relative overflow-hidden border-y-2 border-[#E1262D] bg-[#F7C318] py-2.5 text-[#0A1806]">
        <div className="animate-sfg-marquee flex w-max gap-10 whitespace-nowrap text-[13px] font-black uppercase tracking-[0.14em]">
          {[0, 1].flatMap((k) =>
            [
              "Biryani",
              "Döner Kebab",
              "Peri Peri",
              "Curry",
              "English Breakfast",
              "Fresh Naan",
              "Karak Chai",
              "Smash Burgers",
              "100% Halal",
            ].map((w) => (
              <span key={`${k}-${w}`} className="flex items-center gap-10">
                {w}
                <span className="text-[#E1262D]">✦</span>
              </span>
            )),
          )}
        </div>
      </div>
    </section>
  );
}
