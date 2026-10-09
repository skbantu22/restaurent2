import { response, catchError } from "@/lib/helperfunction";
import { getRestaurantSettings } from "@/lib/settings.server";

// Unauthenticated, display-only subset of restaurant settings — no
// secrets here, just what receipts/labels/kitchen tickets need to render
// (components/OrderReceiptPrint.jsx, components/BarcodeLabel.jsx) and
// what the POS/website checkout screens need to preview a total before
// submit (app/(root)/(admin)/admin/pos/page.jsx) — the server always
// recalculates the authoritative total regardless. Full settings (and
// the ability to change them) stay behind /api/admin/settings.
export async function GET() {
  try {
    const settings = await getRestaurantSettings();

    return response(true, 200, "Settings fetched successfully.", {
      name: settings.general.name,
      phone: settings.general.phone,
      email: settings.general.email,
      address: settings.general.address,
      currencySymbol: settings.business.currencySymbol,
      receiptFooterText: settings.orders.receiptFooterText,
      deliveryFee: settings.business.deliveryFee,
      openingHours: settings.business.openingHours,
    });
  } catch (error) {
    return catchError(error);
  }
}
