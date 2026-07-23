/**
 * Normalize docs HTML media URLs for the Help browser.
 *
 * Repo markdown uses `/media/…` (Cursor multi-root preview) or `media/…`.
 * Import/render should produce same-origin `/docs-media/…`
 * (Vite `public/docs-media` symlink → w4h-docs/media, or API mount).
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

  return s;
}
