"use client";

import Image from "next/image";
import {
  FaInstagram,
  FaTiktok,
  FaThreads,
  FaArrowRight,
  FaGooglePlay,
  FaApple,
} from "react-icons/fa6";

export default function FooterPromo() {
  const gallery = [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=500&q=80",
  ];

  return (
    <section className="w-full bg-black text-white px-3 py-6 sm:px-3 lg:px-8">
      <div className="mx-auto max-w-[1450px] overflow-hidden rounded-none border border-zinc-800 bg-[#0F2109]">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* LEFT: Newsletter */}
          <div className="relative overflow-hidden border-b border-zinc-800 p-6 sm:p-8 lg:border-b-0 lg:border-r  flex flex-col justify-between">
            <div className="relative z-10 max-w-md">
              <h2 className="text-2xl sm:text-3xl lg:text-[44px] font-black uppercase leading-[1.05]">
                Get 20% Off
                <br />
                Your First Order!
              </h2>

              <p className="mt-3 sm:mt-4 text-xs sm:text-[15px] leading-relaxed text-zinc-400">
                Sign up for early access, exclusive offers and opening day
                treats.
              </p>
              <div className="mt-6 flex w-full">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 h-14 rounded-none border border-r-0 border-zinc-700 bg-transparent px-5 text-base text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
                />

                <button className="w-16 h-14 rounded-none bg-orange-500 hover:bg-orange-600 transition flex items-center justify-center">
                  <FaArrowRight className="text-xl text-white" />
                </button>
              </div>

              <p className="mt-3 sm:mt-4 text-xs text-zinc-500">
                We respect your privacy.
              </p>
            </div>

          </div>

          {/* CENTER: Gallery & Socials */}
          <div className="border-b border-zinc-800 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase">
              Follow Our Journey
            </h3>

            <p className="mt-1 text-xs sm:text-sm text-orange-500 font-medium">
              @smashcoin
            </p>

            {/* GALLERY GRID: Adaptive layout for mobile screens */}
            <div className="mt-5 sm:mt-7 grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {gallery.map((img, index) => (
                <div
                  key={index}
                  className="group relative aspect-square overflow-hidden rounded-none bg-zinc-900"
                >
                  <Image
                    src={img}
                    alt={`gallery-${index}`}
                    fill
                    sizes="(max-width: 768px) 33vw, 20vw"
                    className="object-cover transition duration-500 group-hover:scale-110"
                  />
                </div>
              ))}
            </div>

            {/* SOCIAL ICONS */}
            <div className="mt-5 sm:mt-7 flex items-center gap-4 sm:gap-5">
              <a
                href="#"
                aria-label="TikTok"
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-none border border-zinc-700 text-lg sm:text-xl transition hover:border-orange-500 hover:text-orange-500"
              >
                <FaTiktok />
              </a>

              <a
                href="#"
                aria-label="Instagram"
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-none border border-zinc-700 text-lg sm:text-xl transition hover:border-orange-500 hover:text-orange-500"
              >
                <FaInstagram />
              </a>

              <a
                href="#"
                aria-label="Threads"
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-none border border-zinc-700 text-lg sm:text-xl transition hover:border-orange-500 hover:text-orange-500"
              >
                <FaThreads />
              </a>
            </div>
          </div>

          {/* RIGHT: App Download */}
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-tight">
              Download Our App
            </h3>

            <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-zinc-400">
              Coming Soon
            </p>

            {/* STORE BUTTONS */}
            <div className="mt-6 sm:mt-8 flex flex-col gap-3.5 sm:gap-4">
              <button className="flex items-center gap-4 rounded-none border border-zinc-700 px-4 sm:px-5 py-3.5 sm:py-4 transition hover:border-orange-500 hover:bg-zinc-900">
                <FaGooglePlay className="text-2xl sm:text-3xl flex-shrink-0" />

                <div className="text-left">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-zinc-400">
                    Get it on
                  </p>
                  <h4 className="text-base sm:text-lg font-semibold">
                    Google Play
                  </h4>
                </div>
              </button>

              <button className="flex items-center gap-4 rounded-none border border-zinc-700 px-4 sm:px-5 py-3.5 sm:py-4 transition hover:border-orange-500 hover:bg-zinc-900">
                <FaApple className="text-2xl sm:text-3xl flex-shrink-0" />

                <div className="text-left">
                  <p className="text-[10px] sm:text-[11px] text-zinc-400">
                    Download on the
                  </p>
                  <h4 className="text-base sm:text-lg font-semibold">
                    App Store
                  </h4>
                </div>
              </button>
            </div>

            <p className="mt-5 sm:mt-6 text-xs sm:text-sm text-zinc-500">
              Be the first to know!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
