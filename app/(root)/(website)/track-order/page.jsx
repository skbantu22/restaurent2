"use client";
import { useState } from "react";
import axios from "axios";
import {
  Search,
  Loader2,
  Clock3,
  PackageCheck,
  CookingPot,
  Bike,
  CircleCheckBig,
  XCircle,
} from "lucide-react";

const STATUS = {
  placed: {
    label: "Order Placed",
    color: "text-amber-500",
    bg: "bg-amber-500",
    icon: Clock3,
  },
  preparing: {
    label: "Preparing",
    color: "text-orange-500",
    bg: "bg-orange-500",
    icon: CookingPot,
  },
  ready: {
    label: "Ready",
    color: "text-sky-500",
    bg: "bg-sky-500",
    icon: PackageCheck,
  },
  delivering: {
    label: "On the way",
    color: "text-blue-600",
    bg: "bg-blue-600",
    icon: Bike,
  },
  delivered: {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-600",
    icon: CircleCheckBig,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-500",
    bg: "bg-red-500",
    icon: XCircle,
  },
};

export default function TrackOrderPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrderData(null);

    try {
      const { data } = await axios.get(
        `/api/track-order?query=${searchQuery.trim()}&phone=${phone.trim()}`,
      );
      setOrderData(data);
    } catch (err) {
      setError("Order not found. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const currentStatusInfo = orderData
    ? STATUS[orderData.currentStatus] || STATUS.placed
    : STATUS.placed;
  const CurrentIcon = currentStatusInfo.icon;

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold">Track your order</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Enter your order details below
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleTrack} className="space-y-5">
          <input
            type="text"
            placeholder="Order ID or Number"
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Phone Number"
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <button
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <>
                Track Order <Search size={16} />
              </>
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 mt-4 font-medium">{error}</p>
        )}

        {/* Result */}
        {orderData && (
          <div className="mt-10">
            {/* Status */}
            <div className="mb-6">
              <p className="text-xs text-zinc-400 uppercase mb-1">
                Current Status
              </p>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full capitalize bg-zinc-100 ${currentStatusInfo.color}`}
              >
                <CurrentIcon size={14} />
                <span>{currentStatusInfo.label}</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              {orderData.history.map((event, index) => {
                const eventStatusInfo = STATUS[event.status] || STATUS.placed;
                const EventIcon = eventStatusInfo.icon;

                return (
                  <div key={index} className="flex gap-4">
                    {/* Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
                          index === 0 ? eventStatusInfo.bg : "bg-zinc-300"
                        }`}
                      >
                        <EventIcon size={12} />
                      </div>
                      {index !== orderData.history.length - 1 && (
                        <div className="w-px h-10 bg-zinc-200 mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4
                          className={`text-sm font-medium capitalize ${
                            index === 0 ? "text-black" : "text-zinc-400"
                          }`}
                        >
                          {eventStatusInfo.label}
                        </h4>
                        <span className="text-xs text-zinc-400">
                          {new Date(event.createdAt).toLocaleDateString(
                            "en-BD",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>

                      <p
                        className={`text-xs mt-1 ${
                          index === 0 ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        {event.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
