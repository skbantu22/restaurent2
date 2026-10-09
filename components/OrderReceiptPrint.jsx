"use client";

import { useEffect, useState } from "react";

// Print view for real Order documents (source: website or pos).
// Deliberately separate from components/PrintReceipt.jsx, which
// renders the legacy POSOrder shape (item.qty, no order type/customer
// detail) — left untouched for anything still using it.
//
// mode="receipt": customer-facing, shows prices/totals/payment.
// mode="kitchen": kitchen ticket — items/notes/quantities only, no
// prices, larger type for readability at the pass.
const DEFAULT_SETTINGS = {
  name: "Shawon Food Gate",
  currencySymbol: "£",
  receiptFooterText: "Thank you for your order!",
};

export default function OrderReceiptPrint({ order, mode = "receipt" }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((res) => {
        if (res?.success) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {}); // fall back to DEFAULT_SETTINGS silently
  }, []);

  useEffect(() => {
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, []);

  const currency = settings.currencySymbol;

  if (!order) return <div>Loading...</div>;

  const isKitchen = mode === "kitchen";

  return (
    <div
      className={`w-[80mm] mx-auto p-2 font-mono leading-5 print:w-[80mm] ${
        isKitchen ? "text-[14px]" : "text-[12px]"
      }`}
    >
      <h2 className="text-center font-bold text-base">{settings.name}</h2>
      <p className="text-center text-[10px] uppercase tracking-wide">
        {isKitchen ? "Kitchen Ticket" : "Receipt"}
      </p>

      <hr className="my-2 border-black border-dashed" />

      <p className="font-bold">Order: {order.orderNumber}</p>
      <p>Type: {(order.orderType || "").replace("_", " ").toUpperCase()}</p>
      {order.table ? <p>Table: {order.table}</p> : null}
      <p>{new Date(order.createdAt).toLocaleString("en-GB")}</p>
      <p>Customer: {order.customer?.name}</p>
      {!isKitchen && order.customer?.phone && order.customer.phone !== "N/A" && (
        <p>Phone: {order.customer.phone}</p>
      )}
      {order.orderType === "delivery" && order.deliveryAddress?.address && (
        <p>
          Deliver to: {order.deliveryAddress.address}
          {order.deliveryAddress.postcode ? `, ${order.deliveryAddress.postcode}` : ""}
        </p>
      )}

      <hr className="my-2 border-black border-dashed" />

      {order.items.map((item, i) => (
        <div key={i} className="mb-1.5">
          <div className="flex justify-between font-bold">
            <span className="w-[70%]">
              {item.quantity} x {item.name}
            </span>
            {!isKitchen && <span className="text-right">{currency}{(item.price * item.quantity).toFixed(2)}</span>}
          </div>
          {item.notes && <p className="pl-3 text-[11px] italic">Note: {item.notes}</p>}

          {/* A Custom Meal is one order line — kitchen still needs to
              see exactly what's in it. */}
          {item.itemType === "bundle" && item.items?.length > 0 && (
            <div className="pl-3 mt-0.5">
              {item.items
                .filter((child) => child.itemType !== "category" || isKitchen)
                .map((child, ci) => (
                  <p key={ci} className="text-[11px]">
                    → {child.quantity > 1 ? `${child.quantity}x ` : ""}
                    {child.name}
                  </p>
                ))}
            </div>
          )}
        </div>
      ))}

      {!isKitchen && (
        <>
          <hr className="my-2 border-black border-dashed" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{currency}{order.subtotal.toFixed(2)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{currency}{order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{currency}{order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-black mt-1 pt-1">
            <span>Total</span>
            <span>{currency}{order.total.toFixed(2)}</span>
          </div>

          <hr className="my-2 border-black border-dashed" />
          <p>Payment: {(order.payment?.method || "").toUpperCase()}</p>
          {order.payment?.method === "cash" && (
            <>
              <p>Cash received: {currency}{Number(order.payment.cashReceived || 0).toFixed(2)}</p>
              <p>Change due: {currency}{Number(order.payment.changeDue || 0).toFixed(2)}</p>
            </>
          )}

          <p className="text-center mt-3">{settings.receiptFooterText}</p>
        </>
      )}

      {order.notes && <p className="mt-2 italic">Notes: {order.notes}</p>}
    </div>
  );
}
