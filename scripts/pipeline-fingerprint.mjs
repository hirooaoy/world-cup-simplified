import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_SCHEMA_VERSION = 1;

async function listFiles(targetPath) {
  const entries = await readdir(targetPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

async function resolveFiles(root, inputs) {
  const files = [];
  for (const input of inputs) {
    const targetPath = path.resolve(root, input);
    try {
      const entries = await listFiles(targetPath);
      files.push(...entries);
    } catch (error) {
      if (error?.code === "ENOTDIR") files.push(targetPath);
      else if (error?.code !== "ENOENT") throw error;
    }
  }
  return [...new Set(files)].sort();
}

export async function createPipelineFingerprint({ inputs, root }) {
  const files = await resolveFiles(root, inputs);
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(root, file));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return { fingerprint: hash.digest("hex"), fileCount: files.length };
}

export async function readPipelineCache({ cachePath, key }) {
  try {
    const document = JSON.parse(await readFile(cachePath, "utf8"));
    if (document?.schemaVersion !== CACHE_SCHEMA_VERSION) return null;
    return document.entries?.[key] || null;
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function writePipelineCache({ cachePath, entry, key }) {
  let document = { schemaVersion: CACHE_SCHEMA_VERSION, entries: {} };
  try {
    const existing = JSON.parse(await readFile(cachePath, "utf8"));
    if (existing?.schemaVersion === CACHE_SCHEMA_VERSION) document = existing;
  } catch (error) {
    if (error?.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }

  document.entries ||= {};
  document.entries[key] = { ...entry, completedAt: new Date().toISOString() };
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(document, null, 2)}\n`);
}
