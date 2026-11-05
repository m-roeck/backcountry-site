// Turns a story.md file into { meta, body, problems }, keeping line numbers
// so every validation message can point at the exact line to fix.
//
// File shape:
//
//   ---
//   title: Headline
//   dek: One or two sentences
//   ---
//
//   Paragraphs separated by blank lines.
//
//   ## A subhead
//
//   ::: photo
//   src: photo.jpg
//   alt: What the photo shows
//   caption: The caption
//   :::

const FIELD_RE = /^([a-z][a-z_]*):\s*(.*)$/;

export function parseStory(source, file) {
  const problems = [];
  const error = (line, message) => problems.push({ file, line, level: 'error', message });
  const lines = String(source).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');

  const meta = {};
  const metaLines = {};
  const body = [];
  const result = { meta, metaLines, body, bodyStartLine: 1, problems };

  // ---- story details (front matter) ----
  if (lines[0]?.trim() !== '---') {
    error(1, 'The file must start with a line containing only ---, followed by the story details (title, dek, and so on).');
    return result;
  }
  let i = 1;
  let closed = false;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '---') {
      closed = true;
      i++;
      break;
    }
    if (!t || t.startsWith('#')) continue; // blank lines and # comments are allowed
    const m = t.match(FIELD_RE);
    if (!m) {
      error(i + 1, `Expected "field: value" in the story details, but found "${clip(t)}".`);
      continue;
    }
    if (m[1] in meta) {
      error(i + 1, `"${m[1]}" appears twice in the story details.`);
      continue;
    }
    meta[m[1]] = m[2].trim();
    metaLines[m[1]] = i + 1;
  }
  if (!closed) {
    error(lines.length, 'The story details at the top are never closed. Add a line with just --- after the last detail.');
    return result;
  }
  result.bodyStartLine = i + 1;

  // ---- story body ----
  let para = [];
  let paraLine = 0;
  const flush = () => {
    if (para.length) body.push({ kind: 'text', text: para.join(' '), line: paraLine });
    para = [];
  };

  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    const line = i + 1;

    const open = t.match(/^:::\s*([A-Za-z][\w-]*)\s*$/);
    if (open) {
      flush();
      const block = { kind: 'block', type: open[1].toLowerCase(), fields: {}, fieldLines: {}, line };
      let j = i + 1;
      let done = false;
      for (; j < lines.length; j++) {
        const bt = lines[j].trim();
        if (bt === ':::') {
          done = true;
          break;
        }
        if (/^:::\s*\S/.test(bt)) break; // a new block started: this one was never closed
        if (!bt) continue;
        const fm = bt.match(FIELD_RE);
        if (!fm) {
          error(j + 1, `Inside the ${block.type} block, expected "field: value" but found "${clip(bt)}".`);
          continue;
        }
        (block.fields[fm[1]] ??= []).push(fm[2].trim());
        (block.fieldLines[fm[1]] ??= []).push(j + 1);
      }
      if (!done) error(line, `The ${block.type} block that starts here is never closed. Add a line with just ::: after its last field.`);
      body.push(block);
      i = done ? j : j - 1;
      continue;
    }

    if (t === ':::') {
      error(line, 'Found a closing ::: with no block opened before it.');
      continue;
    }
    if (/^##\s+\S/.test(t) && !t.startsWith('###')) {
      flush();
      body.push({ kind: 'subhead', text: t.replace(/^##\s+/, ''), line });
      continue;
    }
    if (/^#{1,6}(\s|$)/.test(t)) {
      error(line, 'Only ## subheads are allowed in the story body. Use ## for this heading.');
      continue;
    }
    if (!t) {
      flush();
      continue;
    }
    if (!para.length) paraLine = line;
    para.push(t);
  }
  flush();
  return result;
}

const clip = (s) => (s.length > 60 ? `${s.slice(0, 57)}...` : s);
