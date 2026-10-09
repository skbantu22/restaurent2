"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgePercent,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Quote,
  ShoppingBag,
  Star,
  XCircle,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

export function SectionHeading({ eyebrow, title, accent, text, light = true, align = "center" }) {
  return (
    <div className={`mb-8 lg:mb-10 ${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
      {eyebrow && <p className="font-script text-2xl text-[#F7C318]">{eyebrow}</p>}
      <h2
        className={`font-display mt-1 text-[34px] font-black leading-[1.05] tracking-tight sm:text-5xl ${
          light ? "text-white" : "text-[#0A1806]"
        }`}
      >
        {title} {accent && <span className="text-[#E1262D]">{accent}</span>}
      </h2>
      {text && (
        <p className={`mt-3 text-[15px] leading-relaxed ${light ? "text-white/65" : "text-[#4F6147]"}`}>{text}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category quick-links                                                */
/* ------------------------------------------------------------------ */
const QUICK_CATEGORIES = [
  { name: "Biryani & Rice", image: "/assets/food/biryani.jpg" },
  { name: "Peri Peri", image: "/assets/food/peri-chicken.jpg" },
  { name: "Kebab & Döner", image: "/assets/food/doner.jpg" },
  { name: "Curries", image: "/assets/food/butter-chicken.jpg" },
  { name: "Breakfast", image: "/assets/food/full-english.jpg" },
  { name: "Grill", image: "/assets/food/shish.jpg" },
  { name: "Burgers", image: "/assets/food/burger.jpg" },
  { name: "Drinks", image: "/assets/food/mojito.jpg" },
];

export function QuickCategories() {
  return (
    <section className="bg-[#0A1806] py-10 lg:py-12">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-8 lg:overflow-visible">
          {QUICK_CATEGORIES.map((c, i) => (
            <motion.a
              key={c.name}
              href="#our-menu"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="group flex w-[92px] flex-none snap-start flex-col items-center gap-2.5 text-center lg:w-auto"
            >
              <span className="relative block h-[84px] w-[84px] overflow-hidden rounded-full ring-2 ring-[#F7C318]/30 ring-offset-4 ring-offset-[#0A1806] transition-all duration-300 group-hover:ring-[#E1262D] lg:h-[104px] lg:w-[104px]">
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="104px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </span>
              <span className="text-[13px] font-bold text-white/85 transition-colors group-hover:text-[#F7C318]">
                {c.name}
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Today's Special — rotates by day of week (London time)              */
/* ------------------------------------------------------------------ */
const DAILY_SPECIALS = [
  { day: "Sunday", name: "Nawabi Morog Polao", price: "8.99", image: "/assets/food/polao.jpg", text: "Royal Bangladeshi chicken polao, rich with ghee and whole spices." },
  { day: "Monday", name: "Chicken Karahi", price: "7.99", image: "/assets/food/karahi.jpg", text: "Lahori-style karahi cooked fresh in the wok. Served with rice or naan and salad." },
  { day: "Tuesday", name: "Mega Kebab Box", price: "9.99", image: "/assets/food/doner.jpg", text: "Loaded döner, kebab and fries with our signature sauces." },
  { day: "Wednesday", name: "Peri Rice Chicken Bowl", price: "8.99", image: "/assets/food/salad-bowl.jpg", text: "Spicy rice, flame-grilled peri chicken, fresh salad and sauces." },
  { day: "Thursday", name: "Lamb Chops (4 pcs)", price: "9.99", image: "/assets/food/lamb-grill.jpg", text: "Char-grilled, marinated lamb chops with classic fries and salad." },
  { day: "Friday", name: "Sultan's Kacchi Biryani", price: "8.99", image: "/assets/food/kacchi.jpg", text: "Our legendary weekend biryani, available Friday and Saturday only." },
  { day: "Saturday", name: "Sultan's Kacchi Biryani", price: "8.99", image: "/assets/food/kacchi.jpg", text: "Our legendary weekend biryani, available Friday and Saturday only." },
];

function londonDayIndex() {
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long" }).format(new Date());
  return Math.max(0, DAILY_SPECIALS.findIndex((d) => d.day === day));
}

export function TodaysSpecial() {
  const [idx, setIdx] = useState(null);
  useEffect(() => setIdx(londonDayIndex()), []);
  const s = DAILY_SPECIALS[idx ?? 5];

  return (
    <section className="bg-[#0A1806] pb-14 lg:pb-16">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="relative grid overflow-hidden rounded-[28px] border border-[#F7C318]/20 bg-gradient-to-br from-[#183310] to-[#0F2109] lg:grid-cols-2"
        >
          <div className="sfg-dots absolute inset-0 opacity-50" />
          <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E1262D] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white">
              <Clock size={13} /> Today&apos;s Special · {s.day}
            </span>
            <h3 className="font-display mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">{s.name}</h3>
            <p className="mt-3 max-w-md text-white/70">{s.text}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="font-display text-4xl font-black text-[#F7C318]">£{s.price}</span>
              <Link
                href="/shop"
                className="group flex h-12 items-center gap-2 rounded-full bg-[#F7C318] px-6 text-sm font-extrabold text-[#0A1806] transition-all hover:-translate-y-0.5"
              >
                Order Today&apos;s Special
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
          <div className="relative min-h-[260px] lg:min-h-[380px]">
            <Image
              src={s.image}
              alt={s.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#183310] via-transparent to-transparent max-lg:bg-gradient-to-b" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Offers & Discounts                                                  */
/* ------------------------------------------------------------------ */
const OFFERS = [
  {
    tag: "Meal Deal",
    title: "Burger Meal Upgrade",
    text: "Add fries and a soft drink to any smash burger.",
    value: "+£1.99",
    image: "/assets/food/burger-fries.jpg",
    tone: "from-[#E1262D] to-[#9E141A]",
  },
  {
    tag: "Family Feast",
    title: "Grill Platter for 4",
    text: "Lamb chops, wings, tikka and seekh kebabs, enough for the whole family.",
    value: "£35.99",
    image: "/assets/food/tikka-platter.jpg",
    tone: "from-[#4A8A22] to-[#1F420C]",
  },
  {
    tag: "Breakfast Combo",
    title: "Desi Breakfast Thali",
    text: "2 paratha, bhuna, egg omelette and deshi chai to start your day right.",
    value: "£7.99",
    image: "/assets/food/curries.jpg",
    tone: "from-[#F2A900] to-[#C27C00]",
  },
];

export function OffersSection() {
  return (
    <section id="offers" className="scroll-mt-28 bg-[#0F2109] py-14 lg:py-16">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <SectionHeading
          eyebrow="Save more"
          title="Offers &"
          accent="Discounts"
          text="Great food at great prices, every day of the week."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {OFFERS.map((o, i) => (
            <motion.div
              key={o.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className={`group relative flex min-h-[230px] overflow-hidden rounded-3xl bg-gradient-to-br ${o.tone} p-6 shadow-xl`}
            >
              <div className="relative z-10 flex max-w-[58%] flex-col">
                <span className="flex w-fit items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  <BadgePercent size={13} /> {o.tag}
                </span>
                <h3 className="font-display mt-3 text-2xl font-black leading-tight text-white">{o.title}</h3>
                <p className="mt-2 text-sm text-white/80">{o.text}</p>
                <span className="font-display mt-auto pt-4 text-3xl font-black text-white">{o.value}</span>
              </div>
              <div className="absolute -right-10 top-1/2 h-[230px] w-[230px] -translate-y-1/2 overflow-hidden rounded-full border-[6px] border-white/20 shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
                <Image src={o.image} alt={o.title} fill sizes="230px" className="object-cover" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Customer Reviews                                                    */
/* ------------------------------------------------------------------ */
// Placeholder testimonials for the demo — replace with real Google
// reviews (or wire to a reviews collection) before launch.
const REVIEWS = [
  { name: "Customer review", text: "The kacchi biryani on Friday is unreal. Proper taste of home, generous portions and always hot.", dish: "Sultan's Kacchi Biryani" },
  { name: "Customer review", text: "Best Full English in Forest Gate, and it's all halal! Quick service and very friendly staff.", dish: "Big English Breakfast" },
  { name: "Customer review", text: "Peri peri chicken was juicy with a great char. The salted fries are addictive. Will order again.", dish: "Half Peri Peri Chicken" },
  { name: "Customer review", text: "Karak chai and a Dhaka breakfast platter is my weekend ritual now. Fair prices too.", dish: "Dhaka Breakfast Platter" },
];

export function ReviewsSection() {
  return (
    <section className="relative overflow-hidden bg-[#0A1806] py-14 lg:py-16">
      <div className="sfg-dots absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8">
        <SectionHeading eyebrow="Happy customers" title="What People" accent="Say" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REVIEWS.map((r, i) => (
            <motion.figure
              key={r.dish}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-colors hover:border-[#F7C318]/40"
            >
              <Quote className="h-8 w-8 text-[#E1262D]" />
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} size={15} className="fill-[#F7C318] text-[#F7C318]" />
                ))}
              </div>
              <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-white/80">“{r.text}”</blockquote>
              <figcaption className="mt-5 border-t border-white/10 pt-4 text-sm">
                <span className="font-bold text-white">{r.name}</span>
                <span className="block text-xs text-[#F7C318]">Ordered: {r.dish}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Delivery, collection, opening hours & map                           */
/* ------------------------------------------------------------------ */
const DELIVERY_AREAS = [
  { code: "E7", area: "Forest Gate", fee: "£1.99", eta: "20–30 min" },
  { code: "E12", area: "Manor Park", fee: "£2.49", eta: "25–35 min" },
  { code: "E6", area: "East Ham", fee: "£2.49", eta: "25–35 min" },
  { code: "E13", area: "Plaistow", fee: "£2.99", eta: "30–40 min" },
  { code: "E15", area: "Stratford", fee: "£2.99", eta: "30–40 min" },
  { code: "E11", area: "Leytonstone", fee: "£3.49", eta: "35–45 min" },
];

const POSTCODE_RE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}$|^([A-Z]{1,2}\d[A-Z\d]?)$/;

function PostcodeChecker() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);

  const check = (e) => {
    e.preventDefault();
    const pc = value.trim().toUpperCase();
    const m = pc.match(POSTCODE_RE);
    if (!m) return setResult({ ok: false, msg: "Please enter a valid UK postcode, e.g. E7 9BB" });
    const outward = m[1] || m[2];
    const area = DELIVERY_AREAS.find((a) => a.code === outward);
    setResult(
      area
        ? { ok: true, msg: `Great news! We deliver to ${area.area} (${area.code}). Delivery ${area.fee}, about ${area.eta}.` }
        : { ok: false, msg: `Sorry, ${outward} is outside our delivery area. You can still order for collection.` },
    );
  };

  return (
    <form onSubmit={check} className="mt-5">
      <label htmlFor="sfg-postcode" className="text-sm font-bold text-white">
        Check if we deliver to you
      </label>
      <div className="mt-2 flex overflow-hidden rounded-full border border-white/15 bg-white/5 focus-within:border-[#F7C318]">
        <input
          id="sfg-postcode"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter postcode, e.g. E7 9BB"
          className="h-12 min-w-0 flex-1 bg-transparent px-5 text-sm text-white uppercase placeholder:normal-case placeholder:text-white/40 focus:outline-none"
          autoComplete="postal-code"
        />
        <button className="m-1 rounded-full bg-[#E1262D] px-5 text-sm font-extrabold text-white transition-colors hover:bg-[#C41D23]">
          Check
        </button>
      </div>
      {result && (
        <p className={`mt-3 flex items-start gap-2 text-sm ${result.ok ? "text-[#9BE07A]" : "text-[#FFB4B6]"}`}>
          {result.ok ? <CheckCircle2 size={17} className="mt-px flex-none" /> : <XCircle size={17} className="mt-px flex-none" />}
          {result.msg}
        </p>
      )}
    </form>
  );
}

function OpenStatus() {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const tick = () => {
      const h = Number(
        new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" }).format(new Date()),
      );
      setOpen(h >= 8);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  if (open === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
        open ? "bg-[#4A8A22]/25 text-[#9BE07A]" : "bg-[#E1262D]/20 text-[#FFB4B6]"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${open ? "animate-pulse bg-[#5BE36B]" : "bg-[#E1262D]"}`} />
      {open ? "Open now · until 12AM" : "Closed · opens 8AM"}
    </span>
  );
}

export function DeliveryVisit() {
  return (
    <section id="delivery" className="scroll-mt-28 bg-[#0F2109] py-14 lg:py-16">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <SectionHeading
          eyebrow="Hot & fresh to your door"
          title="Delivery &"
          accent="Collection"
          text="Order online for delivery across East London, or skip the queue and collect from our Forest Lane kitchen."
        />

        <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
          {/* Left: service + areas */}
          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl bg-[#E1262D] p-6 text-white">
                <Bike size={30} />
                <h3 className="font-display mt-3 text-2xl font-black">Delivery</h3>
                <p className="mt-1 text-sm text-white/85">Usually 25–40 min · Minimum order £12</p>
              </div>
              <div className="rounded-3xl bg-[#F7C318] p-6 text-[#0A1806]">
                <ShoppingBag size={30} />
                <h3 className="font-display mt-3 text-2xl font-black">Collection</h3>
                <p className="mt-1 text-sm font-medium text-[#0A1806]/75">Ready in about 15 min · No minimum</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-lg font-black text-white">Delivery areas</h3>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {DELIVERY_AREAS.map((a) => (
                  <div key={a.code} className="rounded-2xl border border-white/10 bg-[#0A1806]/60 px-3.5 py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-xl font-black text-[#F7C318]">{a.code}</span>
                      <span className="text-xs font-bold text-white">{a.fee}</span>
                    </div>
                    <p className="text-xs text-white/60">{a.area} · {a.eta}</p>
                  </div>
                ))}
              </div>
              <PostcodeChecker />
            </div>
          </div>

          {/* Right: visit card + map */}
          <div id="contact" className="scroll-mt-28 flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-2xl font-black text-white">Visit Us</h3>
                <OpenStatus />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-2">
                <p className="flex gap-2.5">
                  <MapPin size={18} className="flex-none text-[#E1262D]" />
                  179 Forest Ln, London E7 9BB
                </p>
                <a href="tel:+442039956692" className="flex gap-2.5 font-bold text-white hover:text-[#F7C318]">
                  <Phone size={18} className="flex-none text-[#E1262D]" />
                  020 3995 6692
                </a>
                <p className="flex gap-2.5 sm:col-span-2">
                  <Clock size={18} className="flex-none text-[#E1262D]" />
                  Monday – Sunday · 8:00AM – 12:00AM (midnight)
                </p>
              </div>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=179+Forest+Ln,+London+E7+9BB"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-[#0A1806] transition-all hover:-translate-y-0.5"
              >
                Get Directions <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>
            <iframe
              title="Map of Shawon Food Gate, 179 Forest Ln, London E7 9BB"
              src="https://www.google.com/maps?q=179+Forest+Ln,+London+E7+9BB&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="min-h-[300px] w-full flex-1 border-0 grayscale-[30%]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
