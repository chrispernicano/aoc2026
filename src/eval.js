// Orrery expression evaluation.
(function (root) {
  const O = (root.Orrery = root.Orrery || {});
  const Err = O.OrreryError;

  class BlackHole extends Error {}
  O.BlackHole = BlackHole;

  O.format = function format(v) {
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return String(Math.round(v * 1e6) / 1e6);
    }
    if (v === true) return 'true';
    if (v === false) return 'false';
    return String(v);
  };

  const num = (v, o, line) => {
    if (typeof v !== 'number') throw new Err(`"${o}" needs numbers, got ${JSON.stringify(v)}`, line);
    return v;
  };

  // env: { tick, read(name, line) }
  O.evaluate = function evaluate(e, env) {
    switch (e.k) {
      case 'num': return e.v;
      case 'tick': return env.tick;
      case 'comets': return env.comets;
      case 'comet':
        if (env.comet === undefined) throw new Err('"comet" only exists inside bodies, while the sky is running', e.line);
        return env.comet;
      case 'digits': {
        const m = O.format(evaluate(e.e, env)).match(/[0-9]+/);
        return m ? Number(m[0]) : 0;
      }
      case 'var': return env.read(e.name, e.line);
      case 'str': return e.parts.map((p) => (typeof p === 'string' ? p : O.format(evaluate(p, env)))).join('');
      case 'not': return !evaluate(e.e, env);
      case 'neg': return -num(evaluate(e.e, env), '-', e.line);
      case 'cond': return evaluate(e.cond, env) ? evaluate(e.a, env) : evaluate(e.b, env);
      case 'bin': {
        if (e.o === 'and') return evaluate(e.l, env) && evaluate(e.r, env);
        if (e.o === 'or') return evaluate(e.l, env) || evaluate(e.r, env);
        if (e.o === 'begins') return O.format(evaluate(e.l, env)).startsWith(O.format(evaluate(e.r, env)));
        const l = evaluate(e.l, env), r = evaluate(e.r, env);
        switch (e.o) {
          case '==': return l === r;
          case '!=': return l !== r;
          case '+':
            if (typeof l === 'string' || typeof r === 'string') return O.format(l) + O.format(r);
            return num(l, '+') + num(r, '+');
          case '-': return num(l, '-') - num(r, '-');
          case '*': return num(l, '*') * num(r, '*');
          case '/': if (num(r, '/') === 0) throw new BlackHole(); return num(l, '/') / r;
          case '%': if (num(r, '%') === 0) throw new BlackHole(); return ((num(l, '%') % r) + r) % r;
          case '<': return num(l, '<') < num(r, '<');
          case '>': return num(l, '>') > num(r, '>');
          case '<=': return num(l, '<=') <= num(r, '<=');
          case '>=': return num(l, '>=') >= num(r, '>=');
        }
      }
    }
    throw new Err(`unknown expression ${e.k}`);
  };
})(typeof window !== 'undefined' ? window : globalThis);
