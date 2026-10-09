"use client";

import {
  CircleDashed,
  BadgeCheck,
  ChefHat,
  PackageCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const STATUS = {
  pending: {
    label: "Pending",
    icon: CircleDashed,
    className: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },

  confirmed: {
    label: "Confirmed",
    icon: BadgeCheck,
    className: "bg-blue-100 text-blue-700 border-blue-300",
  },

  preparing: {
    label: "Preparing",
    icon: ChefHat,
    className: "bg-orange-100 text-orange-700 border-orange-300",
  },

  ready: {
    label: "Ready",
    icon: PackageCheck,
    className: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },

  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 border-green-300",
  },

  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-red-100 text-red-700 border-red-300",
  },
};

export default function StatusBadge({ status = "pending" }) {
  const current = STATUS[status] || STATUS.pending;

  const Icon = current.icon;

  return (
    <div
      className={`
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        px-3
        py-1.5
        text-sm
        font-semibold
        ${current.className}
      `}
    >
      <Icon size={16} />

      {current.label}
    </div>
  );
}
