// Archive ZIP en flux (sans compression : les médias le sont déjà), avec support ZIP64.
import archiver from 'archiver';
import { contentDisposition } from './util.mjs';

// entries : [{ abs, name }] où `name` est le chemin dans l'archive.
export function streamZip(res, filename, entries, { log = console } = {}) {
  const archive = archiver('zip', { store: true });
  res.status(200);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', contentDisposition('attachment', filename));
  res.setHeader('Cache-Control', 'no-store');
  archive.on('warning', (err) => log.warn('[zip] avertissement :', err.message));
  archive.on('error', (err) => {
    log.error('[zip] erreur :', err.message);
    if (!res.headersSent) res.status(500).end();
    else res.destroy(err);
  });
  res.on('close', () => archive.destroy());
  archive.pipe(res);
  for (const e of entries) archive.file(e.abs, { name: e.name });
  archive.finalize();
}

// Nom de fichier sûr pour l'archive (sans séparateurs ni caractères réservés).
export function safeZipName(s, fallback = 'selection') {
  const clean = String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return (clean || fallback).slice(0, 120);
}
