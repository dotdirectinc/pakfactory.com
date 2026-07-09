import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  isValidContributeRole,
  isValidContributeSubject,
} from "@/lib/contribute-options";

const TO = "marketing@pakfactory.com";

type ContributeBody = {
  name?: string;
  email?: string;
  organization?: string;
  linkedIn?: string;
  subjectMatter?: string;
  role?: string;
  pitchAngle?: string;
  consent?: boolean;
  /** Honeypot — must be empty */
  website?: string;
};

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

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
  const pitchAngle = trim(body.pitchAngle);
  const role = trim(body.role);

  if (!name) {
    return NextResponse.json({ message: "Enter your name." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }
  if (!subjectMatter || !isValidContributeSubject(subjectMatter)) {
    return NextResponse.json({ message: "Select a subject area." }, { status: 400 });
  }
  if (role && !isValidContributeRole(role)) {
    return NextResponse.json({ message: "Invalid role selection." }, { status: 400 });
  }
  if (!pitchAngle) {
    return NextResponse.json({ message: "Describe your pitch angle." }, { status: 400 });
  }
  if (!body.consent) {
    return NextResponse.json(
      { message: "You must agree to the privacy terms." },
      { status: 400 },
    );
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

  const organization = trim(body.organization);

  const rows = [
    ["Name", name],
    ["Email", email],
    organization ? ["Organization", organization] : null,
    linkedIn ? ["LinkedIn", linkedIn] : null,
    ["Subject matter", subjectMatter],
    role ? ["Role", role] : null,
  ].filter(Boolean) as [string, string][];

  const html = `
    <p>A new pitch was submitted via the PakFactory Blog.</p>
    <hr style="margin:16px 0">
    <table cellpadding="4" cellspacing="0" style="font-size:14px">
      ${rows.map(([k, v]) => `<tr><td style="font-weight:600;padding-right:16px;white-space:nowrap">${k}</td><td>${v}</td></tr>`).join("")}
    </table>
    <br>
    <p style="font-weight:600;font-size:14px">Pitch — angle</p>
    <blockquote style="margin:8px 0;padding:8px 12px;border-left:3px solid #ccc;color:#444;font-size:14px">${pitchAngle.replace(/\n/g, "<br>")}</blockquote>
    <hr style="margin:16px 0">
    <p style="color:#888;font-size:12px">Reply to this email to respond directly to ${name}.</p>
  `;

  try {
    await transporter.sendMail({
      from: `"PakFactory Blog" <${process.env.SMTP_USER}>`,
      to: TO,
      replyTo: `"${name}" <${email}>`,
      subject: `Blog pitch: ${subjectMatter} — ${name}`,
      html,
    });
  } catch (err) {
    console.error("SMTP error:", err);
    return NextResponse.json(
      { message: "Could not submit your pitch right now. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message: "Thanks — we received your pitch and will be in touch.",
  });
}
