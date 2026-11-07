// Generates the graphics Google Play asks for. Run: node scripts/make-store-assets.js  ->  store/
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'store');
fs.mkdirSync(out, { recursive: true });

const mark = `
  <defs>
    <linearGradient id="sw" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2F6BFF"/><stop offset=".45" stop-color="#1EC8FF"/><stop offset="1" stop-color="#D45BFF"/></linearGradient>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9D2F5"/></linearGradient>
  </defs>
  <path d="M44 8 Q50 3 56 8 L88 80 Q90 87 83 87 H69 Q64 87 62 82 L50 54 L36 87 H17 Q10 87 13 80 Z" fill="url(#a)"/>
  <path d="M20 80 Q42 44 92 28 Q60 44 44 74 Q34 88 20 80 Z" fill="url(#sw)"/>`;

const bg = (w, h) => `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A1D6B"/><stop offset="1" stop-color="#070720"/></linearGradient><rect width="${w}" height="${h}" fill="url(#g)"/>`;

// 512 x 512 app icon (Play applies its own rounding, so it is full-bleed)
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${bg(512, 512)}<g transform="translate(96 96) scale(3.2)">${mark}</g></svg>`;

// 1024 x 500 feature graphic
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">${bg(1024, 500)}
  <circle cx="900" cy="80" r="220" fill="#2F6BFF" opacity=".12"/><circle cx="980" cy="470" r="160" fill="#D45BFF" opacity=".10"/>
  <g transform="translate(70 120) scale(2.6)">${mark}</g>
  <text x="380" y="215" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="800" fill="#FFFFFF" letter-spacing="6">AAYME</text>
  <text x="384" y="262" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#9A9DCB" letter-spacing="9">B2B E-COMMERCE</text>
  <text x="384" y="332" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#F4F5FF">Order, khata and delivery</text>
  <text x="384" y="378" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#F4F5FF">for distributors and retailers.</text>
</svg>`;

(async () => {
  await sharp(Buffer.from(icon)).png().toFile(path.join(out, 'play-icon-512.png'));
  await sharp(Buffer.from(feature)).png().toFile(path.join(out, 'feature-graphic-1024x500.png'));
  console.log('written to', out);
})();
