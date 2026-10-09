"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock, MapPin, Menu, Phone, Truck, User, X } from "lucide-react";
import { useSelector } from "react-redux";

import Cart from "../cart";
import { SfgEmblem } from "../SfgLogo";
import { USER_DASHBOARD, USER_TRACK_ORDER, WEBSITE_LOGIN } from "@/Route/Websiteroute";

// Light, flyer-style header for Demo 2 (white/cream, red + green + gold).
const LINKS = [
  { label: "Home", href: "/demo-2" },
  { label: "Menu", href: "/demo-2#menu" },
  { label: "Demo 1", href: "/", demo: true },
  { label: "Offers", href: "/demo-2#offers" },
  { label: "Delivery", href: "/demo-2#visit", wide: true },
  { label: "Track Order", href: USER_TRACK_ORDER },
  { label: "Contact", href: "/demo-2#visit", wide: true },
];

export function Demo2Logo({ small = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <SfgEmblem className={small ? "h-11 w-11" : "h-12 w-12 lg:h-14 lg:w-14"} />
      <span className="flex flex-col whitespace-nowrap leading-none">
        <span className="font-d2-display text-[13px] tracking-[0.28em] text-[#D49B00]">SHAWON</span>
        <span className="font-d2-display text-[22px] lg:text-[26px] text-[#E1262D]">Food Gate</span>
      </span>
    </span>
  );
}

export default function Demo2Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const auth = useSelector((s) => s.authStore.auth);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* green info strip */}
      <div className="bg-[#2F6B16] text-white">
        <div className="mx-auto flex h-9 max-w-[1320px] items-center justify-between gap-4 px-4 text-[12px] font-medium lg:px-8">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-[#F7C318]" /> 7 Days · 8AM – 12AM
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <MapPin size={13} className="text-[#F7C318]" /> 179 Forest Ln, London E7 9BB
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden sm:flex items-center gap-1.5">
              <Truck size={14} className="text-[#F7C318]" /> Delivery &amp; Collection
            </span>
            <a href="tel:+442039956692" className="flex items-center gap-1.5 font-bold hover:text-[#F7C318]">
              <Phone size={13} className="text-[#F7C318]" /> 020 3995 6692
            </a>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/90 shadow-[0_8px_30px_-12px_rgba(47,107,22,0.35)] backdrop-blur-xl" : "bg-[#FFFBF2]"
        }`}
      >
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-4 lg:px-8"
          style={{ height: scrolled ? 66 : 80, transition: "height .3s" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-[#2F6B16] hover:bg-[#2F6B16]/10 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <Link href="/demo-2" aria-label="Shawon Food Gate home">
              <Demo2Logo small={scrolled} />
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {LINKS.map((l) =>
              l.demo ? (
                <Link
                  key={l.label}
                  href={l.href}
                  className="mx-1 whitespace-nowrap rounded-full border border-dashed border-[#2F6B16]/50 px-3 py-1.5 text-[13px] font-semibold text-[#2F6B16] transition-colors hover:bg-[#2F6B16] hover:text-white"
                >
                  {l.label}
                </Link>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  className={`${l.wide ? "hidden 2xl:inline-block" : ""} whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-semibold text-[#23361A] transition-colors hover:bg-[#E1262D]/10 hover:text-[#E1262D]`}
                >
                  {l.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={auth ? USER_DASHBOARD : WEBSITE_LOGIN}
              aria-label={auth ? "My account" : "Login or sign up"}
              className="flex h-11 items-center gap-2 rounded-full px-2.5 text-sm font-semibold text-[#23361A] hover:text-[#E1262D] 2xl:border 2xl:border-[#23361A]/15 2xl:px-4"
            >
              <User size={20} />
              <span className="hidden 2xl:inline">{auth ? "My Account" : "Login / Sign Up"}</span>
            </Link>
            <Cart />
          </div>
        </div>
        <div className="h-[3px] bg-[linear-gradient(90deg,#E1262D_0_33%,#F7C318_33%_66%,#2F6B16_66%)]" />
      </header>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute left-0 top-0 flex h-full w-[300px] flex-col bg-[#FFFBF2] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#23361A]/10 p-4">
                <Demo2Logo small />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1262D] text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col p-2">
                {LINKS.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-semibold ${
                      l.demo ? "text-[#2F6B16]" : "text-[#23361A] hover:bg-[#E1262D]/10 hover:text-[#E1262D]"
                    }`}
                  >
                    {l.label}
                    <ArrowRight size={15} className="opacity-30" />
                  </Link>
                ))}
              </nav>
              <div className="mt-auto border-t border-[#23361A]/10 p-4 text-sm text-[#23361A]/70">
                <a href="tel:+442039956692" className="flex items-center gap-2 font-bold text-[#23361A]">
                  <Phone size={15} className="text-[#E1262D]" /> 020 3995 6692
                </a>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
