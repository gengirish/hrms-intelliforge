const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SVG = fs.readFileSync(path.join(__dirname, "../public/icon.svg"));

const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#818cf8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="310" font-family="Inter,system-ui,sans-serif" font-size="200" font-weight="800" fill="white" text-anchor="middle">IF</text>
</svg>`;

async function generate() {
  const sizes = [192, 512];
  for (const size of sizes) {
    await sharp(SVG).resize(size, size).png().toFile(path.join(__dirname, `../public/icon-${size}.png`));
    console.log(`icon-${size}.png`);
  }
  for (const size of sizes) {
    await sharp(Buffer.from(MASKABLE_SVG)).resize(size, size).png().toFile(path.join(__dirname, `../public/icon-maskable-${size}.png`));
    console.log(`icon-maskable-${size}.png`);
  }
  await sharp(SVG).resize(180, 180).png().toFile(path.join(__dirname, "../public/apple-touch-icon.png"));
  console.log("apple-touch-icon.png");
  await sharp(SVG).resize(32, 32).png().toFile(path.join(__dirname, "../public/favicon-32x32.png"));
  console.log("favicon-32x32.png");
  await sharp(SVG).resize(16, 16).png().toFile(path.join(__dirname, "../public/favicon-16x16.png"));
  console.log("favicon-16x16.png");
  console.log("Done!");
}

generate().catch(console.error);
