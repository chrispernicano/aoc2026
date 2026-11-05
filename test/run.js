// Runs every example in Node and prints its output.
for (const f of ['lexer', 'parser', 'eval', 'runtime', 'examples']) require(`../src/${f}.js`);
const O = globalThis.Orrery;
let failed = 0;
for (const ex of O.examples) {
  try {
    const run = O.createRun(ex.src, ex.input);
    const out = [];
    let ticks = 0;
    while (!run.state.done && ticks < 10000) { const ev = run.step(); ticks++; for (const o of ev.out) out.push(o.text); }
    console.log(`${ex.title} (${ticks} ticks): ${out.join(' ')}`);
  } catch (e) { failed++; console.log(`${ex.title} FAILED: ${e.message}`); }
}
const bad = ['planet x orbits 2 { say y }\nsky from 1 to 3', 'sky from 1 to 3\nplanet p orbits 1 { 1 / 0 }', 'sky from 1 to 3\nplanet p orbits 1 { say "hi }'];
for (const src of bad) {
  try { const r = O.createRun(src); while (!r.state.done) r.step(); console.log('no error for:', JSON.stringify(src), 'alive:', r.state.bodies.map(b=>b.alive)); }
  catch (e) { console.log('error ok:', e.message); }
}
process.exit(failed ? 1 : 0);
