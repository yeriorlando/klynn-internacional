const sharp = require('sharp');
const fs = require('fs');

async function processImg() {
  const meta = await sharp('tools/klynn-kiosk-installer/printer_art.png').metadata();
  const width = meta.width;
  const height = meta.height;
  
  // Create an SVG gradient overlay to feather top edge and background into #001a42
  const svg = `<svg width="${width}" height="${height}">
    <defs>
      <linearGradient id="fade" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#001a42" stop-opacity="1" />
        <stop offset="25%" stop-color="#001a42" stop-opacity="0.8" />
        <stop offset="45%" stop-color="#001a42" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#fade)" />
  </svg>`;

  await sharp('tools/klynn-kiosk-installer/printer_art.png')
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile('tools/klynn-kiosk-installer/printer_art_blended.png');

  fs.copyFileSync('tools/klynn-kiosk-installer/printer_art_blended.png', 'tools/klynn-kiosk-installer/printer_art.png');
  console.log('Feathered printer_art.png to #001a42 successfully.');
}
processImg();
