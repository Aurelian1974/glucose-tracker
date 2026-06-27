/**
 * Generates valid PNG icons for the PWA without external dependencies.
 * Uses Node.js built-in zlib for PNG compression.
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = resolve(__dir, '../public/icons');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG chunk builder ──────────────────────────────────────────────────────
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

// ── PNG encoder ────────────────────────────────────────────────────────────
function makePNG(size, pixels /* Uint8Array, RGBA row-major */) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  // Add filter byte (0 = None) before each row
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * (1 + size * 4) + 1 + x * 4;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
      raw[dst+3] = pixels[src+3];
    }
  }
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon drawing ───────────────────────────────────────────────────────────
function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);

  // Colours
  const BG     = [0x0D, 0x11, 0x17, 255];
  const ACCENT = [0x2D, 0xD4, 0xBF, 255];
  const DARK   = [0x16, 0x1B, 0x22, 255];

  // Chart-line waypoints (normalised 0..1)
  const PTS = [
    [0.08, 0.62], [0.18, 0.38], [0.30, 0.52],
    [0.44, 0.22], [0.56, 0.42], [0.70, 0.20], [0.92, 0.32],
  ];

  // Corner radius  ≈ 22 % of size (Android adaptive icon style)
  const RR = size * 0.22;
  const cx = size / 2, cy = size / 2;
  const lw = Math.max(size * 0.042, 3);   // line width
  const aa = lw * 0.8;                     // anti-alias margin

  function lerp(a, b, t) { return a + (b - a) * t; }

  function insideRR(x, y) {
    const dx = Math.max(0, Math.abs(x - cx) - (cx - RR));
    const dy = Math.max(0, Math.abs(y - cy) - (cy - RR));
    return dx * dx + dy * dy <= RR * RR;
  }

  function chartYat(nx) {
    for (let i = 0; i < PTS.length - 1; i++) {
      const [x0, y0] = PTS[i], [x1, y1] = PTS[i+1];
      if (nx >= x0 && nx <= x1) {
        return lerp(y0, y1, (nx - x0) / (x1 - x0)) * size;
      }
    }
    return null;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      if (!insideRR(x + 0.5, y + 0.5)) {
        // Fully transparent (outside rounded rect)
        px[idx+3] = 0; continue;
      }

      // Background fill
      let [r, g, b, a] = DARK;

      // Chart line
      const cy2 = chartYat((x + 0.5) / size);
      if (cy2 !== null) {
        const dist = Math.abs((y + 0.5) - cy2);
        if (dist < lw + aa) {
          const t = dist < lw ? 1 : 1 - (dist - lw) / aa;
          r = Math.round(lerp(DARK[0], ACCENT[0], t));
          g = Math.round(lerp(DARK[1], ACCENT[1], t));
          b = Math.round(lerp(DARK[2], ACCENT[2], t));
          a = 255;
        }
      }

      // Subtle baseline
      const baseline = size * 0.82;
      if (Math.abs((y + 0.5) - baseline) < size * 0.008) {
        r = 0x30; g = 0x36; b = 0x3D;
      }

      px[idx] = r; px[idx+1] = g; px[idx+2] = b; px[idx+3] = a;
    }
  }
  return px;
}

// ── Main ───────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });

for (const size of [192, 512]) {
  const pixels = drawIcon(size);
  const buf    = makePNG(size, pixels);
  writeFileSync(`${OUT}/icon-${size}.png`, buf);
  console.log(`✓ icon-${size}.png  (${buf.length} bytes)`);
}
console.log('\nIcons generated in public/icons/');
