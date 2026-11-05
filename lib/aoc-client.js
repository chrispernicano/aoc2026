// Advent of Code client: config, unlock times, polite HTTP, and puzzle HTML -> Markdown.
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = 'https://adventofcode.com';
const CONFIG_DIR = path.join(os.homedir(), '.config', 'aoc');
const ROOT = path.resolve(__dirname, '..', 'aoc');

function readSetting(envName, fileName) {
  if (process.env[envName]) return process.env[envName].trim();
  const f = path.join(CONFIG_DIR, fileName);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '';
}

function config() {
  const userAgent = readSetting('AOC_USER_AGENT', 'user-agent');
  const session = readSetting('AOC_SESSION', 'session');
  const missing = [];
  if (!userAgent) missing.push(`AOC_USER_AGENT (or ${path.join(CONFIG_DIR, 'user-agent')})`);
  if (!session) missing.push(`AOC_SESSION (or ${path.join(CONFIG_DIR, 'session')})`);
  if (missing.length) throw new Error(`missing settings: ${missing.join(', ')}. See aoc/README.md.`);
  return { userAgent, session };
}

// 2015-2024 had 25 days; from 2025 the event has 12.
const daysIn = (year) => (year >= 2025 ? 12 : 25);
// Puzzles unlock at midnight US Eastern (UTC-5) on December 1..N.
const unlockTime = (year, day) => new Date(Date.UTC(year, 11, day, 5, 0, 0));
const isUnlocked = (year, day, now = new Date()) => now >= unlockTime(year, day);

const dayDir = (year, day) => path.join(ROOT, String(year), `day${String(day).padStart(2, '0')}`);

let lastRequest = 0;
async function get(urlPath, cfg) {
  const wait = lastRequest + 1500 - Date.now(); // at most one request every 1.5 s
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  const res = await fetch(BASE + urlPath, {
    headers: { 'User-Agent': cfg.userAgent, Cookie: `session=${cfg.session}` },
  });
  const body = await res.text();
  if (res.status === 404) return { status: 404, body };
  if (!res.ok) {
    const hint = /log in/i.test(body) ? ' Your session cookie may have expired.' : '';
    throw new Error(`GET ${urlPath} returned ${res.status}.${hint}`);
  }
  return { status: res.status, body };
}

const decode = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

function inline(html) {
  return decode(html
    .replace(/<code>([\s\S]*?)<\/code>/g, (_, c) => '`' + c.replace(/<[^>]+>/g, '') + '`')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/g, '**$1**')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, h, t) => `[${t}](${new URL(h, BASE + '/').href})`)
    .replace(/<[^>]+>/g, ''));
}

// Converts the puzzle page's <article class="day-desc"> blocks (and any answers) to Markdown.
function puzzleMarkdown(html, year, day) {
  const out = [`<!-- ${BASE}/${year}/day/${day} -->`, ''];
  const parts = html.match(/<article class="day-desc">[\s\S]*?<\/article>|<p>Your puzzle answer was[\s\S]*?<\/p>/g) || [];
  for (const part of parts) {
    if (part.startsWith('<p>')) { out.push(inline(part), ''); continue; }
    const blocks = part.match(/<h2[^>]*>[\s\S]*?<\/h2>|<pre>[\s\S]*?<\/pre>|<ul>[\s\S]*?<\/ul>|<p>[\s\S]*?<\/p>/g) || [];
    for (const b of blocks) {
      if (b.startsWith('<h2')) out.push(`## ${inline(b)}`);
      else if (b.startsWith('<pre')) out.push('```', decode(b.replace(/<[^>]+>/g, '')).replace(/\n$/, ''), '```');
      else if (b.startsWith('<ul')) out.push((b.match(/<li>[\s\S]*?<\/li>/g) || []).map((li) => `- ${inline(li).trim()}`).join('\n'));
      else out.push(inline(b));
      out.push('');
    }
  }
  return { markdown: out.join('\n'), parts: (html.match(/<article class="day-desc">/g) || []).length };
}

// Extracts the human-readable verdict from Advent of Code's answer POST response.
function answerFeedback(html) {
  const art = (html.match(/<article>([\s\S]*?)<\/article>/) || [])[1] || html;
  const cleaned = art.replace(/<a [^>]*>\[(?:Continue to Part Two|Return to[^\]]*)\]<\/a>/gi, '');
  const message = inline(cleaned).replace(/\s+/g, ' ').trim();
  const ok = /That's the right answer/i.test(message);
  return { ok, message: message || 'No response message from Advent of Code.' };
}

// Submits an answer for `level` (1 or 2) and, on success, refreshes `puzzle.md` on disk
// so Part Two (or the recorded answer) is saved immediately.
async function submit(year, day, level, answer, cfg = config()) {
  const wait = lastRequest + 1500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();

  const urlPath = `/${year}/day/${day}/answer`;
  const form = `level=${encodeURIComponent(level)}&answer=${encodeURIComponent(String(answer).trim())}`;
  const res = await fetch(BASE + urlPath, {
    method: 'POST',
    headers: {
      'User-Agent': cfg.userAgent,
      Cookie: `session=${cfg.session}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  const body = await res.text();
  if (!res.ok) {
    const hint = /log in/i.test(body) ? ' Your session cookie may have expired.' : '';
    throw new Error(`POST ${urlPath} returned ${res.status}.${hint}`);
  }
  const result = answerFeedback(body);
  if (result.ok) {
    try {
      const page = await get(`/${year}/day/${day}`, cfg);
      if (page.status === 200) {
        const dir = dayDir(year, day);
        fs.mkdirSync(dir, { recursive: true });
        const { markdown } = puzzleMarkdown(page.body, year, day);
        fs.writeFileSync(path.join(dir, 'puzzle.md'), markdown);
        result.updatedPuzzle = true;
      }
    } catch (e) { /* non-fatal if puzzle refresh fails */ }
  }
  return result;
}

module.exports = { config, daysIn, unlockTime, isUnlocked, dayDir, get, submit, answerFeedback, puzzleMarkdown, ROOT, CONFIG_DIR };
