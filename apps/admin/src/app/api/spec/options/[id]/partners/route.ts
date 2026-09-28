import { NextResponse } from "next/server";
import { hasRegistryGrant } from "@/lib/spec/require-grant";
import { getOptionPartners } from "@/lib/spec/current-rules";

/**
 * One option's partner lines for Current rules → By option (PROD-2614), loaded when the row is
 * opened. Same gate as the pages, and the same answer: 404 without a registry grant.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasRegistryGrant())) return new NextResponse(null, { status: 404 });
  const { id } = await params;
  const res = await getOptionPartners();
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 503 });
  const lines = res.data[decodeURIComponent(id)];
  if (!lines) return new NextResponse(null, { status: 404 });
  return NextResponse.json(lines, { headers: { "Cache-Control": "private, max-age=60" } });
}
