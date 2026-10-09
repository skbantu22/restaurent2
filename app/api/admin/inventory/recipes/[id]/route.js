import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { UNIT_ENUM } from "@/lib/inventory/units";
import RecipeModel from "@/models/Recipe.model";

const recipeItemSchema = z.object({
  ingredient: z.string().trim().min(1),
  quantity: z.number().positive(),
  unit: z.enum(UNIT_ENUM),
  wastagePercentage: z.number().min(0).max(100).optional().default(0),
  optional: z.boolean().optional().default(false),
});

const updateSchema = z
  .object({
    name: z.string().trim(),
    items: z.array(recipeItemSchema).min(1),
    notes: z.string().trim(),
    active: z.boolean(),
  })
  .partial();

// GET /api/admin/inventory/recipes/[id]
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid recipe id.");
    }

    const recipe = await RecipeModel.findById(id)
      .populate("product", "name slug sellingPrice")
      .populate("items.ingredient", "name ingredientCode usageUnit averageCost")
      .lean();

    if (!recipe) return response(false, 404, "Recipe not found.");

    return response(true, 200, "Recipe fetched successfully.", recipe);
  } catch (error) {
    return catchError(error);
  }
}

// PATCH /api/admin/inventory/recipes/[id]
// `product` and `version` are immutable — create a new recipe (POST)
// for a new version instead of editing one in place.
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid recipe id.");
    }

    const payload = await request.json();
    const validate = updateSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid fields.", validate.error.flatten());
    }

    const data = validate.data;

    const session = await mongoose.startSession();

    try {
      let updated;

      await session.withTransaction(async () => {
        const recipe = await RecipeModel.findById(id).session(session);
        if (!recipe) return;

        if (data.active === true) {
          await RecipeModel.updateMany(
            { product: recipe.product, active: true, _id: { $ne: recipe._id } },
            { $set: { active: false, updatedBy: auth.userId || null } },
            { session },
          );
        }

        Object.assign(recipe, data, { updatedBy: auth.userId || null });
        await recipe.save({ session });
        updated = recipe;
      });

      if (!updated) return response(false, 404, "Recipe not found.");

      return response(true, 200, "Recipe updated successfully.", updated);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    return catchError(error);
  }
}
