import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import StockLocationModel, { STOCK_LOCATION_TYPES } from "@/models/StockLocation.model";

// Added in Phase 3: without this route there was no way to designate
// which StockLocation website/COD orders should consume from — see
// getDefaultStockLocation() in lib/inventory/inventory.service.js.

const updateSchema = z
  .object({
    name: z.string().trim().min(1),
    code: z.string().trim().min(1),
    type: z.enum(STOCK_LOCATION_TYPES),
    address: z.string().trim(),
    active: z.boolean(),
    isDefault: z.boolean(),
  })
  .partial();

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid location id.");
    }

    const location = await StockLocationModel.findById(id).lean();
    if (!location) return response(false, 404, "Location not found.");

    return response(true, 200, "Location fetched successfully.", location);
  } catch (error) {
    return catchError(error);
  }
}

// Setting isDefault: true atomically clears isDefault on every other
// location first, so exactly one default ever exists.
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid location id.");
    }

    const payload = await request.json();
    const validate = updateSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid fields.", validate.error.flatten());
    }

    const data = validate.data;

    if (data.isDefault === true) {
      await StockLocationModel.updateMany(
        { _id: { $ne: id }, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const location = await StockLocationModel.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!location) return response(false, 404, "Location not found.");

    return response(true, 200, "Location updated successfully.", location);
  } catch (error) {
    return catchError(error);
  }
}
