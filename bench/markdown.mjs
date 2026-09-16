// Renders the supported report-markdown subset as HTML; unrecognized text is preserved.

import { MARKERS } from "./tables.mjs";

/** Escapes text destined for HTML body content or a double-quoted attribute. */
export const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * GitHub's heading-anchor rule, which is what the `#section` links in these documents were
 * written against: formatting stripped, lowercased, spaces to hyphens, everything else that
 * is not a letter, a digit or a hyphen removed.
 */
export const slugify = (text) =>
  text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]/gu, "");

// Ordered, and the order is the precedence: an image is a link with a bang in front of it, so
// it has to be tried first, and `**strong**` has to be tried before `*emphasis*` or every
// strong span parses as two empty emphases.
const INLINE_RULES = [
  { re: /^!\[([^\]]*)\]\(([^)]+)\)/, render: (m, ctx) => ctx.image(m[1], m[2]) },
  { re: /^\[([^\]]+)\]\(([^)]+)\)/, render: (m, ctx) => ctx.link(inline(m[1], ctx), m[2]) },
  { re: /^`([^`]+)`/, render: (m) => `<code>${escapeHtml(m[1])}</code>` },
  { re: /^\*\*([^*]+)\*\*/, render: (m, ctx) => `<strong>${inline(m[1], ctx)}</strong>` },
  { re: /^\*([^*\n]+)\*/, render: (m, ctx) => `<em>${inline(m[1], ctx)}</em>` },
];

// Fast precheck for the inline parser's opening characters.
const INLINE_OPENERS = new Set(["!", "[", "`", "*"]);

/** Inline formatting within one block of text. */
function inline(text, ctx) {
  let out = "";
  let plain = "";
  let i = 0;

  while (i < text.length) {
    let matched = null;
    if (INLINE_OPENERS.has(text[i])) {
      const rest = text.slice(i);
      for (const rule of INLINE_RULES) {
        const m = rule.re.exec(rest);
        if (m) {
          matched = { m, rule };
          break;
        }
      }
    }

    if (matched) {
      out += escapeHtml(plain) + matched.rule.render(matched.m, ctx);
      plain = "";
      i += matched.m[0].length;
    } else {
      plain += text[i];
      i += 1;
    }
  }

  return out + escapeHtml(plain);
}

const isBlank = (line) => line.trim() === "";
const isFence = (line) => line.trimStart().startsWith("```");
const isHeading = (line) => /^#{1,6}\s/.test(line);
const isRule = (line) => /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line);
const isBullet = (line) => /^[-*]\s+/.test(line);
const isTableRow = (line) => line.trimStart().startsWith("|");
const isQuote = (line) => /^>\s?/.test(line);
const isHtmlBlock = (line) => /^<\/?[a-zA-Z][^>]*>/.test(line.trimStart());
const isComment = (line) => line.trimStart().startsWith("<!--");

const isTableDivider = (line) =>
  isTableRow(line) && /^[\s|:-]+$/.test(line) && line.includes("-");

// Generated numeric columns are right-aligned; name columns remain left-aligned. A marker
// standing where a figure would be does not make the column a text column, so the markers come
// from the generator that writes them rather than from a second list here.
const NUMERIC_CELL = /^[0-9][0-9\s.,]*(\s*\(\d+\/\d+\))?$/;
const PLACEHOLDERS = new Set(["", "-", "n/a", ...Object.values(MARKERS)]);

const columnAlignment = (rows) => {
  const width = Math.max(0, ...rows.map((cells) => cells.length));
  return Array.from({ length: width }, (_, column) => {
    const cells = rows.map((row) => (row[column] ?? "").trim());
    const figures = cells.filter((cell) => NUMERIC_CELL.test(cell));
    const rest = cells.filter((cell) => !NUMERIC_CELL.test(cell));
    return figures.length > 0 && rest.every((cell) => PLACEHOLDERS.has(cell))
      ? "right"
      : "left";
  });
};

const splitRow = (line) => {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
};

/**
 * Renders one document.
 *
 * `ctx` supplies the two resolutions this module deliberately does not make: `link(html, href)`
 * and `image(alt, src)`, which is where a caller decides whether a target survives as a link,
 * becomes an anchor into a bundled copy, or is flattened to text. `slug` namespaces heading
 * ids, so several documents can be rendered into one page without their anchors colliding.
 *
 * Returns the page fragment and every heading in it, in document order, for a caller building
 * a table of contents.
 */
export function renderMarkdown(text, ctx) {
  const slug = ctx.slug ?? ((value) => value);
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const headings = [];
  let i = 0;

  // Six tests carry the same two subheadings, and GitHub numbers a repeated heading rather than
  // pointing two anchors at one place. Same rule here, so a bundled anchor is the markdown one.
  const seen = new Map();
  const uniqueSlug = (base) => {
    const used = seen.get(base) ?? 0;
    seen.set(base, used + 1);
    return used ? `${base}-${used}` : base;
  };

  const paragraphish = (line) =>
    !isBlank(line) && !isHeading(line) && !isRule(line) && !isBullet(line) &&
    !isTableRow(line) && !isFence(line) && !isHtmlBlock(line) && !isComment(line) &&
    !isQuote(line);

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i += 1;
      continue;
    }

// Marker comments are generator machinery, not document content.
    if (isComment(line)) {
      while (i < lines.length && !lines[i].includes("-->")) i += 1;
      i += 1;
      continue;
    }

    if (isFence(line)) {
      const body = [];
      i += 1;
      while (i < lines.length && !isFence(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    if (isHeading(line)) {
      const [, hashes, body] = /^(#{1,6})\s+(.*)$/.exec(line);
      const level = hashes.length;
      const id = slug(uniqueSlug(slugify(body)));
      headings.push({ level, id, text: body.replace(/[`*]/g, "") });
      out.push(`<h${level} id="${escapeHtml(id)}">${inline(body, ctx)}</h${level}>`);
      i += 1;
      continue;
    }

    if (isRule(line)) {
      out.push("<hr>");
      i += 1;
      continue;
    }

// Pass through raw HTML blocks.
    if (isHtmlBlock(line)) {
      while (i < lines.length && !isBlank(lines[i])) {
        out.push(lines[i].trim());
        i += 1;
      }
      continue;
    }

    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i]);
        i += 1;
      }
      const header = splitRow(rows[0]);
      const body = rows.slice(isTableDivider(rows[1] ?? "") ? 2 : 1).map(splitRow);
      const align = columnAlignment(body);
      const cell = (tag, value, column) => {
        const attr = align[column] === "right" ? ' class="num"' : "";
        return `<${tag}${attr}>${inline(value, ctx)}</${tag}>`;
      };
      out.push(
        '<div class="table-scroll"><table>',
        `<thead><tr>${header.map((c, n) => cell("th", c, n)).join("")}</tr></thead>`,
        "<tbody>",
        ...body.map((row) => `<tr>${row.map((c, n) => cell("td", c, n)).join("")}</tr>`),
        "</tbody></table></div>"
      );
      continue;
    }

    // The report template marks an unwritten narrative section as a blockquote, which is the
    // one place these documents use one — so it renders as the standing-out block it is meant
    // to be rather than as three lines each opening with a stray angle bracket.
    if (isQuote(line)) {
      const quoted = [];
      while (i < lines.length && isQuote(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote><p>${inline(quoted.join(" ").trim(), ctx)}</p></blockquote>`);
      continue;
    }

    if (isBullet(line)) {
      const items = [];
      while (i < lines.length && isBullet(lines[i])) {
        const item = [lines[i].replace(/^[-*]\s+/, "")];
        i += 1;
        // A wrapped bullet continues on the following lines until a blank one or the next
        // bullet, which is how every list in these documents is written.
        while (i < lines.length && paragraphish(lines[i])) {
          item.push(lines[i].trim());
          i += 1;
        }
        items.push(item.join(" "));
      }
      out.push(`<ul>${items.map((item) => `<li>${inline(item, ctx)}</li>`).join("")}</ul>`);
      continue;
    }

    const para = [];
    while (i < lines.length && paragraphish(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    const body = para.join(" ");
    // A paragraph holding nothing but images is a figure group: the charts are written that
    // way, one block per test and mode, and wrapping them in a <p> would make them inline text.
    const wrapper = /^(\s*!\[[^\]]*\]\([^)]*\))+\s*$/.test(body) ? "figure" : "p";
    out.push(`<${wrapper}>${inline(body, ctx)}</${wrapper}>`);
  }

  return { html: out.join("\n"), headings };
}
