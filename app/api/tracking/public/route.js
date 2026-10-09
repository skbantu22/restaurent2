import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import FBTrackingSettingsModel from "@/models/FbTrackingSetting.model";

// Unauthenticated, secret-free subset of ad-tracking config — used by
// client components that need it but can't do a server-side DB read
// (e.g. PurchaseTracker.jsx, rendered on the public /order/success
// page). NEVER include accessToken/testEventCode here.
export async function GET() {
  try {
    await connectDB();

    let settings = await FBTrackingSettingsModel.findOne();
    if (!settings) {
      settings = await FBTrackingSettingsModel.create({});
    }

    return response(true, 200, "Tracking settings fetched successfully.", {
      meta: {
        enabled: settings.meta?.enabled || false,
        pixelId: settings.meta?.pixelId || "",
      },
      googleAds: {
        enabled: settings.googleAds?.enabled || false,
        conversionId: settings.googleAds?.conversionId || "",
        conversionLabel: settings.googleAds?.conversionLabel || "",
      },
    });
  } catch (error) {
    return catchError(error);
  }
}
