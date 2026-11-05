// Every check a story must pass before the site builds.
// Errors stop the build (nothing is published). Warnings are reported but don't block.
// Messages are written for editors: say what's wrong and how to fix it.

import fs from 'node:fs';
import path from 'node:path';
import { STORY_DETAILS } from './schema.mjs';
import { BLOCKS, splitPair, videoEmbed } from './blocks.mjs';
import { didYouMean, findLinks, findPlaceholders, isSafeUrl, parseDate, SLUG_RE } from './text.mjs';

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
const MAX_IMAGE_BYTES = 2_000_000;
const GENERIC_ALT = new Set(['photo', 'image', 'picture', 'img', 'pic', 'placeholder', 'lead photo']);

/**
 * @param story  a loaded story (see site.mjs)
 * @param site   { config, knownPaths: Set<string>, sectionRoots: Set<string> }
 */
export function validateStory(story, site) {
  const problems = [];
  const isDraft = story.meta.draft === 'true';
  const add = (level, line, message) => problems.push({ file: story.file, line, level, message });
  const error = (line, message) => add('error', line, message);
  const warn = (line, message) => add('warning', line, message);

  const placeholders = (value, line) => {
    const found = findPlaceholders(value);
    if (!found.length) return false;
    const list = [...new Set(found)].join(', ');
    if (isDraft) warn(line, `Placeholder ${list} still needs filling in before this can be published.`);
    else error(line, `Placeholder ${list} is still in the story. Fill it in, or add "draft: true" to keep the story unpublished.`);
    return true;
  };

  const checkLinks = (value, line) => {
    for (const { text, url } of findLinks(value)) {
      if (!isSafeUrl(url)) {
        error(line, `The link "${text}" goes to "${url}", which isn't a web address. Links start with https://, mailto: or / for pages on this site.`);
        continue;
      }
      if (!url.startsWith('/')) continue;
      const pagePath = url.split(/[?#]/)[0].replace(/\/?$/, '/');
      const section = `/${pagePath.split('/')[1]}/`;
      if (site.knownPaths.has(pagePath)) continue;
      if (site.sectionRoots.has(section)) error(line, `The link "${text}" points to ${url}, which doesn't exist on this site.`);
      else warn(line, `The link "${text}" points to ${url}, a page this site doesn't build yet.`);
    }
  };

  const checkImage = (name, line, label) => {
    if (!/^[\w][\w.-]*$/.test(name) || name.includes('..')) {
      error(line, `${label} should be just a file name in the story folder, like lead.jpg.`);
      return;
    }
    if (!IMAGE_EXTENSIONS.includes(path.extname(name).toLowerCase())) {
      error(line, `${label} "${name}" isn't a supported image. Use ${IMAGE_EXTENSIONS.join(', ')}.`);
      return;
    }
    let stat;
    try {
      stat = fs.statSync(path.join(story.dir, name));
    } catch {
      error(line, `${label} "${name}" isn't in the story folder.`);
      return;
    }
    if (stat.size > MAX_IMAGE_BYTES) {
      warn(line, `"${name}" is ${(stat.size / 1e6).toFixed(1)} MB. Export it at about 2400 px wide so pages load quickly.`);
    }
  };

  const checkAlt = (alt, line, label) => {
    const plain = alt.trim().toLowerCase();
    if (plain.length < 8 || GENERIC_ALT.has(plain) || /\.(jpe?g|png|webp|avif|gif)$/i.test(plain)) {
      error(line, `${label} should describe what's in the photo for readers who can't see it, like "Two skiers skin up a ridge above the fog."`);
    }
  };

  const checkValue = (spec, value, line, label) => {
    if (placeholders(value, line)) return;
    if (spec.max && value.length > spec.max) {
      warn(line, `${label} is ${value.length} characters. Keep it under ${spec.max} so it fits the layout.`);
    }
    if (spec.inline) checkLinks(value, line);
    switch (spec.type) {
      case 'date':
        if (!parseDate(value)) error(line, `${label} must be a real date written YYYY-MM-DD, like 2026-11-04.`);
        break;
      case 'bool':
        if (value !== 'true' && value !== 'false') error(line, `${label} must be true or false.`);
        break;
      case 'tags':
        for (const tag of value.split(',').map((t) => t.trim()).filter(Boolean)) {
          if (!SLUG_RE.test(tag)) error(line, `Tag "${tag}" should be lowercase words joined by hyphens, like mountain-skills.`);
        }
        break;
      case 'image':
        checkImage(value, line, label);
        break;
      case 'alt':
        checkAlt(value, line, label);
        break;
      case 'enum':
        if (!spec.options.includes(value)) error(line, `${label} must be one of: ${spec.options.join(', ')}.${didYouMean(value, spec.options)}`);
        break;
      case 'pair': {
        const [a, b] = splitPair(value);
        if (!a || !b) error(line, `${label} needs two parts separated by |, like "Weight | 1,050 g".`);
        break;
      }
      case 'photo-pair': {
        const [src, alt] = splitPair(value);
        if (!src || !alt) {
          error(line, `${label} needs a file name and alt text separated by |, like "ridge.jpg | Two skiers on a ridge."`);
          break;
        }
        checkImage(src, line, label);
        checkAlt(alt, line, `The alt text for "${src}"`);
        break;
      }
      case 'url':
        if (!/^https?:\/\//.test(value) || !isSafeUrl(value)) error(line, `${label} must be a web address starting with https://.`);
        break;
      case 'video':
        if (!videoEmbed(value)) error(line, `${label} must be a YouTube or Vimeo video page address, like https://www.youtube.com/watch?v=...`);
        break;
      default:
        break;
    }
  };

  // ---- folder ----
  if (!SLUG_RE.test(story.slug)) {
    error(0, `The folder name "${story.slug}" becomes the page address, so it must be lowercase words joined by hyphens.`);
  }

  // ---- story details ----
  const known = Object.keys(STORY_DETAILS);
  for (const [key, value] of Object.entries(story.meta)) {
    const line = story.metaLines[key];
    const spec = STORY_DETAILS[key];
    if (!spec) {
      error(line, `"${key}" isn't a story detail.${didYouMean(key, known)} Allowed: ${known.join(', ')}.`);
      continue;
    }
    if (!value) continue; // reported as missing below if required
    checkValue(spec, value, line, `"${key}"`);
  }
  for (const [key, spec] of Object.entries(STORY_DETAILS)) {
    if (spec.required && !story.meta[key]) {
      error(story.metaLines[key] ?? 1, `The story details are missing "${key}". ${spec.help}`);
    }
  }

  // ---- custom pages ----
  if (story.meta.custom === 'true') {
    if (!fs.existsSync(path.join(story.dir, 'page.html'))) {
      error(story.metaLines.custom, 'This story is marked custom: true, so its folder needs a page.html file.');
    }
    if (story.body.length) warn(story.bodyStartLine, 'Custom stories use page.html, so the body text in story.md is ignored.');
    return problems;
  }

  // ---- body ----
  if (!story.body.some((part) => part.kind === 'text')) {
    error(story.bodyStartLine, 'The story has no body text yet. Add paragraphs below the --- line.');
  }

  const blockTypes = Object.keys(BLOCKS);
  for (const part of story.body) {
    if (part.kind === 'text') {
      if (!placeholders(part.text, part.line)) checkLinks(part.text, part.line);
      continue;
    }
    if (part.kind === 'subhead') {
      if (!placeholders(part.text, part.line) && part.text.length > 90) {
        warn(part.line, `This subhead is ${part.text.length} characters. Subheads read best under 90.`);
      }
      continue;
    }

    const def = BLOCKS[part.type];
    if (!def) {
      error(part.line, `"${part.type}" isn't a block type.${didYouMean(part.type, blockTypes)} Available blocks: ${blockTypes.join(', ')}.`);
      continue;
    }
    const fieldNames = Object.keys(def.fields);
    for (const [key, values] of Object.entries(part.fields)) {
      const lines = part.fieldLines[key];
      const spec = def.fields[key];
      if (!spec) {
        error(lines[0], `The ${part.type} block doesn't have a "${key}" field.${didYouMean(key, fieldNames)} Its fields are: ${fieldNames.join(', ')}.`);
        continue;
      }
      if (!spec.repeat && values.length > 1) {
        error(lines[1], `The ${part.type} block can only have one "${key}".`);
      }
      values.forEach((value, n) => {
        if (!value) error(lines[n], `"${key}" is empty.`);
        else checkValue(spec, value, lines[n], `"${key}"`);
      });
    }
    for (const [key, spec] of Object.entries(def.fields)) {
      const count = part.fields[key]?.length ?? 0;
      if (spec.required && !count) error(part.line, `The ${part.type} block is missing "${key}". ${spec.help}`);
      else if (spec.min && count && count < spec.min) error(part.line, `The ${part.type} block needs at least ${spec.min} "${key}" lines.`);
    }
  }

  return problems;
}

/** Checks that span several stories. */
export function validateSite(stories) {
  const problems = [];
  const featured = stories.filter((s) => s.meta.featured === 'true' && s.meta.draft !== 'true');
  if (featured.length > 1) {
    problems.push({
      file: 'content/',
      line: 0,
      level: 'warning',
      message: `${featured.length} published stories are marked featured: true. Only the newest one leads the homepage.`,
    });
  }
  return problems;
}
