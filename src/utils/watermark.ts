// Watermark utility for InkNoise free version exports

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
    img.src = '/BEZIER200x200inknoise.png';
  });
}

// Draws the watermark at bottom-right corner, sized ~10% of canvas width
export function drawWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  watermarkImage: HTMLImageElement
) {
  const margin = 16;
  const targetWidth = Math.round(canvasWidth * 0.1);
  const aspect = watermarkImage.height / watermarkImage.width;
  const targetHeight = Math.round(targetWidth * aspect);

  const x = canvasWidth - targetWidth - margin;
  const y = canvasHeight - targetHeight - margin;

  ctx.globalAlpha = 0.35;
  ctx.drawImage(watermarkImage, x, y, targetWidth, targetHeight);
  ctx.globalAlpha = 1.0;
}
