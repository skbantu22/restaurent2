import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

// Admin-panel "My Profile" (Settings > My Profile). Any staff role can
// manage their own account; customers use /api/profile instead.
const STAFF_ROLES = ["admin", "manager", "staff"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const toProfile = (user) => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  address: user.address || "",
  city: user.city || "",
  avatar: user.avatar?.url ? { url: user.avatar.url } : null,
  createdAt: user.createdAt,
});

export async function GET() {
  try {
    await connectDB();

    const auth = await isAuthenticated(STAFF_ROLES);
    if (!auth?.isAuth) return response(false, 401, "Unauthorized");

    const user = await UserModel.findOne({ _id: auth.userId, deletedAt: null });
    if (!user) return response(false, 404, "User not found.");

    return response(true, 200, "Profile.", toProfile(user));
  } catch (error) {
    return catchError(error);
  }
}

export async function PUT(request) {
  try {
    await connectDB();

    const auth = await isAuthenticated(STAFF_ROLES);
    if (!auth?.isAuth) return response(false, 401, "Unauthorized");

    const user = await UserModel.findOne({ _id: auth.userId, deletedAt: null });
    if (!user) return response(false, 404, "User not found.");

    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2) {
      return response(false, 400, "Name must be at least 2 characters.");
    }

    user.name = name;
    user.phone = String(formData.get("phone") ?? "").trim();
    user.address = String(formData.get("address") ?? "").trim();
    user.city = String(formData.get("city") ?? "").trim();

    const file = formData.get("file");
    const removeAvatar = formData.get("removeAvatar") === "true";

    if (file && typeof file === "object" && file.size > 0) {
      if (!file.type?.startsWith("image/")) {
        return response(false, 400, "Profile picture must be an image.");
      }
      if (file.size > MAX_AVATAR_BYTES) {
        return response(false, 400, "Profile picture must be under 5 MB.");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const upload = await cloudinary.uploader.upload(
        `data:${file.type};base64,${buffer.toString("base64")}`,
        { upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET },
      );

      const oldPublicId = user.avatar?.public_id;
      user.avatar = { url: upload.secure_url, public_id: upload.public_id };

      if (oldPublicId) {
        cloudinary.api.delete_resources([oldPublicId]).catch(() => {});
      }
    } else if (removeAvatar && user.avatar?.url) {
      const oldPublicId = user.avatar?.public_id;
      user.avatar = undefined;

      if (oldPublicId) {
        cloudinary.api.delete_resources([oldPublicId]).catch(() => {});
      }
    }

    await user.save();

    return response(true, 200, "Profile updated successfully.", toProfile(user));
  } catch (error) {
    return catchError(error);
  }
}
