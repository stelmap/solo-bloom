#!/usr/bin/env node
/**
 * Bundle-size budget check.
 * Fails CI if the initial JS payload (entry + sync chunks loaded by index.html)
 * or any single asset exceeds the configured budget.
 *
 * Budgets are intentionally generous to start; tighten over time.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, resolve } from "node:path";

const DIST = resolve("dist");
const ASSETS = join(DIST, "assets");

// Budgets in bytes (gzipped)
const BUDGETS = {
  initialJsGzip: 600 * 1024, // 600 KB initial JS (entry + sync chunks referenced from index.html)
  singleChunkGzip: 950 * 1024, // 950 KB any single chunk gzipped
  totalCssGzip: 100 * 1024,
};

function gzipSize(p) {
  return gzipSync(readFileSync(p)).length;
}

function fmt(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exitCode = 1;
}

if (!statSync(DIST, { throwIfNoEntry: false })) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
const referencedJs = [...indexHtml.matchAll(/\/assets\/([^"' ]+\.js)/g)].map((m) => m[1]);

let initialJs = 0;
for (const f of referencedJs) {
  const p = join(ASSETS, f);
  try {
    initialJs += gzipSize(p);
  } catch {
    /* ignore */
  }
}

let totalCss = 0;
let largestChunk = { name: "", size: 0 };
const allAssets = readdirSync(ASSETS);
for (const f of allAssets) {
  const p = join(ASSETS, f);
  const size = gzipSize(p);
  if (f.endsWith(".js") && size > largestChunk.size) {
    largestChunk = { name: f, size };
  }
  if (f.endsWith(".css")) totalCss += size;
}

console.log("=== Bundle size report (gzipped) ===");
console.log(`Initial JS (sync, from index.html): ${fmt(initialJs)} / budget ${fmt(BUDGETS.initialJsGzip)}`);
console.log(`Largest single JS chunk: ${largestChunk.name} = ${fmt(largestChunk.size)} / budget ${fmt(BUDGETS.singleChunkGzip)}`);
console.log(`Total CSS: ${fmt(totalCss)} / budget ${fmt(BUDGETS.totalCssGzip)}`);

if (initialJs > BUDGETS.initialJsGzip) {
  fail(`Initial JS ${fmt(initialJs)} exceeds budget ${fmt(BUDGETS.initialJsGzip)}.`);
}
if (largestChunk.size > BUDGETS.singleChunkGzip) {
  fail(`Chunk ${largestChunk.name} (${fmt(largestChunk.size)}) exceeds budget ${fmt(BUDGETS.singleChunkGzip)}.`);
}
if (totalCss > BUDGETS.totalCssGzip) {
  fail(`Total CSS ${fmt(totalCss)} exceeds budget ${fmt(BUDGETS.totalCssGzip)}.`);
}

if (!process.exitCode) console.log("\n✅ All bundle-size budgets OK.");
