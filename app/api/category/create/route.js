import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import CategoryModel from "@/models/category.model";
import { z } from "zod";

export async function POST(request) {
  try {
    await connectDB();

    // JSON Payload রিসিভ করা
    const payload = await request.json();

    // Validation Schema
    const schema = zSchema
      .pick({
        name: true,
        slug: true,
        description: true,
      })
      .extend({
        // Frontend থেকে আসা Media Object ID-র Array (Optional)
        media: z.array(z.string()).optional().default([]),
        isBangladeshiSpecial: z.boolean().optional().default(false),
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

    const { name, slug, description, media, isBangladeshiSpecial } =
      validate.data;

    // Check Duplicate Slug (Soft Deleted ক্যাটাগরি বাদ দিয়ে)
    const exists = await CategoryModel.findOne({
      slug,
      deletedAt: null,
    });

    if (exists) {
      return response(false, 409, "A category with this slug already exists.");
    }

    // Save to Database
    const newCategory = await CategoryModel.create({
      name,
      slug,
      description,
      media, // Array of Media ObjectIDs
      isBangladeshiSpecial,
    });

    return response(true, 201, "Category added successfully.", newCategory);
  } catch (error) {
    console.error("Create Category Error:", error);
    return catchError(error);
  }
}
