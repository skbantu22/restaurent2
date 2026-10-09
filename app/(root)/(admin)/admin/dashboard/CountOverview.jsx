"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { UtensilsCrossed, Wallet, ShoppingBag, ClipboardList } from "lucide-react";
import { ADMIN_PRODUCT_SHOW, ADMIN_ORDER_SHOW } from "@/Route/Adminpannelroute";
import Link from "next/link";

async function fetchCount() {
  const { data } = await axios.get("/api/dashboard/admin/count");
  if (!data?.success) throw new Error(data?.message || "Failed to load counts");
  return data.data;
}

async function fetchInsights() {
  const { data } = await axios.get("/api/dashboard/admin/insights");
  if (!data?.success) throw new Error(data?.message || "Failed to load insights");
  return data.data;
}

async function fetchCurrencySymbol() {
  const { data } = await axios.get("/api/settings/public");
  return data?.data?.currencySymbol || "£";
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function StatCard({ href, label, value, icon, gradient }) {
  const content = (
    <motion.div
      variants={item}
      className="flex items-center justify-between p-4 rounded-xl border shadow-sm bg-white dark:bg-card hover:shadow-md transition-shadow"
    >
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>

      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${gradient}`}>
        {icon}
      </div>
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function CountOverview() {
  const { data: countData } = useQuery({
    queryKey: ["dashboard-count"],
    queryFn: fetchCount,
  });

  const { data: insights } = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: fetchInsights,
  });

  const { data: currency = "£" } = useQuery({
    queryKey: ["settings-currency"],
    queryFn: fetchCurrencySymbol,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid lg:grid-cols-4 sm:grid-cols-2 gap-4"
    >
      <StatCard
        href={ADMIN_PRODUCT_SHOW}
        label="Total Menus"
        value={countData?.product ?? 0}
        icon={<UtensilsCrossed size={20} />}
        gradient="from-orange-400 to-orange-600"
      />

      <StatCard
        label="Revenue"
        value={`${currency}${Number(insights?.revenue || 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })}`}
        icon={<Wallet size={20} />}
        gradient="from-emerald-400 to-emerald-600"
      />

      <StatCard
        label="Items Sold"
        value={insights?.itemsSold ?? 0}
        icon={<ShoppingBag size={20} />}
        gradient="from-sky-400 to-sky-600"
      />

      <StatCard
        href={ADMIN_ORDER_SHOW}
        label="Total Orders"
        value={countData?.order ?? 0}
        icon={<ClipboardList size={20} />}
        gradient="from-violet-400 to-violet-600"
      />
    </motion.div>
  );
}
