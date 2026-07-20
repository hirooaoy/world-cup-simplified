import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { ARCHIVE_MANIFEST_NAME, stringifyArchiveJson } from "./finalize-2026-archive-lib.mjs";

async function readTextIfPresent(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function stageFile(targetPath, contents) {
  const temporaryPath = `${targetPath}.tmp-${process.pid}-${randomUUID()}`;
  const handle = await open(temporaryPath, "wx");
  try {
    await handle.writeFile(contents);
    await handle.sync();
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  } finally {
    await handle.close();
  }
  return temporaryPath;
}

async function restoreFile(targetPath, originalContents, committedContents) {
  const currentContents = await readTextIfPresent(targetPath);
  if (currentContents !== committedContents) {
    throw new Error("file changed after this finalizer wrote it; refusing to overwrite the concurrent change");
  }
  if (originalContents === null) {
    await unlink(targetPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
    return;
  }
  const temporaryPath = await stageFile(targetPath, originalContents);
  await rename(temporaryPath, targetPath);
}

export async function commit2026Archive({ dataDir, rootDir = path.dirname(dataDir), plan, snapshots, surfaceSnapshots = new Map(), beforeLifecycleCommit = null }) {
  const archivesDir = path.join(dataDir, "archives");
  await mkdir(archivesDir, { recursive: true });

  for (const [fileName, expectedContents] of snapshots) {
    const currentContents = await readTextIfPresent(path.join(dataDir, fileName));
    if (currentContents !== expectedContents) {
      throw new Error(`${fileName} changed during archive planning. Re-run the finalizer against one consistent snapshot.`);
    }
  }
  for (const [fileName, expectedContents] of surfaceSnapshots) {
    const currentContents = await readTextIfPresent(path.join(rootDir, fileName));
    if (currentContents !== expectedContents) {
      throw new Error(`${fileName} changed during archive planning. Re-run the finalizer against one consistent release surface.`);
    }
  }

  const archivePath = path.join(archivesDir, plan.archiveFileName);
  const manifestPath = path.join(archivesDir, ARCHIVE_MANIFEST_NAME);
  const tournamentPath = path.join(dataDir, "tournament.json");
  const lifecyclePath = path.join(dataDir, "edition-lifecycle.json");
  const original = {
    manifest: snapshots.get(path.join("archives", ARCHIVE_MANIFEST_NAME)),
    tournament: snapshots.get("tournament.json"),
    lifecycle: snapshots.get("edition-lifecycle.json")
  };
  for (const [name, contents] of Object.entries(original)) {
    if (contents === undefined) throw new Error(`Missing ${name} input snapshot for archive transaction.`);
  }

  const contents = {
    archive: plan.archiveContents,
    manifest: stringifyArchiveJson(plan.nextManifest),
    tournament: stringifyArchiveJson(plan.nextTournament),
    lifecycle: stringifyArchiveJson(plan.nextLifecycle)
  };
  const staged = { archive: null, manifest: null, tournament: null, lifecycle: null };
  const committed = [];

  try {
    staged.archive = await stageFile(archivePath, contents.archive);
    staged.manifest = await stageFile(manifestPath, contents.manifest);
    staged.tournament = await stageFile(tournamentPath, contents.tournament);
    staged.lifecycle = await stageFile(lifecyclePath, contents.lifecycle);

    // A hard link provides exclusive publication: an existing immutable archive is never overwritten.
    await link(staged.archive, archivePath);
    committed.push("archive");
    await unlink(staged.archive);
    staged.archive = null;

    if (await readTextIfPresent(tournamentPath) !== original.tournament) {
      throw new Error("tournament.json changed before archive commit; no source data was overwritten.");
    }
    await rename(staged.tournament, tournamentPath);
    staged.tournament = null;
    committed.push("tournament");

    if (await readTextIfPresent(manifestPath) !== original.manifest) {
      throw new Error("The archive manifest changed before commit; no concurrent archive was overwritten.");
    }
    await rename(staged.manifest, manifestPath);
    staged.manifest = null;
    committed.push("manifest");

    // Lifecycle is the commit marker and is replaced last so scheduled jobs do not stop early.
    if (beforeLifecycleCommit) {
      await beforeLifecycleCommit();
    }
    for (const [fileName, expectedContents] of snapshots) {
      if (["tournament.json", "edition-lifecycle.json", path.join("archives", ARCHIVE_MANIFEST_NAME)].includes(fileName)) {
        continue;
      }
      const currentContents = await readTextIfPresent(path.join(dataDir, fileName));
      if (currentContents !== expectedContents) {
        throw new Error(`${fileName} changed before the archive lifecycle commit; the mutable data and immutable snapshot were not allowed to diverge.`);
      }
    }
    for (const [fileName, expectedContents] of surfaceSnapshots) {
      const currentContents = await readTextIfPresent(path.join(rootDir, fileName));
      if (currentContents !== expectedContents) {
        throw new Error(`${fileName} changed before the archive lifecycle commit; the release surface and immutable snapshot were not allowed to diverge.`);
      }
    }
    if (await readTextIfPresent(tournamentPath) !== contents.tournament) {
      throw new Error("tournament.json changed after the archive transaction published it; the lifecycle remains open for recovery.");
    }
    if (await readTextIfPresent(manifestPath) !== contents.manifest) {
      throw new Error("The archive manifest changed after this transaction published it; the lifecycle remains open for recovery.");
    }
    if (await readTextIfPresent(lifecyclePath) !== original.lifecycle) {
      throw new Error("edition-lifecycle.json changed before archive commit; live-job state was not overwritten.");
    }
    await rename(staged.lifecycle, lifecyclePath);
    staged.lifecycle = null;
    committed.push("lifecycle");
  } catch (error) {
    const rollbackErrors = [];
    for (const [name, targetPath] of [
      ["lifecycle", lifecyclePath],
      ["manifest", manifestPath],
      ["tournament", tournamentPath]
    ]) {
      if (!committed.includes(name)) continue;
      try {
        await restoreFile(targetPath, original[name], contents[name]);
      } catch (rollbackError) {
        rollbackErrors.push(`${name}: ${rollbackError.message}`);
      }
    }
    // If mutable rollback was incomplete, preserve the immutable file: a surviving manifest
    // or concurrent reference must never point at a snapshot this process then deletes.
    if (committed.includes("archive") && rollbackErrors.length === 0) {
      try {
        await unlink(archivePath);
      } catch (rollbackError) {
        if (rollbackError?.code !== "ENOENT") rollbackErrors.push(`archive: ${rollbackError.message}`);
      }
    }
    if (rollbackErrors.length) {
      throw new Error(`${error.message}\nRollback also failed: ${rollbackErrors.join("; ")}`, { cause: error });
    }
    throw error;
  } finally {
    await Promise.all(Object.values(staged).filter(Boolean).map((temporaryPath) =>
      unlink(temporaryPath).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      })
    ));
  }
}
