// Composants et utilitaires partagés entre l'espace studio et la page de partage.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  play: '<path d="M7 5v14l11-7z" fill="currentColor" stroke="none"/>',
  audio: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  pdf: '<path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M8 15h1.5a1.5 1.5 0 0 0 0-3H8v6M13 12v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"/>',
  doc: '<path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M8 13h8M8 17h6"/>',
  design: '<path d="M12 3 4 8l8 5 8-5z"/><path d="m4 12 8 5 8-5M4 16l8 5 8-5"/>',
  font: '<path d="M5 20 12 4l7 16M8 14h8"/>',
  archive: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M12 9v11M10 13h4"/>',
  raw: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 6v1M12 17v1M6 12h1M17 12h1"/>',
  file: '<path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4M4 19h16"/>',
  share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3m0 0-4 4m4-4 4 4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m12.5 7.5 4 4"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  expand: '<path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"/>',
  collapse: '<path d="M9 4v5H4M15 20v-5h5M15 4v5h5M9 20v-5H4"/>',
  home: '<path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  zip: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M9 8h3M12 11h3M9 14h3"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  squareCheck: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
  logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l5 4-5 4M20 12H9"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  filter: '<path d="M4 5h16l-6 8v5l-4 2v-7z"/>',
  minus: '<path d="M5 12h14"/>',
  arrowUp: '<path d="M12 19V5m0 0-6 6m6-6 6 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5A5 5 0 0 1 21 19"/>',
};

export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.9');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  svg.innerHTML = ICONS[name] || ICONS.file;
  return svg;
}

export const KIND_LABEL = {
  image: 'Image', video: 'Vidéo', audio: 'Audio', pdf: 'PDF', doc: 'Document', design: 'Fichier de création',
  font: 'Police', archive: 'Archive', raw: 'Photo RAW', other: 'Fichier',
};
export const KIND_ICON = { image: 'image', video: 'video', audio: 'audio', pdf: 'pdf', doc: 'doc', design: 'design', font: 'font', archive: 'archive', raw: 'raw', other: 'file' };

export const FILTERS = [
  { id: 'all', label: 'Tous', match: () => true },
  { id: 'image', label: 'Images', match: (f) => f.kind === 'image' || f.kind === 'raw' },
  { id: 'video', label: 'Vidéos', match: (f) => f.kind === 'video' },
  { id: 'doc', label: 'Documents', match: (f) => f.kind === 'pdf' || f.kind === 'doc' || f.kind === 'design' },
  { id: 'other', label: 'Autres', match: (f) => !['image', 'raw', 'video', 'pdf', 'doc', 'design'].includes(f.kind) },
];

export const SORTS = [
  { id: 'name', label: 'Nom' },
  { id: 'date', label: 'Plus récents' },
  { id: 'size', label: 'Taille' },
  { id: 'kind', label: 'Type' },
];

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
export const naturalCompare = (a, b) => collator.compare(a, b);

export function sortFiles(files, mode) {
  const arr = [...files];
  switch (mode) {
    case 'date': return arr.sort((a, b) => b.mtime - a.mtime || naturalCompare(a.name, b.name));
    case 'size': return arr.sort((a, b) => b.size - a.size || naturalCompare(a.name, b.name));
    case 'kind': return arr.sort((a, b) => naturalCompare(a.kind, b.kind) || naturalCompare(a.name, b.name));
    default: return arr.sort((a, b) => naturalCompare(a.name, b.name));
  }
}

export function filterFiles(files, filterId) {
  const f = FILTERS.find((x) => x.id === filterId) || FILTERS[0];
  return files.filter(f.match);
}

export function fmtBytes(n) {
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} o`;
  const units = ['Ko', 'Mo', 'Go', 'To'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1).replace('.', ',') : Math.round(v)} ${units[i]}`;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d) => (d ? dateFmt.format(new Date(d)) : '');
export const fmtDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : '');
export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- Réseau ----------
export class ApiError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw new ApiError(res.status, data?.error || `Erreur ${res.status}`, data);
  return data;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }, text);
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

// Téléchargement d'une sélection via un formulaire POST (le navigateur gère le flux).
export function postDownload(action, fields) {
  const form = h('form', { method: 'post', action, style: { display: 'none' } });
  for (const [k, v] of Object.entries(fields)) form.append(h('input', { type: 'hidden', name: k, value: v }));
  document.body.append(form);
  form.submit();
  setTimeout(() => form.remove(), 2000);
}

// ---------- Notifications ----------
let toastHost;
export function toast(message, type = 'ok', ms = 2600) {
  if (!toastHost) { toastHost = h('div', { class: 'toast-host' }); document.body.append(toastHost); }
  const el = h('div', { class: `toast ${type}` }, icon(type === 'error' ? 'info' : 'check'), message);
  toastHost.append(el);
  setTimeout(() => el.remove(), ms);
}

// ---------- Modale ----------
export function modal({ title, body, footer, wide = false, onClose }) {
  const closeBtn = h('button', { class: 'btn ghost icon', 'aria-label': 'Fermer' }, icon('x'));
  const box = h('div', { class: `modal${wide ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal-head' }, h('h2', {}, title), closeBtn),
    h('div', { class: 'modal-body' }, body),
    footer ? h('div', { class: 'modal-foot' }, footer) : null);
  const overlay = h('div', { class: 'overlay' }, box);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  const first = box.querySelector('input, textarea, select, button.primary');
  if (first) setTimeout(() => first.focus(), 30);
  return { el: overlay, box, close };
}

export function confirmModal({ title, text, confirmLabel = 'Confirmer', danger = false }) {
  return new Promise((resolve) => {
    const ok = h('button', { class: `btn ${danger ? 'danger' : 'primary'}` }, confirmLabel);
    const cancel = h('button', { class: 'btn ghost' }, 'Annuler');
    const m = modal({ title, body: h('p', {}, text), footer: [cancel, ok], onClose: () => resolve(false) });
    ok.addEventListener('click', () => { m.close(); resolve(true); });
    cancel.addEventListener('click', () => m.close());
  });
}

// ---------- Sélection ----------
export class Selection extends EventTarget {
  constructor() { super(); this.map = new Map(); }
  get size() { return this.map.size; }
  has(path) { return this.map.has(path); }
  items() { return [...this.map.values()]; }
  emit() { this.dispatchEvent(new Event('change')); }
  add(item) { this.map.set(item.path, item); this.emit(); }
  addMany(items) { for (const it of items) this.map.set(it.path, it); this.emit(); }
  delete(path) { if (this.map.delete(path)) this.emit(); }
  toggle(item) { if (this.map.has(item.path)) this.map.delete(item.path); else this.map.set(item.path, item); this.emit(); }
  clear() { if (this.map.size) { this.map.clear(); this.emit(); } }
  counts() {
    let dirs = 0; let files = 0;
    for (const it of this.map.values()) { if (it.type === 'dir') dirs++; else files++; }
    return { dirs, files };
  }
}

// Sélection par plage (Maj + clic) au sein d'un conteneur.
export function rangeSelect(container, selection, item, ev, asItem) {
  const tiles = $$('[data-path]', container);
  const idx = tiles.findIndex((t) => t.dataset.path === item.path);
  const last = container._lastIndex;
  if (ev.shiftKey && last != null && idx >= 0) {
    const [a, b] = last < idx ? [last, idx] : [idx, last];
    const items = tiles.slice(a, b + 1).map((t) => asItem(t.dataset.path)).filter(Boolean);
    selection.addMany(items);
  } else {
    selection.toggle(item);
  }
  container._lastIndex = idx;
}

// ---------- Tuiles ----------
export function tileImg(src, alt = '') {
  const img = h('img', { alt, loading: 'lazy', decoding: 'async', draggable: false });
  img.addEventListener('load', () => img.classList.add('loaded'));
  img.src = src;
  return img;
}

export function genericMedia(file) {
  return h('div', { class: 'tile-generic' }, icon(KIND_ICON[file.kind] || 'file'), h('span', { class: 'ext' }, (file.ext || 'fichier').toUpperCase()));
}

export function fileTile(file, { thumb, selected = false, onToggle, onOpen, downloadUrl, showMeta = true } = {}) {
  const media = h('div', { class: 'tile-media' });
  if (file.preview && thumb) {
    const img = tileImg(thumb(file, 480), file.name);
    img.addEventListener('error', () => { img.replaceWith(genericMedia(file)); });
    media.append(img);
  } else {
    media.append(genericMedia(file));
  }
  if (file.kind === 'video') media.append(h('span', { class: 'tile-badge' }, icon('play')));
  const tile = h('figure', { class: `tile${selected ? ' selected' : ''}`, dataset: { path: file.path, type: 'file' }, title: file.name },
    media,
    onToggle ? h('button', { class: 'tile-check', 'aria-label': 'Sélectionner', onClick: (e) => { e.stopPropagation(); onToggle(file, e); } }, icon('check')) : null,
    downloadUrl ? h('a', { class: 'tile-dl', href: downloadUrl, title: 'Télécharger', download: file.name, onClick: (e) => e.stopPropagation() }, icon('download')) : null,
    h('figcaption', { class: 'tile-caption' },
      h('span', { class: 'name' }, file.name),
      showMeta ? h('span', { class: 'meta' }, `${KIND_LABEL[file.kind] || 'Fichier'} · ${fmtBytes(file.size)}`) : null));
  tile.addEventListener('click', (e) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) { if (onToggle) onToggle(file, e); return; }
    onOpen?.(file, e);
  });
  return tile;
}

export function folderTile(dir, { thumb, selected = false, onToggle, onOpen, href } = {}) {
  const media = h('div', { class: 'tile-media' });
  if (dir.cover && thumb) {
    const img = tileImg(thumb(dir.cover, 480), '');
    img.addEventListener('error', () => img.replaceWith(h('div', { class: 'tile-generic' }, icon('folder'))));
    media.append(img);
  } else {
    media.append(h('div', { class: 'tile-generic' }, icon('folder')));
  }
  const tile = h('figure', { class: `tile folder${selected ? ' selected' : ''}`, dataset: { path: dir.path, type: 'dir' }, title: dir.name },
    media,
    h('span', { class: 'folder-count' }, String(dir.count ?? 0)),
    onToggle ? h('button', { class: 'tile-check', 'aria-label': 'Sélectionner le dossier', onClick: (e) => { e.stopPropagation(); onToggle(dir, e); } }, icon('check')) : null,
    h('div', { class: 'folder-label' },
      h('div', { class: 'name' }, dir.name),
      h('div', { class: 'meta' }, dir.dirCount ? `${plural(dir.dirCount, 'dossier')} · ${plural(dir.count ?? 0, 'fichier')}` : plural(dir.count ?? 0, 'fichier'))));
  tile.addEventListener('click', (e) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) { if (onToggle) onToggle(dir, e); return; }
    onOpen?.(dir, e);
  });
  if (href) tile.dataset.href = href;
  return tile;
}

export function listRow(file, { thumb, selected = false, onToggle, onOpen } = {}) {
  const th = h('div', { class: 'list-thumb' });
  if (file.preview && thumb) {
    const img = tileImg(thumb(file, 480), '');
    img.addEventListener('error', () => img.replaceWith(icon(KIND_ICON[file.kind] || 'file')));
    th.append(img);
  } else th.append(icon(KIND_ICON[file.kind] || 'file'));
  const row = h('div', { class: `list-row${selected ? ' selected' : ''}`, dataset: { path: file.path, type: 'file' } },
    onToggle ? h('button', { class: 'tile-check', onClick: (e) => { e.stopPropagation(); onToggle(file, e); } }, icon('check')) : h('span'),
    th,
    h('span', { class: 'list-name', title: file.name }, file.name),
    h('span', { class: 'dim' }, fmtBytes(file.size)),
    h('span', { class: 'dim hide-sm' }, KIND_LABEL[file.kind] || 'Fichier'),
    h('span', { class: 'dim hide-sm' }, fmtDate(file.mtime)));
  row.addEventListener('click', (e) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) { if (onToggle) onToggle(file, e); return; }
    onOpen?.(file, e);
  });
  return row;
}

export function listHeader() {
  return h('div', { class: 'list-row list-head' }, h('span'), h('span'), h('span', {}, 'Nom'), h('span', {}, 'Taille'), h('span', { class: 'hide-sm' }, 'Type'), h('span', { class: 'hide-sm' }, 'Modifié'));
}

export function section({ title, count, href, onOpen, actions = [] }, ...body) {
  if (!title) return h('section', { class: 'board-section' }, ...body);
  const titleEl = href || onOpen
    ? h('a', { href: href || '#', onClick: (e) => { if (onOpen) { e.preventDefault(); onOpen(); } } }, title)
    : h('span', {}, title);
  return h('section', { class: 'board-section' },
    h('div', { class: 'section-head' },
      h('h3', {}, titleEl, count != null ? h('span', { class: 'count' }, String(count)) : null),
      actions.length ? h('div', { class: 'actions' }, actions) : null),
    ...body);
}

export function emptyState(iconName, title, text) {
  return h('div', { class: 'empty' }, icon(iconName), h('h3', {}, title), text ? h('div', {}, text) : null);
}

export function skeleton(n = 12) {
  return h('div', { class: 'skeleton' }, Array.from({ length: n }, () => h('div')));
}

// ---------- Visionneuse ----------
export class Lightbox {
  // urls: { large(file) -> aperçu 1600px, original(file) -> fichier, download(file) -> lien ou null }
  constructor(urls) {
    this.urls = urls;
    this.files = [];
    this.index = 0;
    this.el = null;
    this.onKey = this.onKey.bind(this);
  }

  open(files, index = 0) {
    this.files = files;
    this.index = index;
    if (!this.el) this.build();
    document.body.append(this.el);
    document.addEventListener('keydown', this.onKey);
    this.render();
  }

  close() {
    if (!this.el) return;
    this.stage.innerHTML = '';
    this.el.remove();
    document.removeEventListener('keydown', this.onKey);
  }

  build() {
    this.title = h('div', { class: 'lb-title' });
    this.counter = h('span', { class: 'badge muted' });
    this.dl = h('a', { class: 'btn sm', download: '' }, icon('download'), h('span', { class: 'hide-xs' }, 'Télécharger'));
    this.orig = h('a', { class: 'btn ghost icon sm', target: '_blank', rel: 'noopener', title: 'Ouvrir l’original' }, icon('external'));
    this.stage = h('div', { class: 'lb-stage' });
    this.prevBtn = h('button', { class: 'lb-nav prev', 'aria-label': 'Précédent', onClick: () => this.step(-1) }, icon('chevronLeft'));
    this.nextBtn = h('button', { class: 'lb-nav next', 'aria-label': 'Suivant', onClick: () => this.step(1) }, icon('chevronRight'));
    this.el = h('div', { class: 'lightbox' },
      h('div', { class: 'lb-head' }, this.counter, this.title, this.dl, this.orig,
        h('button', { class: 'btn ghost icon', 'aria-label': 'Fermer', onClick: () => this.close() }, icon('x'))),
      h('div', { style: { position: 'relative', minHeight: 0, display: 'grid' } }, this.stage, this.prevBtn, this.nextBtn));
    this.stage.addEventListener('click', (e) => { if (e.target === this.stage) this.close(); });
    let x0 = null;
    this.el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    this.el.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 60) this.step(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  onKey(e) {
    if (e.key === 'Escape') this.close();
    else if (e.key === 'ArrowLeft') this.step(-1);
    else if (e.key === 'ArrowRight') this.step(1);
  }

  step(d) {
    const next = this.index + d;
    if (next < 0 || next >= this.files.length) return;
    this.index = next;
    this.render();
  }

  render() {
    const file = this.files[this.index];
    if (!file) return this.close();
    this.title.innerHTML = '';
    this.title.append(file.name, h('small', {}, `${KIND_LABEL[file.kind] || 'Fichier'} · ${fmtBytes(file.size)}`));
    this.counter.textContent = `${this.index + 1} / ${this.files.length}`;
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.disabled = this.index === this.files.length - 1;
    const dl = this.urls.download?.(file);
    this.dl.classList.toggle('hidden', !dl);
    if (dl) { this.dl.href = dl; this.dl.setAttribute('download', file.name); }
    const orig = this.urls.original(file);
    this.orig.href = orig;
    this.stage.innerHTML = '';
    let node;
    if (file.kind === 'image' && file.preview) {
      const useOriginal = file.ext === 'gif' || file.ext === 'svg';
      const spinner = h('div', { class: 'lb-spinner' });
      const img = h('img', { alt: file.name, src: useOriginal ? orig : this.urls.large(file) });
      img.addEventListener('load', () => spinner.remove());
      img.addEventListener('error', () => { spinner.remove(); if (!useOriginal && img.src !== orig) img.src = orig; });
      node = [spinner, img];
    } else if (file.kind === 'video') {
      node = h('video', { controls: true, autoplay: true, playsinline: true, src: orig });
    } else if (file.kind === 'audio') {
      node = h('div', { class: 'lb-generic' }, icon('audio'), h('div', { class: 'ext' }, file.name), h('audio', { controls: true, autoplay: true, src: orig }));
    } else if (file.kind === 'pdf') {
      node = h('iframe', { src: `${orig}#toolbar=0`, title: file.name });
    } else if (file.preview) {
      const img = h('img', { alt: file.name, src: this.urls.large(file) });
      img.addEventListener('error', () => img.replaceWith(this.generic(file, dl)));
      node = img;
    } else {
      node = this.generic(file, dl);
    }
    append(this.stage, [node]);
    // Préchargement des voisins.
    for (const d of [1, -1]) {
      const f = this.files[this.index + d];
      if (f && f.kind === 'image' && f.preview) { const i = new Image(); i.src = this.urls.large(f); }
    }
  }

  generic(file, dl) {
    return h('div', { class: 'lb-generic' }, icon(KIND_ICON[file.kind] || 'file'),
      h('div', { class: 'ext' }, (file.ext || 'fichier').toUpperCase()),
      h('div', {}, 'Aperçu indisponible pour ce format.'),
      dl ? h('a', { class: 'btn primary', href: dl, download: file.name }, icon('download'), 'Télécharger le fichier') : null);
  }
}

// Persistance locale de préférences d'affichage.
export const prefs = {
  get(key, fallback) {
    try { const v = localStorage.getItem(`bz.${key}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`bz.${key}`, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
