import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import FBTrackingSettingsModel from "@/models/FbTrackingSetting.model";

// Full read/write of ad-tracking config (Meta Pixel + Google Ads),
// including the secret Meta access token — admin-only. The public,
// secret-free subset lives at /api/tracking/public for client tracking
// components that can't do a server-side DB read.
export async function GET() {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 401, "Unauthorized.");
    }

    await connectDB();

    let settings = await FBTrackingSettingsModel.findOne();
    if (!settings) {
      settings = await FBTrackingSettingsModel.create({});
    }

    return response(true, 200, "Tracking settings fetched successfully.", { settings });
  } catch (error) {
    return catchError(error);
  }
}

export async function POST(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 401, "Unauthorized.");
    }

    await connectDB();

    const body = await request.json();

    const settings = await FBTrackingSettingsModel.findOneAndUpdate(
      {},
      {
        meta: body.meta,
        googleAds: body.googleAds,
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );

    return response(true, 200, "Tracking settings saved successfully.", { settings });
  } catch (error) {
    return catchError(error);
  }
}
