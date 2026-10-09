"use client";

import clsx from "clsx";

const STATUS = {
  pending: {
    progress: 10,
    label: "Pending",
  },
  confirmed: {
    progress: 25,
    label: "Confirmed",
  },
  preparing: {
    progress: 55,
    label: "Preparing",
  },
  ready: {
    progress: 85,
    label: "Ready",
  },
  completed: {
    progress: 100,
    label: "Completed",
  },
  cancelled: {
    progress: 100,
    label: "Cancelled",
  },
};

export default function ProgressBar({ status }) {
  const current = STATUS[status] || STATUS.pending;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{current.label}</span>

        <span className="text-gray-500">{current.progress}%</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700",
            status === "cancelled" ? "bg-red-500" : "bg-green-500",
          )}
          style={{
            width: `${current.progress}%`,
          }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-gray-400">
        <span>Pending</span>
        <span>Preparing</span>
        <span>Ready</span>
        <span>Done</span>
      </div>
    </div>
  );
}
