import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { recordStockCountEntries } from "@/lib/inventory/stockCount.service";
import StockCountModel from "@/models/StockCount.model";

const patchSchema = z.object({
  entries: z
    .array(
      z.object({
        ingredient: z.string().trim().min(1),
        actualStock: z.number().min(0).optional(),
        reason: z.string().trim().optional(),
      }),
    )
    .min(1),
});

// GET /api/admin/inventory/stock-counts/[id]
// Response includes computed variance/costImpact per line for display:
// Ingredient | Expected | Actual | Variance | Cost Impact | Reason
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid stock count id.");
    }

    const stockCount = await StockCountModel.findById(id)
      .populate("location", "name code")
      .populate("lines.ingredient", "name ingredientCode usageUnit")
      .lean();

    if (!stockCount) return response(false, 404, "Stock count not found.");

    const lines = stockCount.lines.map((line) => {
      const variance = line.actualStock === null ? null : line.actualStock - line.expectedStock;
      const costImpact = variance === null ? null : Number((variance * line.unitCostSnapshot).toFixed(2));
      return { ...line, variance, costImpact };
    });

    return response(true, 200, "Stock count fetched successfully.", { ...stockCount, lines });
  } catch (error) {
    return catchError(error);
  }
}

// PATCH /api/admin/inventory/stock-counts/[id]
// Body: { entries: [{ ingredient, actualStock, reason }] }
// Records physically-counted quantities. Does not change stock.
export async function PATCH(request, { params }) {
  try {
    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid stock count id.");
    }

    const payload = await request.json();
    const validate = patchSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid fields.", validate.error.flatten());
    }

    const stockCount = await recordStockCountEntries({
      stockCountId: id,
      entries: validate.data.entries,
    });

    return response(true, 200, "Stock count updated.", stockCount);
  } catch (error) {
    return handleInventoryError(error);
  }
}
