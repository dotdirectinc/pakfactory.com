import { NextResponse } from "next/server";

/**
 * Newsletter subscribe endpoint. Thin, hardened proxy in front of the n8n
 * webhook that talks to Zoho Campaigns (double opt-in). See
 * docs/newsletter-data-journey.md for the full data journey + n8n spec.
 *
 * Responsibilities here: validate, block bots (honeypot), best-effort
 * rate-limit, require + record consent, then forward an enriched payload to
 * n8n. The actual Zoho Campaigns `listsubscribe` + confirmation email happen in
 * n8n, not here.
 */

// Consent record — implied by submission (a disclaimer + Privacy Policy link
// sits under the form) and confirmed by double opt-in. Stamped onto every
// subscription. Bump the version whenever the wording or policy materially changes.
const CONSENT_VERSION = "2026-07-v1";
const CONSENT_TEXT =
  "By subscribing you agreed to receive the PakFactory packaging digest and accepted the Privacy Policy (implied consent; confirmed via double opt-in).";

// Best-effort per-instance rate limit. Serverless instances aren't shared, so
// this only slows abuse on a warm instance — back it with a shared store
// (e.g. Upstash) for hard guarantees. See the data-journey doc.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
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

export async function POST(request: Request) {
  const webhook =
    process.env.NEWSLETTER_WEBHOOK_URL?.trim() ||
    process.env.NEXT_PUBLIC_NEWSLETTER_WEBHOOK_URL?.trim();
  if (!webhook) {
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

  // Consent is implied by submission (disclaimer under the form) and confirmed
  // by double opt-in — no explicit checkbox required.

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

  const res = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Shared secret so n8n can verify the caller. Set NEWSLETTER_WEBHOOK_SECRET
      // in both this app and the n8n webhook node.
      ...(process.env.NEWSLETTER_WEBHOOK_SECRET
        ? { "x-webhook-secret": process.env.NEWSLETTER_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify({
      email,
      source: body.source || "blog",
      // Consent record — implied consent, carried through to Zoho for the audit trail.
      consent: true,
      consentType: "implied",
      consentText: CONSENT_TEXT,
      consentVersion: CONSENT_VERSION,
      subscribedAt: new Date().toISOString(),
      ip,
      userAgent: request.headers.get("user-agent") || undefined,
    }),
  }).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json(
      { message: "Could not subscribe right now. Try again later." },
      { status: 502 },
    );
  }

  // Double opt-in: n8n → Zoho Campaigns sends a confirmation email; the address
  // isn't a confirmed subscriber until they click it.
  return NextResponse.json({
    message: "Almost there — check your inbox to confirm your subscription.",
  });
}
