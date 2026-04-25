import { PaletteModifiers } from '../types';
import { rgbToOklab, oklabDistance } from './oklab';
import { hexToRgb, rgbToHex } from './palettes';
import { rgbToHsl, hslToRgb } from './oklab';

export function findClosestColorOklab(r: number, g: number, b: number, palette: string[]): [number, number, number] {
  const target = rgbToOklab(r, g, b);
  let minDist = Infinity;
  let closest: [number, number, number] = [0, 0, 0];

  for (const hex of palette) {
    const [pr, pg, pb] = hexToRgb(hex);
    const lab = rgbToOklab(pr, pg, pb);
    const dist = oklabDistance(target, lab);
    if (dist < minDist) {
      minDist = dist;
      closest = [pr, pg, pb];
    }
  }
  return closest;
}

export function applyPaletteModifiers(colors: string[], mods: PaletteModifiers): string[] {
  if (mods.hueShift === 0 && mods.saturationBoost === 0 && mods.brightnessShift === 0 && mods.intensity === 100) {
    return colors;
  }
  return colors.map(hex => {
    const [r, g, b] = hexToRgb(hex);
    let [h, s, l] = rgbToHsl(r, g, b);

    h = (h + mods.hueShift + 360) % 360;
    s = Math.max(0, Math.min(100, s + mods.saturationBoost));
    l = Math.max(0, Math.min(100, l + mods.brightnessShift));

    if (mods.intensity !== 100) {
      s = s * (mods.intensity / 100);
    }

    const [nr, ng, nb] = hslToRgb(h, s, l);
    return rgbToHex(nr, ng, nb);
  });
}

export function extractPaletteMedianCut(imageData: ImageData, maxColors: number): string[] {
  const pixels: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(imageData.data.length / 4 / 10000));

  for (let i = 0; i < imageData.data.length; i += 4 * step) {
    pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
  }

  const buckets: [number, number, number][][] = [pixels];

  while (buckets.length < maxColors) {
    let largestIdx = 0;
    let largestRange = 0;

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (bucket.length < 2) continue;
      const range = getBucketRange(bucket);
      if (range > largestRange) {
        largestRange = range;
        largestIdx = i;
      }
    }

    if (largestRange === 0) break;

    const bucket = buckets[largestIdx];
    const channel = getDominantChannel(bucket);
    bucket.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(bucket.length / 2);
    buckets.splice(largestIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
  }

  return buckets
    .filter(b => b.length > 0)
    .map(bucket => {
      const avg = bucket.reduce(
        (acc, px) => [acc[0] + px[0], acc[1] + px[1], acc[2] + px[2]],
        [0, 0, 0]
      );
      return rgbToHex(
        Math.round(avg[0] / bucket.length),
        Math.round(avg[1] / bucket.length),
        Math.round(avg[2] / bucket.length)
      );
    });
}

function getBucketRange(bucket: [number, number, number][]): number {
  let maxR = 0, minR = 255, maxG = 0, minG = 255, maxB = 0, minB = 255;
  for (const [r, g, b] of bucket) {
    if (r > maxR) maxR = r; if (r < minR) minR = r;
    if (g > maxG) maxG = g; if (g < minG) minG = g;
    if (b > maxB) maxB = b; if (b < minB) minB = b;
  }
  return Math.max(maxR - minR, maxG - minG, maxB - minB);
}

function getDominantChannel(bucket: [number, number, number][]): 0 | 1 | 2 {
  let maxR = 0, minR = 255, maxG = 0, minG = 255, maxB = 0, minB = 255;
  for (const [r, g, b] of bucket) {
    if (r > maxR) maxR = r; if (r < minR) minR = r;
    if (g > maxG) maxG = g; if (g < minG) minG = g;
    if (b > maxB) maxB = b; if (b < minB) minB = b;
  }
  const rRange = maxR - minR;
  const gRange = maxG - minG;
  const bRange = maxB - minB;
  if (rRange >= gRange && rRange >= bRange) return 0;
  if (gRange >= rRange && gRange >= bRange) return 1;
  return 2;
}
