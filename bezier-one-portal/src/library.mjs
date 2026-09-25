// Index en mémoire de la bibliothèque (montée en lecture seule).
// Un scan complet construit deux tables (dossiers, fichiers) puis les échange d'un coup :
// l'application reste servie pendant le scan. Un cache JSON permet un démarrage instantané.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  kindOf, extOf, isPreviewable, normalizeText, naturalCompare,
  atomicWriteJson, readJson, resolveInRoot, basename, pLimit,
} from './util.mjs';

const IGNORED_NAMES = new Set([
  '@eaDir', '#recycle', '#snapshot', 'Thumbs.db', 'desktop.ini', '$RECYCLE.BIN',
  'System Volume Information', 'lost+found', '@Recycle', '.@__thumb', 'node_modules',
]);
const isIgnored = (name) => name.startsWith('.') || name.startsWith('~$') || IGNORED_NAMES.has(name);

const COVER_PRIORITY = { image: 0, video: 1, pdf: 2, design: 3 };

function makeFile(rel, name, stat) {
  const ext = extOf(name);
  const kind = kindOf(name);
  return {
    path: rel,
    name,
    ext,
    kind,
    size: stat.size,
    mtime: Math.round(stat.mtimeMs),
    preview: isPreviewable(kind, ext),
  };
}

export class Library {
  constructor({ root, dataDir, log = console }) {
    this.root = root;
    this.log = log;
    this.cacheFile = path.join(dataDir, 'index.json');
    this.dirs = new Map();
    this.files = new Map();
    this.scannedAt = null;
    this.scanning = false;
    this.scanError = null;
    this.lastScanMs = 0;
    this.rescanRequested = false;
    this.lastSignature = null;
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ---------- Cache ----------
  async loadCache() {
    const cached = await readJson(this.cacheFile, null);
    if (!cached || !Array.isArray(cached.dirs) || !Array.isArray(cached.files)) return false;
    this.dirs = new Map(cached.dirs.map((d) => [d.path, d]));
    this.files = new Map(cached.files.map((f) => [f.path, f]));
    this.scannedAt = cached.scannedAt || null;
    this.log.info(`[library] cache chargé : ${this.dirs.size} dossiers, ${this.files.size} fichiers`);
    return true;
  }

  async saveCache() {
    await atomicWriteJson(this.cacheFile, {
      scannedAt: this.scannedAt,
      dirs: [...this.dirs.values()],
      files: [...this.files.values()],
    });
  }

  // ---------- Scan ----------
  async scan() {
    if (this.scanning) {
      this.rescanRequested = true;
      return false;
    }
    this.scanning = true;
    this.scanError = null;
    const t0 = Date.now();
    try {
      const { dirs, files } = await this.walk();
      if (files.size === 0 && this.files.size > 0) {
        this.log.warn('[library] scan vide alors que l’index précédent contenait des fichiers : montage absent ?');
      }
      const signature = this.signature(files);
      const changed = signature !== this.lastSignature;
      this.dirs = dirs;
      this.files = files;
      this.lastSignature = signature;
      this.scannedAt = new Date().toISOString();
      this.lastScanMs = Date.now() - t0;
      this.log.info(`[library] scan terminé en ${this.lastScanMs} ms : ${dirs.size} dossiers, ${files.size} fichiers${changed ? '' : ' (inchangé)'}`);
      if (changed) {
        await this.saveCache().catch((err) => this.log.warn('[library] cache non écrit :', err.message));
        for (const fn of this.listeners) {
          try { fn(); } catch (err) { this.log.warn('[library] listener :', err.message); }
        }
      }
      return true;
    } catch (err) {
      this.scanError = err.message;
      this.log.error('[library] scan échoué :', err);
      return false;
    } finally {
      this.scanning = false;
      if (this.rescanRequested) {
        this.rescanRequested = false;
        setTimeout(() => this.scan(), 1000);
      }
    }
  }

  // Empreinte bon marché du contenu : évite de réécrire le cache et de relancer les
  // traitements de fond quand rien n'a changé.
  signature(files) {
    let size = 0;
    let maxMtime = 0;
    for (const f of files.values()) { size += f.size; if (f.mtime > maxMtime) maxMtime = f.mtime; }
    return `${files.size}:${size}:${maxMtime}`;
  }

  async walk() {
    const dirs = new Map();
    const files = new Map();
    const limit = pLimit(16);
    const order = []; // ordre BFS : parents avant enfants

    const rootStat = await fs.stat(this.root);
    dirs.set('', { path: '', name: 'Bibliothèque', mtime: Math.round(rootStat.mtimeMs), dirs: [], files: [] });
    order.push('');

    const queue = [''];
    while (queue.length) {
      const rel = queue.shift();
      const node = dirs.get(rel);
      const abs = rel ? path.join(this.root, ...rel.split('/')) : this.root;
      let entries;
      try {
        entries = await fs.readdir(abs, { withFileTypes: true });
      } catch (err) {
        this.log.warn(`[library] lecture impossible : ${rel || '/'} (${err.code})`);
        continue;
      }
      const statJobs = [];
      for (const entry of entries) {
        const name = entry.name;
        if (isIgnored(name)) continue;
        const childRel = rel ? `${rel}/${name}` : name;
        const childAbs = path.join(abs, name);
        let isDir = entry.isDirectory();
        let isFile = entry.isFile();
        if (!isDir && !isFile) {
          if (entry.isSymbolicLink()) continue; // jamais suivre les liens : reste dans la bibliothèque
          try {
            const st = await fs.lstat(childAbs);
            isDir = st.isDirectory();
            isFile = st.isFile();
          } catch { continue; }
        }
        if (isDir) {
          let st;
          try { st = await fs.stat(childAbs); } catch { continue; }
          dirs.set(childRel, { path: childRel, name, mtime: Math.round(st.mtimeMs), dirs: [], files: [] });
          node.dirs.push(childRel);
          order.push(childRel);
          queue.push(childRel);
        } else if (isFile) {
          statJobs.push(limit(async () => {
            try {
              const st = await fs.stat(childAbs);
              files.set(childRel, makeFile(childRel, name, st));
              node.files.push(childRel);
            } catch { /* fichier disparu pendant le scan */ }
          }));
        }
      }
      await Promise.all(statJobs);
      node.dirs.sort((a, b) => naturalCompare(basename(a), basename(b)));
      node.files.sort((a, b) => naturalCompare(basename(a), basename(b)));
    }

    // Agrégats récursifs (enfants d'abord).
    for (let i = order.length - 1; i >= 0; i--) {
      const node = dirs.get(order[i]);
      let count = node.files.length;
      let size = 0;
      const kinds = {};
      let cover = null;
      let coverRank = 99;
      for (const f of node.files) {
        const file = files.get(f);
        size += file.size;
        kinds[file.kind] = (kinds[file.kind] || 0) + 1;
        const rank = file.preview ? (COVER_PRIORITY[file.kind] ?? 9) : 99;
        if (rank < coverRank) { coverRank = rank; cover = file.path; }
      }
      for (const d of node.dirs) {
        const child = dirs.get(d);
        count += child.count;
        size += child.size;
        for (const [k, v] of Object.entries(child.kinds)) kinds[k] = (kinds[k] || 0) + v;
        if (cover == null && child.cover) cover = child.cover;
      }
      node.count = count;
      node.size = size;
      node.kinds = kinds;
      node.cover = cover;
    }
    return { dirs, files };
  }

  // ---------- Lecture ----------
  stats() {
    return {
      root: this.root,
      dirs: Math.max(0, this.dirs.size - 1),
      files: this.files.size,
      size: this.dirs.get('')?.size || 0,
      scannedAt: this.scannedAt,
      scanning: this.scanning,
      scanError: this.scanError,
      lastScanMs: this.lastScanMs,
    };
  }

  hasDir(rel) { return this.dirs.has(rel); }
  getFile(rel) { return this.files.get(rel) || null; }

  absPath(rel) {
    return resolveInRoot(this.root, rel);
  }

  summary(rel) {
    const d = this.dirs.get(rel);
    if (!d) return null;
    return {
      path: d.path,
      name: d.name,
      count: d.count,
      size: d.size,
      mtime: d.mtime,
      dirCount: d.dirs.length,
      kinds: d.kinds,
      cover: d.cover ? this.files.get(d.cover) || null : null,
    };
  }

  breadcrumb(rel) {
    const crumbs = [{ path: '', name: this.dirs.get('')?.name || 'Bibliothèque' }];
    if (!rel) return crumbs;
    const parts = rel.split('/');
    let acc = '';
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p;
      crumbs.push({ path: acc, name: p });
    }
    return crumbs;
  }

  // Contenu d'un dossier : sous-dossiers (avec un extrait de leurs fichiers) et fichiers directs.
  getDir(rel, { previewLimit = 24 } = {}) {
    const d = this.dirs.get(rel);
    if (!d) return null;
    return {
      ...this.summary(rel),
      breadcrumb: this.breadcrumb(rel),
      dirs: d.dirs.map((sub) => {
        const s = this.dirs.get(sub);
        return {
          ...this.summary(sub),
          preview: s.files.slice(0, previewLimit).map((f) => this.files.get(f)),
          fileCount: s.files.length,
        };
      }),
      files: d.files.map((f) => this.files.get(f)),
    };
  }

  // Arbre des dossiers uniquement (barre latérale).
  tree(rel = '') {
    const d = this.dirs.get(rel);
    if (!d) return null;
    return {
      path: d.path,
      name: d.name,
      count: d.count,
      children: d.dirs.map((sub) => this.tree(sub)),
    };
  }

  // Tous les fichiers sous un dossier (récursif), dans l'ordre d'affichage.
  filesUnder(rel) {
    const out = [];
    const visit = (p) => {
      const d = this.dirs.get(p);
      if (!d) return;
      for (const f of d.files) out.push(this.files.get(f));
      for (const s of d.dirs) visit(s);
    };
    visit(rel);
    return out;
  }

  search(query, limit = 200) {
    const q = normalizeText(query).trim();
    if (!q) return { dirs: [], files: [] };
    const terms = q.split(/\s+/);
    const match = (name) => {
      const n = normalizeText(name);
      return terms.every((t) => n.includes(t));
    };
    const dirs = [];
    const files = [];
    for (const d of this.dirs.values()) {
      if (d.path && match(d.name)) {
        dirs.push(this.summary(d.path));
        if (dirs.length >= limit) break;
      }
    }
    for (const f of this.files.values()) {
      if (match(f.name)) {
        files.push(f);
        if (files.length >= limit) break;
      }
    }
    return { dirs, files };
  }
}
