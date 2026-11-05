// The story details at the top of every story.md, between the --- lines.
// Field types are checked in validate.mjs. Adding a field here makes it legal;
// templates decide whether it shows up anywhere.

export const STORY_DETAILS = {
  title: { required: true, max: 110, help: 'The headline.' },
  dek: { required: true, max: 240, help: 'One or two sentences that sit under the headline and on cards.' },
  author: { required: true, help: 'Byline, as it should appear: "Jane Doe" or "Jane Doe and Sam Lee".' },
  date: { required: true, type: 'date', help: 'Publish date as YYYY-MM-DD. Newest stories list first.' },
  tags: { type: 'tags', help: 'Comma-separated, lowercase-with-hyphens: mountain-skills, splitboarding. Each tag gets its own page.' },
  lead_photo: { required: true, type: 'image', help: 'File name of the lead photo in the story folder.' },
  lead_alt: { required: true, type: 'alt', help: 'What the lead photo shows, for readers who can’t see it.' },
  lead_caption: { required: true, inline: true, help: 'Caption under the lead photo.' },
  lead_credit: { help: 'Photographer’s name.' },
  featured: { type: 'bool', help: 'true puts the story in the homepage lead spot. The newest featured story wins.' },
  draft: { type: 'bool', help: 'true keeps the story off the live site. It still shows in the preview.' },
  custom: { type: 'bool', help: 'true uses a hand-built page.html in the story folder instead of the story template.' },
};
