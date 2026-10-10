import mongoose from "mongoose";

// Messages sent from the admin panel to customers (email).
const messageSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    audience: { type: String, enum: ["all", "selected"], default: "all" },
    recipients: [{ name: String, email: String, _id: false }],
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: { type: String, enum: ["sent", "partial", "not_sent"], default: "not_sent" },
    error: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export default mongoose.models.Message || mongoose.model("Message", messageSchema, "messages");
