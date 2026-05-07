import { DitheringAlgorithm } from '../types';
import { findClosestColor } from './palettes';

export function applyDithering(
  imageData: ImageData,
  algorithm: DitheringAlgorithm,
  palette: string[]
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  switch (algorithm) {
    case 'floyd-steinberg':
      return floydSteinberg(data, width, height, palette);
    case 'atkinson':
      return atkinson(data, width, height, palette);
    case 'jarvis-judice-ninke':
      return jarvisJudiceNinke(data, width, height, palette);
    case 'stucki':
      return stucki(data, width, height, palette);
    case 'burkes':
      return burkes(data, width, height, palette);
    case 'sierra':
      return sierra(data, width, height, palette);
    case 'sierra-lite':
      return sierraLite(data, width, height, palette);
    case 'stevenson-arce':
      return stevensonArce(data, width, height, palette);
    case 'ordered-2x2':
      return orderedDithering(data, width, height, palette, 2);
    case 'ordered-4x4':
      return orderedDithering(data, width, height, palette, 4);
    case 'ordered-8x8':
      return orderedDithering(data, width, height, palette, 8);
    case 'halftone':
      return halftone(data, width, height, palette);
    case 'blue-noise':
      return blueNoise(data, width, height, palette);
    case 'riemersma':
      return riemersma(data, width, height, palette);
    case 'random':
      return randomDithering(data, width, height, palette);
    case 'none':
      return noDithering(data, width, height, palette);
    case 'bayer-3x3':
      return bayerDithering(data, width, height, palette, 3);
    case 'bayer-16x16':
      return bayerDithering(data, width, height, palette, 16);
    case 'dot-pattern':
      return dotPattern(data, width, height, palette);
    case 'cross-pattern':
      return crossPattern(data, width, height, palette);
    case 'diagonal-pattern':
      return diagonalPattern(data, width, height, palette);
    case 'cluster-dot':
      return clusterDot(data, width, height, palette);
    case 'vertical-stripes':
      return verticalStripes(data, width, height, palette);
    case 'horizontal-stripes':
      return horizontalStripes(data, width, height, palette);
    case 'checkerboard':
      return checkerboard(data, width, height, palette);
    default:
      return new ImageData(data, width, height);
  }
}

function floydSteinberg(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(result, width, height, x + 1, y, errR, errG, errB, 7 / 16);
      distributeError(result, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
      distributeError(result, width, height, x, y + 1, errR, errG, errB, 5 / 16);
      distributeError(result, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
    }
  }

  return new ImageData(result, width, height);
}

function atkinson(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      const factor = 1 / 8;
      distributeError(result, width, height, x + 1, y, errR, errG, errB, factor);
      distributeError(result, width, height, x + 2, y, errR, errG, errB, factor);
      distributeError(result, width, height, x - 1, y + 1, errR, errG, errB, factor);
      distributeError(result, width, height, x, y + 1, errR, errG, errB, factor);
      distributeError(result, width, height, x + 1, y + 1, errR, errG, errB, factor);
      distributeError(result, width, height, x, y + 2, errR, errG, errB, factor);
    }
  }

  return new ImageData(result, width, height);
}

function jarvisJudiceNinke(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(result, width, height, x + 1, y, errR, errG, errB, 7 / 48);
      distributeError(result, width, height, x + 2, y, errR, errG, errB, 5 / 48);
      distributeError(result, width, height, x - 2, y + 1, errR, errG, errB, 3 / 48);
      distributeError(result, width, height, x - 1, y + 1, errR, errG, errB, 5 / 48);
      distributeError(result, width, height, x, y + 1, errR, errG, errB, 7 / 48);
      distributeError(result, width, height, x + 1, y + 1, errR, errG, errB, 5 / 48);
      distributeError(result, width, height, x + 2, y + 1, errR, errG, errB, 3 / 48);
      distributeError(result, width, height, x - 2, y + 2, errR, errG, errB, 1 / 48);
      distributeError(result, width, height, x - 1, y + 2, errR, errG, errB, 3 / 48);
      distributeError(result, width, height, x, y + 2, errR, errG, errB, 5 / 48);
      distributeError(result, width, height, x + 1, y + 2, errR, errG, errB, 3 / 48);
      distributeError(result, width, height, x + 2, y + 2, errR, errG, errB, 1 / 48);
    }
  }

  return new ImageData(result, width, height);
}

function stucki(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(result, width, height, x + 1, y, errR, errG, errB, 8 / 42);
      distributeError(result, width, height, x + 2, y, errR, errG, errB, 4 / 42);
      distributeError(result, width, height, x - 2, y + 1, errR, errG, errB, 2 / 42);
      distributeError(result, width, height, x - 1, y + 1, errR, errG, errB, 4 / 42);
      distributeError(result, width, height, x, y + 1, errR, errG, errB, 8 / 42);
      distributeError(result, width, height, x + 1, y + 1, errR, errG, errB, 4 / 42);
      distributeError(result, width, height, x + 2, y + 1, errR, errG, errB, 2 / 42);
      distributeError(result, width, height, x - 2, y + 2, errR, errG, errB, 1 / 42);
      distributeError(result, width, height, x - 1, y + 2, errR, errG, errB, 2 / 42);
      distributeError(result, width, height, x, y + 2, errR, errG, errB, 4 / 42);
      distributeError(result, width, height, x + 1, y + 2, errR, errG, errB, 2 / 42);
      distributeError(result, width, height, x + 2, y + 2, errR, errG, errB, 1 / 42);
    }
  }

  return new ImageData(result, width, height);
}

function burkes(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(result, width, height, x + 1, y, errR, errG, errB, 8 / 32);
      distributeError(result, width, height, x + 2, y, errR, errG, errB, 4 / 32);
      distributeError(result, width, height, x - 2, y + 1, errR, errG, errB, 2 / 32);
      distributeError(result, width, height, x - 1, y + 1, errR, errG, errB, 4 / 32);
      distributeError(result, width, height, x, y + 1, errR, errG, errB, 8 / 32);
      distributeError(result, width, height, x + 1, y + 1, errR, errG, errB, 4 / 32);
      distributeError(result, width, height, x + 2, y + 1, errR, errG, errB, 2 / 32);
    }
  }

  return new ImageData(result, width, height);
}

function sierra(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(result, width, height, x + 1, y, errR, errG, errB, 5 / 32);
      distributeError(result, width, height, x + 2, y, errR, errG, errB, 3 / 32);
      distributeError(result, width, height, x - 2, y + 1, errR, errG, errB, 2 / 32);
      distributeError(result, width, height, x - 1, y + 1, errR, errG, errB, 4 / 32);
      distributeError(result, width, height, x, y + 1, errR, errG, errB, 5 / 32);
      distributeError(result, width, height, x + 1, y + 1, errR, errG, errB, 4 / 32);
      distributeError(result, width, height, x + 2, y + 1, errR, errG, errB, 2 / 32);
      distributeError(result, width, height, x - 1, y + 2, errR, errG, errB, 2 / 32);
      distributeError(result, width, height, x, y + 2, errR, errG, errB, 3 / 32);
      distributeError(result, width, height, x + 1, y + 2, errR, errG, errB, 2 / 32);
    }
  }

  return new ImageData(result, width, height);
}

function sierraLite(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(result, width, height, x + 1, y, errR, errG, errB, 2 / 4);
      distributeError(result, width, height, x - 1, y + 1, errR, errG, errB, 1 / 4);
      distributeError(result, width, height, x, y + 1, errR, errG, errB, 1 / 4);
    }
  }

  return new ImageData(result, width, height);
}

function orderedDithering(data: Uint8ClampedArray, width: number, height: number, palette: string[], size: number): ImageData {
  const result = new Uint8ClampedArray(data);

  const matrices: { [key: number]: number[][] } = {
    2: [
      [0, 2],
      [3, 1]
    ],
    4: [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ],
    8: [
      [0, 32, 8, 40, 2, 34, 10, 42],
      [48, 16, 56, 24, 50, 18, 58, 26],
      [12, 44, 4, 36, 14, 46, 6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22],
      [3, 35, 11, 43, 1, 33, 9, 41],
      [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47, 7, 39, 13, 45, 5, 37],
      [63, 31, 55, 23, 61, 29, 53, 21]
    ]
  };

  const matrix = matrices[size];
  const matrixSize = matrix.length;
  const threshold = (matrixSize * matrixSize);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const thresholdValue = (matrix[y % matrixSize][x % matrixSize] / threshold - 0.5) * 128;

      const adjustedR = Math.max(0, Math.min(255, oldR + thresholdValue));
      const adjustedG = Math.max(0, Math.min(255, oldG + thresholdValue));
      const adjustedB = Math.max(0, Math.min(255, oldB + thresholdValue));

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function randomDithering(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const noise = (Math.random() - 0.5) * 64;

      const adjustedR = Math.max(0, Math.min(255, oldR + noise));
      const adjustedG = Math.max(0, Math.min(255, oldG + noise));
      const adjustedB = Math.max(0, Math.min(255, oldB + noise));

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function noDithering(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function distributeError(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number,
  factor: number
): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;

  const idx = (y * width + x) * 4;
  data[idx] = Math.max(0, Math.min(255, data[idx] + errR * factor));
  data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + errG * factor));
  data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + errB * factor));
}

function stevensonArce(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(result, width, height, x + 2, y, errR, errG, errB, 32 / 200);
      distributeError(result, width, height, x - 3, y + 1, errR, errG, errB, 12 / 200);
      distributeError(result, width, height, x - 1, y + 1, errR, errG, errB, 26 / 200);
      distributeError(result, width, height, x + 1, y + 1, errR, errG, errB, 30 / 200);
      distributeError(result, width, height, x + 3, y + 1, errR, errG, errB, 16 / 200);
      distributeError(result, width, height, x - 2, y + 2, errR, errG, errB, 12 / 200);
      distributeError(result, width, height, x, y + 2, errR, errG, errB, 26 / 200);
      distributeError(result, width, height, x + 2, y + 2, errR, errG, errB, 12 / 200);
      distributeError(result, width, height, x - 3, y + 3, errR, errG, errB, 5 / 200);
      distributeError(result, width, height, x - 1, y + 3, errR, errG, errB, 12 / 200);
      distributeError(result, width, height, x + 1, y + 3, errR, errG, errB, 12 / 200);
      distributeError(result, width, height, x + 3, y + 3, errR, errG, errB, 5 / 200);
    }
  }

  return new ImageData(result, width, height);
}

function halftone(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const dotSize = 8;
  const angle = Math.PI / 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const rotX = x * Math.cos(angle) - y * Math.sin(angle);
      const rotY = x * Math.sin(angle) + y * Math.cos(angle);

      const cellX = Math.floor(rotX / dotSize);
      const cellY = Math.floor(rotY / dotSize);

      const localX = rotX - cellX * dotSize;
      const localY = rotY - cellY * dotSize;

      const centerX = dotSize / 2;
      const centerY = dotSize / 2;
      const distance = Math.sqrt(Math.pow(localX - centerX, 2) + Math.pow(localY - centerY, 2));

      const brightness = (oldR + oldG + oldB) / 3;
      const normalizedBrightness = brightness / 255;
      const dotRadius = (1 - normalizedBrightness) * (dotSize / 2);

      let adjustedR = oldR;
      let adjustedG = oldG;
      let adjustedB = oldB;

      if (distance < dotRadius) {
        adjustedR = Math.max(0, oldR - 50);
        adjustedG = Math.max(0, oldG - 50);
        adjustedB = Math.max(0, oldB - 50);
      } else {
        adjustedR = Math.min(255, oldR + 50);
        adjustedG = Math.min(255, oldG + 50);
        adjustedB = Math.min(255, oldB + 50);
      }

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function blueNoise(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);

  const blueNoiseSize = 64;
  const blueNoiseMatrix: number[][] = [];

  for (let i = 0; i < blueNoiseSize; i++) {
    blueNoiseMatrix[i] = [];
    for (let j = 0; j < blueNoiseSize; j++) {
      const angle = (i * j * 0.06283) % (Math.PI * 2);
      blueNoiseMatrix[i][j] = (Math.sin(angle * 7.3) + Math.cos(angle * 11.7)) * 0.5;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const noiseValue = blueNoiseMatrix[y % blueNoiseSize][x % blueNoiseSize] * 32;

      const adjustedR = Math.max(0, Math.min(255, oldR + noiseValue));
      const adjustedG = Math.max(0, Math.min(255, oldG + noiseValue));
      const adjustedB = Math.max(0, Math.min(255, oldB + noiseValue));

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function riemersma(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const visited = new Set<string>();

  const hilbertCurve = (x: number, y: number, xi: number, xj: number, yi: number, yj: number, n: number, points: [number, number][]): void => {
    if (n <= 0) {
      const px = x + (xi + yi) / 2;
      const py = y + (xj + yj) / 2;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        points.push([Math.floor(px), Math.floor(py)]);
      }
    } else {
      hilbertCurve(x, y, yi / 2, yj / 2, xi / 2, xj / 2, n - 1, points);
      hilbertCurve(x + xi / 2, y + xj / 2, xi / 2, xj / 2, yi / 2, yj / 2, n - 1, points);
      hilbertCurve(x + xi / 2 + yi / 2, y + xj / 2 + yj / 2, xi / 2, xj / 2, yi / 2, yj / 2, n - 1, points);
      hilbertCurve(x + xi / 2 + yi, y + xj / 2 + yj, -yi / 2, -yj / 2, -xi / 2, -xj / 2, n - 1, points);
    }
  };

  const points: [number, number][] = [];
  const order = Math.ceil(Math.log2(Math.max(width, height)));
  hilbertCurve(0, 0, width, 0, 0, height, order, points);

  const errorR: number[] = Array(16).fill(0);
  const errorG: number[] = Array(16).fill(0);
  const errorB: number[] = Array(16).fill(0);
  const weights = [0.0625, 0.125, 0.1875, 0.25, 0.1875, 0.125, 0.0625, 0.03125];

  for (const [x, y] of points) {
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const idx = (y * width + x) * 4;

    let accErrorR = 0;
    let accErrorG = 0;
    let accErrorB = 0;

    for (let i = 0; i < 8; i++) {
      accErrorR += errorR[i] * weights[i];
      accErrorG += errorG[i] * weights[i];
      accErrorB += errorB[i] * weights[i];
    }

    const oldR = Math.max(0, Math.min(255, result[idx] + accErrorR));
    const oldG = Math.max(0, Math.min(255, result[idx + 1] + accErrorG));
    const oldB = Math.max(0, Math.min(255, result[idx + 2] + accErrorB));

    const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

    result[idx] = newR;
    result[idx + 1] = newG;
    result[idx + 2] = newB;

    errorR.unshift(oldR - newR);
    errorG.unshift(oldG - newG);
    errorB.unshift(oldB - newB);

    errorR.pop();
    errorG.pop();
    errorB.pop();
  }

  return new ImageData(result, width, height);
}

function bayerDithering(data: Uint8ClampedArray, width: number, height: number, palette: string[], size: number): ImageData {
  const result = new Uint8ClampedArray(data);

  const bayer3x3 = [
    [0, 6, 2],
    [4, 8, 7],
    [3, 1, 5]
  ];

  const bayer16x16 = [
    [0, 192, 48, 240, 12, 204, 60, 252, 3, 195, 51, 243, 15, 207, 63, 255],
    [128, 64, 176, 112, 140, 76, 188, 124, 131, 67, 179, 115, 143, 79, 191, 127],
    [32, 224, 16, 208, 44, 236, 28, 220, 35, 227, 19, 211, 47, 239, 31, 223],
    [160, 96, 144, 80, 172, 108, 156, 92, 163, 99, 147, 83, 175, 111, 159, 95],
    [8, 200, 56, 248, 4, 196, 52, 244, 11, 203, 59, 251, 7, 199, 55, 247],
    [136, 72, 184, 120, 132, 68, 180, 116, 139, 75, 187, 123, 135, 71, 183, 119],
    [40, 232, 24, 216, 36, 228, 20, 212, 43, 235, 27, 219, 39, 231, 23, 215],
    [168, 104, 152, 88, 164, 100, 148, 84, 171, 107, 155, 91, 167, 103, 151, 87],
    [2, 194, 50, 242, 14, 206, 62, 254, 1, 193, 49, 241, 13, 205, 61, 253],
    [130, 66, 178, 114, 142, 78, 190, 126, 129, 65, 177, 113, 141, 77, 189, 125],
    [34, 226, 18, 210, 46, 238, 30, 222, 33, 225, 17, 209, 45, 237, 29, 221],
    [162, 98, 146, 82, 174, 110, 158, 94, 161, 97, 145, 81, 173, 109, 157, 93],
    [10, 202, 58, 250, 6, 198, 54, 246, 9, 201, 57, 249, 5, 197, 53, 245],
    [138, 74, 186, 122, 134, 70, 182, 118, 137, 73, 185, 121, 133, 69, 181, 117],
    [42, 234, 26, 218, 38, 230, 22, 214, 41, 233, 25, 217, 37, 229, 21, 213],
    [170, 106, 154, 90, 166, 102, 150, 86, 169, 105, 153, 89, 165, 101, 149, 85]
  ];

  const matrix = size === 3 ? bayer3x3 : bayer16x16;
  const matrixSize = matrix.length;
  const threshold = matrixSize * matrixSize;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const thresholdValue = (matrix[y % matrixSize][x % matrixSize] / threshold - 0.5) * 128;

      const adjustedR = Math.max(0, Math.min(255, oldR + thresholdValue));
      const adjustedG = Math.max(0, Math.min(255, oldG + thresholdValue));
      const adjustedB = Math.max(0, Math.min(255, oldB + thresholdValue));

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function dotPattern(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const dotSize = 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const localX = x % dotSize;
      const localY = y % dotSize;
      const centerX = dotSize / 2;
      const centerY = dotSize / 2;
      const distance = Math.sqrt(Math.pow(localX - centerX, 2) + Math.pow(localY - centerY, 2));

      const brightness = (oldR + oldG + oldB) / 3;
      const threshold = (distance / (dotSize / 2)) * 255;

      let adjustedR = oldR;
      let adjustedG = oldG;
      let adjustedB = oldB;

      if (brightness < threshold) {
        adjustedR = Math.max(0, oldR - 80);
        adjustedG = Math.max(0, oldG - 80);
        adjustedB = Math.max(0, oldB - 80);
      }

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function crossPattern(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const patternSize = 6;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const localX = x % patternSize;
      const localY = y % patternSize;

      const isCross = (localX === Math.floor(patternSize / 2)) || (localY === Math.floor(patternSize / 2));
      const brightness = (oldR + oldG + oldB) / 3;

      let adjustedR = oldR;
      let adjustedG = oldG;
      let adjustedB = oldB;

      if (isCross && brightness < 200) {
        adjustedR = Math.max(0, oldR - 60);
        adjustedG = Math.max(0, oldG - 60);
        adjustedB = Math.max(0, oldB - 60);
      }

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function diagonalPattern(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const lineSpacing = 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const brightness = (oldR + oldG + oldB) / 3;
      const isDiagonal = (x + y) % lineSpacing === 0;

      let adjustedR = oldR;
      let adjustedG = oldG;
      let adjustedB = oldB;

      if (isDiagonal && brightness < 200) {
        adjustedR = Math.max(0, oldR - 70);
        adjustedG = Math.max(0, oldG - 70);
        adjustedB = Math.max(0, oldB - 70);
      }

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function clusterDot(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const clusterMatrix = [
    [12, 5, 6, 13],
    [4, 0, 1, 7],
    [11, 3, 2, 8],
    [15, 10, 9, 14]
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const threshold = clusterMatrix[y % 4][x % 4] / 16;
      const brightness = ((oldR + oldG + oldB) / 3) / 255;

      let adjustedR = oldR;
      let adjustedG = oldG;
      let adjustedB = oldB;

      if (brightness < threshold) {
        adjustedR = Math.max(0, oldR - 100);
        adjustedG = Math.max(0, oldG - 100);
        adjustedB = Math.max(0, oldB - 100);
      }

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function verticalStripes(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const stripeWidth = 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const brightness = (oldR + oldG + oldB) / 3;
      const isStripe = Math.floor(x / stripeWidth) % 2 === 0;

      let adjustedR = oldR;
      let adjustedG = oldG;
      let adjustedB = oldB;

      if (isStripe && brightness < 200) {
        adjustedR = Math.max(0, oldR - 60);
        adjustedG = Math.max(0, oldG - 60);
        adjustedB = Math.max(0, oldB - 60);
      }

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function horizontalStripes(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const stripeHeight = 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const brightness = (oldR + oldG + oldB) / 3;
      const isStripe = Math.floor(y / stripeHeight) % 2 === 0;

      let adjustedR = oldR;
      let adjustedG = oldG;
      let adjustedB = oldB;

      if (isStripe && brightness < 200) {
        adjustedR = Math.max(0, oldR - 60);
        adjustedG = Math.max(0, oldG - 60);
        adjustedB = Math.max(0, oldB - 60);
      }

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}

function checkerboard(data: Uint8ClampedArray, width: number, height: number, palette: string[]): ImageData {
  const result = new Uint8ClampedArray(data);
  const checkSize = 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = result[idx];
      const oldG = result[idx + 1];
      const oldB = result[idx + 2];

      const brightness = (oldR + oldG + oldB) / 3;
      const isCheck = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;

      let adjustedR = oldR;
      let adjustedG = oldG;
      let adjustedB = oldB;

      if (isCheck && brightness < 200) {
        adjustedR = Math.max(0, oldR - 70);
        adjustedG = Math.max(0, oldG - 70);
        adjustedB = Math.max(0, oldB - 70);
      }

      const [newR, newG, newB] = findClosestColor(adjustedR, adjustedG, adjustedB, palette);

      result[idx] = newR;
      result[idx + 1] = newG;
      result[idx + 2] = newB;
    }
  }

  return new ImageData(result, width, height);
}
