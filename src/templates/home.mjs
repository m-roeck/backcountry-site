// The homepage. Every section fills itself from published stories or data/ files,
// and a section with nothing to show is left out rather than drawn empty.

import { esc, inline } from '../lib/text.mjs';
import { card, frame, icons, kicker, layout, sectionHead, subscribeBand } from './partials.mjs';

export function homePage({ config, data, stories }) {
  const lead = stories.find((s) => s.featured) ?? stories[0];
  const rest = stories.filter((s) => s !== lead);
  const latest = rest.slice(0, config.home.latestCount);
  const gear = rest.filter((s) => s.category === 'gear').slice(0, config.home.gearCount);
  const learn = rest.filter((s) => s.tagSlugs.includes(config.home.learnTag)).slice(0, config.home.learnCount);

  const body = [
    lead && leadSection(lead),
    latest.length && latestSection(latest),
    promoSection(data.home.promo),
    gear.length && gearSection(gear),
    learnSection(config, data.home.learn, learn),
    nightSection(data.podcast, data.home.films),
    subscribeBand(config),
  ]
    .filter(Boolean)
    .join('\n\n');

  return layout({ config, title: '', path: '/', image: lead?.lead.src, body });
}

function leadSection(s) {
  return `<section class="wrap lead" aria-labelledby="lead-title">
<figure class="lead-figure">
${frame(s.lead.src, s.lead.alt, 'ratio-2-1', { eager: true })}
<figcaption class="caption">${inline(s.lead.caption)}</figcaption>
</figure>
<div class="split split-end lead-text">
<div class="stack">
${kicker(s)}
<h1 class="display h-lead" id="lead-title"><a href="${esc(s.url)}">${esc(s.title)}</a></h1>
</div>
<div class="stack">
<p class="dek">${esc(s.dek)}</p>
<a class="textlink" href="${esc(s.url)}">Read the story ${icons.arrow}</a>
</div>
</div>
</section>`;
}

function latestSection(stories) {
  return `<section class="wrap section" aria-labelledby="latest-title">
${sectionHead('latest-title', 'Latest', { label: 'All stories', url: '/stories/' })}
<div class="cards">
${stories.map(card).join('\n')}
</div>
</section>`;
}

function promoSection(p) {
  if (!p) return '';
  const cover = p.cover
    ? `<img class="promo-cover" src="${esc(p.cover)}" alt="${esc(p.coverAlt)}" loading="lazy">`
    : '<div class="promo-cover" aria-hidden="true"></div>';
  const buttons = p.buttons
    .map((b, i) => `<a class="btn btn-lg${i ? ' btn-outline' : ''}" href="${esc(b.url)}">${esc(b.label)}</a>`)
    .join('\n');
  return `<section class="wrap section" aria-labelledby="promo-title">
<div class="promo">
${cover}
<div class="stack">
<p class="kicker"><span class="dot" aria-hidden="true"></span><span class="cat">${esc(p.label)}</span></p>
<h2 class="display h-section" id="promo-title">${esc(p.title)}</h2>
<p class="lede">${esc(p.text)}</p>
<div class="btn-row">
${buttons}
</div>
</div>
</div>
</section>`;
}

function gearSection(stories) {
  const rows = stories
    .map(
      (s) => `<a class="index-row" href="${esc(s.url)}">
<span><strong>${esc(s.title)}</strong><span class="sub">${esc(s.dek)}</span></span>
${icons.arrow}
</a>`,
    )
    .join('\n');
  return `<section class="wrap section" aria-labelledby="gear-title">
${sectionHead('gear-title', 'Gear reviews', { label: 'All gear', url: '/gear/' })}
<div class="index">
${rows}
</div>
</section>`;
}

function learnSection(config, learnData, stories) {
  const [feature, ...more] = stories;
  const tool = learnData?.tool;
  const links = [
    ...more.map((s) => ({ label: s.title, url: s.url })),
    ...(learnData?.links ?? []),
  ];
  if (!feature && !tool && !links.length) return '';

  const featureHtml = feature
    ? `<article class="card card-big">
<a class="card-media" href="${esc(feature.url)}" tabindex="-1" aria-hidden="true">${frame(feature.lead.src, '', 'ratio-3-2')}</a>
<h3 class="card-title"><a href="${esc(feature.url)}">${esc(feature.title)}</a></h3>
<p class="card-dek">${esc(feature.dek)}</p>
</article>`
    : '';
  const toolHtml = tool
    ? `<div class="tool">
<span class="label">${esc(tool.label)}</span>
<h3 class="tool-title">${esc(tool.title)}</h3>
<p>${esc(tool.text)}</p>
<a class="textlink textlink-plain" href="${esc(tool.url)}">${esc(tool.linkLabel)} ${icons.arrow}</a>
</div>`
    : '';
  const linkHtml = links.length
    ? `<div class="linklist">
${links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}<span aria-hidden="true">${icons.arrow}</span></a>`).join('\n')}
</div>`
    : '';

  return `<section class="wrap section" aria-labelledby="learn-title">
${sectionHead('learn-title', 'Learn: Mountain skills', { label: 'All skills', url: `/tag/${config.home.learnTag}/` })}
<div class="split">
${featureHtml}
<div class="stack stack-lg">
${toolHtml}
${linkHtml}
</div>
</div>
</section>`;
}

function nightSection(podcast, films) {
  const episodes = (podcast?.episodes ?? [])
    .map(
      (e) => `<a class="episode" href="${esc(e.url)}">
<span class="play">${icons.play}</span>
<span class="episode-text"><span class="episode-num">Ep. ${esc(e.number)}</span><span class="episode-title">${esc(e.title)}</span><span class="episode-sub">${esc(e.summary)}</span></span>
</a>`,
    )
    .join('\n');
  const filmRows = (films?.items ?? [])
    .map(
      (f) => `<a class="film" href="${esc(f.url)}">
<span class="thumb">${f.thumb ? `<img src="${esc(f.thumb)}" alt="" loading="lazy">` : ''}</span>
<span>${esc(f.title)}</span>
</a>`,
    )
    .join('\n');
  if (!episodes && !filmRows) return '';

  return `<section class="night" aria-label="Listen and watch">
<div class="wrap split night-grid">
${
  episodes
    ? `<div class="stack">
<span class="label">Listen</span>
<h2 class="display h-night">${esc(podcast.title)}</h2>
<p class="lede">${esc(podcast.text)}</p>
<div class="rows">
${episodes}
</div>
<a class="more" href="${esc(podcast.url)}">All episodes</a>
</div>`
    : ''
}
${
  filmRows
    ? `<div class="stack">
<span class="label">Watch</span>
<h2 class="display h-night">${esc(films.title)}</h2>
<p class="lede">${esc(films.text)}</p>
<div class="rows">
${filmRows}
</div>
<a class="more" href="${esc(films.url)}">All films</a>
</div>`
    : ''
}
</div>
</section>`;
}
