import { z } from "zod";
import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { startStockCount } from "@/lib/inventory/stockCount.service";
import StockCountModel from "@/models/StockCount.model";
import { connectDB } from "@/lib/databaseconnection";

const createSchema = z.object({
  locationId: z.string().trim().min(1, "locationId is required"),
  ingredientIds: z.array(z.string().trim()).optional(),
  varianceThresholdPercent: z.number().min(0).optional().default(5),
  notes: z.string().trim().optional().default(""),
});

// GET /api/admin/inventory/stock-counts?status=&location=
export async function GET(request) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const filter = {};
    if (searchParams.get("status")) filter.status = searchParams.get("status");
    if (searchParams.get("location")) filter.location = searchParams.get("location");

    const stockCounts = await StockCountModel.find(filter)
      .populate("location", "name code")
      .sort({ createdAt: -1 })
      .lean();

    return response(true, 200, "Stock counts fetched successfully.", stockCounts);
  } catch (error) {
    return handleInventoryError(error);
  }
}

// POST /api/admin/inventory/stock-counts
// Starts a new count: snapshots expected stock for every active
// ingredient (or a chosen subset). No stock is changed here.
export async function POST(request) {
  try {
    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const payload = await request.json();
    const validate = createSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error.flatten());
    }

    const stockCount = await startStockCount({
      locationId: validate.data.locationId,
      ingredientIds: validate.data.ingredientIds,
      varianceThresholdPercent: validate.data.varianceThresholdPercent,
      notes: validate.data.notes,
      userId: auth.userId,
    });

    return response(true, 201, "Stock count started.", stockCount);
  } catch (error) {
    return handleInventoryError(error);
  }
}
