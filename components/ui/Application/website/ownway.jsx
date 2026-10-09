"use client";

import React from "react";
import Image from "next/image";
import { Utensils } from "lucide-react";
import { CUSTOM_MEAL_DISCOUNT_LABEL } from "@/lib/mealDeal";

// "Build It Your Way" banner — just the Own Meal card now (the Own Burger
// card was removed); its button jumps to the meal builder below.
const scrollToBuilder = () =>
  document
    .getElementById("Order-now2")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function BurgerBanner() {
  return (
    <section className="w-full bg-black px-4  md:px-6 lg:px-8">
      <div className="mx-auto max-w-8xl overflow-hidden  border border-zinc-800 bg-[#0F2109]">
        <div className="px-5 py-10 sm:px-8 lg:px-12 lg:py-8">
          {/* HEADER */}
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="hidden sm:block h-[2px] w-10 bg-[#C41D23]" />

              <h2 className=" text-white text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-none">
                Build It Your Way
              </h2>

              <span className="hidden sm:block h-[2px] w-10 bg-[#C41D23]" />
            </div>

            <p className="mx-auto max-w-2xl text-sm sm:text-base lg:text-lg text-gray-400">
              All burgers & loaded fries are{" "}
              <span className="font-semibold text-[#F7C318]">
                fully customisable
              </span>
            </p>
          </div>

          {/* OWN MEAL CARD */}
          <div className="mx-auto mt-8 flex max-w-5xl flex-col-reverse items-center gap-6 lg:mt-4 lg:flex-row lg:gap-12">
            {/* TEXT */}
            <div className="flex-1 text-center lg:text-left">
              <div className="mb-3 flex items-center justify-center gap-2 lg:justify-start text-[#C41D23]">
                <Utensils className="h-5 w-5" />

                <span className=" text-white text-xs font-bold uppercase tracking-[0.2em]">
                  Make It Your
                </span>
              </div>

              <h3 className=" text-white text-3xl sm:text-4xl lg:text-[44px] font-black uppercase leading-none">
                Own Meal
              </h3>

              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-400 sm:text-base lg:mx-0">
                Pick any burger, a side and a drink to build the ultimate combo
                meal and get{" "}
                <span className="font-semibold text-[#F7C318]">
                  {CUSTOM_MEAL_DISCOUNT_LABEL}
                </span>
                .
              </p>

              <button
                onClick={scrollToBuilder}
                className="mt-7 w-full rounded-sm bg-[#C41D23] px-7 py-4 text-sm font-black uppercase tracking-wider text-white transition-all duration-300 hover:bg-[#C41D23] sm:w-auto"
              >
                Build Your Meal
              </button>
            </div>

            {/* IMAGE */}
            <div className="relative h-[220px] w-[220px] sm:h-[280px] sm:w-[280px] lg:h-[360px] lg:w-[360px] flex-shrink-0">
              <Image
                src="/assets/snacks.png"
                alt="Meal Combo"
                fill
                sizes="(max-width: 640px) 220px, (max-width: 1024px) 280px, 360px"
                className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
