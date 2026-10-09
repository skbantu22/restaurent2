import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";
import ProductModel from "@/models/Product.model";
import PurchaseOrderModel from "@/models/PurchaseOrder.model";
import IngredientModel from "@/models/Ingredient.model";
import StockMovementModel from "@/models/StockMovement.model";
import StaffSalaryModel from "@/models/StaffSalary.model";
import { REPORTS } from "@/lib/reportsCatalog";

// Report engine (like the 360 project): GET /api/admin/reports/:key
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD&type=dine_in|takeaway|pickup|delivery&payment=paid|pending&year=YYYY
// Responds with { title, group, filters, columns: [[key, label, type]], rows, totals }.
// Column types: text | date | money | qty | status

const TZ = "Europe/London";
const TYPE_LABEL = { dine_in: "Dine In", takeaway: "Takeaway", pickup: "Collection", delivery: "Delivery" };
const STATUS_LABEL = { placed: "New", preparing: "Preparing", ready: "Ready", out_for_delivery: "On the way", delivered: "Completed", cancelled: "Cancelled" };
const METHOD_LABEL = { cash: "Cash", card: "Card", stripe: "Card (online)", cod: "Cash on collection", split: "Split" };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Midnight in London for a YYYY-MM-DD date, as a UTC Date
function londonDate(ymd, endOfDay = false) {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0));
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(guess));
  const offset = (h - guess.getUTCHours() + 24) % 24; // 0 (GMT) or 1 (BST)
  return new Date(guess.getTime() - offset * 3600000);
}
const todayYmd = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const firstOfMonthYmd = () => `${todayYmd().slice(0, 7)}-01`;
const ymdOf = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(date));



export async function GET(request, { params }) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const { key } = await params;
    const def = REPORTS[key];
    if (!def) return response(false, 404, "Unknown report.");

    const sp = request.nextUrl.searchParams;
    const from = sp.get("from") || firstOfMonthYmd();
    const to = sp.get("to") || todayYmd();
    const type = sp.get("type") || "";
    const payment = sp.get("payment") || "";
    const year = Number(sp.get("year")) || Number(todayYmd().slice(0, 4));

    const range = { $gte: londonDate(from), $lte: londonDate(to, true) };
    const base = { deletedAt: null, orderStatus: { $ne: "cancelled" }, createdAt: range, ...(type ? { orderType: type } : {}) };

    let columns = [];
    let rows = [];
    let totals = {};
    const sum = (k) => r2(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));

    switch (key) {
      case "daily-sales": {
        const agg = await OrderModel.aggregate([
          { $match: base },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
              orders: { $sum: 1 }, subtotal: { $sum: "$subtotal" }, discount: { $sum: "$discount" },
              delivery: { $sum: "$deliveryFee" }, total: { $sum: "$total" },
              paid: { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$total", 0] } },
            },
          },
          { $sort: { _id: -1 } },
        ]);
        columns = [["date", "Date", "date"], ["orders", "Orders", "qty"], ["subtotal", "Sub Total", "money"], ["discount", "Discount", "money"], ["delivery", "Delivery", "money"], ["total", "Total", "money"], ["paid", "Paid", "money"], ["due", "Due", "money"]];
        rows = agg.map((a) => ({ date: a._id, orders: a.orders, subtotal: r2(a.subtotal), discount: r2(a.discount), delivery: r2(a.delivery), total: r2(a.total), paid: r2(a.paid), due: r2(a.total - a.paid) }));
        totals = Object.fromEntries(["orders", "subtotal", "discount", "delivery", "total", "paid", "due"].map((k) => [k, sum(k)]));
        break;
      }
      case "master-sales": {
        const q = { ...base, ...(payment ? { "payment.status": payment } : {}) };
        const list = await OrderModel.find(q).sort({ createdAt: -1 }).limit(2000).lean();
        columns = [["date", "Date", "date"], ["orderNumber", "Order No", "text"], ["customer", "Customer", "text"], ["phone", "Phone", "text"], ["type", "Type", "text"], ["source", "Source", "text"], ["items", "Items", "qty"], ["method", "Payment", "text"], ["status", "Status", "status"], ["total", "Total", "money"], ["due", "Due", "money"]];
        rows = list.map((o) => ({
          id: String(o._id), date: ymdOf(o.createdAt), orderNumber: o.orderNumber, customer: o.customer?.name, phone: o.customer?.phone,
          type: `${TYPE_LABEL[o.orderType] || o.orderType}${o.table ? ` · ${o.table}` : ""}`, source: o.source === "pos" ? "POS" : "Website",
          items: o.items.reduce((s, i) => s + i.quantity, 0), method: METHOD_LABEL[o.payment?.method] || o.payment?.method,
          status: o.payment?.status === "paid" ? "Paid" : "Due", total: r2(o.total), due: o.payment?.status === "paid" ? 0 : r2(o.total),
        }));
        totals = { items: sum("items"), total: sum("total"), due: sum("due") };
        break;
      }
      case "monthly-sales": {
        const q = { deletedAt: null, orderStatus: { $ne: "cancelled" }, createdAt: { $gte: londonDate(`${year}-01-01`), $lte: londonDate(`${year}-12-31`, true) }, ...(type ? { orderType: type } : {}) };
        const agg = await OrderModel.aggregate([
          { $match: q },
          { $group: { _id: { $month: { date: "$createdAt", timezone: TZ } }, orders: { $sum: 1 }, discount: { $sum: "$discount" }, delivery: { $sum: "$deliveryFee" }, total: { $sum: "$total" } } },
        ]);
        const by = new Map(agg.map((a) => [a._id, a]));
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        columns = [["month", "Month", "text"], ["orders", "Orders", "qty"], ["discount", "Discount", "money"], ["delivery", "Delivery", "money"], ["total", "Total Sales", "money"], ["average", "Avg Order", "money"]];
        rows = months.map((m, i) => {
          const a = by.get(i + 1) || {};
          return { month: `${m} ${year}`, orders: a.orders || 0, discount: r2(a.discount), delivery: r2(a.delivery), total: r2(a.total), average: a.orders ? r2(a.total / a.orders) : 0 };
        });
        totals = { orders: sum("orders"), discount: sum("discount"), delivery: sum("delivery"), total: sum("total") };
        break;
      }
      case "item-sales":
      case "category-sales": {
        const agg = await OrderModel.aggregate([
          { $match: base },
          { $unwind: "$items" },
          { $group: { _id: { id: "$items.productId", name: "$items.name" }, qty: { $sum: "$items.quantity" }, amount: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, orders: { $addToSet: "$_id" } } },
          { $sort: { qty: -1 } },
        ]);
        if (key === "item-sales") {
          columns = [["name", "Food Item", "text"], ["orders", "Orders", "qty"], ["qty", "Quantity Sold", "qty"], ["average", "Avg Price", "money"], ["amount", "Amount", "money"]];
          rows = agg.map((a) => ({ name: a._id.name, orders: a.orders.length, qty: a.qty, average: a.qty ? r2(a.amount / a.qty) : 0, amount: r2(a.amount) }));
          totals = { qty: sum("qty"), amount: sum("amount") };
        } else {
          const products = await ProductModel.find({ _id: { $in: agg.map((a) => a._id.id).filter(Boolean) } }).select("category").populate("category", "name").lean();
          const catOf = new Map(products.map((p) => [String(p._id), p.category?.name || "Uncategorised"]));
          const by = new Map();
          for (const a of agg) {
            const c = catOf.get(String(a._id.id)) || "Uncategorised";
            const e = by.get(c) || { category: c, items: 0, qty: 0, amount: 0 };
            e.items += 1; e.qty += a.qty; e.amount += a.amount;
            by.set(c, e);
          }
          const grand = [...by.values()].reduce((s, e) => s + e.amount, 0) || 1;
          columns = [["category", "Category", "text"], ["items", "Dishes Sold", "qty"], ["qty", "Quantity", "qty"], ["amount", "Amount", "money"], ["share", "Share %", "qty"]];
          rows = [...by.values()].sort((a, b) => b.amount - a.amount).map((e) => ({ ...e, amount: r2(e.amount), share: r2((e.amount / grand) * 100) }));
          totals = { qty: sum("qty"), amount: sum("amount") };
        }
        break;
      }
      case "order-types":
      case "payment-methods": {
        const field = key === "order-types" ? "$orderType" : "$payment.method";
        const agg = await OrderModel.aggregate([
          { $match: { deletedAt: null, orderStatus: { $ne: "cancelled" }, createdAt: range } },
          { $group: { _id: field, orders: { $sum: 1 }, total: { $sum: "$total" }, paid: { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$total", 0] } } } },
          { $sort: { total: -1 } },
        ]);
        const label = key === "order-types" ? TYPE_LABEL : METHOD_LABEL;
        columns = [["name", key === "order-types" ? "Order Type" : "Payment Method", "text"], ["orders", "Orders", "qty"], ["total", "Total", "money"], ["paid", "Paid", "money"], ["due", "Due", "money"], ["average", "Avg Order", "money"]];
        rows = agg.map((a) => ({ name: label[a._id] || a._id || "Other", orders: a.orders, total: r2(a.total), paid: r2(a.paid), due: r2(a.total - a.paid), average: r2(a.total / a.orders) }));
        totals = { orders: sum("orders"), total: sum("total"), paid: sum("paid"), due: sum("due") };
        break;
      }
      case "discounts": {
        const list = await OrderModel.find({ deletedAt: null, orderStatus: { $ne: "cancelled" }, createdAt: range, discount: { $gt: 0 } }).sort({ createdAt: -1 }).lean();
        columns = [["date", "Date", "date"], ["orderNumber", "Order No", "text"], ["customer", "Customer", "text"], ["coupon", "Coupon", "text"], ["subtotal", "Sub Total", "money"], ["discount", "Discount", "money"], ["total", "Total", "money"]];
        rows = list.map((o) => ({ id: String(o._id), date: ymdOf(o.createdAt), orderNumber: o.orderNumber, customer: o.customer?.name, coupon: o.coupon?.code ? `${o.coupon.code} (${o.coupon.discountPercentage}%)` : "Manual", subtotal: r2(o.subtotal), discount: r2(o.discount), total: r2(o.total) }));
        totals = { subtotal: sum("subtotal"), discount: sum("discount"), total: sum("total") };
        break;
      }
      case "delivery-charges": {
        const list = await OrderModel.find({ deletedAt: null, orderStatus: { $ne: "cancelled" }, createdAt: range, orderType: "delivery" }).sort({ createdAt: -1 }).lean();
        columns = [["date", "Date", "date"], ["orderNumber", "Order No", "text"], ["customer", "Customer", "text"], ["postcode", "Postcode", "text"], ["address", "Address", "text"], ["fee", "Delivery Fee", "money"], ["total", "Order Total", "money"]];
        rows = list.map((o) => ({ id: String(o._id), date: ymdOf(o.createdAt), orderNumber: o.orderNumber, customer: o.customer?.name, postcode: o.deliveryAddress?.postcode, address: o.deliveryAddress?.address, fee: r2(o.deliveryFee), total: r2(o.total) }));
        totals = { fee: sum("fee"), total: sum("total") };
        break;
      }
      case "cancelled-orders": {
        const list = await OrderModel.find({ deletedAt: null, orderStatus: "cancelled", createdAt: range }).sort({ createdAt: -1 }).lean();
        columns = [["date", "Date", "date"], ["orderNumber", "Order No", "text"], ["customer", "Customer", "text"], ["type", "Type", "text"], ["method", "Payment", "text"], ["refund", "Payment Status", "text"], ["total", "Total", "money"]];
        rows = list.map((o) => ({ id: String(o._id), date: ymdOf(o.createdAt), orderNumber: o.orderNumber, customer: o.customer?.name, type: TYPE_LABEL[o.orderType] || o.orderType, method: METHOD_LABEL[o.payment?.method] || o.payment?.method, refund: o.payment?.status, total: r2(o.total) }));
        totals = { total: sum("total") };
        break;
      }
      case "customer-sales":
      case "customer-due": {
        const match = key === "customer-due"
          ? { deletedAt: null, orderStatus: { $ne: "cancelled" }, "payment.status": "pending" }
          : { deletedAt: null, orderStatus: { $ne: "cancelled" }, createdAt: range };
        const agg = await OrderModel.aggregate([
          { $match: match },
          { $group: { _id: { $ifNull: ["$customer.phone", "$customer.name"] }, name: { $first: "$customer.name" }, phone: { $first: "$customer.phone" }, email: { $first: "$customer.email" }, orders: { $sum: 1 }, total: { $sum: "$total" }, last: { $max: "$createdAt" } } },
          { $sort: { total: -1 } },
        ]);
        columns = [["name", "Customer", "text"], ["phone", "Phone", "text"], ["email", "Email", "text"], ["orders", "Orders", "qty"], ["last", "Last Order", "date"], ["total", key === "customer-due" ? "Amount Due" : "Total Spent", "money"]];
        rows = agg.map((a) => ({ name: a.name || "Guest", phone: a.phone, email: a.email, orders: a.orders, last: ymdOf(a.last), total: r2(a.total) }));
        totals = { orders: sum("orders"), total: sum("total") };
        break;
      }
      case "purchases": {
        const list = await PurchaseOrderModel.find({ orderDate: range }).populate("supplier", "companyName").sort({ orderDate: -1 }).lean();
        columns = [["date", "Date", "date"], ["po", "PO No", "text"], ["supplier", "Supplier", "text"], ["items", "Items", "qty"], ["status", "Status", "text"], ["subtotal", "Sub Total", "money"], ["vat", "VAT", "money"], ["total", "Total", "money"]];
        rows = list.map((p) => ({ date: ymdOf(p.orderDate), po: p.poNumber, supplier: p.supplier?.companyName, items: p.items?.length || 0, status: p.status.replace("_", " ").toLowerCase(), subtotal: r2(p.subtotal), vat: r2(p.vatAmount), total: r2(p.total) }));
        totals = { subtotal: sum("subtotal"), vat: sum("vat"), total: sum("total") };
        break;
      }
      case "supplier-payable": {
        const agg = await PurchaseOrderModel.aggregate([
          { $match: { status: { $in: ["RECEIVED", "PARTIALLY_RECEIVED"] } } },
          { $group: { _id: "$supplier", orders: { $sum: 1 }, total: { $sum: "$total" }, last: { $max: "$orderDate" } } },
          { $lookup: { from: "suppliers", localField: "_id", foreignField: "_id", as: "s" } },
          { $sort: { total: -1 } },
        ]);
        columns = [["supplier", "Supplier", "text"], ["phone", "Phone", "text"], ["terms", "Payment Terms", "text"], ["orders", "Received POs", "qty"], ["last", "Last Order", "date"], ["total", "Amount", "money"]];
        rows = agg.map((a) => ({ supplier: a.s?.[0]?.companyName || "Supplier", phone: a.s?.[0]?.phone, terms: a.s?.[0]?.paymentTerms, orders: a.orders, last: a.last ? ymdOf(a.last) : "", total: r2(a.total) }));
        totals = { orders: sum("orders"), total: sum("total") };
        break;
      }
      case "stock":
      case "low-stock": {
        const q = key === "low-stock" ? { minimumStock: { $gt: 0 }, $expr: { $lte: ["$currentStock", "$minimumStock"] } } : {};
        const list = await IngredientModel.find(q).sort({ name: 1 }).lean();
        columns = [["code", "Code", "text"], ["name", "Ingredient", "text"], ["category", "Category", "text"], ["stock", "Current Stock", "qty"], ["unit", "Unit", "text"], ["minimum", "Minimum", "qty"], ["cost", "Avg Cost", "money"], ["value", "Stock Value", "money"]];
        rows = list.map((i) => ({ code: i.ingredientCode, name: i.name, category: i.category, stock: i.currentStock, unit: i.usageUnit, minimum: i.minimumStock, cost: r2(i.averageCost), value: r2(i.currentStock * (i.averageCost || 0)) }));
        totals = { value: sum("value") };
        break;
      }
      case "waste": {
        const list = await StockMovementModel.find({ type: "WASTE", createdAt: range }).populate("ingredient", "name usageUnit").sort({ createdAt: -1 }).lean();
        columns = [["date", "Date", "date"], ["ingredient", "Ingredient", "text"], ["qty", "Quantity", "qty"], ["unit", "Unit", "text"], ["reason", "Reason", "text"], ["cost", "Cost", "money"]];
        rows = list.map((m) => ({ date: ymdOf(m.createdAt), ingredient: m.ingredient?.name, qty: Math.abs(m.quantity), unit: m.unit, reason: m.reason, cost: r2(m.totalCost) }));
        totals = { cost: sum("cost") };
        break;
      }
      case "salary": {
        const list = await StaffSalaryModel.find({ deletedAt: null, month: { $regex: `^${year}-` } }).sort({ month: -1, staffName: 1 }).lean();
        columns = [["month", "Month", "text"], ["staff", "Staff", "text"], ["position", "Position", "text"], ["base", "Base Salary", "money"], ["bonus", "Bonus", "money"], ["deductions", "Deductions", "money"], ["net", "Net Pay", "money"], ["status", "Status", "status"]];
        rows = list.map((s) => ({ month: s.month, staff: s.staffName, position: s.position, base: r2(s.baseSalary), bonus: r2(s.bonus), deductions: r2(s.deductions), net: r2(s.netPay), status: s.paymentStatus === "paid" ? "Paid" : "Due" }));
        totals = { base: sum("base"), bonus: sum("bonus"), deductions: sum("deductions"), net: sum("net") };
        break;
      }
      case "profit-loss": {
        const [sales] = await OrderModel.aggregate([
          { $match: { deletedAt: null, orderStatus: { $ne: "cancelled" }, createdAt: range } },
          { $group: { _id: null, subtotal: { $sum: "$subtotal" }, discount: { $sum: "$discount" }, delivery: { $sum: "$deliveryFee" }, total: { $sum: "$total" } } },
        ]);
        const [purch] = await PurchaseOrderModel.aggregate([{ $match: { status: { $in: ["RECEIVED", "PARTIALLY_RECEIVED"] }, orderDate: range } }, { $group: { _id: null, total: { $sum: "$total" } } }]);
        const [waste] = await StockMovementModel.aggregate([{ $match: { type: "WASTE", createdAt: range } }, { $group: { _id: null, total: { $sum: "$totalCost" } } }]);
        const monthsInRange = [];
        for (let d = new Date(`${from.slice(0, 7)}-01T00:00:00Z`); d <= new Date(`${to.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1)) monthsInRange.push(d.toISOString().slice(0, 7));
        const [sal] = await StaffSalaryModel.aggregate([{ $match: { deletedAt: null, month: { $in: monthsInRange } } }, { $group: { _id: null, total: { $sum: "$netPay" } } }]);
        const income = r2(sales?.total);
        const costs = r2((purch?.total || 0) + (waste?.total || 0) + (sal?.total || 0));
        columns = [["item", "Item", "text"], ["income", "Income", "money"], ["expense", "Expense", "money"]];
        rows = [
          { item: "Food sales (after discounts)", income: r2((sales?.subtotal || 0) - (sales?.discount || 0)) },
          { item: "Delivery charges collected", income: r2(sales?.delivery) },
          { item: "Purchases received from suppliers", expense: r2(purch?.total) },
          { item: "Waste (stock written off)", expense: r2(waste?.total) },
          { item: `Staff salaries (${monthsInRange.join(", ")})`, expense: r2(sal?.total) },
          { item: income - costs >= 0 ? "Net profit" : "Net loss", income: income - costs >= 0 ? r2(income - costs) : null, expense: income - costs < 0 ? r2(costs - income) : null },
        ];
        totals = { income, expense: costs };
        break;
      }
    }

    return response(true, 200, def.title, { key, title: def.title, group: def.group, filters: def.filters, from, to, year, columns, rows, totals });
  } catch (error) {
    return catchError(error);
  }
}
