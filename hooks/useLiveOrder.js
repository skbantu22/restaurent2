"use client";

import { useCallback, useEffect, useState } from "react";

export default function useLiveOrder() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/live", {
        cache: "no-store",
      });

      if (!res.ok) {
        setOrder(null);
        return;
      }

      const data = await res.json();

      setOrder(data.order || null);
    } catch (err) {
      console.error("Live Order Error:", err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrder();

    const interval = setInterval(() => {
      fetchOrder();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchOrder]);

  return {
    order,

    loading,

    refresh: fetchOrder,

    hasActiveOrder: !!order,

    isCompleted:
      order?.orderStatus === "delivered" || order?.orderStatus === "cancelled",

    statusText:
      {
        placed: "Order Placed",
        preparing: "Preparing Food",
        ready: "Ready for Pickup",
        out_for_delivery: "Out for Delivery",
        delivered: "Delivered",
        cancelled: "Cancelled",
      }[order?.orderStatus] || "Order Placed",
  };
}
