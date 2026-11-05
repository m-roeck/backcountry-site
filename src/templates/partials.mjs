// The locked parts of every page: head, header, footer, cards, the subscribe band.
// Change these once and every page on the site changes with them.

import { esc } from '../lib/text.mjs';

export const icons = {
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
  play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
};

const FONTS =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap';

export function layout({ config, title, description, path, image, body, noindex = false, banner = '' }) {
  const pageTitle = title ? `${title} — ${config.name}` : config.name;
  const desc = description || config.description;
  const canonical = config.url + path;
  const og = image
    ? `\n<meta property="og:image" content="${esc(config.url + image)}">\n<meta name="twitter:card" content="summary_large_image">`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">${noindex ? '\n<meta name="robots" content="noindex">' : ''}
<meta property="og:site_name" content="${esc(config.name)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title || config.name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">${og}
<link rel="alternate" type="application/rss+xml" title="${esc(config.name)}" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>${banner}
${header(config, path)}
<main id="main">
${body}
</main>
${footer(config)}
</body>
</html>
`;
}

function header(config, path) {
  const nav = config.nav
    .map((item) => {
      const current = item.url.startsWith('/') && path.startsWith(item.url) ? ' aria-current="page"' : '';
      return `<a href="${esc(item.url)}"${current}>${esc(item.label)}</a>`;
    })
    .join('\n');
  return `<header class="site-header">
<div class="wrap">
<a class="brand" href="/"><span class="wordmark">${esc(config.wordmark)}</span><span class="issue">${esc(config.issue)}</span></a>
<nav class="nav" aria-label="Primary">
${nav}
</nav>
<div class="header-actions">
<a class="icon-btn" href="/search/" aria-label="Search">${icons.search}</a>
<a class="btn" href="${esc(config.subscribe.url)}">Subscribe</a>
</div>
</div>
</header>`;
}

function footer(config) {
  const columns = config.footer.columns
    .map(
      (col) => `<nav class="footer-col" aria-label="${esc(col.label)}">
<span class="label">${esc(col.label)}</span>
${col.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join('\n')}
</nav>`,
    )
    .join('\n');
  return `<footer class="site-footer">
<div class="wrap">
<div class="footer-grid">
<div class="footer-col">
<span class="wordmark wordmark-sm">${esc(config.wordmark)}</span>
<p class="address">${config.footer.address.map(esc).join('<br>')}</p>
</div>
${columns}
</div>
<p class="legal">© ${new Date().getUTCFullYear()} ${esc(config.name)}</p>
</div>
</footer>`;
}

/** A photo in a fixed-ratio frame. With no src it draws an empty placeholder frame. */
export function frame(src, alt, ratio, { eager = false } = {}) {
  if (!src) return `<div class="frame ${ratio}" aria-hidden="true"></div>`;
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<div class="frame ${ratio}"><img src="${esc(src)}" alt="${esc(alt)}" ${loading}></div>`;
}

export function kicker(story, { date = true } = {}) {
  const time = date && story.date ? `<time datetime="${story.date}">${story.dateLabel}</time>` : '';
  return `<p class="kicker"><span class="dot" aria-hidden="true"></span><span class="cat">${esc(story.categoryLabel)}</span>${time}</p>`;
}

export function card(story) {
  return `<article class="card">
<a class="card-media" href="${esc(story.url)}" tabindex="-1" aria-hidden="true">${frame(story.lead.src, '', 'ratio-3-2')}</a>
${kicker(story)}
<h3 class="card-title"><a href="${esc(story.url)}">${esc(story.title)}</a></h3>
<p class="card-dek">${esc(story.dek)}</p>
</article>`;
}

export function sectionHead(id, title, more) {
  const link = more ? `<a class="more" href="${esc(more.url)}">${esc(more.label)}</a>` : '';
  return `<div class="section-head">
<h2 class="section-title" id="${id}"><span class="dot" aria-hidden="true"></span>${esc(title)}</h2>
${link}
</div>`;
}

export function subscribeBand(config) {
  return `<section class="wrap subscribe" aria-labelledby="subscribe-title">
<div class="split split-end">
<div class="stack">
<h2 class="display h-big" id="subscribe-title">${esc(config.subscribe.headline)}</h2>
<p class="lede">${esc(config.subscribe.text)}</p>
<a class="btn btn-lg" href="${esc(config.subscribe.url)}">Subscribe</a>
</div>
<div class="newsletter">
<h3 class="newsletter-title">Get the newsletter</h3>
<p>${esc(config.newsletter.text)}</p>
<a class="btn btn-outline" href="${esc(config.newsletter.url)}">Sign up</a>
</div>
</div>
</section>`;
}
