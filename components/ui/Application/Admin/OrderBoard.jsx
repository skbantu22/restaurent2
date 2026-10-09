"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/showToast";
import { ADMIN_ORDER_DETAILS } from "@/Route/Adminpannelroute";
import { ORDER_TYPE_LABEL } from "@/lib/column";

const COLUMNS = [
  { key: "placed", label: "Placed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const COLUMN_STYLE = {
  placed: "border-t-blue-500",
  preparing: "border-t-amber-500",
  ready: "border-t-indigo-500",
  out_for_delivery: "border-t-purple-500",
  delivered: "border-t-green-500",
  cancelled: "border-t-red-500",
};

const BADGE_STYLE = {
  placed: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  preparing: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ready: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  out_for_delivery: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const PAYMENT_BADGE = {
  paid: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  pending: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  refunded: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

function nextStatusFor(order) {
  switch (order.orderStatus) {
    case "placed":
      return "preparing";
    case "preparing":
      return "ready";
    case "ready":
      return order.orderType === "delivery" ? "out_for_delivery" : "delivered";
    case "out_for_delivery":
      return "delivered";
    default:
      return null;
  }
}

const NEXT_LABEL = {
  preparing: "Start Preparing",
  ready: "Mark Ready",
  out_for_delivery: "Send Out for Delivery",
  delivered: "Mark Delivered",
};

async function fetchBoardOrders() {
  const params = new URLSearchParams({
    start: "0",
    size: "150",
    filters: "[]",
    globalFilter: "",
    sorting: JSON.stringify([{ id: "createdAt", desc: false }]),
    deleteType: "SD",
  });

  const { data } = await axios.get(`/api/orders?${params.toString()}`);
  if (!data?.success) throw new Error(data?.message || "Failed to load orders");
  return data.data || [];
}

async function fetchCurrencySymbol() {
  const { data } = await axios.get("/api/settings/public");
  return data?.data?.currencySymbol || "£";
}

function OrderCard({ order, currency, onAdvance, onCancel, updatingId }) {
  const next = nextStatusFor(order);
  const isUpdating = updatingId === order._id;
  const canCancel = order.orderStatus !== "delivered" && order.orderStatus !== "cancelled";

  return (
    <Card className={`p-3 border-t-4 ${COLUMN_STYLE[order.orderStatus] || ""} gap-2`}>
      <div className="flex items-center justify-between gap-2">
        <Link
          href={ADMIN_ORDER_DETAILS(order.orderNumber)}
          className="font-semibold text-sm hover:underline"
        >
          {order.orderNumber}
        </Link>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            order.source === "pos"
              ? "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300"
              : "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
          }`}
        >
          {order.source === "pos" ? "POS" : "Website"}
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        {ORDER_TYPE_LABEL[order.orderType] || order.orderType}
        {order.orderType === "dine_in" && order.table ? ` · Table ${order.table}` : ""}
      </div>

      <div className="text-sm font-medium truncate">{order.customer?.name}</div>
      {order.customer?.phone && order.customer.phone !== "N/A" && (
        <div className="text-xs text-muted-foreground">{order.customer.phone}</div>
      )}

      <div className="flex items-center justify-between text-xs pt-1">
        <span>{order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}</span>
        <span className="font-semibold">{currency}{Number(order.total || 0).toFixed(2)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300">
          {order.payment?.method || "-"}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PAYMENT_BADGE[order.payment?.status] || PAYMENT_BADGE.pending}`}>
          {order.payment?.status || "-"}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {next && (
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            disabled={isUpdating}
            onClick={() => onAdvance(order, next)}
          >
            {isUpdating ? "..." : NEXT_LABEL[next]}
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive hover:text-destructive"
            disabled={isUpdating}
            onClick={() => onCancel(order)}
          >
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function OrderBoard() {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState(null);

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["orders-board"],
    queryFn: fetchBoardOrders,
    refetchInterval: 15000,
  });

  const { data: currency = "£" } = useQuery({
    queryKey: ["settings-currency"],
    queryFn: fetchCurrencySymbol,
    staleTime: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    for (const order of orders) {
      if (map[order.orderStatus]) map[order.orderStatus].push(order);
      else map.placed.push(order);
    }
    return map;
  }, [orders]);

  const updateStatus = async (order, status) => {
    setUpdatingId(order._id);
    try {
      const { data } = await axios.put("/api/orders/update-status", {
        _id: order._id,
        status,
      });
      if (!data?.success) throw new Error(data?.message || "Failed to update order.");

      showToast("success", data.message || "Order updated.");
      queryClient.invalidateQueries({ queryKey: ["orders-board"] });
      queryClient.invalidateQueries({ queryKey: ["orders-data"] });
    } catch (error) {
      showToast("error", error?.response?.data?.message || error.message || "Failed to update order.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = (order) => {
    if (confirm(`Cancel order ${order.orderNumber}?`)) {
      updateStatus(order, "cancelled");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading orders...</div>;
  }

  if (isError) {
    return <div className="p-6 text-sm text-destructive">Failed to load orders.</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <div key={col.key} className="w-72 shrink-0 flex flex-col">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className={`w-2.5 h-2.5 rounded-full ${BADGE_STYLE[col.key]}`} />
            <h3 className="font-semibold text-sm">{col.label}</h3>
            <span className="text-xs text-muted-foreground">({grouped[col.key].length})</span>
          </div>

          <div className="flex flex-col gap-3 min-h-[100px]">
            {grouped[col.key].length === 0 ? (
              <div className="text-xs text-muted-foreground italic px-1">No orders</div>
            ) : (
              grouped[col.key].map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  currency={currency}
                  onAdvance={updateStatus}
                  onCancel={handleCancel}
                  updatingId={updatingId}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
