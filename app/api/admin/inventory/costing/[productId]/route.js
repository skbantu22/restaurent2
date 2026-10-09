import mongoose from "mongoose";
import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { getRecipeCosting } from "@/lib/inventory/costing.service";

// GET /api/admin/inventory/costing/[productId]
// Returns null (200) if the product has no active recipe yet — this
// is an expected, common state during rollout, not an error.
export async function GET(request, { params }) {
  try {
    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { productId } = await params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return response(false, 400, "Invalid product id.");
    }

    const costing = await getRecipeCosting(productId);

    return response(true, 200, "Recipe costing fetched successfully.", costing);
  } catch (error) {
    return handleInventoryError(error);
  }
}
