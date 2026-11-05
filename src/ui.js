// Playground controls: editor, run loop, output and legend.
(function () {
  const O = window.Orrery;
  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const code = $('code'), gutter = $('gutter'), out = $('output'), errBox = $('error');
  const runBtn = $('run'), stepBtn = $('step'), resetBtn = $('reset'), speed = $('speed');
  const MAX_TICKS = 100000, MAX_LINES = 2000;

  let run = null, lastEv = null, playing = false, phase = 0, lastFrame = 0, errLine = 0;

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

  // ---- examples ----
  const nav = $('examples');
  function loadExample(ex, autoplay) {
    code.value = ex.src;
    input.value = ex.input || '';
    $('example-note').textContent = ex.note;
    for (const b of nav.children) b.setAttribute('aria-pressed', String(b.dataset.id === ex.id));
    stop(); run = null; lastEv = null; setError(null); clearOutput(); draw();
    if (autoplay) start();
  }
  O.examples.forEach((ex) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = ex.title; b.dataset.id = ex.id;
    b.addEventListener('click', () => loadExample(ex, true));
    nav.appendChild(b);
  });

  // ---- output ----
  function clearOutput() { out.innerHTML = ''; $('tick').textContent = '–'; $('status').textContent = ''; renderLegend(); }
  function line(t, text, sys) {
    const li = document.createElement('li');
    li.className = 'fresh';
    li.innerHTML = `<span class="t"></span><span class="msg${sys ? ' sys' : ''}"></span>`;
    li.firstChild.textContent = t;
    li.lastChild.textContent = text;
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

  // ---- boot: open with FizzBuzz already running ----
  // #aoc-2025-1 (or any example id) in the link opens that example instead.
  const linked = O.examples.find((ex) => '#' + ex.id === location.hash);
  loadExample(linked || O.examples.find((ex) => ex.id === 'fizzbuzz'), false);
  let draft = null;
  try { draft = localStorage.getItem('orrery-draft'); } catch (e) { /* storage unavailable */ }
  if (!linked && draft && !O.examples.some((ex) => ex.src === draft)) {
    code.value = draft;
    for (const b of nav.children) b.setAttribute('aria-pressed', 'false');
    $('example-note').textContent = 'Your last draft';
    paintGutter();
  }
  start();
})();
