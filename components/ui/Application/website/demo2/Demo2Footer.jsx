"use client";

import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok } from "react-icons/fa6";
import { Demo2Logo } from "./Demo2Navbar";
import { USER_TRACK_ORDER } from "@/Route/Websiteroute";

export default function Demo2Footer() {
  return (
    <footer className="font-d2-body relative overflow-hidden bg-[#245511] text-white">
      <div className="h-[5px] bg-[linear-gradient(90deg,#E1262D_0_33%,#F7C318_33%_66%,#FFFBF2_66%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1.5px,transparent_1.6px)] [background-size:22px_22px]" />
      <div className="relative mx-auto grid max-w-[1320px] gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="inline-block rounded-2xl bg-[#FFFBF2] px-3 py-2">
            <Demo2Logo small />
          </div>
          <p className="mt-4 text-sm text-white/75">
            Biryani · Döner Kebab · Curry · English Breakfast · Fresh Naan · Coffee · Karak Tea · Sandwich
          </p>
          <div className="mt-4 flex gap-2">
            {[FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok].map((Icon, i) => (
              <a key={i} href="#" aria-label="Social link" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-[#E1262D]">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[#F7C318]">Explore</h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link href="/demo-2#menu" className="hover:text-white">Our Menu</Link></li>
            <li><Link href="/demo-2#menu" className="hover:text-white">Order Online</Link></li>
            <li><Link href="/demo-2#offers" className="hover:text-white">Offers</Link></li>
            <li><Link href={USER_TRACK_ORDER} className="hover:text-white">Track Order</Link></li>
            <li><Link href="/" className="hover:text-white">View Demo 1</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[#F7C318]">Contact</h3>
          <p className="flex gap-2 text-sm text-white/85"><MapPin size={17} className="flex-none text-[#F7C318]" /> 179 Forest Ln, London E7 9BB</p>
          <a href="tel:+442039956692" className="mt-2 flex gap-2 text-sm font-bold"><Phone size={17} className="flex-none text-[#F7C318]" /> 020 3995 6692</a>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[#F7C318]">Opening Hours</h3>
          <p className="flex gap-2 text-sm text-white/85"><Clock size={17} className="flex-none text-[#F7C318]" /> Monday – Sunday</p>
          <p className="font-d2-display mt-1 text-2xl">8:00 AM – 12:00 AM</p>
          <span className="mt-3 inline-block rounded-full bg-[#E1262D] px-3 py-1 text-xs font-bold">100% Halal Food</span>
        </div>
      </div>
      <div className="relative border-t border-white/15 px-4 pt-4 pb-[calc(1rem+4rem+env(safe-area-inset-bottom))] text-center text-xs text-white/60 lg:pb-4">
        © {new Date().getFullYear()} Shawon Food Gate. All rights reserved.
      </div>
    </footer>
  );
}
