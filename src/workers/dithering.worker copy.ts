import { DitheringAlgorithm, ImageAdjustments, ColorMode, ColorModeSettings, PaletteModifiers, PostProcessing } from '../types';
import { applyDithering } from '../utils/dithering';
import { applyAdjustments } from '../utils/adjustments';
import { applyColorMode, applyColorModePost } from '../utils/colorModes';
import { applyPostProcessing } from '../utils/postProcessing';
import { applyPaletteModifiers } from '../utils/paletteEngine';

interface WorkerMessage {
  imageData: ImageData;
  algorithm: DitheringAlgorithm;
  palette: string[];
  adjustments: ImageAdjustments;
  colorMode: ColorMode;
  colorModeSettings: ColorModeSettings;
  paletteModifiers: PaletteModifiers;
  postProcessing: PostProcessing;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { imageData, algorithm, palette, adjustments, colorMode, colorModeSettings, paletteModifiers, postProcessing } = e.data;

  try {
    const modifiedPalette = applyPaletteModifiers(palette, paletteModifiers);

    let processed = applyAdjustments(imageData, adjustments);

    processed = applyColorMode(processed, colorMode, colorModeSettings);

    processed = applyDithering(processed, algorithm, modifiedPalette);

    processed = applyColorModePost(processed, colorMode, colorModeSettings);

    processed = applyPostProcessing(processed, postProcessing);

    self.postMessage({ success: true, imageData: processed });
  } catch (error) {
    self.postMessage({ success: false, error: String(error) });
  }
};
