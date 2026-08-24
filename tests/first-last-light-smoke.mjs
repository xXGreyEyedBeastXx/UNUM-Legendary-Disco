import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = new URL("../toys/first-last-light/", import.meta.url);
const [html, css, script] = await Promise.all([
  readFile(new URL("index.html", base), "utf8"),
  readFile(new URL("styles.css", base), "utf8"),
  readFile(new URL("app.js", base), "utf8"),
]);

for (const id of [
  "light-field",
  "motion-toggle",
  "sound-toggle",
  "pulse-button",
  "return-button",
  "tempo",
  "mirrors",
  "phase-copy",
  "status",
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  assert.match(script, new RegExp(`getElementById\\(["']${id}["']\\)`), `script does not bind #${id}`);
}

assert.match(html, /<canvas\b/i, "canvas is missing");
assert.match(html, /aria-live=["']polite["']/i, "status is not announced accessibly");
assert.match(css, /prefers-reduced-motion:\s*reduce/i, "reduced-motion styling is missing");
assert.match(script, /matchMedia\(["']\(prefers-reduced-motion: reduce\)["']\)/, "reduced-motion behavior is missing");
assert.match(script, /event\.code === ["']Space["']/, "Space keyboard control is missing");
assert.match(script, /event\.key\.toLowerCase\(\) === ["']r["']/, "return keyboard control is missing");
assert.match(script, /if \(reducedMotion\.matches\)[\s\S]*?setMotion\(false,/, "reduced-motion startup does not pause motion");
assert.match(script, /8675309/, "deterministic seed is missing");
assert.match(script, /POINT_COUNT\s*=\s*360/, "360-point field is missing");
assert.doesNotMatch(script, /\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/, "unexpected network or persistent-storage API");
assert.doesNotMatch(html + css + script, /https?:\/\//i, "toy must remain dependency-free");

console.log("First Light / Last Light smoke checks passed.");
