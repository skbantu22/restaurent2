import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { UNIT_ENUM } from "@/lib/inventory/units";
import IngredientModel from "@/models/Ingredient.model";

const updateSchema = z
  .object({
    ingredientCode: z.string().trim().min(1),
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    description: z.string().trim(),
    category: z.string().trim(),
    purchaseUnit: z.enum(UNIT_ENUM),
    usageUnit: z.enum(UNIT_ENUM),
    conversionFactor: z.number().positive(),
    minimumStock: z.number().min(0),
    parLevel: z.number().min(0),
    maximumStock: z.number().min(0),
    supplier: z.string().trim().nullable(),
    location: z.string().trim().nullable(),
    active: z.boolean(),
  })
  .partial();

// GET /api/admin/inventory/ingredients/[id]
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid ingredient id.");
    }

    const ingredient = await IngredientModel.findById(id)
      .populate("supplier", "companyName supplierCode")
      .populate("location", "name code")
      .lean();

    if (!ingredient) {
      return response(false, 404, "Ingredient not found.");
    }

    return response(true, 200, "Ingredient fetched successfully.", ingredient);
  } catch (error) {
    return catchError(error);
  }
}

// PATCH /api/admin/inventory/ingredients/[id]
// Note: currentStock is intentionally NOT editable here. Any change to
// currentStock must go through lib/inventory/inventory.service.js (an
// ADJUSTMENT/COUNT/PURCHASE/etc. movement) so the ledger stays the
// single source of truth for every stock change, per the audit's core
// safety rule ("never silently modify currentStock").
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid ingredient id.");
    }

    const payload = await request.json();

    if ("currentStock" in payload) {
      return response(
        false,
        400,
        "currentStock cannot be edited directly. Use a stock adjustment/count/purchase instead.",
      );
    }

    const validate = updateSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid fields.", validate.error.flatten());
    }

    const updates = { ...validate.data, updatedBy: auth.userId || null };

    const ingredient = await IngredientModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!ingredient) {
      return response(false, 404, "Ingredient not found.");
    }

    return response(true, 200, "Ingredient updated successfully.", ingredient);
  } catch (error) {
    return catchError(error);
  }
}

// DELETE /api/admin/inventory/ingredients/[id]
// Soft delete only (active=false). Ingredients are referenced by
// historical StockMovement rows and Recipe items — hard-deleting would
// corrupt the audit trail and break recipe lookups.
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid ingredient id.");
    }

    const ingredient = await IngredientModel.findByIdAndUpdate(
      id,
      { active: false, updatedBy: auth.userId || null },
      { returnDocument: "after" },
    );

    if (!ingredient) {
      return response(false, 404, "Ingredient not found.");
    }

    return response(true, 200, "Ingredient deactivated successfully.", ingredient);
  } catch (error) {
    return catchError(error);
  }
}
