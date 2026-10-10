"use client";

// Kitchen Display System — live board of orders to cook (website + POS).
// New -> Cooking -> Ready -> served / collected / out for delivery.

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Bike, ChefHat, Clock, CookingPot, Loader2, Printer, RefreshCw, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { showToast } from "@/lib/showToast";

const COLUMNS = [
  { key: "placed", title: "New", icon: Clock, color: "#E2344F", next: "preparing", action: "Start Cooking" },
  { key: "preparing", title: "Cooking", icon: CookingPot, color: "#E08A00", next: "ready", action: "Mark Ready" },
  { key: "ready", title: "Ready", icon: ChefHat, color: "#0AA553" },
];
const TYPE = {
  dine_in: ["Dine In", UtensilsCrossed],
  takeaway: ["Takeaway", ShoppingBag],
  pickup: ["Collection", Store],
  delivery: ["Delivery", Bike],
};

const minsSince = (t) => Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 60000));

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/pos/orders", { params: { scope: "ongoing" } });
      setOrders((data.data || []).filter((o) => ["placed", "preparing", "ready"].includes(o.orderStatus)));
    } catch {
      // keep the last board on a failed refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const r = setInterval(load, 15000); // live refresh
    const t = setInterval(() => tick((n) => n + 1), 30000); // update timers
    return () => (clearInterval(r), clearInterval(t));
  }, [load]);

  const move = async (order, status) => {
    setBusy(order._id);
    try {
      const { data } = await axios.put("/api/orders/update-status", { _id: order._id, status });
      if (!data.success) throw new Error(data.message);
      setOrders((list) =>
        ["placed", "preparing", "ready"].includes(status)
          ? list.map((o) => (o._id === order._id ? { ...o, orderStatus: status } : o))
          : list.filter((o) => o._id !== order._id),
      );
    } catch (e) {
      showToast("error", e.response?.data?.message || e.message);
    } finally {
      setBusy("");
    }
  };

  const byStatus = useMemo(() => {
    const g = { placed: [], preparing: [], ready: [] };
    for (const o of orders) g[o.orderStatus]?.push(o);
    for (const k of Object.keys(g)) g[k].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return g;
  }, [orders]);

  return (
    <div className="pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><ChefHat className="text-[#1bab70]" /> Kitchen Display</h1>
          <p className="text-sm text-muted-foreground">Live orders from the website and POS · refreshes every 15 seconds</p>
        </div>
        <button type="button" onClick={load} className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-semibold hover:bg-muted">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center"><Loader2 className="animate-spin text-[#1bab70]" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map(({ key, title, icon: Icon, color, next, action }) => (
            <section key={key} className="flex min-h-[200px] flex-col overflow-hidden lg:min-h-[60vh] rounded-[8px] border border-[#e6ebf1] bg-white">
              <header className="flex items-center justify-between px-4 py-3 text-white" style={{ background: color }}>
                <span className="flex items-center gap-2 text-lg font-bold"><Icon size={20} /> {title}</span>
                <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-sm font-black">{byStatus[key].length}</span>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-3">
                <AnimatePresence initial={false}>
                  {byStatus[key].map((o) => {
                    const [typeLabel, TypeIcon] = TYPE[o.orderType] || [o.orderType, ShoppingBag];
                    const mins = minsSince(o.createdAt);
                    const late = key !== "ready" && mins >= 20;
                    return (
                      <motion.article key={o._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className={`overflow-hidden rounded-lg border-2 bg-white shadow-sm dark:bg-card ${late ? "border-[#E2344F]" : "border-transparent"}`}>
                        <div className="flex items-center justify-between border-b px-3 py-2">
                          <div>
                            <b className="text-base">{o.orderNumber}</b>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <TypeIcon size={13} /> {typeLabel}{o.table ? ` · ${o.table}` : ""} · {o.source === "pos" ? "POS" : "Online"}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${late ? "bg-[#E2344F] text-white" : "bg-muted"}`}>{mins} min</span>
                        </div>
                        <ul className="space-y-1 px-3 py-2">
                          {o.items.map((it, i) => (
                            <li key={i} className="text-sm">
                              <b className="mr-1.5 text-[#1bab70]">{it.quantity}×</b>{it.name}
                              {it.notes && <span className="block pl-6 text-xs text-[#E2344F]">↳ {it.notes}</span>}
                            </li>
                          ))}
                        </ul>
                        {o.notes && <p className="mx-3 mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{o.notes}</p>}
                        <div className="flex gap-2 border-t p-2">
                          <a href={`/admin/orders/print/${o._id}?type=kitchen`} target="_blank" rel="noreferrer" title="Print KOT"
                            className="flex h-9 w-10 items-center justify-center rounded-md border hover:bg-muted"><Printer size={15} /></a>
                          {next ? (
                            <button type="button" disabled={busy === o._id} onClick={() => move(o, next)}
                              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-bold text-white disabled:opacity-60" style={{ background: COLUMNS.find((c) => c.key === next).color }}>
                              {busy === o._id ? <Loader2 size={15} className="animate-spin" /> : action}
                            </button>
                          ) : (
                            <button type="button" disabled={busy === o._id} onClick={() => move(o, o.orderType === "delivery" ? "out_for_delivery" : "delivered")}
                              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#1bab70] text-sm font-bold text-white disabled:opacity-60">
                              {busy === o._id ? <Loader2 size={15} className="animate-spin" /> : o.orderType === "delivery" ? "Out for Delivery" : o.orderType === "dine_in" ? "Served" : "Collected"}
                            </button>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
                {!byStatus[key].length && <p className="py-10 text-center text-sm text-muted-foreground">No orders</p>}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
