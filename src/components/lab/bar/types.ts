// Data the bar lab runs on: real Sanity content, flattened on the server to
// what the prototype shows (names, stills, clip labels), plus a worst-case
// fixture (break-ui) the harness can swap in at the data boundary.

export type LabClip = {
  /** The pill's text on this clip: `A/B test – name`, a clip label, or null (project title). */
  label: string | null;
  still: string | null;
  video: string | null;
};

export type LabProject = {
  slug: string;
  title: string;
  line: string;
  still: string | null;
  video: string | null;
  clips: LabClip[];
  description: string[];
  tech: string[];
};

export type LabPost = {
  slug: string;
  title: string;
  excerpt: string;
  still: string | null;
};

export type LabAbout = {
  lead: string;
  body: string[];
  email: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
};

export type LabData = {
  projects: LabProject[];
  posts: LabPost[];
  about: LabAbout;
  intro: string;
};

/** Where the visitor is inside the prototype. */
export type LabPage =
  | { kind: "home" }
  | { kind: "project"; index: number; clip: number }
  | { kind: "post"; index: number };

export type Panel = "work" | "about" | "details" | null;

const LONG_TEST =
  "A/B test – Bestseller badge on product cards with low-stock urgency copy, mobile only";

/** The longest names the site could plausibly carry, spread over the first rows. */
export function worstCase(data: LabData): LabData {
  const [first, ...rest] = data.projects;
  const long: LabProject = {
    slug: "worst-long",
    title: "Henriksson Förvaring — self-storage booking rebuilt end to end",
    line: "A booking flow for a self-storage chain: search a city, find the nearest store, pick a unit size and book it, on laptop and phone, without a call.",
    still: null,
    video: null,
    clips: [
      { label: null, still: null, video: null },
      { label: LONG_TEST, still: null, video: null },
      { label: "Prototype – Shop the Look with saved outfits and a size picker", still: null, video: null },
    ],
    description: [
      "A project with no cover and the longest title the index has to hold. Every clip is missing its media, so each surface shows its empty shape instead of collapsing.",
    ],
    tech: ["Next.js", "Sanity", "TypeScript", "Tailwind"],
  };
  const short: LabProject = { ...(first ?? long), slug: "worst-short", title: "Ok", line: "Two letters." };
  const firstWithLong: LabProject | undefined = first && {
    ...first,
    clips: [first.clips[0] ?? { label: null, still: first.still, video: first.video }, { label: LONG_TEST, still: first.still, video: null }, ...first.clips.slice(1)],
  };
  const posts: LabPost[] = [
    {
      slug: "worst-post",
      title: "How a five-test A/B programme on product cards taught me to design for the second visit, not the first",
      excerpt: "A long title with no cover image.",
      still: null,
    },
    ...data.posts,
  ];
  return {
    ...data,
    projects: [long, ...(firstWithLong ? [firstWithLong] : []), short, ...rest],
    posts,
  };
}
