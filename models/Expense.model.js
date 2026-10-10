import mongoose from "mongoose";

// Day-to-day restaurant costs (rent, utilities, packaging, repairs, …).
// Stock purchases from suppliers live in PurchaseOrder; staff pay in StaffSalary.
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Gas",
  "Water",
  "Internet & Phone",
  "Packaging",
  "Cleaning",
  "Repairs & Maintenance",
  "Marketing",
  "Delivery / Fuel",
  "Licences & Insurance",
  "Bank Charges",
  "Other",
];

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cash", "bank", "card"], default: "cash" },
    paidTo: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.Expense || mongoose.model("Expense", expenseSchema, "expenses");
