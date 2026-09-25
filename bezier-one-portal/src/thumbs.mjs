// Génération et cache des aperçus (WebP) : images via sharp, vidéos via ffmpeg,
// PDF/AI/EPS via pdftoppm, avec repli ffmpeg pour les formats exotiques (HEIC, PSD…).
// Deux files d'attente : « haute » (demandes des navigateurs) et « basse » (pré-génération).
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { sha1 } from './util.mjs';

export const SIZES = { small: 480, large: 1600 };
const FAIL_RETRY_MS = 24 * 3600 * 1000;

sharp.cache({ memory: 64, files: 20, items: 100 });
sharp.concurrency(2);

function run(cmd, args, { timeoutMs = 90000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} : délai dépassé`));
    }, timeoutMs);
    child.stderr.on('data', (d) => { if (stderr.length < 4000) stderr += d; });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${cmd} a échoué (${code}) : ${stderr.trim().split('\n').pop() || ''}`));
    });
  });
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

export class Thumbs {
  constructor({ dataDir, library, concurrency = 2, tools = {}, log = console }) {
    this.library = library;
    this.log = log;
    this.dir = path.join(dataDir, 'thumbs');
    this.tmp = path.join(dataDir, 'tmp');
    this.tools = { ffmpeg: 'ffmpeg', pdftoppm: 'pdftoppm', ...tools };
    this.concurrency = concurrency;
    this.active = 0;
    this.queues = { high: [], low: [] };
    this.inflight = new Map();
    this.failed = new Map(); // clé -> timestamp
    this.progress = { queued: 0, done: 0, failed: 0, generated: 0 };
    this.available = { ffmpeg: null, pdftoppm: null };
    this.prewarmRun = 0;
    this.prewarmState = null;
  }

  async init() {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.mkdir(this.tmp, { recursive: true });
    // Nettoyage des temporaires d'une exécution précédente.
    for (const f of await fs.readdir(this.tmp).catch(() => [])) {
      await fs.rm(path.join(this.tmp, f), { force: true }).catch(() => {});
    }
    for (const tool of ['ffmpeg', 'pdftoppm']) {
      this.available[tool] = await run(this.tools[tool], tool === 'ffmpeg' ? ['-version'] : ['-v'], { timeoutMs: 10000 })
        .then(() => true, () => false);
      if (!this.available[tool]) this.log.warn(`[thumbs] ${tool} introuvable : aperçus ${tool === 'ffmpeg' ? 'vidéo' : 'PDF'} désactivés`);
    }
  }

  keyOf(file) {
    return sha1(`${file.path}|${file.size}|${file.mtime}`);
  }

  cachePath(key, width) {
    return path.join(this.dir, key.slice(0, 2), `${key}.${width}.webp`);
  }

  failPath(key) {
    return path.join(this.dir, key.slice(0, 2), `${key}.fail`);
  }

  async hasFailed(key) {
    const mem = this.failed.get(key);
    if (mem && Date.now() - mem < FAIL_RETRY_MS) return true;
    try {
      const st = await fs.stat(this.failPath(key));
      if (Date.now() - st.mtimeMs < FAIL_RETRY_MS) {
        this.failed.set(key, st.mtimeMs);
        return true;
      }
    } catch { /* pas de marqueur */ }
    return false;
  }

  async markFailed(key, err) {
    this.failed.set(key, Date.now());
    this.progress.failed++;
    await fs.mkdir(path.dirname(this.failPath(key)), { recursive: true }).catch(() => {});
    await fs.writeFile(this.failPath(key), String(err?.message || err)).catch(() => {});
  }

  // Retourne le chemin absolu de l'aperçu, ou null s'il est impossible à produire.
  async get(file, width = SIZES.small, { priority = 'high' } = {}) {
    if (!file || !file.preview) return null;
    const key = this.keyOf(file);
    const out = this.cachePath(key, width);
    if (await exists(out)) return out;
    if (await this.hasFailed(key)) return null;
    const jobKey = `${key}:${width}`;
    if (this.inflight.has(jobKey)) return this.inflight.get(jobKey);
    const job = this.schedule(priority, () => this.generate(file, key, width))
      .then((ok) => (ok ? out : null))
      .finally(() => this.inflight.delete(jobKey));
    this.inflight.set(jobKey, job);
    return job;
  }

  schedule(priority, fn) {
    return new Promise((resolve) => {
      this.queues[priority === 'low' ? 'low' : 'high'].push({ fn, resolve });
      this.progress.queued++;
      this.pump();
    });
  }

  pump() {
    while (this.active < this.concurrency) {
      const job = this.queues.high.shift() || this.queues.low.shift();
      if (!job) return;
      this.active++;
      this.progress.queued--;
      job.fn()
        .then((r) => job.resolve(r), () => job.resolve(false))
        .finally(() => {
          this.active--;
          this.progress.done++;
          this.pump();
        });
    }
  }

  async generate(file, key, width) {
    const out = this.cachePath(key, width);
    if (await exists(out)) return true;
    const src = this.library.absPath(file.path);
    if (!src) return false;
    const scratch = [];
    try {
      let input = src;
      const large = this.cachePath(key, SIZES.large);
      if (width !== SIZES.large && await exists(large)) {
        input = large; // dérive la petite taille de la grande, déjà décodée
      } else if (file.kind === 'video') {
        input = await this.videoFrame(src, key, scratch);
      } else if (file.kind === 'pdf' || file.ext === 'ai' || file.ext === 'eps') {
        input = await this.pdfPage(src, key, scratch);
      }
      await fs.mkdir(path.dirname(out), { recursive: true });
      const tmpOut = path.join(this.tmp, `${key}.${width}.${process.pid}.webp`);
      scratch.push(tmpOut);
      try {
        await this.encode(input, width, tmpOut);
      } catch (err) {
        if (input !== src || !this.available.ffmpeg) throw err;
        // Format non lu par sharp (HEIC, PSD…) : on passe par ffmpeg.
        input = await this.ffmpegImage(src, key, scratch);
        await this.encode(input, width, tmpOut);
      }
      await fs.rename(tmpOut, out);
      this.progress.generated++;
      return true;
    } catch (err) {
      this.log.warn(`[thumbs] échec ${file.path} : ${err.message}`);
      await this.markFailed(key, err);
      return false;
    } finally {
      for (const f of scratch) await fs.rm(f, { force: true }).catch(() => {});
    }
  }

  async encode(input, width, out) {
    const img = sharp(input, { failOn: 'none', limitInputPixels: 400e6, sequentialRead: true }).rotate();
    if (width === SIZES.large) {
      img.resize({ width, height: width, fit: 'inside', withoutEnlargement: true });
    } else {
      // Petit côté = width, pour un rendu net en mode « couverture » dans la grille.
      img.resize({ width, height: width, fit: 'outside', withoutEnlargement: true });
    }
    await img.webp({ quality: width === SIZES.large ? 84 : 78, effort: 4 }).toFile(out);
  }

  async videoFrame(src, key, scratch) {
    if (!this.available.ffmpeg) throw new Error('ffmpeg indisponible');
    const out = path.join(this.tmp, `${key}.frame.jpg`);
    scratch.push(out);
    const args = (seek) => [
      '-y', '-v', 'error', '-ss', String(seek), '-i', src, '-frames:v', '1',
      '-vf', "scale='min(1600,iw)':-2", '-q:v', '2', out,
    ];
    try {
      await run(this.tools.ffmpeg, args(1));
      if (!(await exists(out))) throw new Error('aucune image');
    } catch {
      await run(this.tools.ffmpeg, args(0));
    }
    return out;
  }

  async ffmpegImage(src, key, scratch) {
    if (!this.available.ffmpeg) throw new Error('ffmpeg indisponible');
    const out = path.join(this.tmp, `${key}.img.png`);
    scratch.push(out);
    await run(this.tools.ffmpeg, ['-y', '-v', 'error', '-i', src, '-frames:v', '1', '-vf', "scale='min(1600,iw)':-2", out]);
    return out;
  }

  async pdfPage(src, key, scratch) {
    if (!this.available.pdftoppm) throw new Error('pdftoppm indisponible');
    const prefix = path.join(this.tmp, `${key}.page`);
    const out = `${prefix}.jpg`;
    scratch.push(out);
    await run(this.tools.pdftoppm, ['-singlefile', '-f', '1', '-l', '1', '-jpeg', '-r', '100', '-scale-to', '1600', src, prefix]);
    return out;
  }

  // Pré-génération en tâche de fond (priorité basse), un fichier à la fois :
  // les demandes des navigateurs passent toujours devant.
  prewarm(files) {
    const run = ++this.prewarmRun;
    const list = files.filter((f) => f.preview);
    this.prewarmState = { run, total: list.length, index: 0 };
    (async () => {
      for (const file of list) {
        if (run !== this.prewarmRun) return; // un nouveau scan a relancé la pré-génération
        this.prewarmState.index++;
        await this.get(file, SIZES.small, { priority: 'low' }).catch(() => {});
      }
    })();
    return list.length;
  }

  status() {
    return {
      ...this.progress,
      active: this.active,
      pending: this.queues.high.length + this.queues.low.length,
      prewarm: this.prewarmState,
      tools: this.available,
    };
  }
}
