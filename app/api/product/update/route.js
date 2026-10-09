import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductModel from "@/models/Product.model";
import { encode } from "entities";
import { z } from "zod";
export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();

    const schema = zSchema
      .pick({
        _id: true,
        name: true,
        slug: true,
        category: true,
        subcategory: true,
        mrp: true,
        sellingPrice: true,
        discountPercentage: true,
        description: true,
        media: true,
        offers: true,
        freeDelivery: true,
      })
      .extend({
        mealBuilderType: z
          .enum(["", "beef", "chicken", "plant"])
          .optional()
          .default(""),
      });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Validation Error", validate.error.format());
    }

    const validatedData = validate.data;

    if (!validatedData?._id) {
      return response(false, 400, "_id missing");
    }

    const getProduct = await ProductModel.findOne({
      deletedAt: null,
      _id: validatedData._id,
    });

    if (!getProduct) {
      return response(false, 404, "Product not found");
    }

    getProduct.name = validatedData.name;
    getProduct.slug = validatedData.slug;
    getProduct.category = validatedData.category;
    getProduct.subcategory = validatedData.subcategory;
    getProduct.mrp = validatedData.mrp;
    getProduct.sellingPrice = validatedData.sellingPrice;
    getProduct.discountPercentage = validatedData.discountPercentage;
    getProduct.description = encode(validatedData.description);
    getProduct.media = validatedData.media;
    getProduct.mealBuilderType = validatedData.mealBuilderType || "";

    await getProduct.save();

    return response(true, 200, "Product updated successfully.");
  } catch (error) {
    console.error("PRODUCT UPDATE ERROR:", error);
    return catchError(error);
  }
}
