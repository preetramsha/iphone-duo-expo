#!/usr/bin/env node
/**
 * iPhone Duo / foldable readiness audit.
 *
 * Scans an Expo or React Native project for the layout and lifecycle issues
 * described in the iphone-duo-expo skill. No dependencies.
 *
 * Usage:
 *   node scripts/audit.mjs [project-root] [--json] [--strict]
 *
 * Exit codes:
 *   0  no errors (or warnings with --strict)
 *   1  errors found, or warnings with --strict
 *   2  invalid usage
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  ".next",
  ".turbo",
  ".yarn",
  ".agents",
  ".claude",
  ".cursor",
  "ios",
  "android",
  "dist",
  "build",
  "coverage",
  "Pods",
  "DerivedData",
  "vendor",
]);

const SOURCE_EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
]);

const SEVERITY_ORDER = { error: 0, warn: 1, info: 2, ok: 3 };
const CATEGORY_ORDER = ["Setup", "Config", "iOS", "Source"];

const args = process.argv.slice(2);
let rootArg = ".";
let json = false;
let strict = false;

for (const arg of args) {
  if (arg === "--json") json = true;
  else if (arg === "--strict") strict = true;
  else if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  } else if (arg.startsWith("-")) {
    console.error(`Unknown option: ${arg}`);
    printHelp();
    process.exit(2);
  } else {
    rootArg = arg;
  }
}

const root = resolve(rootArg);
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Not a directory: ${root}`);
  process.exit(2);
}

const findings = [];
function add(severity, category, message, extra = {}) {
  findings.push({ severity, category, message, ...extra });
}

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function readJson(path) {
  const text = readText(path);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function walk(dir, maxDepth = Infinity, depth = 0) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (depth >= maxDepth) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      out = out.concat(walk(full, maxDepth, depth + 1));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }

  return out;
}

function major(version) {
  const match = String(version ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function displayVersion(version) {
  return version ? String(version) : "not installed";
}

// ---------------------------------------------------------------------------
// Project setup
// ---------------------------------------------------------------------------

const pkg = readJson(join(root, "package.json"));
const deps = pkg
  ? { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  : {};

const project = {
  expo: deps.expo ?? null,
  reactNative: deps["react-native"] ?? null,
  expoRouter: deps["expo-router"] ?? null,
  safeAreaContext: deps["react-native-safe-area-context"] ?? null,
  expoHinge: deps["expo-hinge"] ?? null,
};

const expoMajor = major(project.expo);

if (!pkg) {
  add("warn", "Setup", "No package.json found at the project root.");
} else {
  if (!project.expo) {
    add(
      "warn",
      "Setup",
      "The expo package was not found. This skill targets Expo apps; bare React Native is only partially covered.",
    );
  } else if (expoMajor !== null && expoMajor < 58) {
    add(
      "warn",
      "Setup",
      `Expo SDK ${expoMajor} detected. SDK 58+ is the baseline for iOS 27 and iPhone Duo.`,
      { hint: "Upgrade Expo before relying on the SDK 58 UIScene behavior." },
    );
  } else {
    add("ok", "Setup", `Expo SDK ${expoMajor} detected.`);
  }

  if (!project.safeAreaContext) {
    add(
      "error",
      "Setup",
      "react-native-safe-area-context is not installed.",
      { hint: "Run: npx expo install react-native-safe-area-context" },
    );
  } else {
    add(
      "ok",
      "Setup",
      `react-native-safe-area-context ${displayVersion(project.safeAreaContext)} detected.`,
    );
  }

  if (project.expoRouter) {
    add("ok", "Setup", "Expo Router detected; prefer NativeTabs and native headers.");
  }

  if (project.expoHinge) {
    add("ok", "Setup", `expo-hinge ${displayVersion(project.expoHinge)} detected.`);
  } else {
    add(
      "info",
      "Setup",
      "expo-hinge is not installed. Add it only if the design changes by fold pose.",
    );
  }

  if (!project.reactNative) {
    add("warn", "Setup", "react-native was not found in package.json.");
  }
}

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

const configFiles = ["app.json", "app.config.js", "app.config.ts", "app.config.mjs"]
  .map((name) => join(root, name))
  .filter((path) => existsSync(path));

const configText = configFiles
  .map((path) => readText(path) ?? "")
  .join("\n");

if (configFiles.length === 0) {
  add("warn", "Config", "No app.json or app.config.* found.");
} else {
  if (/enableSceneSupport/.test(configText)) {
    if (expoMajor !== null && expoMajor < 58) {
      add(
        "info",
        "Config",
        "SDK 57-era scene support is configured. It is valid on SDK 57 but must be removed when upgrading to SDK 58.",
        { hint: "Upgrade to SDK 58, remove enableSceneSupport, then run: npx expo prebuild --clean" },
      );
    } else {
      add(
        "error",
        "Config",
        "ios.enableSceneSupport is present. It is an SDK 57 workaround and is unsupported on SDK 58.",
        { hint: "Remove it, then run: npx expo prebuild --clean" },
      );
    }
  }

  if (/expo-build-properties/.test(configText)) {
    add(
      "warn",
      "Config",
      "expo-build-properties is configured. Keep it only if another setting needs it.",
      { hint: "Remove it if it was added solely for UIScene support." },
    );
  }
}

// ---------------------------------------------------------------------------
// Native iOS artifacts
// ---------------------------------------------------------------------------

const iosDir = join(root, "ios");
if (existsSync(iosDir)) {
  const iosFiles = walk(iosDir, 4);
  const sceneDelegate = iosFiles.find(
    (path) => basename(path) === "SceneDelegate.swift",
  );
  const infoPlists = iosFiles.filter(
    (path) => basename(path) === "Info.plist",
  );

  if (sceneDelegate) {
    add("ok", "iOS", "SceneDelegate.swift found.");
  } else {
    add(
      "warn",
      "iOS",
      "No SceneDelegate.swift found under ios/.",
      { hint: "Run: npx expo prebuild --clean (SDK 58 generates it)." },
    );
  }

  const hasManifest = infoPlists.some((path) =>
    (readText(path) ?? "").includes("UIApplicationSceneManifest"),
  );

  if (hasManifest) {
    add("ok", "iOS", "UIApplicationSceneManifest found in Info.plist.");
  } else {
    add(
      "warn",
      "iOS",
      "UIApplicationSceneManifest was not found in any ios/ Info.plist.",
      { hint: "Run: npx expo prebuild --clean (SDK 58 adds it)." },
    );
  }
} else {
  add(
    "info",
    "iOS",
    "No ios/ directory. Native checks will run after the next prebuild or EAS build.",
  );
}

// ---------------------------------------------------------------------------
// Source scan
// ---------------------------------------------------------------------------

const sourceFiles = walk(root).filter((path) => {
  if (!SOURCE_EXTS.has(extname(path))) return false;
  try {
    return statSync(path).size <= 2 * 1024 * 1024;
  } catch {
    return false;
  }
});

let insetFiles = 0;
let windowDimensionFiles = 0;
let hingeFiles = 0;
let nativeTabFiles = 0;
let customTabFiles = 0;
let providerFound = false;
let absoluteFindings = 0;

for (const file of sourceFiles) {
  const text = readText(file);
  if (!text) continue;

  const rel = relative(root, file);
  const lines = text.split(/\r?\n/);

  const usesSafeAreaContext =
    /from\s+["']react-native-safe-area-context["']/.test(text) &&
    /\b(useSafeAreaInsets|useSafeAreaFrame|SafeAreaView)\b/.test(text);

  if (usesSafeAreaContext) {
    insetFiles += 1;
  }

  if (/\buseWindowDimensions\b/.test(text)) {
    windowDimensionFiles += 1;
  }

  if (/\buseHinge\b|\bexpo-hinge\b/.test(text)) {
    hingeFiles += 1;
  }

  if (/\bNativeTabs\b/.test(text)) {
    nativeTabFiles += 1;
  }

  if (
    /@react-navigation\/bottom-tabs/.test(text) ||
    /\bcreateBottomTabNavigator\b/.test(text) ||
    /\btabBar\s*=/.test(text)
  ) {
    customTabFiles += 1;
    add(
      "warn",
      "Source",
      "Custom/JavaScript tab bar detected. It will not get native rail placement for free.",
      { file: rel, hint: "Prefer NativeTabs where possible." },
    );
  }

  if (/\bSafeAreaProvider\b/.test(text)) {
    providerFound = true;
  }

  const badSafeAreaImport =
    /import\s*\{[\s\S]{0,300}?\bSafeAreaView\b[\s\S]{0,300}?\}\s*from\s*["']react-native["']/.test(
      text,
    ) ||
    /const\s*\{[\s\S]{0,300}?\bSafeAreaView\b[\s\S]{0,300}?\}\s*=\s*require\(\s*["']react-native["']\s*\)/.test(
      text,
    );

  if (badSafeAreaImport) {
    add(
      "error",
      "Source",
      "SafeAreaView is imported from react-native. That version does not know about the Duo rail.",
      { file: rel, hint: "Import SafeAreaView from react-native-safe-area-context." },
    );
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNumber = i + 1;

    if (/Dimensions\.get\s*\(\s*["'](?:window|screen)["']\s*\)/.test(line)) {
      add(
        "warn",
        "Source",
        "Dimensions.get() used for window size. Prefer useWindowDimensions() at render time.",
        {
          file: rel,
          line: lineNumber,
          hint: "Module-scope values do not update when the device folds.",
        },
      );
    }

    if (!/position\s*:\s*["']absolute["']/.test(line)) continue;

    const start = Math.max(0, i - 8);
    const end = Math.min(lines.length, i + 9);
    const block = lines.slice(start, end).join("\n");

    if (/insets\.(?:left|right)/.test(block)) continue;

    const offsets = [...block.matchAll(/\b(left|right)\s*:\s*(-?\d+(?:\.\d+)?)/g)]
      .filter((match) => Number(match[2]) !== 0);

    if (offsets.length === 0) continue;
    if (absoluteFindings >= 40) continue;

    absoluteFindings += 1;
    const side = offsets[0][1];
    add(
      "warn",
      "Source",
      `Absolutely positioned element uses a fixed ${side} offset. Add the matching safe-area inset.`,
      {
        file: rel,
        line: lineNumber,
        hint: `Use ${side}: 16 + insets.${side}, not ${side}: 16.`,
      },
    );
  }

  const modalCount = (text.match(/<Modal\b/g) ?? []).length;
  if (modalCount > 0) {
    add(
      "info",
      "Source",
      `${modalCount} Modal${modalCount === 1 ? "" : "s"} found. Screen padding does not apply inside a Modal.`,
      { file: rel, hint: "Apply left/right insets inside the modal content." },
    );
  }
}

if (sourceFiles.length === 0) {
  add("warn", "Source", "No JavaScript/TypeScript source files found.");
} else {
  if (insetFiles === 0) {
    add(
      "error",
      "Source",
      "No safe-area usage found (useSafeAreaInsets, useSafeAreaFrame, or SafeAreaView).",
      { hint: "Wrap the root in SafeAreaProvider and read insets at render time." },
    );
  } else {
    add(
      "ok",
      "Source",
      `Safe-area usage found in ${insetFiles} of ${sourceFiles.length} source files.`,
    );
  }

  if (windowDimensionFiles > 0) {
    add(
      "ok",
      "Source",
      `useWindowDimensions() used in ${windowDimensionFiles} file${windowDimensionFiles === 1 ? "" : "s"}.`,
    );
  }

  if (nativeTabFiles > 0) {
    add("ok", "Source", "NativeTabs used. iOS can place the tab bar in the rail.");
  }

  if (customTabFiles > 0 && nativeTabFiles === 0) {
    add(
      "warn",
      "Source",
      "No NativeTabs usage found. Verify the custom tab bar in every rail pose.",
    );
  }

  if (hingeFiles > 0) {
    add(
      "ok",
      "Source",
      `Hinge-aware code found in ${hingeFiles} file${hingeFiles === 1 ? "" : "s"}.`,
    );
  }

  if (!project.expoRouter && !providerFound) {
    add(
      "warn",
      "Source",
      "No SafeAreaProvider found and Expo Router is not installed.",
      { hint: "Wrap the app root in SafeAreaProvider." },
    );
  }
}

if (project.expoHinge && hingeFiles === 0) {
  add(
    "info",
    "Source",
    "expo-hinge is installed but no useHinge/addHingeListener usage was found.",
  );
}

if (hingeFiles > 0 && !project.expoHinge) {
  add(
    "error",
    "Setup",
    "Hinge APIs are used but expo-hinge is not in package.json.",
    { hint: "Run: npx expo install expo-hinge, then rebuild the native app." },
  );
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const summary = findings.reduce(
  (acc, finding) => {
    acc[finding.severity] += 1;
    return acc;
  },
  { error: 0, warn: 0, info: 0, ok: 0 },
);

if (json) {
  console.log(
    JSON.stringify(
      {
        root,
        project,
        sourceFiles: sourceFiles.length,
        summary,
        findings,
      },
      null,
      2,
    ),
  );
} else {
  printReport();
}

const shouldFail =
  summary.error > 0 || (strict && summary.warn > 0);
process.exitCode = shouldFail ? 1 : 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`iPhone Duo audit

Usage:
  node scripts/audit.mjs [project-root] [--json] [--strict]

Options:
  --json     Print machine-readable JSON
  --strict   Exit 1 when warnings are present
  --help     Show this help

Checks:
  - Expo SDK 58+ baseline and safe-area dependency
  - SDK 57-era enableSceneSupport / expo-build-properties config
  - SceneDelegate.swift and UIApplicationSceneManifest
  - Fixed left/right offsets on absolute elements
  - Dimensions.get, react-native SafeAreaView, custom tab bars, modals
`);
}

function printReport() {
  const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
  const paint = (code, text) =>
    useColor ? `\u001b[${code}m${text}\u001b[0m` : text;

  const labels = {
    error: paint("31", "[error]"),
    warn: paint("33", "[warn] "),
    info: paint("36", "[info] "),
    ok: paint("32", "[ok]   "),
  };

  console.log("");
  console.log(paint("1", "iPhone Duo readiness audit"));
  console.log(`Root: ${root}`);
  console.log(
    [
      `expo ${displayVersion(project.expo)}`,
      `react-native ${displayVersion(project.reactNative)}`,
      `expo-router ${displayVersion(project.expoRouter)}`,
      `safe-area-context ${displayVersion(project.safeAreaContext)}`,
      `expo-hinge ${displayVersion(project.expoHinge)}`,
    ].join(" | "),
  );
  console.log("");

  for (const category of CATEGORY_ORDER) {
    const group = findings
      .filter((finding) => finding.category === category)
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          String(a.file ?? "").localeCompare(String(b.file ?? "")) ||
          (a.line ?? 0) - (b.line ?? 0),
      );

    if (group.length === 0) continue;

    console.log(paint("1", category));
    for (const finding of group) {
      const location = finding.file
        ? ` ${finding.file}${finding.line ? `:${finding.line}` : ""}`
        : "";
      console.log(`${labels[finding.severity]} ${finding.message}${location}`);
      if (finding.hint) {
        console.log(`         ${paint("2", finding.hint)}`);
      }
    }
    console.log("");
  }

  const summaryLine = [
    `${summary.error} error${summary.error === 1 ? "" : "s"}`,
    `${summary.warn} warning${summary.warn === 1 ? "" : "s"}`,
    `${summary.info} note${summary.info === 1 ? "" : "s"}`,
    `${summary.ok} passed check${summary.ok === 1 ? "" : "s"}`,
  ].join(", ");

  console.log(paint("1", "Summary"));
  console.log(`  ${summaryLine}`);
  console.log("");

  if (summary.error > 0) {
    console.log(
      "Fix the errors first, then re-run. Warnings are layout risks that need a visual check.",
    );
  } else if (summary.warn > 0) {
    console.log(
      "No hard errors. Review the warnings, then test the poses in references/testing-checklist.md.",
    );
  } else {
    console.log(
      "No structural issues detected. Static analysis cannot prove layout correctness; run the pose checklist.",
    );
  }
  console.log("");
}
