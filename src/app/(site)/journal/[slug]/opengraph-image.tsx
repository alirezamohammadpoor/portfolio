import { ImageResponse } from "next/og";
import { getJournalPost } from "@/sanity/lib/data";
import { palette } from "@/lib/palette";

export const alt = "Ali Reza Mohammad Poor — Journal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function JournalOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The page's own cached, tagged fetcher: no uncached round trip per share.
  const post = await getJournalPost(slug);

  const title = post?.title ?? "Journal";
  const excerpt = post?.excerpt ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: palette.bg,
          color: palette.primary,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: "-0.01em",
            color: palette.secondary,
          }}
        >
          <span>alirezamp.com/journal</span>
          <span>Journal</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          {excerpt && (
            <div
              style={{
                fontSize: 28,
                color: palette.secondary,
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {excerpt}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: palette.primary,
          }}
        >
          Ali Reza Mohammad Poor
        </div>
      </div>
    ),
    size,
  );
}
