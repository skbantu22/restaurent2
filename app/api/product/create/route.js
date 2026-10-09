import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductModel from "@/models/Product.model";
import { encode } from "entities";
import { z } from "zod";

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();

    // Product Validation Schema
    const schema = zSchema
      .pick({
        name: true,
        slug: true,
        category: true,
        calories: true, // ✅ NEW
        mrp: true,
        sellingPrice: true,
        discountPercentage: true,
        description: true,
        media: true,
        offers: true,
        freeDelivery: true,
      })
      .extend({
        subcategory: z
          .string()
          .optional()
          .nullable()
          .transform((val) => (val && val.trim() !== "" ? val : null)),

        badge: z
          .string()
          .optional()
          .nullable()
          .transform((val) => (val && val.trim() !== "" ? val : null)),

        isMostLoved: z
          .preprocess(
            (val) => val === true || val === "true" || val === 1 || val === "1",
            z.boolean(),
          )
          .default(false),

        mealBuilderType: z
          .enum(["", "beef", "chicken", "plant"])
          .optional()
          .default(""),
      });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      return response(
        false,
        400,
        "Invalid or missing fields.",
        validate.error.flatten(),
      );
    }

    const productData = validate.data;

    const newProduct = await ProductModel.create({
      ...productData,

      description: encode(productData.description || ""),

      // ✅ Calories Save
      calories: productData.calories || "",

      freeDelivery: Boolean(productData.freeDelivery),

      badge: productData.badge,

      isMostLoved: Boolean(productData.isMostLoved),

      mealBuilderType: productData.mealBuilderType || "",
    });

    return response(true, 201, "Product added successfully.", newProduct);
  } catch (error) {
    console.error("PRODUCT CREATE ERROR:", error);
    return catchError(error);
  }
}
