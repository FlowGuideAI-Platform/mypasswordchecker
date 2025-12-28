/**
 * Generate Open Graph PNG image from SVG
 *
 * Usage:
 *   node scripts/generate-og-image.js
 *
 * This creates og-image.png (1200x630) from og-image.svg
 * Uses canvas to render SVG as PNG
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available (optional dependency)
async function generateWithSharp() {
  try {
    const sharp = require('sharp');
    const svgPath = path.join(__dirname, '../public/og-image.svg');
    const pngPath = path.join(__dirname, '../public/og-image.png');

    await sharp(svgPath)
      .resize(1200, 630)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(pngPath);

    console.log('✅ og-image.png generated successfully with sharp');
    console.log(`   Size: ${fs.statSync(pngPath).size} bytes`);
    return true;
  } catch (err) {
    return false;
  }
}

// Fallback: Use canvas (node-canvas)
async function generateWithCanvas() {
  try {
    const { createCanvas, loadImage } = require('canvas');
    const svgPath = path.join(__dirname, '../public/og-image.svg');
    const pngPath = path.join(__dirname, '../public/og-image.png');

    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');

    // Read SVG and render
    const svgBuffer = fs.readFileSync(svgPath);
    const img = await loadImage(svgBuffer);
    ctx.drawImage(img, 0, 0, 1200, 630);

    // Save as PNG
    const out = fs.createWriteStream(pngPath);
    const stream = canvas.createPNGStream({ compressionLevel: 9 });
    stream.pipe(out);

    await new Promise((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
    });

    console.log('✅ og-image.png generated successfully with canvas');
    console.log(`   Size: ${fs.statSync(pngPath).size} bytes`);
    return true;
  } catch (err) {
    return false;
  }
}

// Instructions if no libraries available
function showInstructions() {
  console.log('❌ No image processing library found.');
  console.log('');
  console.log('📦 Install one of these:');
  console.log('   npm install sharp          (recommended, fastest)');
  console.log('   npm install canvas         (alternative)');
  console.log('');
  console.log('🌐 Or use online converter:');
  console.log('   1. Go to https://cloudconvert.com/svg-to-png');
  console.log('   2. Upload public/og-image.svg');
  console.log('   3. Set dimensions: 1200x630px');
  console.log('   4. Download as og-image.png');
  console.log('   5. Save to public/og-image.png');
}

// Main
(async () => {
  console.log('🎨 Generating Open Graph PNG image...\n');

  const sharpSuccess = await generateWithSharp();
  if (sharpSuccess) return;

  const canvasSuccess = await generateWithCanvas();
  if (canvasSuccess) return;

  showInstructions();
})();
