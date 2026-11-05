// Orrery parser: tokens -> program AST.
(function (root) {
  const O = (root.Orrery = root.Orrery || {});
  const Err = O.OrreryError;

  function Parser(toks) {
    let p = 0;
    const peek = () => toks[p];
    const is = (type, value) => peek().type === type && (value === undefined || peek().value === value);
    const kw = (v) => is('kw', v);
    const op = (v) => is('op', v);
    const next = () => toks[p++];
    const fail = (msg) => { throw new Err(msg, peek().line); };
    const desc = (t) => (t.type === 'nl' ? 'end of line' : t.type === 'eof' ? 'end of program' : `"${t.value}"`);
    const expect = (type, value, what) => {
      if (!is(type, value)) fail(`expected ${what || value}, found ${desc(peek())}`);
      return next();
    };
    const skipNl = () => { while (is('nl')) next(); };
    const name = (what) => expect('id', undefined, what).value;

    // ---- expressions ----
    function expr() {
      const e = orExpr();
      if (kw('if')) {
        const save = p;
        next();
        const cond = orExpr();
        let q = p;
        while (toks[q].type === 'nl') q++; // `else` may start the next line
        if (toks[q].type === 'kw' && toks[q].value === 'else') p = q;
        if (kw('else')) { next(); return { k: 'cond', cond, a: e, b: expr() }; }
        p = save; // a statement guard like `collapse if x`, not a ternary
      }
      return e;
    }
    function binLevel(sub, ops, isKw) {
      return function () {
        let l = sub();
        while ((isKw ? ops.some(kw) : ops.some(op))) {
          const o = next().value;
          l = { k: 'bin', o, l, r: sub() };
        }
        return l;
      };
    }
    function unary() {
      if (kw('not')) { next(); return { k: 'not', e: unary() }; }
      if (op('-')) { next(); return { k: 'neg', e: unary() }; }
      if (kw('digits')) { next(); expect('kw', 'of'); return { k: 'digits', e: unary() }; }
      return primary();
    }
    const mul = binLevel(unary, ['*', '/', '%']);
    const add = binLevel(mul, ['+', '-']);
    const beg = binLevel(add, ['begins'], true);
    const cmp = binLevel(beg, ['==', '!=', '<=', '>=', '<', '>']);
    const andExpr = binLevel(cmp, ['and'], true);
    const orExpr = binLevel(andExpr, ['or'], true);

    function primary() {
      const t = peek();
      if (t.type === 'num') { next(); return { k: 'num', v: t.value }; }
      if (t.type === 'str') { next(); return strNode(t.value, t.line); }
      if (t.type === 'id') { next(); return { k: 'var', name: t.value, line: t.line }; }
      if (kw('tick')) { next(); return { k: 'tick' }; }
      if (kw('comet')) { next(); return { k: 'comet', line: t.line }; }
      if (kw('comets')) { next(); return { k: 'comets' }; }
      if (kw('true') || kw('false')) { next(); return { k: 'num', v: t.value === 'true' }; }
      if (op('(')) { next(); const e = expr(); expect('op', ')'); return e; }
      return fail(`expected a value, found ${desc(t)}`);
    }

    function strNode(raw, line) {
      const parts = [];
      let i = 0;
      while (i < raw.length) {
        const open = raw.indexOf('{', i);
        if (open < 0) { parts.push(raw.slice(i)); break; }
        const close = raw.indexOf('}', open);
        if (close < 0) throw new Err('"{" in a string needs a matching "}"', line);
        if (open > i) parts.push(raw.slice(i, open));
        const inner = O.lex(raw.slice(open + 1, close)).map((t) => ({ ...t, line }));
        parts.push(Parser(inner).exprOnly());
        i = close + 1;
      }
      return { k: 'str', parts };
    }

    // ---- statements inside a body ----
    function guard(node) {
      if (kw('if')) { next(); node.guard = expr(); }
      return node;
    }
    function bodyStmt() {
      const line = peek().line;
      if (kw('say')) { next(); return guard({ k: 'say', e: expr(), line }); }
      if (kw('collapse')) { next(); return guard({ k: 'collapse', line }); }
      if (kw('drift')) { next(); expect('kw', 'by'); return guard({ k: 'drift', e: expr(), line }); }
      if (kw('tug')) {
        next(); const target = name('a planet name'); expect('kw', 'to');
        return guard({ k: 'tug', target, e: expr(), line });
      }
      if (kw('launch')) {
        next(); expect('kw', 'moon'); expect('kw', 'orbits');
        return guard({ k: 'launch', e: expr(), line });
      }
      return guard({ k: 'expr', e: expr(), line });
    }
    function block() {
      expect('op', '{');
      const body = [];
      skipNl();
      while (!op('}')) {
        if (is('eof')) fail('a "{" block is missing its closing "}"');
        body.push(bodyStmt());
        if (!op('}')) expect('nl', undefined, 'end of line');
        skipNl();
      }
      next();
      return body;
    }

    // ---- top level ----
    function program() {
      const prog = { sky: null, bodies: [], eclipses: [], quiet: [] };
      skipNl();
      while (!is('eof')) {
        const line = peek().line;
        if (kw('sky')) {
          next(); expect('kw', 'from'); const from = expr(); expect('kw', 'to');
          let to = null;
          if (kw('forever')) next(); else to = expr();
          prog.sky = { from, to, line };
        } else if (kw('planet') || kw('moon')) {
          const kind = next().value;
          const n = name(`a ${kind} name`);
          expect('kw', 'orbits');
          const node = { kind, name: n, orbit: expr(), mass: null, body: [], line };
          if (kw('mass')) { next(); node.mass = expr(); }
          if (op('{')) {
            if (kind === 'moon') fail('moons are silent and cannot have a body; use a planet');
            node.body = block();
          }
          prog.bodies.push(node);
        } else if (kw('eclipse')) {
          next();
          const names = [name('a planet name')];
          while (op(',')) { next(); names.push(name('a planet name')); }
          if (names.length < 2) fail('an eclipse needs at least two planets');
          prog.eclipses.push({ names, body: block(), line });
        } else if (kw('when')) {
          next(); expect('kw', 'quiet');
          prog.quiet.push({ body: block(), line });
        } else {
          fail(`a program is made of sky, planet, moon, eclipse and when quiet lines, found ${desc(peek())}`);
        }
        if (!is('eof')) expect('nl', undefined, 'end of line');
        skipNl();
      }
      if (!prog.sky) throw new Err('every program needs a sky line, like: sky from 1 to 100');
      return prog;
    }

    return {
      program,
      exprOnly() { const e = expr(); if (!is('nl') && !is('eof')) fail(`unexpected ${desc(peek())}`); return e; },
    };
  }

  O.parse = (src) => Parser(O.lex(src)).program();
})(typeof window !== 'undefined' ? window : globalThis);
