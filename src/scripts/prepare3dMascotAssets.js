const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const SRC_PATH = path.join(PUBLIC_DIR, 'zalo-care-bot-mascot-3d.png');
const OUT_BASE = path.join(PUBLIC_DIR, 'mascot-3d-base.png');
const OUT_HAPPY = path.join(PUBLIC_DIR, 'mascot-3d-happy.png');

function smoothPatchBilinear(buf, w, x1, x2, y1, y2) {
  for (let y = y1; y <= y2; y++) {
    const ty = (y - y1) / Math.max(1, y2 - y1);
    const leftIdx = (y * w + (x1 - 2)) * 4;
    const rightIdx = (y * w + (x2 + 2)) * 4;

    for (let x = x1; x <= x2; x++) {
      const tx = (x - x1) / Math.max(1, x2 - x1);
      const topIdx = ((y1 - 2) * w + x) * 4;
      const botIdx = ((y2 + 2) * w + x) * 4;

      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const hInterp = buf[leftIdx + c] * (1 - tx) + buf[rightIdx + c] * tx;
        const vInterp = buf[topIdx + c] * (1 - ty) + buf[botIdx + c] * ty;
        buf[idx + c] = Math.round(hInterp * 0.5 + vInterp * 0.5);
      }
    }
  }
}

async function buildAssets() {
  const { data, info } = await sharp(SRC_PATH)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  const happyBuf = Buffer.from(data);
  const baseBuf = Buffer.from(data);

  // 1. In baseBuf, smoothly replace the eyes & smile region inside the 3D visor
  // Region: x in [432..834], y in [426..604] (completely below the top-left glossy highlight!)
  smoothPatchBilinear(baseBuf, w, 432, 834, 426, 604);

  // Resize to 512x512 for crisp, fast rendering
  await sharp(happyBuf, { raw: { width: w, height: h, channels: 4 } })
    .resize(512, 512, { kernel: 'lanczos3' })
    .png()
    .toFile(OUT_HAPPY);

  await sharp(baseBuf, { raw: { width: w, height: h, channels: 4 } })
    .resize(512, 512, { kernel: 'lanczos3' })
    .png()
    .toFile(OUT_BASE);

  console.log('✅ Created clean 3D Mascot assets:', OUT_HAPPY, OUT_BASE);
}

buildAssets().catch((err) => {
  console.error(err);
  process.exit(1);
});
