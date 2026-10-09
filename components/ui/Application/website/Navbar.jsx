"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  User,
  LogOutIcon,
  Phone,
  Clock,
  MapPin,
  Truck,
  ShoppingBag,
  ArrowRight,
  PackageSearch,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";

import {
  USER_DASHBOARD,
  USER_TRACK_ORDER,
  WEBSITE_HOME,
  WEBSITE_LOGIN,
  WEBSITE_REGISTER,
  WEBSITE_SHOP,
} from "@/Route/Websiteroute";

import Cart from "./cart";
import SfgLogo from "./SfgLogo";
import { Avatar, AvatarImage } from "../../avatar";
import { showToast } from "@/lib/showToast";
import { logout } from "@/store/reducer/authReducer";

export const SFG_PHONE = "020 3995 6692";
export const SFG_PHONE_HREF = "tel:+442039956692";

const NAV_LINKS = [
  { label: "Home", href: WEBSITE_HOME },
  { label: "Menu", href: WEBSITE_SHOP },
  { label: "Demo 2", href: "/demo-2" },
  { label: "Delivery", href: "/#delivery", wide: true },
  { label: "Collection", href: "/#delivery", wide: true },
  { label: "Track Order", href: USER_TRACK_ORDER },
  { label: "Contact", href: "/#contact" },
];

const MOBILE_LINK_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
};

const MOBILE_LINK_ITEM = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

function NavItem({ href, label, wide }) {
  const pathname = usePathname();
  const isActive = !href.includes("#") && pathname === href;

  return (
    <Link
      href={href}
      className={`group relative whitespace-nowrap py-2 text-[13.5px] font-semibold tracking-wide transition-colors duration-200 ${
        wide ? "hidden 2xl:inline-block" : "inline-block"
      } ${isActive ? "text-[#F7C318]" : "text-white/90 hover:text-[#F7C318]"}`}
    >
      {label}
      {isActive ? (
        <motion.span
          layoutId="nav-underline"
          className="absolute left-0 -bottom-0.5 h-[2.5px] w-full rounded-full bg-[#E1262D]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      ) : (
        <span className="absolute left-0 -bottom-0.5 h-[2.5px] w-full origin-left scale-x-0 rounded-full bg-[#E1262D] transition-transform duration-300 group-hover:scale-x-100" />
      )}
    </Link>
  );
}

function TopBar() {
  return (
    <div className="relative z-[51] bg-[#E1262D] text-white">
      <div className="mx-auto flex h-9 max-w-[1400px] items-center justify-between gap-4 px-4 text-[12px] font-semibold lg:px-8">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-[#F7C318]" />
            <span className="hidden sm:inline">Open 7 days ·</span> 8AM – 12AM
          </span>
          <span className="hidden md:flex items-center gap-1.5">
            <span className="rounded bg-white/15 px-1.5 py-px font-black text-[#F7C318]" lang="ar">
              حلال
            </span>
            100% Halal
          </span>
          <span className="hidden lg:flex items-center gap-1.5">
            <MapPin size={13} className="text-[#F7C318]" />
            179 Forest Ln, London E7 9BB
          </span>
        </div>
        <div className="flex items-center gap-5">
          <span className="hidden sm:flex items-center gap-1.5">
            <Truck size={14} className="text-[#F7C318]" />
            Delivery &amp; Collection
          </span>
          <a
            href={SFG_PHONE_HREF}
            className="flex items-center gap-1.5 font-bold transition-colors hover:text-[#F7C318]"
          >
            <Phone size={13} className="text-[#F7C318]" />
            {SFG_PHONE}
          </a>
        </div>
      </div>
    </div>
  );
}

const Navbar = () => {
  const [openMenu, setOpenMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const auth = useSelector((store) => store.authStore.auth);
  // auth is the login response ({ data: { user } }) or, after a profile
  // update, the user itself — read the photo from either shape
  const avatarUrl =
    auth?.avatar?.url ||
    auth?.data?.user?.avatar?.url ||
    auth?.user?.avatar?.url ||
    "";

  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      const { data } = await axios.post("/api/auth/logout");

      if (!data.success) throw new Error(data.message);

      dispatch(logout());
      showToast("success", data.message);
      setOpenMenu(false);

      router.push(WEBSITE_LOGIN);
    } catch (error) {
      showToast("error", error.message);
    }
  };

  return (
    <>
      <TopBar />
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-[#F7C318]/15 bg-[#0A1806]/85 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "border-b border-white/5 bg-[#0A1806]"
        }`}
      >
        {/* thin brand stripe — red / gold / green like the flyer */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#E1262D_0%,#E1262D_33%,#F7C318_33%,#F7C318_66%,#4A8A22_66%)] opacity-80" />

        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <div
            className={`flex items-center justify-between gap-3 transition-all duration-300 ${
              scrolled ? "h-[64px]" : "h-[72px] lg:h-[80px]"
            }`}
          >
            {/* LEFT: Mobile Menu Button & Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C318]/60"
                onClick={() => setOpenMenu(true)}
                aria-label="Open menu"
              >
                <Menu size={24} />
              </button>

              <Link href={WEBSITE_HOME} aria-label="Shawon Food Gate home">
                <SfgLogo compact={scrolled} />
              </Link>
            </div>

            {/* CENTER MENU (Desktop) */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
              {NAV_LINKS.map((item) => (
                <NavItem key={item.label} {...item} />
              ))}
            </nav>

            {/* RIGHT: Account, Cart */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {!auth ? (
                <Link
                  href={WEBSITE_LOGIN}
                  className="flex h-11 items-center gap-2 rounded-full px-2.5 text-sm font-semibold text-white/90 transition-colors hover:text-[#F7C318] 2xl:border 2xl:border-white/15 2xl:px-4 2xl:hover:border-[#F7C318]/60"
                  aria-label="Login or sign up"
                >
                  <User strokeWidth={2.3} className="h-[21px] w-[21px]" />
                  <span className="hidden 2xl:inline">Login / Sign Up</span>
                </Link>
              ) : avatarUrl ? (
                <Link href={USER_DASHBOARD} className="flex h-11 w-11 items-center justify-center">
                  <Avatar className="h-9 w-9 border-2 border-[#F7C318]/60 transition-colors duration-200 hover:border-[#F7C318]">
                    <AvatarImage src={avatarUrl} alt={auth?.name || "User Avatar"} />
                  </Avatar>
                </Link>
              ) : (
                <Link
                  href={USER_DASHBOARD}
                  aria-label={auth?.name || "My account"}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors duration-200 hover:text-[#F7C318]"
                >
                  <User strokeWidth={2.3} className="h-[21px] w-[21px]" />
                </Link>
              )}

              <Cart />
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR MENU */}
      <AnimatePresence>
        {openMenu && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpenMenu(false)}
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="sfg-dots absolute left-0 top-0 flex h-full w-[300px] sm:w-[340px] flex-col overflow-y-auto border-r border-[#F7C318]/15 bg-[#0A1806] text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <SfgLogo compact />
                <button
                  onClick={() => setOpenMenu(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[#E1262D]"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Delivery / Collection quick choice */}
              <div className="grid grid-cols-2 gap-2 p-4">
                <Link
                  href="/#delivery"
                  onClick={() => setOpenMenu(false)}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-[#E1262D] py-3 text-xs font-bold"
                >
                  <Truck size={20} /> Delivery
                </Link>
                <Link
                  href="/#delivery"
                  onClick={() => setOpenMenu(false)}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-[#F7C318]/40 py-3 text-xs font-bold text-[#F7C318]"
                >
                  <ShoppingBag size={20} /> Collection
                </Link>
              </div>

              <motion.nav
                variants={MOBILE_LINK_VARIANTS}
                initial="hidden"
                animate="visible"
                className="flex flex-col px-2"
              >
                {NAV_LINKS.filter((l) => !l.wide).map((item) => (
                  <motion.div key={item.label} variants={MOBILE_LINK_ITEM}>
                    <Link
                      href={item.href}
                      onClick={() => setOpenMenu(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors hover:bg-white/5 hover:text-[#F7C318]"
                    >
                      {item.label}
                      <ArrowRight size={15} className="text-white/30" />
                    </Link>
                  </motion.div>
                ))}
              </motion.nav>

              <motion.div
                variants={MOBILE_LINK_VARIANTS}
                initial="hidden"
                animate="visible"
                className="mt-2 flex flex-col gap-1 border-t border-white/10 px-2 py-4 text-[15px]"
              >
                {!auth ? (
                  <>
                    <motion.div variants={MOBILE_LINK_ITEM}>
                      <Link
                        href={WEBSITE_LOGIN}
                        onClick={() => setOpenMenu(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-white/5 hover:text-[#F7C318]"
                      >
                        <User size={18} /> Sign In
                      </Link>
                    </motion.div>
                    <motion.div variants={MOBILE_LINK_ITEM}>
                      <Link
                        href={WEBSITE_REGISTER}
                        onClick={() => setOpenMenu(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-white/5 hover:text-[#F7C318]"
                      >
                        <User size={18} /> Create Account
                      </Link>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div variants={MOBILE_LINK_ITEM}>
                      <Link
                        href={USER_DASHBOARD}
                        onClick={() => setOpenMenu(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-white/5 hover:text-[#F7C318]"
                      >
                        <User size={18} /> My Account
                      </Link>
                    </motion.div>
                    <motion.div variants={MOBILE_LINK_ITEM}>
                      <Link
                        href={USER_TRACK_ORDER}
                        onClick={() => setOpenMenu(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-white/5 hover:text-[#F7C318]"
                      >
                        <PackageSearch size={18} /> Track My Order
                      </Link>
                    </motion.div>
                    <motion.button
                      variants={MOBILE_LINK_ITEM}
                      onClick={handleLogout}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold text-red-400 hover:bg-white/5"
                    >
                      <LogOutIcon size={18} /> Logout
                    </motion.button>
                  </>
                )}
              </motion.div>

              <div className="mt-auto space-y-2 border-t border-white/10 p-4 text-sm text-white/70">
                <a href={SFG_PHONE_HREF} className="flex items-center gap-2 font-bold text-white">
                  <Phone size={15} className="text-[#E1262D]" /> {SFG_PHONE}
                </a>
                <p className="flex items-center gap-2">
                  <Clock size={15} className="text-[#F7C318]" /> Open 7 days · 8AM – 12AM
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
