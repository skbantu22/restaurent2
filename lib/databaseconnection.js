import mongoose from "mongoose";

// Checked when connecting (not at import) so `next build` on Vercel can
// compile routes before environment variables are configured.
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global cache to prevent multiple connections in development
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "Ecommarce",
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};
