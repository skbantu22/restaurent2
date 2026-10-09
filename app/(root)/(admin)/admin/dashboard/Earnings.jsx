"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const RANGES = [
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
  { key: "today", label: "Today" },
];

const chartConfig = {
  amount: {
    label: "Earnings",
    color: "var(--chart-1)",
  },
};

function buildChartData(range, apiData) {
  if (range === "today") {
    return Array.from({ length: 24 }, (_, hour) => {
      const match = apiData.find((d) => d._id.hour === hour);
      const label = hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
      return { label, amount: match ? match.totalSales : 0 };
    });
  }

  if (range === "weekly") {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - i));
      const match = apiData.find(
        (d) =>
          d._id.year === date.getFullYear() &&
          d._id.month === date.getMonth() + 1 &&
          d._id.day === date.getDate(),
      );
      return {
        label: date.toLocaleDateString("en-GB", { weekday: "short" }),
        amount: match ? match.totalSales : 0,
      };
    });
  }

  return MONTHS.map((label, index) => {
    const match = apiData.find((d) => d._id.month === index + 1);
    return { label, amount: match ? match.totalSales : 0 };
  });
}

async function fetchEarnings(range) {
  const { data } = await axios.get(`/api/dashboard/admin/earnings?range=${range}`);
  if (!data?.success) throw new Error(data?.message || "Failed to load earnings");
  return data.data || [];
}

export default function Earnings() {
  const [range, setRange] = useState("monthly");

  const { data: apiData = [], isLoading } = useQuery({
    queryKey: ["dashboard-earnings", range],
    queryFn: () => fetchEarnings(range),
  });

  const chartData = useMemo(() => buildChartData(range, apiData), [range, apiData]);

  const total = useMemo(
    () => chartData.reduce((sum, d) => sum + (d.amount || 0), 0),
    [chartData],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Earnings</CardTitle>

          <div className="flex gap-1 bg-muted rounded-md p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  range === r.key
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="max-h-[280px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  interval={range === "today" ? 2 : 0}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={8} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
