import { ImageResponse } from "next/og";
import { client } from "@/sanity/lib/client";
import { PROJECT_BY_SLUG_QUERY } from "@/sanity/lib/queries";

export const alt = "Ali Reza Mohammad Poor — Project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ProjectOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await client.fetch(PROJECT_BY_SLUG_QUERY, { slug });

  const title = project?.title ?? "Project";
  const description = project?.shortDescription ?? "";
  const techStack: string[] = Array.isArray(project?.techStack)
    ? project.techStack.slice(0, 6)
    : [];

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
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: "-0.01em",
            color: "#555",
          }}
        >
          <span>alirezamp.com/project</span>
          <span>Case Study</span>
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
              fontSize: 84,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: 28,
                color: "#555",
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "#555",
          }}
        >
          <span style={{ color: "#111" }}>Ali Reza Mohammad Poor</span>
          {techStack.length > 0 && <span>{techStack.join(" · ")}</span>}
        </div>
      </div>
    ),
    size,
  );
}
