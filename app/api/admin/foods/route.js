import mongoose from "mongoose";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductModel from "@/models/Product.model";
import RecipeModel from "@/models/Recipe.model";
import { UNIT_ENUM } from "@/lib/inventory/units";

const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const foodSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  category: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Category is required"),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  discountType: z.enum(["amount", "percent"]).default("amount"),
  discount: z.coerce.number().min(0).default(0),
  vat: z.coerce.number().min(0).max(100).default(0),
  description: z.string().trim().optional().default(""),
  media: z.string().optional().nullable(),
  badge: z.string().trim().optional().default(""),
  isMostLoved: z.boolean().optional().default(false),
  available: z.boolean().optional().default(true),
  recipe: z
    .array(z.object({ ingredient: z.string(), unit: z.enum(UNIT_ENUM), quantity: z.coerce.number().positive() }))
    .optional()
    .default([]),
});

// POST /api/admin/foods — AmarSolution-style "Add Food": price, discount
// (amount or %), VAT, optional image/description and an optional recipe.
export async function POST(request) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const parsed = foodSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return response(false, 400, parsed.error.issues[0]?.message || "Please check the food details.");
    const d = parsed.data;

    const discountAmount = d.discountType === "percent" ? (d.price * Math.min(d.discount, 100)) / 100 : Math.min(d.discount, d.price);
    const sellingPrice = Math.round((d.price - discountAmount) * 100) / 100;
    const discountPercentage = d.price > 0 ? Math.round((discountAmount / d.price) * 100) : 0;

    let slug = slugify(d.name) || `food-${Date.now()}`;
    if (await ProductModel.exists({ slug })) slug = `${slug}-${Date.now().toString(36)}`;

    const product = await ProductModel.create({
      name: d.name,
      slug,
      category: d.category,
      mrp: d.price,
      sellingPrice,
      discountPercentage,
      taxRate: d.vat,
      description: d.description || `${d.name}, freshly prepared to order.`,
      media: d.media && mongoose.Types.ObjectId.isValid(d.media) ? [d.media] : [],
      badge: d.badge,
      isMostLoved: d.isMostLoved,
      available: d.available,
      active: true,
      onlineVisible: true,
      posVisible: true,
    });

    const items = d.recipe.filter((r) => mongoose.Types.ObjectId.isValid(r.ingredient));
    if (items.length) {
      await RecipeModel.create({
        product: product._id,
        name: `${d.name} recipe`,
        version: 1,
        active: true,
        items: items.map((r) => ({ ingredient: r.ingredient, quantity: r.quantity, unit: r.unit, wastagePercentage: 0, optional: false })),
        createdBy: auth.userId || null,
      });
    }

    return response(true, 201, "Food added.", { _id: product._id, slug: product.slug, sellingPrice, recipeItems: items.length });
  } catch (error) {
    return catchError(error);
  }
}
