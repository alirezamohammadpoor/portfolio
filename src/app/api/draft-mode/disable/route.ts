import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Leaves draft mode. The Presentation tool calls it when a preview session
 * ends (sanity.config.ts previewMode.disable); without it the bypass cookie
 * kept the editor's whole browser session on draft reads.
 */
export async function GET(req: NextRequest) {
  (await draftMode()).disable();
  return NextResponse.redirect(new URL("/", req.url));
}
