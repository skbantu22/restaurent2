import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import SupplierModel from "@/models/Supplier.model";

const updateSchema = z
  .object({
    supplierCode: z.string().trim().min(1),
    companyName: z.string().trim().min(1),
    contactName: z.string().trim(),
    phone: z.string().trim(),
    email: z.string().trim().email().or(z.literal("")),
    address: z.string().trim(),
    paymentTerms: z.string().trim(),
    active: z.boolean(),
    notes: z.string().trim(),
  })
  .partial();

// GET /api/admin/inventory/suppliers/[id]
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid supplier id.");
    }

    const supplier = await SupplierModel.findById(id).lean();
    if (!supplier) return response(false, 404, "Supplier not found.");

    return response(true, 200, "Supplier fetched successfully.", supplier);
  } catch (error) {
    return catchError(error);
  }
}

// PATCH /api/admin/inventory/suppliers/[id]
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid supplier id.");
    }

    const payload = await request.json();
    const validate = updateSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid fields.", validate.error.flatten());
    }

    const supplier = await SupplierModel.findByIdAndUpdate(id, validate.data, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!supplier) return response(false, 404, "Supplier not found.");

    return response(true, 200, "Supplier updated successfully.", supplier);
  } catch (error) {
    return catchError(error);
  }
}
