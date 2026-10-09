import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { getAllRecipeCostings } from "@/lib/inventory/costing.service";

// GET /api/admin/inventory/costing
// Recipe costing for every product with an active recipe, sorted by
// food cost % descending — backs the Recipe Costing report.
export async function GET() {
  try {
    const { error } = await guardInventoryRequest();
    if (error) return error;

    const costings = await getAllRecipeCostings();

    return response(true, 200, "Recipe costing fetched successfully.", costings);
  } catch (error) {
    return handleInventoryError(error);
  }
}
