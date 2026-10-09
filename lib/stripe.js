import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_missing_key", {
  apiVersion: "2025-06-30.basil",
});
