import { redirect } from "next/navigation";
import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";
import OrderReceiptPrint from "@/components/OrderReceiptPrint";

// Printable view for real Order documents (receipt or kitchen ticket).
// Separate from the legacy /admin/print/[id] page, which renders the
// old POSOrder shape and is left untouched.
export default async function Page({ params, searchParams }) {
  const auth = await isAuthenticated(["admin", "manager", "staff"]);
  if (!auth.isAuth) {
    redirect("/auth/login");
  }

  await connectDB();

  const { id } = await params;
  const { type } = await searchParams;

  const order = await OrderModel.findById(id).lean();

  if (!order) {
    return <div className="p-6 text-center">Order not found.</div>;
  }

  const safeOrder = JSON.parse(JSON.stringify(order));

  return <OrderReceiptPrint order={safeOrder} mode={type === "kitchen" ? "kitchen" : "receipt"} />;
}
