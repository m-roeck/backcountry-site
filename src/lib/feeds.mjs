// Machine-readable outputs regenerated on every build.

const xml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

export function rss(config, stories) {
  const items = stories
    .filter((s) => s.date)
    .slice(0, 20)
    .map(
      (s) => `<item>
<title>${xml(s.title)}</title>
<link>${xml(config.url + s.url)}</link>
<guid isPermaLink="true">${xml(config.url + s.url)}</guid>
<pubDate>${new Date(`${s.date}T12:00:00Z`).toUTCString()}</pubDate>
<description>${xml(s.dek)}</description>
</item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${xml(config.name)}</title>
<link>${xml(config.url)}/</link>
<description>${xml(config.description)}</description>
<language>en-us</language>
${items}
</channel>
</rss>
`;
}

export function sitemap(config, paths) {
  const urls = [...paths].sort().map((p) => `<url><loc>${xml(config.url + p)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/** Small JSON index for the search page: title, dek, url, section, tags. */
export function searchIndex(stories, base = '') {
  return JSON.stringify(
    stories.map((s) => ({ t: s.title, d: s.dek, u: base + s.url, c: s.categoryLabel, g: s.tags.map((t) => t.label) })),
  );
}
