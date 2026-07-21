#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const DEFAULT_REPOSITORY = "hirooaoy/world-cup-simplified";
const DEFAULT_PRODUCTION_URL = "https://world-cup-simplified.vercel.app";
const REQUEST_TIMEOUT_MS = 10_000;

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...valueParts] = argument.replace(/^--/, "").split("=");
    return [key, valueParts.length ? valueParts.join("=") : "true"];
  })
);

function git(argumentsList, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", argumentsList, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", allowFailure ? "ignore" : "pipe"]
    }).trim();
  } catch (error) {
    if (allowFailure) return "";
    throw error;
  }
}

function parseRepository(remoteUrl) {
  const normalized = String(remoteUrl || "")
    .trim()
    .replace(/^git@github\.com:/, "")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
  return /^[^/]+\/[^/]+$/.test(normalized) ? normalized : DEFAULT_REPOSITORY;
}

function readLocalState() {
  const head = args.get("sha") || git(["rev-parse", "HEAD"]);
  const remoteUrl = git(["remote", "get-url", "origin"], { allowFailure: true });
  const repository = args.get("repo") || parseRepository(remoteUrl);
  const liveRemoteLine = git(["ls-remote", "origin", "refs/heads/main"], { allowFailure: true });
  const liveRemoteSha = liveRemoteLine.split(/\s+/)[0] || "";
  const cachedRemoteSha = git(["rev-parse", "--verify", "origin/main"], { allowFailure: true });
  const dirtyEntries = git(["status", "--porcelain=v1", "--untracked-files=all"], {
    allowFailure: true
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return {
    branch: git(["branch", "--show-current"], { allowFailure: true }) || "detached",
    head,
    repository,
    originMain: liveRemoteSha || cachedRemoteSha,
    originMainSource: liveRemoteSha ? "live" : cachedRemoteSha ? "cached" : "unavailable",
    dirty: dirtyEntries.length > 0,
    dirtyCount: dirtyEntries.length,
    dirtyFiles: dirtyEntries.map((entry) => entry.replace(/^[ MADRCU?!]{1,2}\s+/, ""))
  };
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "world-cup-release-status",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function requestJson(url) {
  const response = await fetch(url, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function readCiState(repository, sha) {
  try {
    const query = new URLSearchParams({ head_sha: sha, per_page: "50" });
    const payload = await requestJson(
      `https://api.github.com/repos/${repository}/actions/runs?${query}`
    );
    const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
    const run = runs
      .filter((candidate) => candidate.name === "Data Quality")
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];

    if (!run) {
      return { status: "missing", conclusion: null, url: null, runNumber: null };
    }
    return {
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
      runNumber: run.run_number,
      event: run.event,
      updatedAt: run.updated_at
    };
  } catch (error) {
    return { status: "unavailable", conclusion: null, url: null, error: error.message };
  }
}

function classifyCiState(ci) {
  if (ci.status === "completed") {
    if (ci.conclusion === "success") return "success";
    if (["failure", "timed_out", "startup_failure"].includes(ci.conclusion)) {
      return "failed";
    }
    if (ci.conclusion) return ci.conclusion;
    return "unavailable";
  }
  if (["queued", "requested", "pending", "waiting"].includes(ci.status)) {
    return "queued";
  }
  if (ci.status === "in_progress") return "running";
  return "unavailable";
}

async function readDeploymentState(repository, sha) {
  try {
    const query = new URLSearchParams({ sha, environment: "Production", per_page: "10" });
    const deployments = await requestJson(
      `https://api.github.com/repos/${repository}/deployments?${query}`
    );
    const deployment = Array.isArray(deployments)
      ? deployments.sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0]
      : null;
    if (!deployment) {
      return { status: "missing", state: null, url: null, deploymentId: null };
    }

    const statuses = await requestJson(deployment.statuses_url);
    const latestStatus = Array.isArray(statuses) ? statuses[0] : null;
    return {
      status: latestStatus ? "reported" : "pending",
      state: latestStatus?.state || "pending",
      url: latestStatus?.environment_url || latestStatus?.target_url || null,
      deploymentId: deployment.id,
      createdAt: deployment.created_at,
      description: latestStatus?.description || null
    };
  } catch (error) {
    return { status: "unavailable", state: null, url: null, error: error.message };
  }
}

async function readProductionState(productionUrl) {
  try {
    const url = new URL(productionUrl);
    url.searchParams.set("release-status", Date.now().toString());
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    return {
      reachable: response.ok,
      status: response.status,
      url: response.url
    };
  } catch (error) {
    return { reachable: false, status: null, url: productionUrl, error: error.message };
  }
}

function classify(local, ci, deployment, production) {
  if (!local.originMain) return "remote-state-unavailable";
  if (local.head !== local.originMain) return "local-and-origin-diverged";
  if (ci.state === "failed") return "ci-failed";
  if (deployment.state !== "success") return "production-deployment-not-green";
  if (!production.reachable) return "production-unreachable";
  if (ci.state === "running") return "production-verified-ci-running";
  if (ci.state === "queued") return "production-verified-ci-queued";
  if (ci.state === "unavailable") return "production-verified-ci-unavailable";
  if (ci.state !== "success") return `production-verified-ci-${ci.state}`;
  return "production-verified";
}

function line(label, value) {
  return `${label.padEnd(20)} ${value}`;
}

function printHuman(report) {
  console.log("World Cup Simplified release status\n");
  console.log(line("Decision", report.decision));
  console.log(line("Branch", report.local.branch));
  console.log(line("HEAD", report.local.head));
  console.log(
    line(
      "origin/main",
      `${report.local.originMain || "unavailable"} (${report.local.originMainSource})`
    )
  );
  console.log(
    line(
      "Working tree",
      report.local.dirty ? `${report.local.dirtyCount} local change path(s)` : "clean"
    )
  );
  console.log(
    line(
      "Data Quality",
      report.ci.state
    )
  );
  console.log(
    line(
      "Vercel production",
      report.deployment.state || report.deployment.status || "unavailable"
    )
  );
  console.log(
    line(
      "Production HTTP",
      report.production.status || report.production.error || "unavailable"
    )
  );

  if (report.local.dirtyFiles.length) {
    console.log("\nLocal changes:");
    report.local.dirtyFiles.forEach((file) => console.log(`- ${file}`));
  }
  if (report.ci.url) console.log(`\nCI: ${report.ci.url}`);
  if (report.deployment.url) console.log(`Deployment: ${report.deployment.url}`);
}

async function main() {
  const local = readLocalState();
  const productionUrl = args.get("production-url") || DEFAULT_PRODUCTION_URL;
  const [rawCi, deployment, production] = await Promise.all([
    readCiState(local.repository, local.head),
    readDeploymentState(local.repository, local.head),
    readProductionState(productionUrl)
  ]);
  const ci = { ...rawCi, state: classifyCiState(rawCi) };
  const report = {
    checkedAt: new Date().toISOString(),
    decision: classify(local, ci, deployment, production),
    local,
    ci,
    deployment,
    production
  };

  if (args.has("json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }
}

main().catch((error) => {
  console.error(`Release status failed: ${error.message}`);
  process.exit(1);
});
