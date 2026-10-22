import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

// Cache tags mirror Sanity `_type` values — see src/sanity/lib/data.ts.
const REVALIDATABLE_TYPES = new Set([
  "project",
  "journalPost",
  "journalPage",
  "about",
]);

export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{
      _type: string;
    }>(req, process.env.SANITY_WEBHOOK_SECRET);

    if (!isValidSignature) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    if (!body?._type) {
      return new NextResponse("Bad request", { status: 400 });
    }

    if (!REVALIDATABLE_TYPES.has(body._type)) {
      return NextResponse.json({ revalidated: false, type: body._type });
    }

    // "max" = stale-while-revalidate: the next visitor is served the old copy
    // while the fresh one loads, so the webhook never blocks a request.
    revalidateTag(body._type, "max");

    return NextResponse.json({ revalidated: true, tag: body._type });
  } catch (err) {
    console.error("Revalidation error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
