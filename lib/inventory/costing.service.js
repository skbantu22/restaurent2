import { connectDB } from "@/lib/databaseconnection";
import RecipeModel from "@/models/Recipe.model";
import ProductModel from "@/models/Product.model";
import { normalizeToUsageUnit } from "@/lib/inventory/units";
import { addMoney, subMoney, mulMoney } from "@/lib/inventory/money";

// ============================================================
// RECIPE COSTING
// ============================================================
// Ingredient Cost + Packaging Cost = Total Cost
// Selling Price - Total Cost = Gross Profit
// Total Cost / Selling Price * 100 = Food Cost %
//
// Uses each ingredient's current `averageCost` (weighted-average
// costing — see lib/inventory/money.js). Deliberately isolated into
// its own function per ingredient line so a future FIFO/latest-cost
// method only needs to change how `unitCost` is looked up here, not
// the surrounding cost/profit math.
//
// "Packaging" is identified by Ingredient.category (case-insensitive
// match) — a plain convention, not an enum, consistent with how
// Ingredient.category is just a free-text grouping (see
// Ingredient.model.js). Recipes that don't tag anything as packaging
// simply report a £0 packaging line — nothing breaks.

function unitCostFor(ingredient) {
  return ingredient.averageCost || 0;
}

function isPackaging(ingredient) {
  return (ingredient.category || "").trim().toLowerCase() === "packaging";
}

/**
 * @returns {null} if the product has no active recipe
 */
export async function getRecipeCosting(productId) {
  await connectDB();

  const [recipe, product] = await Promise.all([
    RecipeModel.findOne({ product: productId, active: true })
      .populate("items.ingredient", "name ingredientCode category usageUnit averageCost")
      .lean(),
    ProductModel.findById(productId).select("name sellingPrice").lean(),
  ]);

  if (!recipe || !product) return null;

  let ingredientCost = 0;
  let packagingCost = 0;
  const lines = [];

  for (const item of recipe.items) {
    const ingredient = item.ingredient;
    if (!ingredient) continue;

    const qtyWithWastage = item.quantity * (1 + (item.wastagePercentage || 0) / 100);
    const normalizedQty = normalizeToUsageUnit(qtyWithWastage, item.unit, ingredient);
    const unitCost = unitCostFor(ingredient);
    const lineCost = mulMoney(unitCost, normalizedQty);

    if (isPackaging(ingredient)) {
      packagingCost = addMoney(packagingCost, lineCost);
    } else {
      ingredientCost = addMoney(ingredientCost, lineCost);
    }

    lines.push({
      ingredientId: ingredient._id,
      name: ingredient.name,
      category: ingredient.category || "",
      quantity: Number(normalizedQty.toFixed(4)),
      unit: ingredient.usageUnit,
      unitCost,
      lineCost,
      optional: !!item.optional,
    });
  }

  const totalCost = addMoney(ingredientCost, packagingCost);
  const sellingPrice = product.sellingPrice || 0;
  const grossProfit = subMoney(sellingPrice, totalCost);
  const foodCostPercent = sellingPrice > 0 ? Number(((totalCost / sellingPrice) * 100).toFixed(1)) : null;

  return {
    productId: product._id,
    productName: product.name,
    recipeId: recipe._id,
    recipeVersion: recipe.version,
    sellingPrice,
    ingredientCost,
    packagingCost,
    totalCost,
    grossProfit,
    foodCostPercent,
    lines,
  };
}

/**
 * Costing for every product that currently has an active recipe —
 * backs the recipe costing report.
 */
export async function getAllRecipeCostings() {
  await connectDB();

  const recipes = await RecipeModel.find({ active: true }).select("product").lean();
  const results = [];

  for (const recipe of recipes) {
    const costing = await getRecipeCosting(recipe.product);
    if (costing) results.push(costing);
  }

  return results.sort((a, b) => (b.foodCostPercent || 0) - (a.foodCostPercent || 0));
}
