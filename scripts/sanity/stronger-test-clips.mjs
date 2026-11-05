#!/usr/bin/env node
// Puts Stronger's five A/B test films on its gallery (Ali, 11-05): each test
// is one phone screen (galleryPhones, one clip) with `testName` set, so the
// gallery page plays it once when centred, holds the design and shows the
// test pill with a replay button. The items go right after the first gallery
// item (the compilation); reorder them in the Studio if wanted. Stronger is
// a gallery project once its chapters are off (branch claude/chapters-off).
//
// Each test folder holds film.mp4 (780x1688, today → design) and start.jpg
// (its first frame, the poster). Both are uploaded as assets. It patches the
// published document and its draft (when there is one) alike. Items it added
// before (keys abtest-<n>) are left alone; --force replaces them.
//
//   node scripts/sanity/stronger-test-clips.mjs --dry-run   # checks files + prints the plan
//   node scripts/sanity/stronger-test-clips.mjs             # uploads + patches
//   node scripts/sanity/stronger-test-clips.mjs --dir <per-test folder>
//
// Default folder: ~/Developer/portfolio-media/stronger/test-motion/per-test.
// Token (write access): SANITY_TOKEN in the environment, or SANITY_TOKEN /
// SANITY_API_READ_TOKEN in ./.env.local or ~/Developer/portfolio-layout/.env.local.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT = "v3d28bxo";
const DATASET = "production";
const API = `https://${PROJECT}.api.sanity.io/v2024-01-01`;
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const DIR = args.includes("--dir")
  ? args[args.indexOf("--dir") + 1]
  : join(homedir(), "Developer/portfolio-media/stronger/test-motion/per-test");

// Folder, key and the name the pill shows (names from the films' README).
const TESTS = [
  { folder: "1-badge", name: "Bestseller badge" },
  { folder: "2-delivery", name: "Delivery promise" },
  { folder: "3-soldout", name: "Sold-out row" },
  { folder: "4-similar", name: "Similar product" },
  { folder: "5-kit", name: "Upgrade to kit" },
].map((t, i) => ({ ...t, key: `abtest-${i + 1}` }));

for (const t of TESTS) {
  for (const f of ["film.mp4", "start.jpg"]) {
    if (!existsSync(join(DIR, t.folder, f))) {
      console.error(`missing ${join(DIR, t.folder, f)} (pass --dir <per-test folder>)`);
      process.exit(1);
    }
  }
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
    const token = env.SANITY_TOKEN || env.SANITY_API_READ_TOKEN;
    if (token) return token;
  }
  return null;
}

const token = DRY ? findToken() : findToken() ?? (console.error("No write token found (see the header)."), process.exit(1));
const auth = token ? { Authorization: `Bearer ${token}` } : {};

async function query(groq) {
  const url = `${API}/data/query/${DATASET}?query=${encodeURIComponent(groq)}${token ? "&perspective=raw" : ""}`;
  const res = await fetch(url, { headers: auth });
  if (!res.ok) throw new Error(`query ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

async function upload(kind, file, filename, type) {
  const res = await fetch(`${API}/assets/${kind}/${DATASET}?filename=${encodeURIComponent(filename)}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": type },
    body: readFileSync(file),
  });
  if (!res.ok) throw new Error(`upload ${filename} ${res.status}: ${await res.text()}`);
  return (await res.json()).document._id;
}

const testKeys = TESTS.map((t) => t.key);
const docs = (await query(`*[_type == "project" && slug.current == "stronger"]{ _id, "keys": gallery[]._key }`)).map((d) => ({
  ...d,
  // The anchor is the first item that is not one of ours (a --force run removes ours).
  first: d.keys?.find((k) => !testKeys.includes(k)) ?? null,
}));
if (!docs.length) throw new Error("no Stronger project found");

for (const doc of docs) {
  const have = TESTS.filter((t) => doc.keys?.includes(t.key));
  console.log(`${doc._id}: first item ${doc.first ?? "(none)"}, test items already there: ${have.length}`);
}
if (DRY) {
  for (const t of TESTS) console.log(`  ${t.key} "A/B test – ${t.name}" ← ${join(DIR, t.folder)}`);
  console.log("dry run: nothing uploaded or written");
  process.exit(0);
}

const items = [];
for (const t of TESTS) {
  const video = await upload("files", join(DIR, t.folder, "film.mp4"), `stronger-test-${t.folder}.mp4`, "video/mp4");
  const poster = await upload("images", join(DIR, t.folder, "start.jpg"), `stronger-test-${t.folder}-start.jpg`, "image/jpeg");
  items.push({
    _key: t.key,
    _type: "galleryPhones",
    testName: t.name,
    phones: [
      {
        _key: `${t.key}-screen`,
        _type: "phoneSlot",
        type: "video",
        video: { _type: "file", asset: { _type: "reference", _ref: video } },
        poster: { _type: "image", asset: { _type: "reference", _ref: poster } },
      },
    ],
  });
  console.log(`uploaded ${t.folder}`);
}

let changed = 0;
for (const doc of docs) {
  const present = TESTS.filter((t) => doc.keys?.includes(t.key));
  if (present.length && !FORCE) {
    console.log(`${doc._id}: test items already there, skipped (--force replaces them)`);
    continue;
  }
  const mutations = [];
  if (present.length) mutations.push({ patch: { id: doc._id, unset: present.map((t) => `gallery[_key=="${t.key}"]`) } });
  mutations.push({
    patch: {
      id: doc._id,
      setIfMissing: { gallery: [] },
      insert: doc.first ? { after: `gallery[_key=="${doc.first}"]`, items } : { after: "gallery[-1]", items },
    },
  });
  const res = await fetch(`${API}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`patch ${doc._id} ${res.status}: ${await res.text()}`);
  changed++;
  console.log(`patched ${doc._id}`);
}
console.log(`done: ${changed} documents patched`);
