import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";

export function GET() {
  return NextResponse.redirect(absoluteUrl("/topics-sitemap-1.xml"), 301);
}
