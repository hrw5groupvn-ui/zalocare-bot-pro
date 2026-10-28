const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

async function generateUiPreview() {
  const logoB64 = fs.readFileSync(path.join(PUBLIC_DIR, 'zalo-care-bot-mini-logo.png')).toString('base64');
  const heroB64 = fs.readFileSync(path.join(PUBLIC_DIR, 'zalo-care-bot-background.png')).toString('base64');
  const mascot3dB64 = fs.readFileSync(path.join(PUBLIC_DIR, 'zalo-care-bot-mascot-3d.png')).toString('base64');
  const iconSupportB64 = fs.readFileSync(path.join(PUBLIC_DIR, 'icon-support.png')).toString('base64');
  const iconChatB64 = fs.readFileSync(path.join(PUBLIC_DIR, 'icon-chat.png')).toString('base64');
  const iconAutoB64 = fs.readFileSync(path.join(PUBLIC_DIR, 'icon-automation.png')).toString('base64');
  const iconSecB64 = fs.readFileSync(path.join(PUBLIC_DIR, 'icon-security.png')).toString('base64');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="880" viewBox="0 0 1400 880">
    <defs>
      <linearGradient id="hdr" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0052cc"/>
        <stop offset="50%" stop-color="#0068FF"/>
        <stop offset="100%" stop-color="#0080ff"/>
      </linearGradient>
      <linearGradient id="heroBg" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="60%" stop-color="#f5f9ff"/>
        <stop offset="100%" stop-color="#dbeafe"/>
      </linearGradient>
      <linearGradient id="aiBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#172554"/>
      </linearGradient>
      <clipPath id="heroClip">
        <rect x="40" y="158" width="1320" height="220" rx="20"/>
      </clipPath>
    </defs>

    <!-- App Background -->
    <rect width="1400" height="880" fill="#f1f5f9"/>

    <!-- Top Header -->
    <rect width="1400" height="136" fill="url(#hdr)"/>
    <rect x="40" y="18" width="52" height="52" rx="14" fill="#ffffff"/>
    <image href="data:image/png;base64,${logoB64}" x="44" y="22" width="44" height="44"/>
    <text x="106" y="42" font-family="Segoe UI, Inter, sans-serif" font-size="22" font-weight="800" fill="#ffffff">Zalo Care Bot</text>
    <rect x="268" y="24" width="175" height="24" rx="12" fill="#34d399"/>
    <text x="355" y="40" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="12" font-weight="700" fill="#064e3b">● Đã kết nối Zalo Cá Nhân</text>
    <text x="106" y="64" font-family="Segoe UI, sans-serif" font-size="13" fill="#dbeafe">Hệ thống tự động gửi Thiệp chúc mừng Sinh nhật, Lễ Tết &amp; Trợ lý AI Tự học Giọng văn CSKH</text>

    <!-- Header Action Buttons -->
    <rect x="810" y="24" width="175" height="38" rx="10" fill="#34d399"/>
    <text x="897" y="48" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="12.5" font-weight="700" fill="#0f172a">🔄 Đồng bộ Danh bạ</text>
    <rect x="995" y="24" width="180" height="38" rx="10" fill="#fbbf24"/>
    <text x="1085" y="48" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="12.5" font-weight="800" fill="#0f172a">🤖 Thu nhỏ Mascot 3D</text>
    <rect x="1185" y="24" width="175" height="38" rx="10" fill="#ffffff"/>
    <text x="1272" y="48" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="12.5" font-weight="700" fill="#0068FF">⚙️ Cấu hình Zalo</text>

    <!-- 7 Navigation Tiles -->
    <g transform="translate(40, 82)">
      <rect x="0" y="0" width="180" height="40" rx="10" fill="#ffffff"/>
      <text x="90" y="25" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="700" fill="#0068FF">📊 Tổng quan</text>

      <rect x="190" y="0" width="180" height="40" rx="10" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.25"/>
      <text x="280" y="25" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#ffffff">👥 Khách hàng</text>

      <rect x="380" y="0" width="180" height="40" rx="10" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.25"/>
      <text x="470" y="25" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#ffffff">🎨 Mẫu &amp; Thiệp</text>

      <rect x="570" y="0" width="180" height="40" rx="10" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.25"/>
      <text x="660" y="25" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#ffffff">🧧 Lịch Lễ / Tết</text>

      <rect x="760" y="0" width="180" height="40" rx="10" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.25"/>
      <text x="850" y="25" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#ffffff">🧠 AI CSKH &amp; Tự động</text>

      <rect x="950" y="0" width="180" height="40" rx="10" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.25"/>
      <text x="1040" y="25" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#ffffff">🔌 Kết nối Zalo</text>

      <rect x="1140" y="0" width="180" height="40" rx="10" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.25"/>
      <text x="1230" y="25" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#ffffff">📜 Lịch sử gửi</text>
    </g>

    <!-- Hero Banner with 3D Robot -->
    <g clip-path="url(#heroClip)">
      <rect x="40" y="158" width="1320" height="220" rx="20" fill="url(#heroBg)" stroke="#bfdbfe"/>
      <image href="data:image/png;base64,${heroB64}" x="760" y="140" width="620" height="256" preserveAspectRatio="xMidYMid slice"/>
      <rect x="68" y="182" width="420" height="26" rx="13" fill="#dbeafe"/>
      <text x="84" y="199" font-family="Segoe UI, sans-serif" font-size="11.5" font-weight="800" fill="#0054d1">✨ ZALO CARE BOT AI 2.0 • TRỢ LÝ CHĂM SÓC KHÁCH HÀNG THÔNG MINH</text>
      <text x="68" y="242" font-family="Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#0f172a">Chăm sóc khách hàng tự động &amp; <tspan fill="#0068FF">Tự học giọng văn Zalo</tspan></text>
      <text x="68" y="274" font-family="Segoe UI, sans-serif" font-size="14" fill="#475569">Tự động thiết kế &amp; gửi thiệp chúc mừng Sinh nhật, Lễ Tết, Kỷ niệm in Logo riêng, đồng bộ danh bạ</text>
      <text x="68" y="296" font-family="Segoe UI, sans-serif" font-size="14" fill="#475569">và tích hợp Bộ não AI đọc hiểu lịch sử trò chuyện để phản hồi khách hàng 24/7 như người thật.</text>

      <rect x="68" y="316" width="215" height="40" rx="10" fill="#0068FF"/>
      <text x="175" y="341" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="700" fill="#ffffff">🚀 Gửi Chúc Mừng Hôm Nay</text>

      <rect x="295" y="316" width="205" height="40" rx="10" fill="#4f46e5"/>
      <text x="397" y="341" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="700" fill="#ffffff">🧠 Mở Bộ Não AI Tự Học</text>

      <rect x="512" y="316" width="210" height="40" rx="10" fill="#ffffff" stroke="#cbd5e1"/>
      <text x="617" y="341" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="700" fill="#334155">🎨 Thiết Kế Thiệp Chúc Mừng</text>
    </g>

    <!-- 4 KPI Cards with Custom Mascot Icons -->
    <g transform="translate(40, 398)">
      <rect x="0" y="0" width="315" height="106" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
      <text x="24" y="34" font-family="Segoe UI, sans-serif" font-size="12" font-weight="700" fill="#64748b">TỔNG KHÁCH HÀNG ZALO</text>
      <text x="24" y="74" font-family="Segoe UI, sans-serif" font-size="34" font-weight="800" fill="#0f172a">1,648</text>
      <text x="24" y="94" font-family="Segoe UI, sans-serif" font-size="12" fill="#64748b">Đã đồng bộ tên, giới tính &amp; ngày sinh</text>
      <image href="data:image/png;base64,${iconSupportB64}" x="232" y="18" width="68" height="68"/>

      <rect x="335" y="0" width="315" height="106" rx="16" fill="#ffffff" stroke="#fecdd3"/>
      <text x="359" y="34" font-family="Segoe UI, sans-serif" font-size="12" font-weight="700" fill="#e11d48">CẦN CHÚC MỪNG HÔM NAY</text>
      <text x="359" y="74" font-family="Segoe UI, sans-serif" font-size="34" font-weight="800" fill="#e11d48">12</text>
      <text x="359" y="94" font-family="Segoe UI, sans-serif" font-size="12" fill="#64748b">Tự động tạo thiệp PNG &amp; gửi lúc 08:00</text>
      <image href="data:image/png;base64,${iconChatB64}" x="567" y="18" width="68" height="68"/>

      <rect x="670" y="0" width="315" height="106" rx="16" fill="#ffffff" stroke="#fde68a"/>
      <text x="694" y="34" font-family="Segoe UI, sans-serif" font-size="12" font-weight="700" fill="#d97706">TỰ ĐỘNG HÓA &amp; HỌC GIỌNG VĂN</text>
      <text x="694" y="74" font-family="Segoe UI, sans-serif" font-size="34" font-weight="800" fill="#d97706">100%</text>
      <text x="694" y="94" font-family="Segoe UI, sans-serif" font-size="12" fill="#64748b">Tự học giọng văn trực tiếp từ Zalo</text>
      <image href="data:image/png;base64,${iconAutoB64}" x="902" y="18" width="68" height="68"/>

      <rect x="1005" y="0" width="315" height="106" rx="16" fill="#ffffff" stroke="#a7f3d0"/>
      <text x="1029" y="34" font-family="Segoe UI, sans-serif" font-size="12" font-weight="700" fill="#059669">GỬI AN TOÀN &amp; BẢO MẬT</text>
      <text x="1029" y="72" font-family="Segoe UI, sans-serif" font-size="26" font-weight="800" fill="#059669">Hoạt động 24/7</text>
      <text x="1029" y="94" font-family="Segoe UI, sans-serif" font-size="12" fill="#64748b">Tự nhường quyền 30p khi bạn chat thật</text>
      <image href="data:image/png;base64,${iconSecB64}" x="1237" y="18" width="68" height="68"/>
    </g>

    <!-- Bottom AI Brain & Luxury Greeting Card Preview Row -->
    <g transform="translate(40, 524)">
      <!-- Left: AI Brain Studio Preview -->
      <rect x="0" y="0" width="800" height="320" rx="20" fill="url(#aiBg)" stroke="#6366f1" stroke-opacity="0.4"/>
      <rect x="24" y="18" width="54" height="54" rx="14" fill="#ffffff"/>
      <image href="data:image/png;base64,${mascot3dB64}" x="26" y="20" width="50" height="50"/>
      <text x="90" y="44" font-family="Segoe UI, sans-serif" font-size="18" font-weight="800" fill="#ffffff">Bộ Não AI Chăm Sóc Khách Hàng &amp; Tự Học Giọng Văn Zalo</text>
      <text x="90" y="64" font-family="Segoe UI, sans-serif" font-size="12.5" fill="#93c5fd">Đọc lịch sử tin nhắn Zalo để học cách xưng hô, từ ngữ quen dùng và tự động tư vấn khách hàng</text>

      <rect x="540" y="24" width="236" height="38" rx="10" fill="#fbbf24"/>
      <text x="658" y="48" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="12.5" font-weight="800" fill="#0f172a">📥 Quét &amp; Học Lịch sử Chat Zalo</text>

      <rect x="24" y="88" width="366" height="208" rx="14" fill="#0f172a" fill-opacity="0.75" stroke="#334155"/>
      <text x="42" y="116" font-family="Segoe UI, sans-serif" font-size="13.5" font-weight="700" fill="#fcd34d">🗣️ Hồ sơ Giọng văn AI đã rút trích từ bạn:</text>
      <text x="42" y="144" font-family="Segoe UI, sans-serif" font-size="12.5" fill="#6ee7b7">• Tự động xưng &quot;em&quot;, gọi khách &quot;Anh/Chị + Tên gọi&quot;</text>
      <text x="42" y="168" font-family="Segoe UI, sans-serif" font-size="12.5" fill="#6ee7b7">• Thói quen dùng từ cuối câu thân thiện: &quot;nhé&quot;, &quot;ạ&quot;, &quot;dạ&quot;</text>
      <text x="42" y="192" font-family="Segoe UI, sans-serif" font-size="12.5" fill="#6ee7b7">• Kết hợp Smart Local RAG + Google Gemini / OpenAI</text>
      <text x="42" y="216" font-family="Segoe UI, sans-serif" font-size="12.5" fill="#93c5fd">• Tự động tạm dừng Bot 30 phút khi bạn cầm máy nhắn</text>

      <rect x="410" y="88" width="366" height="208" rx="14" fill="#0f172a" fill-opacity="0.75" stroke="#334155"/>
      <text x="428" y="116" font-family="Segoe UI, sans-serif" font-size="13.5" font-weight="700" fill="#fcd34d">💬 Bộ nhớ Hội thoại Mẫu đã học trên Zalo:</text>
      <rect x="428" y="130" width="330" height="68" rx="8" fill="#1e293b"/>
      <text x="440" y="152" font-family="Segoe UI, sans-serif" font-size="12" fill="#e2e8f0">👤 Khách hỏi: &quot;Tư vấn giúp anh thiết kế biệt thự 2 tầng&quot;</text>
      <text x="440" y="176" font-family="Segoe UI, sans-serif" font-size="12" font-weight="700" fill="#34d399">🗣️ Bạn trả lời: &quot;Dạ chào Anh Minh! Bên em xin gửi báo giá...&quot;</text>

      <rect x="428" y="208" width="330" height="68" rx="8" fill="#1e293b"/>
      <text x="440" y="230" font-family="Segoe UI, sans-serif" font-size="12" fill="#e2e8f0">👤 Khách hỏi: &quot;Cảm ơn em nhé, thiệp sinh nhật đẹp quá!&quot;</text>
      <text x="440" y="254" font-family="Segoe UI, sans-serif" font-size="12" font-weight="700" fill="#34d399">🗣️ Bạn trả lời: &quot;Dạ em cảm ơn Chị Lan Anh nhiều ạ! ❤️&quot;</text>

      <!-- Right: Automated Greeting Card Studio Preview -->
      <rect x="820" y="0" width="500" height="320" rx="20" fill="#ffffff" stroke="#e2e8f0"/>
      <text x="846" y="36" font-family="Segoe UI, sans-serif" font-size="16" font-weight="800" fill="#0f172a">🎨 Tự động Thiết kế Thiệp Chúc Mừng Cá Nhân Hóa</text>
      <rect x="846" y="52" width="448" height="244" rx="14" fill="#0b0e17" stroke="#d4af37" stroke-width="2"/>
      <text x="1070" y="105" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="700" fill="#fde047">✦ CHÚC MỪNG SINH NHẬT QUÝ KHÁCH ✦</text>
      <text x="1070" y="145" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#ffffff">Anh Nguyễn Minh Tuấn</text>
      <text x="1070" y="182" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" fill="#e2e8f0">Chúc Anh tuổi mới dồi dào sức khỏe, hạnh phúc và thành công rực rỡ!</text>
      <rect x="960" y="212" width="220" height="36" rx="18" fill="#d4af37"/>
      <text x="1070" y="235" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" font-weight="800" fill="#0b0e17">🎁 MÃ ƯU ĐÃI: HPBD-VIP</text>
    </g>

    <!-- Floating 3D Mascot with Belly Clock at Bottom-Right Corner -->
    <g transform="translate(1205, 650)">
      <rect x="-15" y="-26" width="190" height="28" rx="14" fill="#ffffff" stroke="#0068FF" stroke-width="2"/>
      <circle cx="-1" cy="-12" r="4.5" fill="#10b981"/>
      <text x="85" y="-8" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="11" font-weight="800" fill="#0f172a">Đang trực Zalo 24/7</text>
      <ellipse cx="85" cy="202" rx="45" ry="8" fill="#0f172a" opacity="0.28"/>
      <image href="data:image/png;base64,${mascot3dB64}" x="-5" y="4" width="185" height="185"/>
      <rect x="55" y="114" width="52" height="24" rx="9" fill="#061844" stroke="#7df9ff" stroke-width="2"/>
      <text x="81" y="130" text-anchor="middle" font-family="Consolas, monospace" font-size="11.5" font-weight="800" fill="#a5f3fc">21:10</text>
    </g>
  </svg>`;

  const outPath = path.join(PUBLIC_DIR, 'ui-preview.png');
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log('✅ Đã tạo ảnh chụp giao diện Zalo Care Bot (kèm bộ icon mới):', outPath);
}

generateUiPreview().catch((err) => {
  console.error(err);
  process.exit(1);
});
