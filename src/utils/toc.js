import MarkdownIt from "markdown-it";

export function stripHTML(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * A basic slugify function to match markdown-it-anchor's default behavior.
 * @param {string} title The heading title to slugify.
 * @returns {string} The slugified string.
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
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
        let slug = slugify(title);

        // Handle duplicate slugs by appending a number
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

export function generateTOC(markdown) {
  const toc = [];
  const md = new MarkdownIt({ html: true, breaks: true });

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const level = Number(token.tag.slice(1));

    const inlineToken = tokens[idx + 1];
    const headingTitle = inlineToken && inlineToken.type === "inline"
      ? stripHTML(inlineToken.content)
      : '';

    const id = `${headingTitle.toLowerCase().replace(/[^\w]+/g, "-")}`;
    toc.push({ id: id, level: level + 1, title: headingTitle });
    token.attrSet('id', id);

    return self.renderToken(tokens, idx, options);
  };

  md.render(markdown || "");

  return toc;
}
