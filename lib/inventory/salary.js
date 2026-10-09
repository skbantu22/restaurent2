import { z } from "zod";

// Shared validation for Inventory > Staff Salary API routes
const money = z.coerce.number().min(0, "Must be 0 or more");

export const salarySchema = z.object({
  staff: z.string().trim().regex(/^[a-f\d]{24}$/i).nullable().optional().or(z.literal("")),
  staffName: z.string().trim().min(1, "Staff name is required"),
  position: z.string().trim().optional().default(""),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM"),
  baseSalary: money,
  bonus: money.optional().default(0),
  deductions: money.optional().default(0),
  paymentStatus: z.enum(["pending", "paid"]).optional().default("pending"),
  paymentMethod: z.enum(["cash", "bank", "other"]).optional().default("bank"),
  paidDate: z.string().trim().optional().or(z.literal("")).nullable(),
  note: z.string().trim().optional().default(""),
});

export function toDoc(data) {
  const doc = { ...data, staff: data.staff || null };
  if (doc.paymentStatus === "paid") {
    doc.paidDate = data.paidDate ? new Date(data.paidDate) : new Date();
  } else {
    doc.paidDate = null;
  }
  return doc;
}
