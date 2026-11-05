// Run with: npm test
// Each test builds a tiny throwaway site, so the real content/ folder is never touched.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/build.mjs';
import { inline } from '../src/lib/text.mjs';
import { videoEmbed } from '../src/lib/blocks.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const GOOD = `---
title: Skinning at Dawn
dek: An early start on a cold ridge.
author: Sam Lee
date: 2026-11-01
tags: mountain-skills
lead_photo: lead.jpg
lead_alt: Two skiers climb a ridge in pink morning light.
lead_caption: First light on the ridge.
---

The alarm went off at four.
`;

function makeSite(stories) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-site-'));
  fs.copyFileSync(path.join(REPO, 'site.config.json'), path.join(root, 'site.config.json'));
  fs.cpSync(path.join(REPO, 'data'), path.join(root, 'data'), { recursive: true });
  for (const [where, files] of Object.entries(stories)) {
    const dir = path.join(root, 'content', where);
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  }
  return { root, out: path.join(root, 'dist') };
}

const errorsOf = (result) => result.problems.filter((p) => p.level === 'error');
const run = (stories, options = {}) => {
  const site = makeSite(stories);
  return { ...site, result: build({ ...site, ...options }) };
};

test('story text can never inject HTML or script links', () => {
  assert.equal(inline('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  const unsafe = inline('[click](javascript:alert(1))');
  assert.ok(!unsafe.includes('<a') && !unsafe.includes('javascript'), unsafe);
  assert.equal(inline('*fresh* and **deep** [snow](/stories/)'), '<em>fresh</em> and <strong>deep</strong> <a href="/stories/">snow</a>');
});

test('a good story builds its page, listings, tag page, feed and sitemap', () => {
  const { out, result } = run({ 'stories/skinning-at-dawn': { 'story.md': GOOD, 'lead.jpg': 'x' } });
  assert.equal(errorsOf(result).length, 0);
  const page = fs.readFileSync(path.join(out, 'stories/skinning-at-dawn/index.html'), 'utf8');
  assert.match(page, /<h1 class="display h-lead">Skinning at Dawn<\/h1>/);
  assert.ok(fs.existsSync(path.join(out, 'stories/skinning-at-dawn/lead.jpg')));
  assert.match(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), /Skinning at Dawn/);
  assert.match(fs.readFileSync(path.join(out, 'tag/mountain-skills/index.html'), 'utf8'), /Skinning at Dawn/);
  assert.match(fs.readFileSync(path.join(out, 'feed.xml'), 'utf8'), /skinning-at-dawn/);
  assert.match(fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8'), /skinning-at-dawn/);
});

test('missing alt text stops the build, names the line, and leaves the live site untouched', () => {
  const story = GOOD.replace('lead_alt: Two skiers climb a ridge in pink morning light.\n', '').replace(
    'The alarm went off at four.',
    'The alarm went off at four.\n\n::: photo\nsrc: lead.jpg\nalt: photo\ncaption: Ridge.\n:::',
  );
  const site = makeSite({ 'stories/skinning-at-dawn': { 'story.md': story, 'lead.jpg': 'x' } });
  fs.mkdirSync(site.out);
  fs.writeFileSync(path.join(site.out, 'index.html'), 'the old site');
  const result = build(site);
  const messages = errorsOf(result).map((p) => `${p.line}: ${p.message}`);
  assert.ok(messages.some((m) => m.includes('missing "lead_alt"')), messages.join('\n'));
  assert.ok(messages.some((m) => m.startsWith('15:') && m.includes('describe what')), messages.join('\n'));
  assert.equal(fs.readFileSync(path.join(site.out, 'index.html'), 'utf8'), 'the old site');
});

test('placeholders block publishing, but drafts are left out of the live build', () => {
  const withPlaceholder = GOOD.replace('author: Sam Lee', 'author: [AUTHOR]');
  assert.ok(errorsOf(run({ 'stories/a-story': { 'story.md': withPlaceholder, 'lead.jpg': 'x' } }).result).some((p) => p.message.includes('[AUTHOR]')));

  const draft = withPlaceholder.replace('---\n\n', 'draft: true\n---\n\n');
  const live = run({ 'stories/a-story': { 'story.md': draft, 'lead.jpg': 'x' } });
  assert.equal(errorsOf(live.result).length, 0);
  assert.ok(!fs.existsSync(path.join(live.out, 'stories/a-story')));

  const preview = run({ 'stories/a-story': { 'story.md': draft, 'lead.jpg': 'x' } }, { drafts: true });
  assert.equal(errorsOf(preview.result).length, 0);
  assert.ok(preview.result.problems.some((p) => p.level === 'warning' && p.message.includes('[AUTHOR]')));
  assert.match(fs.readFileSync(path.join(preview.out, 'stories/a-story/index.html'), 'utf8'), /Draft preview/);
});

test('typos get a suggestion instead of a silent failure', () => {
  const story = GOOD.replace('The alarm went off at four.', 'The alarm went off at four.\n\n::: photo\nsrc: lead.jpg\nalt: Two skiers on a ridge at dawn.\ncaptoin: Ridge.\n:::\n\n::: galery\n:::').replace('dek:', 'dke:');
  const messages = errorsOf(run({ 'stories/a-story': { 'story.md': story, 'lead.jpg': 'x' } }).result).map((p) => p.message);
  assert.ok(messages.some((m) => m.includes('Did you mean "caption"?')), messages.join('\n'));
  assert.ok(messages.some((m) => m.includes('Did you mean "gallery"?')), messages.join('\n'));
  assert.ok(messages.some((m) => m.includes('Did you mean "dek"?')), messages.join('\n'));
});

test('links to stories that do not exist stop the build', () => {
  const story = GOOD.replace('The alarm went off at four.', 'See [our boot review](/gear/no-such-boot/).');
  const messages = errorsOf(run({ 'stories/a-story': { 'story.md': story, 'lead.jpg': 'x' } }).result).map((p) => p.message);
  assert.ok(messages.some((m) => m.includes("/gear/no-such-boot/, which doesn't exist")), messages.join('\n'));
});

test('missing image files and unclosed blocks are caught', () => {
  const story = GOOD.replace('lead_photo: lead.jpg', 'lead_photo: leed.jpg').replace('The alarm went off at four.', 'Text.\n\n::: pullquote\ntext: Never closed');
  const messages = errorsOf(run({ 'stories/a-story': { 'story.md': story, 'lead.jpg': 'x' } }).result).map((p) => p.message);
  assert.ok(messages.some((m) => m.includes('"leed.jpg" isn\'t in the story folder')), messages.join('\n'));
  assert.ok(messages.some((m) => m.includes('never closed')), messages.join('\n'));
});

test('video links become privacy-friendly embeds; other sites are refused', () => {
  assert.equal(videoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(videoEmbed('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(videoEmbed('https://vimeo.com/123456789'), 'https://player.vimeo.com/video/123456789');
  assert.equal(videoEmbed('https://example.com/video/123'), null);
  assert.equal(videoEmbed('http://youtu.be/dQw4w9WgXcQ'), null);
});

test('custom feature pages are copied as-is and still listed', () => {
  const story = GOOD.replace('---\n\n', 'custom: true\n---\n').replace('The alarm went off at four.\n', '');
  const { out, result } = run({ 'stories/big-feature': { 'story.md': story, 'lead.jpg': 'x', 'page.html': '<h1>Hand built</h1>' } });
  assert.equal(errorsOf(result).length, 0, JSON.stringify(result.problems));
  assert.equal(fs.readFileSync(path.join(out, 'stories/big-feature/index.html'), 'utf8'), '<h1>Hand built</h1>');
  assert.match(fs.readFileSync(path.join(out, 'stories/index.html'), 'utf8'), /Skinning at Dawn/);
});

test('a site hosted under a sub-path gets every internal link and asset prefixed', () => {
  const { out, result } = run(
    { 'stories/skinning-at-dawn': { 'story.md': GOOD.replace('The alarm went off at four.', 'See [all gear](/gear/).'), 'lead.jpg': 'x' } },
    { basePath: '/backcountry-site/', siteUrl: 'https://example.github.io/backcountry-site' },
  );
  assert.equal(errorsOf(result).length, 0);
  const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.match(home, /href="\/backcountry-site\/assets\/site\.css"/);
  assert.match(home, /href="\/backcountry-site\/stories\/skinning-at-dawn\/"/);
  assert.doesNotMatch(home, /\s(href|src)="\/(?!backcountry-site\/|\/)/);
  const story = fs.readFileSync(path.join(out, 'stories/skinning-at-dawn/index.html'), 'utf8');
  assert.match(story, /<a href="\/backcountry-site\/gear\/">all gear<\/a>/);
  assert.match(story, /rel="canonical" href="https:\/\/example\.github\.io\/backcountry-site\/stories\/skinning-at-dawn\/"/);
  assert.match(fs.readFileSync(path.join(out, 'search.json'), 'utf8'), /"u":"\/backcountry-site\/stories\/skinning-at-dawn\/"/);
  assert.match(fs.readFileSync(path.join(out, 'search/index.html'), 'utf8'), /data-index="\/backcountry-site\/search\.json"/);
});
