import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject } from "@/sanity/lib/data";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import type { Chapter, Statement } from "@/components/project/ProjectChapters";
import ChaptersLabClient from "../chapters/ChaptersLabClient";

// Preview of the loop media (Henriksson pilot, 11-03): statement lines, a
// carousel chapter and a bento chapter, cut from Zone 2's flush clips until
// the Henriksson loops are recorded. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Loops",
  robots: { index: false, follow: false },
};

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
type Media = NonNullable<Chapter["media"]>;
type Tile = NonNullable<NonNullable<NonNullable<Media["rows"]>[number]["tiles"]>[number]>;

const block = (text: string, key: string) => ({
  _type: "block" as const,
  _key: key,
  style: "normal" as const,
  markDefs: [],
  children: [{ _type: "span" as const, _key: `${key}s`, text, marks: [] }],
});

const EMPTY = { video: null, image: null, poster: null, phones: null, rows: null, slides: null, frame: null };

export default async function LoopsLabPage() {
  const project = await getProject("zone-2");
  if (!project) notFound();

  const gallery = project.gallery ?? [];
  const laptop = gallery.flatMap((g) => (g._type === "galleryVideo" && g.video ? [g.video] : []));
  const phones = gallery.find((g) => g._type === "galleryPhones");
  const slots = phones && phones._type === "galleryPhones" ? phones.phones ?? [] : [];
  const phoneClip = slots.find((s) => s.type === "video")?.video ?? null;
  const phoneStill = slots.find((s) => s.type === "image")?.image ?? null;

  const tile = (key: string, device: "laptop" | "phone", video: Tile["video"], image: Tile["image"] = null): Tile => ({
    _key: key,
    type: image ? "image" : "video",
    device,
    video: image ? null : video,
    image,
    poster: null,
    frame: null,
  });

  const statement = (key: string, text: string, subtext: string | null = null): Statement => ({
    _key: key,
    _type: "statement",
    title: null,
    text,
    subtext,
  });

  const chapter = (key: string, title: string, text: string, media: Media, layout: Chapter["layout"] = "full"): Chapter => ({
    _key: key,
    _type: "chapter",
    title,
    caption: null,
    layout,
    side: "right",
    text: [block(text, `${key}-0`)],
    media,
  });

  const steps = ["Inbox", "Draft", "Release", "Live"];
  const chapters: Project["chapters"] = [
    statement("s1", "What happens when a new facility appears in the booking system?"),
    chapter("c-carousel", "The booking feed is the site", "Facts and prices stay read-only, new facilities sync in as drafts, and a To do page in the Studio turns the CMS into a workflow for editors.", {
      ...EMPTY,
      type: "carousel",
      slides: laptop.slice(0, 4).map((v, i) => ({ ...tile(`step-${i}`, "laptop", v), label: steps[i] ?? null })),
    }),
    statement("s2", "Fewer steps between choosing a unit and paying for it.", "Placeholder subtext: one or two sentences under the line."),
    chapter("c-bento", "Booking, made easier", "One set of prices per facility, the first price near the top on a phone, and a booking modal where you can switch size without losing what you typed.", {
      ...EMPTY,
      type: "bento",
      rows: [
        { _key: "r1", tiles: [tile("a", "phone", phoneClip), tile("b", "laptop", laptop[1] ?? null)] },
        { _key: "r2", tiles: [tile("c", "laptop", laptop[2] ?? null), tile("d", "phone", null, phoneStill as Tile["image"])] },
        { _key: "r3", tiles: [tile("e", "laptop", laptop[3] ?? null)] },
      ],
    }),
    statement("s3", "A working product beats slides."),
  ];

  const fixture: Project = { ...project, chapters };
  return <ChaptersLabClient project={fixture} nextProject={project.nextProject} prevProject={project.prevProject} />;
}
