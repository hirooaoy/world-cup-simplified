#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const historical = args.has("--historical");
const allowMissing = historical || args.has("--allow-missing");
const dataPath = path.join(
  root,
  "data",
  historical ? "historical-player-profiles.json" : "player-profiles.json"
);
const skipCommons = args.has("--skip-commons");
const timeoutMs = Number(process.env.PROFILE_IMAGE_AUDIT_TIMEOUT_MS || 18000);
const directConcurrency = Number(process.env.PROFILE_IMAGE_AUDIT_CONCURRENCY || 6);
const commonsBatchSize = Number(process.env.PROFILE_IMAGE_AUDIT_COMMONS_BATCH_SIZE || 40);
const commonsDelayMs = Number(process.env.PROFILE_IMAGE_AUDIT_COMMONS_DELAY_MS || 5000);
const userAgent = "WorldCupSimplified/0.1 (local profile image audit)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getImageSignature(buffer) {
  return buffer.subarray(0, 32).toString("hex");
}

function looksLikeImage(buffer, contentType) {
  const type = String(contentType || "").toLowerCase();
  const signature = getImageSignature(buffer);
  const textStart = buffer.subarray(0, 256).toString("utf8").trimStart().toLowerCase();

  return (
    type.startsWith("image/") &&
    buffer.length > 0 &&
    (signature.startsWith("89504e47") ||
      signature.startsWith("ffd8ff") ||
      signature.startsWith("47494638") ||
      (signature.startsWith("52494646") && signature.slice(16, 24) === "57454250") ||
      textStart.startsWith("<svg") ||
      type.includes("avif") ||
      type.includes("webp") ||
      type.includes("jpeg") ||
      type.includes("jpg") ||
      type.includes("png"))
  );
}

function getCommonsFileTitle(imageUrl) {
  const url = new URL(imageUrl);
  const prefix = "/wiki/Special:FilePath/";
  if (url.hostname === "commons.wikimedia.org" && url.pathname.startsWith(prefix)) {
    const fileName = decodeURIComponent(url.pathname.slice(prefix.length))
      .replace(/_/g, " ")
      .replace(/^File:/i, "");
    return fileName ? `File:${fileName}` : "";
  }

  return getUploadWikimediaFileTitle(url, "commons");
}

function getEnglishWikipediaFileTitle(imageUrl) {
  const url = new URL(imageUrl);
  return getUploadWikimediaFileTitle(url, "en");
}

function getUploadWikimediaFileTitle(url, project) {
  if (url.hostname !== "upload.wikimedia.org") {
    return "";
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const wikipediaIndex = pathParts.indexOf("wikipedia");
  if (wikipediaIndex < 0 || pathParts[wikipediaIndex + 1] !== project) {
    return "";
  }

  const projectIndex = wikipediaIndex + 1;
  const isThumbnail = pathParts[projectIndex + 1] === "thumb";
  const encodedFileName = isThumbnail ? pathParts.at(-2) : pathParts.at(-1);
  const fileName = encodedFileName
    ? decodeURIComponent(encodedFileName).replace(/_/g, " ").replace(/^File:/i, "")
    : "";
  return fileName ? `File:${fileName}` : "";
}

async function fetchWithRetry(url, options = {}, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, options);
    if (response.ok || (response.status !== 429 && response.status < 500)) {
      return response;
    }

    if (attempt === attempts - 1) {
      return response;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const backoffMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : Math.min(60000, 5000 * 2 ** attempt);
    await sleep(backoffMs);
  }

  throw new Error("unreachable retry state");
}

async function auditDirectImage(entry) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchWithRetry(entry.imageUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    }, 3);
    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());
    const ok = response.ok && looksLikeImage(buffer, contentType);

    return {
      ...entry,
      status: response.status,
      bytes: buffer.length,
      contentType,
      finalUrl: response.url,
      ok,
      reason: ok
        ? ""
        : !response.ok
          ? `http-${response.status}`
          : buffer.length === 0
            ? "zero-bytes"
            : !contentType.toLowerCase().startsWith("image/")
              ? "not-image-content-type"
              : "bad-image-bytes"
    };
  } catch (error) {
    return {
      ...entry,
      ok: false,
      reason: error.name === "AbortError" ? "timeout" : `fetch-error:${error.message}`
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function auditDirectImages(entries) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < entries.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await auditDirectImage(entries[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: directConcurrency }, worker));
  return results;
}

async function auditCommonsImages(
  entries,
  apiUrl = "https://commons.wikimedia.org/w/api.php",
  sourceLabel = "commons"
) {
  if (!entries.length || skipCommons) {
    return entries.map((entry) => ({
      ...entry,
      ok: true,
      skipped: true,
      reason: skipCommons ? "commons-skipped" : ""
    }));
  }

  const results = [];

  for (let index = 0; index < entries.length; index += commonsBatchSize) {
    const batch = entries.slice(index, index + commonsBatchSize);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      redirects: "1",
      prop: "imageinfo",
      iiprop: "url|mime|size",
      titles: batch.map((entry) => entry.commonsTitle).join("|")
    });
    const response = await fetchWithRetry(`${apiUrl}?${params}`, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorText = (await response.text()).trim().slice(0, 120);
      results.push(
        ...batch.map((entry) => ({
          ...entry,
          ok: false,
          reason: `${sourceLabel}-api-${response.status}${errorText ? `:${errorText}` : ""}`
        }))
      );
      continue;
    }

    const data = await response.json();
    const titleAliases = new Map();
    for (const normalized of data.query?.normalized || []) {
      titleAliases.set(normalized.from, normalized.to);
    }
    for (const redirect of data.query?.redirects || []) {
      titleAliases.set(redirect.from, redirect.to);
    }
    const pagesByTitle = new Map(Object.values(data.query?.pages || {}).map((page) => [page.title, page]));

    function resolveCommonsTitle(title) {
      let nextTitle = title;
      for (let step = 0; step < 5 && titleAliases.has(nextTitle); step += 1) {
        nextTitle = titleAliases.get(nextTitle);
      }
      return nextTitle;
    }

    for (const entry of batch) {
      const page = pagesByTitle.get(resolveCommonsTitle(entry.commonsTitle));
      const info = page?.imageinfo?.[0];
      const ok = Boolean(
        page &&
          !page.missing &&
          info?.mime?.startsWith("image/") &&
          Number(info.size || 0) > 0
      );
      results.push({
        ...entry,
        ok,
        bytes: info?.size || 0,
        contentType: info?.mime || "",
        finalUrl: info?.url || "",
        reason: ok
          ? ""
          : page?.missing
            ? `${sourceLabel}-missing-file`
            : !info
              ? `${sourceLabel}-missing-imageinfo`
              : !info.mime?.startsWith("image/")
                ? `${sourceLabel}-non-image:${info.mime || "missing"}`
                : `${sourceLabel}-zero-size`
      });
    }

    if (index + batch.length < entries.length) {
      await sleep(commonsDelayMs);
    }
  }

  return results;
}

const data = JSON.parse(await readFile(dataPath, "utf8"));
const profiles = Object.entries(data.profiles || {}).map(([name, profile]) => ({
  name,
  teamId: profile.teamId || profile.teamName || "",
  imageUrl: profile.imageUrl || ""
}));
const missing = profiles.filter((entry) => !entry.imageUrl);
const minimumHistoricalImageCount = historical
  ? Number(data.coverage?.minimumImageCount || 0)
  : 0;
const imageEntryByUrl = new Map();
for (const entry of profiles.filter((profile) => profile.imageUrl)) {
  const existing = imageEntryByUrl.get(entry.imageUrl);
  if (existing) {
    existing.referenceCount += 1;
    continue;
  }
  imageEntryByUrl.set(entry.imageUrl, { ...entry, referenceCount: 1 });
}
const imageEntries = [...imageEntryByUrl.values()];
const commonsEntries = [];
const englishWikipediaEntries = [];
const directEntries = [];

for (const entry of imageEntries) {
  const commonsTitle = getCommonsFileTitle(entry.imageUrl);
  if (commonsTitle) {
    commonsEntries.push({ ...entry, commonsTitle });
    continue;
  }
  const englishWikipediaTitle = getEnglishWikipediaFileTitle(entry.imageUrl);
  if (englishWikipediaTitle) {
    englishWikipediaEntries.push({ ...entry, commonsTitle: englishWikipediaTitle });
  } else {
    directEntries.push(entry);
  }
}

const [directResults, commonsResults, englishWikipediaResults] = await Promise.all([
  auditDirectImages(directEntries),
  auditCommonsImages(commonsEntries),
  auditCommonsImages(
    englishWikipediaEntries,
    "https://en.wikipedia.org/w/api.php",
    "wikipedia"
  )
]);
const results = [...directResults, ...commonsResults, ...englishWikipediaResults];
const coverageFailures = historical && profiles.length - missing.length < minimumHistoricalImageCount
  ? [
      {
        name: "Historical image coverage",
        ok: false,
        reason: `${profiles.length - missing.length}-below-minimum-${minimumHistoricalImageCount}`,
        imageUrl: ""
      }
    ]
  : [];
const failed = [
  ...coverageFailures,
  ...(allowMissing ? [] : missing.map((entry) => ({ ...entry, ok: false, reason: "missing-image-url" }))),
  ...results.filter((result) => !result.ok)
];
const skipped = results.filter((result) => result.skipped);

console.log(
  [
    `Audited ${profiles.length} player profiles.`,
    `Profiles without image URLs: ${missing.length}${allowMissing ? " (allowed)" : ""}.`,
    historical ? `Historical coverage floor: ${minimumHistoricalImageCount}.` : "",
    `Unique image URLs: ${imageEntries.length}.`,
    `Direct image checks: ${directEntries.length}.`,
    `Commons metadata checks: ${commonsEntries.length}${skipCommons ? " (skipped)" : ""}.`,
    `English Wikipedia metadata checks: ${englishWikipediaEntries.length}${skipCommons ? " (skipped)" : ""}.`,
    skipped.length ? `Skipped: ${skipped.length}.` : "",
    `Failures: ${failed.length}.`
  ]
    .filter(Boolean)
    .join("\n")
);

if (failed.length) {
  for (const failure of failed) {
    console.log(
      `- ${failure.name}${failure.teamId ? ` (${failure.teamId})` : ""}: ${failure.reason}${failure.referenceCount > 1 ? ` across ${failure.referenceCount} profiles` : ""} ${failure.imageUrl}`.trim()
    );
  }
  process.exit(1);
}
