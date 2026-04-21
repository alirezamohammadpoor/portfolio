import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{
      _type: string;
      slug?: { current?: string };
    }>(req, process.env.SANITY_WEBHOOK_SECRET);

    if (!isValidSignature) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    if (!body?._type) {
      return new NextResponse("Bad request", { status: 400 });
    }

    switch (body._type) {
      case "project":
        revalidatePath("/");
        if (body.slug?.current) {
          revalidatePath(`/project/${body.slug.current}`);
        }
        break;

      case "journalPost":
        revalidatePath("/journal");
        if (body.slug?.current) {
          revalidatePath(`/journal/${body.slug.current}`);
        }
        break;

      case "about":
        revalidatePath("/about");
        break;
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    console.error("Revalidation error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
