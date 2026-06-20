import DitheringWorker from '../workers/dithering.worker?worker';
import { VariantConfig, paletteForConfig } from './casting';

/* Down-scale d'une image source vers un ImageData borne (cote le plus long). */
export function imageToImageData(img: HTMLImageElement, maxSize: number): ImageData {
  const ratio = img.width / img.height;
  let w: number, h: number;
  if (img.width >= img.height) { w = Math.min(maxSize, img.width); h = Math.round(w / ratio); }
  else { h = Math.min(maxSize, img.height); w = Math.round(h * ratio); }
  w = Math.max(1, w); h = Math.max(1, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

interface Job {
  payload: Record<string, unknown>;
  resolve: (img: ImageData) => void;
  reject: (e: unknown) => void;
}

/* Pool de workers de dithering. Chaque worker ne traite qu'UN job a la fois,
   donc la reponse appartient sans ambiguite au job en cours (aucun id requis,
   aucune modif du worker existant). */
export class RenderPool {
  private workers: Worker[] = [];
  private busy: boolean[] = [];
  private current: (Job | null)[] = [];
  private queue: Job[] = [];

  constructor(size = 3) {
    for (let i = 0; i < size; i++) {
      const w = new DitheringWorker();
      const idx = i;
      w.onmessage = (e: MessageEvent) => {
        const job = this.current[idx];
        this.current[idx] = null;
        this.busy[idx] = false;
        if (job) {
          const { success, imageData, error } = e.data || {};
          if (success && imageData) job.resolve(imageData as ImageData);
          else job.reject(error || 'render failed');
        }
        this.pump();
      };
      w.onerror = (e) => {
        const job = this.current[idx];
        this.current[idx] = null;
        this.busy[idx] = false;
        if (job) job.reject(e.message || 'worker error');
        this.pump();
      };
      this.workers.push(w);
      this.busy.push(false);
      this.current.push(null);
    }
  }

  private pump() {
    if (!this.queue.length) return;
    const free = this.busy.indexOf(false);
    if (free === -1) return;
    const job = this.queue.shift()!;
    this.busy[free] = true;
    this.current[free] = job;
    this.workers[free].postMessage(job.payload);
    if (this.queue.length) this.pump();
  }

  render(imageData: ImageData, cfg: VariantConfig): Promise<ImageData> {
    const payload = {
      imageData,
      algorithm: cfg.algorithm,
      palette: paletteForConfig(cfg),
      adjustments: cfg.adjustments,
      colorMode: cfg.colorMode,
      colorModeSettings: cfg.colorModeSettings,
      paletteModifiers: cfg.paletteModifiers,
      postProcessing: cfg.postProcessing,
    };
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, resolve, reject });
      this.pump();
    });
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = []; this.busy = []; this.current = []; this.queue = [];
  }
}

/* Peint un ImageData dans un canvas existant (ajuste sa taille). */
export function paintImageData(canvas: HTMLCanvasElement | null, img: ImageData) {
  if (!canvas) return;
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(img, 0, 0);
}
