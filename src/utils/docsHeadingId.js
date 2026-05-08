/**
 * Stable URL fragment for documentation headings (markdown-it-anchor, persisted TOC,
 * sidebar deep-links). Must match {@link headingHashFromTitle} in w4h-api/lib/utils/docRender.js.
 *
 * @param {string} str heading plain text
 * @returns {string}
 */
export function docsHeadingHashId(str) {
  return String(str || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}
