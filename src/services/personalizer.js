/**
 * Smart Vietnamese Personalization Engine for ZaloCare Bot
 */

const COMPOUND_VIETNAMESE_GIVEN_NAMES = new Set([
  'lan anh', 'ngọc anh', 'phương anh', 'kim anh', 'quỳnh anh', 'vân anh',
  'tuấn anh', 'đức anh', 'hoàng anh', 'bảo anh', 'mai anh', 'trâm anh',
  'nhật anh', 'thế anh', 'việt anh', 'diệu anh', 'hồng anh', 'minh anh',
  'gia bảo', 'bảo ngọc', 'khánh linh', 'thảo vy', 'minh thư', 'thanh trúc'
]);

function extractGivenName(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Quý khách';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || 'Quý khách';

  if (parts.length >= 3) {
    const lastTwo = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
    if (COMPOUND_VIETNAMESE_GIVEN_NAMES.has(lastTwo.toLowerCase())) {
      return lastTwo;
    }
  }
  return parts[parts.length - 1];
}

function formatVietnameseDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  if (parts.length === 2) {
    return `${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function calculateYearsSince(dateStr) {
  if (!dateStr) return 1;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const startYear = parseInt(parts[0], 10);
    const currentYear = new Date().getFullYear();
    if (!isNaN(startYear) && currentYear >= startYear) {
      return Math.max(1, currentYear - startYear);
    }
  }
  return 1;
}

function buildVariables({ customer = {}, template = {}, settings = {}, holidayName = '' }) {
  const fullName = customer.fullName || 'Quý khách hàng';
  const givenName = extractGivenName(fullName);
  const salutation = customer.salutation || 'Anh/Chị';
  const salutationLower = salutation.toLowerCase();
  const senderPronoun = settings.senderPronoun || 'em';

  const age = customer.birthday ? calculateYearsSince(customer.birthday) : '';
  const yearsWithUs = customer.anniversaryDate
    ? calculateYearsSince(customer.anniversaryDate)
    : 1;

  return {
    xung_ho: salutation,
    xung_ho_thuong: salutationLower,
    xung_em: senderPronoun,
    ho_ten: fullName,
    ten: givenName,
    tuoi: age ? String(age) : 'mới',
    ngay_sinh: formatVietnameseDate(customer.birthday) || 'hôm nay',
    ngay_ky_niem: formatVietnameseDate(customer.anniversaryDate) || 'hôm nay',
    loai_ky_niem: customer.anniversaryType || 'Kỷ niệm đồng hành',
    so_nam_gan_bo: String(yearsWithUs),
    ten_dip_le: holidayName || (template && template.cardTitle) || 'Ngày Đặc Biệt',
    ma_uu_dai: (template && template.voucherCode) || 'TRIANVIP',
    ten_thuong_hieu: settings.brandName || 'Quý Công Ty',
    sdt_hotline: settings.hotline || '0901 234 567',
    nhom_khach: customer.group || 'VIP'
  };
}

function renderText(rawText, vars) {
  if (!rawText) return '';
  return String(rawText).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key];
    }
    return match;
  });
}

function personalizeTemplate({ customer, template, settings, holidayName }) {
  const vars = buildVariables({ customer, template, settings, holidayName });
  const messageText = renderText(template.content, vars);
  const cardTitle = renderText(template.cardTitle || 'CHÚC MỪNG', vars);
  const cardSubtitle = renderText(
    template.cardSubtitle || 'Kính chúc {xung_ho} {ten} luôn hạnh phúc và thành công!',
    vars
  );

  return {
    vars,
    messageText,
    cardTitle,
    cardSubtitle
  };
}

module.exports = {
  extractGivenName,
  formatVietnameseDate,
  calculateYearsSince,
  buildVariables,
  renderText,
  personalizeTemplate
};
