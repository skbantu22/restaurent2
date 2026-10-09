"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  show: { transition: { staggerChildren: 0.06 } },
};

const row = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 },
};

export default function TopSellingItems() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: fetchInsights,
  });

  const { data: currency = "£" } = useQuery({
    queryKey: ["settings-currency"],
    queryFn: fetchCurrencySymbol,
    staleTime: 5 * 60 * 1000,
  });

  const items = insights?.topSellingItems || [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Top Selling Items</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No sales yet.</div>
        ) : (
          <motion.ul variants={container} initial="hidden" animate="show" className="space-y-4">
            {items.map((it) => (
              <motion.li key={it.name} variants={row} className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                  {it.image ? (
                    <Image src={it.image} alt={it.name} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{it.name}</div>
                  <div className="text-xs text-muted-foreground">{it.quantity} times</div>
                </div>

                <div className="text-sm font-semibold shrink-0">
                  {currency}
                  {Number(it.price || 0).toFixed(2)}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </CardContent>
    </Card>
  );
}
