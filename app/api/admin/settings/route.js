import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import { getRestaurantSettings } from "@/lib/settings.server";
import RestaurantSettingsModel from "@/models/RestaurantSettings.model";

export async function GET() {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 401, "Unauthorized.");
    }

    const settings = await getRestaurantSettings();
    return response(true, 200, "Settings fetched successfully.", { settings });
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

    const body = await request.json().catch(() => ({}));

    const settings = await RestaurantSettingsModel.findOneAndUpdate(
      {},
      {
        general: body.general,
        business: body.business,
        orders: body.orders,
        payments: body.payments,
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );

    return response(true, 200, "Settings saved successfully.", { settings });
  } catch (error) {
    return catchError(error);
  }
}
