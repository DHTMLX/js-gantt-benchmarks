// Bundles a round's report and its charts into one generated HTML file.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

import { ROUND_VERSION } from "./config.mjs";
import { hasFlag, roundVersionFromArgv } from "./argv.mjs";
import { ROOT, chartsDir, reportPath, roundDir, summaryPath } from "./paths.mjs";
import { escapeHtml, renderMarkdown, slugify } from "./markdown.mjs";

/** A bare semver is published; suffixed versions are internal rounds. */
export const isInternalRound = (version) => !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version);

/** Finds the round's single markdown report document. */
function findReport(version) {
  const conventional = reportPath(version);
  if (existsSync(conventional)) {
    return conventional;
  }

  const dir = roundDir(version);
  const found = existsSync(dir)
    ? readdirSync(dir).filter((name) => /^report-v.+\.md$/.test(name))
    : [];

  if (found.length === 1) {
    return join(dir, found[0]);
  }
  throw new Error(
    found.length === 0
      ? `no report document in ${dir} — expected ${basename(conventional)}`
      : `${dir} holds ${found.length} report documents (${found.join(", ")}); ` +
        `name the one to bundle ${basename(conventional)}`
  );
}

/** The round's own facts, for the line under the title. Absent for a round with no summary. */
function readRoundFacts(version) {
  const path = summaryPath(version);
  if (!existsSync(path)) {
    return {};
  }
  const summary = JSON.parse(readFileSync(path, "utf8"));
  const reference = summary.environments?.find((env) => env.id === summary.referenceEnvironment);
  return {
    generated: summary.generated,
    machine: summary.referenceEnvironment,
    machineName: reference?.name ?? null,
    libraries: summary.libraries?.length,
  };
}

/** Inlines a chart and fails if the report references a missing file. */
function inlineChart(alt, src, version) {
  const path = join(chartsDir(version), basename(src));
  if (!src.startsWith("charts/") || !existsSync(path)) {
    throw new Error(`${src} is referenced by the report but not in ${chartsDir(version)}`);
  }
  const svg = readFileSync(path, "utf8")
    .replace(/^\s*<\?xml[^>]*\?>\s*/, "")
    .replace(/^<svg\b/, '<svg data-theme="light"')
    .trim();
  return `<div class="chart" role="group" aria-label="${escapeHtml(alt)}">${svg}</div>`;
}

/** Resolves a link to an anchor in the report, an external URL, or named repository text. */
function resolveHref(href) {
  if (/^(https?:|mailto:)/.test(href)) {
    return { kind: "external", href };
  }

  const [rawPath, anchor] = href.split("#");
  const path = rawPath.replace(/^\.\//, "").replace(/^(\.\.\/)+/, "");

  if (path === "") {
    return { kind: "anchor", href: `#${anchor ?? ""}` };
  }

  // The bundle holds the report alone, so a link to another of the repository's documents names
  // that document rather than pointing at a file the reader was not sent.
  return { kind: "text", note: `${path} in the benchmark repository` };
}

/** Renders the report into the page. */
function renderDocument(text, { version }) {
  return renderMarkdown(text, {
    image: (alt, src) => inlineChart(alt, src, version),
    link: (html, href) => {
      const target = resolveHref(href);
      if (target.kind === "text") {
        return `<span class="unlinked" title="${escapeHtml(target.note)}">${html}</span>`;
      }
      const rel = target.kind === "external" ? ' rel="noopener" target="_blank"' : "";
      return `<a href="${escapeHtml(target.href)}"${rel}>${html}</a>`;
    },
  });
}

const renderToc = (headings) =>
  [
    '<nav class="toc" aria-label="Contents">',
    "<h2>Contents</h2>",
    "<ul>",
    ...headings.map(
      ({ id, text, level }) =>
        `<li class="toc-l${level}"><a href="#${escapeHtml(id)}">${escapeHtml(text)}</a></li>`
    ),
    "</ul></nav>",
  ].join("\n");

// A named machine is introduced by its name; an unnamed one by the id its results are filed under.
const referenceMachine = ({ machine, machineName }) => {
  if (machineName) return `reference machine ${escapeHtml(machineName)}`;
  return machine ? `reference machine <code>${escapeHtml(machine)}</code>` : null;
};

const renderMeta = (version, facts) =>
  [
    `Round v${version}`,
    referenceMachine(facts),
    facts.libraries ? `${facts.libraries} components` : null,
    facts.generated ? `results of ${escapeHtml(facts.generated)}` : null,
  ]
    .filter(Boolean)
    .join(" &middot; ");

/** Placeholders that mark unfinished report narrative. */
const unwrittenSections = (markdown) => (markdown.match(/\*\*TODO\*\*/g) ?? []).length;

const draftBanner = (count) => `
<aside class="banner draft" role="note">
  <p><strong>Draft — ${count} narrative section${count === 1 ? "" : "s"} not yet written.</strong></p>
  <p>The tables, the charts and the measurements behind them are complete. The sections marked
  TODO below are where this round's headlines, conclusions and limitations will go, and nobody
  has drawn those conclusions from these numbers yet.</p>
</aside>`;

const INTERNAL_BANNER = `
<aside class="banner" role="note">
  <p><strong>Internal working round — not for publication.</strong></p>
  <p>This round's version carries a suffix, which marks measurements taken to answer a
  question internally rather than a round published under a release version. Its figures may
  still change, it has not been through the checks a published round goes through, and nothing
  in it should be quoted outside the company or shown to a customer.</p>
</aside>`;

const STYLES = `
:root {
  color-scheme: light;
  --surface: #fcfcfb;
  --surface-sunken: #f5f4f0;
  --ink: #0b0b0b;
  --ink-secondary: #52514e;
  --ink-muted: #898781;
  --rule: #e1e0d9;
  --accent: #1f5fab;
  --warn-surface: #fdf4e6;
  --warn-rule: #d9a441;
  --warn-ink: #6b4508;
  /* The content column. Prose, charts and banners share one width, so the page has one edge. */
  --measure: 820px;
  /* One stack for the whole document, of fonts the reader's machine already has: the bundle is
     a single offline file, so a webfont is not something it can carry. */
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 3rem 1.5rem 6rem;
  background: var(--surface);
  color: var(--ink);
  font: 400 17px/1.65 var(--sans);
  -webkit-text-size-adjust: 100%;
}

.page { max-width: 60rem; margin: 0 auto; }

h1, h2, h3, h4, h5, h6 {
  line-height: 1.25;
  letter-spacing: -0.011em;
  margin: 2.5rem 0 0.75rem;
}
h1 { font-size: 2.25rem; font-weight: 650; letter-spacing: -0.02em; margin-top: 0; }
h2 { font-size: 1.75rem; font-weight: 600; padding-top: 1.5rem; border-top: 1px solid var(--rule); }
/* The report writes a rule before some of its sections and not others. The heading carries its
   own, so where the document supplied one the heading does not draw a second beside it. */
hr + h2 { border-top: 0; padding-top: 0; margin-top: 0; }
h3 { font-size: 1.4rem; font-weight: 600; }
h4 { font-size: 0.95rem; font-weight: 600; color: var(--ink-secondary); text-transform: uppercase; letter-spacing: 0.06em; }

p, ul, ol, pre { margin: 0 0 1.1rem; }
p, ul, ol, h1, h2, h3, h4, h5, h6, .banner, blockquote { max-width: var(--measure); }
li { margin-bottom: 0.5rem; }
strong { font-weight: 650; }
hr { border: 0; border-top: 1px solid var(--rule); margin: 2.5rem 0; }

a { color: var(--accent); text-underline-offset: 2px; text-decoration-thickness: 1px; }
/* Named something real that is not in this file — see resolveHref. */
.unlinked { color: inherit; border-bottom: 1px dotted var(--ink-muted); cursor: help; }

code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.85em;
  background: var(--surface-sunken);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}
pre {
  background: var(--surface-sunken);
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 0.9rem 1.1rem;
  overflow-x: auto;
  max-width: var(--measure);
}
pre code { background: none; padding: 0; font-size: 0.82rem; }

.meta {
  font: 400 0.85rem/1.5 var(--sans);
  color: var(--ink-secondary);
  max-width: none;
  margin-top: -0.3rem;
}
.meta code { background: none; padding: 0; }

.banner {
  background: var(--warn-surface);
  border: 1px solid var(--warn-rule);
  border-left-width: 4px;
  border-radius: 4px;
  padding: 1rem 1.2rem;
  margin: 1.5rem 0 2rem;
  color: var(--warn-ink);
  font-size: 0.9rem;
}
.banner p { max-width: none; margin: 0 0 0.6rem; }
.banner p:last-child { margin-bottom: 0; }
.banner.draft { background: var(--surface-sunken); border-color: var(--ink-muted); color: var(--ink-secondary); }
.banner.draft strong { color: var(--ink); }

/* The one construct these documents quote with: a section the round has not written yet. */
blockquote {
  margin: 0 0 1.1rem;
  padding: 0.9rem 1.2rem;
  border: 1px dashed var(--ink-muted);
  border-radius: 4px;
  background: var(--surface-sunken);
  font-size: 0.88rem;
  color: var(--ink-secondary);
  max-width: var(--measure);
}
blockquote p { margin: 0; max-width: none; }

.toc {
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 1.2rem 1.5rem;
  margin: 2.5rem 0;
  max-width: var(--measure);
  background: var(--surface-sunken);
  font-size: 0.85rem;
  line-height: 1.4;
}
.toc h2 { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); border: 0; margin: 0 0 0.8rem; padding: 0; }
/* Two columns: a round has around two dozen sections, and a full screen of contents before
   the first sentence of the report is a table of contents nobody reads. */
.toc ul { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 2.5rem; }
.toc li { margin-bottom: 0.3rem; break-inside: avoid; }
.toc .toc-l3 { padding-left: 1rem; font-size: 0.8rem; }
.toc a { text-decoration: none; }
.toc a:hover { text-decoration: underline; }
@media (max-width: 40rem) { .toc ul { columns: 1; } }

.table-scroll { overflow-x: auto; margin: 0 0 1.6rem; }
/* Sized to its content rather than to the page: these tables run from three columns to eight,
   and stretching a narrow one across the full measure puts its figures a hand's width from the
   row they belong to. A wide one overflows into the scroller instead. */
table {
  border-collapse: collapse;
  font: 400 0.82rem/1.4 var(--sans);
  font-variant-numeric: tabular-nums;
}
th, td {
  text-align: left;
  padding: 0.45rem 0.9rem 0.45rem 0;
  border-bottom: 1px solid var(--rule);
  white-space: nowrap;
}
th {
  font-weight: 600;
  color: var(--ink-secondary);
  border-bottom: 1px solid var(--ink-muted);
  vertical-align: bottom;
}
td.num, th.num { text-align: right; }
tbody tr:last-child td { border-bottom: 1px solid var(--ink-muted); }

figure { margin: 0 0 1.5rem; }
.chart { margin: 0 0 1.25rem; }
.chart svg { width: 100%; height: auto; max-width: var(--measure); display: block; }

.colophon {
  margin-top: 4rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--rule);
  font: 400 0.8rem/1.6 var(--sans);
  color: var(--ink-muted);
  max-width: var(--measure);
}

@media print {
  body { padding: 0; font-size: 10.5pt; }
  .toc { display: none; }
  h1, h2, h3, h4 { break-after: avoid; }
  .chart, tr, pre, .banner { break-inside: avoid; }
  a { color: inherit; text-decoration: none; }
  /* On screen a table wider than the page scrolls; on paper it would be cut off at the
     margin with no way to reach the rest, so the widest cells wrap instead. */
  .table-scroll { overflow: visible; }
  table { font-size: 8pt; }
  th, td { white-space: normal; padding-right: 0.6rem; }
  th.num, td.num { white-space: nowrap; }
}
`;

export function writeHtml({ version = ROUND_VERSION, internal } = {}) {
  const markdownPath = findReport(version);
  const facts = readRoundFacts(version);
  const isInternal = internal ?? isInternalRound(version);

  const markdown = readFileSync(markdownPath, "utf8");
  const unwritten = unwrittenSections(markdown);
  const report = renderDocument(markdown, { version });

  const title = report.headings.find((heading) => heading.level === 1)?.text ??
    `Benchmark round v${version}`;

  const toc = renderToc(
    report.headings.filter((heading) => heading.level === 2 || heading.level === 3)
  );

  // The report's own H1 opens the document; the round's facts and any warning about it belong
  // directly under that title rather than above it, so the file reads as the report it is.
  const head = `${renderTitleBlock(version, facts, isInternal, unwritten)}\n${toc}`;
  const body = report.html.replace("</h1>", `</h1>\n${head}`);

  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(isInternal ? `INTERNAL — ${title}` : title)}</title>`,
    `<style>${STYLES}</style>`,
    "</head>",
    "<body>",
    '<div class="page">',
    body,
    renderColophon(markdownPath, isInternal),
    "</div>",
    "</body>",
    "</html>",
  ].join("\n");

  const path = markdownPath.replace(/\.md$/, ".html");
  writeFileSync(path, html, "utf8");

  return {
    path,
    internal: isInternal,
    unwritten,
    charts: (report.html.match(/<div class="chart"/g) ?? []).length,
  };
}

const renderTitleBlock = (version, facts, isInternal, unwritten) =>
  [
    `<p class="meta">${renderMeta(version, facts)}</p>`,
    isInternal ? INTERNAL_BANNER : "",
    unwritten ? draftBanner(unwritten) : "",
  ].join("\n");

const renderColophon = (markdownPath, isInternal) =>
  [
    '<footer class="colophon">',
    `<p>Generated from <code>${escapeHtml(
      markdownPath.slice(ROOT.length + 1).replace(/\\/g, "/")
    )}</code> in the js-gantt-benchmarks repository, which also holds the raw measurements ` +
      "every figure above was computed from. This file is generated: edits to it are lost the " +
      "next time the round is bundled.</p>",
    isInternal
      ? "<p><strong>Internal working round — not for publication.</strong></p>"
      : "",
    "</footer>",
  ].join("\n");

/** Every round in `reports/` that holds a report document. */
const listRounds = () =>
  readdirSync(join(ROOT, "reports"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => readdirSync(join(ROOT, "reports", name)).some((f) => /^report-v.+\.md$/.test(f)))
    .sort();

// CLI entry
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const versions = hasFlag(argv, "--all")
    ? listRounds()
    : [roundVersionFromArgv(argv, ROUND_VERSION)];
  const internal = hasFlag(argv, "--internal") ? true : undefined;

  for (const version of versions) {
    const result = writeHtml({ version, internal });
    console.log(
      `Wrote ${result.path}\n  ${result.charts} charts inlined` +
        `${result.internal ? ", marked internal — not for publication" : ""}` +
        `${result.unwritten ? `, marked draft — ${result.unwritten} TODO sections` : ""}`
    );
    if (result.unwritten) {
      console.warn(
        `\nNOTE: ${version} still has ${result.unwritten} unwritten narrative section(s).\n` +
          "  Its tables and charts are complete; its headlines, conclusions and limitations\n" +
          "  are not. The bundle says so on its first screen — see PUBLISHING.md step 3.\n"
      );
    }
  }

  console.log(
    "\nOne file each, self-contained: send it, or open it and print to PDF. Nothing else in\n" +
      "  the round's directory has to travel with it."
  );
}
