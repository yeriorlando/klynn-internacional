const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const faviconWebp = path.join(__dirname, '../../public/favicon.webp');
  const appIcoDst = path.join(__dirname, 'app.ico');
  const faviconPngDst = path.join(__dirname, 'favicon.png');
  const logoPngDst = path.join(__dirname, 'logo.png');
  const logoSrc = path.join(__dirname, '../../public/logo.png');

  // Copy logo.png
  fs.copyFileSync(logoSrc, logoPngDst);

  // Save 256x256 PNG of favicon
  await sharp(faviconWebp).resize(256, 256).png().toFile(faviconPngDst);

  // Generate multi-resolution ICO sizes
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const s of sizes) {
    const buf = await sharp(faviconWebp).resize(s, s).png().toBuffer();
    pngBuffers.push({ size: s, buffer: buf });
  }

  // Calculate ICO header & directory
  const count = pngBuffers.length;
  const headerSize = 6 + (16 * count);
  let currentOffset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    const w = item.size >= 256 ? 0 : item.size;
    const h = item.size >= 256 ? 0 : item.size;

    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2); // Colors
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Planes
    entry.writeUInt16LE(32, 6); // Bit depth
    entry.writeUInt32LE(item.buffer.length, 8); // Size
    entry.writeUInt32LE(currentOffset, 12); // Offset

    dirEntries.push(entry);
    currentOffset += item.buffer.length;
  }

  const finalIcoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer)
  ]);

  fs.writeFileSync(appIcoDst, finalIcoBuffer);
  console.log('app.ico successfully generated from favicon.webp, size:', finalIcoBuffer.length, 'bytes');
}

main().catch(err => {
  console.error('Error generating icon:', err);
  process.exit(1);
});
