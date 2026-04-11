import { ColorMode, ColorModeSettings } from '../types';
import { hexToRgb } from './palettes';
import { getLuminance } from './oklab';

export function applyColorMode(
  imageData: ImageData,
  mode: ColorMode,
  settings: ColorModeSettings
): ImageData {
  switch (mode) {
    case 'duo-tone':
      return applyDuoTone(imageData, settings);
    case 'tri-tone':
      return applyTriTone(imageData, settings);
    case 'tonal':
      return applyTonalMapping(imageData, settings);
    case 'modulation':
      return applyModulationPre(imageData, settings);
    default:
      return imageData;
  }
}

export function applyColorModePost(
  imageData: ImageData,
  mode: ColorMode,
  settings: ColorModeSettings
): ImageData {
  switch (mode) {
    case 'rgb-split':
      return applyRgbSplit(imageData, settings);
    case 'modulation':
      return applyModulationPost(imageData, settings);
    default:
      return imageData;
  }
}

function applyDuoTone(imageData: ImageData, settings: ColorModeSettings): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const shadow = hexToRgb(settings.duoTone.shadowColor);
  const highlight = hexToRgb(settings.duoTone.highlightColor);

  for (let i = 0; i < data.length; i += 4) {
    const lum = getLuminance(data[i], data[i + 1], data[i + 2]);
    data[i] = shadow[0] + (highlight[0] - shadow[0]) * lum;
    data[i + 1] = shadow[1] + (highlight[1] - shadow[1]) * lum;
    data[i + 2] = shadow[2] + (highlight[2] - shadow[2]) * lum;
  }
  return new ImageData(data, imageData.width, imageData.height);
}

function applyTriTone(imageData: ImageData, settings: ColorModeSettings): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const shadow = hexToRgb(settings.triTone.shadowColor);
  const mid = hexToRgb(settings.triTone.midtoneColor);
  const highlight = hexToRgb(settings.triTone.highlightColor);

  for (let i = 0; i < data.length; i += 4) {
    const lum = getLuminance(data[i], data[i + 1], data[i + 2]);
    let r: number, g: number, b: number;

    if (lum < 0.5) {
      const t = lum * 2;
      r = shadow[0] + (mid[0] - shadow[0]) * t;
      g = shadow[1] + (mid[1] - shadow[1]) * t;
      b = shadow[2] + (mid[2] - shadow[2]) * t;
    } else {
      const t = (lum - 0.5) * 2;
      r = mid[0] + (highlight[0] - mid[0]) * t;
      g = mid[1] + (highlight[1] - mid[1]) * t;
      b = mid[2] + (highlight[2] - mid[2]) * t;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return new ImageData(data, imageData.width, imageData.height);
}

function applyTonalMapping(imageData: ImageData, settings: ColorModeSettings): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const shadow = hexToRgb(settings.tonalMapping.shadowColor);
  const mid = hexToRgb(settings.tonalMapping.midtoneColor);
  const highlight = hexToRgb(settings.tonalMapping.highlightColor);
  const preserve = settings.tonalMapping.preserveOriginal / 100;

  for (let i = 0; i < data.length; i += 4) {
    const lum = getLuminance(data[i], data[i + 1], data[i + 2]);
    const shadowW = Math.pow(1 - lum, 2);
    const highlightW = Math.pow(lum, 2);
    const midW = 1 - shadowW - highlightW;

    const mr = shadow[0] * shadowW + mid[0] * midW + highlight[0] * highlightW;
    const mg = shadow[1] * shadowW + mid[1] * midW + highlight[1] * highlightW;
    const mb = shadow[2] * shadowW + mid[2] * midW + highlight[2] * highlightW;

    data[i] = data[i] * preserve + mr * (1 - preserve);
    data[i + 1] = data[i + 1] * preserve + mg * (1 - preserve);
    data[i + 2] = data[i + 2] * preserve + mb * (1 - preserve);
  }
  return new ImageData(data, imageData.width, imageData.height);
}

function applyRgbSplit(imageData: ImageData, settings: ColorModeSettings): ImageData {
  const { redOffsetX, redOffsetY, blueOffsetX, blueOffsetY, intensity } = settings.rgbSplit;
  if (intensity === 0) return imageData;

  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const data = new Uint8ClampedArray(src);
  const mix = intensity / 100;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      const rxS = Math.min(w - 1, Math.max(0, x + redOffsetX));
      const ryS = Math.min(h - 1, Math.max(0, y + redOffsetY));
      const rIdx = (ryS * w + rxS) * 4;

      const bxS = Math.min(w - 1, Math.max(0, x + blueOffsetX));
      const byS = Math.min(h - 1, Math.max(0, y + blueOffsetY));
      const bIdx = (byS * w + bxS) * 4;

      data[idx] = src[idx] * (1 - mix) + src[rIdx] * mix;
      data[idx + 2] = src[idx + 2] * (1 - mix) + src[bIdx + 2] * mix;
    }
  }
  return new ImageData(data, w, h);
}

function applyModulationPre(imageData: ImageData, settings: ColorModeSettings): ImageData {
  const { pixelation } = settings.modulation;
  if (pixelation <= 1) return imageData;

  const w = imageData.width;
  const h = imageData.height;
  const data = new Uint8ClampedArray(imageData.data);
  const blockSize = Math.round(pixelation);

  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < blockSize && by + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && bx + dx < w; dx++) {
          const idx = ((by + dy) * w + (bx + dx)) * 4;
          r += imageData.data[idx];
          g += imageData.data[idx + 1];
          b += imageData.data[idx + 2];
          count++;
        }
      }
      r /= count; g /= count; b /= count;
      for (let dy = 0; dy < blockSize && by + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && bx + dx < w; dx++) {
          const idx = ((by + dy) * w + (bx + dx)) * 4;
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
        }
      }
    }
  }
  return new ImageData(data, w, h);
}

function applyModulationPost(imageData: ImageData, settings: ColorModeSettings): ImageData {
  const { scanlineIntensity, scanlineGap, chromaticOffset, rgbShift, noiseAmount, interference } = settings.modulation;
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const data = new Uint8ClampedArray(src);

  if (scanlineIntensity > 0) {
    const gap = Math.max(2, scanlineGap);
    const fade = scanlineIntensity / 100;
    for (let y = 0; y < h; y++) {
      if (y % gap === 0) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          data[idx] *= (1 - fade * 0.6);
          data[idx + 1] *= (1 - fade * 0.6);
          data[idx + 2] *= (1 - fade * 0.6);
        }
      }
    }
  }

  if (chromaticOffset > 0) {
    const off = Math.round(chromaticOffset);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const srcR = Math.min(w - 1, Math.max(0, x - off));
        const srcB = Math.min(w - 1, Math.max(0, x + off));
        data[idx] = src[(y * w + srcR) * 4];
        data[idx + 2] = src[(y * w + srcB) * 4 + 2];
      }
    }
  }

  if (rgbShift > 0) {
    const shift = Math.round(rgbShift);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const srcY = Math.min(h - 1, Math.max(0, y + shift));
        data[idx + 1] = src[(srcY * w + x) * 4 + 1];
      }
    }
  }

  if (noiseAmount > 0) {
    const amount = noiseAmount / 100 * 80;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * amount;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }

  if (interference > 0) {
    const strength = interference / 100;
    for (let y = 0; y < h; y++) {
      const wave = Math.sin(y * 0.05) * strength * 30;
      const shift = Math.round(wave);
      if (shift === 0) continue;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const srcX = Math.min(w - 1, Math.max(0, x + shift));
        const srcIdx = (y * w + srcX) * 4;
        data[idx] = src[srcIdx];
        data[idx + 1] = src[srcIdx + 1];
        data[idx + 2] = src[srcIdx + 2];
      }
    }
  }

  return new ImageData(data, w, h);
}
