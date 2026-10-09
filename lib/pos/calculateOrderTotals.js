import { addMoney, subMoney, mulMoney } from "@/lib/inventory/money";

// Fallback used only if a caller doesn't pass deliveryFee explicitly.
// Callers (e.g. /api/pos/checkout) should pass the live value from
// RestaurantSettings (lib/settings.server.js) instead of relying on this.
export const POS_DELIVERY_FEE = 3.99;

export class OrderCalculationError extends Error {
  constructor(message) {
    super(message);
    this.name = "OrderCalculationError";
  }
}

/**
 * Computes an order's authoritative totals entirely from server-known
 * data (real product prices looked up from the database) plus a small
 * set of staff-entered inputs (quantities, discount, cash tendered).
 * The client-submitted price for any item is never trusted or even
 * accepted — see itemSchema in /api/pos/checkout, which only accepts
 * {productId, quantity, notes}.
 *
 * @param {object} params
 * @param {{productId: string, quantity: number, notes?: string}[]} params.cartItems
 * @param {Map<string, {name, sellingPrice, media, active, available}>} params.productMap
 *   keyed by String(productId), from a fresh DB lookup
 * @param {"pickup"|"delivery"} params.orderType
 * @param {"fixed"|"percentage"} [params.discountType]
 * @param {number} [params.discountValue]
 * @param {"cash"|"card"} params.paymentMethod
 * @param {number} [params.cashReceived]
 * @param {number} [params.deliveryFee] Flat fee charged for delivery orders;
 *   defaults to POS_DELIVERY_FEE when omitted. Pass the live value from
 *   RestaurantSettings so it stays in sync with the admin's configured fee.
 */
export function calculateOrderTotals({
  cartItems,
  productMap,
  orderType,
  discountType = "fixed",
  discountValue = 0,
  paymentMethod,
  cashReceived,
  deliveryFee: deliveryFeeAmount = POS_DELIVERY_FEE,
}) {
  if (!cartItems?.length) {
    throw new OrderCalculationError("Cart is empty");
  }

  const items = [];

  for (const cartItem of cartItems) {
    const product = productMap.get(String(cartItem.productId));

    if (!product) continue; // silently dropped — surfaced by caller if items ends up empty
    if (product.active === false || product.available === false) {
      throw new OrderCalculationError(`"${product.name}" is currently unavailable.`);
    }

    if (!Number.isInteger(cartItem.quantity) || cartItem.quantity <= 0) {
      throw new OrderCalculationError(`Invalid quantity for "${product.name}".`);
    }

    items.push({
      itemType: "product",
      productId: product._id,
      name: product.name,
      image: product.media?.[0]?.secure_url || "",
      price: Number(product.sellingPrice || 0),
      quantity: cartItem.quantity,
      notes: cartItem.notes || "",
    });
  }

  if (items.length === 0) {
    throw new OrderCalculationError("No valid products found in cart.");
  }

  let subtotal = 0;
  for (const item of items) {
    subtotal = addMoney(subtotal, mulMoney(item.price, item.quantity));
  }

  const deliveryFee = orderType === "delivery" ? deliveryFeeAmount : 0;

  let discount = 0;
  if (discountType === "percentage") {
    const pct = Math.min(Math.max(Number(discountValue) || 0, 0), 100);
    discount = mulMoney(subtotal, pct / 100);
  } else {
    discount = Math.min(Math.max(Number(discountValue) || 0, 0), subtotal);
  }

  const total = Math.max(addMoney(subMoney(subtotal, discount), deliveryFee), 0);

  let changeDue = null;
  if (paymentMethod === "cash") {
    if (cashReceived === null || cashReceived === undefined) {
      throw new OrderCalculationError("cashReceived is required for cash payments.");
    }
    if (cashReceived < total) {
      throw new OrderCalculationError("Cash received is less than the order total.");
    }
    changeDue = subMoney(cashReceived, total);
  }

  return { items, subtotal, deliveryFee, discount, total, changeDue };
}
