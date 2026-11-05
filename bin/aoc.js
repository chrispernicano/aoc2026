#!/usr/bin/env node
// Advent of Code helper. See aoc/README.md.
//   node bin/aoc.js fetch                 today's puzzle (does nothing outside the event)
//   node bin/aoc.js fetch 2026            every unlocked day of 2026
//   node bin/aoc.js fetch 2026 3          one day
//   node bin/aoc.js schedule install      fetch automatically at 00:05 each day
//   node bin/aoc.js schedule remove | status
const fs = require('fs');
const path = require('path');
const aoc = require('../lib/aoc-client.js');

const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);

function template(year, day) {
  return `-- Advent of Code ${year}, day ${day}
-- Puzzle: puzzle.md. Input: input.txt, one comet per line.
-- Run: node bin/orrery.js aoc/${year}/day${String(day).padStart(2, '0')}/solution.orr

sky from 1 to comets

planet lines orbits 1 mass 0 { lines + 1 }
planet done orbits comets { say "read {lines + 1} lines" }
`;
}

async function fetchDay(year, day, cfg) {
  if (!aoc.isUnlocked(year, day)) { log(`${year} day ${day} unlocks ${aoc.unlockTime(year, day).toISOString()}; skipped`); return; }
  const dir = aoc.dayDir(year, day);
  fs.mkdirSync(dir, { recursive: true });
  const rel = path.relative(process.cwd(), dir) || '.';

  const puzzleFile = path.join(dir, 'puzzle.md');
  const have = fs.existsSync(puzzleFile) ? fs.readFileSync(puzzleFile, 'utf8') : '';
  // Part two appears after part one is solved, so re-fetch until the page has both parts and answers.
  const complete = /## --- Part Two ---/.test(have) && (have.match(/Your puzzle answer was/g) || []).length >= 2;
  if (!complete) {
    const page = await aoc.get(`/${year}/day/${day}`, cfg);
    if (page.status === 404) { log(`${year} day ${day}: no puzzle found`); return; }
    const { markdown, parts } = aoc.puzzleMarkdown(page.body, year, day);
    if (markdown !== have) { fs.writeFileSync(puzzleFile, markdown); log(`${rel}/puzzle.md saved (${parts} part${parts === 1 ? '' : 's'})`); }
  }

  const inputFile = path.join(dir, 'input.txt');
  if (!fs.existsSync(inputFile)) {
    const input = await aoc.get(`/${year}/day/${day}/input`, cfg);
    if (input.status === 404) log(`${year} day ${day}: no input found`);
    else { fs.writeFileSync(inputFile, input.body); log(`${rel}/input.txt saved (${input.body.split('\n').length - 1} lines)`); }
  }

  const solution = path.join(dir, 'solution.orr');
  if (!fs.existsSync(solution)) { fs.writeFileSync(solution, template(year, day)); log(`${rel}/solution.orr created`); }
}

async function fetchCmd(args) {
  const [y, d] = args.map(Number);
  if (y && d) return fetchDay(y, d, aoc.config());
  if (y) {
    const cfg = aoc.config();
    for (let day = 1; day <= aoc.daysIn(y); day++) if (aoc.isUnlocked(y, day)) await fetchDay(y, day, cfg);
    return;
  }
  const et = new Date(Date.now() - 5 * 3600e3); // US Eastern, the event's clock
  const year = et.getUTCFullYear(), day = et.getUTCDate();
  if (et.getUTCMonth() !== 11 || day > aoc.daysIn(year)) { log('no puzzle today'); return; }
  return fetchDay(year, day, aoc.config());
}

// ---- launchd schedule ----
const LABEL = 'dev.orrery.aoc-fetch';
const plistPath = path.join(require('os').homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
const { execFileSync } = require('child_process');
const uid = process.getuid();

function scheduleCmd([action]) {
  if (action === 'install') {
    const node = fs.existsSync('/opt/homebrew/bin/node') ? '/opt/homebrew/bin/node' : process.execPath;
    const repo = path.resolve(__dirname, '..');
    const logFile = path.join(aoc.ROOT, '.fetch.log');
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key><array>
    <string>${node}</string><string>${path.join(repo, 'bin', 'aoc.js')}</string><string>fetch</string>
  </array>
  <key>WorkingDirectory</key><string>${repo}</string>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>0</integer><key>Minute</key><integer>5</integer></dict>
  <key>StandardOutPath</key><string>${logFile}</string>
  <key>StandardErrorPath</key><string>${logFile}</string>
</dict></plist>
`;
    fs.mkdirSync(path.dirname(plistPath), { recursive: true });
    fs.mkdirSync(aoc.ROOT, { recursive: true });
    try { execFileSync('launchctl', ['bootout', `gui/${uid}`, plistPath], { stdio: 'ignore' }); } catch { /* not loaded yet */ }
    fs.writeFileSync(plistPath, plist);
    execFileSync('launchctl', ['bootstrap', `gui/${uid}`, plistPath]);
    console.log(`Installed ${plistPath}\nRuns "aoc.js fetch" daily at 00:05 local time; log: ${logFile}`);
  } else if (action === 'remove') {
    try { execFileSync('launchctl', ['bootout', `gui/${uid}`, plistPath], { stdio: 'ignore' }); } catch { /* not loaded */ }
    if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
    console.log('Schedule removed');
  } else if (action === 'status') {
    try { execFileSync('launchctl', ['print', `gui/${uid}/${LABEL}`], { stdio: 'ignore' }); console.log(`Scheduled (${plistPath})`); }
    catch { console.log('Not scheduled'); }
  } else {
    console.error('usage: node bin/aoc.js schedule install|remove|status'); process.exit(2);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
(async () => {
  if (cmd === 'fetch') await fetchCmd(rest);
  else if (cmd === 'schedule') scheduleCmd(rest);
  else { console.error('usage: node bin/aoc.js fetch [year [day]] | schedule install|remove|status'); process.exit(2); }
})().catch((e) => { log(`error: ${e.message}`); process.exit(1); });
