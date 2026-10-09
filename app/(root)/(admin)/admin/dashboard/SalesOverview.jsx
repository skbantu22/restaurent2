"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  CalendarDays,
  Receipt,
  Sun,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

async function fetchSummary() {
  const { data } = await axios.get("/api/dashboard/admin/sales-summary");
  if (!data?.success) throw new Error(data?.message || "Failed to load sales");
  return data.data;
}

async function fetchCurrencySymbol() {
  const { data } = await axios.get("/api/settings/public");
  return data?.data?.currencySymbol || "£";
}

const chartConfig = {
  sales: { label: "Sales", color: "#f97316" },
};

// % change vs the comparison period; null when there's nothing to compare
function change(current, previous) {
  if (!previous) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function Trend({ value, label }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">No sales {label}</span>;
  }
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${
          up
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400"
        }`}
      >
        <Icon className="h-3 w-3" />
        {Math.abs(value).toFixed(0)}%
      </span>
      <span className="text-muted-foreground">vs {label}</span>
    </span>
  );
}

function SalesCard({ label, value, footer, icon: Icon, accent }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      className="rounded-xl border bg-white p-4 shadow-sm dark:bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 min-h-[20px]">{footer}</div>
    </motion.div>
  );
}

export default function SalesOverview() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-sales-summary"],
    queryFn: fetchSummary,
    refetchInterval: 60 * 1000,
  });

  const { data: currency = "£" } = useQuery({
    queryKey: ["settings-currency"],
    queryFn: fetchCurrencySymbol,
    staleTime: 5 * 60 * 1000,
  });

  const money = (n) =>
    `${currency}${Number(n || 0).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (isError) {
    return (
      <Card className="mt-6">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Could not load sales overview.
        </CardContent>
      </Card>
    );
  }

  const today = data?.today || { sales: 0, orders: 0 };
  const yesterday = data?.yesterday || { sales: 0, orders: 0 };
  const month = data?.thisMonth || { sales: 0, orders: 0 };
  const lastMonth = data?.lastMonthToDate || { sales: 0, orders: 0 };
  const avgOrder = month.orders ? month.sales / month.orders : 0;
  const daily = data?.daily || [];
  const bestDay = daily.reduce((best, d) => (d.sales > (best?.sales || 0) ? d : best), null);

  return (
    <section className="mt-6">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <SalesCard
          label="Today's Sales"
          value={isLoading ? "…" : money(today.sales)}
          icon={Sun}
          accent="bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
          footer={!isLoading && <Trend value={change(today.sales, yesterday.sales)} label="yesterday" />}
        />
        <SalesCard
          label="Today's Orders"
          value={isLoading ? "…" : today.orders}
          icon={Receipt}
          accent="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
          footer={!isLoading && <Trend value={change(today.orders, yesterday.orders)} label="yesterday" />}
        />
        <SalesCard
          label={`This Month${data?.monthLabel ? ` · ${data.monthLabel}` : ""}`}
          value={isLoading ? "…" : money(month.sales)}
          icon={CalendarDays}
          accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          footer={!isLoading && <Trend value={change(month.sales, lastMonth.sales)} label="last month" />}
        />
        <SalesCard
          label="Avg. Order (this month)"
          value={isLoading ? "…" : money(avgOrder)}
          icon={Wallet}
          accent="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
          footer={
            !isLoading && (
              <span className="text-xs text-muted-foreground">
                {month.orders} order{month.orders === 1 ? "" : "s"} this month
              </span>
            )
          }
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="mt-4"
      >
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-lg">Daily Sales · {data?.monthLabel || "This Month"}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : bestDay
                    ? `Best day so far: ${bestDay.day} ${data.monthLabel.split(" ")[0]} (${money(bestDay.sales)})`
                    : "No sales yet this month"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Month total</p>
              <p className="text-lg font-bold text-orange-600">{isLoading ? "…" : money(month.sales)}</p>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <AreaChart data={daily} margin={{ left: 4, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-sales)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-sales)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => `${currency}${v}`}
                  />
                  <ChartTooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const p = payload?.[0]?.payload;
                          return p
                            ? `${p.day} ${data.monthLabel.split(" ")[0]} · ${p.orders} order${p.orders === 1 ? "" : "s"}`
                            : "";
                        }}
                        formatter={(value) => (
                          <span className="font-semibold">{money(value)}</span>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="var(--color-sales)"
                    strokeWidth={2.5}
                    fill="url(#salesFill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
