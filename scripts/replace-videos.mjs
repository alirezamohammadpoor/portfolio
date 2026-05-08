// One-off migration: replace project video assets in Sanity with web-optimized
// re-encodes from ~/Screen Studio Projects/web-optimized/.
//
// Usage:
//   node scripts/replace-videos.mjs           # dry run — audit only
//   node scripts/replace-videos.mjs --apply   # actually upload + patch
//
// Requires SANITY_API_READ_TOKEN in .env.local to have WRITE permissions.
// If it doesn't, the apply step will 401 — the audit will still work.

import { createClient } from "@sanity/client";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

// --- Load .env.local manually so we don't depend on dotenv ---
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const APPLY = process.argv.includes("--apply");
const ENCODED_DIR = `${homedir()}/Screen Studio Projects/web-optimized`;

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-07-11",
  token: process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
});

console.log(`Mode: ${APPLY ? "APPLY (will upload + patch)" : "DRY RUN (audit only)"}\n`);

// --- 1. Pull every project, expand video asset refs ---
const projects = await client.fetch(`
  *[_type == "project"]{
    _id,
    title,
    "slug": slug.current,
    coverMedia,
    gallery[]{
      _key,
      _type,
      video{ asset->{ _id, originalFilename, size } }
    }
  }
`);

// --- 2. Build a flat list of every video reference + its target file ---
const videoRefs = [];
for (const p of projects) {
  // Cover video
  if (p.coverMedia?.type === "video" && p.coverMedia.video?.asset?._ref) {
    const assetId = p.coverMedia.video.asset._ref;
    const asset = await client.getDocument(assetId);
    videoRefs.push({
      project: p.title,
      slug: p.slug,
      kind: "cover",
      docId: p._id,
      patchPath: "coverMedia.video.asset._ref",
      assetId,
      originalFilename: asset?.originalFilename,
      currentSize: asset?.size,
    });
  }
  // Gallery videos
  for (const item of p.gallery ?? []) {
    if (item._type === "galleryVideo" && item.video?.asset) {
      videoRefs.push({
        project: p.title,
        slug: p.slug,
        kind: "gallery",
        docId: p._id,
        patchPath: `gallery[_key=="${item._key}"].video.asset._ref`,
        assetId: item.video.asset._id,
        originalFilename: item.video.asset.originalFilename,
        currentSize: item.video.asset.size,
      });
    }
  }
}

// --- 3. Match each ref to a local web-optimized file ---
function findLocal(originalFilename) {
  if (!originalFilename) return null;
  const base = originalFilename.replace(/\.mp4$/i, "");
  const candidate = `${ENCODED_DIR}/${base}-web.mp4`;
  return existsSync(candidate) ? candidate : null;
}

let matched = 0;
let missing = 0;
let totalBefore = 0;
let totalAfter = 0;

console.log(`Found ${videoRefs.length} video references in Sanity.\n`);
console.log("project".padEnd(20), "kind".padEnd(8), "originalFilename".padEnd(60), "before".padEnd(8), "→ after".padEnd(8), "match");
console.log("-".repeat(120));

for (const ref of videoRefs) {
  const local = findLocal(ref.originalFilename);
  const beforeKb = ref.currentSize ? Math.round(ref.currentSize / 1024) : 0;
  const afterKb = local ? Math.round(statSync(local).size / 1024) : 0;
  totalBefore += beforeKb;
  totalAfter += afterKb;
  if (local) matched++;
  else missing++;
  ref.localPath = local;
  console.log(
    (ref.project ?? "—").padEnd(20).slice(0, 20),
    ref.kind.padEnd(8),
    (ref.originalFilename ?? "—").padEnd(60).slice(0, 60),
    `${beforeKb}KB`.padEnd(8),
    `${afterKb}KB`.padEnd(8),
    local ? "✓" : "MISSING",
  );
}

console.log("-".repeat(120));
console.log(`Matched: ${matched} / ${videoRefs.length}`);
console.log(`Total: ${(totalBefore / 1024).toFixed(1)} MB → ${(totalAfter / 1024).toFixed(1)} MB (${Math.round(100 * totalAfter / totalBefore)}% of original)\n`);

if (!APPLY) {
  console.log("Dry run complete. Re-run with --apply to perform the upload + patch.");
  process.exit(0);
}

if (missing > 0) {
  console.log(`Refusing to apply: ${missing} ref(s) have no matching local file. Review the table above.`);
  process.exit(1);
}

// --- 4. APPLY: upload each new file, patch the document ---
console.log("Applying...\n");

for (const ref of videoRefs) {
  if (!ref.localPath) continue;
  process.stdout.write(`[${ref.project}/${ref.kind}] uploading ${ref.originalFilename}... `);
  const buffer = readFileSync(ref.localPath);
  const newAsset = await client.assets.upload("file", buffer, {
    filename: ref.originalFilename, // keep the human-readable name in Sanity
    contentType: "video/mp4",
  });
  process.stdout.write(`new asset ${newAsset._id}, patching... `);

  // Patch the document to point to the new asset
  const patch = client.patch(ref.docId);
  if (ref.kind === "cover") {
    patch.set({ "coverMedia.video.asset._ref": newAsset._id });
  } else {
    // gallery: use the JSONPath-like syntax with set
    patch.set({ [ref.patchPath]: newAsset._id });
  }
  await patch.commit({ autoGenerateArrayKeys: false });
  console.log("done.");
}

console.log("\nAll patches committed. Old assets are NOT deleted — they remain orphaned in Sanity until manually cleaned up.");
console.log("To clean up later, query: *[_type == \"sanity.fileAsset\" && !(_id in path('drafts.**')) && count(*[references(^._id)]) == 0]");
