import { z } from "zod";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import RestaurantSettingsModel from "@/models/RestaurantSettings.model";
import { getRestaurantSettings } from "@/lib/settings.server";

// GET/PUT /api/admin/floor — dine-in tables and waiter names
export async function GET() {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    const s = await getRestaurantSettings();
    return response(true, 200, "Floor.", { tables: s.tables || [], waiters: s.waiters || [] });
  } catch (error) {
    return catchError(error);
  }
}

const listSchema = z.array(z.string().trim().min(1).max(40)).max(200);
const bodySchema = z.object({ tables: listSchema.optional(), waiters: listSchema.optional() });

export async function PUT(request) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return response(false, 400, "Names must be 1–40 characters.");
    const update = {};
    for (const k of ["tables", "waiters"]) {
      if (parsed.data[k]) {
        const uniq = [...new Map(parsed.data[k].map((n) => [n.toLowerCase(), n])).values()];
        update[k] = uniq;
      }
    }
    await getRestaurantSettings(); // make sure the settings document exists
    const s = await RestaurantSettingsModel.findOneAndUpdate({}, { $set: update }, { new: true });
    return response(true, 200, "Saved.", { tables: s.tables, waiters: s.waiters });
  } catch (error) {
    return catchError(error);
  }
}
