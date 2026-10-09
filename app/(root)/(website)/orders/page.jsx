"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import {
  Clock3,
  PackageCheck,
  CookingPot,
  Bike,
  CircleCheckBig,
  XCircle,
  History,
  ShoppingBag,
} from "lucide-react";

import UserPanelLayout from "@/components/ui/Application/website/UserPannelLayout";
import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import { fetchGuestOrders } from "@/store/reducer/orderReducer";

const breadCrumbData = [{ label: "Home", href: "/" }, { label: "Orders" }];

const STATUS = {
  placed: {
    label: "Order Placed",
    color: "text-amber-500",
    bg: "bg-amber-500",
    icon: Clock3,
    progress: 20,
    animate: "animate-pulse",
  },
  preparing: {
    label: "Preparing",
    color: "text-orange-500",
    bg: "bg-orange-500",
    icon: CookingPot,
    progress: 45,
    animate: "animate-bounce",
  },
  ready: {
    label: "Ready",
    color: "text-sky-500",
    bg: "bg-sky-500",
    icon: PackageCheck,
    progress: 70,
    animate: "animate-pulse",
  },
  delivering: {
    label: "On the way",
    color: "text-blue-600",
    bg: "bg-blue-600",
    icon: Bike,
    progress: 90,
    animate: "animate-bounce",
  },
  delivered: {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-600",
    icon: CircleCheckBig,
    progress: 100,
    animate: "",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-500",
    bg: "bg-red-500",
    icon: XCircle,
    progress: 100,
    animate: "",
  },
};

const Orders = () => {
  const dispatch = useDispatch();
  const { activeOrders = [], loading } = useSelector(
    (state) => state.orderStore,
  );

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    dispatch(fetchGuestOrders());

    const timer = setInterval(() => {
      dispatch(fetchGuestOrders());
    }, 5000);

    return () => clearInterval(timer);
  }, [dispatch]);

  const ongoingOrders = activeOrders.filter(
    (order) =>
      order.orderStatus !== "delivered" && order.orderStatus !== "cancelled",
  );

  const historyOrders = activeOrders.filter(
    (order) =>
      order.orderStatus === "delivered" || order.orderStatus === "cancelled",
  );

  const displayedOrders = showHistory ? historyOrders : ongoingOrders;

  return (
    <div>
      <UserPanelLayout>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="border-b px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="mb-4">
                <Breadcums items={breadCrumbData} />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {showHistory ? "Order History" : "Live Ongoing Orders"} (
                {displayedOrders.length})
              </h1>
            </div>

            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="flex items-center gap-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-4 py-2.5 rounded-xl transition-colors self-start sm:self-auto"
            >
              {showHistory ? (
                <>
                  <ShoppingBag size={15} />
                  <span>Show Live Orders ({ongoingOrders.length})</span>
                </>
              ) : (
                <>
                  <History size={15} />
                  <span>View History ({historyOrders.length})</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {loading && activeOrders.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">
                Loading orders...
              </div>
            ) : (
              <div className="space-y-6">
                {displayedOrders.length > 0 ? (
                  displayedOrders.map((order, i) => {
                    const info = STATUS[order.orderStatus] || STATUS.placed;
                    const Icon = info.icon;

                    return (
                      <div
                        key={order._id}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6 shadow-sm transition-all space-y-5"
                      >
                        {/* Top Meta: Order ID & Live Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                #{i + 1}
                              </span>
                              <h4 className="font-bold text-lg text-zinc-900">
                                Order #{order.orderNumber}
                              </h4>
                            </div>

                            <div
                              className={`flex items-center gap-2 text-xs font-semibold ${info.color}`}
                            >
                              <div
                                className={`p-1 rounded-full bg-white shadow-xs ${info.animate}`}
                              >
                                <Icon size={16} />
                              </div>
                              <span className="tracking-wide text-sm">
                                {info.label}
                              </span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <div className="font-extrabold text-xl text-zinc-900">
                              £{Number(order.total || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {order.items?.length || 0} Item
                              {(order.items?.length || 0) > 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium text-zinc-500">
                            <span>Progress</span>
                            <span>{info.progress}%</span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
                            <div
                              className={`${info.bg} h-full transition-all duration-500`}
                              style={{ width: `${info.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Direct Large Items List Section */}
                        <div className="space-y-3 pt-2">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Ordered Items ({order.items?.length || 0})
                          </h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {order.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs gap-4"
                              >
                                <div className="flex items-center gap-3.5">
                                  {item.product?.image || item.image ? (
                                    <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-100 shrink-0">
                                      <Image
                                        src={item.product?.image || item.image}
                                        alt={item.name || "Food Item"}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="h-16 w-16 rounded-xl bg-zinc-100 flex items-center justify-center text-xs text-zinc-400 shrink-0 font-medium">
                                      No Image
                                    </div>
                                  )}

                                  <div>
                                    <h6 className="font-bold text-sm text-zinc-900 line-clamp-1">
                                      {item.name ||
                                        item.product?.name ||
                                        "Food Item"}
                                    </h6>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                      Qty:{" "}
                                      <span className="font-semibold text-zinc-700">
                                        {item.quantity || 1}
                                      </span>{" "}
                                      × £{Number(item.price || 0).toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right font-extrabold text-sm text-zinc-900 shrink-0">
                                  £
                                  {Number(
                                    (item.price || 0) * (item.quantity || 1),
                                  ).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
                    {showHistory
                      ? "No past order history found."
                      : "No active live orders right now."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </UserPanelLayout>
    </div>
  );
};

export default Orders;
