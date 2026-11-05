# Backcountry site

Backcountry Magazine as a static site. Story files go in and plain HTML comes out. There's no WordPress, no database, and no dependencies to install beyond Node.js 20 or newer.

## How it works

1. **The template is locked.** Header, footer, fonts, colors and page layouts live in `src/`.
   - Changing one template file changes every page.
   - Stories can't add their own styling, so the site can't drift.
2. **Stories are flexible within bounds.** Each story is a folder holding a `story.md` file and its photos.
   - The body is paragraphs and `##` subheads, plus a fixed set of blocks: photo, gallery, pullquote, gear, video.
   - `src/lib/blocks.mjs` defines those blocks. Adding one entry there, plus its CSS, gives every story a new capability.
3. **The build is mechanical.** Every build:
   - checks every story;
   - stops if anything is wrong;
   - otherwise regenerates every page, section listing, tag page, the homepage, RSS feed, sitemap and search index.

   Nothing is ever linked by hand.

## Commands

```
npm run check     Check every published story. Writes nothing.
npm run build     Check, then build the live site into dist/.
npm run preview   Build including drafts into preview/ and serve it at http://localhost:8080
npm run blocks    Print the story format: every detail field and block, with help text.
npm test          Run the tests.
```

Add `-- --drafts` to `check` to include drafts.

## What the build checks

**Errors** stop the build, and nothing is published:

- **Required details:** missing headline, dek, byline, date or lead photo, and dates that aren't real dates.
- **Photos:** photos that aren't in the story folder, and missing or meaningless alt text ("photo", "IMG_2041.jpg").
- **Captions:** missing captions on the lead photo and photo blocks.
- **Typos:** unknown detail names, block types or block fields, with a "Did you mean…?" suggestion.
- **Unclosed blocks** and malformed lines.
- **Links:** links to stories, sections or tags that don't exist, and links that aren't web addresses.
- **Video links** that aren't YouTube or Vimeo.
- **Placeholders** like `[PRICE]` left in a story that isn't a draft.

**Warnings** are reported but don't block:

- photos over 2 MB;
- headlines, deks and pull quotes that run long;
- placeholders in drafts;
- links to site pages this build doesn't make yet;
- more than one featured story.

The build writes to a temporary folder and swaps it in only at the end. A failed build leaves the previous site exactly as it was.

## Folder layout

```
site.config.json       Site name, sections, nav, footer, subscribe text, homepage rules
data/home.json         Gear Guide promo, Uphill guide tile, film series
data/podcast.json      Podcast episodes for the homepage
content/<section>/<slug>/
    story.md           The story file
    *.jpg              Its photos
    page.html          Only for custom feature pages (custom: true)
src/build.mjs          The build
src/lib/               Parser, validator, block definitions, feeds
src/templates/         Page templates
src/assets/            site.css, search.js
CLAUDE.md              How Claude works with editors in this repo
.github/workflows/     Checks every push; publishes the GitHub Pages demo
```

A story's folder decides its address. `content/gear/the-updated-dynafit-mezzalama-reviewed/` becomes `/gear/the-updated-dynafit-mezzalama-reviewed/`, which is the same address it has on the WordPress site today.

## Hosting

Works on any static host. On Cloudflare Pages or Netlify:

- build command: `npm run build`
- output folder: `dist`
- Node version: 20 or newer

The build writes a `_redirects` file that keeps the old `/feed/` address working.

### Demo on GitHub Pages

`.github/workflows/pages.yml` publishes a demo of the site to GitHub Pages.

- **One-time setup:** in the repo, go to Settings → Pages and set Source to "GitHub Actions".
- **On every push to `main`,** it runs the tests, checks every story, builds the site and publishes it at `https://<account>.github.io/<repo>/`.
- **Pull requests** run the same checks without publishing.
- **Failed checks:** if a story fails, the run turns red and the published demo stays as it was.

Pages serves project sites under a sub-path, so the workflow sets `BASE_PATH` and `SITE_URL`, and the build prefixes every internal link to match. One exception: custom `page.html` files are copied untouched, so their own links need the prefix written in.

## Not done yet

- **WordPress importer.** A script to pull every post through the WordPress REST API (`/wp-json/wp/v2/posts`), write story folders, download photos and keep every slug.
- **Image resizing.** Photos are served exactly as uploaded, and the build warns over 2 MB. Next step: generate sized versions at build time or use the host's image service.
- **Pages still on WordPress.** The podcast, videos, subscribe, account, Basecamp and store pages aren't built here yet. The nav and footer link to the live pages.
- **Ad placements.** These aren't designed yet.
- **Newsletter.** The button links to the existing signup page. A form can embed the provider's own form later.
- **Search** uses a small index of titles, deks and tags, which is fine for thousands of stories. For full-text search, swap in Pagefind.
- **Fonts** load from Google Fonts. They can be self-hosted later.
