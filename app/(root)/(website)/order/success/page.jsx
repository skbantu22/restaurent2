import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";

import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";

import PurchaseTracker from "@/components/ui/Application/website/PurchaseTracker";
import OrderSuccessClient from "@/components/ui/Application/website/OrderSuccessClient";

const money = (amount) => `£${Number(amount || 0).toFixed(2)}`;

export default async function OrderSummaryPage({ searchParams }) {
  const params = await searchParams;
  const id = params?.orderId;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return notFound();
  }

  await connectDB();

  const rawOrder = await OrderModel.findById(id).lean();

  if (!rawOrder) {
    return notFound();
  }

  const order = JSON.parse(JSON.stringify(rawOrder));

  const isPaid = order.payment?.status === "paid";

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <PurchaseTracker order={order} />

      <OrderSuccessClient order={order} />

      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-lg">
        {/* Header */}

        <div className="bg-green-600 text-white p-8 text-center">
          <h1 className="text-3xl font-bold">Thank You!</h1>

          <p className="mt-2">Your order has been received.</p>

          <p className="mt-3 font-mono text-lg">{order.orderNumber}</p>
        </div>

        {/* Customer */}

        <div className="grid md:grid-cols-2 gap-6 p-6 border-b">
          <div>
            <h3 className="font-bold mb-3">Customer</h3>

            <p>{order.customer.name}</p>
            <p>{order.customer.phone}</p>

            {order.customer.email && <p>{order.customer.email}</p>}
          </div>

          <div>
            <h3 className="font-bold mb-3">Delivery Address</h3>

            <p>{order.deliveryAddress?.address}</p>

            <p>{order.deliveryAddress?.city}</p>

            <p>{order.deliveryAddress?.postcode}</p>
          </div>
        </div>

        {/* Order Info */}

        <div className="grid md:grid-cols-3 gap-4 border-b p-6">
          <div>
            <p className="text-gray-500 text-sm">Order Status</p>

            <p className="font-bold capitalize">{order.orderStatus}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Payment Method</p>

            <p className="font-bold uppercase">{order.payment.method}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Payment Status</p>

            <p
              className={`font-bold ${
                isPaid ? "text-green-600" : "text-orange-500"
              }`}
            >
              {order.payment.status}
            </p>
          </div>
        </div>

        {/* Items */}

        <div className="p-6">
          <h2 className="text-xl font-bold mb-5">Ordered Items</h2>

          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between items-center border-b pb-4"
              >
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    className="w-20 h-20 rounded-lg object-cover"
                    alt=""
                  />

                  <div>
                    <h3 className="font-semibold">{item.name}</h3>

                    <p className="text-gray-500">Qty : {item.quantity}</p>

                    {item.notes && (
                      <p className="text-xs text-gray-400">{item.notes}</p>
                    )}
                  </div>
                </div>

                <div className="font-bold">
                  {money(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}

        <div className="bg-gray-50 p-6 space-y-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>{money(order.deliveryFee)}</span>
          </div>

          {order.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-{money(order.discount)}</span>
            </div>
          )}

          <div className="border-t pt-3 flex justify-between text-xl font-bold">
            <span>Total</span>

            <span>{money(order.total)}</span>
          </div>
        </div>

        <div className="p-6 text-center">
          <Link href="/" className="bg-black text-white px-8 py-3 rounded-xl">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
