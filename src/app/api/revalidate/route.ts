import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

// Cache tags mirror Sanity `_type` values — see src/sanity/lib/data.ts —
// plus "bar", the capsule bar on every page (src/sanity/lib/bar.ts).
//
// The webhook's projection can say whether a field the bar shows changed:
//   { _id, _type, "barChanged": delta::changedAny((title, slug, shortDescription,
//     coverMedia, order, excerpt, coverImage, publishedAt, bio, email,
//     linkedinUrl, githubUrl)) }
// Without `barChanged` the bar is refreshed on every publish, as before.
const REVALIDATABLE_TYPES = new Set([
  "project",
  "journalPost",
  "journalPage",
  "about",
]);

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.SANITY_WEBHOOK_SECRET;
    if (!secret) {
      // Without the secret every delivery would read as a bad signature
      // (401) and nothing would say why.
      console.error("SANITY_WEBHOOK_SECRET is not set: the Sanity webhook cannot revalidate");
      return new NextResponse("Webhook secret not configured", { status: 500 });
    }
    const { isValidSignature, body } = await parseBody<{
      _id?: string;
      _type: string;
      barChanged?: boolean;
    }>(req, secret);

    if (!isValidSignature) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    if (!body?._type) {
      return new NextResponse("Bad request", { status: 400 });
    }

    if (!REVALIDATABLE_TYPES.has(body._type)) {
      return NextResponse.json({ revalidated: false, type: body._type });
    }

    // A draft or a release version changes nothing a visitor sees (draft
    // mode reads past the cache), so a typing session in the Studio doesn't
    // mark pages stale, whatever the webhook's filter says.
    if (body._id?.startsWith("drafts.") || body._id?.startsWith("versions.")) {
      return NextResponse.json({ revalidated: false, draft: true });
    }

    // "max" = stale-while-revalidate: the next visitor is served the old copy
    // while the fresh one loads, so the webhook never blocks a request.
    const tags = [body._type];
    if (body._type !== "journalPage" && body.barChanged !== false) tags.push("bar");
    for (const tag of tags) revalidateTag(tag, "max");

    return NextResponse.json({ revalidated: true, tags });
  } catch (err) {
    console.error("Revalidation error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
