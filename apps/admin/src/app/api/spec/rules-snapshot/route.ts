import { NextResponse } from "next/server";
import { hasRegistryGrant } from "@/lib/spec/require-grant";
import { getCatalogSnapshot } from "@/lib/spec/cached-views";

/**
 * The configurator's catalog (PROD-2614): identical for every product, so one cached response
 * serves every "Configure as a customer" tab in the session. 404 without a registry grant.
 */
export async function GET() {
  if (!(await hasRegistryGrant())) return new NextResponse(null, { status: 404 });
  const res = await getCatalogSnapshot();
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 503 });
  return NextResponse.json(res.data, { headers: { "Cache-Control": "private, max-age=60" } });
}
