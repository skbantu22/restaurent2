import { z } from "zod";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { UNIT_ENUM } from "@/lib/inventory/units";
import IngredientModel from "@/models/Ingredient.model";

const createSchema = z.object({
  ingredientCode: z.string().trim().min(1, "Ingredient code is required"),
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional().default(""),
  category: z.string().trim().optional().default(""),
  purchaseUnit: z.enum(UNIT_ENUM),
  usageUnit: z.enum(UNIT_ENUM),
  conversionFactor: z.number().positive().default(1),
  currentStock: z.number().min(0).default(0),
  minimumStock: z.number().min(0).default(0),
  parLevel: z.number().min(0).default(0),
  maximumStock: z.number().min(0).default(0),
  averageCost: z.number().min(0).default(0),
  lastPurchaseCost: z.number().min(0).default(0),
  supplier: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  active: z.boolean().optional().default(true),
});

// GET /api/admin/inventory/ingredients?search=&category=&active=&page=&limit=
export async function GET(request) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const activeParam = searchParams.get("active");
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      200,
    );

    const filter = {};

    if (activeParam === "true") filter.active = true;
    else if (activeParam === "false") filter.active = false;

    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { ingredientCode: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const [ingredients, total] = await Promise.all([
      IngredientModel.find(filter)
        .populate("supplier", "companyName supplierCode")
        .populate("location", "name code")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      IngredientModel.countDocuments(filter),
    ]);

    return response(true, 200, "Ingredients fetched successfully.", {
      ingredients,
      total,
      page,
      limit,
    });
  } catch (error) {
    return catchError(error);
  }
}

// POST /api/admin/inventory/ingredients
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

    if (data.purchaseUnit === data.usageUnit && data.conversionFactor !== 1) {
      return response(
        false,
        400,
        "conversionFactor must be 1 when purchaseUnit and usageUnit are the same.",
      );
    }

    const ingredient = await IngredientModel.create({
      ...data,
      supplier: data.supplier || null,
      location: data.location || null,
      createdBy: auth.userId || null,
      updatedBy: auth.userId || null,
    });

    return response(true, 201, "Ingredient created successfully.", ingredient);
  } catch (error) {
    return catchError(error);
  }
}
