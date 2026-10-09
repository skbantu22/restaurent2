"use client";

import Link from "next/link";
import { Clock3, ChefHat, MapPinned } from "lucide-react";

import Countdown from "./Countdown";
import ProgressBar from "./ProgressBar";
import StatusBadge from "./StatusBadge";

export default function LiveOrderCard({ order }) {
  return (
    <div className="space-y-5 p-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Current Status</p>

          <StatusBadge status={order.orderStatus} />
        </div>

        <ChefHat className="text-green-600" size={32} />
      </div>

      {/* Progress */}
      <ProgressBar status={order.orderStatus} />

      {/* Countdown */}
      <div className="rounded-xl border bg-green-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Clock3 size={18} className="text-green-600" />

          <span className="font-medium">Estimated Time</span>
        </div>

        <Countdown
          estimatedMinutes={order.estimatedMinutes}
          estimatedUpdatedAt={order.estimatedUpdatedAt}
        />
      </div>

      {/* Order Number */}
      <div className="rounded-xl border p-3">
        <p className="text-xs text-gray-500">Order Number</p>

        <h3 className="font-bold">{order.orderNumber}</h3>
      </div>

      {/* Delivery Type */}
      <div className="flex items-center gap-2 text-sm">
        <MapPinned size={18} className="text-green-600" />

        <span className="capitalize">{order.orderType}</span>
      </div>

      {/* Button */}
      <Link
        href={`/track-order/${order._id}`}
        className="
          block
          rounded-xl
          bg-green-600
          py-3
          text-center
          font-semibold
          text-white
          transition
          hover:bg-green-700
        "
      >
        Track Order
      </Link>
    </div>
  );
}
