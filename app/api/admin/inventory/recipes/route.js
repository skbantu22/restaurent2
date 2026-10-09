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

const createSchema = z.object({
  product: z.string().trim().min(1, "product is required"),
  name: z.string().trim().optional().default(""),
  items: z.array(recipeItemSchema).min(1, "Recipe must contain at least one ingredient"),
  notes: z.string().trim().optional().default(""),
  active: z.boolean().optional().default(true),
});

// GET /api/admin/inventory/recipes?product=&active=
export async function GET(request) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const product = searchParams.get("product");
    const activeParam = searchParams.get("active");

    const filter = {};
    if (product) filter.product = product;
    if (activeParam === "true") filter.active = true;
    else if (activeParam === "false") filter.active = false;

    const recipes = await RecipeModel.find(filter)
      .populate("product", "name slug sellingPrice")
      .populate("items.ingredient", "name ingredientCode usageUnit averageCost")
      .sort({ product: 1, version: -1 })
      .lean();

    return response(true, 200, "Recipes fetched successfully.", recipes);
  } catch (error) {
    return catchError(error);
  }
}

// POST /api/admin/inventory/recipes
// Creates a new version for the given product. If `active` is true
// (default), any currently active recipe for the same product is
// deactivated atomically so only one version is ever active at a time.
export async function POST(request) {
  try {
    await connectDB();

    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const payload = await request.json();
    const validate = createSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error.flatten());
    }

    const data = validate.data;

    const session = await mongoose.startSession();

    try {
      let created;

      await session.withTransaction(async () => {
        const latest = await RecipeModel.findOne({ product: data.product })
          .sort({ version: -1 })
          .session(session);

        const nextVersion = latest ? latest.version + 1 : 1;

        if (data.active) {
          await RecipeModel.updateMany(
            { product: data.product, active: true },
            { $set: { active: false, updatedBy: auth.userId || null } },
            { session },
          );
        }

        const docs = await RecipeModel.create(
          [
            {
              ...data,
              version: nextVersion,
              createdBy: auth.userId || null,
              updatedBy: auth.userId || null,
            },
          ],
          { session },
        );

        created = docs[0];
      });

      return response(true, 201, "Recipe created successfully.", created);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    return catchError(error);
  }
}
