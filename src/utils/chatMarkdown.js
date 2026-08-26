import MarkdownIt from 'markdown-it';

/** Map chat hrefs onto real Vue routes (Claude often emits /projects/{slug}). */
export function rewriteChatHref(href) {
  const raw = String(href || '').trim();
  const m = raw.match(/^\/projects\/([^/?#]+)\/?(\?.*)?$/);
  if (m) return `/admin/projects/${m[1]}/edit${m[2] || ''}`;
  return raw;
}

/** Chat replies from Claude — Markdown in, HTML out. HTML tags in the source are escaped. */
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

const defaultLinkOpen = md.renderer.rules.link_open
  || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = rewriteChatHref(token.attrGet('href') || '');
  token.attrSet('href', href);
  const external = /^https?:\/\//i.test(href);
  if (external) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function renderChatMarkdown(source) {
  return md.render(String(source || ''));
}
