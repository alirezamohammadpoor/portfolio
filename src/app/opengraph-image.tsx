import { ImageResponse } from "next/og";

export const alt = "Ali Reza Mohammad Poor — Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "#f5f4f1",
          color: "#111",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "-0.01em",
            color: "#555",
          }}
        >
          alirezamp.com
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 92,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            Ali Reza Mohammad Poor
          </div>
          <div
            style={{
              fontSize: 40,
              color: "#555",
              letterSpacing: "-0.01em",
            }}
          >
            Full-stack developer &amp; creative technologist
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#555",
          }}
        >
          <span>Portfolio</span>
          <span>Journal · Projects · About</span>
        </div>
      </div>
    ),
    size,
  );
}
