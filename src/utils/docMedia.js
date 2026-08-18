/**
 * Normalize docs HTML media URLs for the Help browser.
 *
 * Repo markdown uses `/media/…` (Cursor multi-root preview) or `media/…`.
 * Import/render should produce same-origin `/docs-media/…`
 * (Vite `public/docs-media` symlink → w4h-docs/media, or API mount).
 *
 * In-app Help links (`{{APP_URL}}/docs/…` or a baked absolute origin) are
 * rewritten to root-relative `/docs/…` so they follow the current host/port.
 * Import often bakes APP_URL as localhost:5173; Vite may be on 5174/5175, and
 * that other origin has no session — it looks like a logout.
 */
export function rewriteDocMediaUrls(html) {
  if (html == null || html === '') return html;
  let s = String(html);

  // Unresolved {{APP_URL}} (and percent-encoded) before docs-media
  s = s.replace(/(?:\{\{APP_URL\}\}|%7B%7BAPP_URL%7D%7D)\/docs-media\//gi, '/docs-media/');
  s = s.replace(/(?:\{\{API_URL\}\}|%7B%7BAPI_URL%7D%7D)\/docs-media\//gi, '/docs-media/');

  // Repo paths left in HTML: media/…, ./media/…, /media/…
  s = s.replace(/\b(src|poster)=(["'])\.?\/?media\//gi, '$1=$2/docs-media/');
  s = s.replace(/\b(src|poster)=(["'])\/media\//gi, '$1=$2/docs-media/');

  // Absolute http(s)://host/docs-media/ → root-relative (avoids stale localhost from import)
  s = s.replace(/\b(src|poster)=(["'])https?:\/\/[^"'/]+\/docs-media\//gi, '$1=$2/docs-media/');

  // Help page links: stay on this origin (do not follow a baked APP_URL port)
  s = s.replace(/(?:\{\{APP_URL\}\}|%7B%7BAPP_URL%7D%7D)(\/docs\/)/gi, '$1');
  s = s.replace(/\bhref=(["'])https?:\/\/[^"'/]+\/docs\//gi, 'href=$1/docs/');

  return s;
}

/** Same-origin <a href> in v-html docs: SPA navigate instead of a full reload. */
export function handleDocContentClick(event, router, { onNavigate } = {}) {
  const a = event.target.closest?.('a');
  if (!a || a.target === '_blank' || !router) return;
  const href = a.getAttribute('href');
  if (!href) return;
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }
  if (url.origin !== window.location.origin) return;
  event.preventDefault();
  onNavigate?.();
  router.push(url.pathname + url.search + url.hash);
}
