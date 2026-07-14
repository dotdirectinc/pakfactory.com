import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * Newsletter subscribe endpoint. Sends a notification email to marketing via
 * Gmail SMTP (same transport as /api/contribute). Implied consent is stamped
 * onto every submission for the audit trail.
 */

const TO = "marketing@pakfactory.com";

// Consent record — implied by submission (a disclaimer + Privacy Policy link
// sits under the form). Stamped onto every subscription. Bump the version
// whenever the wording or policy materially changes.
const CONSENT_VERSION = "2026-07-v1";
const CONSENT_TEXT =
  "By subscribing you agree to receive the packaging digest and accept our Privacy Policy.";

// Best-effort per-instance rate limit. Serverless instances aren't shared, so
// this only slows abuse on a warm instance — back it with a shared store
// (e.g. Upstash) for hard guarantees.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();

  // Prevent unbounded growth on warm instances by pruning expired records.
  if (hits.size > 1000) {
    for (const [key, value] of hits) {
      if (now > value.resetAt) hits.delete(key);
    }
  }

  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubscribeBody = {
  email?: string;
  company?: string; // honeypot — real users leave this empty
  source?: string;
};

function getTransporter() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function POST(request: Request) {
  const transporter = getTransporter();
  if (!transporter) {
    return NextResponse.json(
      { message: "Newsletter is not configured yet." },
      { status: 503 },
    );
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields. Return a normal success so we don't tip
  // them off, but never forward the address.
  if (body.company && body.company.trim() !== "") {
    return NextResponse.json({ message: "Thanks — you're on the list." });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { message: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (ip !== "unknown" && rateLimited(ip)) {
    return NextResponse.json(
      { message: "Too many attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  const source = body.source?.trim() || "blog";
  const subscribedAt = new Date().toISOString();
  const userAgent = request.headers.get("user-agent") || undefined;

  const rows = [
    ["Email", email],
    ["Source", source],
    ["Consent", CONSENT_TEXT],
    ["Consent version", CONSENT_VERSION],
    ["Subscribed at", subscribedAt],
    ip !== "unknown" ? ["IP", ip] : null,
    userAgent ? ["User agent", userAgent] : null,
  ].filter(Boolean) as [string, string][];

  const html = `
    <p>A new packaging digest signup was submitted via the PakFactory Blog.</p>
    <hr style="margin:16px 0">
    <table cellpadding="4" cellspacing="0" style="font-size:14px">
      ${rows.map(([k, v]) => `<tr><td style="font-weight:600;padding-right:16px;white-space:nowrap">${k}</td><td>${v}</td></tr>`).join("")}
    </table>
    <hr style="margin:16px 0">
    <p style="color:#888;font-size:12px">Reply to this email to respond directly to the subscriber.</p>
  `;

  try {
    await transporter.sendMail({
      from: `"PakFactory Blog" <${process.env.SMTP_USER}>`,
      to: TO,
      replyTo: email,
      subject: `New packaging digest signup: ${email}`,
      html,
    });
  } catch (err) {
    console.error("SMTP error:", err);
    return NextResponse.json(
      { message: "Could not subscribe right now. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message: "Thanks — you're on the list.",
  });
}
