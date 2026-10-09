import Order from "@/models/Order";
import ProductVariant from "@/models/ProductVariant";
import dbConnect from "@/lib/db";

export async function createPendingOrder(data) {
  await dbConnect();

  const order = await Order.create({
    ...data,
    paymentMethod: "Stripe",
    paymentStatus: "Pending",
    orderStatus: "Pending",
  });

  return order;
}

export async function markOrderPaid(orderId, paymentIntentId) {
  await dbConnect();

  const order = await Order.findById(orderId);

  if (!order) return;

  order.paymentStatus = "Paid";
  order.orderStatus = "Processing";
  order.paymentIntentId = paymentIntentId;

  await order.save();

  for (const item of order.products) {
    await ProductVariant.findByIdAndUpdate(item.variantId, {
      $inc: {
        stock: -item.quantity,
      },
    });
  }

  return order;
}
