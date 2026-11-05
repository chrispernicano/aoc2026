// Checks puzzle HTML -> Markdown on a made-up page shaped like an Advent of Code puzzle.
const assert = require('assert');
const { puzzleMarkdown, unlockTime, isUnlocked, daysIn } = require('../lib/aoc-client.js');

const html = `<main>
<article class="day-desc"><h2>--- Day 3: Test Orbit ---</h2><p>See <a href="/2026/about">the rules</a> &amp; read <em>carefully</em>.</p>
<p>Values like <code>12</code> and <code><em>0</em></code> matter.</p>
<pre><code>R1
L&lt;2&gt;
</code></pre>
<ul>
<li>First <code>A</code>.</li>
<li>Second.</li>
</ul>
</article>
<p>Your puzzle answer was <code>42</code>.</p>
<article class="day-desc"><h2 id="part2">--- Part Two ---</h2><p>Now <em>twice</em>.</p></article>
<p>Your puzzle answer was <code>99</code>.</p>
</main>`;

const { markdown, parts } = puzzleMarkdown(html, 2026, 3);
assert.strictEqual(parts, 2);
const expected = [
  '<!-- https://adventofcode.com/2026/day/3 -->',
  '',
  '## --- Day 3: Test Orbit ---',
  '',
  'See [the rules](https://adventofcode.com/2026/about) & read **carefully**.',
  '',
  'Values like `12` and `0` matter.',
  '',
  '```',
  'R1',
  'L<2>',
  '```',
  '',
  '- First `A`.',
  '- Second.',
  '',
  'Your puzzle answer was `42`.',
  '',
  '## --- Part Two ---',
  '',
  'Now **twice**.',
  '',
  'Your puzzle answer was `99`.',
  '',
].join('\n');
assert.strictEqual(markdown, expected);

assert.strictEqual(unlockTime(2026, 1).toISOString(), '2026-12-01T05:00:00.000Z');
assert.strictEqual(isUnlocked(2026, 1, new Date('2026-12-01T04:59:59Z')), false);
assert.strictEqual(isUnlocked(2026, 1, new Date('2026-12-01T05:00:00Z')), true);
assert.strictEqual(daysIn(2024), 25);
assert.strictEqual(daysIn(2025), 12);
console.log('aoc-markdown: ok');
