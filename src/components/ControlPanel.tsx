import { useState } from 'react';
import { ChevronDown, RotateCcw, Zap, RefreshCw } from 'lucide-react';
import { DitheringAlgorithm, ColorMode, ImageAdjustments, ResamplingMethod, ColorModeSettings, PaletteModifiers, PostProcessing, ModulationPreset } from '../types';
import { PREDEFINED_PALETTES } from '../utils/palettes';
import { CreativePresetConfig } from '../utils/smartDefaults';

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
  colorModeSettings: ColorModeSettings;
  onColorModeSettingsChange: (settings: ColorModeSettings) => void;
  paletteModifiers: PaletteModifiers;
  onPaletteModifiersChange: (mods: PaletteModifiers) => void;
  postProcessing: PostProcessing;
  onPostProcessingChange: (pp: PostProcessing) => void;
  isAutoTuned: boolean;
  onReAnalyze: () => void;
  creativePresets: CreativePresetConfig[];
  activePreset: string | null;
  onPresetApply: (preset: CreativePresetConfig) => void;
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

const colorModes: { value: ColorMode; label: string }[] = [
  { value: 'mono', label: 'Mono' },
  { value: 'indexed', label: 'Indexed' },
  { value: 'rgb', label: 'RGB' },
  { value: 'duo-tone', label: 'Duo-Tone' },
  { value: 'tri-tone', label: 'Tri-Tone' },
  { value: 'tonal', label: 'Tonal' },
  { value: 'rgb-split', label: 'RGB Split' },
  { value: 'modulation', label: 'Modulate' },
];

const modulationPresets: { value: ModulationPreset; label: string }[] = [
  { value: 'none', label: 'OFF' },
  { value: 'crt', label: 'CRT' },
  { value: 'glitch', label: 'GLITCH' },
  { value: 'chromatic', label: 'CHROMA' },
  { value: 'vhs', label: 'VHS' },
  { value: 'digital', label: 'DIGITAL' },
];

function Section({ title, children, defaultOpen = true, badge }: { title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.03]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-0.5 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono-ui text-white/30 tracking-[0.15em] group-hover:text-white/45 transition-colors">{title}</span>
          {badge}
        </div>
        <ChevronDown className={`w-3 h-3 text-white/15 transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`} />
      </button>
      {isOpen && (
        <div className="space-y-2.5 pb-3 animate-section-in">
          {children}
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, display }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; display?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-white/35">{label}</span>
        <span className="text-[9px] font-mono-ui text-[#00ff41]/70 tabular-nums">{display ?? value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full custom-slider"
      />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/35 flex-1">{label}</span>
      <input
        type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-white/[0.06] bg-transparent cursor-pointer appearance-none [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm"
      />
      <span className="text-[9px] font-mono-ui text-white/20 w-12">{value}</span>
    </div>
  );
}

export default function ControlPanel({
  algorithm, onAlgorithmChange, colorMode, onColorModeChange,
  selectedPalette, onPaletteChange, colorCount, onColorCountChange,
  adjustments, onAdjustmentsChange, resamplingMethod, onResamplingMethodChange,
  colorModeSettings, onColorModeSettingsChange,
  paletteModifiers, onPaletteModifiersChange,
  postProcessing, onPostProcessingChange,
  isAutoTuned, onReAnalyze, creativePresets, activePreset, onPresetApply,
}: ControlPanelProps) {

  const applyModulationPreset = (preset: ModulationPreset) => {
    const presets: Record<ModulationPreset, typeof colorModeSettings.modulation> = {
      none: { preset: 'none', scanlineIntensity: 0, scanlineGap: 3, chromaticOffset: 0, rgbShift: 0, noiseAmount: 0, pixelation: 1, interference: 0 },
      crt: { preset: 'crt', scanlineIntensity: 60, scanlineGap: 3, chromaticOffset: 1, rgbShift: 0, noiseAmount: 5, pixelation: 1, interference: 0 },
      glitch: { preset: 'glitch', scanlineIntensity: 20, scanlineGap: 8, chromaticOffset: 4, rgbShift: 3, noiseAmount: 15, pixelation: 1, interference: 40 },
      chromatic: { preset: 'chromatic', scanlineIntensity: 0, scanlineGap: 3, chromaticOffset: 5, rgbShift: 2, noiseAmount: 0, pixelation: 1, interference: 0 },
      vhs: { preset: 'vhs', scanlineIntensity: 30, scanlineGap: 4, chromaticOffset: 2, rgbShift: 1, noiseAmount: 25, pixelation: 1, interference: 20 },
      digital: { preset: 'digital', scanlineIntensity: 10, scanlineGap: 2, chromaticOffset: 0, rgbShift: 0, noiseAmount: 8, pixelation: 3, interference: 0 },
    };
    onColorModeSettingsChange({ ...colorModeSettings, modulation: presets[preset] });
  };

  const updateMod = (partial: Partial<typeof colorModeSettings.modulation>) => {
    onColorModeSettingsChange({
      ...colorModeSettings,
      modulation: { ...colorModeSettings.modulation, ...partial, preset: 'none' },
    });
  };

  const autoBadge = isAutoTuned ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/20 animate-auto-badge">
      <Zap className="w-2 h-2 text-[#00ff41]" />
      <span className="text-[7px] font-mono-ui text-[#00ff41] tracking-wider">AUTO</span>
    </span>
  ) : null;

  return (
    <div className="panel rounded-lg p-3 max-h-[calc(100vh-7rem)] overflow-y-auto control-panel-scroll">
      <div className="pb-2.5 mb-1 border-b border-white/[0.03]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono-ui text-white/30 tracking-[0.15em]">PRESETS</span>
          {isAutoTuned && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/20">
              <Zap className="w-2 h-2 text-[#00ff41]" />
              <span className="text-[7px] font-mono-ui text-[#00ff41] tracking-wider">AUTO-TUNED</span>
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {creativePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPresetApply(preset)}
              className={`py-1.5 rounded text-[8px] font-mono-ui tracking-wider transition-all border ${
                activePreset === preset.id
                  ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20'
                  : 'bg-transparent text-white/25 border-white/[0.04] hover:border-white/[0.08] hover:text-white/40'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <Section title="DITHER" defaultOpen={true} badge={autoBadge}>
        <div>
          <span className="text-[9px] font-mono-ui text-white/20 tracking-wider block mb-1">ALGORITHM</span>
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
          <span className="text-[9px] font-mono-ui text-white/20 tracking-wider block mb-1">COLOR MODE</span>
          <select
            value={colorMode}
            onChange={(e) => onColorModeChange(e.target.value as ColorMode)}
            className="custom-select w-full"
          >
            {colorModes.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {colorMode === 'indexed' && (
          <Slider label="Color Count" value={colorCount} min={2} max={64} onChange={onColorCountChange} />
        )}
      </Section>

      {colorMode === 'duo-tone' && (
        <Section title="DUO-TONE" defaultOpen={true}>
          <ColorRow label="Shadow" value={colorModeSettings.duoTone.shadowColor}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, duoTone: { ...colorModeSettings.duoTone, shadowColor: v } })} />
          <ColorRow label="Highlight" value={colorModeSettings.duoTone.highlightColor}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, duoTone: { ...colorModeSettings.duoTone, highlightColor: v } })} />
        </Section>
      )}

      {colorMode === 'tri-tone' && (
        <Section title="TRI-TONE" defaultOpen={true}>
          <ColorRow label="Shadow" value={colorModeSettings.triTone.shadowColor}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, triTone: { ...colorModeSettings.triTone, shadowColor: v } })} />
          <ColorRow label="Midtone" value={colorModeSettings.triTone.midtoneColor}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, triTone: { ...colorModeSettings.triTone, midtoneColor: v } })} />
          <ColorRow label="Highlight" value={colorModeSettings.triTone.highlightColor}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, triTone: { ...colorModeSettings.triTone, highlightColor: v } })} />
        </Section>
      )}

      {colorMode === 'tonal' && (
        <Section title="TONAL MAPPING" defaultOpen={true}>
          <ColorRow label="Shadow" value={colorModeSettings.tonalMapping.shadowColor}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, tonalMapping: { ...colorModeSettings.tonalMapping, shadowColor: v } })} />
          <ColorRow label="Midtone" value={colorModeSettings.tonalMapping.midtoneColor}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, tonalMapping: { ...colorModeSettings.tonalMapping, midtoneColor: v } })} />
          <ColorRow label="Highlight" value={colorModeSettings.tonalMapping.highlightColor}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, tonalMapping: { ...colorModeSettings.tonalMapping, highlightColor: v } })} />
          <Slider label="Preserve Original" value={colorModeSettings.tonalMapping.preserveOriginal} min={0} max={100}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, tonalMapping: { ...colorModeSettings.tonalMapping, preserveOriginal: v } })}
            display={`${colorModeSettings.tonalMapping.preserveOriginal}%`} />
        </Section>
      )}

      {colorMode === 'rgb-split' && (
        <Section title="RGB SPLIT" defaultOpen={true}>
          <Slider label="Red X" value={colorModeSettings.rgbSplit.redOffsetX} min={-20} max={20}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, rgbSplit: { ...colorModeSettings.rgbSplit, redOffsetX: v } })} />
          <Slider label="Red Y" value={colorModeSettings.rgbSplit.redOffsetY} min={-20} max={20}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, rgbSplit: { ...colorModeSettings.rgbSplit, redOffsetY: v } })} />
          <Slider label="Blue X" value={colorModeSettings.rgbSplit.blueOffsetX} min={-20} max={20}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, rgbSplit: { ...colorModeSettings.rgbSplit, blueOffsetX: v } })} />
          <Slider label="Blue Y" value={colorModeSettings.rgbSplit.blueOffsetY} min={-20} max={20}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, rgbSplit: { ...colorModeSettings.rgbSplit, blueOffsetY: v } })} />
          <Slider label="Intensity" value={colorModeSettings.rgbSplit.intensity} min={0} max={100}
            onChange={(v) => onColorModeSettingsChange({ ...colorModeSettings, rgbSplit: { ...colorModeSettings.rgbSplit, intensity: v } })}
            display={`${colorModeSettings.rgbSplit.intensity}%`} />
        </Section>
      )}

      {colorMode === 'modulation' && (
        <Section title="MODULATION" defaultOpen={true}>
          <div className="grid grid-cols-3 gap-1">
            {modulationPresets.map((p) => (
              <button key={p.value} onClick={() => applyModulationPreset(p.value)}
                className={`py-1.5 rounded text-[8px] font-mono-ui tracking-wider transition-all border ${
                  colorModeSettings.modulation.preset === p.value
                    ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20'
                    : 'bg-transparent text-white/20 border-white/[0.04] hover:border-white/[0.08] hover:text-white/35'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Slider label="Scanlines" value={colorModeSettings.modulation.scanlineIntensity} min={0} max={100}
            onChange={(v) => updateMod({ scanlineIntensity: v })} display={`${colorModeSettings.modulation.scanlineIntensity}%`} />
          <Slider label="Scanline Gap" value={colorModeSettings.modulation.scanlineGap} min={2} max={10}
            onChange={(v) => updateMod({ scanlineGap: v })} />
          <Slider label="Chromatic" value={colorModeSettings.modulation.chromaticOffset} min={0} max={15}
            onChange={(v) => updateMod({ chromaticOffset: v })} />
          <Slider label="RGB Shift" value={colorModeSettings.modulation.rgbShift} min={0} max={10}
            onChange={(v) => updateMod({ rgbShift: v })} />
          <Slider label="Noise" value={colorModeSettings.modulation.noiseAmount} min={0} max={100}
            onChange={(v) => updateMod({ noiseAmount: v })} display={`${colorModeSettings.modulation.noiseAmount}%`} />
          <Slider label="Pixelation" value={colorModeSettings.modulation.pixelation} min={1} max={16}
            onChange={(v) => updateMod({ pixelation: v })} />
          <Slider label="Interference" value={colorModeSettings.modulation.interference} min={0} max={100}
            onChange={(v) => updateMod({ interference: v })} display={`${colorModeSettings.modulation.interference}%`} />
        </Section>
      )}

      <Section title="PALETTE" defaultOpen={true}>
        <select value={selectedPalette} onChange={(e) => onPaletteChange(Number(e.target.value))} className="custom-select w-full">
          {PREDEFINED_PALETTES.map((palette, index) => (
            <option key={index} value={index}>{palette.name}</option>
          ))}
        </select>
        <div className="flex gap-0.5 flex-wrap">
          {PREDEFINED_PALETTES[selectedPalette].colors.map((color, idx) => (
            <div key={idx} className="w-4 h-4 rounded-sm border border-white/[0.06] flex-shrink-0 transition-transform hover:scale-150 cursor-default"
              style={{ backgroundColor: color }} title={color} />
          ))}
        </div>
        <Slider label="Hue Shift" value={paletteModifiers.hueShift} min={-180} max={180}
          onChange={(v) => onPaletteModifiersChange({ ...paletteModifiers, hueShift: v })}
          display={`${paletteModifiers.hueShift > 0 ? '+' : ''}${paletteModifiers.hueShift}`} />
        <Slider label="Saturation" value={paletteModifiers.saturationBoost} min={-100} max={100}
          onChange={(v) => onPaletteModifiersChange({ ...paletteModifiers, saturationBoost: v })}
          display={`${paletteModifiers.saturationBoost > 0 ? '+' : ''}${paletteModifiers.saturationBoost}`} />
        <Slider label="Brightness" value={paletteModifiers.brightnessShift} min={-100} max={100}
          onChange={(v) => onPaletteModifiersChange({ ...paletteModifiers, brightnessShift: v })}
          display={`${paletteModifiers.brightnessShift > 0 ? '+' : ''}${paletteModifiers.brightnessShift}`} />
        <Slider label="Intensity" value={paletteModifiers.intensity} min={0} max={200}
          onChange={(v) => onPaletteModifiersChange({ ...paletteModifiers, intensity: v })}
          display={`${paletteModifiers.intensity}%`} />
      </Section>

      <Section title="POST-PROCESSING" defaultOpen={false}>
        <Slider label="Scanlines" value={postProcessing.scanlines} min={0} max={100}
          onChange={(v) => onPostProcessingChange({ ...postProcessing, scanlines: v })} display={`${postProcessing.scanlines}%`} />
        <Slider label="Chromatic Aberration" value={postProcessing.chromaticAberration} min={0} max={100}
          onChange={(v) => onPostProcessingChange({ ...postProcessing, chromaticAberration: v })} display={`${postProcessing.chromaticAberration}%`} />
        <Slider label="Vignette" value={postProcessing.vignette} min={0} max={100}
          onChange={(v) => onPostProcessingChange({ ...postProcessing, vignette: v })} display={`${postProcessing.vignette}%`} />
        <Slider label="Bloom" value={postProcessing.bloom} min={0} max={100}
          onChange={(v) => onPostProcessingChange({ ...postProcessing, bloom: v })} display={`${postProcessing.bloom}%`} />
      </Section>

      <Section title="EFFECTS" defaultOpen={false}>
        <Slider label="Sharpen" value={adjustments.sharpen} min={0} max={100}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, sharpen: v })} />
        <Slider label="Sharpen Radius" value={adjustments.sharpenRadius} min={0} max={30}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, sharpenRadius: v })} />
        <Slider label="Blur" value={adjustments.blur} min={0} max={20}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, blur: v })} />
        <Slider label="Noise" value={adjustments.noise} min={0} max={100}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, noise: v })} />
      </Section>

      <Section title="TONAL" defaultOpen={false}>
        <Slider label="Highlights" value={adjustments.tonalControls.highlights} min={-100} max={100}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, tonalControls: { ...adjustments.tonalControls, highlights: v } })}
          display={adjustments.tonalControls.highlights > 0 ? `+${adjustments.tonalControls.highlights}` : String(adjustments.tonalControls.highlights)} />
        <Slider label="Midtones" value={adjustments.tonalControls.midtones} min={-100} max={100}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, tonalControls: { ...adjustments.tonalControls, midtones: v } })}
          display={adjustments.tonalControls.midtones > 0 ? `+${adjustments.tonalControls.midtones}` : String(adjustments.tonalControls.midtones)} />
        <Slider label="Shadows" value={adjustments.tonalControls.shadows} min={-100} max={100}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, tonalControls: { ...adjustments.tonalControls, shadows: v } })}
          display={adjustments.tonalControls.shadows > 0 ? `+${adjustments.tonalControls.shadows}` : String(adjustments.tonalControls.shadows)} />
      </Section>

      <Section title="LEVELS" defaultOpen={false}>
        <Slider label="Input Black" value={adjustments.levels.inputBlack} min={0} max={255}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, inputBlack: v } })} />
        <Slider label="Input White" value={adjustments.levels.inputWhite} min={0} max={255}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, inputWhite: v } })} />
        <Slider label="Gamma" value={adjustments.levels.gamma} min={0.1} max={3} step={0.01}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, gamma: v } })}
          display={adjustments.levels.gamma.toFixed(2)} />
        <Slider label="Output Black" value={adjustments.levels.outputBlack} min={0} max={255}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, outputBlack: v } })} />
        <Slider label="Output White" value={adjustments.levels.outputWhite} min={0} max={255}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, levels: { ...adjustments.levels, outputWhite: v } })} />
      </Section>

      <Section title="ADJUSTMENTS" defaultOpen={false}>
        <Slider label="Brightness" value={adjustments.brightness} min={-100} max={100}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, brightness: v })}
          display={adjustments.brightness > 0 ? `+${adjustments.brightness}` : String(adjustments.brightness)} />
        <Slider label="Contrast" value={adjustments.contrast} min={-100} max={100}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, contrast: v })}
          display={adjustments.contrast > 0 ? `+${adjustments.contrast}` : String(adjustments.contrast)} />
        <Slider label="Saturation" value={adjustments.saturation} min={0} max={200}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, saturation: v })}
          display={`${adjustments.saturation}%`} />
        <div className="flex gap-1.5">
          <button onClick={() => onAdjustmentsChange({
            brightness: 0, contrast: 0, blur: 0, sharpen: 0, sharpenRadius: 10,
            saturation: 100, noise: 0,
            tonalControls: { highlights: 0, midtones: 0, shadows: 0 },
            levels: { inputBlack: 0, inputWhite: 255, outputBlack: 0, outputWhite: 255, gamma: 1 },
          })}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-mono-ui text-white/20 border border-white/[0.04] rounded hover:border-white/[0.08] hover:text-white/35 transition-all tracking-wider"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            RESET
          </button>
          <button onClick={onReAnalyze}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-mono-ui text-[#00ff41]/40 border border-[#00ff41]/10 rounded hover:border-[#00ff41]/20 hover:text-[#00ff41]/60 transition-all tracking-wider"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            RE-ANALYZE
          </button>
        </div>
      </Section>

      <Section title="INPUT / OUTPUT" defaultOpen={false}>
        <div>
          <span className="text-[9px] font-mono-ui text-white/20 tracking-wider block mb-1">RESAMPLING</span>
          <select value={resamplingMethod} onChange={(e) => onResamplingMethodChange(e.target.value as ResamplingMethod)} className="custom-select w-full">
            {resamplingMethods.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </Section>
    </div>
  );
}
