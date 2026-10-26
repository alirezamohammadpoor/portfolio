import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { client } from "@/sanity/lib/client";
import PlayerLab from "@/components/player/PlayerLab";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Player",
  robots: { index: false, follow: false },
};

const CLIPS_QUERY = `{
  "project": *[_type == "project" && slug.current == "nelson-garden"][0]{
    "clips": gallery[_type == "galleryVideo"][0...3]{ "src": video.asset->url, "label": coalesce(caption, "Nelson Garden") }
  },
  "journal": *[_type == "journalPost" && slug.current == "curating-taste"][0]{
    "clips": body[].markDefs[_type == "richPreview" && defined(videoUrl)]{ "src": videoUrl, label }
  }
}`;

interface Clip {
  src: string;
  label?: string | null;
}

async function getClips() {
  "use cache";
  cacheLife("max");
  cacheTag("project");
  cacheTag("journalPost");
  return client.fetch<{
    project?: { clips?: Clip[] };
    journal?: { clips?: (Clip | null)[] };
  }>(CLIPS_QUERY);
}

export default async function PlayerLabPage() {
  const data = await getClips();
  const masters = (data.project?.clips ?? []).filter((c) => c?.src);
  const journal = (data.journal?.clips ?? []).filter((c): c is Clip => Boolean(c?.src));
  return <PlayerLab masters={masters} journal={journal} />;
}
