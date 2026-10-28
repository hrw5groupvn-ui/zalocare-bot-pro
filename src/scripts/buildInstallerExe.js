const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..', '..');
const STAGING_ROOT = path.join(ROOT_DIR, 'data', '_installer_staging');
const PAYLOAD_DIR = path.join(STAGING_ROOT, 'payload');
const PAYLOAD_ZIP = path.join(STAGING_ROOT, 'payload.zip');
const CS_FILE = path.join(STAGING_ROOT, 'InstallerProgram.cs');

const OUT_EXE_WORKSPACE = path.join(ROOT_DIR, '..', 'ZaloCare-Bot-Setup.exe');
const OUT_EXE_PUBLIC = path.join(ROOT_DIR, 'public', 'ZaloCare-Bot-Setup.exe');
const ICO_PATH = path.join(ROOT_DIR, 'public', 'app-icon.ico');
const LOGO_PNG_PATH = path.join(ROOT_DIR, 'public', 'logo-app.png');
const HERO_PNG_PATH = path.join(ROOT_DIR, 'public', 'hero-banner.png');

function copyRecursiveClean(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      if (item === 'ZaloCare-Bot-Ban-Chia-Se.zip' || item === 'ZaloCare-Bot-Setup.exe') continue;
      copyRecursiveClean(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

const CSHARP_SOURCE = `
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ZaloCareInstaller
{
    public class MainForm : Form
    {
        private TextBox txtInstallPath;
        private CheckBox chkDesktopShortcut;
        private CheckBox chkLaunchNow;
        private ProgressBar progressBar;
        private TextBox txtLog;
        private Button btnInstall;
        private Button btnBrowse;

        public MainForm()
        {
            this.Text = "Bộ Cài Đặt Zalo Care Bot — Trợ Lý AI & Chăm Sóc Khách Hàng";
            this.Size = new Size(660, 560);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            try {
                this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            } catch {}

            // Header Banner Panel with 3D Robot Hero Image & Logo
            Panel header = new Panel();
            header.Dock = DockStyle.Top;
            header.Height = 130;
            header.BackColor = Color.FromArgb(239, 246, 255);

            try {
                using (Stream heroStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("ZaloCareHero.png")) {
                    if (heroStream != null) {
                        header.BackgroundImage = Image.FromStream(heroStream);
                        header.BackgroundImageLayout = ImageLayout.Stretch;
                    }
                }
            } catch {}

            PictureBox picLogo = new PictureBox();
            picLogo.Size = new Size(56, 56);
            picLogo.Location = new Point(24, 22);
            picLogo.SizeMode = PictureBoxSizeMode.Zoom;
            picLogo.BackColor = Color.White;
            try {
                using (Stream logoStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("ZaloCareLogo.png")) {
                    if (logoStream != null) {
                        picLogo.Image = Image.FromStream(logoStream);
                    }
                }
            } catch {}
            header.Controls.Add(picLogo);

            Label lblTitle = new Label();
            lblTitle.Text = "ZALO CARE BOT";
            lblTitle.ForeColor = Color.FromArgb(0, 82, 204);
            lblTitle.BackColor = Color.Transparent;
            lblTitle.Font = new Font("Segoe UI", 16f, FontStyle.Bold);
            lblTitle.Location = new Point(92, 20);
            lblTitle.AutoSize = true;

            Label lblSub = new Label();
            lblSub.Text = "Tự động gửi Thiệp Sinh nhật, Lễ Tết & Trợ lý AI Tự học Giọng văn Zalo";
            lblSub.ForeColor = Color.FromArgb(30, 41, 59);
            lblSub.BackColor = Color.Transparent;
            lblSub.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblSub.Location = new Point(94, 54);
            lblSub.AutoSize = true;

            Label lblBadge = new Label();
            lblBadge.Text = "✨ Phiên bản Desktop 2.0 • Tích hợp Bộ Não AI CSKH 24/7";
            lblBadge.ForeColor = Color.FromArgb(0, 104, 255);
            lblBadge.BackColor = Color.Transparent;
            lblBadge.Font = new Font("Segoe UI", 8.5f, FontStyle.Regular);
            lblBadge.Location = new Point(94, 80);
            lblBadge.AutoSize = true;

            header.Controls.Add(lblTitle);
            header.Controls.Add(lblSub);
            header.Controls.Add(lblBadge);
            this.Controls.Add(header);

            // Install Path Label & Box
            Label lblPath = new Label();
            lblPath.Text = "Thư mục cài đặt Zalo Care Bot trên máy tính này:";
            lblPath.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblPath.ForeColor = Color.FromArgb(30, 41, 59);
            lblPath.Location = new Point(24, 146);
            lblPath.AutoSize = true;
            this.Controls.Add(lblPath);

            string defaultDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Zalo-Care-Bot");
            txtInstallPath = new TextBox();
            txtInstallPath.Text = defaultDir;
            txtInstallPath.Location = new Point(24, 172);
            txtInstallPath.Size = new Size(485, 28);
            this.Controls.Add(txtInstallPath);

            btnBrowse = new Button();
            btnBrowse.Text = "Chọn...";
            btnBrowse.Location = new Point(520, 170);
            btnBrowse.Size = new Size(96, 29);
            btnBrowse.BackColor = Color.White;
            btnBrowse.FlatStyle = FlatStyle.System;
            btnBrowse.Click += (s, e) => {
                using (var fbd = new FolderBrowserDialog()) {
                    fbd.SelectedPath = txtInstallPath.Text;
                    if (fbd.ShowDialog() == DialogResult.OK) {
                        txtInstallPath.Text = Path.Combine(fbd.SelectedPath, "Zalo-Care-Bot");
                    }
                }
            };
            this.Controls.Add(btnBrowse);

            // Options
            chkDesktopShortcut = new CheckBox();
            chkDesktopShortcut.Text = "Tạo biểu tượng ứng dụng Zalo Care Bot ngoài màn hình chính (Desktop & Start Menu)";
            chkDesktopShortcut.Checked = true;
            chkDesktopShortcut.Location = new Point(24, 210);
            chkDesktopShortcut.AutoSize = true;
            this.Controls.Add(chkDesktopShortcut);

            chkLaunchNow = new CheckBox();
            chkLaunchNow.Text = "Khởi động ứng dụng Zalo Care Bot ngay sau khi cài đặt hoàn tất";
            chkLaunchNow.Checked = true;
            chkLaunchNow.Location = new Point(24, 238);
            chkLaunchNow.AutoSize = true;
            this.Controls.Add(chkLaunchNow);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(24, 274);
            progressBar.Size = new Size(592, 22);
            progressBar.Minimum = 0;
            progressBar.Maximum = 100;
            progressBar.Value = 0;
            this.Controls.Add(progressBar);

            // Log Box
            txtLog = new TextBox();
            txtLog.Multiline = true;
            txtLog.ReadOnly = true;
            txtLog.ScrollBars = ScrollBars.Vertical;
            txtLog.BackColor = Color.FromArgb(15, 23, 42);
            txtLog.ForeColor = Color.FromArgb(226, 232, 240);
            txtLog.Font = new Font("Consolas", 9f);
            txtLog.Location = new Point(24, 306);
            txtLog.Size = new Size(592, 140);
            txtLog.Text = "Sẵn sàng cài đặt Zalo Care Bot.\\r\\nNhấn nút [BẮT ĐẦU CÀI ĐẶT NGAY] bên dưới để tiếp tục...";
            this.Controls.Add(txtLog);

            // Install Button
            btnInstall = new Button();
            btnInstall.Text = "🚀  BẮT ĐẦU CÀI ĐẶT ZALO CARE BOT NGAY";
            btnInstall.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnInstall.BackColor = Color.FromArgb(0, 104, 255);
            btnInstall.ForeColor = Color.White;
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Location = new Point(24, 460);
            btnInstall.Size = new Size(592, 44);
            btnInstall.Cursor = Cursors.Hand;
            btnInstall.Click += async (s, e) => await RunInstallationAsync();
            this.Controls.Add(btnInstall);
        }

        private void AppendLog(string msg)
        {
            if (this.InvokeRequired) {
                this.Invoke(new Action<string>(AppendLog), msg);
                return;
            }
            txtLog.AppendText("\\r\\n" + msg);
        }

        private void SetProgress(int val)
        {
            if (this.InvokeRequired) {
                this.Invoke(new Action<int>(SetProgress), val);
                return;
            }
            progressBar.Value = Math.Max(0, Math.Min(100, val));
        }

        private int RunCommand(string fileName, string args, string workingDir)
        {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = fileName;
            psi.Arguments = args;
            psi.WorkingDirectory = workingDir;
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.CreateNoWindow = true;

            string currentPath = Environment.GetEnvironmentVariable("PATH") ?? "";
            string nodeDir = @"C:\\Program Files\\nodejs";
            if (!currentPath.Contains(nodeDir)) {
                psi.EnvironmentVariables["PATH"] = currentPath + ";" + nodeDir;
            }

            using (Process p = Process.Start(psi)) {
                p.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog(e.Data); };
                p.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog(e.Data); };
                p.BeginOutputReadLine();
                p.BeginErrorReadLine();
                p.WaitForExit();
                return p.ExitCode;
            }
        }

        private bool IsNodeInstalled()
        {
            try {
                if (File.Exists(@"C:\\Program Files\\nodejs\\node.exe")) return true;
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c node -v");
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                using (Process p = Process.Start(psi)) {
                    p.WaitForExit(4000);
                    return p.ExitCode == 0;
                }
            } catch {
                return false;
            }
        }

        private async Task RunInstallationAsync()
        {
            string targetDir = txtInstallPath.Text.Trim();
            if (string.IsNullOrEmpty(targetDir)) {
                MessageBox.Show("Vui lòng chọn thư mục cài đặt!", "Thông báo", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnInstall.Enabled = false;
            btnBrowse.Enabled = false;
            txtInstallPath.ReadOnly = true;
            btnInstall.Text = "⏳ Đang cài đặt Zalo Care Bot, vui lòng đợi...";
            txtLog.Text = "=== BẮT ĐẦU QUÁ TRÌNH CÀI ĐẶT ZALO CARE BOT ===";

            bool createShortcuts = chkDesktopShortcut.Checked;
            bool launchNow = chkLaunchNow.Checked;

            await Task.Run(() => {
                try {
                    // 1. Extract payload.zip
                    SetProgress(15);
                    AppendLog("[1/4] Đang giải nén tệp tin ứng dụng Zalo Care Bot vào: " + targetDir);
                    if (!Directory.Exists(targetDir)) {
                        Directory.CreateDirectory(targetDir);
                    }

                    string tempZip = Path.Combine(Path.GetTempPath(), "zalocare_payload_" + Guid.NewGuid().ToString("N") + ".zip");
                    using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("ZaloCarePayload.zip")) {
                        using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write)) {
                            resStream.CopyTo(fs);
                        }
                    }

                    using (ZipArchive archive = ZipFile.OpenRead(tempZip)) {
                        foreach (ZipArchiveEntry entry in archive.Entries) {
                            string fullPath = Path.Combine(targetDir, entry.FullName);
                            string dirName = Path.GetDirectoryName(fullPath);
                            if (!string.IsNullOrEmpty(dirName) && !Directory.Exists(dirName)) {
                                Directory.CreateDirectory(dirName);
                            }
                            if (!string.IsNullOrEmpty(entry.Name)) {
                                entry.ExtractToFile(fullPath, true);
                            }
                        }
                    }
                    try { File.Delete(tempZip); } catch {}
                    SetProgress(35);
                    AppendLog("✓ Đã giải nén mã nguồn thành công.");

                    // 2. Check Node.js
                    AppendLog("[2/4] Đang kiểm tra môi trường thực thi Node.js...");
                    if (!IsNodeInstalled()) {
                        AppendLog("Máy tính chưa có Node.js. Đang tự động cài đặt Node.js LTS qua Windows Winget...");
                        RunCommand("cmd.exe", "/c winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent", targetDir);
                    } else {
                        AppendLog("✓ Đã tìm thấy Node.js trên máy tính.");
                    }
                    SetProgress(55);

                    // 3. Run npm install
                    AppendLog("[3/4] Đang cài đặt các gói thư viện Zalo & xử lý đồ họa thiệp (khoảng 15-25 giây)...");
                    RunCommand("cmd.exe", "/c npm.cmd install --no-audit --no-fund", targetDir);
                    SetProgress(85);

                    // 4. Create Desktop Shortcuts
                    if (createShortcuts) {
                        AppendLog("[4/4] Đang tạo biểu tượng Zalo Care Bot ngoài màn hình Desktop...");
                        RunCommand("cmd.exe", "/c node src/scripts/setupDesktopApp.js", targetDir);
                    }
                    SetProgress(100);
                    AppendLog("🎉 CÀI ĐẶT HOÀN TẤT 100%!");

                    if (launchNow) {
                        string vbsPath = Path.Combine(targetDir, "ZaloCare-App.vbs");
                        if (File.Exists(vbsPath)) {
                            Process.Start("wscript.exe", "\\"" + vbsPath + "\\"");
                        }
                    }

                    this.Invoke(new Action(() => {
                        btnInstall.Text = "✅ ĐÃ CÀI ĐẶT ZALO CARE BOT THÀNH CÔNG";
                        btnInstall.BackColor = Color.FromArgb(5, 150, 105);
                        MessageBox.Show(
                            "Cài đặt ứng dụng Zalo Care Bot thành công!\\n\\nBiểu tượng Zalo Care Bot đã được tạo ngoài màn hình Desktop.",
                            "Cài đặt hoàn tất",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Information
                        );
                        Application.Exit();
                    }));
                } catch (Exception ex) {
                    AppendLog("❌ LỖI CÀI ĐẶT: " + ex.Message);
                    this.Invoke(new Action(() => {
                        btnInstall.Enabled = true;
                        btnInstall.Text = "Thử Cài Đặt Lại";
                        MessageBox.Show("Có lỗi xảy ra: " + ex.Message, "Lỗi cài đặt", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }));
                }
            });
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
`;

function buildExe() {
  if (fs.existsSync(STAGING_ROOT)) {
    fs.rmSync(STAGING_ROOT, { recursive: true, force: true });
  }
  fs.mkdirSync(PAYLOAD_DIR, { recursive: true });

  // 1. Copy clean app files to PAYLOAD_DIR
  const filesToCopy = [
    'package.json',
    'server.js',
    'start-bot.bat',
    'Cai-Dat-Va-Chay-Ngay.bat',
    'ZaloCare-App.vbs',
    'README.md',
    'SKILL.md'
  ];

  for (const f of filesToCopy) {
    const srcFile = path.join(ROOT_DIR, f);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(PAYLOAD_DIR, f));
    }
  }

  copyRecursiveClean(path.join(ROOT_DIR, 'src'), path.join(PAYLOAD_DIR, 'src'));
  copyRecursiveClean(path.join(ROOT_DIR, 'public'), path.join(PAYLOAD_DIR, 'public'));
  fs.mkdirSync(path.join(PAYLOAD_DIR, 'data', 'cards'), { recursive: true });

  // 2. Create payload.zip with files at root of zip
  const psZip = `Compress-Archive -Path '${PAYLOAD_DIR}\\*' -DestinationPath '${PAYLOAD_ZIP}' -Force`;
  const encodedZip = Buffer.from(psZip, 'utf16le').toString('base64');
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedZip}`);
  console.log('✅ Đã nén payload sạch:', PAYLOAD_ZIP);

  // 3. Write C# source with UTF-8 BOM so csc.exe preserves Vietnamese strings accurately
  fs.writeFileSync(CS_FILE, '\uFEFF' + CSHARP_SOURCE, 'utf8');

  // 4. Compile using .NET Framework csc.exe into ZaloCare-Bot-Setup.exe with embedded Logo & Hero Banner!
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  const compileCmd = `"${cscPath}" /nologo /target:winexe /optimize+ /out:"${OUT_EXE_WORKSPACE}" /win32icon:"${ICO_PATH}" /resource:"${PAYLOAD_ZIP}",ZaloCarePayload.zip /resource:"${LOGO_PNG_PATH}",ZaloCareLogo.png /resource:"${HERO_PNG_PATH}",ZaloCareHero.png /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll "${CS_FILE}"`;

  execSync(compileCmd, { stdio: 'inherit' });

  // Copy to public/ so user can also download the .exe directly from the web dashboard!
  fs.copyFileSync(OUT_EXE_WORKSPACE, OUT_EXE_PUBLIC);

  // Clean up staging
  fs.rmSync(STAGING_ROOT, { recursive: true, force: true });

  const sizeKB = Math.round(fs.statSync(OUT_EXE_WORKSPACE).size / 1024);
  console.log(`🎉 Đã biên dịch thành công Bộ Cài Đặt Zalo Care Bot EXE (${sizeKB} KB): ${OUT_EXE_WORKSPACE}`);
}

buildExe();
