// Playground controls: editor, example/AoC catalogs, run loop, output and legend.
(function () {
  const O = window.Orrery;
  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const code = $('code'), gutter = $('gutter'), out = $('output'), errBox = $('error');
  const runBtn = $('run'), stepBtn = $('step'), resetBtn = $('reset'), speed = $('speed');
  const presetsBox = $('input-presets'), exPresetBtn = $('use-example'), inPresetBtn = $('use-input');
  const MAX_TICKS = 100000, MAX_LINES = 2000;

  let run = null, lastEv = null, playing = false, phase = 0, lastFrame = 0, errLine = 0;
  // Holds the active AoC catalog item (or null when viewing a standard example)
  // and its fetched `{ example, input }` texts.
  let currentAoc = null;
  let aocInputs = { example: '', input: '' };
  let preferredInputMode = 'example';
  let aocPart = 1;
  // Stores the latest detected answers from program output (`part 1: ...`, `part 2: ...`).
  let detectedAnswers = { 1: '', 2: '' };

  const submitForm = $('aoc-submit-form'), ansInput = $('aoc-answer'), submitBtn = $('aoc-submit-btn'), submitMsg = $('aoc-submit-msg');
  const part1Btn = $('aoc-part-1'), part2Btn = $('aoc-part-2');

  function setAocPart(part) {
    aocPart = part;
    part1Btn.setAttribute('aria-pressed', String(part === 1));
    part2Btn.setAttribute('aria-pressed', String(part === 2));
    if (detectedAnswers[part]) ansInput.value = detectedAnswers[part];
  }
  part1Btn.addEventListener('click', () => setAocPart(1));
  part2Btn.addEventListener('click', () => setAocPart(2));

  function setSubmitMessage(text, status) {
    submitMsg.hidden = !text;
    submitMsg.textContent = text || '';
    submitMsg.className = 'aoc-submit-msg' + (status ? ` ${status}` : '');
  }

  // Inspect each non-system output line for `part 1: X`, `part 2: Y`, or a bare answer
  // so the submit box automatically fills as the simulation completes.
  function captureAnswerFromOutput(text) {
    const m1 = text.match(/part\s*1\s*[:=]\s*([^\s,]+)/i);
    const m2 = text.match(/part\s*2\s*[:=]\s*([^\s,]+)/i);
    if (m1) {
      detectedAnswers[1] = m1[1];
      if (aocPart === 1) ansInput.value = m1[1];
      return;
    }
    if (m2) {
      detectedAnswers[2] = m2[1];
      if (aocPart === 2) ansInput.value = m2[1];
      return;
    }
    const trailing = text.match(/([0-9A-Za-z_-]+)\s*$/);
    if (trailing && !detectedAnswers[aocPart]) {
      ansInput.value = trailing[1];
    }
  }

  submitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentAoc) return;
    const answer = ansInput.value.trim();
    if (!answer) {
      setSubmitMessage('Enter or run the program to produce an answer first.', 'bad');
      return;
    }
    submitBtn.disabled = true;
    setSubmitMessage(`Submitting Part ${aocPart} answer (${answer}) for Day ${currentAoc.day}…`, '');
    try {
      const res = await fetch('/api/aoc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: currentAoc.year,
          day: currentAoc.day,
          level: aocPart,
          answer,
        }),
      });
      const data = await res.json();
      setSubmitMessage(data.message, data.ok ? 'ok' : 'bad');
      if (data.ok && aocPart === 1) setAocPart(2);
    } catch (err) {
      setSubmitMessage('Could not reach /api/aoc/submit. Run `node bin/serve.js` to enable submissions.', 'bad');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---- editor ----
  function paintGutter() {
    const n = code.value.split('\n').length;
    gutter.innerHTML = Array.from({ length: n }, (_, i) => (i + 1 === errLine ? `<span class="bad">${i + 1}</span>` : i + 1)).join('\n');
    gutter.scrollTop = code.scrollTop;
  }
  code.addEventListener('scroll', () => { gutter.scrollTop = code.scrollTop; });
  code.addEventListener('input', () => {
    try { localStorage.setItem('orrery-draft', code.value); } catch (e) { /* storage unavailable */ }
    stop(); run = null; lastEv = null; setError(null); paintGutter(); draw();
    $('status').textContent = 'Edited. Press Run.';
  });
  input.addEventListener('input', () => {
    syncInputPresetButtons();
    stop(); run = null; lastEv = null; setError(null); draw();
    $('status').textContent = 'Input changed. Press Run.';
  });
  code.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); code.setRangeText('  ', code.selectionStart, code.selectionEnd, 'end'); code.dispatchEvent(new Event('input')); }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); toggle(); }
  });

  function setError(e) {
    errLine = e && e.line ? e.line : 0;
    errBox.hidden = !e;
    errBox.textContent = e ? e.message : '';
    paintGutter();
  }

  // ---- examples & Advent of Code catalogs ----
  const nav = $('examples');
  const aocNav = $('aoc-days');

  // Highlight the active button across both the Examples and AoC rows.
  function markSelected(id) {
    for (const b of [...nav.children, ...aocNav.children]) {
      b.setAttribute('aria-pressed', String(b.dataset.id === id));
    }
  }

  // Update the Example input vs Actual input toggle buttons.
  function syncInputPresetButtons() {
    const fallback = (O.aoc && O.aoc[0]) || { example: '', input: '' };
    const exText = aocInputs.example || fallback.example || '';
    const inText = aocInputs.input || fallback.input || '';
    exPresetBtn.disabled = !exText;
    inPresetBtn.disabled = !inText;
    exPresetBtn.setAttribute('aria-pressed', String(Boolean(currentAoc && exText && input.value === exText)));
    inPresetBtn.setAttribute('aria-pressed', String(Boolean(currentAoc && inText && input.value === inText)));
  }

  function applyInputPreset(mode, autoplay) {
    preferredInputMode = mode;
    // If the user clicks Example/Actual input while on a non-AoC example, switch to Day 1 first.
    if (!currentAoc && O.aoc && O.aoc.length) {
      loadAocDay(O.aoc[0], autoplay);
      return;
    }
    const text = mode === 'input' ? aocInputs.input : aocInputs.example;
    input.value = text;
    syncInputPresetButtons();
    stop(); run = null; lastEv = null; setError(null); clearOutput(); draw();
    if (autoplay) start();
  }
  exPresetBtn.addEventListener('click', () => applyInputPreset('example', true));
  inPresetBtn.addEventListener('click', () => applyInputPreset('input', true));

  function loadExample(ex, autoplay) {
    currentAoc = null;
    submitForm.hidden = true;
    setSubmitMessage('');
    aocInputs = { example: '', input: '' };
    syncInputPresetButtons();
    code.value = ex.src;
    input.value = ex.input || '';
    $('example-note').textContent = ex.note;
    markSelected(ex.id);
    history.replaceState(null, '', '#' + ex.id);
    stop(); run = null; lastEv = null; setError(null); clearOutput(); paintGutter(); draw();
    if (autoplay) start();
  }

  // Fetch a text file relative to the workspace root; returns null if missing/offline.
  async function fetchOptionalText(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      return res.ok ? await res.text() : null;
    } catch (e) {
      return null;
    }
  }

  // Load an Advent of Code day: fetches live `solution.orr`, `example.txt`, and `input.txt`
  // from `aoc/2025/dayXX/`, falling back to any bundled properties on the catalog item.
  async function loadAocDay(item, autoplay) {
    currentAoc = item;
    submitForm.hidden = false;
    setSubmitMessage('');
    ansInput.value = '';
    markSelected(item.id);
    history.replaceState(null, '', '#' + item.id);
    $('example-note').textContent = `AoC ${item.year} · Day ${item.day}: ${item.title}`;

    // Populate immediately from the bundled catalog so Example / Actual input
    // buttons work right away (including on GitHub Pages and file://).
    code.value = item.src || '';
    aocInputs = {
      example: item.example || '',
      input: item.input || '',
    };
    const pickInput = () => (preferredInputMode === 'input'
      ? (aocInputs.input || aocInputs.example)
      : (aocInputs.example || aocInputs.input));
    input.value = pickInput();
    syncInputPresetButtons();

    const [liveSrc, liveExample, liveInput, livePuzzle] = await Promise.all([
      fetchOptionalText(`${item.dir}/solution.orr`),
      fetchOptionalText(`${item.dir}/example.txt`),
      fetchOptionalText(`${item.dir}/input.txt`),
      fetchOptionalText(`${item.dir}/puzzle.md`),
    ]);

    // Default to Part 2 if Part 1 is already answered in puzzle.md, otherwise Part 1.
    const solvedParts = (livePuzzle && livePuzzle.match(/Your puzzle answer was/g) || []).length;
    setAocPart(solvedParts >= 1 ? 2 : 1);

    code.value = liveSrc || item.src || `-- ${item.dir}/solution.orr not found`;
    aocInputs = {
      example: liveExample || item.example || '',
      input: liveInput || item.input || '',
    };
    input.value = pickInput();
    syncInputPresetButtons();

    stop(); run = null; lastEv = null; setError(null); clearOutput(); paintGutter(); draw();
    if (autoplay) start();
  }

  O.examples.forEach((ex) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = ex.title; b.dataset.id = ex.id;
    b.addEventListener('click', () => loadExample(ex, true));
    nav.appendChild(b);
  });

  (O.aoc || []).forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Day ${item.day}: ${item.title}`;
    b.dataset.id = item.id;
    b.addEventListener('click', () => loadAocDay(item, true));
    aocNav.appendChild(b);
  });

  // ---- output ----
  function clearOutput() {
    out.innerHTML = '';
    $('tick').textContent = '–';
    $('status').textContent = '';
    detectedAnswers = { 1: '', 2: '' };
    renderLegend();
  }
  function line(t, text, sys) {
    const li = document.createElement('li');
    li.className = 'fresh';
    li.innerHTML = `<span class="t"></span><span class="msg${sys ? ' sys' : ''}"></span>`;
    li.firstChild.textContent = t;
    li.lastChild.textContent = text;
    if (!sys && currentAoc) captureAnswerFromOutput(text);
    out.appendChild(li);
    setTimeout(() => li.classList.remove('fresh'), 700);
    while (out.children.length > MAX_LINES) out.firstChild.remove();
    out.scrollTop = out.scrollHeight;
  }
  function renderLegend() {
    const ul = $('legend');
    ul.innerHTML = '';
    if (!run) return;
    for (const b of run.state.bodies) {
      const li = document.createElement('li');
      li.className = `${b.kind}${b.alive ? '' : ' gone'}`;
      li.innerHTML = '<i></i><span></span>';
      li.lastChild.textContent = `${b.name} · ${b.period}${b.kind === 'planet' ? ` · ${O.format(b.mass)}` : ''}`;
      ul.appendChild(li);
    }
  }

  // ---- running ----
  function ensureRun() {
    if (run) return true;
    try {
      run = O.createRun(code.value, input.value);
      clearOutput(); setError(null);
      line(run.state.from, `sky from ${run.state.from} to ${run.state.to === Infinity ? 'forever' : run.state.to}`, true);
      return true;
    } catch (e) { setError(e); run = null; return false; }
  }
  function tickOnce() {
    if (!ensureRun()) return false;
    if (run.state.done) return false;
    if (run.state.tick - run.state.from + 1 >= MAX_TICKS) {
      run.state.done = true; line(run.state.tick, `stopped after ${MAX_TICKS} ticks`, true); finish(); return false;
    }
    try {
      lastEv = run.step();
    } catch (e) { setError(e); finish(); return false; }
    const t = lastEv.tick;
    $('tick').textContent = t;
    for (const o of lastEv.out) line(t, o.text);
    for (const m of lastEv.launched) line(t, `launched ${m}`, true);
    for (const s of lastEv.swallowed) line(t, `a black hole swallowed ${s}`, true);
    if (lastEv.collapsed) line(t, 'collapse: the sky ends', true);
    renderLegend();
    if (run.state.done) finish();
    return true;
  }
  function finish() {
    stop();
    $('status').textContent = run && run.state.collapsed ? 'Collapsed' : 'Sky ended';
    runBtn.textContent = 'Run again';
  }
  function start() {
    if (run && run.state.done) { run = null; lastEv = null; }
    if (!ensureRun()) return;
    playing = true; phase = 0; lastFrame = performance.now();
    runBtn.textContent = 'Pause';
    $('status').textContent = 'Running';
    requestAnimationFrame(frame);
  }
  function stop() {
    playing = false;
    runBtn.textContent = run && !run.state.done ? 'Resume' : 'Run';
    if (run && !run.state.done) $('status').textContent = 'Paused';
  }
  function toggle() { playing ? stop() : start(); }

  function frame(now) {
    if (!playing) return;
    const tps = Number(speed.value);
    phase += ((now - lastFrame) / 1000) * tps;
    lastFrame = now;
    let steps = 0;
    while (phase >= 1 && playing && steps < 200) { phase -= 1; steps++; if (!tickOnce()) break; }
    draw();
    if (playing) requestAnimationFrame(frame);
  }
  function draw() { O.drawSky($('sky'), run && run.state, lastEv, playing ? Math.min(phase, 0.999) : 0); }

  runBtn.addEventListener('click', toggle);
  stepBtn.addEventListener('click', () => { stop(); if (run && run.state.done) { run = null; lastEv = null; } tickOnce(); draw(); });
  $('skip').addEventListener('click', () => {
    stop();
    if (run && run.state.done) { run = null; lastEv = null; }
    while (tickOnce()) { /* run until the sky ends, collapses or hits MAX_TICKS */ }
    draw();
  });
  resetBtn.addEventListener('click', () => { stop(); run = null; lastEv = null; setError(null); clearOutput(); draw(); runBtn.textContent = 'Run'; });
  window.addEventListener('resize', draw);
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', draw);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---- boot: open linked example/AoC day, or default to FizzBuzz ----
  const linkedAoc = (O.aoc || []).find((item) => '#' + item.id === location.hash);
  const linkedEx = O.examples.find((ex) => '#' + ex.id === location.hash);
  if (linkedAoc) {
    loadAocDay(linkedAoc, true);
  } else {
    loadExample(linkedEx || O.examples.find((ex) => ex.id === 'fizzbuzz'), false);
    let draft = null;
    try { draft = localStorage.getItem('orrery-draft'); } catch (e) { /* storage unavailable */ }
    if (!linkedEx && draft && !O.examples.some((ex) => ex.src === draft)) {
      code.value = draft;
      markSelected('');
      $('example-note').textContent = 'Your last draft';
      paintGutter();
    }
    start();
  }
})();
