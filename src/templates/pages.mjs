// Section pages (Stories, Gear), tag pages, search and 404.

import { esc } from '../lib/text.mjs';
import { card, icons, layout } from './partials.mjs';

/** One page of a paginated listing. basePath is like /stories/ or /tag/mountain-skills/. */
export function listingPage({ config, title, intro, basePath, stories, page, pageCount }) {
  const path = page === 1 ? basePath : `${basePath}page/${page}/`;
  const pageUrl = (n) => (n === 1 ? basePath : `${basePath}page/${n}/`);
  const pager =
    pageCount > 1
      ? `<nav class="pager" aria-label="Pages">
${page > 1 ? `<a class="btn btn-outline" href="${pageUrl(page - 1)}" rel="prev">Newer</a>` : '<span></span>'}
<span class="label">Page ${page} of ${pageCount}</span>
${page < pageCount ? `<a class="btn btn-outline" href="${pageUrl(page + 1)}" rel="next">Older</a>` : '<span></span>'}
</nav>`
      : '';
  const list = stories.length
    ? `<div class="cards">\n${stories.map(card).join('\n')}\n</div>`
    : '<p class="lede">Nothing here yet.</p>';

  const body = `<section class="wrap listing">
<header class="listing-head">
<h1 class="display h-section">${esc(title)}</h1>
${intro ? `<p class="lede">${esc(intro)}</p>` : ''}
</header>
${list}
${pager}
</section>`;
  return layout({ config, title: page === 1 ? title : `${title}, page ${page}`, path, body });
}

export function searchPage({ config }) {
  const body = `<section class="wrap listing">
<header class="listing-head">
<h1 class="display h-section">Search</h1>
</header>
<form class="search-form" role="search" action="/search/">
<label class="label" for="q">Search stories and gear reviews</label>
<div class="search-row">
<input class="field" id="q" name="q" type="search" autocomplete="off">
<button class="icon-btn icon-btn-lg" type="submit" aria-label="Search">${icons.search}</button>
</div>
</form>
<p class="search-status" id="status" aria-live="polite"></p>
<ol class="results" id="results"></ol>
<noscript><p class="lede">Search needs JavaScript. You can browse <a href="/stories/">all stories</a> instead.</p></noscript>
</section>
<script src="/assets/search.js" data-index="/search.json" defer></script>`;
  return layout({ config, title: 'Search', path: '/search/', body, noindex: true });
}

export function notFoundPage({ config }) {
  const body = `<section class="wrap listing">
<header class="listing-head">
<h1 class="display h-section">This page isn’t here</h1>
<p class="lede">It may have moved or never existed. Try <a class="inline-link" href="/search/">searching</a> or head back to the <a class="inline-link" href="/">homepage</a>.</p>
</header>
</section>`;
  return layout({ config, title: 'Page not found', path: '/404.html', body, noindex: true });
}
