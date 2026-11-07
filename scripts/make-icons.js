// Renders the AAYME mark to the PNGs Expo needs. Run: node scripts/make-icons.js
const sharp = require('sharp');
const path = require('path');
const out = (f) => path.join(__dirname, '..', 'assets', f);

const mark = (size, pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-pad} ${-pad} ${100 + pad * 2} ${100 + pad * 2}">
  <defs>
    <linearGradient id="sw" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2F6BFF"/><stop offset=".45" stop-color="#1EC8FF"/><stop offset="1" stop-color="#D45BFF"/></linearGradient>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9D2F5"/></linearGradient>
  </defs>
  <path d="M44 8 Q50 3 56 8 L88 80 Q90 87 83 87 H69 Q64 87 62 82 L50 54 L36 87 H17 Q10 87 13 80 Z" fill="url(#a)"/>
  <path d="M20 80 Q42 44 92 28 Q60 44 44 74 Q34 88 20 80 Z" fill="url(#sw)"/>
</svg>`;
const bg = (size, r) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15175A"/><stop offset="1" stop-color="#070720"/></linearGradient></defs><rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/></svg>`;

async function compose(size, markSize, file, rounded) {
  const base = sharp(Buffer.from(bg(size, rounded ? size * 0.22 : 0)));
  const m = await sharp(Buffer.from(mark(markSize))).png().toBuffer();
  await base.composite([{ input: m, gravity: 'center' }]).png().toFile(out(file));
}

(async () => {
  await compose(1024, 700, 'icon.png', false);                 // store icon (stores round it themselves)
  await sharp(Buffer.from(mark(1024, 0))).resize(660, 660).extend({ top: 182, bottom: 182, left: 182, right: 182, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out('android-icon-foreground.png')); // inside the adaptive safe zone
  await sharp(Buffer.from(bg(1024, 0))).png().toFile(out('android-icon-background.png'));
  await sharp(Buffer.from(mark(1024))).resize(660, 660).extend({ top: 182, bottom: 182, left: 182, right: 182, background: { r: 0, g: 0, b: 0, alpha: 0 } }).greyscale().threshold(10).png().toFile(out('android-icon-monochrome.png'));
  await sharp(Buffer.from(mark(1024))).png().toFile(out('splash-icon.png'));
  await compose(64, 48, 'favicon.png', true);
  console.log('icons written');
})();
