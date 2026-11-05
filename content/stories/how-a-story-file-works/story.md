---
title: How a Story File Works
dek: A tour of the building blocks every story is made from, written as a story so you can see each one on the page.
author: The web desk
date: 2026-11-04
tags: site-guide
lead_photo: lead.jpg
lead_alt: Grey placeholder image marking where a wide lead photo goes.
lead_caption: The lead photo runs wide under the headline. Every story needs one, with a caption and alt text.
lead_credit: Placeholder
---

Every story on the site starts as one plain-text file like this one. The top of the file holds the details that appear around the story: headline, dek, byline, date, tags and lead photo. Everything below that is the story itself.

Body text is just paragraphs separated by blank lines. You can use *italics*, **bold** and [links to other pages](/gear/). Links to pages on this site are checked on every build, so a typo in a link stops the publish instead of shipping a dead end.

## Subheads break up long stories

A line that starts with two pound signs becomes a subhead. It’s the only heading level the body allows, which keeps every story’s structure consistent.

::: photo
src: photo.jpg
alt: Grey placeholder image marking where an inline photo goes.
caption: A photo sits in the reading column by default. Set size to wide or full when a photo deserves more room.
credit: Placeholder
size: wide
:::

Photos, galleries, pull quotes, gear spec boxes and videos are all blocks. Each one opens with three colons and its name, lists its fields one per line, and closes with three colons on their own line.

::: pullquote
text: Pull quotes lift one strong line out of the story and give it room to breathe.
:::

Galleries hold two or more photos, each with its own alt text, and share one caption.

::: gallery
photo: gallery-1.jpg | Grey placeholder image, the first of two gallery photos.
photo: gallery-2.jpg | Grey placeholder image, the second of two gallery photos.
caption: One caption covers the whole gallery.
:::

Gear reviews get a spec box, so readers can find the numbers without hunting through the text.

::: gear
name: Spec box
spec: Weight | Goes here
spec: Price | Goes here
spec: Best for | Goes here
pro: Pros are a short list
con: So are cons
verdict: The verdict closes the box in a sentence or two.
:::

When the file is ready, the build checks it. If anything is missing or broken, like a caption, alt text or a link, it says exactly what and on which line, and nothing goes live until it’s fixed.
