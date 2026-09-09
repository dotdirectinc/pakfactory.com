import { NextResponse } from "next/server";
import { authorizeAttachment } from "@/lib/attachments/authorize";
import { resolveFromBackend } from "@/lib/attachments/backend-resolve";

/**
 * Inline VIEW of one attachment — the `<img src>` behind previews on the request
 * detail page.
 *
 * ── Why a route handler, and not a presigned url in the page ────────────────
 * ADR-0013 D3 keeps permits out of the DOM: a presigned GET rendered into the
 * page is copyable, valid for anyone holding it, and expires after 300s while
 * the rep is still reading. Rendering one per file on load would mint permits
 * for files nobody opens.
 *
 * This preserves that. What lands in the DOM is a SAME-ORIGIN path, which is
 * worthless without the admin session cookie: it authorises on every hit, mints
 * a fresh permit, and redirects. Nothing copyable, and nothing that goes stale
 * while the page sits open — a thumbnail loaded an hour ago still reloads.
 *
 * ── Why it answers 404 rather than redirecting to /login ───────────────────
 * `authorizeAttachment` calls `requireInternalUser`, which redirects a signed-out
 * caller. That is right for a page and wrong for an image: the browser would
 * follow it and render the login HTML as a broken image. The redirect surfaces
 * here as a thrown NEXT_REDIRECT, so it is caught and turned into the same 404
 * every other refusal gets — a signed-out request and a stranger's rfqId are one
 * answer.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ rfqId: string; attachmentId: string }> },
) {
  const { rfqId, attachmentId } = await params;

  let authorized = false;
  try {
    const auth = await authorizeAttachment(rfqId, attachmentId);
    authorized = auth.ok;
  } catch {
    // requireInternalUser redirected (no session, or no internal account).
    authorized = false;
  }

  if (!authorized) return new NextResponse(null, { status: 404 });

  const resolved = await resolveFromBackend(rfqId, attachmentId, "inline");
  if (!resolved.ok) {
    // `resolveFromBackend` has already logged the status and the reason. The
    // browser gets a bare code so a failed preview renders as a broken image
    // rather than as HTML inside an <img>.
    return new NextResponse(null, {
      status: resolved.reason === "not_found" ? 404 : 502,
    });
  }

  // 🔴 `no-store`, and no caching of this hop. The redirect target is a
  // time-limited permit; a cached 302 would hand a later viewer a url minted for
  // an earlier one, and would outlive the rep's access to the request.
  return NextResponse.redirect(resolved.url, {
    status: 302,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
