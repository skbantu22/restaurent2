"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import useFetch from "@/hooks/useFetch";
import { useMemo } from "react";
import Image from "next/image";
import notFound from "@/public/assets/not-found.png";

// Mirrors the badge coloring used on the orders board/table
// (components/ui/Application/Admin/OrderBoard.jsx) — kept here as plain
// Tailwind classes since this file isn't wrapped in MUI's ThemeProvider.
const STATUS_BADGE_CLASS = {
  placed: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  preparing: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ready: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  out_for_delivery: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const OrderStatusBadge = ({ status }) => (
  <span
    className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
      STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.placed
    }`}
  >
    {(status || "placed").replace("_", " ")}
  </span>
);

const LatestOrder = () => {
  const { data, error } = useFetch("/api/dashboard/admin/latest-order");
  const latestOrder = useMemo(() => (data?.success ? data.data : []), [data]);

  if (!data && !error)
    return (
      <div className="h-full w-full flex justify-center items-center">
        Loading...
      </div>
    );

  if (!latestOrder.length)
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Image src={notFound} alt="No order" width={120} />
        <p className="text-gray-500 mt-2">No latest orders found</p>
      </div>
    );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order Id</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Total Item</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {latestOrder.map((order) => (
          <TableRow key={order._id} className="hover:bg-muted/50">
            <TableCell>{order.orderNumber}</TableCell>

            <TableCell>
              {order.payment?.method?.toUpperCase() || "N/A"}
            </TableCell>

            <TableCell>{order.items?.length || 0}</TableCell>

            <TableCell>
              <OrderStatusBadge status={order.orderStatus} />
            </TableCell>

            <TableCell>£{Number(order.total || 0).toFixed(2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default LatestOrder;
