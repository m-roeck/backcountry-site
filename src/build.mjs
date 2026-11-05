// Builds the site:  check every story -> stop on any error -> write every page.
//
//   node src/build.mjs                 production build into dist/
//   node src/build.mjs --check         only check, write nothing
//   node src/build.mjs --drafts        include drafts (used for preview)
//   node src/build.mjs --out=preview   write somewhere other than dist/
//
// Environment variables, for hosting somewhere other than the real domain:
//   BASE_PATH=/backcountry-site   the site lives under a sub-path (GitHub Pages project sites)
//   SITE_URL=https://you.github.io/backcountry-site   used for canonical links, RSS and sitemap
//
// The site is written to a temporary folder and swapped in at the end,
// so a failed or interrupted build never leaves a half-written site behind.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BuildError, byNewest, isDraft, loadSite, toPage } from './lib/site.mjs';
import { IMAGE_EXTENSIONS, validateSite, validateStory } from './lib/validate.mjs';
import { rss, searchIndex, sitemap } from './lib/feeds.mjs';
import { tagLabel } from './lib/text.mjs';
import { homePage } from './templates/home.mjs';
import { storyPage } from './templates/story.mjs';
import { listingPage, notFoundPage, searchPage } from './templates/pages.mjs';

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets');

export function build({ root, out, drafts = false, checkOnly = false, basePath = '', siteUrl = '' }) {
  const site = loadSite(root);
  const { config } = site;
  // For hosting under a sub-path (like a GitHub Pages project site): /stories/ becomes /<base>/stories/.
  const base = basePath.replace(/\/+$/, '');
  if (siteUrl) config.url = siteUrl.replace(/\/+$/, '');
  const included = site.stories.filter((s) => drafts || !isDraft(s));
  const skippedDrafts = site.stories.length - included.length;

  // Every page the site will contain, so links between stories can be checked.
  const categories = Object.keys(config.categories);
  const knownPaths = new Set(['/', '/search/', ...categories.map((c) => `/${c}/`)]);
  for (const s of included) {
    knownPaths.add(s.url);
    for (const tag of (s.meta.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean)) knownPaths.add(`/tag/${tag}/`);
  }
  // Tags the site always has a page for, even before any story uses them (the nav links to them).
  const standingTags = [...new Set([config.home.learnTag, ...Object.keys(config.tags ?? {})].filter(Boolean))];
  for (const tag of standingTags) knownPaths.add(`/tag/${tag}/`);
  const sectionRoots = new Set([...categories.map((c) => `/${c}/`), '/tag/']);

  const problems = [
    ...site.problems,
    ...included.flatMap((s) => [...s.problems, ...validateStory(s, { config, knownPaths, sectionRoots })]),
    ...validateSite(included),
  ];
  const errors = problems.filter((p) => p.level === 'error');
  const result = { ok: errors.length === 0, problems, storyCount: included.length, skippedDrafts, pageCount: 0 };
  if (!result.ok || checkOnly) return result;

  const stories = included.map((s) => toPage(s, config)).sort(byNewest);
  const tmp = `${out}.tmp-${process.pid}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  const pages = new Set();
  const withBase = (html) => (base ? html.replace(/(\s(?:href|src|action|data-index)=")\/(?!\/)/g, `$1${base}/`) : html);
  const writePage = (urlPath, html) => {
    html = withBase(html);
    const file = urlPath.endsWith('.html') ? path.join(tmp, urlPath) : path.join(tmp, urlPath, 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
    if (!urlPath.endsWith('.html')) pages.add(urlPath);
  };
  const writeFile = (name, content) => fs.writeFileSync(path.join(tmp, name), content);

  try {
    fs.mkdirSync(tmp, { recursive: true });
    fs.cpSync(ASSETS, path.join(tmp, 'assets'), { recursive: true });

    // Stories: the page plus its photos. Custom stories copy their own page.html and files.
    for (const story of stories) {
      const dest = path.join(tmp, story.url);
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(story.dir, { withFileTypes: true })) {
        if (!entry.isFile() || entry.name === 'story.md' || entry.name.startsWith('.')) continue;
        if (story.custom || IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
          fs.copyFileSync(path.join(story.dir, entry.name), path.join(dest, entry.name === 'page.html' ? 'index.html' : entry.name));
        }
      }
      if (story.custom) {
        pages.add(story.url);
        continue;
      }
      const related = stories.filter((s) => s !== story && s.category === story.category && !s.draft).slice(0, 3);
      writePage(story.url, storyPage({ config, story, related }));
    }

    // Section pages and tag pages, paginated.
    const listing = (title, intro, listPath, list) => {
      const pageCount = Math.max(1, Math.ceil(list.length / config.perPage));
      for (let page = 1; page <= pageCount; page++) {
        const slice = list.slice((page - 1) * config.perPage, page * config.perPage);
        const html = listingPage({ config, title, intro, basePath: listPath, stories: slice, page, pageCount });
        writePage(page === 1 ? listPath : `${listPath}page/${page}/`, html);
      }
    };
    for (const [category, info] of Object.entries(config.categories)) {
      listing(info.title, info.intro, `/${category}/`, stories.filter((s) => s.category === category));
    }
    const tags = new Map();
    for (const slug of standingTags) tags.set(slug, tagLabel(slug, config));
    for (const s of stories) for (const t of s.tags) tags.set(t.slug, t.label);
    for (const [slug, label] of tags) {
      listing(label, '', `/tag/${slug}/`, stories.filter((s) => s.tagSlugs.includes(slug)));
    }

    writePage('/', homePage({ config, data: site.data, stories }));
    writePage('/search/', searchPage({ config }));
    writePage('/404.html', notFoundPage({ config }));

    const live = stories.filter((s) => !s.draft);
    writeFile('feed.xml', rss(config, live));
    writeFile('sitemap.xml', sitemap(config, [...pages].filter((p) => p !== '/search/' && !stories.some((s) => s.draft && s.url === p))));
    writeFile('search.json', searchIndex(stories, base));
    writeFile('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${config.url}/sitemap.xml\n`);
    // Keeps the old WordPress feed address working (Cloudflare Pages and Netlify read this file).
    if (!base) writeFile('_redirects', '/feed /feed.xml 301\n/feed/ /feed.xml 301\n');

    fs.rmSync(out, { recursive: true, force: true });
    fs.renameSync(tmp, out);
  } catch (e) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw e;
  }
  result.pageCount = pages.size;
  return result;
}

export function formatProblems(problems) {
  const byFile = new Map();
  for (const p of problems) {
    if (!byFile.has(p.file)) byFile.set(p.file, []);
    byFile.get(p.file).push(p);
  }
  const lines = [];
  for (const [file, list] of byFile) {
    lines.push(`\n  ${file}`);
    for (const p of list.sort((a, b) => a.line - b.line)) {
      const where = p.line ? `line ${p.line}`.padEnd(9) : ''.padEnd(9);
      lines.push(`    ${where}${p.level === 'error' ? 'ERROR  ' : 'warning'}  ${p.message}`);
    }
  }
  return lines.join('\n');
}

// ---- command line ----
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const root = process.cwd();
  const outArg = args.find((a) => a.startsWith('--out='))?.slice(6) || 'dist';
  const options = {
    root,
    out: path.resolve(root, outArg),
    drafts: args.includes('--drafts'),
    checkOnly: args.includes('--check'),
    basePath: process.env.BASE_PATH || '',
    siteUrl: process.env.SITE_URL || '',
  };
  const started = Date.now();
  try {
    const r = build(options);
    if (r.problems.length) console.log(formatProblems(r.problems) + '\n');
    const errorCount = r.problems.filter((p) => p.level === 'error').length;
    const drafts = r.skippedDrafts ? ` (${r.skippedDrafts} draft${r.skippedDrafts === 1 ? '' : 's'} left out)` : '';
    if (errorCount) {
      console.log(`✖ ${errorCount} ${errorCount === 1 ? 'problem' : 'problems'} to fix. Nothing was published.`);
      process.exitCode = 1;
    } else if (options.checkOnly) {
      const ready = options.drafts ? 'No errors. Drafts can go live once their warnings are cleared.' : 'Ready to publish.';
      console.log(`✔ ${r.storyCount} ${r.storyCount === 1 ? 'story' : 'stories'} checked${drafts}. ${ready}`);
    } else {
      console.log(`✔ Built ${r.storyCount} ${r.storyCount === 1 ? 'story' : 'stories'}${drafts} into ${outArg}/: ${r.pageCount} pages in ${Date.now() - started} ms.`);
    }
  } catch (e) {
    if (!(e instanceof BuildError)) throw e;
    console.log(`✖ ${e.message} Nothing was published.`);
    process.exitCode = 1;
  }
}
