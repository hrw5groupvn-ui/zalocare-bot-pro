const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { CARDS_DIR } = require('./dbService');
const { personalizeTemplate } = require('./personalizer');

const DEFAULT_LOGO_PATH = path.join(__dirname, '..', '..', 'public', 'logo-banviet.png');

let cachedDefaultLogoBase64 = null;
function getDefaultLogoDataUri() {
  if (cachedDefaultLogoBase64) return cachedDefaultLogoBase64;
  try {
    if (fs.existsSync(DEFAULT_LOGO_PATH)) {
      const buf = fs.readFileSync(DEFAULT_LOGO_PATH);
      cachedDefaultLogoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
      return cachedDefaultLogoBase64;
    }
  } catch (err) {
    console.warn('[CardGenerator] Could not read default logo:', err.message);
  }
  return '';
}

const CARD_THEMES = {
  banviet_obsidian_gold: {
    id: 'banviet_obsidian_gold',
    name: '✨ Bản Việt Signature — Đen Huyền Bí & Vàng 24K (Sang trọng nhất)',
    bgStart: '#090a0f',
    bgMid: '#141722',
    bgEnd: '#07080c',
    accent: '#d4af37',
    accentLight: '#f9e498',
    accentDark: '#997a15',
    textPrimary: '#ffffff',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    cardInnerBg: 'rgba(20, 23, 34, 0.65)',
    badgeBg: 'rgba(212, 175, 55, 0.14)',
    isLight: false
  },
  champagne_pearl: {
    id: 'champagne_pearl',
    name: '🥂 Ngọc Trai Champagne — Nền Kem Sáng & Vàng Đồng Tinh Tế',
    bgStart: '#fdfbf7',
    bgMid: '#f7f2e7',
    bgEnd: '#efe6d5',
    accent: '#b48a3e',
    accentLight: '#8c6622',
    accentDark: '#705018',
    textPrimary: '#1e293b',
    textSecondary: '#475569',
    textMuted: '#64748b',
    cardInnerBg: 'rgba(255, 255, 255, 0.78)',
    badgeBg: 'rgba(180, 138, 62, 0.12)',
    isLight: true
  },
  royal_gold: {
    id: 'royal_gold',
    name: '👑 Hoàng Gia Vàng Kim — Xanh Navy Đế Vương & Vàng Ánh Kim',
    bgStart: '#070e20',
    bgMid: '#0f1e3d',
    bgEnd: '#060b18',
    accent: '#e5b842',
    accentLight: '#fef08a',
    accentDark: '#a17415',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    cardInnerBg: 'rgba(15, 30, 61, 0.55)',
    badgeBg: 'rgba(229, 184, 66, 0.16)',
    isLight: false
  },
  emerald_luxury: {
    id: 'emerald_luxury',
    name: '💎 Ngọc Lục Bảo Hoàng Gia — Tri Ân Đối Tác & Khách VIP',
    bgStart: '#031d17',
    bgMid: '#06372c',
    bgEnd: '#021510',
    accent: '#d4af37',
    accentLight: '#fde68a',
    accentDark: '#9a7b1c',
    textPrimary: '#f8fafc',
    textSecondary: '#d1fae5',
    textMuted: '#a7f3d0',
    cardInnerBg: 'rgba(6, 55, 44, 0.55)',
    badgeBg: 'rgba(212, 175, 55, 0.16)',
    isLight: false
  },
  tet_crimson: {
    id: 'tet_crimson',
    name: '🧧 Đỏ Nhung Hoàng Cung — Lễ Tết & Xuân Thịnh Vượng',
    bgStart: '#3b070b',
    bgMid: '#691018',
    bgEnd: '#2a0407',
    accent: '#eab308',
    accentLight: '#fef08a',
    accentDark: '#a16207',
    textPrimary: '#fffbeb',
    textSecondary: '#fde68a',
    textMuted: '#fcd34d',
    cardInnerBg: 'rgba(75, 10, 15, 0.55)',
    badgeBg: 'rgba(234, 179, 8, 0.18)',
    isLight: false
  },
  rose_pastel: {
    id: 'rose_pastel',
    name: '🌸 Hồng Ngọc Thượng Lưu — Sinh Nhật Phái Đẹp / 8-3 / 20-10',
    bgStart: '#2e0819',
    bgMid: '#591231',
    bgEnd: '#240512',
    accent: '#f4b8c8',
    accentLight: '#ffe4e6',
    accentDark: '#d4af37',
    textPrimary: '#fff1f2',
    textSecondary: '#fecdd3',
    textMuted: '#fda4af',
    cardInnerBg: 'rgba(89, 18, 49, 0.5)',
    badgeBg: 'rgba(244, 184, 200, 0.16)',
    isLight: false
  },
  platinum_midnight: {
    id: 'platinum_midnight',
    name: '🏛️ Kiến Trúc Đương Đại — Xám Bạch Kim & Vàng Champagne',
    bgStart: '#18181b',
    bgMid: '#27272a',
    bgEnd: '#09090b',
    accent: '#d6b36a',
    accentLight: '#f5e0b5',
    accentDark: '#8c6d2e',
    textPrimary: '#fafafa',
    textSecondary: '#e4e4e7',
    textMuted: '#a1a1aa',
    cardInnerBg: 'rgba(39, 39, 42, 0.6)',
    badgeBg: 'rgba(214, 179, 106, 0.15)',
    isLight: false
  },
  festive_blue: {
    id: 'festive_blue',
    name: '🎉 Xanh Sapphire Lễ Hội — Sự Kiện & Kỷ Niệm Đặc Biệt',
    bgStart: '#08203e',
    bgMid: '#0c3666',
    bgEnd: '#051529',
    accent: '#e2b955',
    accentLight: '#fef08a',
    accentDark: '#9e781e',
    textPrimary: '#f0f9ff',
    textSecondary: '#e0f2fe',
    textMuted: '#bae6fd',
    cardInnerBg: 'rgba(12, 54, 102, 0.5)',
    badgeBg: 'rgba(226, 185, 85, 0.16)',
    isLight: false
  }
};

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapLines(text, maxCharsPerLine = 52) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function buildSvgString({
  themeKey = 'banviet_obsidian_gold',
  brandName = 'Bản Việt Design',
  recipientLine = 'Anh Nguyễn Minh Tuấn',
  cardTitle = 'CHÚC MỪNG SINH NHẬT',
  cardSubtitle = 'Chúc Anh Tuấn tuổi mới rạng rỡ, hạnh phúc & thành công!',
  voucherCode = '',
  hotline = '',
  logoDataUri = '',
  showLogo = true
}) {
  const theme = CARD_THEMES[themeKey] || CARD_THEMES.banviet_obsidian_gold;
  const subtitleLines = wrapLines(cardSubtitle, 52);
  const activeLogoUri = showLogo !== false ? logoDataUri || getDefaultLogoDataUri() : '';

  const subtitleTspans = subtitleLines
    .map((line, idx) => {
      const dy = idx === 0 ? 0 : 34;
      return `<tspan x="600" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  // Adjust vertical layout cleanly depending on whether logo is shown
  const hasLogo = Boolean(activeLogoUri);

  // Header Logo + Brand lockup
  const headerSection = hasLogo
    ? `
    <!-- Luxury Centerpiece Company Logo -->
    <g transform="translate(600, 122)">
      <!-- Subtle golden halo behind logo -->
      <circle cx="0" cy="0" r="68" fill="url(#glowCenter)" opacity="0.85"/>
      <!-- Architectural flanking wings -->
      <line x1="-280" y1="0" x2="-92" y2="0" stroke="url(#goldGrad)" stroke-width="1.2" opacity="0.6"/>
      <polygon points="-92,0 -84,-4 -76,0 -84,4" fill="${theme.accent}"/>
      <line x1="92" y1="0" x2="280" y2="0" stroke="url(#goldGrad)" stroke-width="1.2" opacity="0.6"/>
      <polygon points="92,0 84,-4 76,0 84,4" fill="${theme.accent}"/>
      <image href="${activeLogoUri}" x="-56" y="-64" width="112" height="128" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <!-- Watermark Logo in corner -->
    <image href="${activeLogoUri}" x="960" y="420" width="160" height="200" opacity="0.045" preserveAspectRatio="xMidYMid meet"/>
    `
    : `
    <!-- Brand Header Pill -->
    <g transform="translate(600, 112)">
      <rect x="-190" y="-22" width="380" height="40" rx="20" fill="${theme.badgeBg}" stroke="url(#goldGrad)" stroke-width="1.2"/>
      <text x="0" y="5" text-anchor="middle" fill="${theme.accentLight}" font-family="Georgia, 'Times New Roman', serif" font-size="16" font-weight="700" letter-spacing="3">
        ✦ ${escapeXml(brandName.toUpperCase())} ✦
      </text>
    </g>
    `;

  const titleY = hasLogo ? 240 : 205;
  const dividerY = hasLogo ? 262 : 230;
  const labelY = hasLogo ? 302 : 276;
  const recipientY = hasLogo ? 364 : 344;
  const subtitleY = hasLogo ? 426 : 414;

  const voucherBadge = voucherCode
    ? `
    <g transform="translate(600, 548)">
      <rect x="-220" y="-24" width="440" height="44" rx="22" fill="${theme.badgeBg}" stroke="url(#goldGrad)" stroke-width="1.5"/>
      <circle cx="-196" cy="-2" r="4" fill="${theme.accent}"/>
      <circle cx="196" cy="-2" r="4" fill="${theme.accent}"/>
      <text x="0" y="4" text-anchor="middle" fill="${theme.isLight ? theme.accentDark : theme.accentLight}" font-family="'Segoe UI', Roboto, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="1.5">
        QUÀ TẶNG ĐẶC QUYỀN: ${escapeXml(voucherCode)}
      </text>
    </g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bgStart}"/>
      <stop offset="50%" stop-color="${theme.bgMid}"/>
      <stop offset="100%" stop-color="${theme.bgEnd}"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.accentDark}"/>
      <stop offset="25%" stop-color="${theme.accent}"/>
      <stop offset="50%" stop-color="${theme.accentLight}"/>
      <stop offset="75%" stop-color="${theme.accent}"/>
      <stop offset="100%" stop-color="${theme.accentDark}"/>
    </linearGradient>
    <linearGradient id="goldVert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${theme.accentLight}"/>
      <stop offset="50%" stop-color="${theme.accent}"/>
      <stop offset="100%" stop-color="${theme.accentDark}"/>
    </linearGradient>
    <radialGradient id="glowCenter" cx="50%" cy="42%" r="52%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="${theme.isLight ? '0.18' : '0.24'}"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="archGrid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${theme.accent}" stroke-width="0.5" stroke-opacity="${theme.isLight ? '0.08' : '0.05'}"/>
    </pattern>
  </defs>

  <!-- Base Luxury Gradient Background -->
  <rect width="1200" height="675" fill="url(#bgGrad)"/>
  <rect width="1200" height="675" fill="url(#archGrid)"/>
  <circle cx="600" cy="290" r="520" fill="url(#glowCenter)"/>

  <!-- Ambient Silk Waves & Bokeh -->
  <path d="M 0 520 Q 320 430 640 530 T 1200 480 L 1200 675 L 0 675 Z" fill="${theme.accent}" opacity="${theme.isLight ? '0.04' : '0.03'}"/>
  <circle cx="130" cy="130" r="95" fill="${theme.accent}" opacity="0.05"/>
  <circle cx="1070" cy="545" r="120" fill="${theme.accent}" opacity="0.05"/>

  <!-- Outer Gold Architectural Frame -->
  <rect x="28" y="28" width="1144" height="619" rx="18" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" opacity="0.9"/>
  <!-- Inner Filigree Frame -->
  <rect x="42" y="42" width="1116" height="591" rx="12" fill="${theme.cardInnerBg}" stroke="url(#goldGrad)" stroke-width="1" opacity="0.75"/>
  <rect x="52" y="52" width="1096" height="571" rx="8" fill="none" stroke="${theme.accent}" stroke-width="0.6" stroke-dasharray="8,6" opacity="0.45"/>

  <!-- Art Deco Architectural Corner Ornaments (4 Corners) -->
  <!-- Top-Left -->
  <g stroke="url(#goldGrad)" stroke-width="2" fill="none" opacity="0.9">
    <path d="M 28 88 L 88 28"/>
    <path d="M 42 108 L 42 42 L 108 42"/>
    <rect x="36" y="36" width="14" height="14" stroke-width="1.5"/>
  </g>
  <!-- Top-Right -->
  <g stroke="url(#goldGrad)" stroke-width="2" fill="none" opacity="0.9">
    <path d="M 1112 28 L 1172 88"/>
    <path d="M 1092 42 L 1158 42 L 1158 108"/>
    <rect x="1150" y="36" width="14" height="14" stroke-width="1.5"/>
  </g>
  <!-- Bottom-Left -->
  <g stroke="url(#goldGrad)" stroke-width="2" fill="none" opacity="0.9">
    <path d="M 28 587 L 88 647"/>
    <path d="M 42 567 L 42 633 L 108 633"/>
    <rect x="36" y="625" width="14" height="14" stroke-width="1.5"/>
  </g>
  <!-- Bottom-Right -->
  <g stroke="url(#goldGrad)" stroke-width="2" fill="none" opacity="0.9">
    <path d="M 1112 647 L 1172 587"/>
    <path d="M 1092 633 L 1158 633 L 1158 567"/>
    <rect x="1150" y="625" width="14" height="14" stroke-width="1.5"/>
  </g>

  <!-- Subtle Sparkle Accents -->
  <g fill="${theme.accentLight}" opacity="0.65">
    <circle cx="190" cy="175" r="2.5"/>
    <circle cx="1010" cy="185" r="3"/>
    <circle cx="240" cy="495" r="2"/>
    <circle cx="960" cy="485" r="2.5"/>
  </g>

  <!-- Centerpiece Logo or Brand Pill -->
  ${headerSection}

  <!-- Occasion Main Title -->
  <text x="600" y="${titleY}" text-anchor="middle" fill="url(#goldGrad)" font-family="Georgia, 'Times New Roman', 'Segoe UI', serif" font-size="40" font-weight="700" letter-spacing="4">
    ${escapeXml(cardTitle.toUpperCase())}
  </text>

  <!-- Luxury Diamond Divider -->
  <g transform="translate(600, ${dividerY})">
    <line x1="-220" y1="0" x2="-18" y2="0" stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.8"/>
    <polygon points="0,-6 8,0 0,6 -8,0" fill="url(#goldGrad)"/>
    <line x1="18" y1="0" x2="220" y2="0" stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.8"/>
  </g>

  <!-- Complimentary Line -->
  <text x="600" y="${labelY}" text-anchor="middle" fill="${theme.textSecondary}" font-family="Georgia, 'Times New Roman', 'Segoe UI', serif" font-size="19" font-style="italic" opacity="0.92">
    Trân trọng kính gửi lời chúc tốt đẹp nhất đến
  </text>

  <!-- Recipient Name Highlight -->
  <text x="600" y="${recipientY}" text-anchor="middle" fill="${theme.textPrimary}" font-family="'Segoe UI', Roboto, Arial, sans-serif" font-size="48" font-weight="800" letter-spacing="0.5">
    ${escapeXml(recipientLine)}
  </text>

  <!-- Personalized Subtitle Message -->
  <text x="600" y="${subtitleY}" text-anchor="middle" fill="${theme.textSecondary}" font-family="'Segoe UI', Roboto, Arial, sans-serif" font-size="22" font-weight="500">
    ${subtitleTspans}
  </text>

  <!-- Optional Voucher / Privilege Badge -->
  ${voucherBadge}

  <!-- Brand Signature Footer -->
  <text x="600" y="608" text-anchor="middle" fill="${theme.accent}" font-family="'Segoe UI', Roboto, Arial, sans-serif" font-size="14" font-weight="700" opacity="0.9" letter-spacing="2">
    ${escapeXml(brandName.toUpperCase())}${hotline ? `   •   HOTLINE: ${escapeXml(hotline)}` : ''}
  </text>
</svg>`;
}

async function generateGreetingCard({ customer, template, settings, holidayName }) {
  const personalized = personalizeTemplate({ customer, template, settings, holidayName });
  const recipientLine = `${customer.salutation || 'Quý khách'} ${customer.fullName || ''}`.trim();
  const themeKey = (template && template.cardTheme) || 'banviet_obsidian_gold';

  const svgString = buildSvgString({
    themeKey,
    brandName: settings.brandName || 'Bản Việt Design',
    recipientLine,
    cardTitle: personalized.cardTitle,
    cardSubtitle: personalized.cardSubtitle,
    voucherCode: template && template.voucherCode ? personalized.vars.ma_uu_dai : '',
    hotline: settings.hotline || '',
    logoDataUri: settings.customLogoDataUri || '',
    showLogo: settings.showLogoOnCard !== false
  });

  const fileName = `card_${customer.id || 'preview'}_${Date.now()}.png`;
  const filePath = path.join(CARDS_DIR, fileName);

  await sharp(Buffer.from(svgString, 'utf8'))
    .png({ quality: 95 })
    .toFile(filePath);

  return {
    svgString,
    fileName,
    filePath,
    publicUrl: `/cards/${fileName}`,
    personalized
  };
}

function generateCardSvgPreview({ customer, template, settings, holidayName }) {
  const personalized = personalizeTemplate({ customer, template, settings, holidayName });
  const recipientLine = `${customer.salutation || 'Quý khách'} ${customer.fullName || ''}`.trim();
  const themeKey = (template && template.cardTheme) || 'banviet_obsidian_gold';

  const svgString = buildSvgString({
    themeKey,
    brandName: settings.brandName || 'Bản Việt Design',
    recipientLine,
    cardTitle: personalized.cardTitle,
    cardSubtitle: personalized.cardSubtitle,
    voucherCode: template && template.voucherCode ? personalized.vars.ma_uu_dai : '',
    hotline: settings.hotline || '',
    logoDataUri: settings.customLogoDataUri || '',
    showLogo: settings.showLogoOnCard !== false
  });

  return {
    svgString,
    personalized
  };
}

module.exports = {
  CARD_THEMES,
  buildSvgString,
  generateGreetingCard,
  generateCardSvgPreview
};
