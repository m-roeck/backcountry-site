# Working on the Backcountry site with an editor

You're helping an editor publish to the Backcountry Magazine website. Editors aren't developers. They bring drafts, photos and requests in plain English. You turn those into story files, show them a preview, and publish when they approve.

## The one rule that keeps the site consistent

Stories live in `content/`. The template lives in `src/` and `site.config.json`.

When you're working on a story, only touch that story's folder. Never edit `src/`, `site.config.json` or another story's files to make one story look a particular way.

If a story needs something the blocks can't do, say so plainly and offer two options:

1. **A new block.** This is a template change that every future story can use. The web lead approves it.
2. **A custom page.** Use this for a one-off feature. Set `custom: true` and hand-build `page.html` in the story's folder (see "Custom feature pages").

## Filing a new story

1. **Check the format.** Run `npm run blocks` to see the current story format. It prints straight from the code, so it's always accurate.
2. **Make the folder:** `content/<section>/<slug>/`.
   - Sections are listed in `site.config.json`. Right now they're `stories` and `gear`.
   - The slug becomes the page address. Make it short, lowercase, hyphenated, and taken from the headline.
   - Never change the slug of a published story.
   - Stories migrated from WordPress keep their exact old slug.
3. **Add the photos.** Copy them into the folder with simple lowercase names (`lead.jpg`, `ridge.jpg`).
   - Ask the editor for captions and photo credits.
   - You can draft alt text from looking at a photo, but have the editor confirm it.
4. **Write `story.md`.**
   - Keep the editor's words, and edit only what they ask you to.
   - Use typographic punctuation: ’ “ ” and —.
5. **Never invent facts.** That includes names, dates, prices, specs, credits and quotes.
   - When something is missing, put an ALL-CAPS placeholder like `[PRICE]` and add `draft: true`.
   - The build refuses to publish a story that still has placeholders.
6. **Check the draft.** Run `npm run check -- --drafts` and fix every ERROR.
7. **Preview.** Run `npm run preview`, give the editor the address it prints, and walk them through the page.
8. **Publish on approval.** Remove `draft: true` only when the editor explicitly approves.
   - Run `npm run check` with no drafts flag. It must say "Ready to publish."
   - Then publish the way the team has set up, usually by committing and pushing to the main branch. The host rebuilds the site.

## Editing a published story

- Change only what's asked.
- Don't touch the slug or date unless the editor asks you to.
- Run the check and the preview before publishing, same as a new story.

## Homepage and other content

- **Lead story:** `featured: true` in a story's details. The newest featured story leads the homepage.
- **Promos, podcast and Uphill guide:** the Gear Guide promo, film series and Uphill Travel Guide tile live in `data/home.json`. Podcast episodes live in `data/podcast.json`. Edit these when an editor asks.
- **Site-wide settings:** nav, footer, subscribe text and the issue number live in `site.config.json`. Those change every page, so confirm the editor means a site-wide change first.

## Custom feature pages

For a showcase piece, build a complete standalone `page.html` in the story folder and set `custom: true`. The story details (title, dek, lead photo) are still required, because cards and listings use them.

The page is published exactly as written. It should:

- reuse `/assets/site.css` and the site header and footer markup, so it still feels like the site;
- keep every image and script in the story folder;
- load nothing from third-party sites unless the web lead has approved it.

## Hand these to the web lead instead of doing them

- Design changes, new blocks, new page types, ad placements.
- Anything in `src/`.
- Hosting, domain and deploy settings.
