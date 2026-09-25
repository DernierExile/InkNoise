// Captures d'écran de l'interface (studio + partage) via Playwright, pour vérification visuelle.
// Usage : NODE_PATH=$(npm root -g) node test/shots.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 8125;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.resolve('test/shots');
await fs.mkdir(OUT, { recursive: true });
await fs.rm(path.resolve('test/data-shots'), { recursive: true, force: true });

const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT), LIBRARY_ROOT: path.resolve('test/library'), DATA_DIR: path.resolve('test/data-shots'), ADMIN_PASSWORD: 'studio', PUBLIC_ORIGIN: BASE, SCAN_INTERVAL_MIN: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (d) => { logs += d; });
server.stderr.on('data', (d) => { logs += d; });
for (let i = 0; i < 50; i++) {
  const r = await fetch(`${BASE}/health`).catch(() => null);
  if (r?.ok && (await r.json()).library.scannedAt) break;
  await new Promise((r2) => setTimeout(r2, 200));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 1, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.goto(`${BASE}/`);
  await page.screenshot({ path: `${OUT}/00-landing.png` });

  await page.goto(`${BASE}/admin`);
  await page.fill('input[type=password]', 'studio');
  await page.click('button[type=submit]');
  await page.waitForSelector('.tree-item');
  await page.screenshot({ path: `${OUT}/01-admin-root.png` });

  await page.goto(`${BASE}/admin#/lib/2.%20CLIENTS/BOMBERS%20ORIGINALS/1.%20MINI%20CAMPAGNES`);
  await page.waitForSelector('.board-section');
  await page.waitForTimeout(2500); // génération des aperçus
  await page.screenshot({ path: `${OUT}/02-admin-board.png` });

  // Sélection : un dossier + deux fichiers
  await page.hover('.tile.folder');
  await page.click('.tile.folder .tile-check');
  const tiles = page.locator('.board-section').nth(1).locator('.tile:not(.folder)');
  await tiles.nth(0).hover();
  await tiles.nth(0).locator('.tile-check').click();
  await tiles.nth(3).locator('.tile-check').click({ modifiers: ['Shift'] });
  await page.waitForSelector('.selbar.show');
  await page.screenshot({ path: `${OUT}/03-admin-selection.png` });

  // Visionneuse
  await tiles.nth(1).click();
  await page.waitForSelector('.lightbox img');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/04-admin-lightbox.png` });
  await page.keyboard.press('Escape');

  // Création du lien
  await page.click('.selbar .btn.primary');
  await page.waitForSelector('.modal');
  await page.fill('.modal textarea', 'Voici la sélection validée pour la campagne. Dites-moi si vous souhaitez d’autres formats.');
  await page.screenshot({ path: `${OUT}/05-admin-share-modal.png` });
  await page.click('.modal-foot .btn.primary');
  await page.waitForSelector('.linkbox input');
  const url = await page.inputValue('.linkbox input');
  await page.screenshot({ path: `${OUT}/06-admin-link.png` });
  await page.click('.modal-foot .btn:not(.ghost)');

  await page.goto(`${BASE}/admin#/shares`);
  await page.waitForSelector('.card');
  await page.screenshot({ path: `${OUT}/07-admin-shares.png` });

  await page.goto(`${BASE}/admin#/search/nyc`);
  await page.waitForSelector('.grid .tile');
  await page.screenshot({ path: `${OUT}/08-admin-search.png` });

  // Page de partage (nouveau contexte : visiteur)
  const guest = await browser.newContext({ viewport: { width: 1400, height: 940 }, locale: 'fr-FR' });
  const gp = await guest.newPage();
  gp.on('pageerror', (e) => errors.push(`share pageerror: ${e.message}`));
  gp.on('console', (m) => { if (m.type() === 'error') errors.push(`share console: ${m.text()}`); });
  await gp.goto(url);
  await gp.waitForSelector('.board-section');
  await gp.waitForTimeout(1500);
  await gp.screenshot({ path: `${OUT}/10-share-root.png`, fullPage: true });
  await gp.click('.board-section .tile.folder');
  await gp.waitForSelector('.crumbs');
  await gp.waitForTimeout(1200);
  await gp.screenshot({ path: `${OUT}/11-share-folder.png` });
  await gp.click('.grid .tile');
  await gp.waitForSelector('.lightbox img');
  await gp.waitForTimeout(600);
  await gp.screenshot({ path: `${OUT}/12-share-lightbox.png` });
  await gp.keyboard.press('Escape');

  // Mobile
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  const mp = await mobile.newPage();
  await mp.goto(url);
  await mp.waitForSelector('.board-section');
  await mp.waitForTimeout(1200);
  await mp.screenshot({ path: `${OUT}/13-share-mobile.png` });
  await mp.goto(`${BASE}/admin`);
  await mp.fill('input[type=password]', 'studio');
  await mp.click('button[type=submit]');
  await mp.waitForSelector('.topbar');
  await mp.goto(`${BASE}/admin#/lib/2.%20CLIENTS/BOMBERS%20ORIGINALS/1.%20MINI%20CAMPAGNES`);
  await mp.waitForSelector('.board-section');
  await mp.waitForTimeout(800);
  await mp.screenshot({ path: `${OUT}/14-admin-mobile.png` });

  // Page protégée par mot de passe
  const res = await fetch(`${BASE}/api/admin/shares`, { headers: { cookie: (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ') } });
  const first = (await res.json()).shares[0];
  await fetch(`${BASE}/api/admin/shares/${first.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ') }, body: JSON.stringify({ password: 'abc' }) });
  const g2 = await browser.newContext({ viewport: { width: 1200, height: 800 }, locale: 'fr-FR' });
  const g2p = await g2.newPage();
  await g2p.goto(url);
  await g2p.waitForSelector('.gate-box form');
  await g2p.screenshot({ path: `${OUT}/15-share-gate.png` });
  await g2p.fill('.gate-box input', 'abc');
  await g2p.click('.gate-box button');
  await g2p.waitForSelector('.board-section');

  console.log('Captures dans', OUT);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
if (errors.length) {
  console.error('Erreurs navigateur :\n' + errors.join('\n'));
  console.error(logs.split('\n').slice(-10).join('\n'));
  process.exit(1);
}
