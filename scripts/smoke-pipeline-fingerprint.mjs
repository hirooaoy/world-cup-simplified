#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createPipelineFingerprint,
  readPipelineCache,
  writePipelineCache
} from "./pipeline-fingerprint.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "world-cup-pipeline-fingerprint-"));

try {
  await mkdir(path.join(root, "inputs"));
  await writeFile(path.join(root, "inputs", "a.txt"), "alpha\n");
  await writeFile(path.join(root, "outside.txt"), "ignored\n");

  const first = await createPipelineFingerprint({ root, inputs: ["inputs"] });
  const second = await createPipelineFingerprint({ root, inputs: ["inputs"] });
  assert.equal(first.fingerprint, second.fingerprint, "Unchanged inputs should keep a stable fingerprint");
  assert.equal(first.fileCount, 1);

  await writeFile(path.join(root, "outside.txt"), "still ignored\n");
  const outsideChange = await createPipelineFingerprint({ root, inputs: ["inputs"] });
  assert.equal(first.fingerprint, outsideChange.fingerprint, "Out-of-scope files should not invalidate the cache");

  await writeFile(path.join(root, "inputs", "a.txt"), "beta\n");
  const inputChange = await createPipelineFingerprint({ root, inputs: ["inputs"] });
  assert.notEqual(first.fingerprint, inputChange.fingerprint, "Input changes must invalidate the cache");

  const cachePath = path.join(root, "cache", "pipeline.json");
  await writePipelineCache({ cachePath, key: "verification", entry: inputChange });
  const cached = await readPipelineCache({ cachePath, key: "verification" });
  assert.equal(cached.fingerprint, inputChange.fingerprint, "Successful fingerprints should round-trip");
  assert.match(cached.completedAt, /^\d{4}-\d{2}-\d{2}T/);

  console.log("Pipeline fingerprint smoke passed: stable inputs skip safely and material inputs invalidate.");
} finally {
  await rm(root, { recursive: true, force: true });
}
