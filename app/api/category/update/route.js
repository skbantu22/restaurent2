import { connectDB } from "@/lib/databaseconnection";
import { response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import CategoryModel from "@/models/category.model";
import { NextResponse } from "next/server";
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
        description: true,
        media: true,
      })
      .extend({
        isBangladeshiSpecial: z.boolean().optional(),
      });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or missing fields",
          errors: validate.error.format(),
        },
        { status: 400 },
      );
    }

    const { _id, name, slug, description, media, isBangladeshiSpecial } =
      validate.data;

    const getCategory = await CategoryModel.findOne({ deletedAt: null, _id });

    if (!getCategory) {
      return response(false, 404, "Data not found.");
    }

    getCategory.name = name;
    getCategory.slug = slug;
    getCategory.description = description;
    getCategory.media = media;
    if (typeof isBangladeshiSpecial === "boolean") {
      getCategory.isBangladeshiSpecial = isBangladeshiSpecial;
    }

    await getCategory.save();

    return response(true, 200, "Category updated successfully.");
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
