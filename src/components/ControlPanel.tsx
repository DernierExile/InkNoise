import { useState } from 'react';
import { ChevronDown, Sliders, SlidersHorizontal, Palette, Settings, RotateCcw, Layers } from 'lucide-react';
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
  { value: 'ordered-2x2', label: 'Ordered 2x2', category: 'Ordered' },
  { value: 'ordered-4x4', label: 'Ordered 4x4', category: 'Ordered' },
  { value: 'ordered-8x8', label: 'Ordered 8x8', category: 'Ordered' },
  { value: 'bayer-3x3', label: 'Bayer 3x3', category: 'Ordered' },
  { value: 'bayer-16x16', label: 'Bayer 16x16', category: 'Ordered' },
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
  { value: 'none', label: 'None', category: 'Other' },
];

const resamplingMethods: { value: ResamplingMethod; label: string }[] = [
  { value: 'nearest-neighbor', label: 'Nearest Neighbor' },
  { value: 'bilinear', label: 'Bilinear' },
  { value: 'bicubic', label: 'Bicubic' },
];

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon: Icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#00ff41]/12 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2.5 px-1 text-left rounded-md transition-colors hover:bg-[#00ff41]/3"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-[#00ffff]/60" />
          <span className="text-xs font-bold text-[#00ff41]/85 tracking-widest uppercase">{title}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#00ff41]/35 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
        />
      </button>
      {isOpen && (
        <div className="space-y-3 pb-4 px-1 animate-section-in">
          {children}
        </div>
      )}
    </div>
  );
}

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  displayValue?: string;
}

function SliderControl({ label, value, min, max, step = 1, onChange, displayValue }: SliderControlProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs text-[#00ffff]/55">{label}</label>
        <span className="text-xs font-mono text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded min-w-[2.75rem] text-center leading-none py-1">
          {displayValue ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full custom-slider"
      />
    </div>
  );
}

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
  onResamplingMethodChange,
}: ControlPanelProps) {
  return (
    <div className="control-panel-bg rounded-xl p-4 max-h-[calc(100vh-13rem)] overflow-y-auto control-panel-scroll">
      <div className="space-y-0">

        <Section title="Dither" icon={Layers} defaultOpen={true}>
          <div>
            <label className="block text-xs text-[#00ffff]/55 mb-1.5">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => onAlgorithmChange(e.target.value as DitheringAlgorithm)}
              className="custom-select w-full"
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
                    <option key={alg.value} value={alg.value}>{alg.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#00ffff]/55 mb-1.5">Color Mode</label>
            <div className="flex gap-1.5">
              {(['mono', 'indexed', 'rgb'] as ColorMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onColorModeChange(mode)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    colorMode === mode
                      ? 'bg-[#00ffff]/12 text-[#00ffff] border-[#00ffff]/55 glow-cyan'
                      : 'bg-black/20 text-[#00ff41]/45 border-[#00ff41]/12 hover:border-[#00ff41]/35 hover:text-[#00ff41]/75'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {colorMode === 'indexed' && (
            <SliderControl
              label="Color Count"
              value={colorCount}
              min={2}
              max={64}
              onChange={onColorCountChange}
            />
          )}
        </Section>

        <Section title="Palette" icon={Palette} defaultOpen={true}>
          <select
            value={selectedPalette}
            onChange={(e) => onPaletteChange(Number(e.target.value))}
            className="custom-select w-full"
          >
            {PREDEFINED_PALETTES.map((palette, index) => (
              <option key={index} value={index}>{palette.name}</option>
            ))}
          </select>
          <div className="flex gap-1 flex-wrap">
            {PREDEFINED_PALETTES[selectedPalette].colors.map((color, idx) => (
              <div
                key={idx}
                className="w-5 h-5 rounded border border-[#00ff41]/25 flex-shrink-0 transition-transform hover:scale-125 cursor-default"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </Section>

        <Section title="Input / Output" icon={Settings} defaultOpen={false}>
          <div>
            <label className="block text-xs text-[#00ffff]/55 mb-1.5">Resampling</label>
            <select
              value={resamplingMethod}
              onChange={(e) => onResamplingMethodChange(e.target.value as ResamplingMethod)}
              className="custom-select w-full"
            >
              {resamplingMethods.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </Section>

        <Section title="Effects" icon={Sliders} defaultOpen={true}>
          <SliderControl label="Sharpen" value={adjustments.sharpen} min={0} max={100}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, sharpen: v })} />
          <SliderControl label="Sharpen Radius" value={adjustments.sharpenRadius} min={0} max={30}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, sharpenRadius: v })} />
          <SliderControl label="Blur" value={adjustments.blur} min={0} max={20}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, blur: v })} />
          <SliderControl label="Noise" value={adjustments.noise} min={0} max={100}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, noise: v })} />
        </Section>

        <Section title="Tonal" icon={SlidersHorizontal} defaultOpen={false}>
          <SliderControl label="Highlights" value={adjustments.tonalControls.highlights} min={-100} max={100}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, tonalControls: { ...adjustments.tonalControls, highlights: v } })}
            displayValue={adjustments.tonalControls.highlights > 0 ? `+${adjustments.tonalControls.highlights}` : String(adjustments.tonalControls.highlights)} />
          <SliderControl label="Midtones" value={adjustments.tonalControls.midtones} min={-100} max={100}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, tonalControls: { ...adjustments.tonalControls, midtones: v } })}
            displayValue={adjustments.tonalControls.midtones > 0 ? `+${adjustments.tonalControls.midtones}` : String(adjustments.tonalControls.midtones)} />
          <SliderControl label="Shadows" value={adjustments.tonalControls.shadows} min={-100} max={100}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, tonalControls: { ...adjustments.tonalControls, shadows: v } })}
            displayValue={adjustments.tonalControls.shadows > 0 ? `+${adjustments.tonalControls.shadows}` : String(adjustments.tonalControls.shadows)} />
        </Section>

        <Section title="Levels" icon={SlidersHorizontal} defaultOpen={false}>
          <SliderControl label="Input Black" value={adjustments.levels.inputBlack} min={0} max={255}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, inputBlack: v } })} />
          <SliderControl label="Input White" value={adjustments.levels.inputWhite} min={0} max={255}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, inputWhite: v } })} />
          <SliderControl label="Gamma" value={adjustments.levels.gamma} min={0.1} max={3} step={0.01}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, gamma: v } })}
            displayValue={adjustments.levels.gamma.toFixed(2)} />
          <SliderControl label="Output Black" value={adjustments.levels.outputBlack} min={0} max={255}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, outputBlack: v } })} />
          <SliderControl label="Output White" value={adjustments.levels.outputWhite} min={0} max={255}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, outputWhite: v } })} />
        </Section>

        <Section title="Adjustments" icon={Sliders} defaultOpen={false}>
          <SliderControl label="Brightness" value={adjustments.brightness} min={-100} max={100}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, brightness: v })}
            displayValue={adjustments.brightness > 0 ? `+${adjustments.brightness}` : String(adjustments.brightness)} />
          <SliderControl label="Contrast" value={adjustments.contrast} min={-100} max={100}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, contrast: v })}
            displayValue={adjustments.contrast > 0 ? `+${adjustments.contrast}` : String(adjustments.contrast)} />
          <SliderControl label="Saturation" value={adjustments.saturation} min={0} max={200}
            onChange={(v) => onAdjustmentsChange({ ...adjustments, saturation: v })}
            displayValue={`${adjustments.saturation}%`} />
          <button
            onClick={() => onAdjustmentsChange({
              brightness: 0, contrast: 0, blur: 0, sharpen: 0, sharpenRadius: 10,
              saturation: 100, noise: 0,
              tonalControls: { highlights: 0, midtones: 0, shadows: 0 },
              levels: { inputBlack: 0, inputWhite: 255, outputBlack: 0, outputWhite: 255, gamma: 1 },
            })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black/30 text-[#00ff41]/55 border border-[#00ff41]/15 rounded-lg hover:border-[#00ff41]/45 hover:text-[#00ff41]/85 transition-all text-xs font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
        </Section>

      </div>
    </div>
  );
}
