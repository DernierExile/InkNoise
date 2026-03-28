import { DitheringAlgorithm } from '../types';
import { applyDithering } from '../utils/dithering';
import { applyAdjustments } from '../utils/adjustments';
import { ImageAdjustments } from '../types';

interface WorkerMessage {
  imageData: ImageData;
  algorithm: DitheringAlgorithm;
  palette: string[];
  adjustments: ImageAdjustments;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { imageData, algorithm, palette, adjustments } = e.data;

  try {
    let processedData = applyAdjustments(imageData, adjustments);
    processedData = applyDithering(processedData, algorithm, palette);

    self.postMessage({ success: true, imageData: processedData });
  } catch (error) {
    self.postMessage({ success: false, error: String(error) });
  }
};
