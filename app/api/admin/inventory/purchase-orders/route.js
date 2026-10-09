import { z } from "zod";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import { UNIT_ENUM } from "@/lib/inventory/units";
import PurchaseOrderModel, { PURCHASE_ORDER_STATUSES } from "@/models/PurchaseOrder.model";

const itemSchema = z.object({
  ingredient: z.string().trim().min(1),
  orderedQuantity: z.number().positive(),
  purchaseUnit: z.enum(UNIT_ENUM),
  purchasePrice: z.number().min(0),
});

const createSchema = z.object({
  supplier: z.string().trim().min(1, "supplier is required"),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
  vatRate: z.number().min(0).max(100).optional().default(0),
  notes: z.string().trim().optional().default(""),
});

// GET /api/admin/inventory/purchase-orders?status=&supplier=
export async function GET(request) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const supplier = searchParams.get("supplier");

    const filter = {};
    if (status && PURCHASE_ORDER_STATUSES.includes(status)) filter.status = status;
    if (supplier) filter.supplier = supplier;

    const purchaseOrders = await PurchaseOrderModel.find(filter)
      .populate("supplier", "companyName supplierCode")
      .populate("items.ingredient", "name ingredientCode usageUnit")
      .sort({ createdAt: -1 })
      .lean();

    return response(true, 200, "Purchase orders fetched successfully.", purchaseOrders);
  } catch (error) {
    return catchError(error);
  }
}

// POST /api/admin/inventory/purchase-orders
// Always created as DRAFT. Stock is never affected by creating a PO.
export async function POST(request) {
  try {
    await connectDB();

    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const payload = await request.json();
    const validate = createSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error.flatten());
    }

    const data = validate.data;

    const purchaseOrder = await PurchaseOrderModel.create({
      ...data,
      status: "DRAFT",
      createdBy: auth.userId || null,
    });

    return response(true, 201, "Purchase order created successfully.", purchaseOrder);
  } catch (error) {
    return catchError(error);
  }
}
