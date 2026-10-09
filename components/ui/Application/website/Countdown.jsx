"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";

export default function Countdown({
  estimatedMinutes = 20,
  estimatedUpdatedAt,
}) {
  const getRemaining = () => {
    if (!estimatedUpdatedAt) return estimatedMinutes * 60;

    const updated = new Date(estimatedUpdatedAt).getTime();
    const now = Date.now();

    const passed = Math.floor((now - updated) / 1000);

    return Math.max(estimatedMinutes * 60 - passed, 0);
  };

  const [remaining, setRemaining] = useState(getRemaining());

  useEffect(() => {
    setRemaining(getRemaining());

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [estimatedMinutes, estimatedUpdatedAt]);

  const time = useMemo(() => {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return {
      minutes,
      seconds,
    };
  }, [remaining]);

  const expired = remaining <= 0;

  return (
    <div className="flex items-center justify-between rounded-xl border bg-white p-3">
      <div className="flex items-center gap-2">
        <Clock3
          size={20}
          className={expired ? "text-red-500" : "text-green-600"}
        />

        <div>
          <p className="text-xs text-gray-500">Estimated Time Left</p>

          <p
            className={`text-lg font-bold ${
              expired ? "text-red-500" : "text-green-600"
            }`}
          >
            {expired
              ? "Time Over"
              : `${time.minutes}m ${String(time.seconds).padStart(2, "0")}s`}
          </p>
        </div>
      </div>

      {!expired && (
        <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Live
        </div>
      )}
    </div>
  );
}
