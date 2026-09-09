// Image pipeline for aksendo.com
// Reads real source photography from design/source/, emits pre-sized AVIF + WebP
// + JPEG into public/img/gen/. Also generates: monochrome placeholder release
// covers, a 1200x630 OG image, an animated-grain tile, and a blue-noise tile for
// the developing-photograph shader. Idempotent; run by `prebuild`.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'design', 'source');
const OUT = join(ROOT, 'public', 'img', 'gen');

const FORMATS = [
  ['avif', { quality: 55, effort: 4 }],
  ['webp', { quality: 72 }],
  ['jpeg', { quality: 78, mozjpeg: true, progressive: true }]
];

await mkdir(OUT, { recursive: true });

// grayscale everything: the site is strictly monochrome.
async function responsive(srcFile, name, widths, { fit = 'cover', height = null } = {}) {
  const input = join(SRC, srcFile);
  if (!existsSync(input)) { console.warn('  ! missing source', srcFile, '- skipped'); return; }
  for (const w of widths) {
    const base = sharp(input).grayscale().resize({
      width: w, height: height ? Math.round(height * (w / widths[widths.length - 1])) : null,
      fit, position: 'attention', withoutEnlargement: true
    });
    for (const [fmt, opts] of FORMATS) {
      const buf = await base.clone().toFormat(fmt, opts).toBuffer();
      await writeFile(join(OUT, `${name}-${w}.${fmt}`), buf);
    }
  }
  console.log('  ✓', name, widths.join('/'));
}

async function fromSvg(svg, name, size, formats = FORMATS) {
  const base = sharp(Buffer.from(svg)).resize(size, size);
  for (const [fmt, opts] of formats) {
    const buf = await base.clone().toFormat(fmt, opts).toBuffer();
    await writeFile(join(OUT, `${name}.${fmt}`), buf);
  }
}

console.log('› photography');
// hero desktop — live booth (IMG_4044), landscape-friendly full-bleed cover
await responsive('IMG_4044.jpg', 'hero', [640, 960, 1600, 2560], { fit: 'cover' });
// hero mobile — aksendo.jpg (portrait) fills the phone without letterboxing
await responsive('aksendo.jpg', 'hero-m', [480, 750, 1080, 1440], { fit: 'cover' });
// bio / press live shots
await responsive('portrait-dj-river_660x1275.jpg', 'portrait', [480, 660], { fit: 'cover' });
await responsive('live-decksandstories_1241x931.jpg', 'live', [640, 1000, 1241], { fit: 'cover' });
// mix thumbnails, 16:9
console.log('› mix thumbnails (placeholder, reuse real frames)');
for (const [src, nm] of [
  ['portrait-dj-river_660x1275.jpg', 'mix-1'],
  ['live-decksandstories_1241x931.jpg', 'mix-2'],
  ['IMG_4044.jpg', 'mix-3']
]) await responsive(src, nm, [480, 800], { fit: 'cover', height: 9 / 16 * 800 });

console.log('› show artwork (design/source/shows/)');
{
  const { readdir } = await import('node:fs/promises');
  const SHOW_SRC = join(SRC, 'shows');
  await mkdir(SHOW_SRC, { recursive: true });
  let files = [];
  try { files = await readdir(SHOW_SRC); } catch { files = []; }
  const arts = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith('.'));
  if (!arts.length) console.log('  · none yet — drop files named to venue slug (see NOTES.md)');
  for (const file of arts) {
    const stem = file.replace(/\.[^.]+$/, '');
    const input = join(SHOW_SRC, file);
    for (const w of [64, 128, 256]) {
      const base = sharp(input).grayscale().resize(w, w, { fit: 'cover', position: 'attention' });
      for (const [fmt, opts] of FORMATS) {
        const buf = await base.clone().toFormat(fmt, opts).toBuffer();
        await writeFile(join(OUT, `show-${stem}-${w}.${fmt}`), buf);
      }
    }
    console.log('  ✓ show-' + stem);
  }
}

console.log('› release covers (design/source/song_artwork/) — equal square crops');
{
  const ART = join(SRC, 'song_artwork');
  const map = [
    ['pico_de_amor.jpg', 'cover-pico-de-amor'],
    ['berlin_to_ade.jpg', 'cover-berlin-to-ade'],
    ['temporary_miracle.jpg', 'cover-temporary-miracle']
  ];
  for (const [file, name] of map) {
    const input = join(ART, file);
    if (!existsSync(input)) {
      console.warn('  ! missing', file, '— skipped');
      continue;
    }
    // Force identical square outputs for every release (upscale OK so 800px sources match 3000px ones)
    for (const w of [400, 800, 1200]) {
      const base = sharp(input).grayscale().resize(w, w, { fit: 'cover', position: 'attention' });
      for (const [fmt, opts] of FORMATS) {
        const buf = await base.clone().toFormat(fmt, opts).toBuffer();
        await writeFile(join(OUT, `${name}-${w}.${fmt}`), buf);
      }
    }
    console.log('  ✓', name);
  }
}

console.log('› OG image 1200x630');
{
  const input = join(SRC, 'IMG_4044.jpg');
  const hero = await sharp(input).grayscale().resize(1200, 630, { fit: 'cover', position: 'attention' })
    .modulate({ brightness: 0.62 }).toBuffer();
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
       <rect width="1200" height="630" fill="#000" opacity="0.28"/>
       <text x="64" y="360" font-family="'Arial Black','Archivo',Arial,sans-serif" font-weight="900"
             font-size="150" letter-spacing="-6" fill="#fff">AKSENDO</text>
       <text x="70" y="420" font-family="'Courier New',monospace" font-size="26" letter-spacing="6"
             fill="#fff">DJ / PRODUCER — KAUNAS, LITHUANIA</text>
     </svg>`);
  const og = await sharp(hero).composite([{ input: overlay }]).jpeg({ quality: 82 }).toBuffer();
  await writeFile(join(OUT, 'og.jpg'), og);
  console.log('  ✓ og.jpg');
}

console.log('› grain tile 128x128 (film grain = white noise)');
{
  const n = 128, buf = Buffer.alloc(n * n * 4);
  for (let i = 0; i < n * n; i++) { const v = Math.random() * 255 | 0; buf[i*4]=v; buf[i*4+1]=v; buf[i*4+2]=v; buf[i*4+3]=255; }
  await sharp(buf, { raw: { width: n, height: n, channels: 4 } }).webp({ quality: 40, alphaQuality: 40 })
    .toFile(join(OUT, 'grain.webp'));
  console.log('  ✓ grain.webp');
}

console.log('› blue-noise tile 64x64 (void-and-cluster)');
{
  const N = 64, M = N * N;
  const bin = new Uint8Array(M);
  // seed ~10% ones
  const seeds = Math.round(M * 0.1);
  for (let k = 0; k < seeds;) { const p = Math.random() * M | 0; if (!bin[p]) { bin[p] = 1; k++; } }
  const SIGMA = 1.9, R = 6;
  const energyAt = (idx, arr) => {
    const x = idx % N, y = (idx / N) | 0; let e = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (!dx && !dy) continue;
      const nx = (x + dx + N) % N, ny = (y + dy + N) % N;
      if (arr[ny * N + nx]) e += Math.exp(-(dx*dx + dy*dy) / (2 * SIGMA * SIGMA));
    }
    return e;
  };
  // relax seed pattern
  for (let it = 0; it < 4; it++) {
    let tight = -1, te = -Infinity, loose = -1, le = Infinity;
    for (let i = 0; i < M; i++) {
      const e = energyAt(i, bin);
      if (bin[i] && e > te) { te = e; tight = i; }
      if (!bin[i] && e < le) { le = e; loose = i; }
    }
    if (tight < 0 || loose < 0) break;
    bin[tight] = 0; bin[loose] = 1;
  }
  const rank = new Int32Array(M).fill(-1);
  const work = bin.slice();
  let ones = work.reduce((a, b) => a + b, 0);
  // phase 1: remove tightest cluster, rank downward
  for (let r = ones - 1; r >= 0; r--) {
    let tight = -1, te = -Infinity;
    for (let i = 0; i < M; i++) if (work[i]) { const e = energyAt(i, work); if (e > te) { te = e; tight = i; } }
    work[tight] = 0; rank[tight] = r;
  }
  // phase 2: fill largest void upward
  const work2 = bin.slice();
  for (let r = ones; r < M; r++) {
    let loose = -1, le = Infinity;
    for (let i = 0; i < M; i++) if (!work2[i]) { const e = energyAt(i, work2); if (e < le) { le = e; loose = i; } }
    work2[loose] = 1; rank[loose] = r;
  }
  const buf = Buffer.alloc(M * 4);
  for (let i = 0; i < M; i++) { const v = Math.round(rank[i] / (M - 1) * 255); buf[i*4]=v; buf[i*4+1]=v; buf[i*4+2]=v; buf[i*4+3]=255; }
  await sharp(buf, { raw: { width: N, height: N, channels: 4 } }).png().toFile(join(OUT, 'bluenoise.png'));
  console.log('  ✓ bluenoise.png');
}

console.log('done.');
