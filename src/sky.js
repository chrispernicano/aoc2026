// Draws the orrery: a sun, one ring per planet or moon, and a meridian at 12 o'clock.
// A planet sits on the meridian on the ticks it rises.
(function (root) {
  const O = (root.Orrery = root.Orrery || {});

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  O.drawSky = function drawSky(canvas, state, lastEv, phase) {
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    if (canvas.width !== Math.round(size * dpr)) { canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const c = size / 2;
    const col = { orbit: css('--orbit'), planet: css('--planet'), moon: css('--moon'), brass: css('--brass'), soft: css('--brass-soft'), muted: css('--muted'), panel: css('--panel') };
    const bodies = state ? state.bodies.filter((b) => b.alive) : [];
    const inner = size * 0.1, outer = size * 0.46;
    const gap = bodies.length > 1 ? (outer - inner) / (bodies.length - 1) : 0;
    const risen = new Set(lastEv && phase < 0.35 ? lastEv.risen : []);

    // meridian
    ctx.strokeStyle = col.soft; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(c, c - inner * 0.6); ctx.lineTo(c, c - outer - 8); ctx.stroke();
    ctx.setLineDash([]);

    // sun
    const flash = lastEv && lastEv.quiet && phase < 0.35;
    ctx.fillStyle = col.brass;
    ctx.beginPath(); ctx.arc(c, c, size * (flash ? 0.038 : 0.03), 0, Math.PI * 2); ctx.fill();

    const t = state ? state.tick : 0;
    bodies.forEach((b, i) => {
      const r = bodies.length > 1 ? inner + gap * i : (inner + outer) / 2;
      ctx.strokeStyle = col.orbit; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke();

      let frac = 0;
      if (b.period > 0) frac = (((t + phase) % b.period) + b.period) % b.period / b.period;
      const a = -Math.PI / 2 + frac * Math.PI * 2;
      const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
      const moon = b.kind === 'moon';
      const rad = moon ? 3 : 6;

      if (risen.has(b.name)) {
        ctx.fillStyle = col.soft; ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.arc(x, y, rad + 6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = risen.has(b.name) ? col.brass : moon ? col.moon : col.planet;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();

      if (!moon || bodies.length <= 8) {
        ctx.fillStyle = col.muted;
        ctx.font = `11px ${css('--mono')}`;
        ctx.fillText(b.name, x + rad + 4, y + 4);
      }
    });

    if (!state) {
      ctx.fillStyle = col.muted; ctx.font = `13px ${css('--body')}`; ctx.textAlign = 'center';
      ctx.fillText('Press Run to set the sky in motion', c, c + size * 0.12);
      ctx.textAlign = 'start';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
