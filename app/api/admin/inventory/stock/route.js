import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { getStock } from "@/lib/inventory/inventory.service";

// GET /api/admin/inventory/stock
// GET /api/admin/inventory/stock?ingredientId=...
// Returns current stock levels + computed status (OK / LOW_STOCK /
// OUT_OF_STOCK / OVERSTOCKED) for every active ingredient, or a single
// ingredient when ingredientId is provided.
export async function GET(request) {
  try {
    const { error } = await guardInventoryRequest();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const ingredientId = searchParams.get("ingredientId") || undefined;
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const stock = await getStock({ ingredientId, activeOnly });

    return response(true, 200, "Stock fetched successfully.", stock);
  } catch (error) {
    return handleInventoryError(error);
  }
}
