// Espace studio : navigation hiérarchique de la bibliothèque, sélection multi-dossiers,
// création et gestion des liens de partage.
import {
  $, $$, h, append, icon, api, ApiError, toast, modal, confirmModal, Selection, rangeSelect,
  fileTile, folderTile, listRow, listHeader, section, emptyState, skeleton, Lightbox,
  fmtBytes, fmtDate, fmtDateTime, plural, sortFiles, filterFiles, FILTERS, SORTS, KIND_ICON,
  copyText, postDownload, debounce, prefs, naturalCompare,
} from '/assets/ui.js';

const state = {
  me: null,
  tree: null,
  route: { view: 'lib', path: '' },
  view: prefs.get('view', 'grid'),
  sort: prefs.get('sort', 'name'),
  filter: 'all',
  tile: prefs.get('tile', 210),
  names: prefs.get('names', true),
  expanded: new Set(prefs.get('expanded', [])),
  selection: new Selection(),
  current: null,
  status: null,
};

const enc = encodeURIComponent;
const thumbUrl = (file, w = 480) => `/api/admin/thumb?p=${enc(file.path)}&w=${w}&v=${file.size}-${file.mtime}`;
const fileUrl = (file, dl = false) => `/api/admin/file?p=${enc(file.path)}${dl ? '&dl=1' : ''}`;
const libHash = (path) => `#/lib/${path.split('/').map(enc).join('/')}`;
const lightbox = new Lightbox({ large: (f) => thumbUrl(f, 1600), original: (f) => fileUrl(f), download: (f) => fileUrl(f, true) });

const app = $('#app');
let els = {};

// ---------- Routage ----------
function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('shares')) return { view: 'shares' };
  if (hash.startsWith('search/')) return { view: 'search', q: decodeURIComponent(hash.slice(7)) };
  if (hash.startsWith('lib')) {
    const rest = hash.slice(3).replace(/^\//, '');
    return { view: 'lib', path: rest.split('/').filter(Boolean).map((s) => decodeURIComponent(s)).join('/') };
  }
  return { view: 'lib', path: '' };
}

window.addEventListener('hashchange', () => { state.route = parseRoute(); render(); });

// ---------- Démarrage ----------
async function boot() {
  try {
    state.me = await api('/api/admin/me');
  } catch (err) {
    renderLogin(err);
    return;
  }
  state.route = parseRoute();
  renderShell();
  loadTree();
  render();
  pollStatus();
}

function renderLogin(err) {
  const configured = err.status !== 503 && !/ADMIN_PASSWORD/.test(err.message || '');
  const input = h('input', { class: 'input', type: 'password', placeholder: 'Mot de passe du studio', autocomplete: 'current-password', autofocus: true });
  const error = h('div', { class: 'error hidden' });
  const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Entrer');
  const form = h('form', { onSubmit: async (e) => {
    e.preventDefault();
    btn.disabled = true;
    error.classList.add('hidden');
    try {
      await api('/api/admin/login', { method: 'POST', body: { password: input.value } });
      await boot();
    } catch (e2) {
      error.textContent = e2.message;
      error.classList.remove('hidden');
      btn.disabled = false;
      input.select();
    }
  } }, h('div', { class: 'field' }, input), error, btn);
  app.innerHTML = '';
  app.append(h('div', { class: 'login' }, h('div', { class: 'login-box' },
    h('div', { class: 'brand' }, h('em', {}, 'Bézier'), h('strong', {}, 'ONE')),
    h('p', {}, configured ? 'Espace studio. Réservé à l’administration de la bibliothèque.' : 'L’espace studio n’est pas configuré : définissez ADMIN_PASSWORD dans le Docker Compose puis redémarrez le service.'),
    configured ? form : null)));
}

// ---------- Coquille ----------
function renderShell() {
  document.body.style.overflow = 'hidden';
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Rechercher un fichier ou un dossier…', autocomplete: 'off' });
  const doSearch = debounce(() => {
    const q = search.value.trim();
    if (q.length >= 2) location.hash = `#/search/${enc(q)}`;
    else if (!q && state.route.view === 'search') location.hash = '#/lib/';
  }, 320);
  search.addEventListener('input', doSearch);
  search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { search.value = ''; search.blur(); } });

  els.tree = h('div', { class: 'tree' });
  els.foot = h('div', { class: 'sidebar-foot' });
  els.navLib = h('a', { href: '#/lib/' }, icon('home'), 'Bibliothèque');
  els.navShares = h('a', { href: '#/shares' }, icon('link'), 'Liens de partage');
  els.sidebar = h('aside', { class: 'sidebar' },
    h('div', { class: 'sidebar-head' },
      h('a', { class: 'brand', href: '#/lib/' }, h('em', {}, 'Bézier'), h('strong', {}, 'ONE')),
      h('button', { class: 'btn ghost icon sm', title: 'Se déconnecter', onClick: logout }, icon('logout'))),
    h('nav', { class: 'nav' }, els.navLib, els.navShares),
    h('div', { class: 'sidebar-section' }, 'Dossiers',
      h('button', { class: 'btn ghost icon sm', title: 'Réduire tout', onClick: () => { state.expanded.clear(); persistExpanded(); renderTree(); } }, icon('collapse'))),
    els.tree,
    els.foot);
  els.content = h('div', { class: 'content' });
  els.selbar = h('div', { class: 'selbar' });
  els.menuBtn = h('button', { class: 'btn ghost icon', onClick: () => toggleSidebar(true), 'aria-label': 'Menu' }, icon('menu'));
  els.menuBtn.style.display = 'none';
  els.search = search;
  const main = h('div', { class: 'main' },
    h('div', { class: 'topbar' }, els.menuBtn, h('div', { class: 'search' }, icon('search'), search),
      h('div', { class: 'topbar-right' },
        h('button', { class: 'btn ghost', onClick: rescan, title: 'Relire la bibliothèque sur le NAS' }, icon('refresh'), h('span', { class: 'hide-xs' }, 'Actualiser')))),
    els.content);
  app.innerHTML = '';
  app.append(h('div', { class: 'shell' }, els.sidebar, main), els.selbar);
  const mq = matchMedia('(max-width: 820px)');
  const onMq = () => { els.menuBtn.style.display = mq.matches ? '' : 'none'; if (!mq.matches) toggleSidebar(false); };
  mq.addEventListener('change', onMq);
  onMq();
  state.selection.addEventListener('change', onSelectionChange);
  document.addEventListener('keydown', onGlobalKey);
}

function toggleSidebar(open) {
  els.sidebar.classList.toggle('open', open);
  let scrim = $('.scrim');
  if (open && !scrim) {
    scrim = h('div', { class: 'scrim', onClick: () => toggleSidebar(false) });
    document.body.append(scrim);
  } else if (!open && scrim) scrim.remove();
}

async function logout() {
  await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
  location.reload();
}

async function rescan() {
  await api('/api/admin/rescan', { method: 'POST' });
  toast('Relecture de la bibliothèque lancée');
  pollStatus(true);
}

let statusTimer;
async function pollStatus(fast = false) {
  clearTimeout(statusTimer);
  try {
    const before = state.status?.library?.scannedAt;
    state.status = await api('/api/admin/status');
    renderFoot();
    if (before && state.status.library.scannedAt !== before) {
      await loadTree();
      if (state.route.view === 'lib') render();
    }
  } catch { /* réseau */ }
  const busy = fast || state.status?.library?.scanning || (state.status?.thumbs?.pending > 0);
  statusTimer = setTimeout(() => pollStatus(), busy ? 3000 : 30000);
}

function renderFoot() {
  const s = state.status;
  if (!s) return;
  const lib = s.library;
  const th = s.thumbs;
  const pre = th.prewarm && th.prewarm.index < th.prewarm.total ? ` · aperçus ${th.prewarm.index}/${th.prewarm.total}` : '';
  els.foot.innerHTML = '';
  append(els.foot, [
    h('div', { class: 'row' }, h('span', {}, h('span', { class: `dot${lib.scanning ? ' busy' : ''}` }), lib.scanning ? 'Lecture en cours…' : `${plural(lib.files, 'fichier')} · ${fmtBytes(lib.size)}`)),
    h('div', { class: 'row' }, h('span', {}, lib.scannedAt ? `Index du ${fmtDateTime(lib.scannedAt)}${pre}` : 'Index en cours de construction')),
    lib.scanError ? h('div', { class: 'error' }, lib.scanError) : null,
  ]);
}

// ---------- Arbre des dossiers ----------
async function loadTree() {
  state.tree = await api('/api/admin/dirs');
  renderTree();
}

function persistExpanded() { prefs.set('expanded', [...state.expanded]); }

function renderTree() {
  if (!state.tree) return;
  els.tree.innerHTML = '';
  const active = state.route.view === 'lib' ? state.route.path : null;
  // Ouvre les ancêtres du dossier courant.
  if (active) {
    const parts = active.split('/');
    let acc = '';
    for (const p of parts.slice(0, -1)) { acc = acc ? `${acc}/${p}` : p; state.expanded.add(acc); }
  }
  const build = (node, depth) => {
    const hasChildren = node.children.length > 0;
    const open = state.expanded.has(node.path);
    const chev = h('span', { class: `chev${open ? ' open' : ''}${hasChildren ? '' : ' leaf'}`, onClick: (e) => {
      e.stopPropagation();
      if (state.expanded.has(node.path)) state.expanded.delete(node.path); else state.expanded.add(node.path);
      persistExpanded();
      renderTree();
    } }, icon('chevronRight'));
    const item = h('div', { class: `tree-item${active === node.path ? ' active' : ''}`, title: node.name, onClick: () => { location.hash = libHash(node.path); toggleSidebar(false); } },
      chev, h('span', { class: 'tree-name' }, node.name), h('span', { class: 'tree-count' }, String(node.count)));
    const wrap = h('div', {}, item);
    if (hasChildren) wrap.append(h('div', { class: `tree-children${open ? '' : ' hidden'}` }, node.children.map((c) => build(c, depth + 1))));
    return wrap;
  };
  els.tree.append(...state.tree.children.map((c) => build(c, 0)));
  if (active === '') { /* racine : aucun surlignage dans l'arbre */ }
  const activeEl = $('.tree-item.active', els.tree);
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
}

// ---------- Rendu principal ----------
async function render() {
  els.navLib.classList.toggle('active', state.route.view !== 'shares');
  els.navShares.classList.toggle('active', state.route.view === 'shares');
  if (state.route.view !== 'search') els.search.value = '';
  renderTree();
  els.content.scrollTop = 0;
  if (state.route.view === 'shares') return renderShares();
  if (state.route.view === 'search') return renderSearch(state.route.q);
  return renderLibrary(state.route.path);
}

function applyTilePrefs() {
  els.content.style.setProperty('--tile', `${state.tile}px`);
  els.content.classList.toggle('no-names', !state.names);
}

function toggleItem(item, ev, container) {
  const asItem = (p) => {
    const el = $(`[data-path="${CSS.escape(p)}"]`, container);
    if (!el) return null;
    return { path: p, type: el.dataset.type, name: el.title || p.split('/').pop() };
  };
  rangeSelect(container, state.selection, { path: item.path, type: item.kind ? 'file' : 'dir', name: item.name, kind: item.kind }, ev, asItem);
}

function onSelectionChange() {
  const sel = state.selection;
  const selected = new Set(sel.map.keys());
  for (const el of $$('[data-path]', els.content)) el.classList.toggle('selected', selected.has(el.dataset.path));
  els.content.classList.toggle('selecting', sel.size > 0);
  const { dirs, files } = sel.counts();
  els.selbar.innerHTML = '';
  if (sel.size === 0) { els.selbar.classList.remove('show'); return; }
  const parts = [];
  if (dirs) parts.push(plural(dirs, 'dossier'));
  if (files) parts.push(plural(files, 'fichier'));
  els.selbar.append(
    h('span', { class: 'count' }, parts.join(' · ')),
    h('button', { class: 'btn ghost sm', onClick: showSelection }, icon('eye'), h('span', { class: 'hide-xs' }, 'Voir')),
    h('button', { class: 'btn ghost sm', onClick: downloadSelection }, icon('download'), h('span', { class: 'hide-xs' }, 'Télécharger')),
    h('button', { class: 'btn primary sm', onClick: () => openShareModal(sel.items()) }, icon('link'), 'Partager'),
    h('button', { class: 'btn ghost icon sm', title: 'Effacer la sélection', onClick: () => sel.clear() }, icon('x')));
  els.selbar.classList.add('show');
}

function onGlobalKey(e) {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (e.key === 'Escape' && !typing && !$('.overlay') && !$('.lightbox')) state.selection.clear();
  if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !typing && state.route.view === 'lib' && !$('.overlay') && !$('.lightbox')) {
    e.preventDefault();
    selectAllVisible();
  }
}

function selectAllVisible() {
  const items = $$('[data-path]', els.content).map((el) => ({ path: el.dataset.path, type: el.dataset.type, name: el.title }));
  const unique = new Map(items.map((i) => [i.path, i]));
  state.selection.addMany([...unique.values()]);
}

function downloadSelection() {
  const items = state.selection.items();
  const name = items.length === 1 ? items[0].name.replace(/\.[^.]+$/, '') : `${state.current?.name || 'Bézier ONE'} - selection`;
  postDownload('/api/admin/zip', { paths: JSON.stringify(items.map((i) => i.path)), name });
  toast('Préparation de l’archive…');
}

function showSelection() {
  const items = state.selection.items();
  const list = h('div', { class: 'sel-summary' }, items.map((it) => h('div', {},
    icon(it.type === 'dir' ? 'folder' : (KIND_ICON[it.kind] || 'file')),
    h('span', {}, it.name), h('span', { class: 'path' }, it.path),
    h('button', { class: 'btn ghost icon sm', style: { marginLeft: 'auto' }, onClick: (e) => { state.selection.delete(it.path); e.currentTarget.parentElement.remove(); } }, icon('x')))));
  const m = modal({ title: `Sélection (${items.length})`, body: list, footer: [
    h('button', { class: 'btn ghost', onClick: () => { state.selection.clear(); m.close(); } }, 'Tout effacer'),
    h('button', { class: 'btn primary', onClick: () => { m.close(); openShareModal(state.selection.items()); } }, icon('link'), 'Partager'),
  ] });
}

// ---------- Bibliothèque ----------
async function renderLibrary(path) {
  els.content.innerHTML = '';
  applyTilePrefs();
  els.content.append(skeleton(10));
  let data;
  try {
    data = await api(`/api/admin/dir?p=${enc(path)}`);
  } catch (err) {
    if (err.status === 401) return renderLogin(err);
    els.content.innerHTML = '';
    els.content.append(emptyState('folder', 'Dossier introuvable', err.message), h('p', {}, h('a', { class: 'btn', href: '#/lib/' }, 'Retour à la bibliothèque')));
    return;
  }
  if (state.route.view !== 'lib' || state.route.path !== path) return; // navigation plus récente
  state.current = data;
  els.content.innerHTML = '';

  // En-tête
  const crumbs = h('div', { class: 'crumbs' });
  data.breadcrumb.forEach((c, i) => {
    if (i) crumbs.append(h('span', { class: 'sep' }, icon('chevronRight')));
    crumbs.append(i === data.breadcrumb.length - 1 ? h('span', { class: 'current' }, c.name) : h('a', { href: libHash(c.path) }, c.name));
  });
  const subParts = [];
  if (data.dirCount) subParts.push(plural(data.dirCount, 'dossier'));
  subParts.push(plural(data.count, 'fichier'));
  if (data.size) subParts.push(fmtBytes(data.size));
  const dirItem = { path: data.path, type: 'dir', name: data.name };
  const head = h('div', { class: 'board-head' },
    h('div', {}, path ? crumbs : null, h('div', { class: 'board-title' }, h('h1', {}, data.name), h('span', { class: 'sub' }, subParts.join(' · ')))),
    h('div', { class: 'board-actions' },
      h('button', { class: 'btn ghost hide-xs', onClick: selectAllVisible }, icon('squareCheck'), 'Tout sélectionner'),
      data.count ? h('a', { class: 'btn ghost hide-xs', href: `/api/admin/zip?p=${enc(path)}` }, icon('download'), '.zip') : null,
      path ? h('button', { class: 'btn primary', onClick: () => openShareModal([dirItem], { title: data.name }) }, icon('link'), 'Partager ce dossier') : null));
  els.content.append(head);

  // Barre d'outils
  const counts = {};
  for (const f of FILTERS) counts[f.id] = data.files.filter(f.match).length;
  const chips = h('div', { class: 'chips' }, FILTERS.filter((f) => f.id === 'all' || counts[f.id] > 0).map((f) =>
    h('button', { class: `chip${state.filter === f.id ? ' active' : ''}`, onClick: () => { state.filter = f.id; renderLibrary(path); } }, f.label,
      h('span', { class: 'n' }, String(f.id === 'all' ? data.files.length : counts[f.id])))));
  const sortSel = h('select', { class: 'select sm', style: { width: 'auto' }, onChange: (e) => { state.sort = e.target.value; prefs.set('sort', state.sort); renderLibrary(path); } },
    SORTS.map((s) => h('option', { value: s.id, selected: state.sort === s.id }, s.label)));
  const seg = h('div', { class: 'seg' },
    h('button', { class: state.view === 'grid' ? 'active' : '', title: 'Grille', onClick: () => { state.view = 'grid'; prefs.set('view', 'grid'); renderLibrary(path); } }, icon('grid')),
    h('button', { class: state.view === 'list' ? 'active' : '', title: 'Liste', onClick: () => { state.view = 'list'; prefs.set('view', 'list'); renderLibrary(path); } }, icon('list')));
  const slider = h('input', { type: 'range', min: 120, max: 340, step: 10, value: state.tile, onInput: (e) => { state.tile = Number(e.target.value); applyTilePrefs(); }, onChange: () => prefs.set('tile', state.tile) });
  const namesBtn = h('button', { class: `btn ghost sm${state.names ? '' : ' active'}`, title: 'Afficher les noms', onClick: () => { state.names = !state.names; prefs.set('names', state.names); applyTilePrefs(); } }, icon('info'), h('span', { class: 'hide-xs' }, 'Noms'));
  els.content.append(h('div', { class: 'toolbar' }, chips, h('div', { class: 'spacer' }), sortSel, seg,
    h('label', { class: 'slider hide-xs' }, icon('minus'), slider, icon('plus')), namesBtn));

  // Sections : sous-dossiers
  const anyFilter = state.filter !== 'all';
  for (const sub of data.dirs) {
    const subItem = { path: sub.path, type: 'dir', name: sub.name };
    const previewFiles = sortFiles(filterFiles(sub.preview, state.filter), state.sort);
    const row = h('div', { class: 'row' });
    row.append(folderTile(sub, { thumb: thumbUrl, selected: state.selection.has(sub.path), onToggle: (d, e) => toggleItem(d, e, row), onOpen: () => { location.hash = libHash(sub.path); } }));
    for (const f of previewFiles) row.append(makeFileTile(f, previewFiles, row));
    const hidden = sub.fileCount - sub.preview.length;
    if (hidden > 0 && !anyFilter) row.append(h('div', { class: 'more' }, h('button', { onClick: () => expandSection(sec, sub, row) }, `+${hidden}`)));
    const sec = section({
      title: sub.name, count: sub.count, href: libHash(sub.path),
      actions: [
        h('button', { class: 'btn ghost sm', title: 'Sélectionner ce dossier', onClick: () => state.selection.toggle(subItem) }, icon('squareCheck'), h('span', { class: 'lbl' }, 'Sélectionner')),
        sub.fileCount > 0 ? h('button', { class: 'btn ghost sm', title: 'Afficher tous les fichiers', onClick: () => expandSection(sec, sub, row) }, icon('expand'), h('span', { class: 'lbl' }, 'Tout afficher')) : null,
        h('button', { class: 'btn ghost sm', title: 'Partager ce dossier', onClick: () => openShareModal([subItem], { title: sub.name }) }, icon('link'), h('span', { class: 'lbl' }, 'Partager')),
      ],
    }, row);
    els.content.append(sec);
  }

  // Fichiers du dossier courant
  const files = sortFiles(filterFiles(data.files, state.filter), state.sort);
  if (files.length) {
    const body = state.view === 'list' ? h('div', { class: 'list' }, listHeader()) : h('div', { class: 'grid' });
    for (const f of files) body.append(state.view === 'list' ? makeListRow(f, files, body) : makeFileTile(f, files, body));
    els.content.append(section({ title: data.dirs.length ? 'Fichiers' : '', count: files.length }, body));
  } else if (!data.dirs.length) {
    els.content.append(emptyState('folder', anyFilter ? 'Aucun fichier de ce type' : 'Dossier vide', anyFilter ? 'Modifiez le filtre pour voir les autres fichiers.' : null));
  }
  onSelectionChange();
}

function makeFileTile(file, list, container) {
  return fileTile(file, {
    thumb: thumbUrl,
    selected: state.selection.has(file.path),
    onToggle: (f, e) => toggleItem(f, e, container),
    onOpen: () => lightbox.open(list, list.indexOf(file)),
    downloadUrl: fileUrl(file, true),
  });
}

function makeListRow(file, list, container) {
  return listRow(file, {
    thumb: thumbUrl,
    selected: state.selection.has(file.path),
    onToggle: (f, e) => toggleItem(f, e, container),
    onOpen: () => lightbox.open(list, list.indexOf(file)),
  });
}

async function expandSection(sec, sub, row) {
  const data = await api(`/api/admin/dir?p=${enc(sub.path)}`);
  const files = sortFiles(filterFiles(data.files, state.filter), state.sort);
  const grid = h('div', { class: 'grid' });
  for (const f of files) grid.append(makeFileTile(f, files, grid));
  row.replaceWith(grid);
  const actions = $('.actions', sec);
  const btn = [...actions.children].find((b) => b.textContent.includes('Tout afficher'));
  if (btn) btn.replaceWith(h('button', { class: 'btn ghost sm', title: 'Réduire', onClick: () => renderLibrary(state.route.path) }, icon('collapse'), h('span', { class: 'lbl' }, 'Réduire')));
  onSelectionChange();
}

// ---------- Recherche ----------
async function renderSearch(q) {
  els.content.innerHTML = '';
  applyTilePrefs();
  els.search.value = q;
  els.content.append(skeleton(6));
  const res = await api(`/api/admin/search?q=${enc(q)}`);
  if (state.route.view !== 'search' || state.route.q !== q) return;
  els.content.innerHTML = '';
  els.content.append(h('div', { class: 'board-head' }, h('div', { class: 'board-title' }, h('h1', {}, `« ${q} »`),
    h('span', { class: 'sub' }, `${plural(res.dirs.length, 'dossier')} · ${plural(res.files.length, 'fichier')}`))));
  if (!res.dirs.length && !res.files.length) { els.content.append(emptyState('search', 'Aucun résultat', 'Essayez un autre mot-clé.')); return; }
  if (res.dirs.length) {
    const grid = h('div', { class: 'grid' });
    for (const d of res.dirs) grid.append(folderTile(d, { thumb: thumbUrl, selected: state.selection.has(d.path), onToggle: (x, e) => toggleItem(x, e, grid), onOpen: () => { location.hash = libHash(d.path); } }));
    els.content.append(section({ title: 'Dossiers', count: res.dirs.length }, grid));
  }
  if (res.files.length) {
    const files = sortFiles(res.files, state.sort);
    const grid = h('div', { class: 'grid' });
    for (const f of files) grid.append(makeFileTile(f, files, grid));
    els.content.append(section({ title: 'Fichiers', count: files.length }, grid));
  }
  onSelectionChange();
}

// ---------- Partage : création ----------
function expiryField(current = null) {
  const preset = h('select', { class: 'select' },
    h('option', { value: '' }, 'Jamais'),
    h('option', { value: '7' }, 'Dans 7 jours'),
    h('option', { value: '30' }, 'Dans 30 jours'),
    h('option', { value: '90' }, 'Dans 90 jours'),
    h('option', { value: 'date' }, 'À une date précise…'));
  const date = h('input', { class: 'input hidden', type: 'date' });
  if (current) { preset.value = 'date'; date.value = current.slice(0, 10); date.classList.remove('hidden'); }
  preset.addEventListener('change', () => date.classList.toggle('hidden', preset.value !== 'date'));
  const value = () => {
    if (!preset.value) return null;
    if (preset.value === 'date') return date.value ? new Date(`${date.value}T23:59:59`).toISOString() : null;
    return new Date(Date.now() + Number(preset.value) * 86400000).toISOString();
  };
  return { el: h('div', { class: 'field' }, h('label', {}, 'Expiration'), preset, date), value };
}

function openShareModal(items, { title } = {}) {
  if (!items.length) return;
  const defaultTitle = title || (items.length === 1 ? items[0].name.replace(/\.[^.]+$/, '') : (state.current?.path ? `${state.current.name} — sélection` : 'Sélection'));
  const titleIn = h('input', { class: 'input', value: defaultTitle, maxlength: 200 });
  const msgIn = h('textarea', { class: 'textarea', placeholder: 'Un mot pour vos destinataires (facultatif)…', maxlength: 2000 });
  const pwdIn = h('input', { class: 'input', type: 'text', placeholder: 'Aucun', autocomplete: 'off' });
  const dlIn = h('input', { type: 'checkbox', checked: true });
  const expiry = expiryField();
  const error = h('div', { class: 'error hidden' });
  const submit = h('button', { class: 'btn primary' }, icon('link'), 'Créer le lien');
  const summary = h('div', { class: 'sel-summary' }, items.slice(0, 50).map((it) => h('div', {}, icon(it.type === 'dir' ? 'folder' : (KIND_ICON[it.kind] || 'file')), h('span', {}, it.name), h('span', { class: 'path' }, it.path))),
    items.length > 50 ? h('div', {}, `… et ${items.length - 50} autres`) : null);
  const body = [
    h('div', { class: 'field' }, h('label', {}, `Contenu partagé (${plural(items.length, 'élément')})`), summary),
    h('div', { class: 'field' }, h('label', {}, 'Titre'), titleIn),
    h('div', { class: 'field' }, h('label', {}, 'Message'), msgIn),
    h('div', { class: 'form-row' }, expiry.el, h('div', { class: 'field' }, h('label', {}, 'Mot de passe'), pwdIn, h('span', { class: 'hint' }, 'Demandé à l’ouverture du lien.'))),
    h('label', { class: 'switch' }, dlIn, 'Autoriser le téléchargement des fichiers'),
    error,
  ];
  const m = modal({ title: 'Nouveau lien de partage', body, footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, 'Annuler'), submit] });
  submit.addEventListener('click', async () => {
    submit.disabled = true;
    error.classList.add('hidden');
    try {
      const res = await api('/api/admin/shares', { method: 'POST', body: {
        title: titleIn.value, message: msgIn.value, items: items.map((i) => i.path),
        expiresAt: expiry.value(), password: pwdIn.value || null, allowDownload: dlIn.checked,
      } });
      m.close();
      state.selection.clear();
      showLinkModal(res);
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove('hidden');
      submit.disabled = false;
    }
  });
}

function showLinkModal({ share, url }) {
  const input = h('input', { class: 'input', value: url, readonly: true, onClick: (e) => e.target.select() });
  const copy = h('button', { class: 'btn primary', onClick: async () => { if (await copyText(url)) toast('Lien copié'); } }, icon('copy'), 'Copier');
  const notes = [];
  if (share.hasPassword) notes.push('protégé par mot de passe');
  if (share.expiresAt) notes.push(`expire le ${fmtDate(share.expiresAt)}`);
  if (!share.allowDownload) notes.push('téléchargement désactivé');
  const m = modal({
    title: 'Lien prêt à partager',
    body: [
      h('p', {}, h('strong', {}, share.title), notes.length ? ` — ${notes.join(', ')}` : ''),
      h('div', { class: 'linkbox' }, input, copy),
      h('p', { class: 'hint', style: { fontSize: '12.5px', color: 'var(--muted)' } }, 'Toute personne disposant de ce lien peut consulter la sélection. Vous pouvez le désactiver à tout moment depuis « Liens de partage ».'),
    ],
    footer: [h('a', { class: 'btn ghost', href: url, target: '_blank', rel: 'noopener' }, icon('external'), 'Ouvrir'), h('button', { class: 'btn', onClick: () => m.close() }, 'Terminé')],
  });
  setTimeout(() => input.select(), 60);
}

// ---------- Partage : gestion ----------
async function renderShares() {
  els.content.innerHTML = '';
  els.content.classList.add('narrow');
  els.content.append(skeleton(0));
  const { shares, publicOrigin } = await api('/api/admin/shares');
  if (state.route.view !== 'shares') return;
  els.content.innerHTML = '';
  els.content.classList.remove('narrow');
  els.content.append(h('div', { class: 'board-head' },
    h('div', { class: 'board-title' }, h('h1', {}, 'Liens de partage'), h('span', { class: 'sub' }, plural(shares.length, 'lien'))),
    h('div', { class: 'board-actions' }, h('a', { class: 'btn ghost', href: '#/lib/' }, icon('plus'), 'Nouveau lien depuis la bibliothèque'))));
  if (!shares.length) { els.content.append(emptyState('link', 'Aucun lien pour l’instant', 'Sélectionnez des dossiers ou des fichiers dans la bibliothèque, puis « Partager ».')); return; }
  const cards = h('div', { class: 'cards', style: { maxWidth: '1100px' } });
  for (const s of shares) cards.append(shareCard(s, `${publicOrigin}/s/${s.id}`));
  els.content.append(cards);
}

function shareCard(s, url) {
  const off = s.disabled || s.expired;
  const cover = h('div', { class: 'card-cover' });
  if (s.cover) cover.append(h('img', { src: thumbUrl(s.cover, 480), alt: '', loading: 'lazy' }));
  else cover.append(icon('link'));
  const badges = [];
  if (s.disabled) badges.push(h('span', { class: 'badge warn' }, 'Désactivé'));
  else if (s.expired) badges.push(h('span', { class: 'badge warn' }, 'Expiré'));
  if (s.hasPassword) badges.push(h('span', { class: 'badge' }, icon('lock'), ' Mot de passe'));
  if (!s.allowDownload) badges.push(h('span', { class: 'badge' }, 'Consultation seule'));
  if (s.missing) badges.push(h('span', { class: 'badge warn', title: 'Des éléments partagés n’existent plus dans la bibliothèque' }, `${s.missing} introuvable(s)`));
  const meta = [plural(s.items.length, 'élément'), `créé le ${fmtDate(s.createdAt)}`];
  if (s.expiresAt) meta.push(`expire le ${fmtDate(s.expiresAt)}`);
  meta.push(s.views ? `${plural(s.views, 'vue')}${s.lastViewedAt ? ` · dernière le ${fmtDateTime(s.lastViewedAt)}` : ''}` : 'jamais ouvert');
  const card = h('div', { class: `card${off ? ' off' : ''}` }, cover,
    h('div', { class: 'card-body' },
      h('div', { class: 'card-title' }, s.title, ...badges),
      h('div', { class: 'card-meta' }, meta.flatMap((m, i) => (i ? [h('span', { class: 'sep' }), h('span', {}, m)] : [h('span', {}, m)]))),
      h('div', { class: 'card-link' }, url)),
    h('div', { class: 'card-actions' },
      h('button', { class: 'btn sm', onClick: async () => { if (await copyText(url)) toast('Lien copié'); } }, icon('copy'), 'Copier'),
      h('a', { class: 'btn ghost icon sm', href: url, target: '_blank', rel: 'noopener', title: 'Ouvrir' }, icon('external')),
      h('button', { class: 'btn ghost icon sm', title: 'Modifier', onClick: () => editShareModal(s) }, icon('edit')),
      h('button', { class: 'btn ghost icon sm', title: s.disabled ? 'Réactiver' : 'Désactiver', onClick: async () => {
        await api(`/api/admin/shares/${s.id}`, { method: 'PATCH', body: { disabled: !s.disabled } });
        toast(s.disabled ? 'Lien réactivé' : 'Lien désactivé');
        renderShares();
      } }, icon(s.disabled ? 'eye' : 'lock')),
      h('button', { class: 'btn ghost icon sm danger', title: 'Supprimer', onClick: async () => {
        if (!(await confirmModal({ title: 'Supprimer ce lien ?', text: `« ${s.title} » ne sera plus accessible. Les fichiers de la bibliothèque ne sont pas touchés.`, confirmLabel: 'Supprimer', danger: true }))) return;
        await api(`/api/admin/shares/${s.id}`, { method: 'DELETE' });
        toast('Lien supprimé');
        renderShares();
      } }, icon('trash'))));
  return card;
}

function editShareModal(s) {
  const titleIn = h('input', { class: 'input', value: s.title, maxlength: 200 });
  const msgIn = h('textarea', { class: 'textarea', maxlength: 2000 }, s.message || '');
  const pwdIn = h('input', { class: 'input', type: 'text', placeholder: s.hasPassword ? '(inchangé)' : 'Aucun', autocomplete: 'off' });
  const removePwd = h('input', { type: 'checkbox' });
  const dlIn = h('input', { type: 'checkbox', checked: s.allowDownload });
  const expiry = expiryField(s.expiresAt);
  const items = [...s.items];
  const list = h('div', { class: 'sel-summary' });
  const renderItems = () => {
    list.innerHTML = '';
    for (const p of items) list.append(h('div', {}, icon('file'), h('span', {}, p.split('/').pop()), h('span', { class: 'path' }, p),
      items.length > 1 ? h('button', { class: 'btn ghost icon sm', style: { marginLeft: 'auto' }, title: 'Retirer', onClick: () => { items.splice(items.indexOf(p), 1); renderItems(); } }, icon('x')) : null));
  };
  renderItems();
  const error = h('div', { class: 'error hidden' });
  const save = h('button', { class: 'btn primary' }, 'Enregistrer');
  const m = modal({
    title: 'Modifier le lien',
    body: [
      h('div', { class: 'field' }, h('label', {}, 'Titre'), titleIn),
      h('div', { class: 'field' }, h('label', {}, 'Message'), msgIn),
      h('div', { class: 'form-row' }, expiry.el, h('div', { class: 'field' }, h('label', {}, 'Mot de passe'), pwdIn, s.hasPassword ? h('label', { class: 'switch', style: { fontSize: '12.5px' } }, removePwd, 'Retirer le mot de passe') : null)),
      h('label', { class: 'switch' }, dlIn, 'Autoriser le téléchargement des fichiers'),
      h('div', { class: 'field' }, h('label', {}, `Éléments partagés (${items.length})`), list),
      error,
    ],
    footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, 'Annuler'), save],
  });
  save.addEventListener('click', async () => {
    save.disabled = true;
    const patch = { title: titleIn.value, message: msgIn.value, expiresAt: expiry.value(), allowDownload: dlIn.checked, items };
    if (removePwd.checked) patch.password = null;
    else if (pwdIn.value) patch.password = pwdIn.value;
    try {
      await api(`/api/admin/shares/${s.id}`, { method: 'PATCH', body: patch });
      m.close();
      toast('Lien mis à jour');
      renderShares();
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove('hidden');
      save.disabled = false;
    }
  });
}

boot();
