import MarkdownIt from "markdown-it";
import { docsHeadingHashId } from "./docsHeadingId.js";

export function stripHTML(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * @param {string} base
 * @param {Set<string>} used
 */
function uniqueHeadingId(base, used) {
  let id = base && base.length ? base : 'section';
  let n = 0;
  while (used.has(id)) {
    n += 1;
    id = `${base || 'section'}-${n}`;
  }
  used.add(id);
  return id;
}

/**
 * A basic slugify (legacy) for generateTOC2 parity with markdown-it default-style anchors.
 * @param {string} title
 * @returns {string}
 */
function slugifyLegacy(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates a Table of Contents from a markdown string.
 * @param {string} markdown The raw markdown content.
 * @returns {Array} An array of TOC objects.
 */
export function generateTOC2(markdown) {
  const toc = [];
  const renderedHeadings = {};
  const tokens = new MarkdownIt().parse(markdown, {});

  tokens.forEach(token => {
    if (token.type === 'heading_open') {
      const level = Number(token.tag.slice(1));
      const inlineToken = tokens.find(t => t.level === token.level + 1 && t.type === 'inline');

      if (inlineToken) {
        const title = stripHTML(inlineToken.content);
        let slug = slugifyLegacy(title);

        let count = 0;
        let originalSlug = slug;
        while (renderedHeadings[slug]) {
          count++;
          slug = `${originalSlug}-${count}`;
        }
        renderedHeadings[slug] = true;

        toc.push({ id: slug, level: level, title: title });
      }
    }
  });

  return toc;
}

/**
 * TOC from markdown (no full anchor render). Uses docsHeadingHashId + duplicate suffixes
 * aligned with markdown-it-anchor for typical headings. Used for static card blurbs;
 * for saved docs, the editor/API derive TOC from rendered HTML when possible.
 */
export function generateTOC(markdown) {
  const toc = [];
  const used = new Set();
  const md = new MarkdownIt({ html: true, breaks: true });

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const level = Number(token.tag.slice(1));

    const inlineToken = tokens[idx + 1];
    const headingTitle =
      inlineToken && inlineToken.type === "inline"
        ? stripHTML(inlineToken.content)
        : '';

    const base = docsHeadingHashId(headingTitle);
    const id = uniqueHeadingId(base, used);
    toc.push({ id, level: level + 1, title: headingTitle });
    token.attrSet('id', id);

    return self.renderToken(tokens, idx, options);
  };

  md.render(markdown || "");

  return toc;
}
