import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { connectDB } from "@/lib/databaseconnection";
import { getRestaurantSettings } from "@/lib/settings.server";
import RestaurantSettingsModel from "@/models/RestaurantSettings.model";
import { calculateOrderTotals } from "@/lib/pos/calculateOrderTotals";

let dbAvailable = true;

test("Restaurant settings", { concurrency: false }, async (t) => {
  await t.test("setup: connect to database", async (t) => {
    try {
      await connectDB();
    } catch (err) {
      dbAvailable = false;
      t.skip(`MongoDB unreachable: ${err.message}`);
    }
  });

  if (!dbAvailable) {
    t.skip("Remaining tests require a database connection.");
    return;
  }

  // The settings document is a real singleton shared with the running
  // app — snapshot whatever exists before this suite touches it and
  // restore it exactly afterwards, rather than wiping real config.
  const before = await RestaurantSettingsModel.findOne().lean();

  t.after(async () => {
    if (before) {
      const { _id, __v, createdAt, updatedAt, ...rest } = before;
      await RestaurantSettingsModel.findOneAndUpdate({}, rest, { upsert: true });
    } else {
      await RestaurantSettingsModel.deleteMany({});
    }
    await mongoose.connection.close();
  });

  await t.test("default settings are created on first read", async () => {
    await RestaurantSettingsModel.deleteMany({});

    const settings = await getRestaurantSettings();

    assert.equal(settings.general.name, "SmashedLDN");
    assert.equal(settings.business.currencySymbol, "£");
    assert.equal(settings.business.deliveryFee, 3.99);
    assert.equal(settings.orders.posOrderPrefix, "SL-");
    assert.equal(settings.payments.cashEnabled, true);
  });

  await t.test("an update persists and is returned by the next read", async () => {
    await RestaurantSettingsModel.findOneAndUpdate(
      {},
      {
        general: { name: "Test Diner" },
        business: { deliveryFee: 5.5, currencySymbol: "$" },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );

    const settings = await getRestaurantSettings();

    assert.equal(settings.general.name, "Test Diner");
    assert.equal(settings.business.deliveryFee, 5.5);
    assert.equal(settings.business.currencySymbol, "$");
  });

  await t.test("calculateOrderTotals honors a settings-provided delivery fee", () => {
    const burger = { _id: "p1", name: "Smashed Burger", sellingPrice: 10, active: true, available: true };
    const productMap = new Map([["p1", burger]]);

    const result = calculateOrderTotals({
      cartItems: [{ productId: "p1", quantity: 1 }],
      productMap,
      orderType: "delivery",
      paymentMethod: "card",
      deliveryFee: 5.5,
    });

    assert.equal(result.deliveryFee, 5.5);
    assert.equal(result.total, 15.5);
  });
});
