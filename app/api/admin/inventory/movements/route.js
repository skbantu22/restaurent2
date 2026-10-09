import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { getStockMovements } from "@/lib/inventory/inventory.service";

// GET /api/admin/inventory/movements
// Optional filters: ingredientId, locationId, type, referenceType,
// referenceId, from, to, page, limit
export async function GET(request) {
  try {
    const { error } = await guardInventoryRequest();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;

    const result = await getStockMovements({
      ingredientId: searchParams.get("ingredientId") || undefined,
      locationId: searchParams.get("locationId") || undefined,
      type: searchParams.get("type") || undefined,
      referenceType: searchParams.get("referenceType") || undefined,
      referenceId: searchParams.get("referenceId") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    return response(true, 200, "Stock movements fetched successfully.", result);
  } catch (error) {
    return handleInventoryError(error);
  }
}
