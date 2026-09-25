// Test de fumée : démarre le serveur sur une bibliothèque de test et vérifie l'API de bout en bout.
// Usage : node test/smoke.mjs  (génère la bibliothèque si absente)
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;
const LIB = path.resolve('test/library');
const DATA = path.resolve('test/data-smoke');
const PASSWORD = 'studio-test';

if (!(await fs.stat(LIB).catch(() => null))) {
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['test/make-library.mjs', LIB], { stdio: 'inherit' });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error('génération échouée'))));
  });
}
await fs.rm(DATA, { recursive: true, force: true });

const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT), LIBRARY_ROOT: LIB, DATA_DIR: DATA, ADMIN_PASSWORD: PASSWORD, PUBLIC_ORIGIN: 'https://clients.example.test', SCAN_INTERVAL_MIN: '0', PREWARM_THUMBS: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (d) => { logs += d; });
server.stderr.on('data', (d) => { logs += d; });

const cookies = {};
async function call(url, { method = 'GET', body, form, jar = cookies, raw = false, headers = {} } = {}) {
  if (form) method = 'POST';
  const h = { ...headers };
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookie) h.cookie = cookie;
  let payload;
  if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  if (form) { h['content-type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString(); }
  const res = await fetch(BASE + url, { method, headers: h, body: payload, redirect: 'manual' });
  for (const sc of res.headers.getSetCookie?.() || []) {
    const [pair] = sc.split(';');
    const [k, v] = pair.split('=');
    jar[k] = v;
  }
  if (raw) return res;
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

const step = (name) => console.log(`  ✓ ${name}`);
let failed = false;

try {
  // Attente du démarrage et du scan.
  for (let i = 0; i < 100; i++) {
    const r = await call('/health').catch(() => null);
    if (r && r.status === 200 && r.data.library.scannedAt && !r.data.library.scanning) break;
    await new Promise((r2) => setTimeout(r2, 200));
  }
  const health = await call('/health');
  assert.equal(health.status, 200);
  assert.ok(health.data.library.files > 80, `fichiers indexés : ${health.data.library.files}`);
  step(`serveur démarré, ${health.data.library.files} fichiers indexés en ${health.data.library.lastScanMs} ms`);

  // Pages publiques
  assert.equal((await call('/')).status, 200);
  assert.equal((await call('/admin')).status, 200);
  assert.equal((await call('/s/inconnu')).status, 200); // la page charge puis affiche « introuvable »
  assert.equal((await call('/api/s/inconnu')).status, 404);
  step('pages publiques servies');

  // Espace studio : non connecté
  assert.equal((await call('/api/admin/dirs')).status, 401);
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { password: 'faux' } })).status, 401);
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { login: 'inconnu', password: PASSWORD } })).status, 401);
  const login = await call('/api/admin/login', { method: 'POST', body: { password: PASSWORD } });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.login, 'studio');
  assert.equal(login.data.user.role, 'owner');
  assert.ok(cookies.bz_studio, 'cookie de session');
  const me = await call('/api/admin/me');
  assert.equal(me.data.user.role, 'owner');
  step('connexion studio (compte maître)');

  // Comptes
  const badUser = await call('/api/admin/users', { method: 'POST', body: { login: 'Marie Dupont', password: 'x' } });
  assert.equal(badUser.status, 400);
  const created1 = await call('/api/admin/users', { method: 'POST', body: { login: 'Marie', name: 'Marie', password: 'motdepasse1', role: 'member' } });
  assert.equal(created1.status, 201, JSON.stringify(created1.data));
  assert.equal(created1.data.user.login, 'marie');
  assert.equal((await call('/api/admin/users', { method: 'POST', body: { login: 'marie', password: 'motdepasse1' } })).status, 400, 'doublon');
  const userList = await call('/api/admin/users');
  assert.equal(userList.data.users.length, 2);
  assert.ok(userList.data.users[0].master);
  const marie = {};
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { login: 'marie', password: 'faux' }, jar: marie })).status, 401);
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { login: 'MARIE ', password: 'motdepasse1' }, jar: marie })).status, 200);
  assert.equal((await call('/api/admin/dirs', { jar: marie })).status, 200, 'membre : bibliothèque accessible');
  assert.equal((await call('/api/admin/users', { jar: marie })).status, 403, 'membre : comptes interdits');
  const marieShare = await call('/api/admin/shares', { method: 'POST', body: { title: 'Par Marie', items: ['0. WORKSHOP'] }, jar: marie });
  assert.equal(marieShare.status, 201);
  assert.equal(marieShare.data.share.createdBy.login, 'marie');
  await call(`/api/admin/users/marie`, { method: 'PATCH', body: { password: 'motdepasse2' } });
  assert.equal((await call('/api/admin/dirs', { jar: marie })).status, 401, 'mot de passe changé : session invalidée');
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { login: 'marie', password: 'motdepasse2' }, jar: marie })).status, 200);
  await call(`/api/admin/users/marie`, { method: 'PATCH', body: { disabled: true } });
  assert.equal((await call('/api/admin/dirs', { jar: marie })).status, 401, 'compte désactivé');
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { login: 'marie', password: 'motdepasse2' }, jar: {} })).status, 401);
  assert.equal((await call('/api/admin/users/studio', { method: 'DELETE' })).status, 400, 'compte maître intouchable');
  assert.equal((await call('/api/admin/users/marie', { method: 'DELETE' })).status, 200);
  assert.equal((await call(`/api/admin/shares/${marieShare.data.share.id}`, { method: 'DELETE' })).status, 200);
  step('comptes : création, rôles, changement de mot de passe, désactivation, suppression');

  // Arbre et dossiers
  const dirs = await call('/api/admin/dirs');
  assert.equal(dirs.status, 200);
  const names = dirs.data.children.map((c) => c.name);
  assert.ok(names.includes('2. CLIENTS') && names.includes('Été à Paris'), names.join(','));
  assert.ok(!names.includes('@eaDir') && !names.includes('lien-interdit'), 'dossiers ignorés');
  const camp = '2. CLIENTS/BOMBERS ORIGINALS/1. MINI CAMPAGNES';
  const dir = await call(`/api/admin/dir?p=${encodeURIComponent(camp)}`);
  assert.equal(dir.status, 200);
  assert.equal(dir.data.dirs.length, 4);
  assert.equal(dir.data.files.length, 3);
  assert.equal(dir.data.breadcrumb.length, 4);
  const nyc = dir.data.dirs.find((d) => d.name === 'NYC SUMMER');
  assert.equal(nyc.count, 19);
  assert.ok(nyc.cover && nyc.cover.kind === 'image');
  assert.equal(nyc.preview.length, 19);
  const festival = dir.data.dirs.find((d) => d.name === 'Festival Outfits');
  assert.equal(festival.count, 23);
  assert.equal(festival.dirCount, 2);
  step('navigation hiérarchique (sous-dossiers, compteurs récursifs, couvertures)');

  // Sécurité des chemins
  for (const bad of ['../etc/passwd', '..', 'a/../../b', '/etc/passwd', 'lien-interdit/passwd', '.DS_Store', '2. CLIENTS/../../server.mjs']) {
    const r = await call(`/api/admin/file?p=${encodeURIComponent(bad)}`);
    assert.ok([400, 404].includes(r.status), `${bad} → ${r.status}`);
  }
  assert.equal((await call('/api/admin/file?p=%2e%2e%2fpackage.json')).status, 400);
  step('chemins hors bibliothèque refusés');

  // Aperçus
  const imgFile = nyc.preview.find((f) => f.kind === 'image');
  const vidFile = nyc.preview.find((f) => f.kind === 'video');
  const pdfFile = dir.data.files.find((f) => f.kind === 'pdf');
  const psdFile = dir.data.files.find((f) => f.ext === 'psd');
  for (const [f, w] of [[imgFile, 480], [imgFile, 1600], [vidFile, 480], [pdfFile, 480]]) {
    const r = await call(`/api/admin/thumb?p=${encodeURIComponent(f.path)}&w=${w}&v=1`, { raw: true });
    assert.equal(r.status, 200, `${f.name} ${w}`);
    assert.equal(r.headers.get('content-type'), 'image/webp');
    const buf = Buffer.from(await r.arrayBuffer());
    assert.ok(buf.length > 500, `${f.name} taille ${buf.length}`);
  }
  const psd = await call(`/api/admin/thumb?p=${encodeURIComponent(psdFile.path)}&w=480`);
  assert.equal(psd.status, 404);
  const psd2 = await call(`/api/admin/thumb?p=${encodeURIComponent(psdFile.path)}&w=480`);
  assert.equal(psd2.status, 404);
  step('aperçus image, vidéo, PDF ; format illisible marqué en échec');

  // Fichier original, Range, téléchargement
  const orig = await call(`/api/admin/file?p=${encodeURIComponent(vidFile.path)}`, { raw: true, headers: { range: 'bytes=0-99' } });
  assert.equal(orig.status, 206);
  assert.equal(orig.headers.get('accept-ranges'), 'bytes');
  assert.ok(orig.headers.get('content-disposition').startsWith('inline'));
  const dl = await call(`/api/admin/file?p=${encodeURIComponent(imgFile.path)}&dl=1`, { raw: true });
  assert.ok(dl.headers.get('content-disposition').startsWith('attachment'));
  const txt = await call(`/api/admin/file?p=${encodeURIComponent(camp + '/Notes.txt')}`, { raw: true });
  assert.ok(txt.headers.get('content-disposition').startsWith('attachment'), 'types non média forcés en pièce jointe');
  step('fichiers originaux (Range, inline/attachment)');

  // Recherche
  const search = await call('/api/admin/search?q=nyc%20005');
  assert.equal(search.data.files.length, 1);
  const search2 = await call('/api/admin/search?q=ete');
  assert.ok(search2.data.dirs.some((d) => d.name === 'Été à Paris'), 'recherche sans accents');
  step('recherche');

  // Archive zip
  const zip = await call(`/api/admin/zip?p=${encodeURIComponent(camp + '/BTS')}`, { raw: true });
  assert.equal(zip.status, 200);
  assert.equal(zip.headers.get('content-type'), 'application/zip');
  const zipBuf = Buffer.from(await zip.arrayBuffer());
  assert.equal(zipBuf.readUInt32LE(0), 0x04034b50, 'signature zip');
  assert.ok(zipBuf.includes(Buffer.from('BTS_001.jpg')), 'entrée sans préfixe pour un dossier unique');
  const zipSel = await call('/api/admin/zip', { raw: true, form: { paths: JSON.stringify([imgFile.path, camp + '/BTS']), name: 'sel' } });
  assert.equal(zipSel.status, 200);
  const zipSelBuf = Buffer.from(await zipSel.arrayBuffer());
  assert.ok(zipSelBuf.includes(Buffer.from('BTS/BTS_001.jpg')));
  step('archives zip (dossier, sélection)');

  // Partages
  const bad = await call('/api/admin/shares', { method: 'POST', body: { title: 'Vide', items: ['nexistepas'] } });
  assert.equal(bad.status, 400);
  const created = await call('/api/admin/shares', { method: 'POST', body: {
    title: 'Mini campagnes — sélection', message: 'Bonjour !', items: [camp + '/NYC SUMMER', camp + '/NYC SUMMER/NYC_001.jpg', camp + '/Brief mini campagnes.pdf', camp + '/Festival Outfits/Selection 2/Festival_3.jpg'],
  } });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const share = created.data.share;
  assert.equal(share.items.length, 3, 'dédoublonnage : le fichier inclus dans le dossier est retiré');
  assert.ok(created.data.url.startsWith('https://clients.example.test/s/'));
  assert.equal(share.id.length, 16);
  step('création d’un lien (dédoublonnage, origine publique)');

  const guest = {};
  const info = await call(`/api/s/${share.id}`, { jar: guest });
  assert.equal(info.status, 200);
  assert.equal(info.data.count, 21);
  assert.equal(info.data.singleDir, false);
  const root = await call(`/api/s/${share.id}/tree?p=`, { jar: guest });
  assert.equal(root.data.dirs.length, 1);
  assert.equal(root.data.files.length, 2);
  const sub = await call(`/api/s/${share.id}/tree?p=${encodeURIComponent(camp + '/NYC SUMMER')}`, { jar: guest });
  assert.equal(sub.status, 200);
  assert.equal(sub.data.files.length, 19);
  assert.equal(sub.data.breadcrumb.length, 2);
  assert.equal(sub.data.breadcrumb[0].name, share.title);
  const forbidden = await call(`/api/s/${share.id}/tree?p=${encodeURIComponent(camp + '/BTS')}`, { jar: guest });
  assert.equal(forbidden.status, 404, 'dossier non partagé inaccessible');
  const forbiddenFile = await call(`/s/${share.id}/file?p=${encodeURIComponent(camp + '/BTS/BTS_001.jpg')}`, { jar: guest });
  assert.equal(forbiddenFile.status, 404, 'fichier non partagé inaccessible');
  const okFile = await call(`/s/${share.id}/file?p=${encodeURIComponent(camp + '/NYC SUMMER/NYC_002.jpg')}`, { jar: guest, raw: true });
  assert.equal(okFile.status, 200);
  const okThumb = await call(`/api/s/${share.id}/thumb?p=${encodeURIComponent(camp + '/NYC SUMMER/NYC_002.jpg')}&w=480`, { jar: guest, raw: true });
  assert.equal(okThumb.status, 200);
  const zipAll = await call(`/s/${share.id}/zip`, { jar: guest, raw: true });
  assert.equal(zipAll.status, 200);
  const zipAllBuf = Buffer.from(await zipAll.arrayBuffer());
  assert.ok(zipAllBuf.includes(Buffer.from('NYC SUMMER/NYC_001.jpg')) && zipAllBuf.includes(Buffer.from('Brief mini campagnes.pdf')));
  const zipSub = await call(`/s/${share.id}/zip?p=${encodeURIComponent(camp + '/BTS')}`, { jar: guest });
  assert.equal(zipSub.status, 404);
  const zipPart = await call(`/s/${share.id}/zip`, { jar: guest, raw: true, form: { paths: JSON.stringify([camp + '/NYC SUMMER/NYC_003.jpg', camp + '/BTS/BTS_001.jpg']) } });
  const zipPartBuf = Buffer.from(await zipPart.arrayBuffer());
  assert.ok(zipPartBuf.includes(Buffer.from('NYC_003.jpg')) && !zipPartBuf.includes(Buffer.from('BTS_001.jpg')), 'sélection filtrée au périmètre du partage');
  step('consultation côté client (périmètre strict, aperçus, zip)');

  // Partage d'un seul dossier : ouverture directe
  const single = await call('/api/admin/shares', { method: 'POST', body: { title: 'BTS', items: [camp + '/BTS'], allowDownload: false, password: 'secret' } });
  const s2 = single.data.share;
  const g2 = {};
  const locked = await call(`/api/s/${s2.id}`, { jar: g2 });
  assert.equal(locked.status, 401);
  assert.equal(locked.data.needsPassword, true);
  assert.equal((await call(`/api/s/${s2.id}/tree?p=`, { jar: g2 })).status, 401);
  assert.equal((await call(`/api/s/${s2.id}/unlock`, { method: 'POST', body: { password: 'mauvais' }, jar: g2 })).status, 401);
  assert.equal((await call(`/api/s/${s2.id}/unlock`, { method: 'POST', body: { password: 'secret' }, jar: g2 })).status, 200);
  assert.ok(g2[`bz_s_${s2.id}`], 'cookie de partage');
  const singleInfo = await call(`/api/s/${s2.id}`, { jar: g2 });
  assert.equal(singleInfo.status, 200);
  assert.equal(singleInfo.data.singleDir, true);
  const singleRoot = await call(`/api/s/${s2.id}/tree?p=`, { jar: g2 });
  assert.equal(singleRoot.data.files.length, 10);
  assert.equal(singleRoot.data.name, 'BTS');
  const noDl = await call(`/s/${s2.id}/file?p=${encodeURIComponent(camp + '/BTS/BTS_001.jpg')}&dl=1`, { jar: g2 });
  assert.equal(noDl.status, 403);
  assert.equal((await call(`/s/${s2.id}/zip`, { jar: g2 })).status, 403);
  step('mot de passe, dossier unique, téléchargement désactivé');

  // Gestion : modification, désactivation, expiration, suppression
  const list = await call('/api/admin/shares');
  assert.equal(list.data.shares.length, 2);
  assert.ok(list.data.shares[0].cover, 'couverture');
  const patched = await call(`/api/admin/shares/${s2.id}`, { method: 'PATCH', body: { disabled: true } });
  assert.equal(patched.data.share.disabled, true);
  assert.equal((await call(`/api/s/${s2.id}`, { jar: g2 })).status, 404);
  await call(`/api/admin/shares/${s2.id}`, { method: 'PATCH', body: { disabled: false, expiresAt: new Date(Date.now() - 1000).toISOString() } });
  assert.equal((await call(`/api/s/${s2.id}`, { jar: g2 })).status, 410);
  await call(`/api/admin/shares/${s2.id}`, { method: 'PATCH', body: { expiresAt: null, password: null } });
  assert.equal((await call(`/api/s/${s2.id}`, { jar: {} })).status, 200, 'mot de passe retiré');
  assert.equal((await call(`/api/admin/shares/${s2.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await call(`/api/s/${s2.id}`, { jar: g2 })).status, 404);
  const stored = JSON.parse(await fs.readFile(path.join(DATA, 'shares.json'), 'utf8'));
  assert.equal(stored.shares.length, 1);
  assert.equal(stored.shares[0].views >= 1, true);
  step('modification, désactivation, expiration, suppression, persistance');

  // Déconnexion
  await call('/api/admin/logout', { method: 'POST' });
  assert.equal((await call('/api/admin/dirs')).status, 401);
  step('déconnexion');

  console.log('\nTous les tests passent.');
} catch (err) {
  failed = true;
  console.error('\nÉCHEC :', err.message);
  console.error(logs.split('\n').slice(-30).join('\n'));
} finally {
  server.kill('SIGTERM');
}
process.exit(failed ? 1 : 0);
