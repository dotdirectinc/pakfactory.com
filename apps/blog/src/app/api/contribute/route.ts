import { NextResponse } from "next/server";
import {
  isValidContributeRole,
  isValidContributeSubject,
} from "@/lib/contribute-options";

type ContributeBody = {
  name?: string;
  email?: string;
  organization?: string;
  linkedIn?: string;
  subjectMatter?: string;
  role?: string;
  pitchAngle?: string;
  outline?: string;
  qualifications?: string;
  /** Honeypot — must be empty */
  website?: string;
};

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const webhook =
    process.env.CONTRIBUTE_WEBHOOK_URL?.trim() ||
    process.env.NEXT_PUBLIC_CONTRIBUTE_WEBHOOK_URL?.trim();
  if (!webhook) {
    return NextResponse.json(
      { message: "Contributor submissions are not configured yet." },
      { status: 503 },
    );
  }

  let body: ContributeBody;
  try {
    body = (await request.json()) as ContributeBody;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  if (trim(body.website)) {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const name = trim(body.name);
  const email = trim(body.email);
  const subjectMatter = trim(body.subjectMatter);
  const role = trim(body.role);
  const pitchAngle = trim(body.pitchAngle);
  const outline = trim(body.outline);

  if (!name) {
    return NextResponse.json({ message: "Enter your name." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }
  if (!subjectMatter || !isValidContributeSubject(subjectMatter)) {
    return NextResponse.json({ message: "Select a subject area." }, { status: 400 });
  }
  if (!role || !isValidContributeRole(role)) {
    return NextResponse.json({ message: "Select your role." }, { status: 400 });
  }
  if (!pitchAngle) {
    return NextResponse.json({ message: "Describe your pitch angle." }, { status: 400 });
  }
  if (!outline) {
    return NextResponse.json({ message: "Provide an outline." }, { status: 400 });
  }

  const linkedIn = trim(body.linkedIn);
  if (linkedIn) {
    try {
      const url = new URL(linkedIn);
      if (!["http:", "https:"].includes(url.protocol)) {
        return NextResponse.json({ message: "Enter a valid LinkedIn URL." }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ message: "Enter a valid LinkedIn URL." }, { status: 400 });
    }
  }

  const payload = {
    name,
    email,
    organization: trim(body.organization) || undefined,
    linkedIn: linkedIn || undefined,
    subjectMatter,
    role,
    pitchAngle,
    outline,
    qualifications: trim(body.qualifications) || undefined,
    source: "blog-contribute",
  };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json(
      { message: "Could not submit your pitch right now. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message: "Thanks — we received your pitch and will be in touch.",
  });
}
