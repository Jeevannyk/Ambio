// Driver for the react-todo-app (Create React App).
//
// Serves the production build with a zero-dependency static server, then
// drives the running app in headless Chromium via Playwright: adds tasks,
// toggles, edits, filters, deletes + undo, and toggles dark mode. Asserts
// on the DOM at each step and writes a screenshot.
//
// Usage (run from the app root, i.e. react-todo-app/):
//   npm run build                  # produce ./build  (driver does NOT build)
//   node .claude/skills/run-react-todo-app/driver.mjs
//
// Output: .claude/skills/run-react-todo-app/screenshot.png
// Exit code 0 = every assertion passed; non-zero = a step failed.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..', '..', '..'); // react-todo-app/
const buildDir = join(appRoot, 'build');
const shotPath = join(here, 'screenshot.png');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

// Minimal SPA static server: serve files, fall back to index.html.
function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = join(buildDir, urlPath === '/' ? 'index.html' : urlPath);
      let body;
      try {
        body = await readFile(filePath);
      } catch {
        filePath = join(buildDir, 'index.html'); // SPA fallback
        body = await readFile(filePath);
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  return new Promise((res) => {
    server.listen(0, '127.0.0.1', () => res({ server, port: server.address().port }));
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  console.log('  ok:', msg);
}

const { server, port } = await startServer();
const baseURL = `http://127.0.0.1:${port}`;
console.log('serving build at', baseURL);

const browser = await chromium.launch();
const page = await browser.newPage();
let failed = false;
try {
  // Start from a clean slate so the run is deterministic.
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  assert((await page.locator('h1').innerText()) === 'Todo List', 'title renders');

  // --- Add two tasks ---
  await page.fill('.todo-input', 'Buy milk');
  await page.click('.todo-form button[type=submit]');
  await page.fill('.todo-input', 'Write report');
  await page.click('.todo-form button[type=submit]');
  assert((await page.locator('.todo-item').count()) === 2, 'two tasks added');

  // --- Whitespace-only input is rejected ---
  await page.fill('.todo-input', '   ');
  await page.click('.todo-form button[type=submit]');
  assert((await page.locator('.todo-item').count()) === 2, 'whitespace task rejected');

  // --- Toggle first task complete ---
  await page.locator('.todo-item').first().locator('input[type=checkbox]').check();
  assert((await page.locator('.todo-item.done').count()) === 1, 'task marked done');
  assert((await page.locator('.counter').innerText()).startsWith('1 of 2'), 'counter updates');

  // --- Filter: Active hides the completed one ---
  await page.click('.filter:has-text("Active")');
  assert((await page.locator('.todo-item').count()) === 1, 'active filter hides done');
  await page.click('.filter:has-text("All")');

  // --- Search narrows the list ---
  await page.fill('.search-input', 'report');
  assert((await page.locator('.todo-item').count()) === 1, 'search filters by text');
  await page.fill('.search-input', '');

  // --- Edit in place via double-click ---
  const second = page.locator('.todo-item').nth(1);
  await second.locator('.todo-text').dblclick();
  await second.locator('.edit-input').fill('Write final report');
  await second.locator('.edit-input').press('Enter');
  assert(
    (await page.locator('.todo-item').nth(1).locator('.todo-text').innerText()) === 'Write final report',
    'edit-in-place saves'
  );

  // --- Delete + Undo ---
  await page.locator('.todo-item').first().locator('.delete-btn').click();
  assert((await page.locator('.todo-item').count()) === 1, 'task deleted');
  assert(await page.locator('.undo-toast').isVisible(), 'undo toast shown');
  await page.click('.undo-toast button');
  assert((await page.locator('.todo-item').count()) === 2, 'undo restores task');

  // --- Dark mode toggle (applied async via the View Transitions API) ---
  await page.click('.theme-toggle');
  await page.waitForFunction(() => document.body.dataset.theme === 'dark', null, { timeout: 5000 });
  assert((await page.evaluate(() => document.body.dataset.theme)) === 'dark', 'dark mode applied');

  // --- Scene selector (VIBES) changes the background gradient ---
  const wrapper = page.locator('.bg-video-wrapper');
  const forestBg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundImage);
  await page.click('.scene-tile:has-text("Ocean")');
  assert(
    await page.locator('.scene-tile--active:has-text("Ocean")').isVisible(),
    'ocean scene marked active'
  );
  const oceanBg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundImage);
  assert(oceanBg !== forestBg && oceanBg.includes('gradient'), 'background gradient changed on scene click');

  await page.screenshot({ path: shotPath, fullPage: true });
  console.log('screenshot written to', shotPath);
  console.log('\nALL CHECKS PASSED');
} catch (e) {
  failed = true;
  console.error('\nDRIVER FAILED:', e.message);
  await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
}
