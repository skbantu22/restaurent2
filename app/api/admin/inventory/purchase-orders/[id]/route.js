import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { UNIT_ENUM } from "@/lib/inventory/units";
import PurchaseOrderModel from "@/models/PurchaseOrder.model";

const itemSchema = z.object({
  ingredient: z.string().trim().min(1),
  orderedQuantity: z.number().positive(),
  purchaseUnit: z.enum(UNIT_ENUM),
  purchasePrice: z.number().min(0),
});

const updateSchema = z
  .object({
    supplier: z.string().trim().min(1),
    items: z.array(itemSchema).min(1),
    expectedDeliveryDate: z.string().datetime().nullable(),
    vatRate: z.number().min(0).max(100),
    notes: z.string().trim(),
  })
  .partial();

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid purchase order id.");
    }

    const purchaseOrder = await PurchaseOrderModel.findById(id)
      .populate("supplier", "companyName supplierCode")
      .populate("items.ingredient", "name ingredientCode usageUnit purchaseUnit")
      .lean();

    if (!purchaseOrder) return response(false, 404, "Purchase order not found.");

    return response(true, 200, "Purchase order fetched successfully.", purchaseOrder);
  } catch (error) {
    return catchError(error);
  }
}

// PATCH /api/admin/inventory/purchase-orders/[id]
// Only DRAFT purchase orders may be edited — once SENT, use the
// send/cancel/receive actions instead of editing line items in place.
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid purchase order id.");
    }

    const payload = await request.json();
    const validate = updateSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid fields.", validate.error.flatten());
    }

    const purchaseOrder = await PurchaseOrderModel.findById(id);
    if (!purchaseOrder) return response(false, 404, "Purchase order not found.");

    if (purchaseOrder.status !== "DRAFT") {
      return response(
        false,
        400,
        `Cannot edit a purchase order with status ${purchaseOrder.status}. Only DRAFT orders can be edited.`,
      );
    }

    Object.assign(purchaseOrder, validate.data);
    await purchaseOrder.save();

    return response(true, 200, "Purchase order updated successfully.", purchaseOrder);
  } catch (error) {
    return catchError(error);
  }
}
