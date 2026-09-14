import { NextResponse } from "next/server";
import { getRequestReadAdapter } from "@/lib/adapters";
import { requireInternalUser } from "@/lib/auth/require-internal-user";
import { runAdminSearch } from "@/lib/search/run-search";
import { isAdminSearchScope } from "@/lib/search/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let account;
  try {
    ({ account } = await requireInternalUser("/requests"));
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const query =
    typeof body === "object" &&
    body !== null &&
    "query" in body &&
    typeof (body as { query: unknown }).query === "string"
      ? (body as { query: string }).query
      : "";

  const scopeRaw =
    typeof body === "object" &&
    body !== null &&
    "scope" in body &&
    typeof (body as { scope: unknown }).scope === "string"
      ? (body as { scope: string }).scope
      : "all";

  if (!isAdminSearchScope(scopeRaw)) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }

  const requests = await getRequestReadAdapter().listForSalesMember(
    account.zohoUserId,
  );

  const result = await runAdminSearch({
    query,
    scope: scopeRaw,
    requests,
    assignedOwnerCrmId: account.zohoUserId,
  });

  return NextResponse.json(result);
}
