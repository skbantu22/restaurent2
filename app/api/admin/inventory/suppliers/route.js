import { z } from "zod";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import SupplierModel from "@/models/Supplier.model";

const createSchema = z.object({
  supplierCode: z.string().trim().min(1, "Supplier code is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  contactName: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  address: z.string().trim().optional().default(""),
  paymentTerms: z.string().trim().optional().default(""),
  active: z.boolean().optional().default(true),
  notes: z.string().trim().optional().default(""),
});

// GET /api/admin/inventory/suppliers?search=&active=
export async function GET(request) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const activeParam = searchParams.get("active");

    const filter = {};
    if (activeParam === "true") filter.active = true;
    else if (activeParam === "false") filter.active = false;

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { supplierCode: { $regex: search, $options: "i" } },
      ];
    }

    const suppliers = await SupplierModel.find(filter).sort({ companyName: 1 }).lean();

    return response(true, 200, "Suppliers fetched successfully.", suppliers);
  } catch (error) {
    return catchError(error);
  }
}

// POST /api/admin/inventory/suppliers
export async function POST(request) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const payload = await request.json();
    const validate = createSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error.flatten());
    }

    const supplier = await SupplierModel.create(validate.data);

    return response(true, 201, "Supplier created successfully.", supplier);
  } catch (error) {
    return catchError(error);
  }
}
