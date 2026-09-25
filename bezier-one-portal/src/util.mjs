// Utilitaires partagés : classification des fichiers, chemins sûrs, tri naturel, écriture atomique.
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const KINDS = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tif', 'tiff', 'bmp', 'avif', 'heic', 'heif', 'svg', 'jfif'],
  video: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'mxf', 'prores', 'mpg', 'mpeg', 'wmv', '3gp'],
  audio: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'aif', 'aiff'],
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'ppt', 'pptx', 'key', 'pages', 'numbers', 'xls', 'xlsx', 'csv', 'txt', 'md', 'rtf', 'odt'],
  design: ['psd', 'psb', 'ai', 'indd', 'idml', 'sketch', 'fig', 'xd', 'eps', 'afdesign', 'afphoto', 'blend', 'c4d', 'aep', 'prproj', 'drp'],
  font: ['ttf', 'otf', 'woff', 'woff2'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'dmg'],
  raw: ['cr2', 'cr3', 'arw', 'nef', 'dng', 'raf', 'orf', 'rw2'],
};

const EXT_TO_KIND = new Map();
for (const [kind, exts] of Object.entries(KINDS)) for (const e of exts) EXT_TO_KIND.set(e, kind);

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  tif: 'image/tiff', tiff: 'image/tiff', bmp: 'image/bmp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif', svg: 'image/svg+xml',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  mpg: 'video/mpeg', mpeg: 'video/mpeg', wmv: 'video/x-ms-wmv', '3gp': 'video/3gpp',
  mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', m4a: 'audio/mp4', flac: 'audio/flac', ogg: 'audio/ogg', aif: 'audio/aiff', aiff: 'audio/aiff',
  pdf: 'application/pdf', txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8', csv: 'text/csv; charset=utf-8',
  json: 'application/json', zip: 'application/zip', html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
};

export function extOf(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function kindOf(name) {
  return EXT_TO_KIND.get(extOf(name)) || 'other';
}

export function mimeOf(name) {
  return MIME[extOf(name)] || 'application/octet-stream';
}

// Peut-on produire une vignette pour ce type de fichier ?
export function isPreviewable(kind, ext) {
  if (kind === 'image' || kind === 'video' || kind === 'pdf') return true;
  if (kind === 'design') return ['psd', 'psb', 'ai', 'eps'].includes(ext);
  return false;
}

// Normalisation pour la recherche : minuscules, sans accents.
export function normalizeText(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
export function naturalCompare(a, b) {
  return collator.compare(a, b);
}

// Chemin relatif sûr (posix, sans '..', sans caractères de contrôle). Retourne null si invalide.
export function safeRel(input) {
  if (input == null) return '';
  let p = String(input);
  if (p.includes('\0') || p.includes('\\')) return null;
  p = p.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
  if (p === '' || p === '.') return '';
  const parts = p.split('/');
  for (const part of parts) {
    if (part === '' || part === '.' || part === '..') return null;
  }
  return parts.join('/');
}

// Un chemin est-il égal à `base` ou contenu dans `base` ? ('' = racine, contient tout)
export function isWithin(base, rel) {
  if (base === '') return true;
  return rel === base || rel.startsWith(base + '/');
}

export function resolveInRoot(root, rel) {
  const abs = path.resolve(root, ...rel.split('/').filter(Boolean));
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

export async function atomicWriteJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
  await fs.rename(tmp, file);
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export function randomId(length = 16) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

// En-tête Content-Disposition correct pour des noms accentués.
export function contentDisposition(type, filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function basename(rel) {
  const i = rel.lastIndexOf('/');
  return i >= 0 ? rel.slice(i + 1) : rel;
}

export function dirname(rel) {
  const i = rel.lastIndexOf('/');
  return i >= 0 ? rel.slice(0, i) : '';
}

export function pLimit(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
}
