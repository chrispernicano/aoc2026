// Loads the interpreter in Node and returns the Orrery namespace.
for (const f of ['lexer', 'parser', 'eval', 'runtime', 'examples']) require(`./${f}.js`);
module.exports = globalThis.Orrery;

// Runs a program to the end and returns what it said.
module.exports.runToEnd = function runToEnd(src, input, maxTicks = 1e7) {
  const run = module.exports.createRun(src, input);
  const said = [];
  let ticks = 0;
  while (!run.state.done) {
    if (++ticks > maxTicks) throw new Error(`stopped after ${maxTicks} ticks`);
    for (const o of run.step().out) said.push(o.text);
  }
  return { said, ticks, collapsed: run.state.collapsed };
};
