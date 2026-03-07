#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const extraArgs = process.argv.slice(2);
const cwd = process.cwd();
const isMountedWindowsDrive = process.platform === "linux" && /^\/mnt\/[a-z]\//i.test(cwd);
const hasExplicitTurboFlag = extraArgs.includes("--turbopack") || extraArgs.includes("--turbo");
const forcePolling = process.env.GIFALCHEMY_DEV_POLLING === "1" || isMountedWindowsDrive;
const shouldUseTurbopack = !forcePolling && process.env.GIFALCHEMY_DISABLE_TURBOPACK !== "1" && !hasExplicitTurboFlag;

const env = { ...process.env };
if (forcePolling) {
  env.CHOKIDAR_USEPOLLING ??= "1";
  env.WATCHPACK_POLLING ??= "true";
}

const nextArgs = [nextBin, "dev", ...(shouldUseTurbopack ? ["--turbopack"] : []), ...extraArgs];

if (forcePolling) {
  console.log("[dev] Mounted Windows drive detected. Using polling + webpack for reliable reloads.");
} else if (shouldUseTurbopack) {
  console.log("[dev] Starting Next.js with Turbopack.");
}

const child = spawn(process.execPath, nextArgs, {
  stdio: "inherit",
  env,
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => forwardSignal(signal));
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
