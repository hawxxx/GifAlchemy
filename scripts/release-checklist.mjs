#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const docsDir = resolve(root, "docs");
const checklistPath = resolve(docsDir, "release-checklist.md");
const runSmoke = process.env.RUN_SMOKE === "1";

function runCommand(label, command, args, required = true) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "pipe",
    encoding: "utf-8",
  });
  const durationMs = Date.now() - startedAt;
  const passed = result.status === 0;
  const status = passed ? "passed" : required ? "failed" : "skipped";
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();

  return {
    label,
    command: [command, ...args].join(" "),
    passed,
    required,
    status,
    durationMs,
    output,
  };
}

function getLastTag() {
  try {
    return execSync("git describe --tags --abbrev=0", { cwd: root, encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function getCommitSubjects(range) {
  try {
    const output = execSync(`git log --pretty=format:%s ${range}`, {
      cwd: root,
      encoding: "utf-8",
    }).trim();
    return output ? output.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function categorizeCommits(subjects) {
  const buckets = {
    feat: [],
    fix: [],
    perf: [],
    refactor: [],
    docs: [],
    test: [],
    chore: [],
    other: [],
  };

  for (const subject of subjects) {
    const match = subject.match(/^([a-z]+)(\(.+\))?!?:\s+/i);
    const type = match?.[1]?.toLowerCase();
    if (!type || !(type in buckets)) {
      buckets.other.push(subject);
      continue;
    }
    buckets[type].push(subject);
  }

  return buckets;
}

const checks = [
  runCommand("Lint", "npm", ["run", "lint"], true),
  runCommand("Unit tests", "npm", ["run", "test:unit"], true),
];

if (runSmoke) {
  checks.push(runCommand("Playwright smoke tests", "npm", ["run", "test:smoke"], false));
} else {
  checks.push({
    label: "Playwright smoke tests",
    command: "npm run test:smoke",
    passed: true,
    required: false,
    status: "skipped",
    durationMs: 0,
    output: "Skipped. Set RUN_SMOKE=1 to execute smoke tests.",
  });
}

const requiredFailures = checks.filter((check) => check.required && !check.passed);
const releaseStatus = requiredFailures.length === 0 ? "PASS" : "BLOCKED";

const lastTag = getLastTag();
const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
const commits = getCommitSubjects(range);
const categorized = categorizeCommits(commits);

const now = new Date();
const lines = [
  "# Release Checklist",
  "",
  `Generated: ${now.toISOString()}`,
  `Git range: ${range}`,
  `Release status: **${releaseStatus}**`,
  "",
  "## Automated checks",
  "",
  "| Check | Command | Status | Duration |",
  "| --- | --- | --- | --- |",
  ...checks.map((check) => {
    const icon = check.status === "passed" ? "PASS" : check.status === "failed" ? "FAIL" : "SKIP";
    return `| ${check.label} | \`${check.command}\` | ${icon} | ${(check.durationMs / 1000).toFixed(1)}s |`;
  }),
  "",
  "## QA checklist",
  "",
  "- [ ] Upload GIF works and timeline renders.",
  "- [ ] Scrubbing timeline updates canvas preview.",
  "- [ ] Text overlay add/edit/keyframe/effect workflows behave correctly.",
  "- [ ] Export completes and downloaded file opens correctly.",
  "- [ ] Perf profiling panel reports decode/composite/encode timings.",
  "- [ ] Telemetry opt-in toggle defaults OFF and persists preference.",
  "",
  "## Changelog draft",
  "",
  "### Features",
  ...(categorized.feat.length ? categorized.feat.map((c) => `- ${c}`) : ["- None"]),
  "",
  "### Fixes",
  ...(categorized.fix.length ? categorized.fix.map((c) => `- ${c}`) : ["- None"]),
  "",
  "### Performance",
  ...(categorized.perf.length ? categorized.perf.map((c) => `- ${c}`) : ["- None"]),
  "",
  "### Refactors / Chore / Tests / Docs",
  ...[...categorized.refactor, ...categorized.chore, ...categorized.test, ...categorized.docs, ...categorized.other].map(
    (c) => `- ${c}`
  ),
  "",
  "## Failure logs",
  "",
];

for (const check of checks) {
  if (!check.output) continue;
  lines.push(`### ${check.label}`);
  lines.push("");
  lines.push("```text");
  lines.push(check.output.length > 8000 ? `${check.output.slice(0, 8000)}\n...[truncated]` : check.output);
  lines.push("```");
  lines.push("");
}

mkdirSync(docsDir, { recursive: true });
writeFileSync(checklistPath, `${lines.join("\n")}\n`, "utf-8");

if (requiredFailures.length > 0) {
  process.stderr.write(`Release checklist generated at ${checklistPath} with blocking failures.\n`);
  process.exit(1);
}

process.stdout.write(`Release checklist generated at ${checklistPath}.\n`);
