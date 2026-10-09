import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

const TOP_CATEGORY_LIMIT = 6;

export async function GET() {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 403, "Unauthorized.");
    }

    await connectDB();

    const activeMatch = { deletedAt: null, orderStatus: { $ne: "cancelled" } };

    const [totalsResult, topSellingItems, channelCounts, categoryCounts] =
      await Promise.all([
        // Revenue + items sold across every non-cancelled order.
        OrderModel.aggregate([
          { $match: activeMatch },
          {
            $facet: {
              revenue: [{ $group: { _id: null, total: { $sum: "$total" } } }],
              itemsSold: [
                { $unwind: "$items" },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } },
              ],
            },
          },
        ]),

        // Items already denormalize name/image/price at order time, so
        // no Product lookup is needed to show what's selling. Restricted
        // to itemType "product" — extras/drinks/the custom-meal-builder
        // "category" line aren't real menu items.
        OrderModel.aggregate([
          { $match: activeMatch },
          { $unwind: "$items" },
          { $match: { "items.itemType": "product" } },
          {
            $group: {
              _id: "$items.name",
              quantity: { $sum: "$items.quantity" },
              price: { $first: "$items.price" },
              image: { $first: "$items.image" },
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: 5 },
        ]),

        // Dine-in / Pickup / Delivery / Takeaway breakdown.
        OrderModel.aggregate([
          { $match: { deletedAt: null } },
          { $group: { _id: "$orderType", count: { $sum: 1 } } },
        ]),

        // Sales by category — items only carry productId, so look the
        // category up via Product.
        OrderModel.aggregate([
          { $match: activeMatch },
          { $unwind: "$items" },
          { $match: { "items.itemType": "product", "items.productId": { $ne: null } } },
          {
            $lookup: {
              from: "products",
              localField: "items.productId",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "categories",
              localField: "product.category",
              foreignField: "_id",
              as: "categoryDoc",
            },
          },
          { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ["$categoryDoc.name", "Other"] },
              quantity: { $sum: "$items.quantity" },
            },
          },
          { $sort: { quantity: -1 } },
        ]),
      ]);

    const revenue = totalsResult?.[0]?.revenue?.[0]?.total || 0;
    const itemsSold = totalsResult?.[0]?.itemsSold?.[0]?.total || 0;

    const totalChannelOrders = channelCounts.reduce((sum, c) => sum + c.count, 0) || 1;
    const ordersByChannel = channelCounts
      .map((c) => ({
        orderType: c._id || "pickup",
        count: c.count,
        percentage: Math.round((c.count / totalChannelOrders) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    let salesByCategory = categoryCounts.map((c) => ({
      category: c._id || "Other",
      quantity: c.quantity,
    }));

    if (salesByCategory.length > TOP_CATEGORY_LIMIT) {
      const top = salesByCategory.slice(0, TOP_CATEGORY_LIMIT);
      const otherQty = salesByCategory
        .slice(TOP_CATEGORY_LIMIT)
        .reduce((sum, c) => sum + c.quantity, 0);
      salesByCategory = [...top, { category: "Other", quantity: otherQty }];
    }

    return response(true, 200, "Data found", {
      revenue,
      itemsSold,
      topSellingItems: topSellingItems.map((item) => ({
        name: item._id || "Unknown item",
        quantity: item.quantity,
        price: item.price || 0,
        image: item.image || "",
      })),
      ordersByChannel,
      salesByCategory,
    });
  } catch (error) {
    return catchError(error);
  }
}
