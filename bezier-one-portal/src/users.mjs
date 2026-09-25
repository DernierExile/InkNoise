// Comptes du studio. Le compte maître « studio » vient de ADMIN_PASSWORD (variable
// d'environnement, jamais stocké) ; les autres comptes vivent dans /data/users.json.
// Rôles : « owner » (gère les comptes) et « member » (bibliothèque et liens).
import path from 'node:path';
import crypto from 'node:crypto';
import { atomicWriteJson, readJson } from './util.mjs';

export const MASTER_LOGIN = 'studio';
const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

export class Users {
  constructor({ dataDir, masterPassword, log = console }) {
    this.file = path.join(dataDir, 'users.json');
    this.masterPassword = masterPassword || '';
    this.log = log;
    this.map = new Map();
  }

  async load() {
    const data = await readJson(this.file, { version: 1, users: [] });
    for (const u of data.users || []) this.map.set(u.login, u);
    if (this.map.size) this.log.info(`[users] ${this.map.size} compte(s) chargé(s)`);
  }

  async save() {
    await atomicWriteJson(this.file, { version: 1, users: [...this.map.values()] });
  }

  get masterEnabled() {
    return this.masterPassword.length > 0;
  }

  static normalizeLogin(login) {
    return String(login || '').trim().toLowerCase();
  }

  // Vue publique d'un compte (jamais le hash).
  view(u) {
    return { login: u.login, name: u.name, role: u.role, disabled: Boolean(u.disabled), createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null, master: u.login === MASTER_LOGIN };
  }

  master() {
    return { login: MASTER_LOGIN, name: 'Studio', role: 'owner', disabled: false, createdAt: null, lastLoginAt: this.masterLastLogin || null };
  }

  list() {
    const out = [];
    if (this.masterEnabled) out.push(this.view(this.master()));
    for (const u of this.map.values()) out.push(this.view(u));
    return out;
  }

  // Empreinte du mot de passe, embarquée dans la session : changer le mot de passe déconnecte.
  passwordStamp(login) {
    if (login === MASTER_LOGIN) return crypto.createHash('sha256').update(this.masterPassword).digest('hex').slice(0, 12);
    const u = this.map.get(login);
    return u ? u.passwordHash.slice(0, 12) : null;
  }

  // Retourne le compte (vue) si les identifiants sont valides, sinon null.
  authenticate(login, password) {
    login = Users.normalizeLogin(login) || MASTER_LOGIN;
    const pwd = String(password || '');
    if (login === MASTER_LOGIN) {
      if (!this.masterEnabled) return null;
      const a = Buffer.from(pwd);
      const b = Buffer.from(this.masterPassword);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      this.masterLastLogin = new Date().toISOString();
      return this.view(this.master());
    }
    const u = this.map.get(login);
    if (!u || u.disabled || !verifyPassword(pwd, u.passwordHash)) return null;
    u.lastLoginAt = new Date().toISOString();
    this.save().catch((err) => this.log.warn('[users] sauvegarde :', err.message));
    return this.view(u);
  }

  // Le compte d'une session est-il toujours valable ?
  resolve(login, stamp) {
    if (login === MASTER_LOGIN) return this.masterEnabled && stamp === this.passwordStamp(login) ? this.view(this.master()) : null;
    const u = this.map.get(login);
    if (!u || u.disabled || stamp !== this.passwordStamp(login)) return null;
    return this.view(u);
  }

  async create({ login, name, password, role }) {
    login = Users.normalizeLogin(login);
    if (!LOGIN_RE.test(login)) throw badRequest('Identifiant invalide : 2 à 32 caractères, lettres minuscules, chiffres, point, tiret.');
    if (login === MASTER_LOGIN || this.map.has(login)) throw badRequest('Cet identifiant existe déjà.');
    if (String(password || '').length < 8) throw badRequest('Le mot de passe doit faire au moins 8 caractères.');
    const u = {
      login,
      name: String(name || '').trim().slice(0, 80) || login,
      passwordHash: hashPassword(String(password)),
      role: role === 'owner' ? 'owner' : 'member',
      disabled: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    this.map.set(login, u);
    await this.save();
    return this.view(u);
  }

  async update(login, patch) {
    login = Users.normalizeLogin(login);
    if (login === MASTER_LOGIN) throw badRequest('Le compte maître se modifie via ADMIN_PASSWORD.');
    const u = this.map.get(login);
    if (!u) return null;
    if (patch.name !== undefined) u.name = String(patch.name).trim().slice(0, 80) || u.name;
    if (patch.password) {
      if (String(patch.password).length < 8) throw badRequest('Le mot de passe doit faire au moins 8 caractères.');
      u.passwordHash = hashPassword(String(patch.password));
    }
    if (patch.role !== undefined) u.role = patch.role === 'owner' ? 'owner' : 'member';
    if (patch.disabled !== undefined) u.disabled = Boolean(patch.disabled);
    await this.save();
    return this.view(u);
  }

  async remove(login) {
    login = Users.normalizeLogin(login);
    if (login === MASTER_LOGIN) throw badRequest('Le compte maître ne peut pas être supprimé.');
    const ok = this.map.delete(login);
    if (ok) await this.save();
    return ok;
  }
}
