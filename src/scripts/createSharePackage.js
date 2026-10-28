const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..', '..');
const TEMP_STAGE_DIR = path.join(ROOT_DIR, 'data', '_share_staging', 'Zalo-Care-Bot');
const OUT_ZIP_WORKSPACE = path.join(ROOT_DIR, '..', 'ZaloCare-Bot-Ban-Chia-Se.zip');
const OUT_ZIP_PUBLIC = path.join(ROOT_DIR, 'public', 'ZaloCare-Bot-Ban-Chia-Se.zip');

function copyRecursiveClean(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      if (item === 'ZaloCare-Bot-Ban-Chia-Se.zip') continue;
      copyRecursiveClean(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function buildShareZip() {
  // 1. Clean staging dir
  const stagingRoot = path.join(ROOT_DIR, 'data', '_share_staging');
  if (fs.existsSync(stagingRoot)) {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_STAGE_DIR, { recursive: true });

  // 2. Copy only safe application files (NO data/db.json, NO personal cookies/contacts, NO node_modules)
  const filesToCopy = [
    'package.json',
    'server.js',
    'start-bot.bat',
    'Cai-Dat-Va-Chay-Ngay.bat',
    'ZaloCare-App.vbs',
    'ZaloCareMascot.exe',
    'README.md',
    'SKILL.md'
  ];

  for (const f of filesToCopy) {
    const srcFile = path.join(ROOT_DIR, f);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(TEMP_STAGE_DIR, f));
    }
  }

  copyRecursiveClean(path.join(ROOT_DIR, 'src'), path.join(TEMP_STAGE_DIR, 'src'));
  copyRecursiveClean(path.join(ROOT_DIR, 'public'), path.join(TEMP_STAGE_DIR, 'public'));

  // Create empty data/cards directory in staging
  fs.mkdirSync(path.join(TEMP_STAGE_DIR, 'data', 'cards'), { recursive: true });

  // 3. Compress using PowerShell Compress-Archive
  if (fs.existsSync(OUT_ZIP_WORKSPACE)) fs.unlinkSync(OUT_ZIP_WORKSPACE);
  if (fs.existsSync(OUT_ZIP_PUBLIC)) fs.unlinkSync(OUT_ZIP_PUBLIC);

  const psCmd = `Compress-Archive -Path '${TEMP_STAGE_DIR}' -DestinationPath '${OUT_ZIP_WORKSPACE}' -Force`;
  const encoded = Buffer.from(psCmd, 'utf16le').toString('base64');
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`);

  fs.copyFileSync(OUT_ZIP_WORKSPACE, OUT_ZIP_PUBLIC);

  // Clean up staging
  fs.rmSync(stagingRoot, { recursive: true, force: true });

  console.log('✅ Đã đóng gói Bản Chia Sẻ Sạch (Không chứa dữ liệu cá nhân):', OUT_ZIP_WORKSPACE);
  return {
    workspaceZipPath: OUT_ZIP_WORKSPACE,
    publicDownloadUrl: '/ZaloCare-Bot-Ban-Chia-Se.zip'
  };
}

if (require.main === module) {
  buildShareZip();
}

module.exports = { buildShareZip };
