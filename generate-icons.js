const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcon(size) {
  const padding = size * 0.15;
  const imageBoxSize = size * 0.18;
  const imageSpacing = size * 0.05;
  const funnelWidth = size * 0.45;
  const funnelHeight = size * 0.25;
  const outputBoxSize = size * 0.35;

  // Create SVG
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="#4A90E2"/>

      <!-- Three input images -->
      ${[0, 1, 2].map(i => {
        const x = (size - imageBoxSize) / 2;
        const y = padding + i * (imageBoxSize + imageSpacing);
        return `
          <!-- Image box ${i + 1} -->
          <rect x="${x}" y="${y}" width="${imageBoxSize}" height="${imageBoxSize}"
                fill="white" stroke="white" stroke-width="${size * 0.02}"/>

          <!-- Sun circle -->
          <circle cx="${x + imageBoxSize * 0.35}" cy="${y + imageBoxSize * 0.35}"
                  r="${imageBoxSize * 0.12}" fill="#4A90E2"/>

          <!-- Mountain -->
          <path d="M ${x + imageBoxSize * 0.15} ${y + imageBoxSize * 0.85}
                   L ${x + imageBoxSize * 0.4} ${y + imageBoxSize * 0.5}
                   L ${x + imageBoxSize * 0.6} ${y + imageBoxSize * 0.6}
                   L ${x + imageBoxSize * 0.85} ${y + imageBoxSize * 0.85}
                   Z" fill="#4A90E2"/>
        `;
      }).join('')}

      <!-- Funnel -->
      <path d="M ${size / 2 - funnelWidth / 2} ${padding + 3 * (imageBoxSize + imageSpacing)}
               L ${size / 2 + funnelWidth / 2} ${padding + 3 * (imageBoxSize + imageSpacing)}
               L ${size / 2 + funnelWidth / 4} ${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight}
               L ${size / 2 - funnelWidth / 4} ${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight}
               Z" fill="white"/>

      <!-- Output image -->
      <rect x="${(size - outputBoxSize) / 2}"
            y="${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight + imageSpacing}"
            width="${outputBoxSize}" height="${outputBoxSize}"
            fill="white" stroke="white" stroke-width="${size * 0.03}"/>

      <!-- Output sun -->
      <circle cx="${(size - outputBoxSize) / 2 + outputBoxSize * 0.3}"
              cy="${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight + imageSpacing + outputBoxSize * 0.3}"
              r="${outputBoxSize * 0.1}" fill="#4A90E2"/>

      <!-- Output mountain -->
      <path d="M ${(size - outputBoxSize) / 2 + outputBoxSize * 0.1} ${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight + imageSpacing + outputBoxSize * 0.9}
               L ${(size - outputBoxSize) / 2 + outputBoxSize * 0.35} ${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight + imageSpacing + outputBoxSize * 0.45}
               L ${(size - outputBoxSize) / 2 + outputBoxSize * 0.55} ${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight + imageSpacing + outputBoxSize * 0.55}
               L ${(size - outputBoxSize) / 2 + outputBoxSize * 0.75} ${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight + imageSpacing + outputBoxSize * 0.35}
               L ${(size - outputBoxSize) / 2 + outputBoxSize * 0.9} ${padding + 3 * (imageBoxSize + imageSpacing) + funnelHeight + imageSpacing + outputBoxSize * 0.9}
               Z" fill="#4A90E2"/>
    </svg>
  `;

  return svg;
}

async function main() {
  // Ensure assets directory exists
  await fs.mkdir('assets', { recursive: true });

  // Generate main icon (512x512)
  const icon512 = await generateIcon(512);
  await sharp(Buffer.from(icon512))
    .png()
    .toFile('assets/icon.png');
  console.log('Created assets/icon.png (512x512)');

  // Generate tray icon (44x44 for @2x)
  const icon44 = await generateIcon(44);
  await sharp(Buffer.from(icon44))
    .png()
    .toFile('assets/tray-icon.png');
  console.log('Created assets/tray-icon.png (44x44)');

  // Generate 1024x1024 for conversion to .icns
  const icon1024 = await generateIcon(1024);
  await sharp(Buffer.from(icon1024))
    .png()
    .toFile('assets/icon-1024.png');
  console.log('Created assets/icon-1024.png (1024x1024)');

  console.log('\nIcons generated successfully!');
  console.log('Note: You\'ll need to convert icon-1024.png to .icns format for macOS.');
  console.log('You can use: https://cloudconvert.com/png-to-icns');
}

main().catch(console.error);