const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..', '..');
const OUT_MASCOT_EXE = path.join(ROOT_DIR, 'ZaloCareMascot.exe');
const ICO_PATH = path.join(ROOT_DIR, 'public', 'zalo-care-bot-icon.ico');
const HAPPY_PNG = path.join(ROOT_DIR, 'public', 'mascot-3d-happy.png');
const BASE_PNG = path.join(ROOT_DIR, 'public', 'mascot-3d-base.png');
const TEMP_CS = path.join(ROOT_DIR, 'data', '_MascotProgram.cs');

const CSHARP_MASCOT = `
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ZaloCareMascotApp
{
    public class MascotForm : Form
    {
        [DllImport("user32.dll", ExactSpelling = true, SetLastError = true)]
        public static extern bool UpdateLayeredWindow(IntPtr hwnd, IntPtr hdcDst, ref Point pptDst, ref Size psize, IntPtr hdcSrc, ref Point pprSrc, int crKey, ref BLENDFUNCTION pblend, int dwFlags);

        [DllImport("gdi32.dll", ExactSpelling = true, SetLastError = true)]
        public static extern IntPtr CreateCompatibleDC(IntPtr hDC);

        [DllImport("gdi32.dll", ExactSpelling = true)]
        public static extern bool DeleteDC(IntPtr hdc);

        [DllImport("gdi32.dll", ExactSpelling = true)]
        public static extern IntPtr SelectObject(IntPtr hDC, IntPtr hObject);

        [DllImport("gdi32.dll", ExactSpelling = true)]
        public static extern bool DeleteObject(IntPtr hObject);

        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        public const int SW_MINIMIZE = 6;
        public const int SW_RESTORE = 9;

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        public struct BLENDFUNCTION
        {
            public byte BlendOp;
            public byte BlendFlags;
            public byte SourceConstantAlpha;
            public byte AlphaFormat;
        }

        private Timer animTimer;
        private Timer statusPollTimer;
        private double tick = 0;

        // Emotions: "happy", "ai_code", "excited", "sleepy"
        private string currentEmotion = "happy";
        private string statusBubbleText = "Đang trực Zalo 24/7";
        private int bubbleAlpha = 235;
        private double jumpBoost = 0;

        private Image imgHappy3D;
        private Image imgBase3D;

        private bool isDragging = false;
        private Point dragStartMouse;
        private Point dragStartForm;
        private bool movedDuringDrag = false;

        private ContextMenuStrip trayMenu;

        public MascotForm(bool minimizeMainOnStart)
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.TopMost = true;
            this.Width = 270;
            this.Height = 320;

            LoadEmbedded3DImages();

            Rectangle workArea = Screen.PrimaryScreen.WorkingArea;
            this.Location = new Point(workArea.Right - this.Width - 16, workArea.Bottom - this.Height - 8);

            BuildContextMenu();

            if (minimizeMainOnStart) {
                MinimizeMainZaloCareWindow();
                statusBubbleText = "Đã thu nhỏ thành Mascot 3D!";
                bubbleAlpha = 255;
                jumpBoost = 12;
            }

            animTimer = new Timer();
            animTimer.Interval = 33; // ~30 FPS
            animTimer.Tick += (s, e) => {
                tick += 0.11;
                if (jumpBoost > 0.2) jumpBoost *= 0.85;
                else jumpBoost = 0;
                RenderFrame();
            };
            animTimer.Start();

            statusPollTimer = new Timer();
            statusPollTimer.Interval = 3500;
            statusPollTimer.Tick += async (s, e) => await PollServerStatusAsync();
            statusPollTimer.Start();

            this.MouseDown += OnMascotMouseDown;
            this.MouseMove += OnMascotMouseMove;
            this.MouseUp += OnMascotMouseUp;
            this.MouseDoubleClick += (s, e) => {
                if (e.Button == MouseButtons.Left) {
                    RestoreOrOpenMainApp();
                }
            };
        }

        private void LoadEmbedded3DImages()
        {
            try {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s1 = asm.GetManifestResourceStream("Mascot3DHappy.png")) {
                    if (s1 != null) imgHappy3D = Image.FromStream(s1);
                }
                using (Stream s2 = asm.GetManifestResourceStream("Mascot3DBase.png")) {
                    if (s2 != null) imgBase3D = Image.FromStream(s2);
                }
            } catch {}
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= 0x00080000; // WS_EX_LAYERED
                cp.ExStyle |= 0x00000008; // WS_EX_TOPMOST
                cp.ExStyle |= 0x00000080; // WS_EX_TOOLWINDOW
                return cp;
            }
        }

        private void BuildContextMenu()
        {
            trayMenu = new ContextMenuStrip();
            trayMenu.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            var itemOpen = new ToolStripMenuItem("🔍 Mở lại giao diện Zalo Care Bot");
            itemOpen.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            itemOpen.Click += (s, e) => RestoreOrOpenMainApp();
            trayMenu.Items.Add(itemOpen);

            trayMenu.Items.Add(new ToolStripSeparator());

            var itemHappy = new ToolStripMenuItem("😊 Biểu cảm: Vui vẻ 3D (Mặc định)");
            itemHappy.Click += (s, e) => SetEmotion("happy", "Zalo Care Bot • Trực 24/7!");
            trayMenu.Items.Add(itemHappy);

            var itemAi = new ToolStripMenuItem("💻 Biểu cảm: Trợ lý AI Code (>_ )");
            itemAi.Click += (s, e) => SetEmotion("ai_code", "Bộ não AI đang trực Zalo 24/7");
            trayMenu.Items.Add(itemAi);

            var itemExcited = new ToolStripMenuItem("🎉 Biểu cảm: Hào hứng chúc mừng (★_★)");
            itemExcited.Click += (s, e) => SetEmotion("excited", "Sẵn sàng gửi thiệp chúc mừng!");
            trayMenu.Items.Add(itemExcited);

            var itemSleepy = new ToolStripMenuItem("😴 Biểu cảm: Tạm nghỉ ngơi (Zzz)");
            itemSleepy.Click += (s, e) => SetEmotion("sleepy", "Zzz... Đang tạm nghỉ ngơi");
            trayMenu.Items.Add(itemSleepy);

            trayMenu.Items.Add(new ToolStripSeparator());

            var itemMin = new ToolStripMenuItem("🔽 Thu nhỏ cửa sổ chính");
            itemMin.Click += (s, e) => MinimizeMainZaloCareWindow();
            trayMenu.Items.Add(itemMin);

            var itemExit = new ToolStripMenuItem("❌ Đóng Mascot");
            itemExit.Click += (s, e) => Application.Exit();
            trayMenu.Items.Add(itemExit);
        }

        private void SetEmotion(string emo, string text)
        {
            currentEmotion = emo;
            statusBubbleText = SanitizeStatusText(text);
            bubbleAlpha = 255;
            jumpBoost = 10;
        }

        private string SanitizeStatusText(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return "Zalo Care Bot • 24/7";
            // Strip surrogate pair emojis so GDI+ never renders square boxes []
            string cleaned = Regex.Replace(raw, @"[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]", "").Trim();
            cleaned = Regex.Replace(cleaned, @"^[\\u2600-\\u27BF]+", "").Trim();
            if (cleaned.Contains("Zalo UID:")) {
                cleaned = "Đang trực Zalo • Hoàn Phạm";
            }
            if (cleaned.Length > 34) {
                cleaned = cleaned.Substring(0, 32) + "...";
            }
            return string.IsNullOrEmpty(cleaned) ? "Zalo Care Bot • 24/7" : cleaned;
        }

        private void CycleEmotion()
        {
            if (currentEmotion == "happy") SetEmotion("ai_code", "Chế độ AI Tư vấn & Học giọng văn");
            else if (currentEmotion == "ai_code") SetEmotion("excited", "Sẵn sàng gửi thiệp & CSKH!");
            else if (currentEmotion == "excited") SetEmotion("sleepy", "Zzz... Chạm đúp để mở App");
            else SetEmotion("happy", "Zalo Care Bot xin chào bạn!");
        }

        private void OnMascotMouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left) {
                isDragging = true;
                movedDuringDrag = false;
                dragStartMouse = Control.MousePosition;
                dragStartForm = this.Location;
            } else if (e.Button == MouseButtons.Right) {
                trayMenu.Show(Control.MousePosition);
            }
        }

        private void OnMascotMouseMove(object sender, MouseEventArgs e)
        {
            if (isDragging) {
                Point cur = Control.MousePosition;
                int dx = cur.X - dragStartMouse.X;
                int dy = cur.Y - dragStartMouse.Y;
                if (Math.Abs(dx) > 4 || Math.Abs(dy) > 4) {
                    movedDuringDrag = true;
                }
                this.Location = new Point(dragStartForm.X + dx, dragStartForm.Y + dy);
            }
        }

        private void OnMascotMouseUp(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left && isDragging) {
                isDragging = false;
                if (!movedDuringDrag) {
                    CycleEmotion();
                }
            }
        }

        public static void MinimizeMainZaloCareWindow()
        {
            EnumWindows((hWnd, lParam) => {
                if (!IsWindowVisible(hWnd)) return true;
                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (title.IndexOf("Zalo Care Bot", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("ZaloCare", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("localhost:3088", StringComparison.OrdinalIgnoreCase) >= 0) {
                    ShowWindow(hWnd, SW_MINIMIZE);
                }
                return true;
            }, IntPtr.Zero);
        }

        public static void RestoreOrOpenMainApp()
        {
            bool foundWindow = false;
            EnumWindows((hWnd, lParam) => {
                if (!IsWindowVisible(hWnd)) return true;
                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (title.IndexOf("Zalo Care Bot", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("ZaloCare", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("localhost:3088", StringComparison.OrdinalIgnoreCase) >= 0) {
                    ShowWindow(hWnd, SW_RESTORE);
                    SetForegroundWindow(hWnd);
                    foundWindow = true;
                }
                return true;
            }, IntPtr.Zero);

            if (!foundWindow) {
                try {
                    Process.Start("msedge.exe", "--app=http://localhost:3088 --window-size=1400,880");
                } catch {
                    try { Process.Start("http://localhost:3088"); } catch {}
                }
            }
        }

        private async Task PollServerStatusAsync()
        {
            try {
                await Task.Run(() => {
                    using (WebClient wc = new WebClient()) {
                        wc.Encoding = Encoding.UTF8;
                        string json = wc.DownloadString("http://localhost:3088/api/mascot/status");
                        if (!string.IsNullOrEmpty(json)) {
                            if (json.Contains("\\"triggerMinimize\\":true")) {
                                this.Invoke(new Action(() => {
                                    MinimizeMainZaloCareWindow();
                                    statusBubbleText = "Đã thu nhỏ thành Mascot 3D!";
                                    bubbleAlpha = 255;
                                    jumpBoost = 12;
                                }));
                            }
                            string emo = ExtractJsonValue(json, "emotion");
                            string st = ExtractJsonValue(json, "statusText");
                            if (!string.IsNullOrEmpty(emo)) currentEmotion = emo;
                            if (!string.IsNullOrEmpty(st)) statusBubbleText = SanitizeStatusText(st);
                        }
                    }
                });
            } catch {}
        }

        private string ExtractJsonValue(string json, string key)
        {
            string pattern = "\\"" + key + "\\":\\"";
            int idx = json.IndexOf(pattern);
            if (idx < 0) return "";
            idx += pattern.Length;
            int end = json.IndexOf("\\"", idx);
            if (end < 0) return "";
            return json.Substring(idx, end - idx);
        }

        private GraphicsPath CreateRoundedRect(RectangleF rect, float radius)
        {
            float d = radius * 2f;
            GraphicsPath path = new GraphicsPath();
            if (radius <= 0f) {
                path.AddRectangle(rect);
                return path;
            }
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        private void DrawStar(Graphics g, float cx, float cy, float outerR, float innerR, Brush fillBrush, Pen borderPen)
        {
            PointF[] pts = new PointF[10];
            for (int i = 0; i < 10; i++) {
                double angle = -Math.PI / 2 + i * Math.PI / 5;
                float r = (i % 2 == 0) ? outerR : innerR;
                pts[i] = new PointF(cx + (float)(Math.Cos(angle) * r), cy + (float)(Math.Sin(angle) * r));
            }
            if (fillBrush != null) g.FillPolygon(fillBrush, pts);
            if (borderPen != null) g.DrawPolygon(borderPen, pts);
        }

        private void RenderFrame()
        {
            using (Bitmap bmp = new Bitmap(this.Width, this.Height, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
                g.Clear(Color.Transparent);

                float floatY = (float)(Math.Sin(tick) * 6.5 - jumpBoost);
                float cx = this.Width / 2f;

                // 1. Floating Ground Shadow Oval
                float shadowScale = 1.0f - (float)(Math.Sin(tick) * 0.10);
                float sw = 92f * shadowScale;
                float sh = 14f * shadowScale;
                using (SolidBrush shadowBr = new SolidBrush(Color.FromArgb(65, 15, 23, 42))) {
                    g.FillEllipse(shadowBr, cx - sw / 2f, 292f, sw, sh);
                }

                // 2. Speech Bubble on Top (Clean, centered, never clipped!)
                if (!string.IsNullOrEmpty(statusBubbleText)) {
                    RectangleF bubbleRect = new RectangleF(10f, 6f + floatY * 0.25f, this.Width - 20f, 32f);
                    using (GraphicsPath bp = CreateRoundedRect(bubbleRect, 14f))
                    using (SolidBrush bgBr = new SolidBrush(Color.FromArgb(245, 255, 255, 255)))
                    using (Pen borderPen = new Pen(Color.FromArgb(230, 0, 104, 255), 2f)) {
                        g.FillPath(bgBr, bp);
                        g.DrawPath(borderPen, bp);
                    }

                    // Status dot (green/cyan/amber)
                    Color dotColor = currentEmotion == "sleepy" ? Color.FromArgb(245, 158, 11) : Color.FromArgb(16, 185, 129);
                    using (SolidBrush dotBr = new SolidBrush(dotColor)) {
                        g.FillEllipse(dotBr, 20f, 17f + floatY * 0.25f, 9f, 9f);
                    }

                    using (Font bf = new Font("Segoe UI", 8.5f, FontStyle.Bold))
                    using (SolidBrush txtBr = new SolidBrush(Color.FromArgb(245, 15, 23, 42))) {
                        StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                        RectangleF textArea = new RectangleF(30f, 6f + floatY * 0.25f, this.Width - 44f, 32f);
                        g.DrawString(statusBubbleText, bf, txtBr, textArea, sf);
                    }
                }

                // 3. Draw Authentic 3D Mascot Image (246x246 inside 270x320 window)
                float mascotSize = 248f;
                float mx = (this.Width - mascotSize) / 2f;
                float my = 42f + floatY;
                float scale = mascotSize / 512f;

                bool isBlinking = ((int)(tick * 10) % 45 == 0);
                bool useHappyOriginal = (currentEmotion == "happy" && !isBlinking && imgHappy3D != null);
                Image activeImg = useHappyOriginal ? imgHappy3D : (imgBase3D ?? imgHappy3D);

                if (activeImg != null) {
                    g.DrawImage(activeImg, new RectangleF(mx, my, mascotSize, mascotSize));
                }

                // 4. Overlay Custom 3D Visor Facial Emotions when not using static Happy face
                // On 512x512 image, Visor Center is (250, 203), tilted by +6 degrees
                if (!useHappyOriginal) {
                    float visorCx = mx + 250f * scale;
                    float visorCy = my + 203f * scale;

                    GraphicsState visorState = g.Save();
                    g.TranslateTransform(visorCx, visorCy);
                    g.RotateTransform(6.0f);

                    if (currentEmotion == "happy" && isBlinking) {
                        using (Pen blinkPen = new Pen(Color.White, 4.2f)) {
                            blinkPen.StartCap = LineCap.Round;
                            blinkPen.EndCap = LineCap.Round;
                            g.DrawLine(blinkPen, -36f, 0f, -14f, 0f);
                            g.DrawLine(blinkPen, 14f, 0f, 36f, 0f);
                            g.DrawArc(blinkPen, -11f, 6f, 22f, 12f, 15, 150);
                        }
                    } else if (currentEmotion == "ai_code") {
                        // Glowing >_ AI Code Terminal Eyes
                        using (Pen glowPen = new Pen(Color.FromArgb(90, 56, 189, 248), 8f))
                        using (Pen codePen = new Pen(Color.FromArgb(255, 125, 249, 255), 4.5f)) {
                            glowPen.StartCap = LineCap.Round;
                            glowPen.EndCap = LineCap.Round;
                            glowPen.LineJoin = LineJoin.Round;
                            codePen.StartCap = LineCap.Round;
                            codePen.EndCap = LineCap.Round;
                            codePen.LineJoin = LineJoin.Round;

                            PointF[] arrow = new PointF[] {
                                new PointF(-36f, -12f),
                                new PointF(-16f, 0f),
                                new PointF(-36f, 12f)
                            };
                            g.DrawLines(glowPen, arrow);
                            g.DrawLines(codePen, arrow);

                            if ((int)(tick * 3.2) % 2 == 0) {
                                g.DrawLine(glowPen, 6f, 12f, 34f, 12f);
                                g.DrawLine(codePen, 6f, 12f, 34f, 12f);
                            }
                        }
                    } else if (currentEmotion == "excited") {
                        // Sparkling Golden Stars ★ ★ + Big Smile
                        using (SolidBrush goldBr = new SolidBrush(Color.FromArgb(250, 204, 21)))
                        using (Pen whitePen = new Pen(Color.White, 1.5f)) {
                            DrawStar(g, -26f, -3f, 14f, 6.5f, goldBr, whitePen);
                            DrawStar(g, 26f, -3f, 14f, 6.5f, goldBr, whitePen);
                        }
                        using (Pen smilePen = new Pen(Color.White, 4.2f)) {
                            smilePen.StartCap = LineCap.Round;
                            smilePen.EndCap = LineCap.Round;
                            g.DrawArc(smilePen, -13f, 7f, 26f, 15f, 10, 160);
                        }
                    } else if (currentEmotion == "sleepy") {
                        // Sleeping Eyes + Zzz
                        using (Pen sleepPen = new Pen(Color.FromArgb(186, 230, 253), 4.2f)) {
                            sleepPen.StartCap = LineCap.Round;
                            sleepPen.EndCap = LineCap.Round;
                            g.DrawArc(sleepPen, -38f, -6f, 24f, 12f, 15, 150);
                            g.DrawArc(sleepPen, 14f, -6f, 24f, 12f, 15, 150);
                            g.DrawEllipse(sleepPen, -4f, 11f, 8f, 6f);
                        }
                        using (Font zFont = new Font("Segoe UI", 10f, FontStyle.Bold))
                        using (SolidBrush zBr = new SolidBrush(Color.FromArgb(220, 125, 249, 255))) {
                            float zy = -24f - (float)((tick * 4) % 14);
                            g.DrawString("Zzz", zFont, zBr, 24f, zy);
                        }
                    }

                    g.Restore(visorState);
                }

                // 5. 3D BELLY DIGITAL CLOCK (HH:mm)
                // Positioned right on the 3D robot's round white belly/chest: (236, 333) in 512x512 space
                float bellyCx = mx + 236f * scale;
                float bellyCy = my + 333f * scale;
                RectangleF clockOuter = new RectangleF(bellyCx - 35f, bellyCy - 16f, 70f, 32f);
                RectangleF clockInner = new RectangleF(bellyCx - 32f, bellyCy - 13f, 64f, 26f);

                using (GraphicsPath outerPath = CreateRoundedRect(clockOuter, 12f))
                using (GraphicsPath innerPath = CreateRoundedRect(clockInner, 10f))
                using (LinearGradientBrush rimBr = new LinearGradientBrush(clockOuter, Color.FromArgb(56, 189, 248), Color.FromArgb(0, 104, 255), 90f))
                using (LinearGradientBrush screenBr = new LinearGradientBrush(clockInner, Color.FromArgb(6, 24, 68), Color.FromArgb(2, 12, 38), 90f))
                using (Pen glowRim = new Pen(Color.FromArgb(180, 125, 249, 255), 1.5f)) {
                    g.FillPath(rimBr, outerPath);
                    g.FillPath(screenBr, innerPath);
                    g.DrawPath(glowRim, innerPath);
                }

                DateTime now = DateTime.Now;
                bool colonOn = (now.Millisecond < 550);
                string timeStr = colonOn ? now.ToString("HH:mm") : now.ToString("HH mm");

                using (Font clockFont = new Font("Consolas", 11.5f, FontStyle.Bold))
                using (SolidBrush clockGlow = new SolidBrush(Color.FromArgb(80, 56, 189, 248)))
                using (SolidBrush clockText = new SolidBrush(Color.FromArgb(255, 165, 243, 252))) {
                    StringFormat csf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                    g.DrawString(timeStr, clockFont, clockGlow, new RectangleF(clockInner.X + 1f, clockInner.Y + 1.5f, clockInner.Width, clockInner.Height), csf);
                    g.DrawString(timeStr, clockFont, clockText, new RectangleF(clockInner.X, clockInner.Y + 0.5f, clockInner.Width, clockInner.Height), csf);
                }

                // 6. Push 32-bit ARGB bitmap to Win32 Layered Window
                IntPtr screenDc = IntPtr.Zero;
                IntPtr memDc = CreateCompatibleDC(screenDc);
                IntPtr hBitmap = IntPtr.Zero;
                IntPtr oldBitmap = IntPtr.Zero;

                try {
                    hBitmap = bmp.GetHbitmap(Color.FromArgb(0));
                    oldBitmap = SelectObject(memDc, hBitmap);

                    Size size = new Size(this.Width, this.Height);
                    Point pointSource = new Point(0, 0);
                    Point topPos = new Point(this.Left, this.Top);

                    BLENDFUNCTION blend = new BLENDFUNCTION();
                    blend.BlendOp = 0;
                    blend.BlendFlags = 0;
                    blend.SourceConstantAlpha = 255;
                    blend.AlphaFormat = 1; // AC_SRC_ALPHA

                    UpdateLayeredWindow(this.Handle, screenDc, ref topPos, ref size, memDc, ref pointSource, 0, ref blend, 2);
                } finally {
                    if (hBitmap != IntPtr.Zero) {
                        SelectObject(memDc, oldBitmap);
                        DeleteObject(hBitmap);
                    }
                    DeleteDC(memDc);
                }
            }
        }

        [STAThread]
        public static void Main(string[] args)
        {
            bool minimizeMain = false;
            if (args != null) {
                foreach (string a in args) {
                    if (a == "--minimize-app") minimizeMain = true;
                }
            }

            Process current = Process.GetCurrentProcess();
            foreach (Process p in Process.GetProcessesByName(current.ProcessName)) {
                if (p.Id != current.Id) {
                    if (minimizeMain) {
                        MinimizeMainZaloCareWindow();
                        return;
                    }
                    try { p.Kill(); } catch {}
                }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MascotForm(minimizeMain));
        }
    }
}
`;

function compileMascot() {
  const dataDir = path.join(ROOT_DIR, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(TEMP_CS, '\uFEFF' + CSHARP_MASCOT, 'utf8');

  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  const iconArg = fs.existsSync(ICO_PATH) ? `/win32icon:"${ICO_PATH}"` : '';
  const resHappy = fs.existsSync(HAPPY_PNG) ? `/resource:"${HAPPY_PNG}",Mascot3DHappy.png` : '';
  const resBase = fs.existsSync(BASE_PNG) ? `/resource:"${BASE_PNG}",Mascot3DBase.png` : '';

  const cmd = `"${cscPath}" /nologo /target:winexe /optimize+ /out:"${OUT_MASCOT_EXE}" ${iconArg} ${resHappy} ${resBase} /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll "${TEMP_CS}"`;

  execSync(cmd, { stdio: 'inherit' });
  try {
    fs.unlinkSync(TEMP_CS);
  } catch (_) {}

  console.log('🎉 Đã biên dịch thành công Mascot 3D Hoạt Hình Desktop:', OUT_MASCOT_EXE);
}

compileMascot();
