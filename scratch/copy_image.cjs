const fs = require('fs');
const path = require('path');

const srcPath = `C:\\Users\\Yeri Orlando\\.gemini\\antigravity-ide\\brain\\78689d0c-7c11-4f16-9395-11a7887963a7\\login_page_background_1783716457614.png`;
const destWebp = `c:\\Users\\Yeri Orlando\\Desktop\\Klynn SaaS\\Klynn Cloud\\Klynn\\public\\login.webp`;
const destWepb = `c:\\Users\\Yeri Orlando\\Desktop\\Klynn SaaS\\Klynn Cloud\\Klynn\\public\\login.wepb`;

try {
  // Copy to login.webp
  fs.copyFileSync(srcPath, destWebp);
  console.log(`Copied to ${destWebp}`);

  // Copy to login.wepb
  fs.copyFileSync(srcPath, destWepb);
  console.log(`Copied to ${destWepb}`);
} catch (err) {
  console.error("Error copying file:", err);
}
