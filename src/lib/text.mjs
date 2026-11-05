// Small text helpers shared by the parser, validator and templates.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape any value for use in HTML text or a quoted attribute. */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** [link text](url) */
export const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** [ALL CAPS PLACEHOLDER], but not the text part of a [link](url). */
export const PLACEHOLDER_RE = /\[([A-Z][A-Z0-9 _-]*)\](?!\()/g;

/** Links may go to the web, to email, or to a page on this site. Nothing else. */
export function isSafeUrl(url) {
  return /^(https?:\/\/\S+|mailto:\S+|\/(?!\/)\S*|#[\w-]*)$/i.test(url);
}

function emphasis(escaped) {
  return escaped
    .replace(/\*\*(?!\s)(.+?)(?<!\s)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(?!\s)(.+?)(?<!\s)\*/g, '<em>$1</em>');
}

/**
 * Inline formatting for body text and captions: *italic*, **bold**, [links](url).
 * Everything is escaped first, so story text can never inject HTML.
 */
export function inline(source) {
  const src = String(source ?? '');
  let out = '';
  let last = 0;
  for (const m of src.matchAll(LINK_RE)) {
    out += emphasis(esc(src.slice(last, m.index)));
    const [, text, url] = m;
    out += isSafeUrl(url) ? `<a href="${esc(url)}">${emphasis(esc(text))}</a>` : emphasis(esc(text));
    last = m.index + m[0].length;
  }
  return out + emphasis(esc(src.slice(last)));
}

export const findLinks = (src) => [...String(src ?? '').matchAll(LINK_RE)].map((m) => ({ text: m[1], url: m[2] }));
export const findPlaceholders = (src) => [...String(src ?? '').matchAll(PLACEHOLDER_RE)].map((m) => m[0]);

/** Returns a Date for a real YYYY-MM-DD date, otherwise null. */
export function parseDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : d;
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const formatDate = (iso) => {
  const d = parseDate(iso);
  return d ? DATE_FMT.format(d) : '';
};

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function tagLabel(tag, config) {
  return config.tags?.[tag] ?? tag.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

/** " Did you mean "caption"?" when a name is a near-miss of a known one. */
export function didYouMean(word, options) {
  let best = null;
  let bestScore = 3;
  for (const option of options) {
    const score = distance(word, option);
    if (score < bestScore) [best, bestScore] = [option, score];
  }
  return best ? ` Did you mean "${best}"?` : '';
}
