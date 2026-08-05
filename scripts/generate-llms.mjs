import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SOURCEY_VERSION = "3.6.5";
const SOURCE_COMMIT = "8ccaa3283333eb4616efe3255398a77ca6d6ef93";
const REPOSITORY = "openscan-explorer/explorer";

const SOURCE_LINKS = new Map([
  ["/claude/claude.html", ".claude/CLAUDE.md"],
  ["/project/readme.html", "README.md"],
  ["/project/contributing.html", "CONTRIBUTING.md"],
  [
    "/development/claude/rules/architecture.html",
    ".claude/rules/architecture.md",
  ],
  ["/development/claude/rules/testing.html", ".claude/rules/testing.md"],
  ["/development/claude/rules/workflow.html", ".claude/rules/workflow.md"],
  ["/development/claude/rules/code-style.html", ".claude/rules/code-style.md"],
]);

function assertPinnedSources() {
  for (const sourcePath of SOURCE_LINKS.values()) {
    const pinned = execFileSync(
      "git",
      ["show", `${SOURCE_COMMIT}:${sourcePath}`],
      { encoding: "utf8" },
    );
    const current = readFileSync(resolve(sourcePath), "utf8");

    if (current !== pinned) {
      throw new Error(
        `${sourcePath} differs from pinned commit ${SOURCE_COMMIT}. ` +
          "Commit the source change, update SOURCE_COMMIT, and regenerate.",
      );
    }
  }
}

function buildWithSourcey(outputDirectory) {
  const version = execFileSync(
    "npx",
    ["--yes", `sourcey@${SOURCEY_VERSION}`, "--version"],
    { encoding: "utf8" },
  ).trim();

  if (version !== SOURCEY_VERSION) {
    throw new Error(`Expected Sourcey ${SOURCEY_VERSION}, received ${version}`);
  }

  execFileSync(
    "npx",
    [
      "--yes",
      `sourcey@${SOURCEY_VERSION}`,
      "build",
      "--config",
      "sourcey.config.ts",
      "--output",
      outputDirectory,
    ],
    { stdio: "inherit" },
  );
}

function publishPinnedLinks(generated) {
  let output = generated;
  const rawBase = `https://raw.githubusercontent.com/${REPOSITORY}/${SOURCE_COMMIT}`;

  for (const [generatedPath, sourcePath] of SOURCE_LINKS) {
    const generatedLink = `](${generatedPath})`;
    const occurrenceCount = output.split(generatedLink).length - 1;

    if (occurrenceCount !== 1) {
      throw new Error(
        `Expected one generated link for ${generatedPath}, found ${occurrenceCount}`,
      );
    }

    output = output.replace(generatedLink, `](${rawBase}/${sourcePath})`);
  }

  if (/\]\(\/[^)]+\.html\)/.test(output)) {
    throw new Error(
      "Generated llms.txt still contains an unpublished HTML link",
    );
  }

  return `${output.trimEnd()}\n`;
}

assertPinnedSources();

const temporaryDirectory = mkdtempSync(join(tmpdir(), "openscan-llms-"));

try {
  buildWithSourcey(temporaryDirectory);
  const generated = readFileSync(join(temporaryDirectory, "llms.txt"), "utf8");
  writeFileSync("public/llms.txt", publishPinnedLinks(generated), "utf8");
  console.log(
    `Published public/llms.txt from Sourcey ${SOURCEY_VERSION} and ${SOURCE_COMMIT}`,
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
