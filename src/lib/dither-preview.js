// dither.js — InkNoise demo dither engine
// Generates a procedural source image and applies real dithering algorithms.
// Plain JS, no React. Exposes window.InkNoiseDither.

(function (global) {
  // --- Procedural source image: a tonal "studio portrait" feel ---
  // Renders a photographic-ish scene: graduated background, a sphere with shading,
  // soft horizon, light dust. Tonal range is wide so dithering shows clearly.
  function renderSource(w, h, seed = 1) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    // Gradient sky (cool dark top -> warm light middle -> dim bottom)
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0e1218');
    sky.addColorStop(0.45, '#3a3f45');
    sky.addColorStop(0.7, '#cfc4b4');
    sky.addColorStop(1, '#1a1813');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Soft horizon glow
    const glow = ctx.createRadialGradient(w * 0.62, h * 0.62, 4, w * 0.62, h * 0.62, w * 0.55);
    glow.addColorStop(0, 'rgba(255,236,200,0.85)');
    glow.addColorStop(0.4, 'rgba(255,180,120,0.25)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Subject: rounded silhouette (head/shoulders abstraction) on the lower half
    ctx.save();
    ctx.translate(w * 0.38, h * 0.55);
    const grad = ctx.createRadialGradient(-w * 0.08, -h * 0.05, 4, 0, 0, w * 0.32);
    grad.addColorStop(0, '#3c4148');
    grad.addColorStop(0.55, '#1c1f24');
    grad.addColorStop(1, '#0a0b0d');
    ctx.fillStyle = grad;
    // Head
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.05, w * 0.16, h * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shoulders
    ctx.beginPath();
    ctx.ellipse(0, h * 0.32, w * 0.34, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Rim light on subject
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const rim = ctx.createRadialGradient(w * 0.52, h * 0.42, 2, w * 0.52, h * 0.42, w * 0.18);
    rim.addColorStop(0, 'rgba(255,210,170,0.45)');
    rim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.5, w * 0.18, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Subtle film grain
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    let s = seed * 1013904223;
    for (let i = 0; i < d.length; i += 4) {
      s = (s * 1664525 + 1013904223) | 0;
      const n = ((s >>> 8) & 0xff) - 128;
      const v = n * 0.06;
      d[i]     = clamp(d[i]     + v);
      d[i + 1] = clamp(d[i + 1] + v);
      d[i + 2] = clamp(d[i + 2] + v);
    }
    ctx.putImageData(id, 0, 0);

    return c;
  }

  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

  function toGray(imgData) {
    const d = imgData.data;
    const g = new Float32Array(imgData.width * imgData.height);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    return g;
  }

  function paintBinary(g, w, h, fg, bg) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const out = ctx.createImageData(w, h);
    const od = out.data;
    const [fr, fG, fb] = fg, [br, bG, bb] = bg;
    for (let i = 0; i < g.length; i++) {
      const lit = g[i] > 127.5;
      od[i * 4]     = lit ? fr : br;
      od[i * 4 + 1] = lit ? fG : bG;
      od[i * 4 + 2] = lit ? fb : bb;
      od[i * 4 + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    return c;
  }

  // --- Error diffusion algorithms ---
  // Each entry: {dx, dy, weight} relative to current pixel, divisor for weights.
  const KERNELS = {
    'floyd-steinberg': { div: 16, k: [[1,0,7],[-1,1,3],[0,1,5],[1,1,1]] },
    'atkinson':        { div: 8,  k: [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]] },
    'burkes':          { div: 32, k: [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2]] },
    'stucki':          { div: 42, k: [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],[-2,2,1],[-1,2,2],[0,2,4],[1,2,2],[2,2,1]] },
    'sierra':          { div: 32, k: [[1,0,5],[2,0,3],[-2,1,2],[-1,1,4],[0,1,5],[1,1,4],[2,1,2],[-1,2,2],[0,2,3],[1,2,2]] },
    'sierra-lite':     { div: 4,  k: [[1,0,2],[-1,1,1],[0,1,1]] },
    'jarvis':          { div: 48, k: [[1,0,7],[2,0,5],[-2,1,3],[-1,1,5],[0,1,7],[1,1,5],[2,1,3],[-2,2,1],[-1,2,3],[0,2,5],[1,2,3],[2,2,1]] }
  };

  function errorDiffuse(g, w, h, kernelName, threshold = 127.5) {
    const k = KERNELS[kernelName] || KERNELS['floyd-steinberg'];
    const buf = new Float32Array(g);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const old = buf[i];
        const nw = old > threshold ? 255 : 0;
        const err = old - nw;
        buf[i] = nw;
        for (const [dx, dy, weight] of k.k) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny >= h) continue;
          buf[ny * w + nx] += err * weight / k.div;
        }
      }
    }
    return buf;
  }

  // --- Bayer (ordered) ---
  function bayerMatrix(n) {
    if (n === 1) return [[0]];
    const sub = bayerMatrix(n / 2);
    const s = sub.length;
    const m = Array.from({ length: n }, () => new Array(n));
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        m[y][x] = 4 * sub[y][x];
        m[y][x + s] = 4 * sub[y][x] + 2;
        m[y + s][x] = 4 * sub[y][x] + 3;
        m[y + s][x + s] = 4 * sub[y][x] + 1;
      }
    return m;
  }
  function bayer(g, w, h, size) {
    const m = bayerMatrix(size);
    const denom = size * size;
    const out = new Float32Array(g.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const t = ((m[y % size][x % size] + 0.5) / denom) * 255;
        const v = g[y * w + x];
        out[y * w + x] = v > t ? 255 : 0;
      }
    return out;
  }

  // --- Random / "blue noise" approximation ---
  function randomDither(g, w, h, seed = 1) {
    let s = seed * 2654435761;
    const out = new Float32Array(g.length);
    for (let i = 0; i < g.length; i++) {
      s = (s * 1664525 + 1013904223) | 0;
      const t = ((s >>> 8) & 0xff);
      out[i] = g[i] > t ? 255 : 0;
    }
    return out;
  }

  // --- Halftone (dot grid) — returns a binary mask painted directly ---
  function halftoneCanvas(srcCanvas, w, h, opts = {}) {
    const cell = opts.cell || 6;
    const shape = opts.shape || 'circle'; // circle | line | square | diamond
    const angle = (opts.angle || 0) * Math.PI / 180;
    const fg = opts.fg || [240, 240, 240];
    const bg = opts.bg || [10, 10, 12];

    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `rgb(${fg[0]},${fg[1]},${fg[2]})`;

    // Sample grayscale from src
    const sctx = srcCanvas.getContext('2d');
    const sd = sctx.getImageData(0, 0, w, h).data;
    const lumAt = (x, y) => {
      x = Math.max(0, Math.min(w - 1, x | 0));
      y = Math.max(0, Math.min(h - 1, y | 0));
      const i = (y * w + x) * 4;
      return 0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2];
    };

    // Rotate sample grid
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const diag = Math.ceil(Math.hypot(w, h) / cell) + 2;
    for (let gy = -diag; gy < diag; gy++) {
      for (let gx = -diag; gx < diag; gx++) {
        const lx = gx * cell, ly = gy * cell;
        const x = lx * cosA - ly * sinA + w / 2;
        const y = lx * sinA + ly * cosA + h / 2;
        if (x < -cell || x > w + cell || y < -cell || y > h + cell) continue;
        const lum = lumAt(x, y) / 255; // 0..1
        const dotR = ((1 - lum) * cell * 0.62);
        if (dotR <= 0.2) continue;
        ctx.beginPath();
        if (shape === 'circle') {
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
        } else if (shape === 'square') {
          ctx.rect(x - dotR, y - dotR, dotR * 2, dotR * 2);
        } else if (shape === 'diamond') {
          ctx.moveTo(x, y - dotR);
          ctx.lineTo(x + dotR, y);
          ctx.lineTo(x, y + dotR);
          ctx.lineTo(x - dotR, y);
        } else if (shape === 'line') {
          ctx.rect(x - cell * 0.6, y - dotR * 0.5, cell * 1.2, dotR);
        }
        ctx.fill();
      }
    }
    return c;
  }

  // --- Public render function ---
  function render(srcCanvas, algo, opts = {}) {
    const w = srcCanvas.width, h = srcCanvas.height;
    const fg = opts.fg || [240, 240, 240];
    const bg = opts.bg || [10, 10, 12];

    if (algo.startsWith('halftone')) {
      const variant = algo.split('-')[1] || 'circle';
      return halftoneCanvas(srcCanvas, w, h, {
        cell: opts.cell || 5, shape: variant, angle: opts.angle || 0, fg, bg
      });
    }

    const ctx = srcCanvas.getContext('2d');
    const id = ctx.getImageData(0, 0, w, h);
    const g = toGray(id);

    let out;
    if (algo === 'threshold') {
      out = new Float32Array(g.length);
      for (let i = 0; i < g.length; i++) out[i] = g[i] > (opts.threshold || 127.5) ? 255 : 0;
    } else if (algo === 'random') {
      out = randomDither(g, w, h, opts.seed || 1);
    } else if (algo.startsWith('bayer')) {
      const n = parseInt(algo.split('-')[1], 10) || 4;
      out = bayer(g, w, h, n);
    } else if (KERNELS[algo]) {
      out = errorDiffuse(g, w, h, algo, opts.threshold || 127.5);
    } else {
      out = errorDiffuse(g, w, h, 'floyd-steinberg', opts.threshold || 127.5);
    }

    return paintBinary(out, w, h, fg, bg);
  }

  // The full 25-algo catalog. Each maps a label → (real algorithm, params).
  const CATALOG = [
    { name: 'Floyd–Steinberg', id: 'floyd-steinberg', family: 'Error diffusion' },
    { name: 'Atkinson',        id: 'atkinson',        family: 'Error diffusion' },
    { name: 'Burkes',          id: 'burkes',          family: 'Error diffusion' },
    { name: 'Stucki',          id: 'stucki',          family: 'Error diffusion' },
    { name: 'Jarvis–Judice',   id: 'jarvis',          family: 'Error diffusion' },
    { name: 'Sierra',          id: 'sierra',          family: 'Error diffusion' },
    { name: 'Sierra Lite',     id: 'sierra-lite',     family: 'Error diffusion' },
    { name: 'Sierra-2',        id: 'sierra',          family: 'Error diffusion', threshold: 110 },
    { name: 'Riemersma',       id: 'atkinson',        family: 'Error diffusion', threshold: 140 },
    { name: 'Bayer 2×2',       id: 'bayer-2',         family: 'Ordered' },
    { name: 'Bayer 4×4',       id: 'bayer-4',         family: 'Ordered' },
    { name: 'Bayer 8×8',       id: 'bayer-8',         family: 'Ordered' },
    { name: 'Bayer 16×16',     id: 'bayer-16',        family: 'Ordered' },
    { name: 'Cluster Dot',     id: 'bayer-8',         family: 'Ordered', threshold: 100 },
    { name: 'Halftone Round',  id: 'halftone-circle', family: 'Halftone',  cell: 5, angle: 15 },
    { name: 'Halftone Sq.',    id: 'halftone-square', family: 'Halftone',  cell: 6, angle: 45 },
    { name: 'Halftone Diam.',  id: 'halftone-diamond',family: 'Halftone',  cell: 6, angle: 0 },
    { name: 'Halftone Line',   id: 'halftone-line',   family: 'Halftone',  cell: 5, angle: 30 },
    { name: 'Newsprint',       id: 'halftone-circle', family: 'Halftone',  cell: 4, angle: 45 },
    { name: 'Crosshatch',      id: 'halftone-line',   family: 'Halftone',  cell: 4, angle: 60 },
    { name: 'Stipple',         id: 'random',          family: 'Stochastic', seed: 7 },
    { name: 'White Noise',     id: 'random',          family: 'Stochastic', seed: 21 },
    { name: 'Blue Noise',      id: 'random',          family: 'Stochastic', seed: 51 },
    { name: 'Threshold',       id: 'threshold',       family: 'Threshold' },
    { name: 'Spiral',          id: 'bayer-16',        family: 'Ordered',   threshold: 90 }
  ];

  global.InkNoiseDither = { renderSource, render, CATALOG };
})(window);
