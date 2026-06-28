import type { Digest } from "./types";

/** Render Digest → HTML + plaintext. Jednoduchá inline-styled šablona; ladí se za běhu (§9). */
export function renderDigest(d: Digest): { html: string; text: string } {
  const legHtml = d.legislation
    .map((f) => `<li><strong>${f.item.title}</strong> — ${f.reason}</li>`)
    .join("");
  const feedHtml = d.feed
    .map((f) => `<li><a href="${f.url}">${f.title}</a> <em>(${f.source})</em></li>`)
    .join("");
  const html = `<div style="font-family:system-ui;max-width:640px">
    <h2>UX Recall — týden ${d.weekOf}</h2>
    ${d.legislation.length ? `<h3>Legislativa</h3><ul>${legHtml}</ul>` : ""}
    ${d.feed.length ? `<h3>Feed</h3><ul>${feedHtml}</ul>` : ""}
  </div>`;
  const text = [
    `UX Recall — týden ${d.weekOf}`,
    ...d.legislation.map((f) => `- ${f.item.title}: ${f.reason}`),
    ...d.feed.map((f) => `- ${f.title} (${f.source}) ${f.url}`),
  ].join("\n");
  return { html, text };
}
