// Sessions signées (HMAC) pour l'espace studio et pour les partages protégés par mot de passe.
// Le secret est généré au premier démarrage et conservé dans /data/secret.key.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ADMIN_COOKIE = 'bz_studio';
const ADMIN_TTL_MS = 30 * 24 * 3600 * 1000;
const SHARE_TTL_MS = 30 * 24 * 3600 * 1000;

export class Auth {
  constructor({ dataDir, users, log = console }) {
    this.secretFile = path.join(dataDir, 'secret.key');
    this.users = users;
    this.log = log;
    this.secret = null;
    this.attempts = new Map(); // ip -> { count, resetAt }
  }

  async init() {
    try {
      this.secret = (await fs.readFile(this.secretFile, 'utf8')).trim();
      if (this.secret.length < 32) throw new Error('secret trop court');
    } catch {
      this.secret = crypto.randomBytes(48).toString('base64url');
      await fs.mkdir(path.dirname(this.secretFile), { recursive: true });
      await fs.writeFile(this.secretFile, this.secret, { mode: 0o600 });
      this.log.info('[auth] nouveau secret de session généré');
    }
    if (!this.adminEnabled) this.log.warn('[auth] ADMIN_PASSWORD absent et aucun compte : le premier accès à /admin créera le compte propriétaire');
  }

  get adminEnabled() {
    return this.users.masterEnabled || this.users.map.size > 0;
  }

  sign(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', this.secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  verify(token) {
    if (!token || typeof token !== 'string') return null;
    const i = token.lastIndexOf('.');
    if (i < 0) return null;
    const body = token.slice(0, i);
    const sig = token.slice(i + 1);
    const expected = crypto.createHmac('sha256', this.secret).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  // ---------- Cookies ----------
  static parseCookies(req) {
    const out = {};
    const header = req.headers.cookie;
    if (!header) return out;
    for (const part of header.split(';')) {
      const i = part.indexOf('=');
      if (i < 0) continue;
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      if (k) out[k] = decodeURIComponent(v);
    }
    return out;
  }

  static isSecure(req) {
    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    if (proto) return proto === 'https';
    const cf = req.headers['cf-visitor'];
    if (cf) { try { return JSON.parse(cf).scheme === 'https'; } catch { /* ignore */ } }
    return Boolean(req.secure);
  }

  static setCookie(req, res, name, value, { maxAgeMs, path: cookiePath = '/' } = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${cookiePath}`, 'HttpOnly', 'SameSite=Lax'];
    if (maxAgeMs != null) parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
    if (Auth.isSecure(req)) parts.push('Secure');
    res.append('Set-Cookie', parts.join('; '));
  }

  static clearCookie(req, res, name, cookiePath = '/') {
    res.append('Set-Cookie', `${name}=; Path=${cookiePath}; Max-Age=0; HttpOnly; SameSite=Lax`);
  }

  // ---------- Studio ----------
  // Compte connecté (vue publique) ou null. La session porte une empreinte du mot de
  // passe : un mot de passe changé ou un compte désactivé invalide la session.
  currentUser(req) {
    if (!this.adminEnabled) return null;
    const token = Auth.parseCookies(req)[ADMIN_COOKIE];
    const payload = this.verify(token);
    if (!payload || payload.role !== 'studio' || !payload.login) return null;
    return this.users.resolve(payload.login, payload.pw);
  }

  isAdmin(req) {
    return this.currentUser(req) != null;
  }

  clientIp(req) {
    const fwd = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return fwd || req.socket?.remoteAddress || 'unknown';
  }

  // Limite : 8 tentatives par 15 minutes et par adresse.
  throttled(req) {
    const ip = this.clientIp(req);
    const now = Date.now();
    const entry = this.attempts.get(ip);
    if (!entry || entry.resetAt < now) return false;
    return entry.count >= 8;
  }

  recordAttempt(req, success) {
    const ip = this.clientIp(req);
    if (success) { this.attempts.delete(ip); return; }
    const now = Date.now();
    const entry = this.attempts.get(ip);
    if (!entry || entry.resetAt < now) this.attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    else entry.count++;
    if (this.attempts.size > 5000) this.attempts.clear();
  }

  loginAdmin(req, res, login, password) {
    if (!this.adminEnabled) return null;
    const user = this.users.authenticate(login, password);
    this.recordAttempt(req, Boolean(user));
    if (!user) return null;
    const token = this.sign({
      role: 'studio', login: user.login, pw: this.users.passwordStamp(user.login),
      exp: Date.now() + ADMIN_TTL_MS, n: crypto.randomBytes(6).toString('hex'),
    });
    Auth.setCookie(req, res, ADMIN_COOKIE, token, { maxAgeMs: ADMIN_TTL_MS });
    return user;
  }

  logoutAdmin(req, res) {
    Auth.clearCookie(req, res, ADMIN_COOKIE);
  }

  // ---------- Partages protégés ----------
  shareCookieName(id) {
    return `bz_s_${id}`;
  }

  hasShareAccess(req, share) {
    if (!share.passwordHash) return true;
    const token = Auth.parseCookies(req)[this.shareCookieName(share.id)];
    const payload = this.verify(token);
    // Le jeton embarque une empreinte du mot de passe : changer le mot de passe invalide les accès.
    return Boolean(payload && payload.share === share.id && payload.pw === share.passwordHash.slice(0, 12));
  }

  grantShareAccess(req, res, share) {
    const token = this.sign({ share: share.id, pw: share.passwordHash.slice(0, 12), exp: Date.now() + SHARE_TTL_MS });
    Auth.setCookie(req, res, this.shareCookieName(share.id), token, { maxAgeMs: SHARE_TTL_MS, path: `/` });
  }
}
