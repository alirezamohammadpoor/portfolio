#!/usr/bin/env node
// Gives every gallery video its size and its first frame (Ali, 11-05), so the
// project page knows each card's shape before the clip loads (no shift) and
// shows a still instead of a black card (no flicker).
//
// For each galleryVideo item that lacks them it reads the clip's pixel size
// with ffprobe, grabs frame 0 with ffmpeg, uploads that as an image asset and
// sets `videoWidth`, `videoHeight` and `poster` on the item. It patches the
// published document and its draft (when there is one) alike, so publishing
// a draft later keeps them. The fields are additive: the live site only
// starts using them, nothing else changes.
//
//   node scripts/sanity/video-posters.mjs --dry-run   # no token: reads, probes, prints the plan
//   node scripts/sanity/video-posters.mjs             # uploads posters + patches
//   node scripts/sanity/video-posters.mjs --force     # redo items that already have them
//                                                      (a swapped clip is redone without it)
//   node scripts/sanity/video-posters.mjs --only zone-2
//
// Needs ffmpeg + ffprobe on the PATH. Token (write access): SANITY_TOKEN, an
// Editor token of its own, in the environment or in ./.env.local or
// ~/Developer/portfolio-layout/.env.local. The app's SANITY_API_READ_TOKEN is
// a Viewer token and is not read here.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT = "v3d28bxo";
const DATASET = "production";
const API = `https://${PROJECT}.api.sanity.io/v2024-01-01`;
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
if (args.includes("--only") && (!ONLY || ONLY.startsWith("--") || !/^[a-z0-9-]+$/.test(ONLY))) {
  // Without a slug the filter would drop out and every project be patched.
  console.error("--only needs a project slug, e.g. --only zone-2");
  process.exit(1);
}

function findToken() {
  if (process.env.SANITY_TOKEN) return process.env.SANITY_TOKEN;
  for (const file of [join(process.cwd(), ".env.local"), join(homedir(), "Developer/portfolio-layout/.env.local")]) {
    if (!existsSync(file)) continue;
    const env = Object.fromEntries(
      readFileSync(file, "utf8")
        .split("\n")
        .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
    );
    if (env.SANITY_TOKEN) return env.SANITY_TOKEN;
  }
  return null;
}

const token = DRY ? findToken() : findToken() ?? (console.error("No write token found (see the header)."), process.exit(1));
const auth = token ? { Authorization: `Bearer ${token}` } : {};

const fileUrl = (ref) => {
  const [, id, ext] = ref.split("-");
  return `https://cdn.sanity.io/files/${PROJECT}/${DATASET}/${id}.${ext}`;
};

async function query(groq) {
  // raw = published and drafts; without a token only published documents.
  const url = `${API}/data/query/${DATASET}?query=${encodeURIComponent(groq)}${token ? "&perspective=raw" : ""}`;
  const res = await fetch(url, { headers: auth });
  if (!res.ok) throw new Error(`query ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

const docs = await query(
  `*[_type == "project"${ONLY ? ` && slug.current == "${ONLY}"` : ""}]{ _id, "slug": slug.current, "videos": gallery[_type == "galleryVideo"]{ _key, video, poster, videoWidth, videoHeight, "posterFile": poster.asset->originalFilename } }`,
);

const tmp = mkdtempSync(join(tmpdir(), "video-posters-"));
const probed = new Map(); // asset ref -> { width, height, jpg, posterRef }
function probe(ref) {
  if (probed.has(ref)) return probed.get(ref);
  const url = fileUrl(ref);
  const out = JSON.parse(
    execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", url], {
      encoding: "utf8",
    }),
  );
  const { width, height } = out.streams[0];
  const jpg = join(tmp, `${ref}.jpg`);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", url, "-frames:v", "1", "-q:v", "2", jpg]);
  const entry = { width, height, jpg, posterRef: null };
  probed.set(ref, entry);
  return entry;
}

async function uploadPoster(entry, ref) {
  if (entry.posterRef) return entry.posterRef;
  const res = await fetch(`${API}/assets/images/${DATASET}?filename=${encodeURIComponent(`${ref}-poster.jpg`)}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "image/jpeg" },
    body: readFileSync(entry.jpg),
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${await res.text()}`);
  entry.posterRef = (await res.json()).document._id;
  return entry.posterRef;
}

let changed = 0;
for (const doc of docs) {
  const set = {};
  for (const item of doc.videos ?? []) {
    const ref = item.video?.asset?._ref;
    if (!ref) continue;
    // Posters are uploaded as `<clip asset id>-poster.jpg`: one made for
    // another clip means the clip was swapped since, so size and poster are redone.
    const current = item.posterFile === `${ref}-poster.jpg`;
    if (!FORCE && current && item.videoWidth && item.videoHeight) continue;
    const entry = probe(ref);
    const at = `gallery[_key=="${item._key}"]`;
    console.log(`${doc._id} (${doc.slug}) ${item._key}: ${entry.width}x${entry.height}, poster ${entry.jpg}`);
    if (DRY) continue;
    const posterRef = await uploadPoster(entry, ref);
    set[`${at}.videoWidth`] = entry.width;
    set[`${at}.videoHeight`] = entry.height;
    set[`${at}.poster`] = { _type: "image", asset: { _type: "reference", _ref: posterRef } };
  }
  if (DRY || !Object.keys(set).length) continue;
  const res = await fetch(`${API}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: [{ patch: { id: doc._id, set } }] }),
  });
  if (!res.ok) throw new Error(`patch ${doc._id} ${res.status}: ${await res.text()}`);
  changed++;
  console.log(`patched ${doc._id}`);
}
console.log(DRY ? `dry run: ${probed.size} clips probed, nothing written` : `done: ${changed} documents patched`);
