// Page de partage : consultation d'une sélection par un client (aperçus, visionneuse, téléchargements).
import {
  $, $$, h, icon, api, toast, Selection, rangeSelect, fileTile, folderTile, listRow, listHeader,
  section, emptyState, skeleton, Lightbox, fmtBytes, fmtDate, plural, sortFiles, filterFiles,
  FILTERS, SORTS, postDownload, prefs,
} from '/assets/ui.js';

const id = location.pathname.split('/').filter(Boolean)[1] || '';
const enc = encodeURIComponent;
const thumbUrl = (file, w = 480) => `/api/s/${id}/thumb?p=${enc(file.path)}&w=${w}&v=${file.size}-${file.mtime}`;
const fileUrl = (file, dl = false) => `/s/${id}/file?p=${enc(file.path)}${dl ? '&dl=1' : ''}`;
const pathHash = (path) => `#/${path.split('/').map(enc).join('/')}`;

const state = {
  info: null,
  path: '',
  view: 'grid',
  sort: 'name',
  filter: 'all',
  tile: prefs.get('share.tile', 220),
  selection: new Selection(),
  lightbox: null,
};

const app = $('#app');
let els = {};

function parsePath() {
  const hash = location.hash.replace(/^#\/?/, '');
  return hash.split('/').filter(Boolean).map((s) => decodeURIComponent(s)).join('/');
}

window.addEventListener('hashchange', () => { state.path = parsePath(); renderTree(); });

async function boot() {
  let info;
  try {
    info = await api(`/api/s/${id}`);
  } catch (err) {
    if (err.status === 401 && err.data?.needsPassword) return renderGate(err.data);
    return renderMessage(err.status === 410 ? 'Ce lien a expiré' : 'Lien introuvable', err.message);
  }
  state.info = info;
  document.title = `${info.share.title} — ${info.brand}`;
  state.lightbox = new Lightbox({ large: (f) => thumbUrl(f, 1600), original: (f) => fileUrl(f), download: (f) => (info.share.allowDownload ? fileUrl(f, true) : null) });
  state.path = parsePath();
  renderShell();
  renderTree();
}

function brand() {
  return h('span', { class: 'brand' }, h('em', {}, 'Bézier'), h('strong', {}, 'ONE'));
}

function renderMessage(title, text) {
  app.innerHTML = '';
  app.append(h('div', { class: 'gate' }, h('div', { class: 'gate-box' }, brand(), h('h1', {}, title), h('p', {}, text))));
}

function renderGate(data) {
  const input = h('input', { class: 'input', type: 'password', placeholder: 'Mot de passe', autocomplete: 'current-password', style: { textAlign: 'center' } });
  const error = h('div', { class: 'error hidden' });
  const btn = h('button', { class: 'btn primary', type: 'submit', style: { justifyContent: 'center' } }, 'Ouvrir');
  const form = h('form', { onSubmit: async (e) => {
    e.preventDefault();
    btn.disabled = true;
    error.classList.add('hidden');
    try {
      await api(`/api/s/${id}/unlock`, { method: 'POST', body: { password: input.value } });
      boot();
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove('hidden');
      btn.disabled = false;
      input.select();
    }
  } }, input, error, btn);
  app.innerHTML = '';
  app.append(h('div', { class: 'gate' }, h('div', { class: 'gate-box' }, brand(), h('h1', {}, data.title || 'Partage protégé'), h('p', {}, 'Ce partage est protégé par un mot de passe.'), form)));
  setTimeout(() => input.focus(), 50);
}

function renderShell() {
  const { share, count } = state.info;
  els.content = h('div');
  els.selbar = h('div', { class: 'selbar' });
  const hero = h('div', { class: 'share-hero' },
    h('div', {},
      h('h1', {}, share.title),
      share.message ? h('p', { class: 'message' }, share.message) : null,
      h('div', { class: 'meta' }, [plural(count, 'fichier'), `partagé le ${fmtDate(share.createdAt)}`, share.expiresAt ? `disponible jusqu’au ${fmtDate(share.expiresAt)}` : null].filter(Boolean).join(' · '))),
    share.allowDownload && count > 0 ? h('div', { class: 'board-actions' },
      h('a', { class: 'btn primary', href: `/s/${id}/zip` }, icon('download'), 'Tout télécharger')) : null);
  app.innerHTML = '';
  app.append(h('div', { class: 'share-page' },
    h('header', { class: 'share-top' }, h('div', { class: 'share-top-inner' }, h('a', { href: '#/' }, brand()), h('span', { style: { color: 'var(--muted-2)' } }, '·'),
      h('span', { style: { color: 'var(--muted)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, share.title))),
    h('main', { class: 'share-wrap' }, hero, els.content, h('div', { class: 'share-foot' }, `${state.info.brand} · Creative Library`)),
    els.selbar));
  state.selection.addEventListener('change', onSelectionChange);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('.lightbox')) state.selection.clear(); });
}

function applyTilePrefs() {
  els.content.style.setProperty('--tile', `${state.tile}px`);
}

function toggleItem(item, ev, container) {
  const asItem = (p) => {
    const el = $(`[data-path="${CSS.escape(p)}"]`, container);
    return el ? { path: p, type: el.dataset.type, name: el.title } : null;
  };
  rangeSelect(container, state.selection, { path: item.path, type: item.kind ? 'file' : 'dir', name: item.name }, ev, asItem);
}

function onSelectionChange() {
  const sel = state.selection;
  const selected = new Set(sel.map.keys());
  for (const el of $$('[data-path]', els.content)) el.classList.toggle('selected', selected.has(el.dataset.path));
  els.content.classList.toggle('selecting', sel.size > 0);
  els.selbar.innerHTML = '';
  if (sel.size === 0) { els.selbar.classList.remove('show'); return; }
  const { dirs, files } = sel.counts();
  const parts = [];
  if (dirs) parts.push(plural(dirs, 'dossier'));
  if (files) parts.push(plural(files, 'fichier'));
  els.selbar.append(
    h('span', { class: 'count' }, parts.join(' · ')),
    h('button', { class: 'btn primary sm', onClick: () => {
      postDownload(`/s/${id}/zip`, { paths: JSON.stringify(sel.items().map((i) => i.path)) });
      toast('Préparation de l’archive…');
    } }, icon('download'), 'Télécharger la sélection'),
    h('button', { class: 'btn ghost icon sm', title: 'Effacer', onClick: () => sel.clear() }, icon('x')));
  els.selbar.classList.add('show');
}

async function renderTree() {
  const path = state.path;
  const canDl = state.info.share.allowDownload;
  els.content.innerHTML = '';
  applyTilePrefs();
  els.content.append(skeleton(8));
  window.scrollTo({ top: 0 });
  let data;
  try {
    data = await api(`/api/s/${id}/tree?p=${enc(path)}`);
  } catch (err) {
    if (err.status === 401) return boot();
    els.content.innerHTML = '';
    els.content.append(emptyState('folder', 'Dossier introuvable', err.message), h('p', { style: { textAlign: 'center' } }, h('a', { class: 'btn', href: '#/' }, 'Retour')));
    return;
  }
  if (state.path !== path) return;
  els.content.innerHTML = '';

  // Fil d'Ariane et en-tête de dossier (hors racine)
  if (path) {
    const crumbs = h('div', { class: 'crumbs' });
    data.breadcrumb.forEach((c, i) => {
      if (i) crumbs.append(h('span', { class: 'sep' }, icon('chevronRight')));
      crumbs.append(i === data.breadcrumb.length - 1 ? h('span', { class: 'current' }, c.name) : h('a', { href: pathHash(c.path) }, c.name));
    });
    els.content.append(h('div', { class: 'board-head' },
      h('div', {}, crumbs, h('div', { class: 'board-title' }, h('h1', { style: { fontSize: '22px' } }, data.name), h('span', { class: 'sub' }, `${plural(data.count, 'fichier')}${data.size ? ` · ${fmtBytes(data.size)}` : ''}`))),
      canDl && data.count ? h('div', { class: 'board-actions' }, h('a', { class: 'btn', href: `/s/${id}/zip?p=${enc(path)}` }, icon('download'), 'Télécharger ce dossier')) : null));
  }

  // Barre d'outils
  const counts = {};
  for (const f of FILTERS) counts[f.id] = data.files.filter(f.match).length;
  const showChips = data.files.length > 0;
  const chips = h('div', { class: 'chips' }, FILTERS.filter((f) => f.id === 'all' || counts[f.id] > 0).map((f) =>
    h('button', { class: `chip${state.filter === f.id ? ' active' : ''}`, onClick: () => { state.filter = f.id; renderTree(); } }, f.label,
      h('span', { class: 'n' }, String(f.id === 'all' ? data.files.length : counts[f.id])))));
  const sortSel = h('select', { class: 'select sm', style: { width: 'auto' }, onChange: (e) => { state.sort = e.target.value; renderTree(); } },
    SORTS.map((s) => h('option', { value: s.id, selected: state.sort === s.id }, s.label)));
  const seg = h('div', { class: 'seg' },
    h('button', { class: state.view === 'grid' ? 'active' : '', title: 'Grille', onClick: () => { state.view = 'grid'; renderTree(); } }, icon('grid')),
    h('button', { class: state.view === 'list' ? 'active' : '', title: 'Liste', onClick: () => { state.view = 'list'; renderTree(); } }, icon('list')));
  const slider = h('input', { type: 'range', min: 140, max: 360, step: 10, value: state.tile, onInput: (e) => { state.tile = Number(e.target.value); applyTilePrefs(); }, onChange: () => prefs.set('share.tile', state.tile) });
  if (showChips || data.dirs.length) {
    els.content.append(h('div', { class: 'toolbar' }, showChips ? chips : h('span'), h('div', { class: 'spacer' }), sortSel, seg, h('label', { class: 'slider hide-xs' }, icon('minus'), slider, icon('plus'))));
  }

  // Sous-dossiers
  for (const sub of data.dirs) {
    const previewFiles = sortFiles(filterFiles(sub.preview, state.filter), state.sort);
    const row = h('div', { class: 'row' });
    row.append(folderTile(sub, { thumb: thumbUrl, onToggle: canDl ? (d, e) => toggleItem(d, e, row) : null, selected: state.selection.has(sub.path), onOpen: () => { location.hash = pathHash(sub.path); } }));
    for (const f of previewFiles) row.append(makeTile(f, previewFiles, row));
    const hidden = sub.fileCount - sub.preview.length;
    if (hidden > 0 && state.filter === 'all') row.append(h('div', { class: 'more' }, h('button', { onClick: () => { location.hash = pathHash(sub.path); } }, `+${hidden}`)));
    els.content.append(section({
      title: sub.name, count: sub.count, href: pathHash(sub.path),
      actions: [
        h('a', { class: 'btn ghost sm', title: 'Ouvrir le dossier', href: pathHash(sub.path) }, icon('expand'), h('span', { class: 'lbl' }, 'Ouvrir')),
        canDl ? h('a', { class: 'btn ghost sm', title: 'Télécharger le dossier (.zip)', href: `/s/${id}/zip?p=${enc(sub.path)}` }, icon('download'), h('span', { class: 'lbl' }, '.zip')) : null,
      ],
    }, row));
  }

  // Fichiers
  const files = sortFiles(filterFiles(data.files, state.filter), state.sort);
  if (files.length) {
    const body = state.view === 'list' ? h('div', { class: 'list' }, listHeader()) : h('div', { class: 'grid' });
    for (const f of files) body.append(state.view === 'list'
      ? listRow(f, { thumb: thumbUrl, selected: state.selection.has(f.path), onToggle: canDl ? (x, e) => toggleItem(x, e, body) : null, onOpen: () => state.lightbox.open(files, files.indexOf(f)) })
      : makeTile(f, files, body));
    els.content.append(section({ title: data.dirs.length ? 'Fichiers' : '', count: files.length }, body));
  } else if (!data.dirs.length) {
    els.content.append(emptyState('folder', state.filter !== 'all' ? 'Aucun fichier de ce type' : 'Rien à afficher pour le moment'));
  }
  onSelectionChange();
}

function makeTile(file, list, container) {
  const canDl = state.info.share.allowDownload;
  return fileTile(file, {
    thumb: thumbUrl,
    selected: state.selection.has(file.path),
    onToggle: canDl ? (f, e) => toggleItem(f, e, container) : null,
    onOpen: () => state.lightbox.open(list, list.indexOf(file)),
    downloadUrl: canDl ? fileUrl(file, true) : null,
  });
}

boot();
