import { z } from "zod";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import StockLocationModel, { STOCK_LOCATION_TYPES } from "@/models/StockLocation.model";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  type: z.enum(STOCK_LOCATION_TYPES).optional().default("OTHER"),
  address: z.string().trim().optional().default(""),
  active: z.boolean().optional().default(true),
});

// GET /api/admin/inventory/locations?active=
export async function GET(request) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const activeParam = request.nextUrl.searchParams.get("active");
    const filter = {};
    if (activeParam === "true") filter.active = true;
    else if (activeParam === "false") filter.active = false;

    const locations = await StockLocationModel.find(filter).sort({ name: 1 }).lean();

    return response(true, 200, "Locations fetched successfully.", locations);
  } catch (error) {
    return catchError(error);
  }
}

// POST /api/admin/inventory/locations
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

    const location = await StockLocationModel.create(validate.data);

    return response(true, 201, "Location created successfully.", location);
  } catch (error) {
    return catchError(error);
  }
}
