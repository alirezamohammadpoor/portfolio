#!/usr/bin/env node
// New home covers (Ali, 26 Nov: "go"). Replaces coverMedia.video on four projects with the 1440 x 900 @2x films:
//   Zone 2 (hero film, laptop), Paul & Friends (split mega menu, laptop),
//   Sania D'mina (colour swap on a phone, photo ground), Stronger (A/B tests on a phone, photo ground).
// The covers are flush, so Paul & Friends' old cover frame (backdrop image) is removed. TRY Skills and DevOps are untouched.
//
//   node covers-1440.mjs --dry-run   # reads the live docs, checks the files, prints the plan, writes nothing
//   node covers-1440.mjs             # uploads 4 videos, then patches each project (and its draft, if any)
//
// Run it from this folder. Token: SANITY_TOKEN (Editor) in the environment, or in ./.env.local,
// ~/Developer/portfolio/.env.local or ~/Developer/portfolio-layout/.env.local. The current docs are saved to
// ./covers-before-1440.json first, so the old covers can be put back.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT = "v3d28bxo", DATASET = "production", API = `https://${PROJECT}.api.sanity.io/v2024-01-01`;
const DRY = process.argv.includes("--dry-run"), DIR = process.cwd();
const JOBS = [
  { id: "3d1621ce-6669-47e4-b29a-b68d67b5aea5", file: "zone2-cover.mp4" },
  { id: "project-paul-and-friends", file: "pnf-cover.mp4", dropFrame: true },
  { id: "980e5a87-865e-4153-ab92-78872dd6b622", file: "sania-cover.mp4" },
  { id: "project-stronger", file: "stronger-cover.mp4" },
];

function findToken() {
  if (process.env.SANITY_TOKEN) return process.env.SANITY_TOKEN;
  for (const file of [join(DIR, ".env.local"), join(homedir(), "Developer/portfolio/.env.local"), join(homedir(), "Developer/portfolio-layout/.env.local")]) {
    if (!existsSync(file)) continue;
    const m = readFileSync(file, "utf8").match(/^\s*SANITY_TOKEN\s*=\s*"?([^"\n]*)"?\s*$/m);
    if (m) return m[1];
  }
  return null;
}

const missing = JOBS.map((j) => j.file).filter((f) => !existsSync(join(DIR, f)));
if (missing.length) { console.error(`Missing in ${DIR}:\n  ${missing.join("\n  ")}`); process.exit(1); }
const token = findToken();
if (!DRY && !token) { console.error("No SANITY_TOKEN found (Editor token; see the header)."); process.exit(1); }
const auth = token ? { Authorization: `Bearer ${token}` } : {};

const ids = JOBS.flatMap((j) => [j.id, `drafts.${j.id}`]);
const q = encodeURIComponent(`*[_id in ${JSON.stringify(ids)}]{_id, title, coverMedia}`);
const docs = (await (await fetch(`${API}/data/query/${DATASET}?query=${q}`, { headers: auth })).json()).result;
for (const j of JOBS) {
  const mine = docs.filter((d) => d._id === j.id || d._id === `drafts.${j.id}`);
  const live = mine.find((d) => d._id === j.id);
  if (!live) { console.error(`${j.id} not found`); process.exit(1); }
  console.log(`${live.title}: cover -> ${j.file}${j.dropFrame ? " (old backdrop frame removed)" : ""}${mine.length > 1 ? ", draft too" : ""}`);
}
if (DRY) { console.log(`Dry run: all ${JOBS.length} files found. Nothing written.`); process.exit(0); }

writeFileSync(join(DIR, "covers-before-1440.json"), JSON.stringify(docs, null, 2));
console.log("Saved the current docs to covers-before-1440.json");

const mutations = [];
for (const j of JOBS) {
  const res = await fetch(`${API}/assets/files/${DATASET}?filename=${encodeURIComponent(j.file)}`, {
    method: "POST", headers: { ...auth, "Content-Type": "video/mp4" }, body: readFileSync(join(DIR, j.file)) });
  if (!res.ok) { console.error(`${j.file}: ${res.status} ${await res.text()}`); process.exit(1); }
  const asset = (await res.json()).document._id; console.log(`  uploaded ${j.file}`);
  for (const d of docs.filter((d) => d._id === j.id || d._id === `drafts.${j.id}`)) {
    const patch = { id: d._id, set: { "coverMedia.type": "video", "coverMedia.video": { _type: "file", asset: { _type: "reference", _ref: asset } } } };
    if (j.dropFrame) patch.unset = ["coverMedia.frame"];
    mutations.push({ patch });
  }
}
const res = await fetch(`${API}/data/mutate/${DATASET}`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ mutations }) });
if (!res.ok) { console.error(`Patch failed: ${res.status} ${await res.text()}`); process.exit(1); }
console.log(`Done: ${mutations.length} docs now use the new covers.`);
