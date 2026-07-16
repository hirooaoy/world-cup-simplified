import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function absolutePath(relativePath) {
  return path.join(ROOT, relativePath);
}

export async function fileExists(relativePath) {
  try {
    await access(absolutePath(relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function readText(relativePath) {
  return readFile(absolutePath(relativePath), "utf8");
}

export async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

export async function importFresh(relativePath) {
  const filePath = absolutePath(relativePath);
  const fileStats = await stat(filePath);
  const moduleUrl = new URL(pathToFileURL(filePath));
  moduleUrl.searchParams.set("locale-audit", String(fileStats.mtimeMs));
  return import(moduleUrl.href);
}

export function getKeyPaths(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.length
      ? value.flatMap((item, index) => getKeyPaths(item, `${prefix}[${index}]`))
      : [prefix];
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length
      ? entries.flatMap(([key, item]) => getKeyPaths(item, prefix ? `${prefix}.${key}` : key))
      : [prefix];
  }

  return [prefix];
}

export function getShapePaths(value, prefix = "") {
  if (Array.isArray(value)) {
    if (!value.length) {
      return [`${prefix}[]`];
    }
    return getShapePaths(value[0], `${prefix}[]`);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) {
      return [prefix];
    }
    return entries.flatMap(([key, item]) =>
      getShapePaths(item, prefix ? `${prefix}.${key}` : key)
    );
  }

  return [`${prefix}:${typeof value}`];
}

export function getAtPath(value, dottedPath) {
  return String(dottedPath || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, key) => current?.[key], value);
}

export function formatSamples(values, limit = 6) {
  const unique = [...new Set(values.filter(Boolean).map((value) => String(value)))];
  const visible = unique.slice(0, limit);
  return `${visible.join("; ")}${unique.length > limit ? `; +${unique.length - limit} more` : ""}`;
}

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) {
    return "unknown";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export async function getPayloadSize(relativePath) {
  const source = await readFile(absolutePath(relativePath));
  return {
    raw: source.byteLength,
    gzip: gzipSync(source, { level: 9 }).byteLength
  };
}

export function normalizeEnglishSource(value) {
  if (typeof value === "string") {
    return value.replace(/\s+/gu, " ").trim();
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizeEnglishSource(value.en);
  }
  return "";
}

export function countLatinWords(value) {
  return String(value || "").match(/\b[A-Za-z][A-Za-z'-]{2,}\b/gu)?.length || 0;
}

export function hasSuspiciousPlaceholder(value) {
  const text = String(value || "");
  return (
    /\b(?:TODO|FIXME|TBD translation)\b/u.test(text) ||
    /\b(?:placeholder|undefined|null)\b/iu.test(text) ||
    /([\p{Letter}])\1{3,}/iu.test(text) ||
    /([\p{Letter}]{2,4})\1{2,}/iu.test(text) ||
    /\?\?/u.test(text)
  );
}

export function isLikelyUntranslatedLongText(source, translation, language) {
  const english = normalizeEnglishSource(source);
  const localized = normalizeEnglishSource(translation);
  if (!english || !localized) {
    return true;
  }
  if (english === localized && english.length >= 18) {
    return true;
  }
  if (language === "ko" && english.length >= 12 && !/\p{Script=Hangul}/u.test(localized)) {
    return true;
  }
  return false;
}

export function getContentModulePayload(moduleNamespace) {
  const candidates = [
    moduleNamespace?.default,
    moduleNamespace?.CONTENT,
    moduleNamespace?.content,
    moduleNamespace
  ];

  for (const candidate of candidates) {
    if (candidate?.translations && typeof candidate.translations === "object") {
      return candidate;
    }
  }
  return null;
}
