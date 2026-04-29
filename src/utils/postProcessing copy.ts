import { PostProcessing } from '../types';

export function applyPostProcessing(imageData: ImageData, settings: PostProcessing): ImageData {
  const hasEffects = settings.scanlines > 0 || settings.chromaticAberration > 0 ||
    settings.vignette > 0 || settings.bloom > 0 || settings.crtCurve > 0;

  if (!hasEffects) return imageData;

  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  let data = new Uint8ClampedArray(src);

  if (settings.bloom > 0) {
    data = applyBloom(data, w, h, settings.bloom);
  }

  if (settings.scanlines > 0) {
    const fade = settings.scanlines / 100;
    for (let y = 0; y < h; y++) {
      if (y % 3 === 0) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          data[idx] = data[idx] * (1 - fade * 0.35);
          data[idx + 1] = data[idx + 1] * (1 - fade * 0.35);
          data[idx + 2] = data[idx + 2] * (1 - fade * 0.35);
        }
      }
    }
  }

  if (settings.chromaticAberration > 0) {
    const off = Math.round(settings.chromaticAberration * 0.5);
    const copy = new Uint8ClampedArray(data);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const rX = Math.min(w - 1, Math.max(0, x - off));
        const bX = Math.min(w - 1, Math.max(0, x + off));
        data[idx] = copy[(y * w + rX) * 4];
        data[idx + 2] = copy[(y * w + bX) * 4 + 2];
      }
    }
  }

  if (settings.vignette > 0) {
    const strength = settings.vignette / 100;
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const factor = 1 - (dist * dist * strength);
        const idx = (y * w + x) * 4;
        data[idx] = data[idx] * factor;
        data[idx + 1] = data[idx + 1] * factor;
        data[idx + 2] = data[idx + 2] * factor;
      }
    }
  }

  return new ImageData(data, w, h);
}

function applyBloom(data: Uint8ClampedArray, w: number, h: number, intensity: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data);
  const strength = intensity / 100;
  const radius = 3;
  const threshold = 180;

  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const idx = (y * w + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (brightness > threshold) {
        const excess = (brightness - threshold) / (255 - threshold) * strength;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = ((y + dy) * w + (x + dx)) * 4;
            const dist = Math.sqrt(dx * dx + dy * dy) / radius;
            if (dist > 1) continue;
            const falloff = (1 - dist) * excess * 0.3;
            result[nIdx] = Math.min(255, result[nIdx] + data[idx] * falloff);
            result[nIdx + 1] = Math.min(255, result[nIdx + 1] + data[idx + 1] * falloff);
            result[nIdx + 2] = Math.min(255, result[nIdx + 2] + data[idx + 2] * falloff);
          }
        }
      }
    }
  }
  return result;
}
