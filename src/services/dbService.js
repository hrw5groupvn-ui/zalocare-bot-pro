const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CARDS_DIR = path.join(DATA_DIR, 'cards');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function getRelativeDateStr(offsetDays, year) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = year || d.getFullYear();
  return `${y}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getDefaultAutoReplyConfig() {
  return {
    enabled: true,
    scope: 'private_only', // 'private_only' | 'all'
    workingHoursMode: 'always', // 'always' | 'outside_hours' | 'custom_range'
    workStartHour: '08:00',
    workEndHour: '18:00',
    cooldownMinutes: 60, // Cooldown per user for fallback/general replies
    replyDelaySeconds: 3, // Natural typing delay before sending auto-reply
    onlyReplyKnownContacts: false
  };
}

function getDefaultAutoReplyRules() {
  return [
    {
      id: 'ar_thank_you',
      name: 'Phản hồi khi khách Cảm ơn (Sau khi nhận thiệp Sinh nhật / Lễ Tết)',
      keywords: 'cảm ơn, cám ơn, cam on, thank, tks, cảm ơn anh, cảm ơn chị, cảm ơn em, cảm ơn shop, tuyệt quá',
      matchType: 'contains', // 'contains' | 'exact' | 'default_fallback'
      replyText:
        'Dạ không có chi ạ! 🥰 Niềm vui của {xung_ho_thuong} {ten} cũng là niềm vinh hạnh lớn của {xung_em} và {ten_thuong_hieu}. Chúc {xung_ho_thuong} {ten} một ngày thật nhiều năng lượng và niềm vui nhé! 💖',
      active: true,
      priority: 10
    },
    {
      id: 'ar_price_quote',
      name: 'Khách hỏi Báo giá / Bảng giá / Tư vấn sản phẩm',
      keywords: 'báo giá, bảng giá, giá sao, giá bao nhiêu, tư vấn, catalog, mẫu mới, chi phí',
      matchType: 'contains',
      replyText:
        'Dạ chào {xung_ho} {ten}! 👋 {xung_em} đã nhận được yêu cầu tư vấn & báo giá của {xung_ho_thuong}.\n\n{xung_em} sẽ gửi thông tin chi tiết ngay trong ít phút nữa ạ. Nếu cần hỗ trợ gấp, {xung_ho_thuong} {ten} có thể gọi trực tiếp Hotline {sdt_hotline} nhé!',
      active: true,
      priority: 9
    },
    {
      id: 'ar_address_hours',
      name: 'Khách hỏi Địa chỉ / Giờ làm việc / Liên hệ',
      keywords: 'địa chỉ, ở đâu, vị trí, mấy giờ mở cửa, giờ làm việc, số điện thoại, hotline',
      matchType: 'contains',
      replyText:
        'Dạ gửi {xung_ho} {ten} thông tin liên hệ của {ten_thuong_hieu} ạ:\n📞 Hotline hỗ trợ nhanh: {sdt_hotline}\n⏰ Giờ làm việc: 08:00 - 18:00 (Từ Thứ 2 đến Thứ 7)\n\n{xung_ho} {ten} cần hỗ trợ nội dung gì cứ nhắn lại giúp {xung_em} nhé!',
      active: true,
      priority: 8
    },
    {
      id: 'ar_voucher_gift',
      name: 'Khách hỏi cách dùng Mã ưu đãi / Quà sinh nhật',
      keywords: 'mã ưu đãi, voucher, quà tặng, khuyến mãi, giảm giá, dùng mã',
      matchType: 'contains',
      replyText:
        '🎁 Dạ {xung_ho} {ten} chỉ cần đọc mã ưu đãi trên thiệp chúc mừng hoặc chụp màn hình tin nhắn gửi cho {xung_em} khi đặt hàng/sử dụng dịch vụ là sẽ được áp dụng ưu đãi đặc quyền ngay ạ!',
      active: true,
      priority: 7
    },
    {
      id: 'ar_default_busy',
      name: 'Tin nhắn tự động mặc định khi Đang bận / Ngoài giờ (Có chống lặp 60 phút)',
      keywords: '*',
      matchType: 'default_fallback',
      replyText:
        'Dạ chào {xung_ho} {ten}! Hiện tại {xung_em} đang bận chút việc nên chưa kịp phản hồi ngay tin nhắn của {xung_ho_thuong}. Ngay khi xem máy, {xung_em} sẽ trả lời {xung_ho_thuong} {ten} liền nhé! (Hotline hỗ trợ gấp: {sdt_hotline}) 🙏',
      active: false, // Mặc định tắt fallback để tránh tự trả lời mọi cuộc trò chuyện cá nhân trừ khi người dùng bật
      priority: 1
    }
  ];
}

function getLuxuryAdditionalTemplates() {
  return [
    {
      id: 'tpl_bv_signature_bday',
      name: '✨ Sinh nhật Thượng Lưu — Bản Việt Signature (Đen Vàng 24K + Logo)',
      category: 'birthday',
      cardTheme: 'banviet_obsidian_gold',
      cardTitle: 'CHÚC MỪNG SINH NHẬT',
      cardSubtitle: 'Kính chúc {xung_ho} {ten} tuổi mới sức khỏe, thịnh vượng & vạn sự hanh thông!',
      voucherCode: 'BANVIETVIP',
      content:
        '🎂 Kính chúc mừng sinh nhật {xung_ho} {ho_ten}!\n\nNhân ngày đặc biệt hôm nay, tập thể {ten_thuong_hieu} xin gửi những lời chúc tốt đẹp và trân quý nhất đến {xung_ho_thuong} {ten}. Chúc {xung_ho_thuong} tuổi mới dồi dào sức khỏe, ngập tràn niềm vui và gặt hái thêm nhiều thành tựu rực rỡ trong sự nghiệp cũng như cuộc sống!\n\n🎁 Như một lời tri ân sâu sắc, {ten_thuong_hieu} xin gửi tặng {xung_ho_thuong} đặc quyền ưu đãi [{ma_uu_dai}] dành riêng cho khách hàng VIP.\n\nTrân trọng,\n{ten_thuong_hieu} • Hotline: {sdt_hotline}',
      isDefault: true
    },
    {
      id: 'tpl_bv_champagne_bday',
      name: '🥂 Sinh nhật Thanh Lịch — Ngọc Trai Champagne (Nền Sáng + Logo)',
      category: 'birthday',
      cardTheme: 'champagne_pearl',
      cardTitle: 'HAPPY BIRTHDAY',
      cardSubtitle: 'Gửi ngàn lời chúc tốt đẹp, bình an và hạnh phúc đến {xung_ho} {ten}',
      voucherCode: 'HPBDBANVIET',
      content:
        '🥂 Chúc mừng sinh nhật {xung_ho} {ho_ten}!\n\nThay mặt {ten_thuong_hieu}, {xung_em} kính chúc {xung_ho_thuong} {ten} một ngày sinh nhật thật ấm áp, ý nghĩa bên gia đình và những người thân yêu. Cảm ơn {xung_ho_thuong} đã luôn tin tưởng đồng hành cùng {ten_thuong_hieu}!\n\n💝 Mã quà tặng sinh nhật của {xung_ho_thuong}: [{ma_uu_dai}]',
      isDefault: false
    },
    {
      id: 'tpl_bv_architect_anniv',
      name: '🏛️ Kỷ Niệm Hợp Tác Thượng Lưu — Bạch Kim Đương Đại (Có Logo)',
      category: 'anniversary',
      cardTheme: 'platinum_midnight',
      cardTitle: 'TRI ÂN ĐỒNG HÀNH',
      cardSubtitle: 'Trân trọng cảm ơn {xung_ho} {ten} đã tin tưởng đồng hành cùng {ten_thuong_hieu}',
      voucherCode: 'TRIANVIP',
      content:
        '🏛️ Kính gửi {xung_ho} {ho_ten},\n\nNhân dịp {loai_ky_niem}, {ten_thuong_hieu} xin gửi lời tri ân chân thành nhất tới {xung_ho_thuong} {ten}. Sự hài lòng và tin yêu của {xung_ho_thuong} chính là niềm tự hào lớn nhất của đội ngũ kiến trúc sư & kỹ sư {ten_thuong_hieu}.\n\nKính chúc {xung_ho_thuong} {ten} cùng gia đình luôn an khang, thịnh vượng và hạnh phúc trong không gian sống tuyệt vời của mình!',
      isDefault: true
    }
  ];
}

function getDefaultData() {
  const todayBirthday = getRelativeDateStr(0, 1990);
  const todayAnniversary = getRelativeDateStr(0, 2021);
  const tomorrowBirthday = getRelativeDateStr(1, 1995);
  const in3DaysBirthday = getRelativeDateStr(3, 1988);
  const in5DaysAnniversary = getRelativeDateStr(5, 2022);

  return {
    settings: {
      brandName: 'Việt Care Studio',
      senderPronoun: 'em',
      hotline: '0901 234 567',
      website: 'https://vietcare.vn',
      zaloMode: 'mock', // 'mock' | 'personal' | 'oa'
      cronEnabled: true,
      cronSchedule: '0 8 * * *', // 08:00 AM daily
      cronTimeDisplay: '08:00',
      sendCardWithMessage: true,
      delayBetweenMessagesMs: 3500,
      personalConfig: {
        connected: false,
        accountName: '',
        phone: '',
        imei: '',
        cookie: '',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      },
      oaConfig: {
        oaName: '',
        oaId: '',
        accessToken: '',
        refreshToken: '',
        appId: '',
        secretKey: '',
        useZns: false,
        znsBirthdayTemplateId: '',
        znsHolidayTemplateId: ''
      }
    },
    customers: [
      {
        id: 'cust_1',
        fullName: 'Nguyễn Minh Tuấn',
        salutation: 'Anh',
        gender: 'male',
        phone: '0912345678',
        zaloUid: '',
        birthday: todayBirthday,
        anniversaryDate: '2022-05-15',
        anniversaryType: 'Kỷ niệm đồng hành',
        group: 'VIP',
        notes: 'Khách hàng thân thiết, thích phong cách lịch sự',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cust_2',
        fullName: 'Trần Ngọc Lan Anh',
        salutation: 'Chị',
        gender: 'female',
        phone: '0987654321',
        zaloUid: '',
        birthday: '1993-08-20',
        anniversaryDate: todayAnniversary,
        anniversaryType: 'Kỷ niệm hợp tác',
        group: 'VIP',
        notes: 'Giám đốc đối tác chiến lược',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cust_3',
        fullName: 'Lê Hoàng Bảo Ngọc',
        salutation: 'Chị',
        gender: 'female',
        phone: '0909112233',
        zaloUid: '',
        birthday: tomorrowBirthday,
        anniversaryDate: '2023-11-10',
        anniversaryType: 'Kỷ niệm mua hàng đầu tiên',
        group: 'Thân thiết',
        notes: 'Quan tâm các chương trình ưu đãi lễ Tết',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cust_4',
        fullName: 'Phạm Quốc Khánh',
        salutation: 'Anh',
        gender: 'male',
        phone: '0933445566',
        zaloUid: '',
        birthday: in3DaysBirthday,
        anniversaryDate: in5DaysAnniversary,
        anniversaryType: 'Kỷ niệm ký hợp đồng',
        group: 'Doanh nghiệp',
        notes: 'Khách doanh nghiệp B2B',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cust_5',
        fullName: 'Vũ Thị Thanh Hương',
        salutation: 'Cô',
        gender: 'female',
        phone: '0977889900',
        zaloUid: '',
        birthday: '1975-12-15',
        anniversaryDate: '2020-01-20',
        anniversaryType: 'Kỷ niệm khách hàng gắn bó',
        group: 'VIP',
        notes: 'Khách hàng lâu năm từ ngày đầu thành lập',
        active: true,
        createdAt: new Date().toISOString()
      }
    ],
    templates: [
      {
        id: 'tpl_birthday_vip',
        name: 'Chúc mừng Sinh nhật Trang trọng & Thiệp Hoàng Gia',
        category: 'birthday',
        cardTheme: 'royal_gold',
        cardTitle: 'CHÚC MỪNG SINH NHẬT',
        cardSubtitle: 'Chúc {xung_ho} {ten} tuổi mới rạng rỡ, hạnh phúc & thành công!',
        voucherCode: 'HPBDVIP20',
        content:
          '🎂 Chúc mừng sinh nhật {xung_ho} {ho_ten}!\n\nNhân ngày đặc biệt hôm nay ({ngay_sinh}), {xung_em} và tập thể {ten_thuong_hieu} xin gửi lời chúc tốt đẹp nhất đến {xung_ho_thuong} {ten}. Chúc {xung_ho_thuong} bước sang tuổi mới thật nhiều sức khỏe, niềm vui, hạnh phúc và gặt hái thêm nhiều thành công rực rỡ!\n\n🎁 {ten_thuong_hieu} xin gửi tặng {xung_ho_thuong} {ten} món quà ưu đãi đặc biệt mã [{ma_uu_dai}] nhân dịp sinh nhật.\n\nTrân trọng,\n{ten_thuong_hieu} - Hotline: {sdt_hotline}',
        isDefault: true
      },
      {
        id: 'tpl_birthday_sweet',
        name: 'Chúc mừng Sinh nhật Ngọt ngào (Rose Pastel)',
        category: 'birthday',
        cardTheme: 'rose_pastel',
        cardTitle: 'HAPPY BIRTHDAY',
        cardSubtitle: 'Gửi ngàn lời chúc ngọt ngào nhất đến {xung_ho} {ten}',
        voucherCode: 'SINHNHAT15',
        content:
          '🌸 Happy Birthday {xung_ho} {ten} thân mến!\n\nHôm nay là một ngày thật tuyệt vời! Thay mặt {ten_thuong_hieu}, {xung_em} chúc {xung_ho_thuong} {ten} luôn tươi trẻ, rạng ngời và ngập tràn tiếng cười bên gia đình, người thân.\n\nCảm ơn {xung_ho_thuong} đã luôn tin tưởng đồng hành cùng {ten_thuong_hieu}. Đừng quên sử dụng mã quà tặng [{ma_uu_dai}] dành riêng cho {xung_ho_thuong} trong tháng sinh nhật này nhé! 💖',
        isDefault: false
      },
      {
        id: 'tpl_anniversary',
        name: 'Tri ân Ngày Kỷ niệm Đồng hành',
        category: 'anniversary',
        cardTheme: 'emerald_luxury',
        cardTitle: 'TRI ÂN ĐỒNG HÀNH',
        cardSubtitle: 'Cảm ơn {xung_ho} {ten} đã gắn bó {so_nam_gan_bo} năm cùng {ten_thuong_hieu}',
        voucherCode: 'TRIAN25',
        content:
          '💎 Chúc mừng {loai_ky_niem} cùng {xung_ho} {ho_ten}!\n\nHôm nay đánh dấu cột mốc {so_nam_gan_bo} năm kể từ ngày {xung_ho_thuong} {ten} đồng hành cùng {ten_thuong_hieu} ({ngay_ky_niem}). Sự tin tưởng và ủng hộ của {xung_ho_thuong} chính là động lực lớn nhất để chúng {xung_em} không ngừng hoàn thiện mỗi ngày.\n\n🎁 Nhân dịp kỷ niệm đặc biệt này, {ten_thuong_hieu} xin gửi tặng {xung_ho_thuong} mã tri ân [{ma_uu_dai}]. Chúc {xung_ho_thuong} luôn thịnh vượng và vạn sự như ý!',
        isDefault: true
      },
      {
        id: 'tpl_tet',
        name: 'Chúc Tết Nguyên Đán / Đầu Xuân Năm Mới',
        category: 'holiday',
        cardTheme: 'tet_crimson',
        cardTitle: 'CHÚC MỪNG NĂM MỚI',
        cardSubtitle: 'Kính chúc {xung_ho} {ten} & Gia đình An Khang Thịnh Vượng - Vạn Sự Như Ý',
        voucherCode: 'LIXIDAUNAM',
        content:
          '🧧 Kính chúc Mừng Năm Mới {xung_ho} {ho_ten}!\n\nNhân dịp {ten_dip_le}, {ten_thuong_hieu} kính chúc {xung_ho_thuong} {ten} cùng gia đình một năm mới:\n✨ An Khang Thịnh Vượng\n✨ Vạn Sự Như Ý\n✨ Tài Lộc Dồi Dào\n\nCảm ơn {xung_ho_thuong} đã đồng hành cùng {ten_thuong_hieu} trong suốt chặng đường qua. Đầu xuân năm mới, chúng {xung_em} xin gửi tặng lộc xuân [{ma_uu_dai}] đến {xung_ho_thuong}!',
        isDefault: true
      },
      {
        id: 'tpl_women_day',
        name: 'Chúc mừng Ngày Phụ nữ (8/3 & 20/10)',
        category: 'holiday',
        cardTheme: 'rose_pastel',
        cardTitle: 'CHÚC MỪNG PHÁI ĐẸP',
        cardSubtitle: 'Chúc {xung_ho} {ten} luôn xinh đẹp, rạng rỡ và hạnh phúc vẹn tròn',
        voucherCode: 'PHAIDEP20',
        content:
          '🌷 Nhân dịp {ten_dip_le}, {xung_em} và {ten_thuong_hieu} xin gửi những lời chúc ngọt ngào và trân quý nhất đến {xung_ho} {ho_ten}!\n\nChúc {xung_ho_thuong} {ten} luôn xinh đẹp rạng ngời, ngập tràn niềm vui và đạt được mọi điều ước nguyện trong cuộc sống. Cảm ơn {xung_ho_thuong} đã luôn yêu thương và lựa chọn {ten_thuong_hieu}!\n\n💝 Quà tặng dành riêng cho {xung_ho_thuong}: Mã ưu đãi [{ma_uu_dai}].',
        isDefault: false
      },
      {
        id: 'tpl_general_holiday',
        name: 'Chúc mừng Ngày Lễ Chung (Lễ Quốc khánh, 30/4, Giáng sinh...)',
        category: 'holiday',
        cardTheme: 'festive_blue',
        cardTitle: 'CHÚC MỪNG NGÀY LỄ',
        cardSubtitle: 'Chúc {xung_ho} {ten} kỳ nghỉ lễ tràn ngập niềm vui bên gia đình',
        voucherCode: 'LEHOI10',
        content:
          '🎉 Chào mừng {ten_dip_le}!\n\n{ten_thuong_hieu} xin gửi lời chúc tốt đẹp nhất đến {xung_ho} {ho_ten}. Chúc {xung_ho_thuong} {ten} và gia đình có một kỳ nghỉ lễ thật ấm áp, trọn vẹn niềm vui và tràn đầy năng lượng!\n\n📞 Mọi nhu cầu hỗ trợ trong dịp lễ, {xung_ho_thuong} vui lòng liên hệ Hotline {sdt_hotline} nhé!',
        isDefault: false
      }
    ],
    holidays: [
      {
        id: 'hol_newyear',
        name: 'Tết Dương Lịch',
        dateMonthDay: '01-01',
        calendarType: 'solar',
        targetAudience: 'all', // 'all' | 'female' | 'male' | 'vip'
        templateId: 'tpl_tet',
        autoSend: true,
        description: 'Ngày đầu năm mới Dương lịch (01/01)'
      },
      {
        id: 'hol_tet_am',
        name: 'Tết Nguyên Đán (Mùng 1 Tết)',
        dateMonthDay: '02-06', // Có thể chỉnh theo ngày dương tương ứng từng năm hoặc bấm gửi chiến dịch
        calendarType: 'lunar_mapped',
        targetAudience: 'all',
        templateId: 'tpl_tet',
        autoSend: true,
        description: 'Tết Cổ Truyền Dân Tộc - Chúc Tết toàn bộ khách hàng'
      },
      {
        id: 'hol_8_3',
        name: 'Quốc tế Phụ nữ 8/3',
        dateMonthDay: '03-08',
        calendarType: 'solar',
        targetAudience: 'female',
        templateId: 'tpl_women_day',
        autoSend: true,
        description: 'Gửi lời chúc và thiệp đến các khách hàng Nữ (Chị/Cô)'
      },
      {
        id: 'hol_30_4',
        name: 'Đại lễ 30/4 & Quốc tế Lao động 1/5',
        dateMonthDay: '04-30',
        calendarType: 'solar',
        targetAudience: 'all',
        templateId: 'tpl_general_holiday',
        autoSend: true,
        description: 'Chúc kỳ nghỉ lễ 30/4 - 1/5 vui vẻ'
      },
      {
        id: 'hol_2_9',
        name: 'Lễ Quốc Khánh 2/9',
        dateMonthDay: '09-02',
        calendarType: 'solar',
        targetAudience: 'all',
        templateId: 'tpl_general_holiday',
        autoSend: true,
        description: 'Chúc mừng ngày Quốc Khánh Việt Nam 02/09'
      },
      {
        id: 'hol_20_10',
        name: 'Ngày Phụ nữ Việt Nam 20/10',
        dateMonthDay: '10-20',
        calendarType: 'solar',
        targetAudience: 'female',
        templateId: 'tpl_women_day',
        autoSend: true,
        description: 'Tôn vinh phụ nữ Việt Nam 20/10 (tự động lọc khách Nữ)'
      },
      {
        id: 'hol_noel',
        name: 'Lễ Giáng Sinh (Noel)',
        dateMonthDay: '12-24',
        calendarType: 'solar',
        targetAudience: 'all',
        templateId: 'tpl_general_holiday',
        autoSend: true,
        description: 'Chúc Giáng Sinh an lành ấm áp 24/12'
      }
    ],
    logs: [],
    autoReplyConfig: getDefaultAutoReplyConfig(),
    autoReplyRules: getDefaultAutoReplyRules(),
    autoReplyLogs: []
  };
}

class DbService {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
        let mutated = false;
        if (!this.data.autoReplyConfig) {
          this.data.autoReplyConfig = getDefaultAutoReplyConfig();
          mutated = true;
        }
        if (!Array.isArray(this.data.autoReplyRules) || this.data.autoReplyRules.length === 0) {
          this.data.autoReplyRules = getDefaultAutoReplyRules();
          mutated = true;
        }
        if (!Array.isArray(this.data.autoReplyLogs)) {
          this.data.autoReplyLogs = [];
          mutated = true;
        }
        if (this.data.settings && this.data.settings.showLogoOnCard === undefined) {
          this.data.settings.showLogoOnCard = true;
          if (!this.data.settings.brandName || this.data.settings.brandName === 'Việt Care Studio') {
            this.data.settings.brandName = 'Bản Việt Design';
          }
          mutated = true;
        }
        if (Array.isArray(this.data.templates)) {
          const luxuryTpls = getLuxuryAdditionalTemplates();
          for (const lt of luxuryTpls.reverse()) {
            if (!this.data.templates.some((t) => t.id === lt.id)) {
              if (lt.isDefault) {
                this.data.templates.forEach((t) => {
                  if (t.category === lt.category) t.isDefault = false;
                });
              }
              this.data.templates.unshift(lt);
              mutated = true;
            }
          }
        }
        if (mutated) {
          this.save();
        }
      } else {
        this.data = getDefaultData();
        this.save();
      }
    } catch (err) {
      console.error('Error loading DB, resetting to default:', err);
      this.data = getDefaultData();
      this.save();
    }
  }

  save() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(partial) {
    this.data.settings = {
      ...this.data.settings,
      ...partial,
      personalConfig: {
        ...(this.data.settings.personalConfig || {}),
        ...(partial.personalConfig || {})
      },
      oaConfig: {
        ...(this.data.settings.oaConfig || {}),
        ...(partial.oaConfig || {})
      }
    };
    this.save();
    return this.data.settings;
  }

  getCustomers() {
    return this.data.customers || [];
  }

  getCustomerById(id) {
    return this.getCustomers().find((c) => c.id === id);
  }

  addCustomer(cust, skipSave = false) {
    const newCust = {
      id: cust.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fullName: (cust.fullName || '').trim(),
      salutation: cust.salutation || 'Anh/Chị',
      gender: cust.gender || (cust.salutation === 'Chị' || cust.salutation === 'Cô' ? 'female' : 'male'),
      phone: String(cust.phone || '').replace(/\s+/g, ''),
      zaloUid: cust.zaloUid || '',
      avatar: cust.avatar || '',
      birthday: cust.birthday || '',
      anniversaryDate: cust.anniversaryDate || '',
      anniversaryType: cust.anniversaryType || 'Kỷ niệm đồng hành',
      group: cust.group || 'Thân thiết',
      notes: cust.notes || '',
      active: cust.active !== undefined ? Boolean(cust.active) : true,
      createdAt: new Date().toISOString()
    };
    this.data.customers.unshift(newCust);
    if (!skipSave) this.save();
    return newCust;
  }

  updateCustomer(id, updates) {
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.customers[idx] = {
      ...this.data.customers[idx],
      ...updates,
      id
    };
    this.save();
    return this.data.customers[idx];
  }

  deleteCustomer(id) {
    const before = this.data.customers.length;
    this.data.customers = this.data.customers.filter((c) => c.id !== id);
    this.save();
    return this.data.customers.length < before;
  }

  bulkUpsertCustomers(customersList) {
    let added = 0;
    let updated = 0;

    // Build fast lookup maps by UID and Phone
    const uidIndexMap = new Map();
    const phoneIndexMap = new Map();
    this.data.customers.forEach((c, idx) => {
      if (c.zaloUid) uidIndexMap.set(String(c.zaloUid).trim(), idx);
      if (c.phone) {
        const p = String(c.phone).replace(/[^0-9+]/g, '');
        if (p) phoneIndexMap.set(p, idx);
      }
    });

    const newItems = [];

    for (const item of customersList) {
      if (!item.fullName && !item.phone && !item.zaloUid) continue;
      const cleanPhone = String(item.phone || '').replace(/[^0-9+]/g, '');
      const cleanUid = String(item.zaloUid || '').trim();

      let existingIdx = -1;
      if (cleanUid && uidIndexMap.has(cleanUid)) {
        existingIdx = uidIndexMap.get(cleanUid);
      } else if (cleanPhone && phoneIndexMap.has(cleanPhone)) {
        existingIdx = phoneIndexMap.get(cleanPhone);
      }

      if (existingIdx !== -1) {
        const cur = this.data.customers[existingIdx];
        this.data.customers[existingIdx] = {
          ...cur,
          fullName: item.fullName || cur.fullName,
          salutation: item.salutation || cur.salutation,
          gender: item.gender || cur.gender,
          phone: cleanPhone || cur.phone,
          zaloUid: cleanUid || cur.zaloUid,
          avatar: item.avatar || cur.avatar || '',
          birthday: item.birthday || cur.birthday,
          anniversaryDate: item.anniversaryDate || cur.anniversaryDate,
          anniversaryType: item.anniversaryType || cur.anniversaryType,
          group: item.group || cur.group,
          notes: item.notes || cur.notes
        };
        updated++;
      } else {
        newItems.push({
          id: item.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          fullName: (item.fullName || '').trim(),
          salutation: item.salutation || 'Anh/Chị',
          gender: item.gender || (item.salutation === 'Chị' || item.salutation === 'Cô' ? 'female' : 'male'),
          phone: cleanPhone,
          zaloUid: cleanUid,
          avatar: item.avatar || '',
          birthday: item.birthday || '',
          anniversaryDate: item.anniversaryDate || '',
          anniversaryType: item.anniversaryType || 'Kỷ niệm đồng hành',
          group: item.group || 'Thân thiết',
          notes: item.notes || '',
          active: true,
          createdAt: new Date().toISOString()
        });
        added++;
      }
    }

    if (newItems.length > 0) {
      this.data.customers.push(...newItems);
    }
    this.save();
    return { added, updated };
  }

  getTemplates() {
    return this.data.templates || [];
  }

  getTemplateById(id) {
    return this.getTemplates().find((t) => t.id === id);
  }

  saveTemplate(tpl) {
    if (tpl.id) {
      const idx = this.data.templates.findIndex((t) => t.id === tpl.id);
      if (idx !== -1) {
        this.data.templates[idx] = { ...this.data.templates[idx], ...tpl };
        this.save();
        return this.data.templates[idx];
      }
    }
    const newTpl = {
      ...tpl,
      id: `tpl_${Date.now()}`
    };
    this.data.templates.push(newTpl);
    this.save();
    return newTpl;
  }

  deleteTemplate(id) {
    this.data.templates = this.data.templates.filter((t) => t.id !== id);
    this.save();
    return true;
  }

  getHolidays() {
    return this.data.holidays || [];
  }

  saveHoliday(hol) {
    if (hol.id) {
      const idx = this.data.holidays.findIndex((h) => h.id === hol.id);
      if (idx !== -1) {
        this.data.holidays[idx] = { ...this.data.holidays[idx], ...hol };
        this.save();
        return this.data.holidays[idx];
      }
    }
    const newHol = {
      ...hol,
      id: `hol_${Date.now()}`
    };
    this.data.holidays.push(newHol);
    this.save();
    return newHol;
  }

  deleteHoliday(id) {
    this.data.holidays = this.data.holidays.filter((h) => h.id !== id);
    this.save();
    return true;
  }

  getLogs(limit = 200) {
    return (this.data.logs || []).slice(0, limit);
  }

  addLog(logEntry) {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...logEntry
    };
    this.data.logs.unshift(entry);
    if (this.data.logs.length > 1000) {
      this.data.logs = this.data.logs.slice(0, 1000);
    }
    this.save();
    return entry;
  }

  hasSentToday(customerId, occasionKey) {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    return (this.data.logs || []).some(
      (log) =>
        log.customerId === customerId &&
        log.occasionKey === occasionKey &&
        log.status === 'success' &&
        log.timestamp.startsWith(todayPrefix)
    );
  }

  // Auto-Reply Configuration & Rules
  getAutoReplyConfig() {
    if (!this.data.autoReplyConfig) {
      this.data.autoReplyConfig = getDefaultAutoReplyConfig();
    }
    return this.data.autoReplyConfig;
  }

  updateAutoReplyConfig(partial) {
    this.data.autoReplyConfig = {
      ...this.getAutoReplyConfig(),
      ...partial
    };
    this.save();
    return this.data.autoReplyConfig;
  }

  getAutoReplyRules() {
    if (!Array.isArray(this.data.autoReplyRules)) {
      this.data.autoReplyRules = getDefaultAutoReplyRules();
    }
    return this.data.autoReplyRules;
  }

  saveAutoReplyRule(rule) {
    const rules = this.getAutoReplyRules();
    if (rule.id) {
      const idx = rules.findIndex((r) => r.id === rule.id);
      if (idx !== -1) {
        rules[idx] = { ...rules[idx], ...rule };
        this.save();
        return rules[idx];
      }
    }
    const newRule = {
      id: `ar_${Date.now()}`,
      name: rule.name || 'Kịch bản trả lời mới',
      keywords: rule.keywords || '',
      matchType: rule.matchType || 'contains',
      replyText: rule.replyText || '',
      active: rule.active !== undefined ? Boolean(rule.active) : true,
      priority: Number(rule.priority) || 5
    };
    rules.unshift(newRule);
    this.save();
    return newRule;
  }

  deleteAutoReplyRule(id) {
    this.data.autoReplyRules = this.getAutoReplyRules().filter((r) => r.id !== id);
    this.save();
    return true;
  }

  getAutoReplyLogs(limit = 100) {
    return (this.data.autoReplyLogs || []).slice(0, limit);
  }

  addAutoReplyLog(entry) {
    if (!Array.isArray(this.data.autoReplyLogs)) {
      this.data.autoReplyLogs = [];
    }
    const item = {
      id: `arlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.data.autoReplyLogs.unshift(item);
    if (this.data.autoReplyLogs.length > 500) {
      this.data.autoReplyLogs = this.data.autoReplyLogs.slice(0, 500);
    }
    this.save();
    return item;
  }
}

module.exports = {
  db: new DbService(),
  CARDS_DIR,
  DATA_DIR
};
