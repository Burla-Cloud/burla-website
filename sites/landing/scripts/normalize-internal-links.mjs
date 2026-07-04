import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const base = (process.env.SITE_BASE_PATH ?? "").replace(/\/$/, "");

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    if (entry.isFile() && entry.name.endsWith(".html")) yield path;
  }
}

for await (const file of htmlFiles(distDir)) {
  const original = await readFile(file, "utf8");
  const next = original
    .replace(/\bhref="https:\/\/docs\.burla\.dev(?=\/|#|")/g, `href="${base}`)
    .replace(/\bhref="https:\/\/burla\.dev(?=\/|#|")/g, `href="${base}`);
  if (next !== original) await writeFile(file, next);
}
