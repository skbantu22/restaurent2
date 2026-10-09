import mongoose from "mongoose";
import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { submitStockCount } from "@/lib/inventory/stockCount.service";

// POST /api/admin/inventory/stock-counts/[id]/submit
// Finalizes the count: creates one ADJUSTMENT movement per non-zero
// variance line, atomically. Rejected up front (nothing written) if
// any line beyond the variance threshold is missing a reason.
export async function POST(request, { params }) {
  try {
    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid stock count id.");
    }

    const result = await submitStockCount({ stockCountId: id, userId: auth.userId });

    return response(true, 200, "Stock count submitted successfully.", result);
  } catch (error) {
    return handleInventoryError(error);
  }
}
