// Phase 1 audit: every project's gallery as data. Run: node scripts/audit-galleries.mjs
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter(l => l.includes("=") && !l.startsWith("#")).map(l => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }));
const client = createClient({ projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-07-11", useCdn: false, token: env.SANITY_API_READ_TOKEN });
const q = `*[_type=="project"] | order(order asc) { title, "slug": slug.current, "titleLen": length(title), "hasShort": defined(shortDescription), "hasCase": defined(caseStudy), "hasSite": defined(siteUrl), "stack": count(techStack), "cover": coverMedia.type,
  "items": gallery[]{ _type, "w": coalesce(image.asset->metadata.dimensions.width, 0), "h": coalesce(image.asset->metadata.dimensions.height, 0), "size": coalesce(image.asset->size, video.asset->size, 0), "mime": coalesce(video.asset->mimeType, image.asset->mimeType) } }`;
const rows = await client.fetch(q);
console.log("| Project | Items | Types | Aspects | Total MB | Title chars | Short desc | Case study | Site | Stack |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of rows) {
  const items = r.items ?? [];
  const types = [...new Set(items.map(i => i._type === "galleryVideo" ? "video" : "image"))].join("+") || "none";
  const aspects = [...new Set(items.map(i => i.w && i.h ? (i.w / i.h).toFixed(2) : "video"))].join(", ");
  const mb = (items.reduce((s, i) => s + (i.size || 0), 0) / 1048576).toFixed(1);
  console.log(`| ${r.title} | ${items.length} | ${types} | ${aspects} | ${mb} | ${r.titleLen} | ${r.hasShort ? "yes" : "no"} | ${r.hasCase ? "yes" : "no"} | ${r.hasSite ? "yes" : "no"} | ${r.stack ?? 0} |`);
}
