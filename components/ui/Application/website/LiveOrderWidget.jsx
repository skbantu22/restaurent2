"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  PackageCheck,
  CookingPot,
  Bike,
  CircleCheckBig,
  XCircle,
} from "lucide-react";

import { fetchGuestOrders } from "@/store/reducer/orderReducer";
import { usePathname } from "next/navigation";

const STATUS = {
  placed: {
    label: "Order Placed",
    color: "text-amber-500",
    bg: "bg-amber-500",
    icon: Clock3,
    progress: 20,
  },

  preparing: {
    label: "Preparing",
    color: "text-orange-500",
    bg: "bg-orange-500",
    icon: CookingPot,
    progress: 45,
  },

  ready: {
    label: "Ready",
    color: "text-sky-500",
    bg: "bg-sky-500",
    icon: PackageCheck,
    progress: 70,
  },

  out_for_delivery: {
    label: "Out For Delivery",
    color: "text-blue-600",
    bg: "bg-blue-600",
    icon: Bike,
    progress: 90,
  },

  delivered: {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-600",
    icon: CircleCheckBig,
    progress: 100,
  },

  cancelled: {
    label: "Cancelled",
    color: "text-red-500",
    bg: "bg-red-500",
    icon: XCircle,
    progress: 100,
  },
};

export default function LiveOrderWidget() {
  const dispatch = useDispatch();
  const pathname = usePathname();

  const { activeOrders = [], loading } = useSelector(
    (state) => state.orderStore,
  );

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    dispatch(fetchGuestOrders());

    const timer = setInterval(() => {
      dispatch(fetchGuestOrders());
    }, 5000);

    return () => clearInterval(timer);
  }, [dispatch]);

  if (pathname === "/checkout") return null;
  if (loading && activeOrders.length === 0) return null;
  if (activeOrders.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[240px] max-w-[95vw]">
      <div className="overflow-hidden rounded-2xl border bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-black px-4 py-3 text-white">
          <div>
            <h3 className="flex items-center gap-1.5 font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              Live Orders ({activeOrders.length})
            </h3>
            <p className="text-xs text-zinc-300">Tracking your orders</p>
          </div>

          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded p-1 hover:bg-white/10"
          >
            {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {!collapsed && (
          <div className="max-h-[420px] overflow-y-auto space-y-3 p-3">
            {activeOrders.map((order) => {
              const info = STATUS[order.orderStatus] ?? STATUS.placed;
              const Icon = info.icon;

              return (
                <div
                  key={order._id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">
                        #{order.orderNumber}
                      </h4>

                      <div
                        className={`mt-2 flex items-center gap-2 text-xs ${info.color}`}
                      >
                        <Icon size={15} />
                        <span>{info.label}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold">
                        £{Number(order.total || 0).toFixed(2)}
                      </div>

                      <div className="text-xs text-zinc-500">
                        {order.items?.length || 0} Item
                        {(order.items?.length || 0) > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className={`${info.bg} h-full transition-all duration-500`}
                      style={{
                        width: `${info.progress}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
