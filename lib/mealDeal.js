// Custom Meal deal: building a meal in the builder (burger + side +
// drink) takes 20% off the combined price of its items. Kept here so the
// builder, the cart and the checkout API all use the same number — the
// checkout API re-applies it server-side, so the discounted total is
// never taken from the client.
export const CUSTOM_MEAL_DISCOUNT = 0.2;

export const CUSTOM_MEAL_DISCOUNT_LABEL = `${Math.round(CUSTOM_MEAL_DISCOUNT * 100)}% OFF`;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

/** Amount saved on a custom meal of this pre-discount total. */
export const customMealSaving = (subtotal) =>
  round2(Number(subtotal || 0) * CUSTOM_MEAL_DISCOUNT);

/** Price of a custom meal after the deal. */
export const customMealPrice = (subtotal) =>
  round2(Number(subtotal || 0) - customMealSaving(subtotal));
