import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Shuffle, Heart, Share2, Pencil, Download, ImagePlus, Maximize2, SlidersHorizontal, X, Trash2, Upload } from 'lucide-react';
import ControlPanel from './ControlPanel';
import { ImageAnalysis } from '../types';
import { analyzeImage } from '../utils/imageAnalysis';
import { computeSmartDefaults, getCreativePresets, LOOK_PRESETS } from '../utils/smartDefaults';
import { buildCasting, presetToConfig, VariantConfig } from '../utils/casting';
import { RenderPool, imageToImageData, paintImageData } from '../utils/galleryRender';
import { loadWatermarkImage, drawWatermarkOnCanvas } from '../utils/watermark';

interface Props {
  originalImage: HTMLImageElement | null;
  isPro: boolean;
  onImageLoad: (img: HTMLImageElement) => void;
  onExit: () => void;
  toolbar?: ReactNode;
}

interface Favorite {
  id: string;        // signature de la config (sert aussi a detecter le doublon)
  ts: number;        // date d'ajout
  label: string;
  algoLabel: string;
  thumb: string;     // dataURL apercu
  cfg: VariantConfig;
}

const MAIN_SIZE = 880;
const THUMB_SIZE = 320;
const FAV_KEY = 'inknoise_favorites_v1';

/* --- partage / signature : la config voyage dans le lien (#s=...) --- */
function slim(cfg: VariantConfig) {
  return { a: cfg.algorithm, m: cfg.colorMode, p: cfg.selectedPalette, cc: cfg.colorCount, rs: cfg.resamplingMethod,
    ad: cfg.adjustments, cm: cfg.colorModeSettings, pm: cfg.paletteModifiers, pp: cfg.postProcessing, po: cfg.paletteOverride,
    l: cfg.meta?.label, al: cfg.meta?.algoLabel, id: cfg.meta?.id };
}
function encodeConfig(cfg: VariantConfig): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(slim(cfg)))));
}
function decodeConfig(s: string): VariantConfig | null {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(s))));
    return { algorithm: o.a, colorMode: o.m, selectedPalette: o.p, colorCount: o.cc, resamplingMethod: o.rs,
      adjustments: o.ad, colorModeSettings: o.cm, paletteModifiers: o.pm, postProcessing: o.pp, paletteOverride: o.po,
      meta: { id: o.id || 'shared', label: o.l || 'Partagé', family: 'image', algoLabel: o.al || '' } };
  } catch { return null; }
}

function loadFavs(): Favorite[] {
  try { const r = localStorage.getItem(FAV_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
export default function GalleryStudio({ originalImage, isPro, onImageLoad, onExit, toolbar }: Props) {
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [cast, setCast] = useState<VariantConfig[]>([]);
  const [focus, setFocus] = useState(0);
  const [heroFav, setHeroFav] = useState<VariantConfig | null>(null); // favori/partage affiche dans la toile
  const [layout, setLayout] = useState<'canvas' | 'grid'>('canvas');
  const [proOpen, setProOpen] = useState(false);
  const [pcfg, setPcfg] = useState<VariantConfig | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [favs, setFavs] = useState<Favorite[]>(() => loadFavs());
  const [toast, setToast] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [share, setShare] = useState<string | null>(null);
  const favCap = 10; // session/navigateur · le compte (jusqu'à 100, classés par jour) = Bientôt

  const poolRef = useRef<RenderPool | null>(null);
  const srcMain = useRef<ImageData | null>(null);
  const srcThumb = useRef<ImageData | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const lbCanvas = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<Set<string>>(new Set());
  const tokenRef = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sharedRef = useRef<VariantConfig | null>(null);

  const flash = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const processFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const img = new Image(); img.onload = () => onImageLoad(img); img.src = ev.target?.result as string; };
    reader.readAsDataURL(file);
  }, [onImageLoad]);

  // Lecture d'un lien de partage au montage
  useEffect(() => {
    const h = window.location.hash;
    if (h.startsWith('#s=')) {
      const cfg = decodeConfig(h.slice(3));
      if (cfg) sharedRef.current = cfg;
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Init pool + analyse + premier casting quand l'image change
  useEffect(() => {
    if (!originalImage) return;
    const pool = new RenderPool(3);
    poolRef.current = pool;
    const main = imageToImageData(originalImage, MAIN_SIZE);
    const thumb = imageToImageData(originalImage, THUMB_SIZE);
    srcMain.current = main; srcThumb.current = thumb;
    let a: ImageAnalysis | null = null;
    try { a = analyzeImage(main); } catch { a = null; }
    setAnalysis(a);
    const c = buildCasting(a, thumb, [null, null, null, null, null], new Set());
    historyRef.current = new Set(c.map(v => v.meta.id));
    setCast(c);
    setFocus(0);
    if (sharedRef.current) { setHeroFav(sharedRef.current); flash('Réglages partagés chargés sur cette image'); sharedRef.current = null; }
    else setHeroFav(null);
    return () => { pool.terminate(); poolRef.current = null; };
  }, [originalImage]);

  // pcfg suit la config affichee dans la toile
  useEffect(() => {
    const c = heroFav || cast[focus];
    if (c) { setPcfg(c); setActivePreset(c.meta.id); }
  }, [focus, cast, heroFav]);

  // sauvegarde favoris
  useEffect(() => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* quota */ } }, [favs]);

  // Rendu du casting (toile d'abord, puis bande en cascade)
  useEffect(() => {
    const pool = poolRef.current;
    if (!cast.length || !pool || !srcMain.current || !srcThumb.current) return;
    const my = ++tokenRef.current;
    const main = srcMain.current, thumb = srcThumb.current;
    (async () => {
      const order = [focus, ...[0, 1, 2, 3, 4].filter(i => i !== focus)];
      for (const i of order) {
        if (my !== tokenRef.current) return;
        const isFocus = i === focus;
        const cfg = isFocus && heroFav ? heroFav : cast[i];
        if (!cfg) continue;
        try {
          const img = await pool.render(isFocus ? main : thumb, cfg);
          if (my !== tokenRef.current) return;
          paintImageData(canvasRefs.current[i], img);
        } catch { /* skip */ }
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 40)));
      }
    })();
  }, [cast, layout, focus, heroFav]);

  // Rendu live de la toile quand on edite dans le mode pro
  useEffect(() => {
    if (!proOpen || !pcfg || !poolRef.current || !srcMain.current) return;
    const pool = poolRef.current, src = srcMain.current, cfg = pcfg, i = focus;
    const id = setTimeout(async () => {
      try { const img = await pool.render(src, cfg); paintImageData(canvasRefs.current[i], img); } catch { /* skip */ }
    }, 150);
    return () => clearTimeout(id);
  }, [pcfg, proOpen, focus]);

  const reroll = useCallback(() => {
    if (!srcThumb.current) return;
    setHeroFav(null);
    setCast(() => {
      const next = buildCasting(analysis, srcThumb.current!, [null, null, null, null, null], historyRef.current);
      next.forEach(v => historyRef.current.add(v.meta.id));
      if (historyRef.current.size > 40) historyRef.current = new Set(next.map(v => v.meta.id));
      return next;
    });
    setFocus(0);
  }, [analysis]);

  const renderThumb = useCallback(async (cfg: VariantConfig): Promise<string> => {
    if (!poolRef.current || !srcThumb.current) return '';
    try {
      const img = await poolRef.current.render(srcThumb.current, cfg);
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d')!.putImageData(img, 0, 0);
      return c.toDataURL('image/jpeg', 0.7);
    } catch { return ''; }
  }, []);

  const toggleFav = useCallback(async (cfg: VariantConfig) => {
    const sig = encodeConfig(cfg);
    const exists = favs.some(f => f.id === sig);
    if (exists) { setFavs(prev => prev.filter(f => f.id !== sig)); return; }
    if (favs.length >= favCap) { flash(`${favCap} favoris max dans ce navigateur`); return; }
    const thumb = await renderThumb(cfg);
    setFavs(prev => [{ id: sig, ts: Date.now(), label: cfg.meta.label, algoLabel: cfg.meta.algoLabel, thumb, cfg }, ...prev].slice(0, favCap));
    flash('Ajouté aux favoris');
  }, [favs, renderThumb, favCap, isPro]);

  const isFav = (cfg: VariantConfig | null) => !!cfg && favs.some(f => f.id === encodeConfig(cfg));

  const editConfig = (cfg: VariantConfig) => { setPcfg(cfg); setActivePreset(cfg.meta.id); setProOpen(true); };

  const shareConfig = useCallback((cfg: VariantConfig) => {
    setShare(`${window.location.origin}${window.location.pathname}#s=${encodeConfig(cfg)}`);
  }, []);

  const copyShare = useCallback(async () => {
    if (!share) return;
    let ok = false;
    const input = shareInputRef.current;
    if (input) { input.focus(); input.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } }
    if (!ok) { try { await navigator.clipboard.writeText(share); ok = true; } catch { ok = false; } }
    flash(ok ? 'Lien copié' : 'Lien sélectionné · fais Ctrl+C');
  }, [share]);

  const exportConfig = useCallback(async (cfg: VariantConfig, format: 'png' | 'jpg' | 'webp' = 'png') => {
    if (!poolRef.current || !originalImage) return;
    const full = imageToImageData(originalImage, isPro ? 3840 : 1600);
    let img: ImageData;
    try { img = await poolRef.current.render(full, cfg); } catch { return; }
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.putImageData(img, 0, 0);
    if (!isPro) { try { const wm = await loadWatermarkImage(); drawWatermarkOnCanvas(ctx, canvas.width, canvas.height, wm); } catch { /* noop */ } }
    const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `inknoise-${Date.now()}.${format}`; a.click();
      URL.revokeObjectURL(url);
    }, mime);
  }, [isPro, originalImage]);

  const openLightbox = useCallback(async (cfg: VariantConfig) => {
    if (!poolRef.current || !originalImage) return;
    setLightbox(true);
    const big = imageToImageData(originalImage, 1280);
    try { const img = await poolRef.current.render(big, cfg); paintImageData(lbCanvas.current, img); } catch { /* skip */ }
  }, [originalImage]);

  // Espace = surprends-moi · Echap = fermer le zoom
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') { e.preventDefault(); reroll(); }
      if (e.key === 'Escape') { setLightbox(false); setShare(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reroll]);

  const creativePresets = getCreativePresets(analysis);
  const upd = (patch: Partial<VariantConfig>) => setPcfg(p => (p ? { ...p, ...patch } : p));
  const setCanvasRef = (i: number) => (el: HTMLCanvasElement | null) => { canvasRefs.current[i] = el; };

  // actions en coin (c",ur, partager, edit, download) sur une tuile
  const CornerActions = ({ cfg, i, big }: { cfg: VariantConfig; i: number; big: boolean }) => (
    <>
      <button onClick={(e) => { e.stopPropagation(); toggleFav(cfg); }}
        className={`absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded border bg-black/70 px-1.5 py-1 text-[9px] font-mono-ui uppercase tracking-wide
          ${isFav(cfg) ? 'border-bz-cyan text-bz-cyan' : 'border-bz-grid text-bz-system hover:text-bz-paper'} opacity-0 group-hover:opacity-100`}
        title="Favori">
        <Heart className="w-3 h-3" fill={isFav(cfg) ? 'currentColor' : 'none'} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); shareConfig(cfg); }}
        className={`absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded border border-bz-grid bg-black/70 px-1.5 py-1 text-[9px] font-mono-ui uppercase tracking-wide text-bz-system hover:text-bz-paper opacity-0 group-hover:opacity-100`}
        title="Partager">
        <Share2 className="w-3 h-3" />{big && 'Partager'}
      </button>
      <button onClick={(e) => { e.stopPropagation(); setFocus(i); setHeroFav(null); editConfig(cfg); }}
        className={`absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded border border-bz-grid bg-black/70 px-1.5 py-1 text-[9px] font-mono-ui uppercase tracking-wide text-bz-system hover:text-bz-paper opacity-0 group-hover:opacity-100`}
        title="Éditer dans le mode pro">
        <Pencil className="w-3 h-3" />{big && 'Éditer'}
      </button>
      <button onClick={(e) => { e.stopPropagation(); exportConfig(cfg, 'png'); }}
        className={`absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded border border-bz-grid bg-black/70 px-1.5 py-1 text-[9px] font-mono-ui uppercase tracking-wide text-bz-system hover:text-bz-paper opacity-0 group-hover:opacity-100`}
        title="Télécharger">
        <Download className="w-3 h-3" />{big && 'Télécharger'}
      </button>
    </>
  );

  const tile = (i: number, big: boolean) => {
    const cfg = i === focus && heroFav ? heroFav : cast[i];
    if (!cfg) return null;
    return (
      <div key={i}
        onClick={() => { if (layout === 'grid' || big) { openLightbox(cfg); } else { setFocus(i); setHeroFav(null); } }}
        className={`group relative border bg-black rounded-md overflow-hidden transition-all duration-200 ${big ? 'cursor-zoom-in' : 'cursor-pointer'}
          ${i === focus && layout === 'grid' ? 'border-bz-cyan' : 'border-bz-grid hover:border-bz-system'}`}>
        <canvas ref={setCanvasRef(i)} className="block w-full h-auto" />
        <CornerActions cfg={cfg} i={i} big={big} />
        {!big && (
          <button onClick={(e) => { e.stopPropagation(); openLightbox(cfg); }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 w-7 h-7 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Maximize2 className="w-3.5 h-3.5 text-bz-paper" />
          </button>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-2 pt-6 pb-7 bg-gradient-to-t from-black/90 to-transparent">
          <div className="text-[11px] text-bz-paper leading-tight">{cfg.meta.label}</div>
          <div className="text-[8px] font-mono-ui text-bz-system tracking-wide uppercase">{cfg.meta.algoLabel}</div>
        </div>
      </div>
    );
  };

  // rangee favoris (groupee par jour si Pro)
  const favRow = () => {
    if (!favs.length) {
      return (
        <div className="mt-5 border-t border-bz-grid pt-3">
          <div className="text-[10px] font-mono-ui text-bz-system tracking-widest uppercase">Favoris · 0/{favCap}</div>
          <div className="text-[10px] text-bz-system/70 mt-1">Mets une version en favori (cœur) pour l’épingler ici. La bande reste neuve.</div>
        </div>
      );
    }
    const groups: { label: string; items: Favorite[] }[] = [{ label: '', items: favs }];
    return (
      <div className="mt-5 border-t border-bz-grid pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono-ui text-bz-system tracking-widest uppercase">Favoris · {favs.length}/{favCap}</span>
          <span className="text-[9px] font-mono-ui text-bz-system/60 tracking-wide uppercase">Bientôt · sauvegardés dans ton compte (pour l'instant gardés dans ce navigateur)</span>
        </div>
        {groups.map((g, gi) => (
          <div key={gi} className="mb-2">
            {g.label && <div className="text-[9px] font-mono-ui text-bz-cyan/80 tracking-widest uppercase mb-1.5">{g.label}</div>}
            <div className="flex gap-2 flex-wrap">
              {g.items.map(f => (
                <div key={f.id} className="group relative w-[104px] border border-bz-grid rounded overflow-hidden cursor-pointer hover:border-bz-system"
                  onClick={() => { setHeroFav(f.cfg); setLayout('canvas'); }}>
                  {f.thumb ? <img src={f.thumb} alt={f.label} className="block w-full h-auto" /> : <div className="w-full h-[68px] bg-bz-deep" />}
                  <button onClick={(e) => { e.stopPropagation(); setFavs(prev => prev.filter(x => x.id !== f.id)); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-black/70 border border-bz-grid text-bz-system hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Retirer"><Trash2 className="w-2.5 h-2.5" /></button>
                  <div className="px-1.5 py-1 text-[8px] font-mono-ui text-bz-system tracking-wide uppercase truncate">{f.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!originalImage) {
    return (
      <div
        className="px-4 py-6"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
        <div onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 transition-colors duration-200 ${isDragging ? 'border-bz-cyan bg-bz-cyan/[0.04]' : 'border-bz-grid bg-bz-deep/40'}`}
          style={{ minHeight: '72vh' }}>
          <div className="w-16 h-16 border border-bz-grid bg-bz-graphite flex items-center justify-center">
            <Upload className={`w-8 h-8 ${isDragging ? 'text-bz-cyan' : 'text-bz-paper'}`} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-bz-paper tracking-tight px-4">
            {isDragging ? 'Lâche, on s’occupe du reste.' : 'Dépose une image.'}
          </h2>
          <p className="max-w-[42ch] text-[14px] leading-relaxed text-bz-interface px-4">
            Tu obtiens tout de suite 5 versions, choisies pour ton image. Aucun réglage à faire. Glisse un fichier ou clique.
          </p>
          <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">PNG · JPG · WEBP · 100% local, rien n’est envoyé</span>
          {toolbar && <div className="mt-1" onClick={(e) => e.stopPropagation()}>{toolbar}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start">
      <div className="flex-1 min-w-0 px-4 py-3">
        {/* Toolbar studio */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex border border-bz-grid rounded-md overflow-hidden">
            {(['canvas', 'grid'] as const).map(l => (
              <button key={l} onClick={() => setLayout(l)}
                className={`px-3 py-1.5 text-[10px] font-mono-ui tracking-wider uppercase ${layout === l ? 'bg-bz-deep text-bz-paper' : 'text-bz-system'}`}>
                {l === 'canvas' ? 'Toile + bande' : 'Grille'}
              </button>
            ))}
          </div>
          <button onClick={reroll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bz-cyan text-bz-graphite font-mono-ui text-[11px] tracking-wider uppercase font-semibold rounded-md hover:brightness-110">
            <Shuffle className="w-3 h-3" /> Surprends-moi !
          </button>
          <div className="flex-1" />
          <button onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 panel-surface text-[10px] font-mono-ui text-bz-system hover:text-bz-paper tracking-wider uppercase rounded-md">
            <ImagePlus className="w-3 h-3" /> Remplacer image
          </button>
          <button onClick={() => setProOpen(o => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono-ui tracking-wider uppercase rounded-md border
              ${proOpen ? 'border-bz-cyan text-bz-cyan bg-bz-cyan/10' : 'border-bz-grid text-bz-system hover:text-bz-paper'}`}>
            <SlidersHorizontal className="w-3 h-3" /> Mode pro
          </button>
        </div>

        {/* Results */}
        {layout === 'canvas' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full flex items-center justify-center bg-bz-deep/40 rounded-lg p-3" style={{ minHeight: '40vh' }}>
              {tile(focus, true)}
            </div>
            <div className="flex gap-3 flex-wrap justify-center w-full">
              {[0, 1, 2, 3, 4].filter(i => i !== focus).map(i => (
                <div key={i} className="w-[220px]">{tile(i, false)}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {[0, 1, 2, 3, 4].map(i => tile(i, false))}
          </div>
        )}

        {/* Rangee favoris sous la bande */}
        {favRow()}
      </div>

      {/* Drawer pro (le ControlPanel complet, range tel quel) */}
      <aside className={`flex-none border-l border-bz-grid bg-bz-graphite transition-all duration-200 overflow-hidden ${proOpen ? 'w-[300px]' : 'w-0'}`}>
        {proOpen && (
        <div className="w-[300px] h-[calc(100vh-3.5rem)] overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-ui text-bz-system tracking-widest uppercase">Réglages de l’image affichée</span>
            <button onClick={() => setProOpen(false)} className="text-bz-system hover:text-bz-paper"><X className="w-3.5 h-3.5" /></button>
          </div>
          {pcfg && (
            <ControlPanel
              algorithm={pcfg.algorithm}
              onAlgorithmChange={(a) => { upd({ algorithm: a }); setActivePreset(null); }}
              colorMode={pcfg.colorMode}
              onColorModeChange={(m) => { upd({ colorMode: m, paletteOverride: undefined }); setActivePreset(null); }}
              selectedPalette={pcfg.selectedPalette}
              onPaletteChange={(idx: number) => upd({ selectedPalette: idx, paletteOverride: undefined })}
              colorCount={pcfg.colorCount}
              onColorCountChange={(n: number) => upd({ colorCount: n })}
              adjustments={pcfg.adjustments}
              onAdjustmentsChange={(adj) => { upd({ adjustments: adj }); setActivePreset(null); }}
              resamplingMethod={pcfg.resamplingMethod}
              onResamplingMethodChange={(r) => upd({ resamplingMethod: r })}
              colorModeSettings={pcfg.colorModeSettings}
              onColorModeSettingsChange={(s) => { upd({ colorModeSettings: s }); setActivePreset(null); }}
              paletteModifiers={pcfg.paletteModifiers}
              onPaletteModifiersChange={(pm) => upd({ paletteModifiers: pm })}
              postProcessing={pcfg.postProcessing}
              onPostProcessingChange={(pp) => { upd({ postProcessing: pp }); setActivePreset(null); }}
              isAutoTuned={false}
              onReAnalyze={() => { if (analysis) upd({ adjustments: computeSmartDefaults(analysis).adjustments }); }}
              creativePresets={creativePresets}
              lookPresets={LOOK_PRESETS}
              activePreset={activePreset}
              onPresetApply={(p) => { setPcfg(presetToConfig(p)); setActivePreset(p.id); }}
              onResetAll={() => { const c = heroFav || cast[focus]; if (c) { setPcfg(c); setActivePreset(c.meta.id); } }}
            />
          )}
        </div>
        )}
      </aside>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)} className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center cursor-zoom-out">
          <canvas ref={lbCanvas} className="max-w-[94vw] max-h-[92vh]" style={{ imageRendering: 'pixelated' }} />
        </div>
      )}

      {/* Pop-up de partage · persistant, fermé par la croix */}
      {share && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[95] w-[min(92vw,520px)] rounded-lg border border-bz-grid bg-bz-graphite p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono-ui text-bz-paper tracking-widest uppercase">Partager cette image</span>
            <button onClick={() => setShare(null)} className="text-bz-system hover:text-bz-paper" aria-label="Fermer"><X className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-[11px] text-bz-system mb-3">Ce lien rouvre l’image avec ces réglages.</p>
          <div className="flex gap-2">
            <input ref={shareInputRef} readOnly autoFocus value={share} onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-bz-deep border border-bz-grid rounded px-2 py-2 text-[11px] text-bz-interface font-mono-ui truncate" />
            <button
              onClick={copyShare}
              className="px-3 py-2 bg-bz-cyan text-bz-graphite rounded text-[11px] font-mono-ui uppercase font-semibold tracking-wider hover:brightness-110 whitespace-nowrap">
              Copier le lien
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[95] px-4 py-2 rounded-md bg-bz-deep border border-bz-grid text-[11px] font-mono-ui text-bz-paper tracking-wide shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
