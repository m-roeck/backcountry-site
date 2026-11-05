// Prints the current story format, straight from the code, so it can't go out of date.
//   npm run blocks
import { STORY_DETAILS } from './lib/schema.mjs';
import { BLOCKS } from './lib/blocks.mjs';

const describe = (name, spec) => {
  const flags = [spec.required ? 'required' : 'optional', spec.repeat ? 'repeatable' : ''].filter(Boolean).join(', ');
  const options = spec.options ? ` One of: ${spec.options.join(', ')}.` : '';
  return `  ${name.padEnd(14)} ${flags.padEnd(22)} ${spec.help ?? ''}${options}`;
};

console.log('STORY DETAILS  (top of story.md, between the --- lines)\n');
for (const [name, spec] of Object.entries(STORY_DETAILS)) console.log(describe(name, spec));

console.log('\nBODY\n');
console.log('  Paragraphs separated by blank lines. *italic*, **bold**, [link text](https://...).');
console.log('  Lines starting with ## are subheads.\n');
console.log('BLOCKS  (open with ::: name, one "field: value" per line, close with :::)\n');
for (const [name, block] of Object.entries(BLOCKS)) {
  console.log(`::: ${name}  ${block.help}`);
  for (const [field, spec] of Object.entries(block.fields)) console.log(describe(field, spec));
  console.log('');
}
