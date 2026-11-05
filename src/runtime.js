// Orrery runtime: advances the sky one tick at a time.
(function (root) {
  const O = (root.Orrery = root.Orrery || {});
  const Err = O.OrreryError;

  O.createRun = function createRun(src, input) {
    const prog = O.parse(src);
    // Input lines (or comma-separated items) are comets: one passes by on each tick.
    const comets = (input || '').replace(/\r/g, '').replace(/\n+$/, '');
    const lines = comets === '' ? [] : (!comets.includes('\n') || /,\n/.test(comets)) ? comets.split(/,\s*/) : comets.split('\n');
    const constEnv = { tick: 0, comets: lines.length, read: (n, line) => { throw new Err(`"${n}" can't be used here`, line); } };
    const toInt = (v, what, line) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Err(`${what} must be a number`, line);
      return Math.round(v);
    };

    const from = toInt(O.evaluate(prog.sky.from, constEnv), 'the sky start', prog.sky.line);
    const to = prog.sky.to ? toInt(O.evaluate(prog.sky.to, constEnv), 'the sky end', prog.sky.line) : Infinity;

    const bodies = [];
    const byName = new Map();
    for (const b of prog.bodies) {
      if (byName.has(b.name)) throw new Err(`there is already a planet named "${b.name}"`, b.line);
      const body = {
        name: b.name, kind: b.kind, code: b.body, line: b.line, alive: true,
        period: toInt(O.evaluate(b.orbit, constEnv), 'an orbit', b.line),
        mass: b.mass ? O.evaluate(b.mass, constEnv) : 0,
        launched: false,
      };
      bodies.push(body);
      byName.set(b.name, body);
    }
    for (const ec of prog.eclipses) {
      for (const n of ec.names) if (!byName.has(n)) throw new Err(`no planet named "${n}"`, ec.line);
    }

    const state = { tick: from - 1, from, to, bodies, done: from > to, collapsed: false };
    let launchCount = 0;

    function step() {
      if (state.done) return null;
      const t = ++state.tick;
      const prev = new Map(bodies.filter((b) => b.alive).map((b) => [b.name, b.mass]));
      const env = {
        tick: t,
        comets: lines.length,
        comet: lines[t - from] ?? '',
        read(n, line) {
          if (!prev.has(n)) throw new Err(`no planet named "${n}"`, line);
          return prev.get(n);
        },
      };
      const ev = { tick: t, risen: [], eclipses: [], quiet: false, out: [], launched: [], swallowed: [], collapsed: false };
      const risen = bodies.filter((b) => b.alive && b.period > 0 && t % b.period === 0);
      ev.risen = risen.map((b) => b.name);
      const risenSet = new Set(ev.risen);

      const firing = prog.eclipses.filter((ec) => ec.names.every((n) => risenSet.has(n)));
      const hidden = new Set(firing.flatMap((ec) => ec.names));
      ev.eclipses = firing.map((ec) => ec.names);
      const changes = [];

      function run(code, self, where) {
        let result, hasResult = false;
        for (const s of code) {
          if (s.guard && !O.evaluate(s.guard, env)) continue;
          switch (s.k) {
            case 'say': ev.out.push({ text: O.format(O.evaluate(s.e, env)), from: where }); break;
            case 'collapse': ev.collapsed = true; break;
            case 'launch': changes.push(() => launch(toInt(O.evaluate(s.e, env), 'an orbit', s.line))); break;
            case 'tug': {
              const target = byName.get(s.target);
              if (!target) throw new Err(`no planet named "${s.target}"`, s.line);
              const v = toInt(O.evaluate(s.e, env), 'an orbit', s.line);
              changes.push(() => { target.period = v; });
              break;
            }
            case 'drift': {
              if (!self) throw new Err('only a planet can drift; eclipse and quiet blocks have no orbit', s.line);
              const v = toInt(O.evaluate(s.e, env), 'a drift', s.line);
              changes.push(() => { self.period += v; });
              break;
            }
            case 'expr': result = O.evaluate(s.e, env); hasResult = true; break;
          }
        }
        if (self && hasResult) changes.push(() => { self.mass = result; });
      }

      function guarded(fn, self) {
        try { fn(); } catch (e) {
          if (!(e instanceof O.BlackHole)) throw e;
          if (!self) throw new Err('division by zero outside a planet; there is nothing for the black hole to swallow');
          changes.push(() => { self.alive = false; });
          ev.swallowed.push(self.name);
        }
      }

      for (const b of risen) {
        if (hidden.has(b.name) || b.kind === 'moon') continue;
        guarded(() => run(b.code, b, b.name), b);
      }
      for (const ec of firing) guarded(() => run(ec.body, null, ec.names.join('+')), null);
      if (risen.length === 0) {
        ev.quiet = true;
        for (const q of prog.quiet) guarded(() => run(q.body, null, 'quiet'), null);
      }

      function launch(period) {
        const m = { name: `moon${++launchCount}`, kind: 'moon', code: [], alive: true, period, mass: 0, launched: true };
        bodies.push(m);
        byName.set(m.name, m);
        ev.launched.push(m.name);
      }
      for (const c of changes) c();

      if (ev.collapsed) state.collapsed = true;
      if (ev.collapsed || t >= to) state.done = true;
      return ev;
    }

    return { state, step };
  };
})(typeof window !== 'undefined' ? window : globalThis);
