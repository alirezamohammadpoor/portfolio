import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject } from "@/sanity/lib/data";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import type { AbTest, Chapter, TestSwitcher } from "@/components/project/ProjectChapters";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import COPY from "./copy.json";

// Preview of the Stronger page in its new shape (Ali, 11-02 grill + Figma pf
// 35:1066): the five-test compilation as the landing media, the claim under
// the title, a background chapter with a laptop + phone pair, a statement
// before the switcher, the badge result leading with the miss over a small
// table, and the hygiene chapter. Live Stronger data with copy.json laid
// over it, the same file scripts/sanity/stronger-v3.py writes to Sanity.
// Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Stronger",
  robots: { index: false, follow: false },
};

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
type Spec = {
  _key: string;
  statement?: string;
  title?: string;
  subtext?: string;
  text?: string[];
  layout?: string;
  caption?: string;
  media?: { video: string; poster?: string };
  phone?: { video: string; poster?: string };
  table?: string[][];
};
type TestCopy = { morph: string; text: string; hypothesis: string; metric: string; result: string; decision: string };

const block = (text: string, key: string) => ({
  _type: "block" as const,
  _key: key,
  style: "normal" as const,
  markDefs: [],
  children: [{ _type: "span" as const, _key: `${key}s`, text, marks: [] }],
});

// "public:/x.mp4" is a file in public/ (ChapterMedia and LandingMedia play "/" refs as is).
const ref = (r: string) => r.replace(/^public:/, "");

const video = (m: { video: string; poster?: string }) => ({
  type: "video" as const,
  video: { _type: "file" as const, asset: { _type: "reference" as const, _ref: ref(m.video) } },
  poster: m.poster ? { _type: "image" as const, asset: { _type: "reference" as const, _ref: ref(m.poster) } } : null,
  image: null,
  phones: null,
  table: null,
  frame: null,
});

function toChapter(c: Spec): Chapter {
  return {
    _key: c._key,
    _type: "chapter",
    statement: c.statement ?? null,
    title: c.title ?? null,
    subtext: c.subtext ?? null,
    text: c.text ? c.text.map((t, i) => block(t, `${c._key}-${i}`)) : null,
    caption: c.caption ?? null,
    layout: (c.layout ?? "full") as Chapter["layout"],
    side: null,
    media: c.table
      ? {
          type: "table",
          video: null,
          poster: null,
          image: null,
          phones: null,
          frame: null,
          table: c.table.map((cells, i) => ({ _key: `row-${i}`, cells })),
        }
      : c.media
        ? video(c.media)
        : null,
    phone: c.phone ? video(c.phone) : null,
  };
}

export default async function StrongerLabPage() {
  const project = await getProject("stronger");
  if (!project) notFound();

  const live = (project.chapters ?? []).find((c): c is TestSwitcher => c._type === "testSwitcher");
  const tests = COPY.tests as Record<string, TestCopy>;
  const switcher: TestSwitcher | null = live
    ? {
        ...live,
        title: null,
        tests: (live.tests ?? []).map((t) => {
          const copy = t.label ? tests[t.label] : undefined;
          return copy
            ? { ...t, ...copy, morph: copy.morph as AbTest["morph"], status: null, text: [block(copy.text, `${t._key}-text`)] }
            : t;
        }),
      }
    : null;

  const chapters: NonNullable<Project["chapters"]> = (COPY.chapters as Spec[]).flatMap<NonNullable<Project["chapters"]>[number]>((c) =>
    c._key === "switcher" ? (switcher ? [switcher] : []) : [toChapter(c)],
  );

  // The compilation leads: landing media here, home card too once it is in Sanity.
  const compilation = {
    _type: "galleryVideo" as const,
    _key: "v3-compilation",
    video: { _type: "file" as const, asset: { _type: "reference" as const, _ref: ref(COPY.compilation.video) } },
  };
  const gallery = [compilation, ...(project.gallery ?? []).slice(1)] as Project["gallery"];

  const fixture: Project = {
    ...project,
    fullDescription: [block(COPY.claim, "v3-claim")],
    techStack: COPY.stack,
    gallery,
    chapters,
  };
  return <ProjectPageClient project={fixture} nextProject={project.nextProject} prevProject={project.prevProject} />;
}
