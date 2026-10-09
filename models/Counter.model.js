import mongoose from "mongoose";

// Generic atomic sequence counter (e.g. "pos_order_seq"). Used to
// generate human-friendly, gapless-per-key order numbers (SL-100001,
// SL-100002, ...) without a race condition under concurrent POS
// submissions — the increment is a single atomic findOneAndUpdate,
// no transaction needed.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

const CounterModel =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema, "counters");

export default CounterModel;
