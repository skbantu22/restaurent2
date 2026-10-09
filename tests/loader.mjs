// Test-only Node ESM loader hook.
//
// This project's .js files use `import`/`export` syntax and Next.js
// "@/..." path aliases, which work fine inside Next's own dev/build
// pipeline (webpack/SWC) but are NOT understood by plain `node`. This
// loader teaches plain Node (used only by `npm test`, never by
// `next dev`/`next build`) to do the same two things Next already
// does, so the exact same source files can be exercised by
// node:test without a transpile step or a copy of the code.
//
// Scope is deliberately narrow: only rewrites "@/" and only forces
// ESM parsing for this project's own .js files (never node_modules).
// It has no effect on the Next.js app itself.

import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const projectRootUrl = pathToFileURL(projectRoot + path.sep).href;

const CANDIDATE_SUFFIXES = ["", ".js", ".jsx", ".mjs", "/index.js"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(projectRoot, specifier.slice(2));

    let lastError;
    for (const suffix of CANDIDATE_SUFFIXES) {
      try {
        return await nextResolve(pathToFileURL(base + suffix).href, context);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  const isProjectFile = url.startsWith(projectRootUrl) && !url.includes("/node_modules/");

  if (isProjectFile && url.endsWith(".js")) {
    return nextLoad(url, { ...context, format: "module" });
  }

  return nextLoad(url, context);
}
