/**
 * Generates PWA icons by calling Next.js's own /icon and /apple-icon routes
 * after the dev server starts, OR generates them via canvas.
 * Run: node generate-icons.js
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'public', 'icons')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

// ─── Minimal PNG encoder ───────────────────────────────────────────────────
function crc32(buf) {
  let crc = 0xffffffff
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c
  }))
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length)
  const typeB = Buffer.from(type)
  const crcBuf = Buffer.concat([typeB, data])
  const crcVal = Buffer.allocUnsafe(4)
  crcVal.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, typeB, data, crcVal])
}

function makePNG(size, bgR, bgG, bgB, drawFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Build RGBA pixel array
  const pixels = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => [bgR, bgG, bgB])
  )
  if (drawFn) drawFn(pixels, size)

  // Scanlines: filter byte 0 + RGB
  const rows = Buffer.allocUnsafe(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    rows[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const off = y * (size * 3 + 1) + 1 + x * 3
      rows[off]     = pixels[y][x][0]
      rows[off + 1] = pixels[y][x][1]
      rows[off + 2] = pixels[y][x][2]
    }
  }

  const idat = chunk('IDAT', zlib.deflateSync(rows, { level: 6 }))
  const iend = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend])
}

// ─── Draw WorldChase icon on a pixel grid ─────────────────────────────────
// Navy = #0B1628 → rgb(11, 22, 40)
// Gold = #F2B143 → rgb(242, 177, 67)

const NAVY = [11, 22, 40]
const GOLD = [242, 177, 67]

function drawIcon(pixels, size) {
  const cx = size / 2
  const cy = size / 2

  // Draw circle (globe ring)
  const radius = size * 0.38
  const strokeW = Math.max(2, size * 0.045)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (Math.abs(dist - radius) < strokeW) {
        pixels[y][x] = GOLD
      }
    }
  }

  // Draw "W" in the centre using a simple bitmap
  // Scale letter to ~40% of icon size
  const letterSize = Math.round(size * 0.40)
  const letterX = Math.round(cx - letterSize * 0.5)
  const letterY = Math.round(cy - letterSize * 0.52)
  drawW(pixels, letterX, letterY, letterSize, GOLD)
}

function drawW(pixels, ox, oy, sz, color) {
  const thick = Math.max(1, Math.round(sz * 0.13))
  const h = sz
  const w = sz

  function fillRect(x, y, rw, rh) {
    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        const px = ox + x + dx
        const py = oy + y + dy
        if (px >= 0 && px < pixels[0].length && py >= 0 && py < pixels.length) {
          pixels[py][px] = color
        }
      }
    }
  }

  // Left leg of W
  for (let i = 0; i < h; i++) {
    const slope = i / h
    fillRect(Math.round(slope * (w * 0.15)), i, thick, 1)
  }
  // Right leg of W
  for (let i = 0; i < h; i++) {
    const slope = i / h
    fillRect(Math.round(w - thick - slope * (w * 0.15)), i, thick, 1)
  }
  // Left inner of W (going back up)
  for (let i = 0; i < h * 0.55; i++) {
    const slope = i / (h * 0.55)
    fillRect(Math.round(w * 0.15 + slope * (w * 0.20)), h - 1 - Math.round(i), thick, 1)
  }
  // Right inner of W (going back up)
  for (let i = 0; i < h * 0.55; i++) {
    const slope = i / (h * 0.55)
    fillRect(Math.round(w * 0.65 - slope * (w * 0.20)), h - 1 - Math.round(i), thick, 1)
  }
}

function drawMaskableIcon(pixels, size) {
  // Maskable: fill safe zone (80% of canvas) with the icon, rest with bg colour
  const safeStart = Math.round(size * 0.1)
  const safeSize = Math.round(size * 0.8)
  const cx = size / 2
  const cy = size / 2
  const radius = safeSize * 0.38
  const strokeW = Math.max(2, size * 0.036)

  for (let y = safeStart; y < safeStart + safeSize; y++) {
    for (let x = safeStart; x < safeStart + safeSize; x++) {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (Math.abs(dist - radius) < strokeW) {
        pixels[y][x] = GOLD
      }
    }
  }
  const letterSize = Math.round(safeSize * 0.40)
  const letterX = Math.round(cx - letterSize * 0.5)
  const letterY = Math.round(cy - letterSize * 0.52)
  drawW(pixels, letterX, letterY, letterSize, GOLD)
}

// ─── Generate all sizes ──────────────────────────────────────────────────
const files = [
  { name: 'icon-192.png',          size: 192, draw: drawIcon },
  { name: 'icon-512.png',          size: 512, draw: drawIcon },
  { name: 'icon-maskable-192.png', size: 192, draw: drawMaskableIcon },
  { name: 'icon-maskable-512.png', size: 512, draw: drawMaskableIcon },
]

for (const { name, size, draw } of files) {
  const buf = makePNG(size, NAVY[0], NAVY[1], NAVY[2], draw)
  fs.writeFileSync(path.join(OUT, name), buf)
  console.log(`Created: public/icons/${name} (${buf.length} bytes)`)
}

console.log('\nAll icons generated.')
