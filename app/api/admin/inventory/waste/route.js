import { z } from "zod";
import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { UNIT_ENUM } from "@/lib/inventory/units";
import {
  recordWaste,
  getStockMovements,
  getWasteReport,
  SUGGESTED_WASTE_REASONS,
} from "@/lib/inventory/inventory.service";

const createSchema = z.object({
  ingredientId: z.string().trim().min(1),
  locationId: z.string().trim().min(1),
  quantity: z.number().positive(),
  unit: z.enum(UNIT_ENUM),
  reason: z.string().trim().min(1, "A reason is required to record waste"),
  notes: z.string().trim().optional().default(""),
});

// GET /api/admin/inventory/waste
// Returns the waste log (paginated, same shape as /movements but
// pre-filtered to type=WASTE) plus the suggested reason list and a
// summary report (today/week/month/top wasted/by reason) for a future
// Waste page to render directly.
export async function GET(request) {
  try {
    const { error } = await guardInventoryRequest();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;

    const [log, summary] = await Promise.all([
      getStockMovements({
        type: "WASTE",
        ingredientId: searchParams.get("ingredientId") || undefined,
        locationId: searchParams.get("locationId") || undefined,
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
        page: searchParams.get("page") || undefined,
        limit: searchParams.get("limit") || undefined,
      }),
      getWasteReport(),
    ]);

    return response(true, 200, "Waste log fetched successfully.", {
      ...log,
      summary,
      reasons: SUGGESTED_WASTE_REASONS,
    });
  } catch (error) {
    return handleInventoryError(error);
  }
}

// POST /api/admin/inventory/waste
export async function POST(request) {
  try {
    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const payload = await request.json();
    const validate = createSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error.flatten());
    }

    const data = validate.data;

    const movement = await recordWaste({
      ingredientId: data.ingredientId,
      locationId: data.locationId,
      quantity: data.quantity,
      unit: data.unit,
      reason: data.reason,
      notes: data.notes,
      userId: auth.userId,
    });

    return response(true, 201, "Waste recorded successfully.", movement);
  } catch (error) {
    return handleInventoryError(error);
  }
}
