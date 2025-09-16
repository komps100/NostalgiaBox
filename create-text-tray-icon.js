const sharp = require('sharp');
const fs = require('fs').promises;

async function createTextTrayIcon() {
  // Create template-style tray icons for both normal and @2x
  // Template images should be black with alpha for theme awareness

  // Normal density (22x22) - centered and bold white
  const svg22 = `
    <svg width="22" height="22" xmlns="http://www.w3.org/2000/svg">
      <text x="11" y="18" font-family="SF Pro Display, -apple-system, Helvetica, Arial, sans-serif"
            font-size="16" font-weight="bold" text-anchor="middle"
            fill="white" dominant-baseline="central">⌱</text>
    </svg>
  `;

  // High density @2x (44x44) - centered and bold white
  const svg44 = `
    <svg width="44" height="44" xmlns="http://www.w3.org/2000/svg">
      <text x="22" y="28" font-family="SF Pro Display, -apple-system, Helvetica, Arial, sans-serif"
            font-size="32" font-weight="bold" text-anchor="middle"
            fill="white" dominant-baseline="central">⌱</text>
    </svg>
  `;

  // Create normal density
  await sharp(Buffer.from(svg22))
    .png()
    .toFile('assets/tray-icon.png');

  // Create @2x density
  await sharp(Buffer.from(svg44))
    .png()
    .toFile('assets/tray-icon@2x.png');

  console.log('Created theme-aware tray icons (normal and @2x)');
}

createTextTrayIcon().catch(console.error);