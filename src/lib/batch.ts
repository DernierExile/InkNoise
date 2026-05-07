// =============================================================================
// Batch processing helpers — types and ZIP packaging.
// The actual processing loop lives in BatchProcessor.tsx so it can drive its
// own Web Worker instance and React state in lockstep.
// =============================================================================

import { zip } from 'fflate';

export type BatchItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface BatchItem {
  id: string;
  file: File;
  name: string;
  status: BatchItemStatus;
  resultBlob?: Blob;
  error?: string;
}

export const MAX_BATCH_SIZE = 50;

const ACCEPTED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

export function filterAndCapImageFiles(files: FileList | File[]): {
  accepted: File[];
  rejectedCount: number;
  truncatedCount: number;
} {
  const arr = Array.from(files);
  const valid = arr.filter((f) => ACCEPTED_MIME.has(f.type));
  const rejectedCount = arr.length - valid.length;
  const truncated = valid.slice(0, MAX_BATCH_SIZE);
  const truncatedCount = valid.length - truncated.length;
  return { accepted: truncated, rejectedCount, truncatedCount };
}

export function makeBatchItem(file: File): BatchItem {
  return {
    id:
      crypto.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    name: file.name,
    status: 'pending',
  };
}

export function buildOutputName(originalName: string, format: 'png' = 'png'): string {
  const dot = originalName.lastIndexOf('.');
  const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
  return `${stem}__inknoise.${format}`;
}

/**
 * Pack processed Blobs into a single ZIP archive (no compression — PNGs are
 * already compressed, so STORE saves CPU). Returns a single Blob ready for
 * download.
 */
export async function packZip(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  // Read all blobs into Uint8Array — fflate needs the bytes synchronously
  const buffers = await Promise.all(
    entries.map(async (e) => ({
      name: e.name,
      bytes: new Uint8Array(await e.blob.arrayBuffer()),
    })),
  );

  // Deduplicate names (in case of collision after stem normalization)
  const used = new Set<string>();
  const dict: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const { name, bytes } of buffers) {
    let final = name;
    let n = 1;
    while (used.has(final)) {
      const dot = name.lastIndexOf('.');
      final =
        dot > 0
          ? `${name.slice(0, dot)}__${n}${name.slice(dot)}`
          : `${name}__${n}`;
      n++;
    }
    used.add(final);
    dict[final] = [bytes, { level: 0 }];
  }

  return new Promise<Blob>((resolve, reject) => {
    zip(dict, { level: 0 }, (err, data) => {
      if (err) reject(err);
      else resolve(new Blob([data], { type: 'application/zip' }));
    });
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_load_failed'));
    };
    img.src = url;
  });
}
