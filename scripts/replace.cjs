const fs = require('fs');
const file = 'src/routes/t.$slug.catalogo.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\.png/g, '.webp');
fs.writeFileSync(file, content);
console.log('Done');
