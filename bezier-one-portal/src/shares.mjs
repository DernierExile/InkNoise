// Liens de partage : une sélection d'éléments (dossiers et/ou fichiers) de la bibliothèque,
// identifiée par un jeton aléatoire non devinable, avec expiration, mot de passe et
// autorisation de téléchargement optionnels. Persistance : /data/shares.json (écriture atomique).
import path from 'node:path';
import crypto from 'node:crypto';
import { atomicWriteJson, readJson, randomId, isWithin, safeRel } from './util.mjs';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return true;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export class Shares {
  constructor({ dataDir, log = console }) {
    this.file = path.join(dataDir, 'shares.json');
    this.log = log;
    this.map = new Map();
    this.saveTimer = null;
  }

  async load() {
    const data = await readJson(this.file, { version: 2, shares: [] });
    if (data.version !== 2 || !Array.isArray(data.shares)) {
      throw new Error(`${this.file} n'est pas au format Bézier ONE v2 : choisissez un DATA_DIR vide (ex. /data/v2) pour ne pas écraser d'anciennes données.`);
    }
    for (const s of data.shares) this.map.set(s.id, s);
    this.log.info(`[shares] ${this.map.size} lien(s) chargé(s)`);
  }

  async save() {
    await atomicWriteJson(this.file, { version: 2, shares: [...this.map.values()] });
  }

  // Sauvegarde différée pour les compteurs de vues (évite une écriture par requête).
  saveSoon() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save().catch((err) => this.log.warn('[shares] sauvegarde :', err.message));
    }, 2000);
  }

  list() {
    return [...this.map.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => this.publicView(s, { admin: true }));
  }

  get(id) {
    return this.map.get(id) || null;
  }

  // Dédoublonne : un fichier ou dossier déjà couvert par un dossier sélectionné est retiré.
  static normalizeItems(items) {
    const clean = [];
    for (const raw of items || []) {
      const p = safeRel(typeof raw === 'string' ? raw : raw?.path);
      if (p == null || p === '') continue;
      if (!clean.includes(p)) clean.push(p);
    }
    return clean.filter((p) => !clean.some((other) => other !== p && isWithin(other, p)));
  }

  async create({ title, message, items, expiresAt, password, allowDownload = true }) {
    const id = randomId(16);
    const now = new Date().toISOString();
    const share = {
      id,
      title: String(title || '').trim().slice(0, 200) || 'Sélection',
      message: String(message || '').trim().slice(0, 2000),
      items: Shares.normalizeItems(items),
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      passwordHash: password ? hashPassword(String(password)) : null,
      allowDownload: Boolean(allowDownload),
      disabled: false,
      views: 0,
      lastViewedAt: null,
    };
    if (share.items.length === 0) throw Object.assign(new Error('Aucun élément à partager'), { status: 400 });
    this.map.set(id, share);
    await this.save();
    return share;
  }

  async update(id, patch) {
    const share = this.map.get(id);
    if (!share) return null;
    if (patch.title !== undefined) share.title = String(patch.title).trim().slice(0, 200) || share.title;
    if (patch.message !== undefined) share.message = String(patch.message).trim().slice(0, 2000);
    if (patch.items !== undefined) {
      const items = Shares.normalizeItems(patch.items);
      if (items.length === 0) throw Object.assign(new Error('Aucun élément à partager'), { status: 400 });
      share.items = items;
    }
    if (patch.expiresAt !== undefined) share.expiresAt = patch.expiresAt ? new Date(patch.expiresAt).toISOString() : null;
    if (patch.password !== undefined) share.passwordHash = patch.password ? hashPassword(String(patch.password)) : null;
    if (patch.allowDownload !== undefined) share.allowDownload = Boolean(patch.allowDownload);
    if (patch.disabled !== undefined) share.disabled = Boolean(patch.disabled);
    share.updatedAt = new Date().toISOString();
    await this.save();
    return share;
  }

  async remove(id) {
    const ok = this.map.delete(id);
    if (ok) await this.save();
    return ok;
  }

  isExpired(share) {
    return Boolean(share.expiresAt && Date.parse(share.expiresAt) < Date.now());
  }

  isActive(share) {
    return Boolean(share) && !share.disabled && !this.isExpired(share);
  }

  checkPassword(share, password) {
    return verifyPassword(String(password || ''), share.passwordHash);
  }

  recordView(share) {
    share.views = (share.views || 0) + 1;
    share.lastViewedAt = new Date().toISOString();
    this.saveSoon();
  }

  // Un chemin est-il couvert par ce partage (élément partagé ou contenu d'un dossier partagé) ?
  covers(share, rel) {
    return share.items.some((item) => isWithin(item, rel));
  }

  publicView(share, { admin = false } = {}) {
    const base = {
      id: share.id,
      title: share.title,
      message: share.message,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      allowDownload: share.allowDownload,
      hasPassword: Boolean(share.passwordHash),
    };
    if (!admin) return base;
    return {
      ...base,
      items: share.items,
      updatedAt: share.updatedAt,
      disabled: share.disabled,
      expired: this.isExpired(share),
      views: share.views || 0,
      lastViewedAt: share.lastViewedAt,
    };
  }
}
