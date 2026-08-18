const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dirs = ['public/samples/Prendas', 'public/samples/Servicios'];

async function run() {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    for (const file of files) {
      const p = path.join(dir, file);
      const out = p.replace(/\.png$/, '.webp');
      try {
        await sharp(p).webp({ quality: 80, effort: 4 }).toFile(out);
        fs.unlinkSync(p);
        console.log(`Converted: ${file} -> ${path.basename(out)}`);
      } catch (err) {
        console.error(`Error with ${file}:`, err);
      }
    }
  }
}

run();
