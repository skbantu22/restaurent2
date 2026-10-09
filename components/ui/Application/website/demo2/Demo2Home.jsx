"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRight,
  Check,
  Clock,
  Flame,
  Leaf,
  MapPin,
  Phone,
  Plus,
  Search,
  Star,
  Truck,
  ShoppingBag,
  Quote,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { addIntoCart, removeFromCart } from "@/store/reducer/cartReducer";

const RED = "#E1262D";
const GREEN = "#2F6B16";

const fade = {
  hidden: { opacity: 0, y: 22 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.06 } }),
};

const imgOf = (p) => {
  const m = p?.media?.[0];
  if (!m) return "/assets/food/spread.jpg";
  return typeof m === "string" ? m : m.url || m.secure_url || "/assets/food/spread.jpg";
};

function Heading({ script, title, accent, text }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center lg:mb-10">
      {script && <p className="font-script text-[28px] leading-none text-[#F47B20]">{script}</p>}
      <h2 className="font-d2-display mt-1 text-[36px] leading-[1.05] text-[#1F3313] sm:text-[48px]">
        {title} {accent && <span className="text-[#E1262D]">{accent}</span>}
      </h2>
      {text && <p className="mt-3 text-[15px] text-[#5B6B52]">{text}</p>}
    </div>
  );
}

function useCartToggle() {
  const dispatch = useDispatch();
  const cart = useSelector((s) => s.cartStore?.products) || [];
  const inCart = (id) => cart.some((c) => String(c.productId) === String(id));
  const toggle = (p) => {
    if (inCart(p._id)) return dispatch(removeFromCart({ productId: p._id }));
    dispatch(
      addIntoCart({
        productId: p._id,
        variantId: "default",
        title: p.name,
        name: p.name,
        price: p.sellingPrice || p.mrp,
        image: imgOf(p),
        quantity: 1,
      }),
    );
  };
  return { inCart, toggle };
}

/* ------------------------------------------------------------------ */
/* HERO                                                                */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#FFFBF2]">
      {/* flyer curves */}
      <div className="pointer-events-none absolute -right-[18%] -top-[30%] h-[120%] w-[70%] rounded-full bg-[#2F6B16]" />
      <div className="pointer-events-none absolute -right-[22%] -bottom-[45%] h-[90%] w-[60%] rounded-full bg-[#E1262D]" />
      <div className="pointer-events-none absolute -right-[19%] -top-[28%] h-[120%] w-[70%] rounded-full border-[10px] border-[#F7C318]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(47,107,22,0.08)_1.5px,transparent_1.6px)] [background-size:22px_22px]" />

      <div className="relative mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-16">
        <motion.div initial="hidden" animate="show" variants={fade}>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E1262D] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-[#E1262D]/25">
            <span lang="ar">حلال</span> 100% Halal · Forest Gate
          </span>
          <h1 className="font-d2-display mt-5 text-[52px] leading-[0.95] text-[#1F3313] sm:text-[72px] lg:text-[84px]">
            <span className="block text-[0.42em] tracking-[0.3em] text-[#D49B00]">SHAWON</span>
            Food <span className="text-[#E1262D]">Gate</span>
          </h1>
          <p className="font-script -mt-1 text-[44px] text-[#F47B20] sm:text-[56px]" style={{ transform: "rotate(-4deg)", transformOrigin: "left" }}>
            Menu
          </p>
          <p className="mt-3 max-w-[500px] text-[16px] leading-relaxed text-[#4A5A42]">
            Biryani, döner kebab, curry, English breakfast, fresh naan, coffee and karak tea, all cooked fresh
            on Forest Lane, 7 days a week.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#menu"
              className="group flex h-12 items-center gap-2 rounded-full bg-[#E1262D] px-7 text-sm font-bold text-white shadow-[0_12px_28px_-10px_rgba(225,38,45,0.8)] transition-transform hover:-translate-y-0.5"
            >
              Explore the Menu <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              href="#menu"
              className="flex h-12 items-center gap-2 rounded-full border-2 border-[#2F6B16] px-6 text-sm font-bold text-[#2F6B16] transition-colors hover:bg-[#2F6B16] hover:text-white"
            >
              <ShoppingBag size={17} /> Order Online
            </Link>
          </div>

          <div className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_10px_30px_-14px_rgba(31,51,19,0.35)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F6B16] text-white">
              <Clock size={20} />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold text-[#2F6B16]">7 DAYS A WEEK</span>
              <span className="text-sm font-bold text-[#E1262D]">8AM TILL 12AM</span>
            </span>
          </div>
        </motion.div>

        {/* plates collage */}
        <div className="relative mx-auto aspect-square w-full max-w-[540px]">
          {[
            { src: "/assets/food/biryani.jpg", cls: "left-[2%] top-[4%] w-[58%]", d: 0 },
            { src: "/assets/food/full-english.jpg", cls: "right-[0%] top-[0%] w-[44%]", d: 0.15 },
            { src: "/assets/food/doner.jpg", cls: "right-[2%] bottom-[6%] w-[46%]", d: 0.3 },
            { src: "/assets/food/peri-chicken.jpg", cls: "left-[6%] bottom-[0%] w-[44%]", d: 0.45 },
          ].map((p) => (
            <motion.div
              key={p.src}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{ opacity: { delay: p.d }, scale: { delay: p.d }, y: { duration: 6, repeat: Infinity, delay: p.d } }}
              className={`absolute aspect-square overflow-hidden rounded-full border-[6px] border-white shadow-[0_24px_50px_-18px_rgba(0,0,0,0.55)] ${p.cls}`}
            >
              <Image src={p.src} alt="" fill sizes="300px" className="object-cover" priority />
            </motion.div>
          ))}
          <div className="absolute left-[44%] top-[44%] flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#E1262D] text-center text-white shadow-2xl">
            <span className="leading-none">
              <span className="block text-2xl font-black" lang="ar">حلال</span>
              <span className="text-[10px] font-black tracking-[0.18em]">HALAL</span>
            </span>
          </div>
        </div>
      </div>

      {/* chips row */}
      <div className="relative border-y border-[#2F6B16]/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-3 text-[13px] font-semibold text-[#2F6B16]">
          {["Biryani", "Döner Kebab", "Curry", "English Breakfast", "Fresh Naan", "Coffee", "Karak Tea", "Sandwich"].map((t, i) => (
            <span key={t} className="flex items-center gap-6">
              {i > 0 && <span className="text-[#E1262D]">•</span>}
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* POPULAR                                                              */
/* ------------------------------------------------------------------ */
function ProductCard({ p, i, inCart, toggle }) {
  const added = inCart(p._id);
  return (
    <motion.article
      variants={fade}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      custom={i % 8}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_-16px_rgba(31,51,19,0.35)] ring-1 ring-[#1F3313]/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-18px_rgba(31,51,19,0.45)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={imgOf(p)}
          alt={p.name}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {p.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-[#E1262D] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            {p.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold leading-snug text-[#1F3313]">{p.name}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-[13px] leading-snug text-[#6A7962]">{p.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-d2-display text-2xl text-[#E1262D]">£{Number(p.sellingPrice).toFixed(2)}</span>
          <button
            onClick={() => toggle(p)}
            aria-label={added ? `Remove ${p.name}` : `Add ${p.name}`}
            className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-all ${
              added ? "bg-[#2F6B16] text-white" : "bg-[#F7C318] text-[#1F3313] hover:bg-[#E1262D] hover:text-white"
            }`}
          >
            {added ? <Check size={15} /> : <Plus size={15} />} {added ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function Popular({ products, cart }) {
  const loved = products.filter((p) => p.isMostLoved).slice(0, 8);
  if (!loved.length) return null;
  return (
    <section className="bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-8">
        <Heading script="Customer favourites" title="Popular" accent="Items" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {loved.map((p, i) => (
            <ProductCard key={p._id} p={p} i={i} {...cart} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MENU WITH CATEGORY TABS                                             */
/* ------------------------------------------------------------------ */
function MenuTabs({ categories, products, cart }) {
  const [active, setActive] = useState("all");
  const [q, setQ] = useState("");
  const tabsRef = useRef(null);

  const byCat = useMemo(() => {
    const m = new Map();
    for (const p of products) {
      const k = String(p.categoryId);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(p);
    }
    for (const list of m.values()) list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return m;
  }, [products]);

  const term = q.trim().toLowerCase();
  const visibleCats = categories
    .filter((c) => active === "all" || String(c._id) === active)
    .map((c) => ({
      ...c,
      items: (byCat.get(String(c._id)) || []).filter(
        (p) => !term || p.name.toLowerCase().includes(term) || (p.description || "").toLowerCase().includes(term),
      ),
    }))
    .filter((c) => c.items.length);

  return (
    <section id="menu" className="scroll-mt-28 bg-[#FFFBF2] py-14 lg:py-16">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-8">
        <Heading
          script="Hungry?"
          title="Our Full"
          accent="Menu"
          text="Choose a category or search for a dish, then tap Add to build your order."
        />

        <div className="sticky top-[66px] z-20 -mx-4 bg-[#FFFBF2]/95 px-4 pb-3 pt-2 backdrop-blur lg:-mx-8 lg:px-8">
          <label className="relative mx-auto mb-3 block max-w-md">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6A7962]" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (e.target.value) setActive("all");
              }}
              placeholder="Search biryani, döner, latte…"
              className="h-12 w-full rounded-full border border-[#1F3313]/10 bg-white pl-11 pr-4 text-sm text-[#1F3313] shadow-sm outline-none focus:border-[#E1262D]"
            />
          </label>
          <div ref={tabsRef} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[{ _id: "all", name: "All" }, ...categories].map((c) => {
              const on = active === String(c._id);
              return (
                <button
                  key={c._id}
                  onClick={(e) => {
                    setActive(String(c._id));
                    e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  }}
                  className={`flex-none rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                    on
                      ? "bg-[#E1262D] text-white shadow-md shadow-[#E1262D]/25"
                      : "bg-white text-[#1F3313] ring-1 ring-[#1F3313]/10 hover:ring-[#E1262D]/40"
                  }`}
                >
                  {c.name.split(" · ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active + term}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 space-y-10"
          >
            {visibleCats.map((c) => (
              <div key={c._id}>
                <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-1">
                  <h3 className="font-d2-display inline-block rounded-r-full rounded-l-lg bg-[#E1262D] px-5 py-1.5 text-xl text-white shadow-md">
                    {c.name}
                  </h3>
                  {c.description && <p className="text-[13px] font-medium text-[#2F6B16]">{c.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
                  {c.items.map((p, i) => (
                    <ProductCard key={p._id} p={p} i={i} {...cart} />
                  ))}
                </div>
              </div>
            ))}
            {!visibleCats.length && (
              <p className="py-10 text-center text-[#6A7962]">No dishes match that search. Try “chicken” or “chai”.</p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border-l-4 border-[#F47B20] bg-white p-5 text-[13px] leading-relaxed text-[#4A5A42] shadow-sm">
          <b className="text-[#E1262D]">Allergy awareness:</b> If you have any allergies, please ask when you order. Our dishes may contain
          gluten, nuts, dairy, peanuts, soya, mustard, sesame seeds, lupin, egg, crustaceans, celery, fish, molluscs
          and sulphur dioxide.
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* TODAY'S SPECIAL + OFFERS                                            */
/* ------------------------------------------------------------------ */
const SPECIALS = {
  Sunday: ["Nawabi Morog Polao", "8.99", "/assets/food/polao.jpg"],
  Monday: ["Chicken Karahi", "7.99", "/assets/food/karahi.jpg"],
  Tuesday: ["Mega Kebab Box", "9.99", "/assets/food/doner.jpg"],
  Wednesday: ["Peri Rice Chicken Bowl", "8.99", "/assets/food/salad-bowl.jpg"],
  Thursday: ["Lamb Chops (4 pcs)", "9.99", "/assets/food/lamb-grill.jpg"],
  Friday: ["Sultan's Kacchi Biryani", "8.99", "/assets/food/kacchi.jpg"],
  Saturday: ["Sultan's Kacchi Biryani", "8.99", "/assets/food/kacchi.jpg"],
};

function SpecialAndOffers() {
  const [day, setDay] = useState("Friday");
  useEffect(() => {
    setDay(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long" }).format(new Date()));
  }, []);
  const [name, price, img] = SPECIALS[day] || SPECIALS.Friday;

  return (
    <section id="offers" className="scroll-mt-28 bg-white py-14 lg:py-16">
      <div className="mx-auto grid max-w-[1320px] gap-5 px-4 lg:grid-cols-[1.3fr_1fr] lg:px-8">
        <motion.div
          variants={fade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative flex min-h-[320px] overflow-hidden rounded-[28px] bg-[#2F6B16] text-white"
        >
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1.5px,transparent_1.6px)] [background-size:22px_22px]" />
          <div className="relative z-10 flex max-w-[58%] flex-col justify-center p-7 sm:p-9">
            <span className="w-fit rounded-full bg-[#F7C318] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#1F3313]">
              Today&apos;s Special · {day}
            </span>
            <h3 className="font-d2-display mt-4 text-4xl leading-tight sm:text-5xl">{name}</h3>
            <p className="font-d2-display mt-3 text-4xl text-[#F7C318]">£{price}</p>
            <Link href="#menu" className="mt-5 flex h-11 w-fit items-center gap-2 rounded-full bg-[#E1262D] px-6 text-sm font-bold">
              Order now <ArrowRight size={16} />
            </Link>
          </div>
          <div className="absolute -right-12 top-1/2 h-[300px] w-[300px] -translate-y-1/2 overflow-hidden rounded-full border-8 border-white/20 sm:h-[340px] sm:w-[340px]">
            <Image src={img} alt={name} fill sizes="340px" className="object-cover" />
          </div>
        </motion.div>

        <div className="grid gap-5">
          {[
            { t: "Burger Meal Upgrade", s: "Fries + soft drink with any smash burger", v: "+£1.99", bg: "bg-[#E1262D]" },
            { t: "Grill Platter for 4", s: "Lamb chops, wings, tikka & seekh kebabs", v: "£35.99", bg: "bg-[#F7C318] text-[#1F3313]" },
          ].map((o, i) => (
            <motion.div
              key={o.t}
              variants={fade}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i + 1}
              className={`flex items-center justify-between gap-4 rounded-[24px] p-6 text-white ${o.bg}`}
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80">Offer</p>
                <h3 className="font-d2-display mt-1 text-2xl">{o.t}</h3>
                <p className="text-sm opacity-85">{o.s}</p>
              </div>
              <span className="font-d2-display text-3xl">{o.v}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* WHY + REVIEWS                                                       */
/* ------------------------------------------------------------------ */
function WhyAndReviews() {
  const features = [
    { icon: Leaf, t: "100% Halal", s: "Every dish, every day." },
    { icon: Flame, t: "Flame Grilled", s: "Peri peri, tikka and lamb chops." },
    { icon: Clock, t: "8AM – Midnight", s: "Breakfast to late karak." },
    { icon: Truck, t: "Delivery & Collection", s: "Across East London." },
  ];
  // Placeholder testimonials — replace with real Google reviews before launch.
  const reviews = [
    ["The Friday kacchi biryani is unreal. Proper taste of home and always hot.", "Sultan's Kacchi Biryani"],
    ["Best halal Full English in Forest Gate. Quick and friendly service.", "Big English Breakfast"],
    ["Juicy peri peri chicken with a great char. The salted fries are addictive!", "Half Peri Peri Chicken"],
  ];
  return (
    <section className="bg-[#FFFBF2] py-14 lg:py-16">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {features.map(({ icon: Icon, t, s }, i) => (
            <motion.div
              key={t}
              variants={fade}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              className="rounded-3xl border-b-4 border-[#E1262D] bg-white p-5 text-center shadow-sm even:border-[#2F6B16]"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3CC] text-[#E1262D]">
                <Icon size={22} />
              </span>
              <h3 className="mt-3 font-bold text-[#1F3313]">{t}</h3>
              <p className="text-[13px] text-[#6A7962]">{s}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-14">
          <Heading script="Happy customers" title="What People" accent="Say" />
          <div className="grid gap-5 md:grid-cols-3">
            {reviews.map(([text, dish], i) => (
              <motion.figure
                key={dish}
                variants={fade}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i}
                className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_-16px_rgba(31,51,19,0.35)]"
              >
                <Quote className="h-8 w-8 text-[#E1262D]" />
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} size={15} className="fill-[#F7C318] text-[#F7C318]" />
                  ))}
                </div>
                <blockquote className="mt-3 text-[15px] leading-relaxed text-[#38482F]">“{text}”</blockquote>
                <figcaption className="mt-4 text-xs font-semibold text-[#2F6B16]">Ordered: {dish}</figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* VISIT / DELIVERY                                                    */
/* ------------------------------------------------------------------ */
const AREAS = [
  ["E7", "Forest Gate"],
  ["E12", "Manor Park"],
  ["E6", "East Ham"],
  ["E13", "Plaistow"],
  ["E15", "Stratford"],
  ["E11", "Leytonstone"],
];

function Visit() {
  const [pc, setPc] = useState("");
  const [res, setRes] = useState(null);
  const check = (e) => {
    e.preventDefault();
    const m = pc.trim().toUpperCase().match(/^([A-Z]{1,2}\d[A-Z\d]?)(\s*\d[A-Z]{2})?$/);
    if (!m) return setRes([false, "Please enter a valid UK postcode, e.g. E7 9BB"]);
    const a = AREAS.find(([c]) => c === m[1]);
    setRes(a ? [true, `Yes! We deliver to ${a[1]} (${a[0]}).`] : [false, `Sorry, ${m[1]} is outside our delivery area. Collection is available.`]);
  };

  return (
    <section id="visit" className="scroll-mt-28 bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-8">
        <Heading script="Come say salaam" title="Visit &" accent="Order" />
        <div className="grid overflow-hidden rounded-[28px] shadow-[0_20px_50px_-24px_rgba(31,51,19,0.5)] lg:grid-cols-2">
          <div className="bg-[#2F6B16] p-7 text-white sm:p-9">
            <h3 className="font-d2-display text-3xl">Shawon Food Gate</h3>
            <div className="mt-5 space-y-3 text-[15px]">
              <p className="flex gap-3"><MapPin className="flex-none text-[#F7C318]" size={20} /> 179 Forest Ln, London E7 9BB</p>
              <a href="tel:+442039956692" className="flex gap-3 font-bold hover:text-[#F7C318]"><Phone className="flex-none text-[#F7C318]" size={20} /> 020 3995 6692</a>
              <p className="flex gap-3"><Clock className="flex-none text-[#F7C318]" size={20} /> Monday – Sunday · 8:00AM – 12:00AM</p>
            </div>

            <p className="mt-6 text-sm font-bold">We deliver to</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AREAS.map(([c, a]) => (
                <span key={c} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <b className="text-[#F7C318]">{c}</b> {a}
                </span>
              ))}
            </div>

            <form onSubmit={check} className="mt-5 flex overflow-hidden rounded-full bg-white p-1">
              <input
                value={pc}
                onChange={(e) => setPc(e.target.value)}
                placeholder="Check your postcode"
                className="min-w-0 flex-1 bg-transparent px-4 text-sm uppercase text-[#1F3313] outline-none placeholder:normal-case"
              />
              <button className="rounded-full bg-[#E1262D] px-5 py-2.5 text-sm font-bold text-white">Check</button>
            </form>
            {res && (
              <p className={`mt-3 flex items-center gap-2 text-sm ${res[0] ? "text-[#C8F5A8]" : "text-[#FFD1D2]"}`}>
                {res[0] ? <CheckCircle2 size={17} /> : <XCircle size={17} />} {res[1]}
              </p>
            )}
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=179+Forest+Ln,+London+E7+9BB"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#F7C318] px-5 text-sm font-bold text-[#1F3313]"
            >
              Get Directions <ArrowRight size={16} />
            </a>
          </div>
          <iframe
            title="Map of Shawon Food Gate"
            src="https://www.google.com/maps?q=179+Forest+Ln,+London+E7+9BB&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="min-h-[360px] w-full border-0"
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export default function Demo2Home() {
  const cart = useCartToggle();

  const { data: categories = [] } = useQuery({
    queryKey: ["demo2-categories"],
    queryFn: async () => (await axios.get("/api/category?size=100")).data?.data || [],
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["demo2-products"],
    queryFn: async () => (await axios.get("/api/product?size=500")).data?.data || [],
  });

  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories],
  );

  return (
    <div className="font-d2-body bg-[#FFFBF2] text-[#1F3313]">
      <Hero />
      <Popular products={products} cart={cart} />
      {isLoading ? (
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-4 px-4 py-14 md:grid-cols-4 lg:px-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : (
        <MenuTabs categories={sortedCats} products={products} cart={cart} />
      )}
      <SpecialAndOffers />
      <WhyAndReviews />
      <Visit />
    </div>
  );
}
