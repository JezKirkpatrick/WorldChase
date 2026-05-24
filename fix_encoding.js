// Fix mojibake: UTF-8 bytes were read as Windows-1252, re-saved as UTF-8.
// Reverse: map each char back to its cp1252 byte, then decode bytes as UTF-8.

const fs = require('fs');
const path = require('path');

// cp1252 special range 0x80-0x9F: byte -> Unicode codepoint
const CP1252_EXTRA = {
  0x80: 0x20AC, // €
  0x82: 0x201A, // ‚
  0x83: 0x0192, // ƒ
  0x84: 0x201E, // „
  0x85: 0x2026, // …
  0x86: 0x2020, // †
  0x87: 0x2021, // ‡
  0x88: 0x02C6, // ˆ
  0x89: 0x2030, // ‰
  0x8A: 0x0160, // Š
  0x8B: 0x2039, // ‹
  0x8C: 0x0152, // Œ
  0x8E: 0x017D, // Ž
  0x91: 0x2018, // '
  0x92: 0x2019, // '
  0x93: 0x201C, // "
  0x94: 0x201D, // "
  0x95: 0x2022, // •
  0x96: 0x2013, // –
  0x97: 0x2014, // —
  0x98: 0x02DC, // ˜
  0x99: 0x2122, // ™
  0x9A: 0x0161, // š
  0x9B: 0x203A, // ›
  0x9C: 0x0153, // œ
  0x9E: 0x017E, // ž
  0x9F: 0x0178, // Ÿ
};

// Build reverse map: Unicode codepoint -> cp1252 byte
const UNICODE_TO_CP1252 = new Map();
for (const [byte, cp] of Object.entries(CP1252_EXTRA)) {
  UNICODE_TO_CP1252.set(cp, parseInt(byte));
}
// 0x00-0x7F: identity
for (let i = 0; i <= 0x7F; i++) UNICODE_TO_CP1252.set(i, i);
// 0xA0-0xFF: identity (Latin-1 supplement)
for (let i = 0xA0; i <= 0xFF; i++) UNICODE_TO_CP1252.set(i, i);
// Undefined cp1252 bytes (0x81, 0x8D, 0x8F, 0x90, 0x9D) — treat as Latin-1 control chars
// so the reverse map: U+008D -> byte 0x8D, etc.
for (const b of [0x81, 0x8D, 0x8F, 0x90, 0x9D]) {
  UNICODE_TO_CP1252.set(b, b);
}

function charToCp1252Byte(char) {
  const cp = char.codePointAt(0);
  return UNICODE_TO_CP1252.get(cp); // undefined if not in cp1252
}

function fixMojibake(text) {
  // Try to encode the whole string as cp1252 bytes, then decode as UTF-8
  const bytes = [];
  for (const char of text) {
    const b = charToCp1252Byte(char);
    if (b === undefined) return null; // can't encode, not mojibake
    bytes.push(b);
  }
  try {
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return null;
  }
}

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');

  // Process char by char, greedily fix mojibake sequences
  let result = '';
  let i = 0;
  let changed = false;

  while (i < original.length) {
    // Try lengths 4, 3, 2 (max UTF-8 encoded bytes that map to 1 Unicode char)
    let fixed = false;
    for (const len of [4, 3, 2]) {
      if (i + len > original.length) continue;
      const chunk = original.slice(i, i + len);

      // Check all chars in chunk are encodable as cp1252
      const bytes = [];
      let allValid = true;
      for (const char of chunk) {
        const b = charToCp1252Byte(char);
        if (b === undefined) { allValid = false; break; }
        bytes.push(b);
      }
      if (!allValid) continue;

      // Try decoding these bytes as UTF-8
      try {
        const decoded = Buffer.from(bytes).toString('utf8');
        // Validate: the decoded string must be a single valid Unicode scalar (1-2 JS chars for surrogates)
        // and must DIFFER from the original chunk (otherwise it's just ASCII, handled below)
        if (decoded !== chunk && !decoded.includes('�')) {
          // Extra check: re-encoding the decoded char as UTF-8 should give back our bytes
          const reencoded = [...Buffer.from(decoded, 'utf8')];
          if (reencoded.length === bytes.length && reencoded.every((b, j) => b === bytes[j])) {
            result += decoded;
            i += len;
            fixed = true;
            changed = true;
            break;
          }
        }
      } catch {}
    }

    if (!fixed) {
      result += original[i];
      i++;
    }
  }

  return { changed, content: result };
}

const BASE = __dirname;
const AFFECTED = [
  'app/admin/challenges/page.tsx',
  'app/admin/events/page.tsx',
  'app/admin/page.tsx',
  'app/admin/players/page.tsx',
  'app/api/admin/generate-challenge/route.ts',
  'app/api/ranked/cancel/route.ts',
  'app/api/ranked/submit/route.ts',
  'app/auth/login/page.tsx',
  'app/auth/signup/page.tsx',
  'app/dashboard/page.tsx',
  'app/how-to-play/page.tsx',
  'app/leaderboard/page.tsx',
  'app/play/[challengeId]/page.tsx',
  'app/play/page.tsx',
  'app/profile/[username]/page.tsx',
  'app/profile/page.tsx',
  'app/shop/page.tsx',
  'app/support/page.tsx',
  'app/tokens/page.tsx',
];

let totalFixed = 0;
for (const rel of AFFECTED) {
  const full = path.join(BASE, rel);
  if (!fs.existsSync(full)) { console.log(`MISSING: ${rel}`); continue; }

  try {
    const { changed, content } = fixFile(full);
    if (changed) {
      fs.writeFileSync(full, content, { encoding: 'utf8' });
      console.log(`FIXED:   ${rel}`);
      totalFixed++;
    } else {
      console.log(`OK:      ${rel}`);
    }
  } catch (e) {
    console.log(`ERROR:   ${rel} — ${e.message}`);
  }
}

console.log(`\nDone. ${totalFixed} file(s) updated.`);
