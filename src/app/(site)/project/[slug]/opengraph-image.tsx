import { getProject } from "@/sanity/lib/data";
import { palette } from "@/lib/palette";
import { OG_SIZE, ogResponse } from "@/lib/og";

export const alt = "Ali Reza Mohammad Poor — Project";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ProjectOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The page's own cached, tagged fetcher: no uncached round trip per share.
  const project = await getProject(slug);

  const title = project?.title ?? "Project";
  const description = project?.shortDescription ?? "";
  const techStack: string[] = Array.isArray(project?.techStack)
    ? project.techStack.slice(0, 6)
    : [];

  return ogResponse(
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
              // Satori's own clamp (the -webkit-box one is ignored there).
              display: "block",
              lineClamp: 2,
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: 28,
                color: palette.secondary,
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
                display: "block",
                lineClamp: 3,
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
            color: palette.secondary,
          }}
        >
          <span style={{ color: palette.primary }}>Ali Reza Mohammad Poor</span>
          {techStack.length > 0 && <span>{techStack.join(" · ")}</span>}
        </div>
      </div>
    ),
    "project",
  );
}
