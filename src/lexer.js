// Orrery lexer: turns source text into tokens.
(function (root) {
  const O = (root.Orrery = root.Orrery || {});

  const KEYWORDS = new Set([
    'sky', 'from', 'to', 'forever', 'planet', 'moon', 'orbits', 'mass',
    'eclipse', 'when', 'quiet', 'say', 'launch', 'tug', 'drift', 'by',
    'collapse', 'if', 'else', 'and', 'or', 'not', 'true', 'false', 'tick',
    'comet', 'comets', 'digits', 'of', 'begins',
  ]);
  const OPS = ['==', '!=', '<=', '>=', '+', '-', '*', '/', '%', '<', '>', '(', ')', '{', '}', ','];

  class OrreryError extends Error {
    constructor(msg, line) {
      super(line ? `line ${line}: ${msg}` : msg);
      this.line = line;
    }
  }
  O.OrreryError = OrreryError;

  O.lex = function lex(src) {
    const toks = [];
    let i = 0, line = 1;
    const push = (type, value) => toks.push({ type, value, line });
    while (i < src.length) {
      const c = src[i];
      if (c === '\n') { push('nl'); line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '-' && src[i + 1] === '-') {
        while (i < src.length && src[i] !== '\n') i++;
        continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i;
        while (j < src.length && /[0-9.]/.test(src[j])) j++;
        push('num', parseFloat(src.slice(i, j)));
        i = j; continue;
      }
      if (c === '"') {
        let j = i + 1;
        while (j < src.length && src[j] !== '"') {
          if (src[j] === '\n') throw new OrreryError('string is missing its closing "', line);
          j++;
        }
        if (j >= src.length) throw new OrreryError('string is missing its closing "', line);
        push('str', src.slice(i + 1, j));
        i = j + 1; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
        const word = src.slice(i, j);
        push(KEYWORDS.has(word) ? 'kw' : 'id', word);
        i = j; continue;
      }
      const op = OPS.find((o) => src.startsWith(o, i));
      if (op) { push('op', op); i += op.length; continue; }
      throw new OrreryError(`unexpected character "${c}"`, line);
    }
    push('nl');
    push('eof');
    return toks;
  };
})(typeof window !== 'undefined' ? window : globalThis);
