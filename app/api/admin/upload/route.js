import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import cloudinary from "@/lib/cloudinary";
import MediaModel from "@/models/Media.model";

// POST /api/admin/upload (multipart, field "file") — uploads one image to
// Cloudinary and saves it to the media library. Returns { _id, url }.
export async function POST(request) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return response(false, 400, "Please choose an image.");
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) return response(false, 400, "Only JPG, PNG, WEBP, GIF or AVIF images.");
    if (file.size > 5 * 1024 * 1024) return response(false, 400, "Image must be 5 MB or smaller.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "shawon-food-gate/foods", resource_type: "image" }, (err, res) => (err ? reject(err) : resolve(res)))
        .end(buffer);
    });

    await connectDB();
    const title = String(form.get("title") || file.name || "Food image").slice(0, 120);
    const media = await MediaModel.create({
      asset_id: uploaded.asset_id,
      public_id: uploaded.public_id,
      secure_url: uploaded.secure_url,
      path: uploaded.secure_url,
      thumbnail_url: uploaded.secure_url,
      title,
      alt: title,
    });

    return response(true, 201, "Image uploaded.", { _id: media._id, url: media.secure_url });
  } catch (error) {
    return catchError(error);
  }
}
