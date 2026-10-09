"use client";
import { useEffect } from "react";
import axios from "axios";

export default function PurchaseTracker({ order }) {
  useEffect(() => {
    // ১. অর্ডার ডাটা না থাকলে বা অলরেডি ট্র্যাক হয়ে থাকলে রিটার্ন করবে
    if (!order || !order._id) return;

    const storageKey = `tracked_pur_${order._id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(storageKey))
      return;

    const eventId = `pur_${order._id}`;

    // ২. ডাটা প্রিপারেশন
    const trackingData = {
      value: order.total || 0,
      currency: "GBP",
      content_ids:
        order.items?.map((item) => String(item.productId || item._id)) || [],
      content_type: "product",
      num_items: order.items?.length || 0,
    };

    // ৩. ব্রাউজার পিক্সেল (Meta)
    if (window.fbq) {
      window.fbq("track", "Purchase", trackingData, { eventID: eventId });
    }

    // ৪. সার্ভার CAPI (Meta) — deliveryAddress.city (not the non-existent
    // customer.cityId) so Advanced Matching by location actually works.
    axios
      .post("/api/meta/capi", {
        event_name: "Purchase",
        event_id: eventId,
        url: window.location.href,
        phone: order.customer?.phone || "",
        full_name: order.customer?.name || "",
        district: order.deliveryAddress?.city || "",
        custom_data: trackingData,
      })
      .catch(() => {});

    // ৫. Google Ads conversion — fetch the public (secret-free) tracking
    // config since this component isn't handed it as a prop, then fire
    // if enabled. gtag is loaded by lib/GoogleAdsTag.js in the website
    // layout whenever Google Ads is enabled.
    axios
      .get("/api/tracking/public")
      .then(({ data }) => {
        const googleAds = data?.data?.googleAds;
        if (googleAds?.enabled && googleAds?.conversionId && window.gtag) {
          window.gtag("event", "conversion", {
            send_to: googleAds.conversionLabel
              ? `${googleAds.conversionId}/${googleAds.conversionLabel}`
              : googleAds.conversionId,
            value: order.total || 0,
            currency: "GBP",
            transaction_id: order.orderNumber || String(order._id),
          });
        }
      })
      .catch(() => {});

    // ৬. সেশন স্টোরেজে সেভ করা যাতে ডুপ্লিকেট না হয়
    sessionStorage.setItem(storageKey, "true");
  }, [order?._id]);

  return null;
}
