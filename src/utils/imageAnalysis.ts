import { ImageAnalysis } from '../types';

export function analyzeImage(imageData: ImageData): ImageAnalysis {
  const data = imageData.data;
  const pixelCount = imageData.width * imageData.height;
  const sampleStep = pixelCount > 500000 ? 4 : 1;

  let sumLum = 0;
  let sumLumSq = 0;
  let shadowClipCount = 0;
  let highlightClipCount = 0;
  let sampledCount = 0;

  const histogram = new Uint32Array(256);

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const lumInt = Math.round(lum);

    sumLum += lum;
    sumLumSq += lum * lum;
    histogram[Math.min(255, lumInt)]++;

    if (lum < 15) shadowClipCount++;
    if (lum > 240) highlightClipCount++;
    sampledCount++;
  }

  const meanBrightness = sumLum / sampledCount;
  const variance = sumLumSq / sampledCount - meanBrightness * meanBrightness;
  const contrastStdDev = Math.sqrt(Math.max(0, variance));

  const shadowClipPercent = (shadowClipCount / sampledCount) * 100;
  const highlightClipPercent = (highlightClipCount / sampledCount) * 100;

  let cumulative = 0;
  let tonalRangeMin = 0;
  const p5Threshold = sampledCount * 0.05;
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= p5Threshold) {
      tonalRangeMin = i;
      break;
    }
  }

  cumulative = 0;
  let tonalRangeMax = 255;
  const p95Threshold = sampledCount * 0.05;
  for (let i = 255; i >= 0; i--) {
    cumulative += histogram[i];
    if (cumulative >= p95Threshold) {
      tonalRangeMax = i;
      break;
    }
  }

  const width = imageData.width;
  const height = imageData.height;
  const freqStep = Math.max(1, Math.floor(Math.sqrt(pixelCount / 80000)));
  let laplacianSum = 0;
  let laplacianCount = 0;

  for (let y = 1; y < height - 1; y += freqStep) {
    for (let x = 1; x < width - 1; x += freqStep) {
      const idx = (y * width + x) * 4;
      const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      const top = 0.299 * data[((y - 1) * width + x) * 4] +
        0.587 * data[((y - 1) * width + x) * 4 + 1] +
        0.114 * data[((y - 1) * width + x) * 4 + 2];

      const bottom = 0.299 * data[((y + 1) * width + x) * 4] +
        0.587 * data[((y + 1) * width + x) * 4 + 1] +
        0.114 * data[((y + 1) * width + x) * 4 + 2];

      const left = 0.299 * data[(y * width + x - 1) * 4] +
        0.587 * data[(y * width + x - 1) * 4 + 1] +
        0.114 * data[(y * width + x - 1) * 4 + 2];

      const right = 0.299 * data[(y * width + x + 1) * 4] +
        0.587 * data[(y * width + x + 1) * 4 + 1] +
        0.114 * data[(y * width + x + 1) * 4 + 2];

      const laplacian = Math.abs(top + bottom + left + right - 4 * center);
      laplacianSum += laplacian;
      laplacianCount++;
    }
  }

  const maxLaplacian = 255 * 4;
  const highFreqEnergy = laplacianCount > 0
    ? Math.min(1, (laplacianSum / laplacianCount) / maxLaplacian * 8)
    : 0;

  let edgeSum = 0;
  let edgeSamples = 0;
  const edgeThreshold = 30;

  for (let y = 1; y < height - 1; y += freqStep) {
    for (let x = 1; x < width - 1; x += freqStep) {
      const tl = 0.299 * data[((y - 1) * width + x - 1) * 4] +
        0.587 * data[((y - 1) * width + x - 1) * 4 + 1] +
        0.114 * data[((y - 1) * width + x - 1) * 4 + 2];
      const tc = 0.299 * data[((y - 1) * width + x) * 4] +
        0.587 * data[((y - 1) * width + x) * 4 + 1] +
        0.114 * data[((y - 1) * width + x) * 4 + 2];
      const tr = 0.299 * data[((y - 1) * width + x + 1) * 4] +
        0.587 * data[((y - 1) * width + x + 1) * 4 + 1] +
        0.114 * data[((y - 1) * width + x + 1) * 4 + 2];
      const ml = 0.299 * data[(y * width + x - 1) * 4] +
        0.587 * data[(y * width + x - 1) * 4 + 1] +
        0.114 * data[(y * width + x - 1) * 4 + 2];
      const mr = 0.299 * data[(y * width + x + 1) * 4] +
        0.587 * data[(y * width + x + 1) * 4 + 1] +
        0.114 * data[(y * width + x + 1) * 4 + 2];
      const bl = 0.299 * data[((y + 1) * width + x - 1) * 4] +
        0.587 * data[((y + 1) * width + x - 1) * 4 + 1] +
        0.114 * data[((y + 1) * width + x - 1) * 4 + 2];
      const bc = 0.299 * data[((y + 1) * width + x) * 4] +
        0.587 * data[((y + 1) * width + x) * 4 + 1] +
        0.114 * data[((y + 1) * width + x) * 4 + 2];
      const br = 0.299 * data[((y + 1) * width + x + 1) * 4] +
        0.587 * data[((y + 1) * width + x + 1) * 4 + 1] +
        0.114 * data[((y + 1) * width + x + 1) * 4 + 2];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const magnitude = Math.sqrt(gx * gx + gy * gy);

      if (magnitude > edgeThreshold) edgeSum++;
      edgeSamples++;
    }
  }

  const edgeDensity = edgeSamples > 0 ? edgeSum / edgeSamples : 0;

  return {
    meanBrightness,
    contrastStdDev,
    highFreqEnergy,
    edgeDensity,
    shadowClipPercent,
    highlightClipPercent,
    tonalRangeMin,
    tonalRangeMax,
    imageHeight: height,
  };
}
