import { DitheringAlgorithm, ColorMode, ImageAdjustments, ResamplingMethod } from '../types';
import { PREDEFINED_PALETTES } from '../utils/palettes';

interface ControlPanelProps {
  algorithm: DitheringAlgorithm;
  onAlgorithmChange: (algorithm: DitheringAlgorithm) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  selectedPalette: number;
  onPaletteChange: (index: number) => void;
  colorCount: number;
  onColorCountChange: (count: number) => void;
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: ImageAdjustments) => void;
  resamplingMethod: ResamplingMethod;
  onResamplingMethodChange: (method: ResamplingMethod) => void;
}

const algorithms: { value: DitheringAlgorithm; label: string; category: string }[] = [
  { value: 'floyd-steinberg', label: 'Floyd-Steinberg', category: 'Error Diffusion' },
  { value: 'atkinson', label: 'Atkinson', category: 'Error Diffusion' },
  { value: 'jarvis-judice-ninke', label: 'Jarvis-Judice-Ninke', category: 'Error Diffusion' },
  { value: 'stucki', label: 'Stucki', category: 'Error Diffusion' },
  { value: 'burkes', label: 'Burkes', category: 'Error Diffusion' },
  { value: 'sierra', label: 'Sierra', category: 'Error Diffusion' },
  { value: 'sierra-lite', label: 'Sierra Lite', category: 'Error Diffusion' },
  { value: 'stevenson-arce', label: 'Stevenson-Arce', category: 'Error Diffusion' },
  { value: 'ordered-2x2', label: 'Ordered 2x2', category: 'Ordered Dither' },
  { value: 'ordered-4x4', label: 'Ordered 4x4', category: 'Ordered Dither' },
  { value: 'ordered-8x8', label: 'Ordered 8x8', category: 'Ordered Dither' },
  { value: 'bayer-3x3', label: 'Bayer 3x3', category: 'Ordered Dither' },
  { value: 'bayer-16x16', label: 'Bayer 16x16', category: 'Ordered Dither' },
  { value: 'halftone', label: 'Halftone', category: 'Pattern' },
  { value: 'dot-pattern', label: 'Dot Pattern', category: 'Pattern' },
  { value: 'cross-pattern', label: 'Cross Pattern', category: 'Pattern' },
  { value: 'diagonal-pattern', label: 'Diagonal Lines', category: 'Pattern' },
  { value: 'cluster-dot', label: 'Cluster Dot', category: 'Pattern' },
  { value: 'vertical-stripes', label: 'Vertical Stripes', category: 'Pattern' },
  { value: 'horizontal-stripes', label: 'Horizontal Stripes', category: 'Pattern' },
  { value: 'checkerboard', label: 'Checkerboard', category: 'Pattern' },
  { value: 'blue-noise', label: 'Blue Noise', category: 'Advanced' },
  { value: 'riemersma', label: 'Riemersma', category: 'Advanced' },
  { value: 'random', label: 'Random', category: 'Other' },
  { value: 'none', label: 'None', category: 'Other' }
];

const resamplingMethods: { value: ResamplingMethod; label: string }[] = [
  { value: 'nearest-neighbor', label: 'Nearest Neighbor' },
  { value: 'bilinear', label: 'Bilinear' },
  { value: 'bicubic', label: 'Bicubic' }
];

export default function ControlPanel({
  algorithm,
  onAlgorithmChange,
  colorMode,
  onColorModeChange,
  selectedPalette,
  onPaletteChange,
  colorCount,
  onColorCountChange,
  adjustments,
  onAdjustmentsChange,
  resamplingMethod,
  onResamplingMethodChange
}: ControlPanelProps) {
  return (
    <div className="space-y-6 control-panel-bg p-6 rounded-lg max-h-[calc(100vh-16rem)] overflow-y-auto glow-green">
      <div className="border-b border-[#00ff41]/30 pb-4">
        <h2 className="text-lg font-bold text-[#00ff41] text-glow-green mb-4 tracking-wider">DITHER SETTINGS</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#00ffff] mb-2">
              Dithering Algorithm
            </label>
            <select
              value={algorithm}
              onChange={(e) => onAlgorithmChange(e.target.value as DitheringAlgorithm)}
              className="w-full bg-black/50 text-[#00ff41] border-2 border-[#00ff41]/30 rounded-lg px-4 py-2 focus:outline-none focus:border-[#00ff41] focus:glow-green transition-all"
            >
              {Object.entries(
                algorithms.reduce((acc, alg) => {
                  if (!acc[alg.category]) acc[alg.category] = [];
                  acc[alg.category].push(alg);
                  return acc;
                }, {} as Record<string, typeof algorithms>)
              ).map(([category, algs]) => (
                <optgroup key={category} label={category}>
                  {algs.map((alg) => (
                    <option key={alg.value} value={alg.value}>
                      {alg.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#00ffff] mb-2">
              Color Mode
            </label>
            <div className="flex gap-2">
              {['mono', 'indexed', 'rgb'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => onColorModeChange(mode as ColorMode)}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all border-2 ${
                    colorMode === mode
                      ? 'bg-[#00ffff]/20 text-[#00ffff] border-[#00ffff] glow-cyan'
                      : 'bg-black/30 text-[#00ff41]/60 border-[#00ff41]/20 hover:border-[#00ff41]/50'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#00ffff] mb-2">
              Color Palette
            </label>
            <select
              value={selectedPalette}
              onChange={(e) => onPaletteChange(Number(e.target.value))}
              className="w-full bg-black/50 text-[#00ff41] border-2 border-[#00ff41]/30 rounded-lg px-4 py-2 focus:outline-none focus:border-[#00ff41] focus:glow-green transition-all"
            >
              {PREDEFINED_PALETTES.map((palette, index) => (
                <option key={index} value={index}>
                  {palette.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1 mt-2 flex-wrap">
              {PREDEFINED_PALETTES[selectedPalette].colors.map((color, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded border-2 border-[#00ff41]/40"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {colorMode === 'indexed' && (
            <div>
              <label className="block text-sm font-medium text-[#00ffff] mb-2">
                Colors: {colorCount}
              </label>
              <input
                type="range"
                min="2"
                max="64"
                value={colorCount}
                onChange={(e) => onColorCountChange(Number(e.target.value))}
                className="w-full accent-[#00ffff]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-[#00ff41]/30 pb-4">
        <h2 className="text-lg font-bold text-[#00ff41] text-glow-green mb-4 tracking-wider">INPUT / OUTPUT</h2>

        <div>
          <label className="block text-sm font-medium text-[#00ffff] mb-2">
            Resampling
          </label>
          <select
            value={resamplingMethod}
            onChange={(e) => onResamplingMethodChange(e.target.value as ResamplingMethod)}
            className="w-full bg-black/50 text-[#00ff41] border-2 border-[#00ff41]/30 rounded-lg px-4 py-2 focus:outline-none focus:border-[#00ff41] focus:glow-green transition-all"
          >
            {resamplingMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-b border-[#00ff41]/30 pb-4">
        <h2 className="text-lg font-bold text-[#00ff41] text-glow-green mb-4 tracking-wider">EFFECT CONTROLS</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Sharpen Strength: {adjustments.sharpen}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={adjustments.sharpen}
              onChange={(e) => onAdjustmentsChange({ ...adjustments, sharpen: Number(e.target.value) })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Sharpen Radius: {adjustments.sharpenRadius}
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={adjustments.sharpenRadius}
              onChange={(e) => onAdjustmentsChange({ ...adjustments, sharpenRadius: Number(e.target.value) })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Blur: {adjustments.blur}
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={adjustments.blur}
              onChange={(e) => onAdjustmentsChange({ ...adjustments, blur: Number(e.target.value) })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Noise: {adjustments.noise}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={adjustments.noise}
              onChange={(e) => onAdjustmentsChange({ ...adjustments, noise: Number(e.target.value) })}
              className="w-full accent-[#00ffff]"
            />
          </div>
        </div>
      </div>

      <div className="border-b border-[#00ff41]/30 pb-4">
        <h2 className="text-lg font-bold text-[#00ff41] text-glow-green mb-4 tracking-wider">TONAL CONTROLS</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Highlights: {adjustments.tonalControls.highlights > 0 ? '+' : ''}{adjustments.tonalControls.highlights}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.tonalControls.highlights}
              onChange={(e) => onAdjustmentsChange({
                ...adjustments,
                tonalControls: { ...adjustments.tonalControls, highlights: Number(e.target.value) }
              })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Midtones: {adjustments.tonalControls.midtones > 0 ? '+' : ''}{adjustments.tonalControls.midtones}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.tonalControls.midtones}
              onChange={(e) => onAdjustmentsChange({
                ...adjustments,
                tonalControls: { ...adjustments.tonalControls, midtones: Number(e.target.value) }
              })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Shadows: {adjustments.tonalControls.shadows > 0 ? '+' : ''}{adjustments.tonalControls.shadows}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.tonalControls.shadows}
              onChange={(e) => onAdjustmentsChange({
                ...adjustments,
                tonalControls: { ...adjustments.tonalControls, shadows: Number(e.target.value) }
              })}
              className="w-full accent-[#00ffff]"
            />
          </div>
        </div>
      </div>

      <div className="border-b border-[#00ff41]/30 pb-4">
        <h2 className="text-lg font-bold text-[#00ff41] text-glow-green mb-4 tracking-wider">LEVELS</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Input Black: {adjustments.levels.inputBlack}
            </label>
            <input
              type="range"
              min="0"
              max="255"
              value={adjustments.levels.inputBlack}
              onChange={(e) => onAdjustmentsChange({
                ...adjustments,
                levels: { ...adjustments.levels, inputBlack: Number(e.target.value) }
              })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Input White: {adjustments.levels.inputWhite}
            </label>
            <input
              type="range"
              min="0"
              max="255"
              value={adjustments.levels.inputWhite}
              onChange={(e) => onAdjustmentsChange({
                ...adjustments,
                levels: { ...adjustments.levels, inputWhite: Number(e.target.value) }
              })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Gamma: {adjustments.levels.gamma.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.01"
              value={adjustments.levels.gamma}
              onChange={(e) => onAdjustmentsChange({
                ...adjustments,
                levels: { ...adjustments.levels, gamma: Number(e.target.value) }
              })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Output Black: {adjustments.levels.outputBlack}
            </label>
            <input
              type="range"
              min="0"
              max="255"
              value={adjustments.levels.outputBlack}
              onChange={(e) => onAdjustmentsChange({
                ...adjustments,
                levels: { ...adjustments.levels, outputBlack: Number(e.target.value) }
              })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Output White: {adjustments.levels.outputWhite}
            </label>
            <input
              type="range"
              min="0"
              max="255"
              value={adjustments.levels.outputWhite}
              onChange={(e) => onAdjustmentsChange({
                ...adjustments,
                levels: { ...adjustments.levels, outputWhite: Number(e.target.value) }
              })}
              className="w-full accent-[#00ffff]"
            />
          </div>
        </div>
      </div>

      <div className="border-b border-[#00ff41]/30 pb-4">
        <h2 className="text-lg font-bold text-[#00ff41] text-glow-green mb-4 tracking-wider">IMAGE ADJUSTMENTS</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Brightness: {adjustments.brightness > 0 ? '+' : ''}{adjustments.brightness}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.brightness}
              onChange={(e) => onAdjustmentsChange({ ...adjustments, brightness: Number(e.target.value) })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Contrast: {adjustments.contrast > 0 ? '+' : ''}{adjustments.contrast}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.contrast}
              onChange={(e) => onAdjustmentsChange({ ...adjustments, contrast: Number(e.target.value) })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/80 mb-1">
              Saturation: {adjustments.saturation}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={adjustments.saturation}
              onChange={(e) => onAdjustmentsChange({ ...adjustments, saturation: Number(e.target.value) })}
              className="w-full accent-[#00ffff]"
            />
          </div>

          <button
            onClick={() => onAdjustmentsChange({
              brightness: 0,
              contrast: 0,
              blur: 0,
              sharpen: 0,
              sharpenRadius: 10,
              saturation: 100,
              noise: 0,
              tonalControls: { highlights: 0, midtones: 0, shadows: 0 },
              levels: { inputBlack: 0, inputWhite: 255, outputBlack: 0, outputWhite: 255, gamma: 1 }
            })}
            className="w-full px-4 py-2 bg-black/50 text-[#00ff41] border-2 border-[#00ff41]/50 rounded-lg hover:border-[#00ff41] hover:glow-green transition-all text-sm font-semibold"
          >
            Reset All Adjustments
          </button>
        </div>
      </div>
    </div>
  );
}
