/**
 * Threshold Split Animation — Multi-Mode
 * Luminance-based layer decomposition with multiple animation strategies
 * for divider GIFs (1200×80) and sidebar GIFs (150×800).
 *
 * MODES (selected via data-animation attribute on .threshold-strip):
 *
 *   "threshold" (default) — Luminance split with Lissajous drift.
 *       Dark and light layers separated at median luminance. Light layer
 *       drifts on a slow non-repeating path; both layers breathe in opacity.
 *       Drift profile adapts to aspect ratio: horizontal-dominant for
 *       landscape divider strips, vertical-dominant for portrait sidebar strips.
 *
 *   "pixelate" — Mosaic reveal.
 *       Full-resolution layer over a pixel-mosaic layer (source downscaled
 *       to 12% then nearest-neighbor upscaled). The clean layer breathes
 *       transparent, revealing the chunky mosaic underneath.
 *
 *   "breathe" — Erosion/dilation morphological breathing.
 *       Two processed versions: eroded (min filter, light areas shrink)
 *       and dilated (max filter, light areas expand). Cross-fades between
 *       them on a slow sinusoidal cycle — the gradient bands visibly
 *       expand and contract.
 *
 *   "grain" — Film grain reveal.
 *       Full-resolution layer over a heavily noise-textured version.
 *       The clean layer breathes transparent, periodically revealing
 *       the analog grain substrate underneath.
 *
 * SPEED TIERS (selected via data-speed attribute on .threshold-strip):
 *
 *   (default) — 0.018 rad/frame. For divider strips. Eye-catching within
 *       a few seconds of scrolling into view.
 *
 *   "slow" — 0.007 rad/frame (~2.5× slower). For sidebar strips. Ambient
 *       texture that breathes without competing for reading attention.
 *
 * RANDOM GIF SELECTION:
 *   data-src="random" picks from the default divider pool (assets/img/dividers/).
 *   Override with data attributes for other collections:
 *     data-gif-path   — directory path (default: "assets/img/dividers/")
 *     data-gif-prefix — filename prefix (default: "divider_")
 *     data-gif-count  — number of GIFs in pool (default: 10)
 *     data-gif-pad    — zero-pad width (default: 2)
 *
 * ARCHITECTURE:
 * - A single shared requestAnimationFrame loop drives all strips
 * - Each strip stores its own timeIncrement (speed tier) and driftProfile
 * - IntersectionObserver pauses strips scrolled out of view
 * - prefers-reduced-motion disables animation entirely (shows static GIF)
 * - All modes share the same strip registry, observer, and rAF loop
 *
 * @see threshold-split-spec.md for the original technique specification
 */


/* ===== CONFIGURATION ===== */

const THRESHOLD_CONFIG = {

  /* Speed tiers — time increment per animation frame (radians).
     At 60fps, multiply by 60 for rad/sec.

     JS CONCEPT: Named lookup object instead of if/else chain.
     The data-speed attribute maps directly to a key here.
     Using bracket notation (speeds[key]) is cleaner than
     a switch statement and trivial to extend with new tiers. */
  speeds: {
    default: 0.018,  // dividers: 0.018 × 60 = 1.08 rad/sec
    slow: 0.007      // sidebars: 0.007 × 60 = 0.42 rad/sec (~2.5× slower)
  },

  /* Contrast boost for threshold mode layer separation.
     Higher = more visible split, greens pop harder. */
  contrastBoost: 100,

  /* --- Threshold mode --- */
  darkAlpha: {
    base: 0.80,
    amplitude: 0.20,   // range: 0.60 – 1.00
    frequency: 0.37    // period: ~5.7s at 3× speed
  },
  lightAlpha: {
    base: 0.60,
    amplitude: 0.35,   // range: 0.25 – 0.95 — deep dip reveals split
    frequency: 0.53,   // period: ~4.0s at 3× speed
    phaseOffset: 1.8
  },

  /* Drift profiles for threshold mode Lissajous path.
     "landscape" is the divider profile (horizontal-dominant).
     "portrait" is the sidebar profile (vertical-dominant with diagonal character).

     Aspect ratio determines which profile — see computeDriftProfile().
     AR ≥ 1 → landscape (dividers at 1200/80 = 15);
     AR < 1 → portrait (sidebars at 150/800 = 0.1875). */
  drift: {
    landscape: {
      primaryX: 13,       // ±13px on 1200px = 1.1% — horizontal sweep
      primaryY: 3,        // ±3px on 80px = 3.75% — minimal vertical wobble
      secondaryX: 3,
      secondaryY: 1.5,
      freqSecondaryX: 2.3,
      freqPrimaryY: 0.7,
      freqSecondaryY: 1.9
    },
    portrait: {
      primaryX: 3,        // ±3px on 150px = 2% — subtle horizontal wobble
      primaryY: 15,       // ±15px on 800px = 1.9% — vertical sweep (long axis)
      secondaryX: 1.5,
      secondaryY: 5,
      freqSecondaryX: 1.9,
      freqPrimaryY: 1.0,  // steady Y oscillation along the tall axis
      freqSecondaryY: 2.3
    }
  },

  /* --- Pixelate mode --- */
  pixelate: {
    scalePct: 12,       // downscale to 12% (144×9 → ~8px blocks)
    cleanAlpha: {
      base: 0.60,
      amplitude: 0.40,  // range: 0.20 – 1.00 — deep reveal of mosaic
      frequency: 0.41   // period: ~5.2s at 3× speed
    }
  },

  /* --- Breathe mode (erosion/dilation) --- */
  breathe: {
    radius: 3,          // 7×7 kernel — visible expand/contract while preserving texture
    sourceAlpha: 0.55,  // base layer of original source always visible
    morphAlpha: 0.45,   // morph crossfade drawn on top of source
    frequency: 0.31,    // period: ~6.8s at 3× speed
    /* Secondary oscillation for non-repeating character */
    frequency2: 0.47,
    amplitude2: 0.20    // stronger secondary contribution
  },

  /* --- Grain mode --- */
  grain: {
    noiseIntensity: 40, // moderate grain — visible texture, not TV static
    cleanAlpha: {
      base: 0.65,
      amplitude: 0.35,  // range: 0.30 – 1.00 — deep reveal of grain
      frequency: 0.53   // period: ~4.0s at 3× speed
    }
  },

  /* Shared */
  observerThreshold: 0.1,
  dividerCount: 10
};


/* ===== LAYER CHOREOGRAPHY CONFIG =====
   Five-layer PNG compositing parameters — locked 2026-03-14.
   Tuned via layers-test.html browser harness across 4 sessions.

   Layers (bottom to top):
     E — static gradient substrate (always 100% alpha, no drift)
     A — diagonal mosaic (primary drifter, Lissajous path)
     B — random grain (chromatic temperature modulator, multiply blend)
     C — vertical stripes (gate-weave bounce, screen blend)
     D — dot grid (ambient float, gentle elliptical drift)

   JS CONCEPT: This is a separate config object from THRESHOLD_CONFIG
   because the layers mode uses a fundamentally different compositing
   approach — five pre-rendered PNGs with per-layer blend modes and
   drift, rather than one GIF processed into two luminance layers. */

const LAYER_CHOREOGRAPHY = {
  A: {
    alpha: { base: 0.33, amplitude: 0.12, frequency: 0.23, phase: 0.0 },
    drift: {
      primaryX: 4, primaryY: 5.5,
      secondaryX: 1.5, secondaryY: 2,
      freqSecondaryX: 2.3, freqPrimaryY: 0.7, freqSecondaryY: 1.9
    },
    blendMode: 'source-over'
  },
  B: {
    alpha: { base: 0.30, amplitude: 0.15, frequency: 0.31, phase: 1.047 },
    blendMode: 'multiply'
    /* B has no drift — alpha breathing only.
       Neutral gray grain modulates composite chromatic temperature:
       composite cools (greens recede) when B alpha rises. */
  },
  C: {
    alpha: { base: 0.21, amplitude: 0.10, frequency: 0.41, phase: 2.094 },
    drift: { amplitudeY: 4, freqY: 0.53 },
    blendMode: 'screen'
    /* Screen blend: stripes add light rather than alpha-blend.
       Especially effective on dark sites where source-over stripes
       would be swallowed by the dark substrate. */
  },
  D: {
    alpha: { base: 0.32, amplitude: 0.12, frequency: 0.19, phase: 3.14 },
    drift: { amplitudeX: 2, amplitudeY: 1.5, freqX: 0.83, freqY: 1.13 },
    blendMode: 'source-over'
  }
};


/* ===== STATE ===== */

const strips = new Map();
let ASSET_ROOT = '';
let animationId = null;


/* ===== SHARED UTILITIES ===== */

/**
 * Select drift profile based on image aspect ratio.
 *
 * Landscape images (dividers at 1200/80 = 15) get horizontal-dominant
 * drift — the light layer sweeps side to side with minimal vertical wobble.
 *
 * Portrait images (sidebar at 150/800 = 0.1875) get vertical-dominant
 * drift — the light layer sweeps up and down along the tall axis with
 * subtle horizontal wobble, creating a diagonal Lissajous path.
 *
 * @param {number} width - Image pixel width
 * @param {number} height - Image pixel height
 * @returns {Object} Drift parameter object
 */
function computeDriftProfile(width, height) {
  const ar = width / height;
  const cfg = THRESHOLD_CONFIG.drift;
  return ar >= 1 ? cfg.landscape : cfg.portrait;
}

/**
 * Resolve the time increment for a strip based on its data-speed attribute.
 *
 * JS CONCEPT: Bracket notation for object property lookup.
 * speeds['slow'] returns the slow tier value; speeds['default'] returns
 * the base value. If the attribute is missing or unrecognized, we fall
 * back to the default tier via the || operator.
 *
 * @param {HTMLElement} container - The .threshold-strip element
 * @returns {number} Time increment in radians per frame
 */
function resolveSpeed(container) {
  const speedKey = container.dataset.speed || 'default';
  return THRESHOLD_CONFIG.speeds[speedKey] || THRESHOLD_CONFIG.speeds.default;
}

/**
 * Build a random GIF path from a strip's data attributes.
 *
 * Supports two GIF pools via data attributes:
 *   Dividers (default): assets/img/dividers/divider_01.gif – divider_10.gif
 *   Sidebar:            assets/img/sidebar/abstract001.gif – abstract060.gif
 *
 * Override any default with data-gif-path, data-gif-prefix,
 * data-gif-count, data-gif-pad on the container element.
 *
 * @param {HTMLElement} container - The .threshold-strip element
 * @returns {string} Full path to a randomly selected GIF
 */
function randomGifPath(container) {
  const path   = container.dataset.gifPath   || 'assets/img/dividers/';
  const prefix = container.dataset.gifPrefix || 'divider_';
  const count  = parseInt(container.dataset.gifCount, 10) || THRESHOLD_CONFIG.dividerCount;
  const pad    = parseInt(container.dataset.gifPad, 10)   || 2;

  const num = Math.floor(Math.random() * count) + 1;
  const padded = String(num).padStart(pad, '0');
  return `${ASSET_ROOT}${path}${prefix}${padded}.gif`;
}

/**
 * Weighted luminance (ITU-R BT.601).
 */
function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Render an ImageData to an offscreen canvas.
 *
 * JS CONCEPT: Offscreen canvases (never in the DOM) serve as pixel buffers.
 * drawImage(canvas) is GPU-accelerated; putImageData() is not.
 */
function imageDataToCanvas(imageData, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Load an image and extract its pixel data.
 * Returns { img, sourceData, width, height }.
 *
 * JS CONCEPT: async/await wraps the callback-based Image.onload
 * into Promise-based flow.
 */
async function loadAndExtract(src) {
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load: ${src}`));
    image.src = src;
  });

  const width = img.naturalWidth;
  const height = img.naturalHeight;

  const extractCanvas = document.createElement('canvas');
  extractCanvas.width = width;
  extractCanvas.height = height;
  const extractCtx = extractCanvas.getContext('2d');
  extractCtx.drawImage(img, 0, 0);
  const sourceData = extractCtx.getImageData(0, 0, width, height);

  return { img, sourceData, width, height };
}


/**
 * Boost the green channel on a canvas to make green accents pop.
 *
 * The divider GIFs have subtle green glitch bars and dot-grid tinting
 * baked in. After canvas processing (pixelation, noise, etc.) these
 * greens can get averaged into gray. This pushes G relative to R and B
 * so the green texture survives.
 *
 * @param {HTMLCanvasElement} canvas - Canvas to modify in place
 * @param {number} width
 * @param {number} height
 * @param {number} factor - Green multiplier (1.0 = no change, 1.4 = 40% boost)
 */
function boostGreen(canvas, width, height, factor) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 1] = Math.min(255, data[i + 1] * factor);
  }
  ctx.putImageData(imageData, 0, 0);
}


/* ===== LAYERS MODE UTILITIES =====
   Loading and drift functions for the five-layer PNG compositing mode.
   These are separate from the GIF-based utilities above because layers
   mode works with pre-rendered PNG kits, not processed GIFs. */

/**
 * Constrain drift to ±6px — the overflow clip budget.
 *
 * The container clips 6 native pixels per side (via CSS percentage
 * positioning). Any drift beyond ±6 would reveal blank canvas edge.
 * Clamping events are rare (requires two harmonics to peak simultaneously)
 * and the discontinuity is imperceptible at these slow speeds.
 *
 * JS CONCEPT: Math.max/Math.min chained together form a "clamp"
 * function. Equivalent to CSS clamp() but in JS. Forces the value
 * into [-6, 6].
 *
 * @param {number} value - Raw drift in native pixels
 * @returns {number} Clamped to [-6, 6]
 */
function clampDrift(value) {
  return Math.max(-6, Math.min(6, value));
}

/**
 * Load a single PNG layer and return an offscreen canvas.
 *
 * Similar to loadAndExtract() used by GIF modes, but simpler — we don't
 * need to extract pixel data for processing. We just need the image on
 * an offscreen canvas for fast drawImage() blitting in the render loop.
 *
 * JS CONCEPT: Offscreen canvas pattern. Drawing canvas→canvas is
 * GPU-accelerated; drawing Image→canvas requires re-decode each frame
 * on some browsers. The offscreen canvas acts as a pre-decoded pixel
 * buffer.
 *
 * @param {string} src - URL to PNG file
 * @returns {Promise<HTMLCanvasElement>} Offscreen canvas with image drawn
 */
async function loadLayerImage(src) {
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load layer: ' + src));
    image.src = src;
  });

  const offscreen = document.createElement('canvas');
  offscreen.width = img.naturalWidth;
  offscreen.height = img.naturalHeight;
  offscreen.getContext('2d').drawImage(img, 0, 0);
  return offscreen;
}

/**
 * Load a complete five-layer kit from a directory path.
 *
 * Each kit directory contains five PNGs: layer_E.png through layer_D.png.
 * All five are loaded in parallel via Promise.all, then assembled into
 * a keyed object for the render function to reference by layer name.
 *
 * JS CONCEPT: Promise.all runs all five image loads concurrently
 * rather than sequentially. On a local server with 18KB PNGs, the
 * difference is negligible — but the pattern is correct for network
 * loads where parallelism matters. Object.fromEntries converts the
 * array of [key, value] pairs back into a { E, A, B, C, D } object.
 *
 * @param {string} kitPath - Full URL path to kit directory (trailing slash required)
 * @returns {Promise<Object>} { E, A, B, C, D } — offscreen canvases
 */
async function loadKit(kitPath) {
  const names = ['E', 'A', 'B', 'C', 'D'];
  const entries = await Promise.all(
    names.map(async (name) => {
      const canvas = await loadLayerImage(kitPath + 'layer_' + name + '.png');
      return [name, canvas];
    })
  );
  return Object.fromEntries(entries);
}


/* ===== THRESHOLD MODE PROCESSING ===== */

function computeMedianLuminance(imageData) {
  const data = imageData.data;
  const histogram = new Uint32Array(256);
  let pixelCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const lum = Math.round(luminance(data[i], data[i + 1], data[i + 2]));
    histogram[lum]++;
    pixelCount++;
  }

  const target = Math.floor(pixelCount / 2);
  let cumulative = 0;
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= target) return i;
  }
  return 128;
}

function splitLayers(sourceData, threshold, width, height) {
  const src = sourceData.data;
  const darkData = new ImageData(width, height);
  const lightData = new ImageData(width, height);
  const dark = darkData.data;
  const light = lightData.data;

  for (let i = 0; i < src.length; i += 4) {
    const lum = luminance(src[i], src[i + 1], src[i + 2]);
    if (lum < threshold) {
      dark[i] = src[i]; dark[i+1] = src[i+1]; dark[i+2] = src[i+2]; dark[i+3] = src[i+3];
      light[i+3] = 0;
    } else {
      light[i] = src[i]; light[i+1] = src[i+1]; light[i+2] = src[i+2]; light[i+3] = src[i+3];
      dark[i+3] = 0;
    }
  }
  return { dark: darkData, light: lightData };
}

function applyContrast(imageData, amount) {
  const data = imageData.data;
  const factor = (259 * (amount + 255)) / (255 * (259 - amount));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i]   = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
    data[i+1] = Math.max(0, Math.min(255, factor * (data[i+1] - 128) + 128));
    data[i+2] = Math.max(0, Math.min(255, factor * (data[i+2] - 128) + 128));
  }
}

async function processThreshold(container) {
  const { sourceData, width, height } = await loadAndExtract(container.dataset.src);
  const median = computeMedianLuminance(sourceData);
  const { dark, light } = splitLayers(sourceData, median, width, height);
  applyContrast(dark, THRESHOLD_CONFIG.contrastBoost);
  applyContrast(light, THRESHOLD_CONFIG.contrastBoost);

  const canvas = container.querySelector('canvas');
  canvas.width = width; canvas.height = height;

  /* CSS height:auto on canvas doesn't compute proportionally from
     intrinsic dimensions the way <img> does. Setting aspect-ratio
     explicitly tells the browser the correct ratio so width:100%
     produces the right height — 80px for 1200×80 dividers at full
     bleed, ~1322px for 150×800 sidebar strips at ~248px width. */
  canvas.style.aspectRatio = `${width} / ${height}`;

  return {
    mode: 'threshold',
    canvas, ctx: canvas.getContext('2d'),
    darkCanvas: imageDataToCanvas(dark, width, height),
    lightCanvas: imageDataToCanvas(light, width, height),
    width, height,
    t: Math.random() * 100,
    timeIncrement: resolveSpeed(container),
    driftProfile: computeDriftProfile(width, height),
    visible: false, ready: true
  };
}


/* ===== PIXELATE MODE PROCESSING ===== */

/**
 * Create the mosaic layer: downscale to scalePct% with nearest-neighbor,
 * then upscale back to full size. This re-pixelates the final GIF
 * (which already has pixel-trash baked in from generation), producing
 * a second level of mosaic abstraction.
 *
 * JS CONCEPT: Canvas drawImage handles the resampling. By setting
 * imageSmoothingEnabled = false, we get nearest-neighbor interpolation
 * which preserves the hard pixel edges.
 */
async function processPixelate(container) {
  const { sourceData, width, height } = await loadAndExtract(container.dataset.src);
  const cfg = THRESHOLD_CONFIG.pixelate;

  const factor = cfg.scalePct / 100;
  const smallW = Math.max(1, Math.round(width * factor));
  const smallH = Math.max(1, Math.round(height * factor));

  // Downscale
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = smallW; smallCanvas.height = smallH;
  const smallCtx = smallCanvas.getContext('2d');
  smallCtx.imageSmoothingEnabled = false;
  smallCtx.drawImage(
    imageDataToCanvas(sourceData, width, height),
    0, 0, smallW, smallH
  );

  // Upscale with nearest-neighbor
  const mosaicCanvas = document.createElement('canvas');
  mosaicCanvas.width = width; mosaicCanvas.height = height;
  const mosaicCtx = mosaicCanvas.getContext('2d');
  mosaicCtx.imageSmoothingEnabled = false;
  mosaicCtx.drawImage(smallCanvas, 0, 0, width, height);

  // Boost green channel on mosaic so the glitch bars pop through
  // the pixelation. Without this the quantized blocks average away
  // the narrow green bars into gray.
  boostGreen(mosaicCanvas, width, height, 1.4);

  // Clean layer (full resolution)
  const cleanCanvas = imageDataToCanvas(sourceData, width, height);

  const canvas = container.querySelector('canvas');
  canvas.width = width; canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;

  return {
    mode: 'pixelate',
    canvas, ctx: canvas.getContext('2d'),
    mosaicCanvas, cleanCanvas,
    width, height,
    t: Math.random() * 100,
    timeIncrement: resolveSpeed(container),
    visible: false, ready: true
  };
}


/* ===== BREATHE MODE PROCESSING ===== */

/**
 * Morphological min/max filters for erosion and dilation.
 *
 * Erosion (min filter): each pixel becomes the minimum in its
 * neighborhood. Dark areas expand, light areas shrink.
 *
 * Dilation (max filter): each pixel becomes the maximum in its
 * neighborhood. Light areas expand, dark areas shrink.
 *
 * JS CONCEPT: These are O(n × r²) where n = pixel count and r = radius.
 * For our 1200×80 images with radius 3, that's ~96000 × 49 = ~4.7M
 * comparisons per filter — runs in under 50ms, well within init budget.
 */
function morphFilter(sourceData, width, height, radius, mode) {
  const src = sourceData.data;
  const out = new ImageData(width, height);
  const dst = out.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let bestR, bestG, bestB;
      if (mode === 'erode') {
        bestR = 255; bestG = 255; bestB = 255;
      } else {
        bestR = 0; bestG = 0; bestB = 0;
      }

      // Scan neighborhood
      for (let ky = -radius; ky <= radius; ky++) {
        const ny = Math.max(0, Math.min(height - 1, y + ky));
        for (let kx = -radius; kx <= radius; kx++) {
          const nx = Math.max(0, Math.min(width - 1, x + kx));
          const idx = (ny * width + nx) * 4;

          if (mode === 'erode') {
            if (src[idx] < bestR) bestR = src[idx];
            if (src[idx+1] < bestG) bestG = src[idx+1];
            if (src[idx+2] < bestB) bestB = src[idx+2];
          } else {
            if (src[idx] > bestR) bestR = src[idx];
            if (src[idx+1] > bestG) bestG = src[idx+1];
            if (src[idx+2] > bestB) bestB = src[idx+2];
          }
        }
      }

      const i = (y * width + x) * 4;
      dst[i] = bestR; dst[i+1] = bestG; dst[i+2] = bestB; dst[i+3] = 255;
    }
  }
  return out;
}

async function processBreathe(container) {
  const { sourceData, width, height } = await loadAndExtract(container.dataset.src);
  const radius = THRESHOLD_CONFIG.breathe.radius;

  const erodedData = morphFilter(sourceData, width, height, radius, 'erode');
  const dilatedData = morphFilter(sourceData, width, height, radius, 'dilate');

  const erodedCanvas = imageDataToCanvas(erodedData, width, height);
  const dilatedCanvas = imageDataToCanvas(dilatedData, width, height);
  // Boost green on both morph layers — the morph filter averages
  // neighborhoods, which smears narrow green bars into gray.
  boostGreen(erodedCanvas, width, height, 1.4);
  boostGreen(dilatedCanvas, width, height, 1.4);

  // Keep the original source as a texture ground layer.
  // The morph crossfade draws on top at reduced alpha, so the
  // original's pixel grit and fine dither structure stay visible.
  const sourceCanvas = imageDataToCanvas(sourceData, width, height);

  const canvas = container.querySelector('canvas');
  canvas.width = width; canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;

  return {
    mode: 'breathe',
    canvas, ctx: canvas.getContext('2d'),
    sourceCanvas,
    erodedCanvas,
    dilatedCanvas,
    width, height,
    t: Math.random() * 100,
    timeIncrement: resolveSpeed(container),
    visible: false, ready: true
  };
}


/* ===== GRAIN MODE PROCESSING ===== */

/**
 * Create a heavily noise-textured version of the source.
 *
 * The noise is Gaussian, applied per-channel, with the source pixel
 * values as the mean. This preserves the overall color/luminance
 * structure while adding film-grain texture.
 */
async function processGrain(container) {
  const { sourceData, width, height } = await loadAndExtract(container.dataset.src);
  const intensity = THRESHOLD_CONFIG.grain.noiseIntensity;

  // Create grain version
  const grainData = new ImageData(width, height);
  const src = sourceData.data;
  const dst = grainData.data;

  for (let i = 0; i < src.length; i += 4) {
    // Box-Muller transform for Gaussian random numbers
    // JS CONCEPT: Math.random() gives uniform [0,1); Box-Muller
    // converts two uniform samples into a Gaussian sample.
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);

    dst[i]   = Math.max(0, Math.min(255, src[i]   + z * intensity));
    dst[i+1] = Math.max(0, Math.min(255, src[i+1] + z * intensity * 0.8));
    dst[i+2] = Math.max(0, Math.min(255, src[i+2] + z * intensity));
    dst[i+3] = 255;
  }

  const grainCanvas = imageDataToCanvas(grainData, width, height);
  // Boost green on the grain layer so green accents survive the noise
  boostGreen(grainCanvas, width, height, 1.5);

  const cleanCanvas = imageDataToCanvas(sourceData, width, height);

  const canvas = container.querySelector('canvas');
  canvas.width = width; canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;

  return {
    mode: 'grain',
    canvas, ctx: canvas.getContext('2d'),
    grainCanvas, cleanCanvas,
    width, height,
    t: Math.random() * 100,
    timeIncrement: resolveSpeed(container),
    visible: false, ready: true
  };
}


/* ===== RENDER FUNCTIONS (per frame, per mode) ===== */

function renderThreshold(state) {
  const { ctx, darkCanvas, lightCanvas, width, height, t, driftProfile } = state;
  const { darkAlpha, lightAlpha } = THRESHOLD_CONFIG;

  ctx.clearRect(0, 0, width, height);

  const dAlpha = darkAlpha.base + darkAlpha.amplitude * Math.sin(t * darkAlpha.frequency);
  ctx.globalAlpha = dAlpha;
  ctx.drawImage(darkCanvas, 0, 0);

  /* Lissajous drift — uses the strip's own drift profile.
     Wide strips (dividers) get horizontal-dominant motion.
     Narrow strips (sidebar) get diagonal-dominant motion. */
  const offsetX = Math.sin(t) * driftProfile.primaryX
    + Math.sin(t * driftProfile.freqSecondaryX) * driftProfile.secondaryX;
  const offsetY = Math.cos(t * driftProfile.freqPrimaryY) * driftProfile.primaryY
    + Math.cos(t * driftProfile.freqSecondaryY) * driftProfile.secondaryY;

  const lAlpha = lightAlpha.base
    + lightAlpha.amplitude * Math.sin(t * lightAlpha.frequency + lightAlpha.phaseOffset);
  ctx.globalAlpha = lAlpha;
  ctx.drawImage(lightCanvas, offsetX, offsetY);

  ctx.globalAlpha = 1;
}

function renderPixelate(state) {
  const { ctx, mosaicCanvas, cleanCanvas, width, height, t } = state;
  const cfg = THRESHOLD_CONFIG.pixelate.cleanAlpha;

  ctx.clearRect(0, 0, width, height);

  // Bottom: mosaic at full opacity
  ctx.globalAlpha = 1;
  ctx.drawImage(mosaicCanvas, 0, 0);

  // Top: clean layer breathing transparent to reveal mosaic
  const alpha = cfg.base + cfg.amplitude * Math.sin(t * cfg.frequency);
  ctx.globalAlpha = alpha;
  ctx.drawImage(cleanCanvas, 0, 0);

  ctx.globalAlpha = 1;
}

function renderBreathe(state) {
  const { ctx, sourceCanvas, erodedCanvas, dilatedCanvas, width, height, t } = state;
  const cfg = THRESHOLD_CONFIG.breathe;

  ctx.clearRect(0, 0, width, height);

  // Layer 1: Original source at base alpha — provides texture ground.
  // The pixel grit, dither patterns, and fine gradient structure stay
  // visible throughout the animation cycle.
  ctx.globalAlpha = cfg.sourceAlpha;
  ctx.drawImage(sourceCanvas, 0, 0);

  // Layer 2: Morph crossfade on top at reduced alpha.
  // mix oscillates between 0 (eroded) and 1 (dilated).
  // Primary + secondary oscillation for non-repeating character.
  let mix = 0.5 + 0.5 * Math.sin(t * cfg.frequency)
    + cfg.amplitude2 * Math.sin(t * cfg.frequency2);
  mix = Math.max(0, Math.min(1, mix));

  // Draw eroded at (1 - mix) × morphAlpha, dilated at mix × morphAlpha
  ctx.globalAlpha = (1 - mix) * cfg.morphAlpha;
  ctx.drawImage(erodedCanvas, 0, 0);
  ctx.globalAlpha = mix * cfg.morphAlpha;
  ctx.drawImage(dilatedCanvas, 0, 0);

  ctx.globalAlpha = 1;
}

function renderGrain(state) {
  const { ctx, grainCanvas, cleanCanvas, width, height, t } = state;
  const cfg = THRESHOLD_CONFIG.grain.cleanAlpha;

  ctx.clearRect(0, 0, width, height);

  // Bottom: grain at full opacity
  ctx.globalAlpha = 1;
  ctx.drawImage(grainCanvas, 0, 0);

  // Top: clean layer breathing transparent to reveal grain
  const alpha = cfg.base + cfg.amplitude * Math.sin(t * cfg.frequency);
  ctx.globalAlpha = alpha;
  ctx.drawImage(cleanCanvas, 0, 0);

  ctx.globalAlpha = 1;
}


/* ===== LAYERS MODE PROCESSING =====
   Five-layer PNG compositing. Unlike the GIF-based modes above, this mode
   loads pre-rendered PNG kits (five layers per kit) and composites them
   with per-layer blend modes and drift choreography.

   Each site variant (dark/mid/light) has 10 kits with 5 greener + 5 grayer
   color profiles. The kit selection is random per page load, matching the
   random GIF selection pattern used by divider strips. */

/**
 * Build the path to a randomly selected layer kit.
 *
 * Reads data attributes from the container:
 *   data-kit-path   — relative path to kit directory (default: "assets/img/layer-kits/")
 *   data-kit-count  — number of kits available (default: 10)
 *
 * Kit directories are named kit_001 through kit_NNN, zero-padded to 3 digits.
 *
 * JS CONCEPT: String.padStart(3, '0') zero-pads a number to a fixed width.
 * "1".padStart(3, '0') → "001", "10".padStart(3, '0') → "010".
 * This matches the Python generator's naming convention.
 *
 * @param {HTMLElement} container - The .threshold-strip element
 * @returns {string} Full URL path to kit directory (with trailing slash)
 */
function randomKitPath(container) {
  const path = container.dataset.kitPath || 'assets/img/layer-kits/';
  const count = parseInt(container.dataset.kitCount, 10) || 10;
  const num = Math.floor(Math.random() * count) + 1;
  const padded = String(num).padStart(3, '0');
  return `${ASSET_ROOT}${path}kit_${padded}/`;
}

/**
 * Process a layers-mode strip: pick a random kit, load five PNGs,
 * set up the compositing canvas.
 *
 * The canvas is sized to the native layer dimensions (250×450 from
 * the generator). CSS handles scaling to the container width via
 * percentage-based positioning (see virens-base.css).
 *
 * @param {HTMLElement} container - The .threshold-strip[data-animation="layers"] element
 * @returns {Promise<Object>} State object for the animation loop
 */
async function processLayers(container) {
  const kitPath = randomKitPath(container);
  const layers = await loadKit(kitPath);

  /* Use layer E's dimensions as the canvas native size.
     All five layers in a kit share the same dimensions (250×450). */
  const width = layers.E.width;
  const height = layers.E.height;

  const canvas = container.querySelector('canvas');
  canvas.width = width;
  canvas.height = height;
  /* Unlike GIF modes, the layers canvas does NOT set aspect-ratio inline.
     The container's CSS aspect-ratio (238/438) and the canvas's percentage
     positioning handle the sizing. See the [data-animation="layers"] rules
     in virens-base.css. */

  return {
    mode: 'layers',
    canvas,
    ctx: canvas.getContext('2d'),
    layers,
    width,
    height,
    kitPath,
    t: Math.random() * 100,  /* random start — no two loads match */
    timeIncrement: resolveSpeed(container),
    visible: false,
    ready: true
  };
}


/* ===== LAYERS MODE RENDER =====
   Composites all five layers each frame with current alpha, drift,
   and blend mode. Mirrors the render function from layers-test.html
   but without the monitoring display updates.

   Compositing order (bottom to top):
     E — static substrate at 100% alpha
     A — diagonal mosaic, Lissajous drift, source-over
     B — grain texture, no drift, multiply (darkens nonlinearly)
     C — vertical stripes, vertical shimmy, screen (adds light)
     D — dot grid, gentle elliptical float, source-over */

function renderLayers(state) {
  const { ctx, layers, width, height } = state;
  const cfg = LAYER_CHOREOGRAPHY;
  const t = state.t;

  ctx.clearRect(0, 0, width, height);

  /* E — static substrate, always full opacity, no drift */
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(layers.E, 0, 0);

  /* A — primary drifter.
     Two-harmonic Lissajous path on both axes — slowly wandering
     diagonal that never exactly repeats. The E×A interference
     (diagonal mosaic crossing horizontal bands) is the core visual. */
  ctx.globalCompositeOperation = cfg.A.blendMode;
  const aA = cfg.A.alpha.base
    + cfg.A.alpha.amplitude * Math.sin(t * cfg.A.alpha.frequency + cfg.A.alpha.phase);
  const dxA = clampDrift(
    Math.sin(t) * cfg.A.drift.primaryX
    + Math.sin(t * cfg.A.drift.freqSecondaryX) * cfg.A.drift.secondaryX
  );
  const dyA = clampDrift(
    Math.cos(t * cfg.A.drift.freqPrimaryY) * cfg.A.drift.primaryY
    + Math.cos(t * cfg.A.drift.freqSecondaryY) * cfg.A.drift.secondaryY
  );
  ctx.globalAlpha = aA;
  ctx.drawImage(layers.A, dxA, dyA);

  /* B — breathing only, no drift.
     Multiply blend: gray grain darkens the composite nonlinearly.
     Darker grain blocks darken further; lighter blocks have minimal
     effect. Creates speckled shadow texture. */
  ctx.globalCompositeOperation = cfg.B.blendMode;
  const aB = cfg.B.alpha.base
    + cfg.B.alpha.amplitude * Math.sin(t * cfg.B.alpha.frequency + cfg.B.alpha.phase);
  ctx.globalAlpha = aB;
  ctx.drawImage(layers.B, 0, 0);

  /* C — vertical shimmy, single harmonic.
     Screen blend: stripes add light against the substrate. */
  ctx.globalCompositeOperation = cfg.C.blendMode;
  const aC = cfg.C.alpha.base
    + cfg.C.alpha.amplitude * Math.sin(t * cfg.C.alpha.frequency + cfg.C.alpha.phase);
  const dyC = Math.sin(t * cfg.C.drift.freqY) * cfg.C.drift.amplitudeY;
  ctx.globalAlpha = aC;
  ctx.drawImage(layers.C, 0, dyC);

  /* D — gentle omnidirectional float.
     sin/cos pair at different frequencies → elliptical path. */
  ctx.globalCompositeOperation = cfg.D.blendMode;
  const aD = cfg.D.alpha.base
    + cfg.D.alpha.amplitude * Math.sin(t * cfg.D.alpha.frequency + cfg.D.alpha.phase);
  const dxD = Math.sin(t * cfg.D.drift.freqX) * cfg.D.drift.amplitudeX;
  const dyD = Math.cos(t * cfg.D.drift.freqY) * cfg.D.drift.amplitudeY;
  ctx.globalAlpha = aD;
  ctx.drawImage(layers.D, dxD, dyD);

  /* Reset compositing state for next frame / next strip */
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
}


/* ===== MODE DISPATCH ===== */

const MODE_PROCESSORS = {
  threshold: processThreshold,
  pixelate:  processPixelate,
  breathe:   processBreathe,
  grain:     processGrain,
  layers:    processLayers
};

const MODE_RENDERERS = {
  threshold: renderThreshold,
  pixelate:  renderPixelate,
  breathe:   renderBreathe,
  grain:     renderGrain,
  layers:    renderLayers
};


/* ===== ANIMATION LOOP ===== */

function animationLoop() {
  let anyVisible = false;

  strips.forEach((state) => {
    if (!state.ready || !state.visible) return;
    anyVisible = true;

    /* Each strip advances at its own speed tier.
       Dividers use the default (0.018); sidebars use slow (0.007).
       This keeps sidebar animation ambient while dividers catch the eye. */
    state.t += state.timeIncrement;

    const render = MODE_RENDERERS[state.mode];
    if (render) render(state);
  });

  if (anyVisible) {
    animationId = requestAnimationFrame(animationLoop);
  } else {
    animationId = null;
  }
}

function ensureAnimationRunning() {
  if (animationId === null) {
    animationId = requestAnimationFrame(animationLoop);
  }
}


/* ===== INTERSECTION OBSERVER ===== */

function createObserver() {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const state = strips.get(entry.target);
        if (!state) return;
        state.visible = entry.isIntersecting;
        if (state.visible) ensureAnimationRunning();
      });
    },
    { threshold: THRESHOLD_CONFIG.observerThreshold }
  );
}


/* ===== REDUCED MOTION FALLBACK ===== */

function showStaticFallback(container) {
  const src = container.dataset.src;
  if (!src) return;
  const canvas = container.querySelector('canvas');
  if (canvas) canvas.remove();
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Decorative divider';
  img.classList.add('threshold-strip-static');
  container.appendChild(img);
}


/* ===== DIVIDER SELECTION ===== */

/* randomGifPath() in the utilities section handles all GIF pool selection.
   It reads data-gif-path, data-gif-prefix, data-gif-count, data-gif-pad
   from the container, falling back to the divider pool defaults. */


/**
 * Pre-resolve random GIF paths so all strips sharing the same pool
 * get the same randomly selected GIF.
 *
 * Problem: without this, the header divider and footer divider each
 * independently call randomGifPath() and almost always get different
 * GIFs. Visually they should match — they’re the same decorative motif
 * framing the page content.
 *
 * Solution: before any processing, collect all GIF-mode strips that
 * need a random path, group them by their pool parameters (path,
 * prefix, count, pad), pick ONE random GIF per pool, and assign it
 * to every strip in that pool.
 *
 * JS CONCEPT: Map used as a grouping structure. The pool key is a
 * string built from the data attributes that define the pool. All
 * containers with the same key share the same random selection.
 * This runs before both the reduced-motion branch and the normal
 * processing branch, so the assignment is consistent either way.
 *
 * @param {NodeList|Array} containers - All .threshold-strip elements
 */
function resolveSharedRandomPaths(containers) {
  /* Group containers by GIF pool.
     Layers-mode strips don’t use GIFs — skip them.
     Strips with an explicit non-random data-src already have
     their path — skip them too. */
  const pools = new Map();

  containers.forEach((container) => {
    const mode = container.dataset.animation || 'threshold';
    if (mode === 'layers') return;

    const src = container.dataset.src;
    if (src && src !== 'random') return;

    /* Build a key from the pool-defining attributes.
       Two containers with the same key draw from the same
       GIF collection and should get the same random pick. */
    const path   = container.dataset.gifPath   || 'assets/img/dividers/';
    const prefix = container.dataset.gifPrefix || 'divider_';
    const count  = container.dataset.gifCount  || String(THRESHOLD_CONFIG.dividerCount);
    const pad    = container.dataset.gifPad    || '2';
    const key = `${path}|${prefix}|${count}|${pad}`;

    if (!pools.has(key)) {
      pools.set(key, { containers: [], path, prefix, count: parseInt(count, 10), pad: parseInt(pad, 10) });
    }
    pools.get(key).containers.push(container);
  });

  /* Pick one random GIF per pool and assign to all containers. */
  pools.forEach((pool) => {
    const num = Math.floor(Math.random() * pool.count) + 1;
    const padded = String(num).padStart(pool.pad, '0');
    const gifPath = `${ASSET_ROOT}${pool.path}${pool.prefix}${padded}.gif`;

    pool.containers.forEach((container) => {
      container.dataset.src = gifPath;
    });
  });
}


/* ===== INITIALIZATION ===== */

async function initThresholdSplits() {
  ASSET_ROOT = document.body.dataset.assetRoot ?? '/';

  const testCanvas = document.createElement('canvas');
  if (!testCanvas.getContext || !testCanvas.getContext('2d')) return;

  const containers = document.querySelectorAll('.threshold-strip');
  if (containers.length === 0) return;

  /* Pre-resolve random GIF paths BEFORE any processing.
     This ensures all strips sharing the same GIF pool (e.g. the header
     and footer dividers) get the same randomly selected GIF. Must run
     before both the reduced-motion branch and the normal branch. */
  resolveSharedRandomPaths(containers);

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    containers.forEach((container) => {
      const mode = container.dataset.animation || 'threshold';

      if (mode === 'layers') {
        /* Layers mode reduced-motion fallback: load one kit and render
           a single static frame (E substrate + all layers at base alpha).
           This gives a static composite rather than a blank rectangle. */
        const kitPath = randomKitPath(container);
        loadKit(kitPath).then((layers) => {
          const canvas = container.querySelector('canvas');
          canvas.width = layers.E.width;
          canvas.height = layers.E.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(layers.E, 0, 0);
          /* Draw remaining layers at base alpha for a representative still */
          const cfg = LAYER_CHOREOGRAPHY;
          ctx.globalCompositeOperation = cfg.A.blendMode;
          ctx.globalAlpha = cfg.A.alpha.base;
          ctx.drawImage(layers.A, 0, 0);
          ctx.globalCompositeOperation = cfg.B.blendMode;
          ctx.globalAlpha = cfg.B.alpha.base;
          ctx.drawImage(layers.B, 0, 0);
          ctx.globalCompositeOperation = cfg.C.blendMode;
          ctx.globalAlpha = cfg.C.alpha.base;
          ctx.drawImage(layers.C, 0, 0);
          ctx.globalCompositeOperation = cfg.D.blendMode;
          ctx.globalAlpha = cfg.D.alpha.base;
          ctx.drawImage(layers.D, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
        }).catch((err) => {
          console.error('layers reduced-motion fallback:', err);
        });
      } else {
        /* GIF path already resolved by resolveSharedRandomPaths() above */
        showStaticFallback(container);
      }
    });
    return;
  }

  const observer = createObserver();

  const processingPromises = Array.from(containers).map(async (container) => {
    // Read animation mode from data attribute; default to 'threshold'
    const mode = container.dataset.animation || 'threshold';
    /* GIF paths already resolved by resolveSharedRandomPaths() above.
       Layers mode strips were skipped by that function (they load
       PNG kits, not GIFs). */
    const processor = MODE_PROCESSORS[mode] || MODE_PROCESSORS.threshold;

    try {
      const state = await processor(container);
      if (state) {
        strips.set(container, state);
        observer.observe(container);
      }
    } catch (err) {
      console.error(`threshold-split [${mode}]:`, container, err);
      showStaticFallback(container);
    }
  });

  await Promise.all(processingPromises);
}


/* ===== DOM READY ===== */

document.addEventListener('DOMContentLoaded', initThresholdSplits);
