import axios from "axios";
import { getRestaurantSettings } from "@/lib/settings.server";

const sendTelegramOrder = async (order) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

    // ==============================
    // VALIDATE TELEGRAM CONFIG
    // ==============================
    if (!token) {
      console.error("❌ TELEGRAM_BOT_TOKEN is missing");
      return false;
    }

    if (!chatId) {
      console.error("❌ TELEGRAM_CHAT_ID is missing");
      return false;
    }

    if (!order) {
      console.error("❌ Telegram: Order data is missing");
      return false;
    }

    // Settings fetch failure must never block the order notification —
    // fall back to the historical default symbol.
    let currencySymbol = "£";
    try {
      const settings = await getRestaurantSettings();
      currencySymbol = settings.business.currencySymbol || "£";
    } catch (err) {
      console.error("⚠️ Telegram: failed to load restaurant settings, using default currency symbol:", err.message);
    }

    // ==============================
    // ORDER ITEMS
    // ==============================
    const itemsText =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items
            .map((item) => {
              const quantity = Math.max(1, Number(item.quantity || 1));
              const price = Number(item.price || 0);
              const itemTotal = price * quantity;

              return `• ${item.name || "Unknown Product"} × ${quantity} = ${currencySymbol}${itemTotal.toFixed(2)}`;
            })
            .join("\n")
        : "No items";

    // ==============================
    // ORDER INFORMATION
    // ==============================
    const orderNumber = order.orderNumber || order._id?.toString() || "N/A";

    const customerName = order.customer?.name || "N/A";
    const customerPhone = order.customer?.phone || "N/A";
    const customerEmail = order.customer?.email || "N/A";

    const orderType = (order.orderType || "N/A").toUpperCase();

    const address = order.deliveryAddress?.address || "N/A";
    const city = order.deliveryAddress?.city || "";
    const postcode = order.deliveryAddress?.postcode || "";
    const addressNotes = order.deliveryAddress?.notes || "";

    const paymentMethod = (order.payment?.method || "N/A").toUpperCase();

    const paymentStatus = (order.payment?.status || "N/A").toUpperCase();

    const orderStatus = (order.orderStatus || "placed").toUpperCase();

    // ==============================
    // TELEGRAM MESSAGE
    // ==============================
    const message = `
🔔 NEW ORDER

━━━━━━━━━━━━━━━━━━
🧾 ORDER: #${orderNumber}
━━━━━━━━━━━━━━━━━━

👤 Customer: ${customerName}
📞 Phone: ${customerPhone}
📧 Email: ${customerEmail}

📦 Order Type: ${orderType}

━━━━━━━━━━━━━━━━━━
📍 DELIVERY ADDRESS
━━━━━━━━━━━━━━━━━━

${address}
${city}
${postcode}
${addressNotes ? `📝 Address Note: ${addressNotes}` : ""}

━━━━━━━━━━━━━━━━━━
🛒 ITEMS
━━━━━━━━━━━━━━━━━━

${itemsText}

━━━━━━━━━━━━━━━━━━
💰 ORDER SUMMARY
━━━━━━━━━━━━━━━━━━

💰 Subtotal: ${currencySymbol}${Number(order.subtotal || 0).toFixed(2)}
🚚 Delivery: ${currencySymbol}${Number(order.deliveryFee || 0).toFixed(2)}
🎟 Discount: ${currencySymbol}${Number(order.discount || 0).toFixed(2)}

💵 TOTAL: ${currencySymbol}${Number(order.total || 0).toFixed(2)}

━━━━━━━━━━━━━━━━━━
💳 PAYMENT
━━━━━━━━━━━━━━━━━━

💳 Method: ${paymentMethod}
💰 Status: ${paymentStatus}

━━━━━━━━━━━━━━━━━━
📌 ORDER STATUS
━━━━━━━━━━━━━━━━━━

${orderStatus}

━━━━━━━━━━━━━━━━━━
`;

    // ==============================
    // TELEGRAM API
    // ==============================
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📤 Sending order to Telegram...");
    console.log("📌 Chat ID:", chatId);
    console.log("🧾 Order:", orderNumber);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const response = await axios.post(
      telegramUrl,
      {
        chat_id: chatId,
        text: message,
      },
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    // ==============================
    // SUCCESS
    // ==============================
    if (response.data?.ok === true) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ Telegram notification sent successfully");
      console.log("🧾 Order:", orderNumber);
      console.log("📨 Message ID:", response.data?.result?.message_id);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return true;
    }

    // ==============================
    // TELEGRAM API ERROR
    // ==============================
    console.error("❌ Telegram API returned unsuccessful response:");
    console.error(response.data);

    return false;
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ TELEGRAM NOTIFICATION ERROR");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (error.response) {
      // Telegram returned an error response
      console.error("Status:", error.response.status);
      console.error("Telegram response:", error.response.data);
    } else if (error.request) {
      // Request sent but no response
      console.error("❌ Request sent but no response received");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
    } else {
      // Axios/setup error
      console.error("❌ Axios error:", error.message);
    }

    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Telegram failure should NOT break order creation
    return false;
  }
};

export default sendTelegramOrder;
