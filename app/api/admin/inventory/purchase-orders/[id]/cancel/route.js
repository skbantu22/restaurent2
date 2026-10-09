import mongoose from "mongoose";
import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { cancelPurchaseOrder } from "@/lib/inventory/purchaseOrder.service";

// POST /api/admin/inventory/purchase-orders/[id]/cancel
export async function POST(request, { params }) {
  try {
    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid purchase order id.");
    }

    const purchaseOrder = await cancelPurchaseOrder({ purchaseOrderId: id, userId: auth.userId });

    return response(true, 200, "Purchase order cancelled.", purchaseOrder);
  } catch (error) {
    return handleInventoryError(error);
  }
}
