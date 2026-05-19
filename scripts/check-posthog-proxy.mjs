#!/usr/bin/env node
/**
 * Deployment safeguard: verifies the PostHog reverse proxy at
 * t.solo-bizz.com is live before publishing.
 *
 * Modes:
 *   - Default: WARN-only. Prints a warning and lets the build proceed so
 *     analytics keep working via PostHog's edge fallback.
 *   - Strict:  Set ENFORCE_POSTHOG_PROXY_CHECK=1 to hard-fail the build
 *     until DNS + HTTPS verify clean. Use this once the CNAME is live.
 *
 * Other env:
 *   - SKIP_POSTHOG_PROXY_CHECK=1   → skip entirely
 *   - POSTHOG_PROXY_HOST=foo.com   → check a different host
 */
import { promises as dns } from "node:dns";

const HOST = process.env.POSTHOG_PROXY_HOST || "t.solo-bizz.com";
const EXPECTED_CNAME_SUFFIX = "europehog.com";
const TIMEOUT_MS = 10_000;
const ENFORCE = process.env.ENFORCE_POSTHOG_PROXY_CHECK === "1";

if (process.env.SKIP_POSTHOG_PROXY_CHECK === "1") {
  console.log(`[posthog-proxy] SKIP_POSTHOG_PROXY_CHECK=1 — skipping ${HOST} verification.`);
  process.exit(0);
}

function fail(msg) {
  console.error("\n\x1b[31m[posthog-proxy] BUILD BLOCKED\x1b[0m");
  console.error(`[posthog-proxy] ${msg}`);
  console.error(
    `\n[posthog-proxy] The reverse proxy at ${HOST} must be verified as live in PostHog ` +
      `(Settings → Project → Reverse proxy) before publishing.\n` +
      `[posthog-proxy] If you really need to bypass this (e.g. emergency rollback), ` +
      `run: SKIP_POSTHOG_PROXY_CHECK=1 npm run build\n`,
  );
  process.exit(1);
}

async function checkDns() {
  try {
    const records = await dns.resolveCname(HOST);
    const ok = records.some((r) => r.toLowerCase().endsWith(EXPECTED_CNAME_SUFFIX));
    if (!ok) {
      fail(
        `DNS for ${HOST} resolved (${records.join(", ")}) but no CNAME points to ` +
          `*.${EXPECTED_CNAME_SUFFIX}. Update the DNS record at your registrar.`,
      );
    }
    return records;
  } catch (err) {
    fail(
      `DNS lookup for ${HOST} failed (${err.code || err.message}). ` +
        `Add the CNAME at your DNS provider and wait for propagation.`,
    );
  }
}

async function checkHttps() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://${HOST}/`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
    });
    if (res.status >= 500) {
      fail(`https://${HOST}/ returned ${res.status} — proxy is up but unhealthy.`);
    }
    return res.status;
  } catch (err) {
    fail(
      `HTTPS request to ${HOST} failed (${err.message}). ` +
        `The TLS certificate may not be provisioned yet, or DNS hasn't propagated.`,
    );
  } finally {
    clearTimeout(timer);
  }
}

const records = await checkDns();
const status = await checkHttps();
console.log(
  `[posthog-proxy] OK — ${HOST} → ${records.join(", ")} (HTTPS ${status}). Proceeding with build.`,
);
