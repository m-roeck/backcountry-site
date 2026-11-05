// The story page. The header, lead photo and spacing are fixed;
// the body is whatever paragraphs, subheads and blocks the story file holds.

import { BLOCKS, blockValues } from '../lib/blocks.mjs';
import { esc, inline } from '../lib/text.mjs';
import { card, frame, kicker, layout, sectionHead, subscribeBand } from './partials.mjs';

export function storyPage({ config, story, related }) {
  const img = (name) => story.url + name;
  const body = story.body
    .map((part) => {
      if (part.kind === 'text') return `<p>${inline(part.text)}</p>`;
      if (part.kind === 'subhead') return `<h2 class="subhead">${inline(part.text)}</h2>`;
      return BLOCKS[part.type].render(blockValues(part), { img, story });
    })
    .join('\n');

  const credit = story.lead.credit ? ` <span class="credit">Photo: ${esc(story.lead.credit)}</span>` : '';
  const tags = story.tags.length
    ? `<footer class="story-tags">
<span class="label">Filed under</span>
<ul>${story.tags.map((t) => `<li><a class="tag" href="${esc(t.url)}">${esc(t.label)}</a></li>`).join('')}</ul>
</footer>`
    : '';
  const more = related.length
    ? `<section class="wrap section" aria-labelledby="related-title">
${sectionHead('related-title', `More ${story.categoryLabel.toLowerCase()}`, { label: `All ${story.categoryLabel.toLowerCase()}`, url: `/${story.category}/` })}
<div class="cards">
${related.map(card).join('\n')}
</div>
</section>`
    : '';
  const banner = story.draft
    ? '\n<div class="draft-banner" role="status">Draft preview. This story isn’t on the live site.</div>'
    : '';

  const html = `<article class="story">
<header class="story-head">
${kicker(story)}
<h1 class="display h-lead">${esc(story.title)}</h1>
<p class="dek">${esc(story.dek)}</p>
<p class="byline">By ${esc(story.author)}</p>
</header>
<figure class="story-lead">
${frame(story.lead.src, story.lead.alt, 'ratio-2-1', { eager: true })}
<figcaption>${inline(story.lead.caption)}${credit}</figcaption>
</figure>
${body}
${tags}
</article>
${more}
${subscribeBand(config)}`;

  return layout({
    config,
    title: story.title,
    description: story.dek,
    path: story.url,
    image: story.lead.src,
    body: html,
    noindex: story.draft,
    banner,
  });
}
