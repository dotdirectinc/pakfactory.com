// Counterpart to ./enable — see the note there on why the site root carries its
// own pair. Redirects to the site root rather than a preview path.
import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  (await draftMode()).disable();
  return NextResponse.redirect(
    new URL(
      "/",
      process.env["SANITY_STUDIO_PREVIEW_URL_SITE"] ||
        process.env["SANITY_STUDIO_PREVIEW_URL"] ||
        "http://localhost:3000",
    ),
  );
}
