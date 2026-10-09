// Restaurant report list, shared by the report API and the Reports page.
// filters: "dates" (from/to), "type" (order type), "payment" (paid/due), "year"
export const REPORTS = {
  // ---------------- sales ----------------
  "daily-sales": { title: "Daily Sales Report", group: "Sales", filters: ["dates", "type"] },
  "master-sales": { title: "Master Sales Report", group: "Sales", filters: ["dates", "type", "payment"] },
  "monthly-sales": { title: "Monthly Sales Report", group: "Sales", filters: ["year", "type"] },
  "item-sales": { title: "Food Item Sales Report", group: "Sales", filters: ["dates", "type"] },
  "category-sales": { title: "Category Sales Report", group: "Sales", filters: ["dates", "type"] },
  "order-types": { title: "Order Type Report", group: "Sales", filters: ["dates"] },
  "payment-methods": { title: "Payment Method Report", group: "Sales", filters: ["dates"] },
  "discounts": { title: "Discounts & Coupons Report", group: "Sales", filters: ["dates"] },
  "delivery-charges": { title: "Delivery Charge Report", group: "Sales", filters: ["dates"] },
  "cancelled-orders": { title: "Cancelled Orders Report", group: "Sales", filters: ["dates"] },
  // ---------------- customers ----------------
  "customer-sales": { title: "Customer Sales Report", group: "Customers", filters: ["dates"] },
  "customer-due": { title: "Customer Due Report", group: "Customers", filters: [] },
  // ---------------- purchase & stock ----------------
  "purchases": { title: "Purchase Report", group: "Purchase & Stock", filters: ["dates"] },
  "supplier-payable": { title: "Supplier Payable Report", group: "Purchase & Stock", filters: [] },
  "stock": { title: "Stock Report", group: "Purchase & Stock", filters: [] },
  "low-stock": { title: "Low Stock Report", group: "Purchase & Stock", filters: [] },
  "waste": { title: "Waste Report", group: "Purchase & Stock", filters: ["dates"] },
  // ---------------- staff & accounts ----------------
  "salary": { title: "Salary Report", group: "Staff & Accounts", filters: ["year"] },
  "profit-loss": { title: "Profit & Loss Summary", group: "Staff & Accounts", filters: ["dates"] },
};
