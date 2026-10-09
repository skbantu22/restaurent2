import { z } from "zod";
import mongoose from "mongoose";
import { response } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { handleInventoryError } from "@/lib/inventory/apiError";
import { receivePurchaseOrder } from "@/lib/inventory/purchaseOrder.service";

const bodySchema = z.object({
  locationId: z.string().trim().min(1, "locationId is required"),
  lines: z
    .array(
      z.object({
        ingredient: z.string().trim().min(1),
        quantityReceived: z.number().positive(),
      }),
    )
    .min(1, "At least one line is required"),
});

// POST /api/admin/inventory/purchase-orders/[id]/receive
// Body: { locationId, lines: [{ ingredient, quantityReceived }] }
// Supports partial delivery — call once per delivery received.
export async function POST(request, { params }) {
  try {
    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid purchase order id.");
    }

    const payload = await request.json();
    const validate = bodySchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid fields.", validate.error.flatten());
    }

    const result = await receivePurchaseOrder({
      purchaseOrderId: id,
      locationId: validate.data.locationId,
      lines: validate.data.lines,
      userId: auth.userId,
    });

    return response(true, 200, "Goods received successfully.", result);
  } catch (error) {
    return handleInventoryError(error);
  }
}
