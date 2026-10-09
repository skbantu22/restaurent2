// ============================================================
// MONEY-SAFE ARITHMETIC
// ============================================================
// All monetary values in this codebase are stored as GBP decimals
// (e.g. 3.6 = £3.60), same convention as Product.sellingPrice etc.
// To avoid floating point drift (0.1 + 0.2 !== 0.3) every calculation
// is done in integer pence internally, then converted back.
//
// This does NOT introduce a new persisted representation — documents
// still store plain decimal GBP numbers — it only guards the math.

const PENCE_PER_POUND = 100;

export function toPence(amountGbp) {
  return Math.round((Number(amountGbp) || 0) * PENCE_PER_POUND);
}

export function fromPence(pence) {
  return Math.round(pence) / PENCE_PER_POUND;
}

export function addMoney(a, b) {
  return fromPence(toPence(a) + toPence(b));
}

export function subMoney(a, b) {
  return fromPence(toPence(a) - toPence(b));
}

/**
 * Multiply a GBP amount by a plain (non-money) factor, e.g. unitCost * quantity.
 */
export function mulMoney(amountGbp, factor) {
  return fromPence(Math.round(toPence(amountGbp) * (Number(factor) || 0)));
}

/**
 * Weighted moving average cost after a purchase/production receipt.
 *
 * @param {number} previousStock  quantity on hand before this receipt (usageUnit)
 * @param {number} previousAverageCost  GBP cost per usageUnit before this receipt
 * @param {number} receivedQuantity  quantity received (usageUnit), must be > 0
 * @param {number} receivedUnitCost  GBP cost per usageUnit for this receipt
 * @returns {number} new weighted average cost per usageUnit (GBP)
 */
export function weightedAverageCost(
  previousStock,
  previousAverageCost,
  receivedQuantity,
  receivedUnitCost,
) {
  const totalQty = (Number(previousStock) || 0) + (Number(receivedQuantity) || 0);

  if (totalQty <= 0) {
    return Number(receivedUnitCost) || 0;
  }

  const previousValuePence = toPence(previousAverageCost) * (Number(previousStock) || 0);
  const receivedValuePence = toPence(receivedUnitCost) * (Number(receivedQuantity) || 0);

  return fromPence(Math.round((previousValuePence + receivedValuePence) / totalQty));
}
