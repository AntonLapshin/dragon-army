// Regenerate zeus-compatible JS from the TS engine sources.
// zeus build (zpm 3.x) only transpiles .js files, so page/ must import
// these .js bundles (koala-style explicit `.js` imports). The .ts files
// remain the source of truth for vitest.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const targets = [
  ["engine/config.ts", "engine/config.js"],
  ["engine/engine.ts", "engine/engine.js"],
  ["engine/utils.ts", "engine/utils.js"],
];

for (const [src, out] of targets) {
  execFileSync(
    "./node_modules/.bin/esbuild",
    [src, "--format=esm", "--target=es2020", `--outfile=${out}`],
    { stdio: "inherit" },
  );
  const base = src.split("/").pop().replace(".ts", "");
  const header =
    `// GENERATED from engine/${base}.ts — do not edit by hand.\n` +
    `// Regenerate with: npm run build:engine\n` +
    `// (zeus build only bundles .js; the .ts sources are for vitest.)\n`;
  let code = readFileSync(out, "utf8");
  code = code.split('from "./config"').join('from "./config.js"');
  code = code.split('from "./utils"').join('from "./utils.js"');
  if (!code.startsWith("// GENERATED")) code = header + code;
  writeFileSync(out, code);
}
console.log("engine JS regenerated");
