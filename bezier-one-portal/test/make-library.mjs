// Génère une bibliothèque de test (images, vidéo, PDF, divers) pour le développement local.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const root = path.resolve(process.argv[2] || 'test/library');
await fs.rm(root, { recursive: true, force: true });

const palette = ['#e0574c', '#f2a541', '#2e86ab', '#4a7c59', '#7b5ea7', '#c9a227', '#3c6e71', '#d1495b', '#ffa69e', '#6b705c'];
let n = 0;

async function image(file, label, w = 1600, hgt = 2000) {
  const color = palette[n++ % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#111"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${w * 0.7}" cy="${hgt * 0.3}" r="${Math.min(w, hgt) * 0.18}" fill="rgba(255,255,255,0.25)"/>
    <text x="60" y="${hgt - 80}" font-family="Helvetica, Arial" font-size="${Math.round(w / 18)}" fill="#fff" opacity="0.9">${label}</text>
  </svg>`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  const ext = path.extname(file).toLowerCase();
  const img = sharp(Buffer.from(svg));
  if (ext === '.png') await img.png().toFile(file);
  else if (ext === '.webp') await img.webp().toFile(file);
  else await img.jpeg({ quality: 82 }).toFile(file);
}

async function video(file, seconds = 3) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `testsrc=size=640x360:rate=24`, '-t', String(seconds), '-pix_fmt', 'yuv420p', file]);
}

async function pdf(file, title) {
  const content = `BT /F1 36 Tf 60 700 Td (${title}) Tj ET 0.9 0.35 0.3 rg 60 100 300 400 re f`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, out);
}

async function text(file, body) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
}

const j = (...p) => path.join(root, ...p);
const campagnes = path.join('2. CLIENTS', 'BOMBERS ORIGINALS', '1. MINI CAMPAGNES');

for (let i = 1; i <= 10; i++) await image(j(campagnes, 'BTS', `BTS_${String(i).padStart(3, '0')}.jpg`), `BTS ${i}`, i % 3 === 0 ? 2000 : 1600, i % 3 === 0 ? 1333 : 2000);
for (let i = 1; i <= 18; i++) await image(j(campagnes, 'NYC SUMMER', `NYC_${String(i).padStart(3, '0')}.jpg`), `NYC ${i}`);
await video(j(campagnes, 'NYC SUMMER', 'NYC_teaser.mp4'));
for (let i = 1; i <= 7; i++) await image(j(campagnes, 'Festival Outfits', 'OLD-DONOTUSE', `Festival_old_${i}.jpg`), `Old ${i}`);
for (let i = 1; i <= 11; i++) await image(j(campagnes, 'Festival Outfits', 'Selection 2', `Festival_${i}.jpg`), `Festival ${i}`);
for (let i = 1; i <= 5; i++) await image(j(campagnes, 'Festival Outfits', `Festival_hero_${i}.png`), `Hero ${i}`, 2400, 1600);
for (let i = 1; i <= 14; i++) await image(j(campagnes, 'Sea, Bombers and fun', 'Selection MEN', `Sea_men_${i}.jpg`), `Sea men ${i}`);
for (let i = 1; i <= 8; i++) await image(j(campagnes, 'Sea, Bombers and fun', 'A PUBLIER', `Sea_publish_${i}.jpg`), `Publish ${i}`);
await video(j(campagnes, 'Sea, Bombers and fun', 'A PUBLIER', 'Sea_reel_9x16.mp4'), 2);
await pdf(j(campagnes, 'Brief mini campagnes.pdf'), 'Brief mini campagnes');
await text(j(campagnes, 'Notes.txt'), 'Notes de production\n');
await text(j(campagnes, 'Maquette.psd'), 'not a real psd');
for (let i = 1; i <= 6; i++) await image(j('2. CLIENTS', 'BOMBERS ORIGINALS', '4. FILM DE MARQUE', 'ASSETS', `Asset_${i}.webp`), `Asset ${i}`, 1200, 1200);
await video(j('2. CLIENTS', 'BOMBERS ORIGINALS', '4. FILM DE MARQUE', 'FILMS READY', 'Film_de_marque_v3.mp4'), 4);
for (let i = 1; i <= 4; i++) await image(j('2. CLIENTS', 'DERNIER EXILE', `Exile_${i}.jpg`), `Exile ${i}`);
for (let i = 1; i <= 3; i++) await image(j('0. WORKSHOP', `Workshop_${i}.jpg`), `Workshop ${i}`);
await image(j('Été à Paris', 'Café_crème_01.jpg'), 'Café crème');
await text(j('.DS_Store'), 'ignored');
await text(j('@eaDir', 'ignored.txt'), 'ignored');
await fs.symlink('/etc', j('lien-interdit')).catch(() => {});

console.log('Bibliothèque de test générée dans', root);
