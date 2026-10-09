import { sendMetaCapiEvent } from "@/lib/meta/capi";

// Fires the Meta Purchase conversion server-side, right after an order
// is genuinely confirmed paid (Stripe webhook / COD checkout success) —
// not just when the customer's browser happens to load /order/success.
// Uses the SAME event_id format as the client-side firing in
// PurchaseTracker.jsx (`pur_${order._id}`) so Meta dedupes the two into
// one event instead of double-counting when both fire.
//
// Never throws — a tracking failure must never affect order processing,
// matching this codebase's existing convention for consumeOrderStock/
// sendTelegramOrder.
export async function fireServerPurchaseConversion(order, origin = "") {
  try {
    await sendMetaCapiEvent({
      event_name: "Purchase",
      event_id: `pur_${order._id}`,
      url: origin ? `${origin}/order/success?orderId=${order._id}` : "",
      phone: order.customer?.phone || "",
      full_name: order.customer?.name || "",
      district: order.deliveryAddress?.city || "",
      custom_data: {
        value: order.total || 0,
        content_ids:
          order.items?.map((item) => String(item.productId || item.customId || "")) || [],
        num_items: order.items?.length || 0,
      },
    });
  } catch (error) {
    console.error("Meta server-side purchase conversion failed (non-fatal):", error.message);
  }
}
