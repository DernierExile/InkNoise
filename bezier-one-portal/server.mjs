// Bézier ONE — portail client sur NAS.
// Point d'entrée : configuration, index de la bibliothèque, aperçus, partages, API et pages.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { Library } from './src/library.mjs';
import { Thumbs, SIZES } from './src/thumbs.mjs';
import { Shares } from './src/shares.mjs';
import { Auth } from './src/auth.mjs';
import { Users } from './src/users.mjs';
import { streamZip, safeZipName } from './src/zip.mjs';
import { safeRel, isWithin, contentDisposition, basename, dirname } from './src/util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf8'));

// ---------- Configuration ----------
const config = {
  port: Number(process.env.PORT || 8080),
  libraryRoot: path.resolve(process.env.LIBRARY_ROOT || '/library'),
  dataDir: path.resolve(process.env.DATA_DIR || '/data'),
  publicOrigin: String(process.env.PUBLIC_ORIGIN || 'https://clients.thierrybezier.com').replace(/\/+$/, ''),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  brand: process.env.BRAND_NAME || 'Bézier ONE',
  scanIntervalMin: Number(process.env.SCAN_INTERVAL_MIN || 15),
  thumbConcurrency: Math.max(1, Number(process.env.THUMB_CONCURRENCY || 2)),
  prewarm: process.env.PREWARM_THUMBS !== '0',
  tools: { ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg', pdftoppm: process.env.PDFTOPPM_PATH || 'pdftoppm' },
};

const stamp = () => new Date().toISOString().slice(11, 19);
const log = {
  info: (...a) => console.log(stamp(), ...a),
  warn: (...a) => console.warn(stamp(), ...a),
  error: (...a) => console.error(stamp(), ...a),
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

// ---------- Services ----------
await fs.mkdir(config.dataDir, { recursive: true });
try {
  await fs.access(config.libraryRoot);
} catch {
  log.error(`[init] bibliothèque introuvable : ${config.libraryRoot}`);
  process.exit(1);
}

const library = new Library({ root: config.libraryRoot, dataDir: config.dataDir, log });
const thumbs = new Thumbs({ dataDir: config.dataDir, library, concurrency: config.thumbConcurrency, tools: config.tools, log });
const shares = new Shares({ dataDir: config.dataDir, log });
const users = new Users({ dataDir: config.dataDir, masterPassword: config.adminPassword, log });
const auth = new Auth({ dataDir: config.dataDir, users, log });

await users.load();
await auth.init();
await thumbs.init();
await shares.load();
await library.loadCache();

if (config.prewarm) {
  library.onChange(() => {
    const n = thumbs.prewarm(library.filesUnder(''));
    log.info(`[thumbs] pré-génération lancée : ${n} fichier(s) à vérifier`);
  });
}
library.scan(); // en tâche de fond : le cache (s'il existe) est servi immédiatement
if (config.scanIntervalMin > 0) {
  setInterval(() => library.scan(), config.scanIntervalMin * 60 * 1000).unref();
}

// ---------- Application ----------
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.set('etag', 'weak');

const publicDir = path.join(__dirname, 'public');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const sendPage = (res, file) => res.sendFile(path.join(publicDir, file), {
  headers: {
    'Cache-Control': 'no-cache',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'",
  },
});

app.get('/', (req, res) => sendPage(res, 'index.html'));
app.get('/health', (req, res) => res.json({ ok: true, version: pkg.version, setupRequired: users.setupRequired, library: library.stats() }));
app.get(['/admin', '/admin/'], (req, res) => sendPage(res, 'admin/index.html'));
app.get('/s/:id', (req, res) => sendPage(res, 'share/index.html'));
app.use('/assets', express.static(path.join(publicDir, 'assets'), { index: false, cacheControl: true, maxAge: 0, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));
app.use('/admin', express.static(path.join(publicDir, 'admin'), { index: false, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));
app.use('/share', express.static(path.join(publicDir, 'share'), { index: false, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));

// ---------- Helpers ----------
function relParam(value, { allowRoot = true } = {}) {
  const rel = safeRel(value);
  if (rel == null || (!allowRoot && rel === '')) throw httpError(400, 'Chemin invalide');
  return rel;
}

function requireFile(rel) {
  const file = library.getFile(rel);
  if (!file) throw httpError(404, 'Fichier introuvable');
  return file;
}

function widthParam(value) {
  return Number(value) >= 1000 ? SIZES.large : SIZES.small;
}

async function sendThumb(req, res, file) {
  const width = widthParam(req.query.w);
  const thumbPath = await thumbs.get(file, width);
  if (!thumbPath) throw httpError(404, 'Aperçu indisponible');
  res.sendFile(thumbPath, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': req.query.v ? 'private, max-age=2592000, immutable' : 'private, max-age=3600',
    },
  });
}

const INLINE_KINDS = new Set(['image', 'video', 'audio', 'pdf']);

function sendLibraryFile(req, res, file) {
  const download = req.query.dl === '1' || !INLINE_KINDS.has(file.kind);
  const headers = {
    'Content-Disposition': contentDisposition(download ? 'attachment' : 'inline', file.name),
    'Cache-Control': 'private, max-age=3600',
  };
  if (file.ext === 'svg') headers['Content-Security-Policy'] = 'sandbox';
  res.sendFile(file.path, {
    root: config.libraryRoot,
    dotfiles: 'deny',
    acceptRanges: true,
    lastModified: true,
    headers,
  });
}

// Entrées d'archive pour une liste d'éléments (dossiers => contenu récursif).
function zipEntries(items, { flattenSingleDir = true } = {}) {
  const entries = [];
  const seen = new Set();
  const names = new Set();
  const add = (file, name) => {
    if (seen.has(file.path)) return;
    seen.add(file.path);
    const abs = library.absPath(file.path);
    if (!abs) return;
    // Deux fichiers homonymes venant de dossiers différents : on suffixe le second.
    let unique = name;
    for (let i = 2; names.has(unique.toLowerCase()); i++) {
      unique = name.replace(/(\.[^./]+)?$/, ` (${i})$1`);
    }
    names.add(unique.toLowerCase());
    entries.push({ abs, name: unique });
  };
  for (const item of items) {
    if (library.hasDir(item)) {
      const base = item === '' ? '' : dirname(item);
      const prefix = base ? base + '/' : '';
      for (const file of library.filesUnder(item)) {
        let name = file.path.startsWith(prefix) ? file.path.slice(prefix.length) : file.path;
        if (flattenSingleDir && items.length === 1 && item !== '') name = name.slice(basename(item).length + 1);
        add(file, name);
      }
    } else {
      const file = library.getFile(item);
      if (file) add(file, file.name);
    }
  }
  return entries;
}

function parsePaths(body) {
  let raw = body?.paths;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { throw httpError(400, 'Sélection invalide'); }
  }
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 5000) throw httpError(400, 'Sélection invalide');
  return raw.map((p) => relParam(p, { allowRoot: false }));
}

// ---------- Espace studio ----------
const admin = express.Router();

const notConfigured = () => Object.assign(httpError(503, "L'espace studio n'est pas encore initialisé."), { setupRequired: true });

admin.post('/setup', async (req, res) => {
  if (!users.setupRequired) throw httpError(403, 'Le studio est déjà initialisé.');
  if (auth.throttled(req)) throw httpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  let user;
  try {
    user = await users.setup(req.body || {});
  } catch (err) {
    if (err.status === 401) auth.recordAttempt(req, false);
    throw err;
  }
  auth.loginAdmin(req, res, user.login, req.body.password);
  res.status(201).json({ ok: true, user });
});

admin.post('/login', (req, res) => {
  if (!auth.adminEnabled) throw notConfigured();
  if (auth.throttled(req)) throw httpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  const user = auth.loginAdmin(req, res, req.body?.login, req.body?.password);
  if (!user) throw httpError(401, 'Identifiant ou mot de passe incorrect');
  log.info(`[auth] connexion de ${user.login}`);
  res.json({ ok: true, user });
});

admin.post('/logout', (req, res) => {
  auth.logoutAdmin(req, res);
  res.json({ ok: true });
});

admin.use((req, res, next) => {
  req.user = auth.currentUser(req);
  if (!req.user) {
    return next(auth.adminEnabled ? httpError(401, 'Connexion requise') : notConfigured());
  }
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

const requireOwner = (req, res, next) => {
  if (req.user.role !== 'owner') return next(httpError(403, 'Réservé aux propriétaires du studio'));
  next();
};

admin.get('/me', (req, res) => {
  res.json({ ok: true, user: req.user, brand: config.brand, publicOrigin: config.publicOrigin, version: pkg.version, library: library.stats() });
});

// ---------- Comptes ----------
admin.get('/users', requireOwner, (req, res) => {
  res.json({ users: users.list() });
});

admin.post('/users', requireOwner, async (req, res) => {
  const user = await users.create(req.body || {});
  log.info(`[users] compte créé : ${user.login} (${user.role}) par ${req.user.login}`);
  res.status(201).json({ user });
});

admin.patch('/users/:login', requireOwner, async (req, res) => {
  const user = await users.update(req.params.login, req.body || {});
  if (!user) throw httpError(404, 'Compte introuvable');
  res.json({ user });
});

admin.delete('/users/:login', requireOwner, async (req, res) => {
  if (Users.normalizeLogin(req.params.login) === req.user.login) throw httpError(400, 'Impossible de supprimer son propre compte.');
  if (!(await users.remove(req.params.login))) throw httpError(404, 'Compte introuvable');
  log.info(`[users] compte supprimé : ${req.params.login} par ${req.user.login}`);
  res.json({ ok: true });
});

admin.get('/status', (req, res) => {
  res.json({ library: library.stats(), thumbs: thumbs.status(), shares: shares.map.size });
});

admin.post('/rescan', async (req, res) => {
  const started = !library.scanning;
  library.scan();
  res.json({ ok: true, started, scanning: true });
});

admin.post('/prewarm', (req, res) => {
  const n = thumbs.prewarm(library.filesUnder(''));
  res.json({ ok: true, files: n });
});

admin.get('/dirs', (req, res) => {
  res.json(library.tree(''));
});

admin.get('/dir', (req, res) => {
  const rel = relParam(req.query.p);
  const dir = library.getDir(rel);
  if (!dir) throw httpError(404, 'Dossier introuvable');
  res.json(dir);
});

admin.get('/files', (req, res) => {
  const rel = relParam(req.query.p);
  if (!library.hasDir(rel)) throw httpError(404, 'Dossier introuvable');
  res.json({ path: rel, files: library.filesUnder(rel) });
});

admin.get('/search', (req, res) => {
  res.json(library.search(String(req.query.q || ''), 300));
});

admin.get('/thumb', async (req, res) => {
  await sendThumb(req, res, requireFile(relParam(req.query.p, { allowRoot: false })));
});

admin.get('/file', (req, res) => {
  sendLibraryFile(req, res, requireFile(relParam(req.query.p, { allowRoot: false })));
});

admin.get('/zip', (req, res) => {
  const rel = relParam(req.query.p);
  if (!library.hasDir(rel)) throw httpError(404, 'Dossier introuvable');
  const name = rel ? basename(rel) : config.brand;
  streamZip(res, `${safeZipName(name)}.zip`, zipEntries([rel]), { log });
});

admin.post('/zip', (req, res) => {
  const paths = parsePaths(req.body);
  const entries = zipEntries(paths, { flattenSingleDir: false });
  if (entries.length === 0) throw httpError(404, 'Aucun fichier');
  streamZip(res, `${safeZipName(req.body?.name, 'selection')}.zip`, entries, { log });
});

// Enrichit chaque lien d'une couverture et du nombre d'éléments disparus de la bibliothèque.
function decorateShare(view) {
  let cover = null;
  let missing = 0;
  for (const item of view.items) {
    if (library.hasDir(item)) {
      if (!cover) cover = library.summary(item).cover;
    } else {
      const f = library.getFile(item);
      if (!f) missing++;
      else if (!cover && f.preview) cover = f;
    }
  }
  return { ...view, cover, missing };
}

admin.get('/shares', (req, res) => {
  res.json({ shares: shares.list().map(decorateShare), publicOrigin: config.publicOrigin });
});

admin.post('/shares', async (req, res) => {
  const body = req.body || {};
  const items = Shares.normalizeItems(body.items).filter((p) => library.hasDir(p) || library.getFile(p));
  const share = await shares.create({ ...body, items, createdBy: req.user });
  log.info(`[shares] créé ${share.id} « ${share.title} » (${share.items.length} élément(s)) par ${req.user.login}`);
  res.status(201).json({ share: shares.publicView(share, { admin: true }), url: `${config.publicOrigin}/s/${share.id}` });
});

admin.get('/shares/:id', (req, res) => {
  const share = shares.get(req.params.id);
  if (!share) throw httpError(404, 'Lien introuvable');
  res.json({ share: shares.publicView(share, { admin: true }), url: `${config.publicOrigin}/s/${share.id}` });
});

admin.patch('/shares/:id', async (req, res) => {
  const share = await shares.update(req.params.id, req.body || {});
  if (!share) throw httpError(404, 'Lien introuvable');
  res.json({ share: shares.publicView(share, { admin: true }), url: `${config.publicOrigin}/s/${share.id}` });
});

admin.delete('/shares/:id', async (req, res) => {
  if (!(await shares.remove(req.params.id))) throw httpError(404, 'Lien introuvable');
  log.info(`[shares] supprimé ${req.params.id}`);
  res.json({ ok: true });
});

app.use('/api/admin', admin);

// ---------- Partages (côté client) ----------
function loadShare(req, { requireAccess = true } = {}) {
  const share = shares.get(String(req.params.id || ''));
  if (!share || share.disabled) throw httpError(404, "Ce lien n'existe pas ou a été désactivé.");
  if (shares.isExpired(share)) throw httpError(410, 'Ce lien a expiré.');
  if (requireAccess && !auth.hasShareAccess(req, share)) throw Object.assign(httpError(401, 'Mot de passe requis'), { needsPassword: true });
  return share;
}

// Un seul dossier partagé : le lien s'ouvre directement dedans.
function shareRootDir(share) {
  return share.items.length === 1 && library.hasDir(share.items[0]) ? share.items[0] : null;
}

function shareCount(share) {
  let n = 0;
  for (const item of share.items) {
    if (library.hasDir(item)) n += library.dirs.get(item).count;
    else if (library.getFile(item)) n += 1;
  }
  return n;
}

function shareTree(share, rel) {
  const rootDir = shareRootDir(share);
  const rootCrumb = { path: '', name: share.title };
  if (rel === '' || (rootDir != null && rel === rootDir)) {
    if (rootDir != null) {
      const dir = library.getDir(rootDir);
      return { ...dir, path: '', name: share.title, breadcrumb: [rootCrumb] };
    }
    const dirs = [];
    const files = [];
    for (const item of share.items) {
      if (library.hasDir(item)) {
        const d = library.getDir(item, { previewLimit: 24 });
        dirs.push({ ...library.summary(item), preview: d.files.slice(0, 24), fileCount: d.files.length });
      } else {
        const f = library.getFile(item);
        if (f) files.push(f);
      }
    }
    return { path: '', name: share.title, count: shareCount(share), dirs, files, breadcrumb: [rootCrumb] };
  }
  if (!shares.covers(share, rel)) throw httpError(404, 'Dossier introuvable');
  const dir = library.getDir(rel);
  if (!dir) throw httpError(404, 'Dossier introuvable');
  const item = share.items.find((i) => isWithin(i, rel));
  const crumbs = library.breadcrumb(rel).filter((c) => isWithin(item, c.path) && c.path !== rootDir);
  return { ...dir, breadcrumb: [rootCrumb, ...crumbs] };
}

function shareFile(share, rel) {
  const file = requireFile(rel);
  if (!shares.covers(share, rel)) throw httpError(404, 'Fichier introuvable');
  return file;
}

app.get('/api/s/:id', (req, res) => {
  const share = loadShare(req, { requireAccess: false });
  if (!auth.hasShareAccess(req, share)) {
    return res.status(401).json({ error: 'Mot de passe requis', needsPassword: true, title: share.title, brand: config.brand });
  }
  shares.recordView(share);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ brand: config.brand, share: shares.publicView(share), count: shareCount(share), singleDir: shareRootDir(share) != null });
});

app.post('/api/s/:id/unlock', (req, res) => {
  const share = loadShare(req, { requireAccess: false });
  if (auth.throttled(req)) throw httpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  const ok = shares.checkPassword(share, req.body?.password);
  auth.recordAttempt(req, ok);
  if (!ok) throw httpError(401, 'Mot de passe incorrect');
  if (share.passwordHash) auth.grantShareAccess(req, res, share);
  res.json({ ok: true });
});

app.get('/api/s/:id/tree', (req, res) => {
  const share = loadShare(req);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(shareTree(share, relParam(req.query.p)));
});

app.get('/api/s/:id/thumb', async (req, res) => {
  const share = loadShare(req);
  await sendThumb(req, res, shareFile(share, relParam(req.query.p, { allowRoot: false })));
});

app.get('/s/:id/file', (req, res) => {
  const share = loadShare(req);
  const file = shareFile(share, relParam(req.query.p, { allowRoot: false }));
  if (req.query.dl === '1' && !share.allowDownload) throw httpError(403, 'Téléchargement désactivé pour ce lien');
  sendLibraryFile(req, res, file);
});

app.get('/s/:id/zip', (req, res) => {
  const share = loadShare(req);
  if (!share.allowDownload) throw httpError(403, 'Téléchargement désactivé pour ce lien');
  const rel = relParam(req.query.p);
  let items;
  let name = share.title;
  if (rel === '') {
    items = share.items;
  } else {
    if (!shares.covers(share, rel) || !library.hasDir(rel)) throw httpError(404, 'Dossier introuvable');
    items = [rel];
    name = basename(rel);
  }
  const entries = zipEntries(items);
  if (entries.length === 0) throw httpError(404, 'Aucun fichier');
  streamZip(res, `${safeZipName(name)}.zip`, entries, { log });
});

app.post('/s/:id/zip', (req, res) => {
  const share = loadShare(req);
  if (!share.allowDownload) throw httpError(403, 'Téléchargement désactivé pour ce lien');
  const paths = parsePaths(req.body).filter((p) => shares.covers(share, p));
  const entries = zipEntries(paths, { flattenSingleDir: false });
  if (entries.length === 0) throw httpError(404, 'Aucun fichier');
  streamZip(res, `${safeZipName(share.title)} - selection.zip`, entries, { log });
});

// ---------- Erreurs ----------
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Introuvable' });
  res.status(404);
  sendPage(res, '404.html');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) log.error(`[http] ${req.method} ${req.originalUrl} :`, err);
  if (res.headersSent) return res.destroy();
  const body = { error: err.message || 'Erreur' };
  if (err.needsPassword) body.needsPassword = true;
  if (err.setupRequired) body.setupRequired = true;
  if (req.path.startsWith('/api/') || req.method !== 'GET') return res.status(status).json(body);
  res.status(status);
  if (status === 404 || status === 410) return sendPage(res, '404.html');
  res.type('text/plain').send(body.error);
});

const server = app.listen(config.port, () => {
  log.info(`[init] ${config.brand} v${pkg.version} — port ${config.port} — bibliothèque ${config.libraryRoot} — origine ${config.publicOrigin}`);
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    log.info(`[init] arrêt (${signal})`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
