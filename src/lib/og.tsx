import { ImageResponse } from "next/og";
import { palette } from "@/lib/palette";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Renders a share card now, so a failure is caught here instead of in the
 * response stream: @vercel/og's font fallback crashes on Arabic-script text,
 * which would make the route a 500 (no share image at all) for a project or
 * post with a Persian word in its title. On failure the name-only card is
 * served instead.
 */
export async function ogResponse(card: React.ReactElement, label: string): Promise<Response> {
  try {
    const res = new ImageResponse(card, OG_SIZE);
    const body = await res.arrayBuffer();
    return new Response(body, { status: res.status, headers: res.headers });
  } catch (err) {
    console.error(`OG image for ${label} failed to render, serving the name-only card:`, err);
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
          <div style={{ fontSize: 24, letterSpacing: "-0.01em", color: palette.secondary }}>alirezamp.com/{label}</div>
          <div style={{ fontSize: 84, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Ali Reza Mohammad Poor
          </div>
          <div style={{ fontSize: 24, color: palette.secondary }}>Portfolio</div>
        </div>
      ),
      OG_SIZE,
    );
  }
}
