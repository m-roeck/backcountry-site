// The building blocks a story body can use, besides paragraphs and ## subheads.
//
// This file is the "bounds" of the template. Each block lists its fields (which
// the validator checks) and how it renders. To give stories a new capability,
// add one entry here plus its CSS in src/assets/site.css. Every story can then use it.
//
// Field options:
//   required  the block is rejected without it
//   repeat    the field may appear more than once (collected into a list)
//   min       with repeat: the fewest times it must appear
//   type      text (default), image, alt, enum, pair, photo-pair, url, video
//   inline    allows *italic*, **bold** and [links](url), and links get checked
//   max       a length warning, not an error

import { esc, inline } from './text.mjs';

export const splitPair = (value) => {
  const at = value.indexOf('|');
  return at === -1 ? [value.trim(), ''] : [value.slice(0, at).trim(), value.slice(at + 1).trim()];
};

/** YouTube or Vimeo page URL -> privacy-friendly embed URL, or null. */
export function videoEmbed(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^(www|m)\./, '');
  const id = (s) => (s && /^[\w-]{6,}$/.test(s) ? s : null);
  if (host === 'youtube.com') {
    const v = id(u.searchParams.get('v')) ?? id(u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1]);
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === 'youtu.be') {
    const v = id(u.pathname.slice(1));
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = u.pathname.match(/(?:^|\/)(\d{5,})(?:$|\/)/)?.[1];
    return v ? `https://player.vimeo.com/video/${v}` : null;
  }
  return null;
}

function figcaption(caption, credit) {
  if (!caption && !credit) return '';
  const creditHtml = credit ? ` <span class="credit">Photo: ${esc(credit)}</span>` : '';
  return `<figcaption>${inline(caption ?? '')}${creditHtml}</figcaption>`;
}

export const BLOCKS = {
  photo: {
    help: 'One photo. Sits in the reading column unless size is wide or full.',
    fields: {
      src: { required: true, type: 'image', help: 'File name in the story folder.' },
      alt: { required: true, type: 'alt', help: 'What the photo shows, for readers who can’t see it.' },
      caption: { required: true, inline: true, help: 'Caption under the photo.' },
      credit: { help: 'Photographer’s name.' },
      size: { type: 'enum', options: ['column', 'wide', 'full'], help: 'Where the photo sits. Default is column; full runs edge to edge.' },
    },
    render(f, { img }) {
      const size = f.size && f.size !== 'column' ? ` ${f.size}` : '';
      return `<figure class="figure${size}">
<div class="frame"><img src="${esc(img(f.src))}" alt="${esc(f.alt)}" loading="lazy" decoding="async"></div>
${figcaption(f.caption, f.credit)}
</figure>`;
    },
  },

  gallery: {
    help: 'Two or more photos in a grid with one shared caption.',
    fields: {
      photo: { required: true, repeat: true, min: 2, type: 'photo-pair', help: 'One per photo: file name | alt text.' },
      caption: { inline: true, help: 'Shared caption.' },
      credit: { help: 'Photographer’s name.' },
    },
    render(f, { img }) {
      const photos = f.photo
        .map((p) => {
          const [src, alt] = splitPair(p);
          return `<div class="frame"><img src="${esc(img(src))}" alt="${esc(alt)}" loading="lazy" decoding="async"></div>`;
        })
        .join('\n');
      return `<figure class="gallery wide">
<div class="gallery-grid">
${photos}
</div>
${figcaption(f.caption, f.credit)}
</figure>`;
    },
  },

  pullquote: {
    help: 'One strong line from the story, set large.',
    fields: {
      text: { required: true, max: 200, help: 'The quote, without quotation marks.' },
      attribution: { help: 'Who said it, if it’s a quote from a person.' },
    },
    render(f) {
      const cite = f.attribution ? `\n<cite>${esc(f.attribution)}</cite>` : '';
      return `<blockquote class="pullquote wide">
<p>${esc(f.text)}</p>${cite}
</blockquote>`;
    },
  },

  gear: {
    help: 'A spec box for a product in a gear review.',
    fields: {
      name: { required: true, help: 'Product name.' },
      price: { help: 'Retail price, like $899.' },
      spec: { repeat: true, type: 'pair', help: 'One per spec: label | value, like Weight | 1,050 g.' },
      pro: { repeat: true, help: 'One per pro.' },
      con: { repeat: true, help: 'One per con.' },
      verdict: { required: true, inline: true, max: 400, help: 'The bottom line, in a sentence or two.' },
      link: { type: 'url', help: 'Where to buy or learn more (https://...).' },
    },
    render(f) {
      const price = f.price ? `\n<p class="gearbox-price">${esc(f.price)}</p>` : '';
      const specs = f.spec?.length
        ? `\n<dl class="specs">${f.spec
            .map((s) => {
              const [label, value] = splitPair(s);
              return `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
            })
            .join('')}</dl>`
        : '';
      const list = (title, items) =>
        items?.length ? `<div><h4>${title}</h4><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
      const pc = f.pro?.length || f.con?.length ? `\n<div class="proscons">${list('Pros', f.pro)}${list('Cons', f.con)}</div>` : '';
      const link = f.link ? `\n<a class="textlink" href="${esc(f.link)}">Learn more</a>` : '';
      return `<aside class="gearbox" aria-label="Specs: ${esc(f.name)}">
<h3 class="gearbox-name">${esc(f.name)}</h3>${price}${specs}${pc}
<p class="verdict"><strong>Verdict</strong>${inline(f.verdict)}</p>${link}
</aside>`;
    },
  },

  video: {
    help: 'An embedded YouTube or Vimeo video.',
    fields: {
      url: { required: true, type: 'video', help: 'The video’s YouTube or Vimeo page address.' },
      title: { required: true, help: 'Video title, read out by screen readers.' },
      caption: { inline: true, help: 'Caption under the video.' },
    },
    render(f) {
      return `<figure class="video wide">
<div class="video-frame"><iframe src="${esc(videoEmbed(f.url))}" title="${esc(f.title)}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
${figcaption(f.caption)}
</figure>`;
    },
  },
};

/** Flattens a parsed block's fields: single fields become strings, repeat fields stay lists. */
export function blockValues(block) {
  const def = BLOCKS[block.type];
  const out = {};
  for (const [key, values] of Object.entries(block.fields)) {
    out[key] = def?.fields[key]?.repeat ? values : values[0];
  }
  return out;
}
