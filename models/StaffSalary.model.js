import mongoose from "mongoose";

// One salary entry per staff member per month (Inventory > Staff Salary).
// `staff` links to a user account when the person has one; `staffName`
// is always stored so entries work for staff without a login too.
const staffSalarySchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    staffName: {
      type: String,
      required: [true, "Staff name is required"],
      trim: true,
    },

    position: {
      type: String,
      trim: true,
      default: "",
    },

    // pay period, "YYYY-MM"
    month: {
      type: String,
      required: [true, "Month is required"],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM"],
      index: true,
    },

    baseSalary: { type: Number, required: true, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },

    // baseSalary + bonus - deductions, kept in sync on save
    netPay: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "other"],
      default: "bank",
    },

    paidDate: { type: Date, default: null },

    note: { type: String, trim: true, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

staffSalarySchema.pre("validate", function () {
  const net =
    Number(this.baseSalary || 0) + Number(this.bonus || 0) - Number(this.deductions || 0);
  this.netPay = Math.round(net * 100) / 100;
});

const StaffSalaryModel =
  mongoose.models.StaffSalary ||
  mongoose.model("StaffSalary", staffSalarySchema, "staff_salaries");

export default StaffSalaryModel;
