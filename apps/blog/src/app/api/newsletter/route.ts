import { NextResponse } from "next/server";

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

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, source: "blog" }),
  }).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json(
      { message: "Could not subscribe right now. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: "Thanks — you're on the list." });
}
