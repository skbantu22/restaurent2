"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const PALETTE = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#9ca3af", // gray (Other)
];

async function fetchInsights() {
  const { data } = await axios.get("/api/dashboard/admin/insights");
  if (!data?.success) throw new Error(data?.message || "Failed to load insights");
  return data.data;
}

export default function SalesByCategory() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: fetchInsights,
  });

  const categories = insights?.salesByCategory || [];

  const chartData = categories.map((c, i) => ({
    category: c.category,
    quantity: c.quantity,
    fill: PALETTE[i % PALETTE.length],
  }));

  const chartConfig = Object.fromEntries(
    chartData.map((c) => [c.category, { label: c.category, color: c.fill }]),
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Sales by Category</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No sales yet.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-6"
          >
            <ChartContainer config={chartConfig} className="aspect-square max-h-[180px] shrink-0">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={chartData} dataKey="quantity" nameKey="category" innerRadius={45} strokeWidth={4} />
              </PieChart>
            </ChartContainer>

            <ul className="space-y-1.5 text-xs">
              {chartData.map((c) => (
                <li key={c.category} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.fill }} />
                  <span className="truncate max-w-[140px]">{c.category}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
