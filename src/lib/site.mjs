// Reads site.config.json, the data/ files and every story folder under content/.

import fs from 'node:fs';
import path from 'node:path';
import { parseStory } from './parse.mjs';
import { formatDate, parseDate, tagLabel } from './text.mjs';

export class BuildError extends Error {}

function readJson(root, rel) {
  const file = path.join(root, rel);
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    throw new BuildError(`${rel} is missing.`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new BuildError(`${rel} isn't valid JSON: ${e.message}`);
  }
}

export function loadSite(root) {
  const config = readJson(root, 'site.config.json');
  const data = { home: readJson(root, 'data/home.json'), podcast: readJson(root, 'data/podcast.json') };
  const problems = [];
  const stories = [];
  const contentDir = path.join(root, 'content');
  const categories = Object.keys(config.categories);

  for (const entry of fs.existsSync(contentDir) ? fs.readdirSync(contentDir, { withFileTypes: true }) : []) {
    if (entry.isDirectory() && !categories.includes(entry.name)) {
      problems.push({
        file: `content/${entry.name}/`,
        line: 0,
        level: 'error',
        message: `"${entry.name}" isn't a section of the site. Story folders go inside one of: ${categories.join(', ')}.`,
      });
    }
  }

  for (const category of categories) {
    const categoryDir = path.join(contentDir, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const entry of fs.readdirSync(categoryDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(categoryDir, entry.name);
      const file = path.relative(root, path.join(dir, 'story.md'));
      if (!fs.existsSync(path.join(dir, 'story.md'))) {
        problems.push({ file: path.relative(root, dir) + '/', line: 0, level: 'error', message: 'This story folder has no story.md file.' });
        continue;
      }
      const parsed = parseStory(fs.readFileSync(path.join(dir, 'story.md'), 'utf8'), file);
      stories.push({ ...parsed, file, dir, category, slug: entry.name, url: `/${category}/${entry.name}/` });
    }
  }
  return { config, data, stories, problems };
}

export const isDraft = (story) => story.meta.draft === 'true';

/** The shape templates use. Only called on stories that passed validation. */
export function toPage(story, config) {
  const m = story.meta;
  const tags = (m.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  return {
    ...story,
    title: m.title,
    dek: m.dek,
    author: m.author,
    date: parseDate(m.date) ? m.date : '',
    dateLabel: formatDate(m.date),
    tags: tags.map((slug) => ({ slug, label: tagLabel(slug, config), url: `/tag/${slug}/` })),
    tagSlugs: tags,
    lead: { src: story.url + m.lead_photo, alt: m.lead_alt, caption: m.lead_caption, credit: m.lead_credit },
    featured: m.featured === 'true',
    draft: m.draft === 'true',
    custom: m.custom === 'true',
    categoryLabel: config.categories[story.category].label,
  };
}

/** Newest first; undated drafts sink to the bottom. */
export const byNewest = (a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title);
