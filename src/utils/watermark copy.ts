// Watermark utility for InkNoise free version exports
// Uses the BEZIER brand system "InkNoise BY BEZIER" wordmark

let cachedWatermark: HTMLImageElement | null = null;

export function loadWatermarkImage(): Promise<HTMLImageElement> {
  if (cachedWatermark) return Promise.resolve(cachedWatermark);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cachedWatermark = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load watermark'));
    img.src = '/watermark-inknoise.png';
  });
}

// Draws the watermark at bottom-right corner.
// The new wordmark is wide (~3:1), so we scale by width to ~18% of canvas width
// to keep visible legibility while staying discreet on the output.
export function drawWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  watermarkImage: HTMLImageElement
) {
  const margin = Math.max(16, Math.round(canvasWidth * 0.015));
  const targetWidth = Math.round(canvasWidth * 0.18);
  const aspect = watermarkImage.height / watermarkImage.width;
  const targetHeight = Math.round(targetWidth * aspect);

  const x = canvasWidth - targetWidth - margin;
  const y = canvasHeight - targetHeight - margin;

  ctx.globalAlpha = 0.55;
  ctx.drawImage(watermarkImage, x, y, targetWidth, targetHeight);
  ctx.globalAlpha = 1.0;
}
