import { Suspense } from "react";
import type { Metadata } from "next";
import BarLab from "@/components/lab/bar/BarLab";
import type { LabClip, LabData, LabProject } from "@/components/lab/bar/types";
import { getAbout, getJournalPosts, getProject, getProjects } from "@/sanity/lib/data";
import { fileUrl, imageUrl } from "@/sanity/lib/image";

// Site bar as one system (Ali, 11-16): three directions for the top bar,
// Work, About and the project pill, behind the prototype picker. Not linked,
// not indexed; delete once a direction is promoted.
export const metadata: Metadata = {
  title: "Lab — Site bar",
  robots: { index: false, follow: false },
};

type Img = { asset?: { _ref?: string } } | null | undefined;
type Media = { type?: string; image?: Img; video?: { asset?: { _ref?: string } } | null; poster?: Img } | null | undefined;
type Block = { _type?: string; children?: { text?: string }[] };
type GalleryItem = {
  _type?: string;
  image?: Img;
  video?: { asset?: { _ref?: string } } | null;
  poster?: Img;
  phones?: Media[] | null;
  testName?: string | null;
  label?: string | null;
};

const still = (img: Img) => (img?.asset?._ref ? imageUrl(img as never, 1280) : null);
const clip = (v: { asset?: { _ref?: string } } | null | undefined) => (v?.asset?._ref ? fileUrl(v.asset._ref) : null);
const plain = (blocks: unknown) =>
  ((blocks ?? []) as Block[])
    .filter((b) => b._type === "block")
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .filter(Boolean);

function clipsOf(gallery: GalleryItem[]): LabClip[] {
  return gallery.map((g) => {
    if (g._type === "galleryPhones") {
      const p = g.phones?.[0];
      return {
        label: g.testName ? `A/B test – ${g.testName}` : g.label?.trim() || null,
        still: still(p?.poster) ?? still(p?.image),
        video: clip(p?.video),
      };
    }
    if (g._type === "galleryVideo") return { label: g.label?.trim() || null, still: still(g.poster), video: clip(g.video) };
    return { label: null, still: still(g.image), video: null };
  });
}

async function load(): Promise<LabData> {
  const [projects, posts, about] = await Promise.all([getProjects(), getJournalPosts(), getAbout().catch(() => null)]);
  const full = await Promise.all(projects.map((p) => (p.slug?.current ? getProject(p.slug.current) : null)));
  const labProjects: LabProject[] = projects.map((p, i) => {
    const cover = p.coverMedia as Media;
    const doc = full[i] as { gallery?: GalleryItem[]; fullDescription?: unknown; techStack?: string[] | null } | null;
    const coverStill = still(cover?.poster) ?? still(cover?.image);
    const coverVideo = cover?.type === "video" ? clip(cover.video) : null;
    const clips = clipsOf(doc?.gallery ?? []);
    return {
      slug: p.slug?.current ?? p._id,
      title: p.title ?? "Untitled",
      line: p.shortDescription ?? "",
      still: coverStill ?? clips[0]?.still ?? null,
      video: coverVideo,
      clips: clips.length ? clips : [{ label: null, still: coverStill, video: coverVideo }],
      description: plain(doc?.fullDescription),
      tech: doc?.techStack ?? [],
    };
  });
  const bio = plain(about?.bio);
  const [firstPara = "", ...restParas] = bio;
  const end = firstPara.search(/[.!?](\s|$)/);
  const lead = end < 0 ? firstPara : firstPara.slice(0, end + 1);
  const tail = end < 0 ? "" : firstPara.slice(end + 1).trim();
  return {
    projects: labProjects,
    posts: posts.map((p) => ({
      slug: p.slug?.current ?? p._id,
      title: p.title ?? "Untitled",
      excerpt: p.excerpt ?? "",
      still: still(p.coverImage as Img),
    })),
    about: {
      lead,
      body: [...(tail ? [tail] : []), ...restParas],
      email: about?.email ?? null,
      linkedinUrl: about?.linkedinUrl ?? null,
      githubUrl: about?.githubUrl ?? null,
    },
    intro: "Frontend developer at the intersection of product and design. Currently at TRY, Stockholm.",
  };
}

async function Lab() {
  const data = await load();
  return <BarLab data={data} />;
}

export default function BarLabPage() {
  return (
    <>
      {/* The lab draws its own bar: the site header steps aside. */}
      <style>{`body > header, header.fixed { display: none !important; } main { padding-top: 0 !important; }`}</style>
      <Suspense fallback={null}>
        <Lab />
      </Suspense>
    </>
  );
}
