#!/usr/bin/env node
// Usage: node bin/orrery.js <program.orr> [input.txt]
// With no input file, uses input.txt next to the program if it exists.
const fs = require('fs');
const path = require('path');
const O = require('../src/node.js');

const [file, inputArg] = process.argv.slice(2);
if (!file) {
  console.error('usage: node bin/orrery.js <program.orr> [input.txt]');
  process.exit(2);
}
const src = fs.readFileSync(file, 'utf8');
// An input name is looked up from the current folder first, then beside the program.
const beside = (name) => path.join(path.dirname(file), name);
const inputPath = !inputArg ? beside('input.txt') : fs.existsSync(inputArg) ? inputArg : beside(inputArg);
if (inputArg && !fs.existsSync(inputPath)) {
  console.error(`input file not found: ${inputArg}`);
  process.exit(2);
}
const input = fs.existsSync(inputPath) ? fs.readFileSync(inputPath, 'utf8') : '';
if (!inputArg && input) console.error(`(input: ${inputPath})`);

try {
  const started = Date.now();
  const { said, ticks } = O.runToEnd(src, input);
  for (const line of said) console.log(line);
  console.error(`(${ticks} ticks, ${Date.now() - started} ms)`);
} catch (e) {
  console.error(`${path.basename(file)}: ${e.message}`);
  process.exit(1);
}
