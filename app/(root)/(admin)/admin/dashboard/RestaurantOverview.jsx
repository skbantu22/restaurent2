"use client";

import { useEffect, useState } from "react";
import { QUICK_LINKS } from "@/components/ui/Application/Admin/Topbar";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ClipboardList,
  PackageSearch,
  Truck,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
  BarChart3,
  ChefHat as ChefHatIcon,
  Clock,
  CookingPot,
  Bike,
  ShoppingBag,
  Store,
} from "lucide-react";

// Restaurant dashboard (AmarSolution-style): quick links, four solid
// headline cards, sales this year, top 10 foods, top 10 customers and
// customer receivable amounts. Data: /api/dashboard/admin/overview.

const money = (n) => `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CARDS = [
  { key: "customers", label: "Total Customers", icon: Users, bg: "from-[#2F8F3A] to-[#1F6E28]" },
  { key: "products", label: "Menu Items", icon: UtensilsCrossed, bg: "from-[#2D7DD2] to-[#1E5FA8]" },
  { key: "suppliers", label: "Total Suppliers", icon: Truck, bg: "from-[#7B2CBF] to-[#5A189A]" },
  { key: "todaySale", label: "Today's Sale", icon: Wallet, bg: "from-[#E8A317] to-[#C98A0A]", money: true },
];

const BAR_COLORS = ["#2F6B16", "#E1262D", "#F2B705", "#2D7DD2", "#7B2CBF", "#4A8A22", "#F47B20", "#0F9D8C", "#C2185B", "#5D4037"];

function Panel({ title, children, className = "", right }) {
  return (
    <div className={`overflow-hidden rounded-xl border-t-4 border-[#2F6B16] bg-card shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-5 pb-1 pt-4">
        <h3 className="text-base font-bold">{title}</h3>
        {right}
      </div>
      <div className="p-5 pt-3">{children}</div>
    </div>
  );
}

function RankTable({ rows, empty, valueLabel }) {
  if (!rows?.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#2F6B16] text-left text-white">
            <th className="w-12 px-3 py-2.5 font-semibold">#</th>
            <th className="px-3 py-2.5 font-semibold">Customer</th>
            <th className="px-3 py-2.5 text-center font-semibold">Orders</th>
            <th className="px-3 py-2.5 text-right font-semibold">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.phone}-${i}`} className="border-t odd:bg-muted/40">
              <td className="px-3 py-2.5 font-semibold text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2.5">
                <span className="block font-medium">{r.name || "Guest"}</span>
                {r.phone && <span className="text-xs text-muted-foreground">{r.phone}</span>}
              </td>
              <td className="px-3 py-2.5 text-center">{r.orders}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable({ cols, rows, empty }) {
  if (!rows?.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#2F6B16] text-left text-white">
            <th className="w-12 px-3 py-2.5 font-semibold">#</th>
            {cols.map((c) => (
              <th key={c.label} className={`px-3 py-2.5 font-semibold ${c.right ? "text-right" : ""}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t odd:bg-muted/40">
              <td className="px-3 py-2.5 font-semibold text-muted-foreground">{i + 1}</td>
              {cols.map((c) => (
                <td key={c.label} className={`px-3 py-2.5 ${c.right ? "text-right font-semibold tabular-nums" : ""}`}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_LABELS = {
  placed: "New",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Completed",
  cancelled: "Cancelled",
};

export default function RestaurantOverview() {
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Opened from the top bar's "Today's Summary" quick link
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("summary") === "1") setSummaryOpen(true);
    const open = () => setSummaryOpen(true);
    window.addEventListener("sfg:summary", open);
    return () => window.removeEventListener("sfg:summary", open);
  }, []);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => (await axios.get("/api/dashboard/admin/overview")).data?.data,
    refetchInterval: 60000,
  });

  const cards = data?.cards || {};
  const yearTotal = (data?.salesByMonth || []).reduce((s, m) => s + m.total, 0);

  return (
    <div className="space-y-6">
      {/* Quick links (shown in the top bar on wide screens) */}
      <div className="flex flex-wrap items-center gap-2 xl:hidden">
        <span className="mr-1 text-sm font-semibold text-muted-foreground">Quick links:</span>
        {QUICK_LINKS.map(({ label, href, summary, icon: Icon, cls }) =>
          href ? (
            <Link key={label} href={href} className={`flex h-9 items-center gap-2 rounded-md px-3.5 text-sm font-semibold text-white shadow-sm transition ${cls}`}>
              <Icon size={16} /> {label}
            </Link>
          ) : (
            <button key={label} type="button" onClick={() => summary && setSummaryOpen(true)} className={`flex h-9 items-center gap-2 rounded-md px-3.5 text-sm font-semibold text-white shadow-sm transition ${cls}`}>
              <Icon size={16} /> {label}
            </button>
          ),
        )}
      </div>

      {/* Headline cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CARDS.map(({ key, label, icon: Icon, bg, money: isMoney }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${bg} p-5 text-white shadow-md`}
          >
            <Icon className="absolute -bottom-3 -right-2 h-24 w-24 opacity-20" strokeWidth={1.5} />
            <p className="relative text-3xl font-black tabular-nums">
              {isLoading ? "…" : isMoney ? money(cards[key]) : (cards[key] ?? 0).toLocaleString()}
            </p>
            <p className="relative mt-1 text-sm font-medium text-white/90">{label}</p>
            {key === "todaySale" && !isLoading && (
              <p className="relative mt-0.5 text-xs text-white/80">{cards.todayOrders || 0} orders today</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Floor, kitchen & today (like the 360 restaurant dashboard) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Tables"
          right={
            <span className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#0AA553]" />Free {(data?.tables || []).filter((t) => !t.busy).length}</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#E2344F]" />Busy {(data?.tables || []).filter((t) => t.busy).length}</span>
              <Link href="/admin/pos" className="text-[#2D7DD2] hover:underline">Open POS</Link>
            </span>
          }
        >
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 xl:grid-cols-6">
            {(data?.tables || []).map((t) => (
              <Link key={t.name} href="/admin/pos" title={t.busy ? "Open bill — pay it from On Going Order in the POS" : "Free — open POS"}
                className={`flex flex-col items-center justify-center rounded-lg border-2 px-2 py-3 text-center transition hover:shadow-md ${t.busy ? "border-[#E2344F] bg-[#FFF1F3]" : "border-[#BFE8D0] bg-[#F1FBF5]"}`}>
                <UtensilsCrossed size={20} className={t.busy ? "text-[#E2344F]" : "text-[#0AA553]"} />
                <b className="mt-1 text-sm">{t.name}</b>
                <span className={`text-xs font-semibold ${t.busy ? "text-[#E2344F]" : "text-[#0AA553]"}`}>{t.busy ? money(t.total) : "Free"}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Kitchen" right={<Link href="/admin/kitchen" className="text-xs font-semibold text-[#2D7DD2] hover:underline">Open kitchen</Link>}>
            <div className="grid grid-cols-3 gap-2">
              {[["placed", "New", Clock, "#E2344F"], ["preparing", "Cooking", CookingPot, "#E08A00"], ["ready", "Ready", ChefHatIcon, "#0AA553"]].map(([k, label, Icon, c]) => (
                <Link key={k} href="/admin/kitchen" className="rounded-lg border px-1 py-3 text-center transition hover:shadow-md">
                  <Icon size={20} className="mx-auto" style={{ color: c }} />
                  <b className="mt-1 block text-2xl tabular-nums">{data?.kitchen?.[k] || 0}</b>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Today's Orders">
            <ul className="space-y-2">
              {[["dine_in", "Dine In", UtensilsCrossed, "#2B5FD9"], ["takeaway", "Takeaway", ShoppingBag, "#7B2CBF"], ["pickup", "Collection", Store, "#0AA553"], ["delivery", "Delivery", Bike, "#E08A00"]].map(([k, label, Icon, c]) => (
                <li key={k} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <Icon size={18} style={{ color: c }} />
                  <span className="flex-1 text-sm">{label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{money(data?.byType?.[k]?.total)}</span>
                  <b className="w-6 text-right tabular-nums">{data?.byType?.[k]?.count || 0}</b>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Last 7 Days Sale" right={<span className="text-sm font-bold text-[#0AA553]">{money((data?.week || []).reduce((s, w) => s + w.total, 0))}</span>}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.week || []} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `£${v}`} />
                <Tooltip formatter={(v) => money(v)} labelFormatter={(l, p) => p?.[0]?.payload?.date || l} />
                <Bar dataKey="total" name="Sales" fill="#0AA553" radius={[6, 6, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Best Selling Today">
          {!data?.bestToday?.length ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{isLoading ? "Loading…" : "No sales yet today."}</p>
          ) : (
            <ul className="space-y-2">
              {data.bestToday.map((b, i) => (
                <li key={b.name} className="flex items-center gap-3 rounded-lg border p-1.5">
                  <span className="relative flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-md bg-muted">
                    {b.image ? <img src={b.image} alt="" className="h-full w-full object-cover" /> : <b className="text-muted-foreground">{i + 1}</b>}
                  </span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{b.name}</span><span className="text-xs text-muted-foreground">{b.qty} sold</span></span>
                  <b className="text-sm tabular-nums">{money(b.amount)}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sales This Year" right={<span className="text-sm font-bold text-[#2F6B16]">{money(yearTotal)}</span>}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.salesByMonth || []} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="sfgArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2F6B16" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2F6B16" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `£${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                <Tooltip formatter={(v) => money(v)} />
                <Area type="monotone" dataKey="total" name="Sales" stroke="#2F6B16" strokeWidth={2.5} fill="url(#sfgArea)" dot={{ r: 3, fill: "#2F6B16" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top 10 Selling Food This Month">
          {data?.topFoods?.length ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topFoods} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip formatter={(v, n) => (n === "qty" ? [`${v} sold`, "Quantity"] : v)} />
                  <Bar dataKey="qty" radius={[0, 6, 6, 0]} barSize={16}>
                    {data.topFoods.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-24 text-center text-sm text-muted-foreground">{isLoading ? "Loading…" : "No sales yet this month."}</p>
          )}
        </Panel>
      </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top 10 Customers This Month">
          <RankTable rows={data?.topCustomers} empty={isLoading ? "Loading…" : "No orders yet this month."} valueLabel="Sale Amount" />
        </Panel>
        <Panel title="Customer Receivable Amount" right={<span className="text-xs text-muted-foreground">Unpaid orders</span>}>
          <RankTable rows={data?.receivable} empty={isLoading ? "Loading…" : "Nothing outstanding. All orders are paid."} valueLabel="Amount Due" />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Low Stock Alert" right={<Link href="/admin/inventory/ingredients" className="text-xs font-semibold text-[#2F6B16] hover:underline">Manage stock</Link>}>
          <SimpleTable
            rows={data?.lowStock}
            empty={isLoading ? "Loading…" : "All ingredients are above their minimum level."}
            cols={[
              { label: "Ingredient", render: (r) => r.name },
              { label: "Minimum", right: true, render: (r) => `${r.minimum} ${r.unit || ""}` },
              { label: "Current Stock", right: true, render: (r) => <span className="text-[#E1262D]">{r.stock} {r.unit}</span> },
            ]}
          />
        </Panel>
        <Panel title="Suppliers Payable" right={<span className="text-xs text-muted-foreground">Received purchase orders</span>}>
          <SimpleTable
            rows={data?.suppliersPayable}
            empty={isLoading ? "Loading…" : "No received purchase orders."}
            cols={[
              { label: "Supplier", render: (r) => r.name },
              { label: "Orders", right: true, render: (r) => r.orders },
              { label: "Amount", right: true, render: (r) => money(r.amount) },
            ]}
          />
        </Panel>
      </div>

      {/* Today's summary modal */}
      <AnimatePresence>
        {summaryOpen && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSummaryOpen(false)}>
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between bg-[#2D7DD2] px-5 py-4 text-white">
                <h3 className="flex items-center gap-2 font-bold"><ClipboardList size={18} /> Today&apos;s Summary</h3>
                <button type="button" onClick={() => setSummaryOpen(false)} aria-label="Close"><X size={20} /></button>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Sales</p>
                    <p className="text-2xl font-black">{money(cards.todaySale)}</p>
                  </div>
                  <div className="rounded-xl bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-2xl font-black">{cards.todayOrders || 0}</p>
                  </div>
                </div>
                <ul className="divide-y rounded-xl border">
                  {Object.entries(STATUS_LABELS).map(([k, label]) => (
                    <li key={k} className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="flex items-center gap-2"><PackageSearch size={14} className="text-muted-foreground" /> {label}</span>
                      <b>{data?.todayStatus?.[k] || 0}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
