const path = require('path');
const sharp = require('sharp');

async function main() {
  const faviconWebp = path.join(__dirname, '../../public/favicon.webp');
  const faviconPng = path.join(__dirname, 'favicon.png');
  const faviconSourcePng = path.join(__dirname, 'favicon_source.png');

  // Convert favicon.webp to high-res square PNG
  await sharp(faviconWebp).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(faviconPng);
  await sharp(faviconWebp).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(faviconSourcePng);

  console.log('favicon.png and favicon_source.png created.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
