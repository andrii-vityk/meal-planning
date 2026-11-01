/**
 * Turns the Vite single-file build (dist/index.html) into the page fragment
 * the artifact host expects (dist/artifact.html).
 *
 * The host wraps the published file in its own <!doctype><html><head><body>
 * skeleton, so the fragment must not contain those tags. Order matters:
 * the host scans only the first 8 KB for <title>, so title and meta come
 * first, then stylesheets, then the body content, then the inlined scripts.
 */
import { readFile, writeFile } from "node:fs/promises";

const source = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

const all = (pattern) => [...source.matchAll(pattern)].map((match) => match[0]);
const first = (pattern) => source.match(pattern)?.[0] ?? "";

const title = first(/<title>[\s\S]*?<\/title>/);
const hostMeta = all(/<meta name="claude:[^"]*"[^>]*>/g);
const links = all(/<link\b[^>]*>/g);
const styles = all(/<style\b[^>]*>[\s\S]*?<\/style>/g);
const scripts = all(/<script\b[^>]*>[\s\S]*?<\/script>/g);
const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!title || !bodyMatch) {
  throw new Error("dist/index.html has no <title> or <body>; was the build changed?");
}
// Scripts are re-appended at the end, so drop any that sit inside the body.
const body = bodyMatch[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").trim();

const fragment = [title, ...hostMeta, ...links, ...styles, body, ...scripts].join("\n");
await writeFile(new URL("../dist/artifact.html", import.meta.url), `${fragment}\n`);

console.log(`dist/artifact.html written (${Math.round(fragment.length / 1024)} KB)`);
