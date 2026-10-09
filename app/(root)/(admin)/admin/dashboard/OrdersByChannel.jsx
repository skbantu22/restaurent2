"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_TYPE_LABEL } from "@/lib/column";

const CHANNEL_ICON = {
  dine_in: "🍽️",
  takeaway: "🥡",
  pickup: "🥡",
  delivery: "🛵",
};

async function fetchInsights() {
  const { data } = await axios.get("/api/dashboard/admin/insights");
  if (!data?.success) throw new Error(data?.message || "Failed to load insights");
  return data.data;
}

export default function OrdersByChannel() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: fetchInsights,
  });

  const channels = insights?.ordersByChannel || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Orders From</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : channels.length === 0 ? (
          <div className="text-sm text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="space-y-4">
            {channels.map((c) => (
              <div key={c.orderType} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-base shrink-0">
                  {CHANNEL_ICON[c.orderType] || "🍽️"}
                </span>

                <div className="min-w-[70px] text-sm font-medium">
                  {ORDER_TYPE_LABEL[c.orderType] || c.orderType}
                </div>

                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${c.percentage}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>

                <div className="text-xs text-muted-foreground w-16 text-right shrink-0">
                  {c.count} ({c.percentage}%)
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
