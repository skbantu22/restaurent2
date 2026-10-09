"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck, Flame, Wheat, Clock3 } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "100% Halal",
    description: "Every dish, from the grill to the breakfast plate, is fully halal.",
  },
  {
    icon: Flame,
    title: "Flame Grilled",
    description: "Peri peri, tikka and lamb chops char-grilled over open flame.",
  },
  {
    icon: Wheat,
    title: "Fresh Naan Daily",
    description: "Naan, paratha and roti baked fresh in our kitchen every day.",
  },
  {
    icon: Clock3,
    title: "8AM till Midnight",
    description: "Breakfast, lunch, dinner or a late karak, 7 days a week.",
  },
];

export default function WhyChooseUs() {
  return (
    <section id="our-story" className="scroll-mt-28 bg-[#0A1806] py-14 lg:py-16">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 lg:grid-cols-2 lg:gap-14 lg:px-8">
        {/* Photo collage */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="relative grid h-[420px] grid-cols-5 grid-rows-6 gap-3 sm:h-[500px]"
        >
          <div className="relative col-span-3 row-span-6 overflow-hidden rounded-3xl">
            <Image src="/assets/food/biryani.jpg" alt="Biryani" fill sizes="(max-width:1024px) 60vw, 30vw" className="object-cover" />
          </div>
          <div className="relative col-span-2 row-span-3 overflow-hidden rounded-3xl">
            <Image src="/assets/food/naan.jpg" alt="Fresh naan" fill sizes="25vw" className="object-cover" />
          </div>
          <div className="relative col-span-2 row-span-3 overflow-hidden rounded-3xl">
            <Image src="/assets/food/chai.jpg" alt="Karak chai" fill sizes="25vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-[#E1262D] px-5 py-3.5 text-white shadow-2xl sm:left-6">
            <span className="text-3xl font-black" lang="ar">حلال</span>
            <span className="text-xs font-black uppercase leading-tight tracking-wider">
              100% Halal
              <br />
              Certified meat
            </span>
          </div>
        </motion.div>

        {/* Copy */}
        <div>
          <p className="font-script text-2xl text-[#F7C318]">Welcome to the Gate</p>
          <h2 className="font-display mt-1 text-[34px] font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
            From <span className="text-[#E1262D]">Dhaka</span> to{" "}
            <span className="text-[#F7C318]">Forest Gate</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Shawon Food Gate brings Bangladeshi home cooking, Lahori curries, Turkish döner and a proper British
            breakfast together under one roof on Forest Lane. Start your day with a Sylheti Breakfast Thali and
            deshi chai, grab a peri rice bowl for lunch, or share a grill platter with the family. On Fridays and
            Saturdays, don&apos;t miss our slow-cooked Sultan&apos;s Kacchi Biryani.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[#F7C318]/40"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#F7C318] text-[#0A1806]">
                  <Icon size={21} strokeWidth={2.4} />
                </span>
                <span>
                  <span className="block font-bold text-white">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-white/60">{description}</span>
                </span>
              </motion.div>
            ))}
          </div>

          <div className="mt-7 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-center">
            {[
              ["130+", "Dishes & drinks"],
              ["7", "Days a week"],
              ["16", "Hours a day"],
            ].map(([n, l]) => (
              <div key={l}>
                <span className="font-display block text-3xl font-black text-[#F7C318]">{n}</span>
                <span className="text-xs text-white/60">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
