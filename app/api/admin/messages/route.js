import { z } from "zod";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import MessageModel from "@/models/Message.model";
import UserModel from "@/models/User.model";
import { sendMail } from "@/lib/sendMail";

const emailConfigured = () => !!(process.env.NODEMAILER_HOST && process.env.NODEMAILER_EMAIL && process.env.NODEMAILER_PASSWORD);

// GET /api/admin/messages — sent messages + customers who can receive email
export async function GET() {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();
    const [messages, customers] = await Promise.all([
      MessageModel.find().sort({ createdAt: -1 }).limit(100).lean(),
      UserModel.find({ role: "user", deletedAt: null, email: { $ne: "" } }).select("name email phone").sort({ name: 1 }).lean(),
    ]);
    return response(true, 200, "Messages.", { messages, customers, emailConfigured: emailConfigured() });
  } catch (error) {
    return catchError(error);
  }
}

const sendSchema = z.object({
  subject: z.string().trim().min(2, "Subject is required"),
  body: z.string().trim().min(2, "Message is required"),
  audience: z.enum(["all", "selected"]),
  customerIds: z.array(z.string()).optional().default([]),
});

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// POST /api/admin/messages — email customers (all, or selected)
export async function POST(request) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();
    const parsed = sendSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return response(false, 400, parsed.error.issues[0]?.message || "Invalid message.");
    const { subject, body, audience, customerIds } = parsed.data;

    const filter = { role: "user", deletedAt: null, email: { $ne: "" } };
    if (audience === "selected") {
      if (!customerIds.length) return response(false, 400, "Please choose at least one customer.");
      filter._id = { $in: customerIds };
    }
    const recipients = await UserModel.find(filter).select("name email").lean();
    if (!recipients.length) return response(false, 400, "No customers with an email address.");

    let sent = 0;
    let failed = 0;
    let error = "";
    if (!emailConfigured()) {
      error = "Email is not configured (NODEMAILER_HOST / NODEMAILER_EMAIL / NODEMAILER_PASSWORD).";
    } else {
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#2F6B16">Shawon Food Gate</h2>
        <div style="white-space:pre-line;font-size:15px;color:#222">${escapeHtml(body)}</div>
        <p style="margin-top:24px;font-size:12px;color:#777">179 Forest Ln, London E7 9BB · 020 3995 6692</p></div>`;
      for (const r of recipients) {
        const res = await sendMail(subject, r.email, html);
        if (res?.success) sent++;
        else {
          failed++;
          error = res?.message || "Sending failed";
        }
      }
    }

    const doc = await MessageModel.create({
      subject,
      body,
      audience,
      recipients: recipients.map((r) => ({ name: r.name, email: r.email })),
      sent,
      failed,
      status: sent && !failed ? "sent" : sent ? "partial" : "not_sent",
      error,
      createdBy: auth.userId || null,
    });

    return response(true, 201, sent ? `Sent to ${sent} customer${sent === 1 ? "" : "s"}.` : "Saved, but not sent: " + error, doc);
  } catch (error) {
    return catchError(error);
  }
}
