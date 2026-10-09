"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, ArrowRight } from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok } from "react-icons/fa6";
import { motion } from "framer-motion";

import { usePathname } from "next/navigation";
import SfgLogo from "./SfgLogo";
import Demo2Footer from "./demo2/Demo2Footer";
import { USER_TRACK_ORDER, WEBSITE_SHOP, WEBSITE_TERMS_AND_CONDITION } from "@/Route/Websiteroute";

const FOOTER_GRID_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function formatTime12h(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Collapses the 7 per-day entries into contiguous ranges that share the
// same hours (e.g. "Mon – Fri: 12:00 PM – 11:00 PM", "Sat – Sun: ...")
// instead of always assuming every day is identical.
function groupOpeningHours(openingHours) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return [];

  const byDay = Object.fromEntries(openingHours.map((h) => [h.day, h]));
  const ordered = DAY_ORDER.map((d) => byDay[d]).filter(Boolean);
  if (ordered.length === 0) return [];

  const groups = [];
  for (const day of ordered) {
    const key = day.closed ? "closed" : `${day.open}-${day.close}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.days.push(day.day);
    } else {
      groups.push({ key, days: [day.day], closed: day.closed, open: day.open, close: day.close });
    }
  }

  return groups.map((g) => ({
    label:
      g.days.length > 1
        ? `${DAY_LABELS[g.days[0]]} – ${DAY_LABELS[g.days[g.days.length - 1]]}`
        : DAY_LABELS[g.days[0]],
    hours: g.closed ? "Closed" : `${formatTime12h(g.open)} – ${formatTime12h(g.close)}`,
  }));
}

const QUICK_LINKS = [
  { label: "Our Menu", href: "/#our-menu" },
  { label: "Order Online", href: WEBSITE_SHOP },
  { label: "Delivery & Collection", href: "/#delivery" },
  { label: "Offers", href: "/#offers" },
  { label: "Track Your Order", href: USER_TRACK_ORDER },
];

// Social profile URLs — fill in the restaurant's real pages.
const SOCIALS = [
  { label: "Facebook", href: "#", icon: FaFacebookF },
  { label: "Instagram", href: "#", icon: FaInstagram },
  { label: "LinkedIn", href: "#", icon: FaLinkedinIn },
  { label: "TikTok", href: "#", icon: FaTiktok },
];

export default function Footer() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios
      .get("/api/settings/public")
      .then(({ data }) => data?.success && setSettings(data.data))
      .catch(() => {}); // falls back to the defaults below
  }, []);

  const phone = settings?.phone || "020 3995 6692";
  const email = settings?.email || "";
  const address = settings?.address || "179 Forest Ln, London E7 9BB";
  const hourGroups = groupOpeningHours(settings?.openingHours);
  const pathname = usePathname();

  if (pathname?.startsWith("/demo-2")) return <Demo2Footer />;

  return (
    <footer className="relative w-full overflow-hidden border-t-4 border-[#F7C318] bg-[#071204] text-white">
      <div className="sfg-dots pointer-events-none absolute inset-0 opacity-40" />

      {/* CTA band */}
      <div className="relative bg-[#E1262D]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:text-left lg:px-8">
          <div>
            <p className="font-display text-2xl font-black">Hungry? We&apos;re open till midnight.</p>
            <p className="text-sm text-white/85">Order online for delivery or collection, or give us a call.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={WEBSITE_SHOP}
              className="group flex h-12 items-center gap-2 rounded-full bg-[#F7C318] px-6 text-sm font-extrabold text-[#0A1806] transition-transform hover:-translate-y-0.5"
            >
              Order Online <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="flex h-12 items-center gap-2 rounded-full border-2 border-white/70 px-6 text-sm font-extrabold transition-colors hover:bg-white hover:text-[#E1262D]"
            >
              <Phone size={16} /> {phone}
            </a>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8">
        <motion.div
          variants={FOOTER_GRID_VARIANTS}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1.2fr]"
        >
          {/* Brand */}
          <div>
            <SfgLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Biryani · Döner Kebab · Curry · English Breakfast · Fresh Naan · Coffee · Karak Tea · Sandwich
            </p>
            <div className="mt-5 flex gap-2.5">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[#E1262D]"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#F7C318]">Explore</h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#F7C318]">Contact</h3>
            <ul className="space-y-3 text-sm text-white/75">
              <li className="flex gap-2.5">
                <MapPin size={17} className="mt-0.5 flex-none text-[#E1262D]" /> {address}
              </li>
              <li>
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex gap-2.5 font-semibold hover:text-white">
                  <Phone size={17} className="mt-0.5 flex-none text-[#E1262D]" /> {phone}
                </a>
              </li>
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="flex gap-2.5 hover:text-white">
                    <Mail size={17} className="mt-0.5 flex-none text-[#E1262D]" /> {email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#F7C318]">Opening Hours</h3>
            {hourGroups.length > 0 ? (
              <ul className="space-y-1.5 text-sm text-white/75">
                {hourGroups.map((g) => (
                  <li key={g.label} className="flex justify-between gap-4">
                    <span>{g.label}</span>
                    <span className="font-semibold text-white">{g.hours}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex gap-2.5 text-sm text-white/75">
                <Clock size={17} className="mt-0.5 flex-none text-[#E1262D]" />
                <div>
                  Monday – Sunday
                  <p className="font-display mt-1 text-2xl font-black text-white">8:00 AM – 12:00 AM</p>
                </div>
              </div>
            )}
            <p className="mt-4 inline-flex rounded-full bg-[#4A8A22]/25 px-3 py-1 text-xs font-bold text-[#9BE07A]">
              100% Halal Food
            </p>
          </div>
        </motion.div>

        {/* BOTTOM BAR */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 pb-[calc(1.25rem+4rem+env(safe-area-inset-bottom))] text-[13px] text-white/50 sm:flex-row lg:pb-5">
          <p>© {new Date().getFullYear()} Shawon Food Gate. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="py-2 transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href={WEBSITE_TERMS_AND_CONDITION} className="py-2 transition hover:text-white">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
