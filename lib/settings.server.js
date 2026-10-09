import { connectDB } from "@/lib/databaseconnection";
import RestaurantSettingsModel from "@/models/RestaurantSettings.model";

// Server-side helper for every consumer of restaurant settings (checkout
// routes, POS order numbering, Telegram notifications, ...). Creates the
// singleton document with schema defaults on first call so callers never
// have to handle a "settings don't exist yet" case themselves.
export async function getRestaurantSettings() {
  await connectDB();

  let settings = await RestaurantSettingsModel.findOne();
  if (!settings) {
    settings = await RestaurantSettingsModel.create({});
  }

  return settings;
}
