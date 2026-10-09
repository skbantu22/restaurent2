// ============================================================
// UNIT SYSTEM
// ============================================================
// Ingredients are purchased in one unit (purchaseUnit) and
// consumed/tracked in another (usageUnit). Each Ingredient stores
// its own `conversionFactor` = how many usageUnits make up 1
// purchaseUnit (e.g. purchaseUnit=kg, usageUnit=g, conversionFactor=1000).
//
// All stock quantities on Ingredient (currentStock, minimumStock,
// parLevel, maximumStock) and StockMovement.normalizedQuantity are
// always expressed in the ingredient's usageUnit. This keeps every
// arithmetic comparison/addition unit-consistent.

export const UNIT_ENUM = ["kg", "g", "l", "ml", "pcs"];

// Suggested default conversion factors between common pairs.
// Purely a convenience for admin UIs later — not enforced by the
// service, since conversionFactor is always explicit per ingredient
// (it also has to support non-physical conversions, e.g. "1 box = 24 pcs").
export const STANDARD_UNIT_FACTORS = {
  "kg->g": 1000,
  "l->ml": 1000,
};

/**
 * Convert a quantity expressed in `fromUnit` into the ingredient's
 * usageUnit, using only the two units the ingredient actually knows
 * about (its own purchaseUnit and usageUnit + conversionFactor).
 *
 * @param {number} quantity
 * @param {string} fromUnit
 * @param {{ usageUnit: string, purchaseUnit: string, conversionFactor: number }} ingredient
 * @returns {number} quantity expressed in ingredient.usageUnit
 */
export function normalizeToUsageUnit(quantity, fromUnit, ingredient) {
  if (typeof quantity !== "number" || Number.isNaN(quantity)) {
    throw new Error("normalizeToUsageUnit: quantity must be a number");
  }

  if (fromUnit === ingredient.usageUnit) {
    return quantity;
  }

  if (fromUnit === ingredient.purchaseUnit) {
    const factor = Number(ingredient.conversionFactor);

    if (!factor || factor <= 0) {
      throw new Error(
        `Ingredient "${ingredient.name || ingredient._id}" has no valid conversionFactor between ${ingredient.purchaseUnit} and ${ingredient.usageUnit}`,
      );
    }

    return quantity * factor;
  }

  throw new Error(
    `Unit "${fromUnit}" is not usable for ingredient "${ingredient.name || ingredient._id}" (expected "${ingredient.purchaseUnit}" or "${ingredient.usageUnit}")`,
  );
}

export function isValidUnit(unit) {
  return UNIT_ENUM.includes(unit);
}
