import { ImageAdjustments } from '../types';

export function applyAdjustments(imageData: ImageData, adjustments: ImageAdjustments): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    [r, g, b] = applyBrightness(r, g, b, adjustments.brightness);
    [r, g, b] = applyContrast(r, g, b, adjustments.contrast);
    [r, g, b] = applySaturation(r, g, b, adjustments.saturation);
    [r, g, b] = applyLevels(r, g, b, adjustments.levels);
    [r, g, b] = applyTonalControls(r, g, b, adjustments.tonalControls);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  let result = new ImageData(data, width, height);

  if (adjustments.blur > 0) {
    result = applyBlur(result, adjustments.blur);
  }

  if (adjustments.sharpen > 0) {
    result = applySharpen(result, adjustments.sharpen, adjustments.sharpenRadius);
  }

  if (adjustments.noise > 0) {
    result = applyNoise(result, adjustments.noise);
  }

  return result;
}

function applyBrightness(r: number, g: number, b: number, brightness: number): [number, number, number] {
  const factor = brightness / 100;
  return [
    Math.max(0, Math.min(255, r + factor * 255)),
    Math.max(0, Math.min(255, g + factor * 255)),
    Math.max(0, Math.min(255, b + factor * 255))
  ];
}

function applyContrast(r: number, g: number, b: number, contrast: number): [number, number, number] {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  return [
    Math.max(0, Math.min(255, factor * (r - 128) + 128)),
    Math.max(0, Math.min(255, factor * (g - 128) + 128)),
    Math.max(0, Math.min(255, factor * (b - 128) + 128))
  ];
}

function applySaturation(r: number, g: number, b: number, saturation: number): [number, number, number] {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const factor = saturation / 100;
  return [
    Math.max(0, Math.min(255, gray + factor * (r - gray))),
    Math.max(0, Math.min(255, gray + factor * (g - gray))),
    Math.max(0, Math.min(255, gray + factor * (b - gray)))
  ];
}

function applyLevels(r: number, g: number, b: number, levels: { inputBlack: number; inputWhite: number; outputBlack: number; outputWhite: number; gamma: number }): [number, number, number] {
  const adjustChannel = (value: number) => {
    let normalized = (value - levels.inputBlack) / (levels.inputWhite - levels.inputBlack);
    normalized = Math.max(0, Math.min(1, normalized));
    normalized = Math.pow(normalized, 1 / levels.gamma);
    return levels.outputBlack + normalized * (levels.outputWhite - levels.outputBlack);
  };

  return [
    Math.max(0, Math.min(255, adjustChannel(r))),
    Math.max(0, Math.min(255, adjustChannel(g))),
    Math.max(0, Math.min(255, adjustChannel(b)))
  ];
}

function applyTonalControls(r: number, g: number, b: number, tonal: { highlights: number; midtones: number; shadows: number }): [number, number, number] {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const normalizedLum = luminance / 255;

  const shadowWeight = Math.pow(1 - normalizedLum, 2);
  const highlightWeight = Math.pow(normalizedLum, 2);
  const midtoneWeight = 1 - shadowWeight - highlightWeight;

  const adjustment =
    (tonal.shadows / 100) * shadowWeight +
    (tonal.midtones / 100) * midtoneWeight +
    (tonal.highlights / 100) * highlightWeight;

  const factor = 1 + adjustment;

  return [
    Math.max(0, Math.min(255, r * factor)),
    Math.max(0, Math.min(255, g * factor)),
    Math.max(0, Math.min(255, b * factor))
  ];
}

function applyBlur(imageData: ImageData, strength: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  const radius = Math.round(strength / 10);

  if (radius < 1) return imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const idx = (py * width + px) * 4;

          r += imageData.data[idx];
          g += imageData.data[idx + 1];
          b += imageData.data[idx + 2];
          count++;
        }
      }

      const idx = (y * width + x) * 4;
      data[idx] = r / count;
      data[idx + 1] = g / count;
      data[idx + 2] = b / count;
    }
  }

  return new ImageData(data, width, height);
}

function applySharpen(imageData: ImageData, strength: number, radius: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  const factor = strength / 50;
  const kernelRadius = Math.max(1, Math.round(radius / 10));

  const kernelSize = kernelRadius * 2 + 1;
  const centerWeight = kernelSize * kernelSize;
  const neighborWeight = -1;

  for (let y = kernelRadius; y < height - kernelRadius; y++) {
    for (let x = kernelRadius; x < width - kernelRadius; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
        for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const weight = (kx === 0 && ky === 0) ? centerWeight : neighborWeight;

          r += imageData.data[idx] * weight;
          g += imageData.data[idx + 1] * weight;
          b += imageData.data[idx + 2] * weight;
        }
      }

      const idx = (y * width + x) * 4;
      const originalR = imageData.data[idx];
      const originalG = imageData.data[idx + 1];
      const originalB = imageData.data[idx + 2];

      data[idx] = Math.max(0, Math.min(255, originalR + (r - originalR) * factor));
      data[idx + 1] = Math.max(0, Math.min(255, originalG + (g - originalG) * factor));
      data[idx + 2] = Math.max(0, Math.min(255, originalB + (b - originalB) * factor));
    }
  }

  return new ImageData(data, width, height);
}

function applyNoise(imageData: ImageData, intensity: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const amount = intensity / 100 * 255;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount;

    data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
  }

  return new ImageData(data, imageData.width, imageData.height);
}
