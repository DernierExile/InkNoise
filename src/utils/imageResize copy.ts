import { ResamplingMethod } from '../types';

// Plan-aware max dimension caps.
//   FREE plan : 1200px (Studio gating)
//   PAID plan : 3840px (4K)
export const MAX_DIMENSION_FREE = 1200;
export const MAX_DIMENSION_PRO = 3840;

export function resizeImageIfNeeded(
  image: HTMLImageElement,
  method: ResamplingMethod = 'bilinear',
  maxDimension: number = MAX_DIMENSION_FREE,
): HTMLImageElement {
  const { width, height } = image;

  if (width <= maxDimension && height <= maxDimension) {
    return image;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return image;

  let newWidth = width;
  let newHeight = height;

  if (width > height) {
    if (width > maxDimension) {
      newWidth = maxDimension;
      newHeight = (height * maxDimension) / width;
    }
  } else {
    if (height > maxDimension) {
      newHeight = maxDimension;
      newWidth = (width * maxDimension) / height;
    }
  }

  canvas.width = newWidth;
  canvas.height = newHeight;

  applyResamplingMethod(ctx, method);
  ctx.drawImage(image, 0, 0, newWidth, newHeight);

  const resizedImage = new Image();
  resizedImage.src = canvas.toDataURL();

  return resizedImage;
}

export function getResizeInfo(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number = MAX_DIMENSION_FREE,
): { isResized: boolean; newWidth: number; newHeight: number } {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { isResized: false, newWidth: originalWidth, newHeight: originalHeight };
  }

  let newWidth = originalWidth;
  let newHeight = originalHeight;

  if (originalWidth > originalHeight) {
    if (originalWidth > maxDimension) {
      newWidth = maxDimension;
      newHeight = (originalHeight * maxDimension) / originalWidth;
    }
  } else {
    if (originalHeight > maxDimension) {
      newHeight = maxDimension;
      newWidth = (originalWidth * maxDimension) / originalHeight;
    }
  }

  return { isResized: true, newWidth: Math.round(newWidth), newHeight: Math.round(newHeight) };
}

function applyResamplingMethod(ctx: CanvasRenderingContext2D, method: ResamplingMethod): void {
  switch (method) {
    case 'nearest-neighbor':
      ctx.imageSmoothingEnabled = false;
      break;
    case 'bilinear':
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      break;
    case 'bicubic':
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      break;
  }
}

export function resizeImageData(imageData: ImageData, newWidth: number, newHeight: number, method: ResamplingMethod): ImageData {
  if (method === 'nearest-neighbor') {
    return resizeNearestNeighbor(imageData, newWidth, newHeight);
  } else if (method === 'bilinear') {
    return resizeBilinear(imageData, newWidth, newHeight);
  } else {
    return resizeBicubic(imageData, newWidth, newHeight);
  }
}

function resizeNearestNeighbor(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
  const { width: oldWidth, height: oldHeight, data: oldData } = imageData;
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

  const xRatio = oldWidth / newWidth;
  const yRatio = oldHeight / newHeight;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const srcIdx = (srcY * oldWidth + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;

      newData[dstIdx] = oldData[srcIdx];
      newData[dstIdx + 1] = oldData[srcIdx + 1];
      newData[dstIdx + 2] = oldData[srcIdx + 2];
      newData[dstIdx + 3] = oldData[srcIdx + 3];
    }
  }

  return new ImageData(newData, newWidth, newHeight);
}

function resizeBilinear(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
  const { width: oldWidth, height: oldHeight, data: oldData } = imageData;
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

  const xRatio = (oldWidth - 1) / newWidth;
  const yRatio = (oldHeight - 1) / newHeight;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;

      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, oldWidth - 1);
      const y2 = Math.min(y1 + 1, oldHeight - 1);

      const xWeight = srcX - x1;
      const yWeight = srcY - y1;

      for (let c = 0; c < 4; c++) {
        const idx11 = (y1 * oldWidth + x1) * 4 + c;
        const idx21 = (y1 * oldWidth + x2) * 4 + c;
        const idx12 = (y2 * oldWidth + x1) * 4 + c;
        const idx22 = (y2 * oldWidth + x2) * 4 + c;

        const val =
          oldData[idx11] * (1 - xWeight) * (1 - yWeight) +
          oldData[idx21] * xWeight * (1 - yWeight) +
          oldData[idx12] * (1 - xWeight) * yWeight +
          oldData[idx22] * xWeight * yWeight;

        newData[(y * newWidth + x) * 4 + c] = Math.round(val);
      }
    }
  }

  return new ImageData(newData, newWidth, newHeight);
}

function resizeBicubic(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
  const { width: oldWidth, height: oldHeight, data: oldData } = imageData;
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

  const xRatio = oldWidth / newWidth;
  const yRatio = oldHeight / newHeight;

  const cubicInterpolate = (p: number[]) => {
    return (x: number) => {
      return p[1] + 0.5 * x * (p[2] - p[0] + x * (2.0 * p[0] - 5.0 * p[1] + 4.0 * p[2] - p[3] + x * (3.0 * (p[1] - p[2]) + p[3] - p[0])));
    };
  };

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;

      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);

      const dx = srcX - x1;
      const dy = srcY - y1;

      for (let c = 0; c < 4; c++) {
        const values: number[] = [];

        for (let ky = -1; ky <= 2; ky++) {
          const row: number[] = [];
          for (let kx = -1; kx <= 2; kx++) {
            const px = Math.max(0, Math.min(oldWidth - 1, x1 + kx));
            const py = Math.max(0, Math.min(oldHeight - 1, y1 + ky));
            row.push(oldData[(py * oldWidth + px) * 4 + c]);
          }
          values.push(cubicInterpolate(row)(dx));
        }

        const val = cubicInterpolate(values)(dy);
        newData[(y * newWidth + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(val)));
      }
    }
  }

  return new ImageData(newData, newWidth, newHeight);
}
