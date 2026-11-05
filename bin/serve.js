#!/usr/bin/env node
// Local playground server: serves static workspace files and proxies Advent of Code
// answer submissions (`/api/aoc/submit`) using credentials from `~/.config/aoc/`.
const http = require('http');
const fs = require('fs');
const path = require('path');
const aoc = require('../lib/aoc-client.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || process.argv[2] || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.orr': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) { req.destroy(); reject(new Error('request body too large')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // POST /api/aoc/submit -> submit an Advent of Code answer for { year, day, level, answer }.
    if (req.method === 'POST' && url.pathname === '/api/aoc/submit') {
      const raw = await readBody(req);
      const { year, day, level, answer } = JSON.parse(raw || '{}');
      if (!year || !day || (level !== 1 && level !== 2) || !String(answer ?? '').trim()) {
        return sendJson(res, 400, { ok: false, message: 'Provide year, day, part (1 or 2), and a non-empty answer.' });
      }
      const result = await aoc.submit(Number(year), Number(day), Number(level), String(answer).trim());
      return sendJson(res, 200, result);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { ok: false, message: 'Method not allowed' });
    }

    // Resolve static file inside the workspace root, preventing directory traversal.
    const relPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.resolve(ROOT, '.' + relPath);
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    sendJson(res, 500, { ok: false, message: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`Orrery playground listening on http://localhost:${PORT}`);
});

