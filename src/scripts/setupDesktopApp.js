const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const ROOT_DIR = path.join(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const LOGO_PATH = path.join(PUBLIC_DIR, 'logo-app.png');
const ICO_PATH = path.join(PUBLIC_DIR, 'app-icon.ico');
const FAVICON_PATH = path.join(PUBLIC_DIR, 'favicon.png');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'manifest.json');
const VBS_LAUNCHER_PATH = path.join(ROOT_DIR, 'ZaloCare-App.vbs');

function buildIcoFromPngBuffers(buffersWithSizes) {
  const count = buffersWithSizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const item of buffersWithSizes) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(item.size >= 256 ? 0 : item.size, 0);
    dir.writeUInt8(item.size >= 256 ? 0 : item.size, 1);
    dir.writeUInt8(0, 2);
    dir.writeUInt8(0, 3);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(item.buf.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    offset += item.buf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...buffersWithSizes.map((x) => x.buf)]);
}

async function run() {
  // 1. Build crisp rounded-square icon from Zalo Care Bot robot logo
  const logoBuf = fs.readFileSync(LOGO_PATH);
  const logoB64 = logoBuf.toString('base64');

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#eff6ff"/>
      </linearGradient>
      <linearGradient id="border" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0068FF"/>
        <stop offset="100%" stop-color="#38bdf8"/>
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="244" height="244" rx="56" fill="url(#bg)" stroke="url(#border)" stroke-width="8"/>
    <image href="data:image/png;base64,${logoB64}" x="14" y="14" width="228" height="228" preserveAspectRatio="xMidYMid meet"/>
  </svg>`;

  const sizes = [256, 128, 64, 48, 32, 16];
  const pngItems = [];
  for (const sz of sizes) {
    const buf = await sharp(Buffer.from(iconSvg)).resize(sz, sz).png().toBuffer();
    pngItems.push({ size: sz, buf });
  }

  const icoBuf = buildIcoFromPngBuffers(pngItems);
  fs.writeFileSync(ICO_PATH, icoBuf);
  fs.writeFileSync(FAVICON_PATH, pngItems.find((x) => x.size === 64).buf);
  console.log('✅ Đã tạo icon ứng dụng Zalo Care Bot:', ICO_PATH);

  // 2. Write Web App Manifest for Standalone Window
  const manifest = {
    name: 'Zalo Care Bot',
    short_name: 'Zalo Care Bot',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0068FF',
    icons: [
      {
        src: '/favicon.png',
        sizes: '64x64',
        type: 'image/png'
      },
      {
        src: '/logo-app.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  // 3. Create Silent Native-Window VBS Launcher (pure ASCII for WScript compatibility)
  const vbsContent = `' Zalo Care Bot - Desktop Application Launcher
Option Explicit
Dim WshShell, fso, appDir, http, isRunning
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = appDir

' 1. Check if server is already listening on port 3088
isRunning = False
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.setTimeouts 800, 800, 800, 800
http.Open "GET", "http://localhost:3088/api/zalo/qr-status", False
http.Send
If Err.Number = 0 And http.Status = 200 Then
  isRunning = True
End If
On Error GoTo 0

' 2. If not running, start Node server silently in background (WindowStyle = 0)
If Not isRunning Then
  WshShell.Run "cmd.exe /c node """ & appDir & "\\server.js""", 0, False
  WScript.Sleep 2000
End If

' 3. Open in Standalone Desktop App Mode (Edge or Chrome App Window without address bar)
On Error Resume Next
Err.Clear
WshShell.Run "msedge.exe --app=http://localhost:3088 --window-size=1400,880", 1, False
If Err.Number <> 0 Then
  Err.Clear
  WshShell.Run "chrome.exe --app=http://localhost:3088 --window-size=1400,880", 1, False
  If Err.Number <> 0 Then
    WshShell.Run "http://localhost:3088", 1, False
  End If
End If
On Error GoTo 0
`;
  fs.writeFileSync(VBS_LAUNCHER_PATH, vbsContent, 'ascii');
  console.log('✅ Đã tạo bộ khởi chạy Desktop App:', VBS_LAUNCHER_PATH);

  // 4. Create Shortcut named "Zalo Care Bot.lnk"
  const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\ADMIN', 'Desktop');
  const startMenuDir = path.join(
    process.env.APPDATA || 'C:\\Users\\ADMIN\\AppData\\Roaming',
    'Microsoft\\Windows\\Start Menu\\Programs'
  );

  // Clean up old shortcut names if present
  const oldDesktopLnk = path.join(desktopDir, 'ZaloCare Bot - Bản Việt Design.lnk');
  const oldStartLnk = path.join(startMenuDir, 'ZaloCare Bot - Bản Việt Design.lnk');
  if (fs.existsSync(oldDesktopLnk)) fs.unlinkSync(oldDesktopLnk);
  if (fs.existsSync(oldStartLnk)) fs.unlinkSync(oldStartLnk);

  const finalDesktopLnk = path.join(desktopDir, 'Zalo Care Bot.lnk');
  const finalStartLnk = path.join(startMenuDir, 'Zalo Care Bot.lnk');

  const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$s1 = $WshShell.CreateShortcut('${finalDesktopLnk}')
$s1.TargetPath = 'wscript.exe'
$s1.Arguments = '"${VBS_LAUNCHER_PATH}"'
$s1.WorkingDirectory = '${ROOT_DIR}'
$s1.IconLocation = '${ICO_PATH},0'
$s1.Description = 'Zalo Care Bot - Chuc mung Sinh nhat, Le Tet & Tro ly AI CSKH'
$s1.Save()

$s2 = $WshShell.CreateShortcut('${finalStartLnk}')
$s2.TargetPath = 'wscript.exe'
$s2.Arguments = '"${VBS_LAUNCHER_PATH}"'
$s2.WorkingDirectory = '${ROOT_DIR}'
$s2.IconLocation = '${ICO_PATH},0'
$s2.Description = 'Zalo Care Bot - Chuc mung Sinh nhat, Le Tet & Tro ly AI CSKH'
$s2.Save()
`;

  const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, {
    encoding: 'utf8'
  });

  console.log('✅ Đã tạo biểu tượng ngoài màn hình Desktop:', finalDesktopLnk);
  console.log('✅ Đã tạo biểu tượng trong Start Menu:', finalStartLnk);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
