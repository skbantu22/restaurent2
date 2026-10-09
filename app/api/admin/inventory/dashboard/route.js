import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { getInventoryDashboardSummary } from "@/lib/inventory/inventory.service";

// GET /api/admin/inventory/dashboard
// Data-only endpoint (no UI in this phase): total ingredients, total
// inventory value, low/out-of-stock/overstocked counts + lists, and
// recent movements/waste. Intended to back a future dashboard widget.
export async function GET() {
  try {
    const { error } = await guardInventoryRequest();
    if (error) return error;

    const summary = await getInventoryDashboardSummary();

    return response(true, 200, "Inventory summary fetched successfully.", summary);
  } catch (error) {
    return handleInventoryError(error);
  }
}
