import { hashData } from "@/lib/helpers/hash";
import { connectDB } from "@/lib/databaseconnection";
import FBTrackingSettings from "@/models/FbTrackingSetting.model";

export const buildMetaPayload = (body, settings) => {
  // 1. Phone number formatting for the UK (E.164: country code 44, no
  // leading trunk "0", digits only) — required for Meta's Advanced
  // Matching to actually match a customer by phone.
  const digitsOnly = body.phone ? body.phone.replace(/[^0-9]/g, "") : "";
  const localDigits = digitsOnly.startsWith("0") ? digitsOnly.slice(1) : digitsOnly;
  const formattedPhone = digitsOnly.startsWith("44") ? digitsOnly : `44${localDigits}`;

  // 2. Log receipt for debugging (Fixed placement: must be outside the return object)
  console.log(
    `[META CAPI] Building Payload: ${body.event_name} | ID: ${body.event_id} | Value: ${body.custom_data?.value} GBP`,
  );

  return {
    data: [
      {
        event_name: body.event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.event_id, // CRITICAL for deduplication
        action_source: "website",
        event_source_url: body.url,

        user_data: {
          // Meta API expects these as an ARRAY of hashed strings
          ph: [hashData(formattedPhone)],
          fn: [hashData(body.full_name?.toLowerCase().trim())],

          // ct = City, st = State/Province
          ct: [hashData(body.district?.toLowerCase().trim())], // Usually city goes here
          st: [hashData(body.district?.toLowerCase().trim())],

          // country must be the 2-letter ISO code Meta expects
          country: [hashData("gb")],

          client_ip_address: body.ip_address,
          client_user_agent: body.user_agent,
          fbp: body.fbp || undefined,
          fbc: body.fbc || undefined,
        },

        custom_data: {
          value: Number(body.custom_data?.value || 0),
          currency: "GBP",
          content_ids: body.custom_data?.content_ids || [],
          content_type: "product",
          num_items: body.custom_data?.num_items || 1,
        },
      },
    ],
    // Test event code allows you to see events in 'Test Events' tab instantly
    test_event_code: settings?.meta?.testEventCode || undefined,
  };
};

// Shared by app/api/meta/capi/route.js (client-triggered events) and
// lib/meta/firePurchaseConversion.js (server-triggered Purchase, fired
// directly from the checkout/webhook routes — no HTTP round-trip needed
// since it's already running server-side).
export async function sendMetaCapiEvent(body) {
  await connectDB();

  const settings = await FBTrackingSettings.findOne();

  if (!settings?.meta?.enabled || !settings?.meta?.pixelId || !settings?.meta?.accessToken) {
    return { success: false, skipped: true };
  }

  const url = `https://graph.facebook.com/v18.0/${settings.meta.pixelId}/events?access_token=${settings.meta.accessToken}`;
  const payload = buildMetaPayload(body, settings);

  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();

  if (settings.meta.debug) {
    console.log("META EVENT:", payload);
  }

  return { success: true, data };
}
