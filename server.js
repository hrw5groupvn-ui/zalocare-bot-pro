require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');

const { db, CARDS_DIR } = require('./src/services/dbService');
const { CARD_THEMES, generateCardSvgPreview, generateGreetingCard } = require('./src/services/cardGenerator');
const { zaloService } = require('./src/services/zaloService');
const { schedulerService } = require('./src/services/schedulerService');
const { autoReplyService } = require('./src/services/autoReplyService');
const { aiService } = require('./src/services/aiService');

const app = express();
const PORT = process.env.PORT || 3088;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/cards', express.static(CARDS_DIR));

// Helper to normalize Excel dates or strings into YYYY-MM-DD
function normalizeExcelDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const str = String(val).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  // Match YYYY/MM/DD or YYYY-MM-DD
  const ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  return str;
}

// 1. Dashboard Overview
app.get('/api/dashboard', (req, res) => {
  const customers = db.getCustomers();
  const settings = db.getSettings();
  const logs = db.getLogs(50);
  const { todayEvents, upcomingEvents } = schedulerService.getEventsOverview(14);
  const qrStatus = zaloService.getQrStatus();

  const successLogs = logs.filter((l) => l.status === 'success').length;

  res.json({
    stats: {
      totalCustomers: customers.length,
      todayCount: todayEvents.length,
      todayPendingCount: todayEvents.filter((e) => !e.alreadySent).length,
      upcomingCount: upcomingEvents.length,
      totalSentCount: (db.data.logs || []).filter((l) => l.status === 'success').length,
      recentSuccessCount: successLogs
    },
    todayEvents,
    upcomingEvents,
    settings,
    qrStatus,
    recentLogs: logs.slice(0, 12)
  });
});

// 2. Customers CRUD & Excel Import/Export
app.get('/api/customers', (req, res) => {
  res.json(db.getCustomers());
});

app.post('/api/customers', (req, res) => {
  const cust = db.addCustomer(req.body);
  res.json(cust);
});

app.put('/api/customers/:id', (req, res) => {
  const updated = db.updateCustomer(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
  res.json(updated);
});

app.delete('/api/customers/:id', (req, res) => {
  db.deleteCustomer(req.params.id);
  res.json({ deleted: true });
});

app.post('/api/customers/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn file Excel (.xlsx) hoặc CSV' });
    }
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    const mapped = rows.map((row) => {
      const getField = (keys) => {
        for (const k of Object.keys(row)) {
          const normK = k.trim().toLowerCase();
          if (keys.some((target) => normK.includes(target))) {
            return row[k];
          }
        }
        return '';
      };

      const fullName = String(getField(['họ và tên', 'họ tên', 'tên khách', 'fullname', 'name']) || '').trim();
      const rawGender = String(getField(['giới tính', 'gender', 'phái']) || '').trim().toLowerCase();
      let salutation = String(getField(['xưng hô', 'danh xưng', 'salutation']) || '').trim();
      let gender = '';
      if (rawGender.includes('nữ') || rawGender === 'nu' || rawGender === 'female' || rawGender === 'f') {
        gender = 'female';
      } else if (rawGender.includes('nam') || rawGender === 'male' || rawGender === 'm') {
        gender = 'male';
      }
      if (!salutation) {
        salutation = gender === 'female' ? 'Chị' : 'Anh';
      }
      if (!gender) {
        gender = salutation === 'Chị' || salutation === 'Cô' ? 'female' : 'male';
      }
      let phone = String(getField(['số điện thoại', 'sđt', 'điện thoại', 'phone', 'zalo']) || '').trim();
      if (phone && !phone.startsWith('0') && !phone.startsWith('84') && phone.length === 9) {
        phone = '0' + phone;
      }
      const birthday = normalizeExcelDate(getField(['ngày sinh', 'sinh nhật', 'birthday', 'dob']));
      const anniversaryDate = normalizeExcelDate(getField(['ngày kỷ niệm', 'kỷ niệm', 'anniversary']));
      const anniversaryType = String(getField(['loại kỷ niệm', 'dịp kỷ niệm']) || 'Kỷ niệm đồng hành').trim();
      const group = String(getField(['nhóm', 'hạng', 'group', 'vip']) || 'Thân thiết').trim();
      const zaloUid = String(getField(['uid', 'zalo uid', 'user_id']) || '').trim();
      const notes = String(getField(['ghi chú', 'note']) || '').trim();

      return {
        fullName,
        salutation,
        gender,
        phone,
        birthday,
        anniversaryDate,
        anniversaryType,
        group,
        zaloUid,
        notes
      };
    });

    const summary = db.bulkUpsertCustomers(mapped);
    res.json({
      success: true,
      ...summary,
      totalRows: rows.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đọc file Excel: ' + err.message });
  }
});

app.get('/api/customers/export', (req, res) => {
  const isSample = req.query.sample === '1';
  const customers = isSample
    ? [
        {
          'Họ và tên': 'Nguyễn Minh Tuấn',
          'Giới tính': 'Nam',
          'Xưng hô': 'Anh',
          'Số điện thoại': '0912345678',
          'Ngày sinh (YYYY-MM-DD)': '1990-10-28',
          'Ngày kỷ niệm (YYYY-MM-DD)': '2022-05-15',
          'Loại kỷ niệm': 'Kỷ niệm đồng hành',
          'Nhóm khách hàng': 'VIP',
          'Zalo UID (Tùy chọn)': '',
          'Ghi chú': 'Khách hàng mẫu'
        },
        {
          'Họ và tên': 'Trần Ngọc Lan Anh',
          'Giới tính': 'Nữ',
          'Xưng hô': 'Chị',
          'Số điện thoại': '0987654321',
          'Ngày sinh (YYYY-MM-DD)': '1994-03-08',
          'Ngày kỷ niệm (YYYY-MM-DD)': '2023-10-28',
          'Loại kỷ niệm': 'Kỷ niệm ký hợp đồng',
          'Nhóm khách hàng': 'VIP',
          'Zalo UID (Tùy chọn)': '',
          'Ghi chú': 'Đối tác chiến lược'
        }
      ]
    : db.getCustomers().map((c) => ({
        'Họ và tên': c.fullName,
        'Giới tính': c.gender === 'female' || c.salutation === 'Chị' || c.salutation === 'Cô' ? 'Nữ' : 'Nam',
        'Xưng hô': c.salutation,
        'Số điện thoại': c.phone,
        'Ngày sinh (YYYY-MM-DD)': c.birthday,
        'Ngày kỷ niệm (YYYY-MM-DD)': c.anniversaryDate,
        'Loại kỷ niệm': c.anniversaryType,
        'Nhóm khách hàng': c.group,
        'Zalo UID (Tùy chọn)': c.zaloUid,
        'Ghi chú': c.notes
      }));

  const ws = XLSX.utils.json_to_sheet(customers);
  ws['!cols'] = [
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 28 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachKhachHang');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fileName = isSample ? 'File_Mau_Khach_Hang_ZaloBot.xlsx' : 'Danh_Sach_Khach_Hang_ZaloBot.xlsx';

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// 3. Templates & Greeting Card Preview
app.get('/api/templates', (req, res) => {
  res.json({
    templates: db.getTemplates(),
    cardThemes: CARD_THEMES
  });
});

app.post('/api/templates', (req, res) => {
  const saved = db.saveTemplate(req.body);
  res.json(saved);
});

app.delete('/api/templates/:id', (req, res) => {
  db.deleteTemplate(req.params.id);
  res.json({ deleted: true });
});

app.post('/api/preview', (req, res) => {
  const { customerId, customCustomer, templateId, customTemplate, holidayName } = req.body;
  const customer =
    customCustomer ||
    db.getCustomerById(customerId) ||
    db.getCustomers()[0] || {
      fullName: 'Nguyễn Minh Tuấn',
      salutation: 'Anh',
      phone: '0912345678',
      birthday: '1990-10-28',
      anniversaryDate: '2021-10-28',
      anniversaryType: 'Kỷ niệm đồng hành'
    };

  const template =
    customTemplate ||
    db.getTemplateById(templateId) ||
    db.getTemplates()[0];

  const settings = db.getSettings();
  const preview = generateCardSvgPreview({
    customer,
    template,
    settings,
    holidayName
  });

  res.json({
    customer,
    template,
    svgString: preview.svgString,
    messageText: preview.personalized.messageText,
    cardTitle: preview.personalized.cardTitle,
    cardSubtitle: preview.personalized.cardSubtitle,
    vars: preview.personalized.vars
  });
});

// 4. Send Individual or Batch Greetings
app.post('/api/send', async (req, res) => {
  try {
    const { customerId, templateId, holidayName, occasionKey, forceMode } = req.body;
    const customer = db.getCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }
    const template = db.getTemplateById(templateId) || db.getTemplates()[0];

    const result = await zaloService.sendGreeting({
      customer,
      template,
      holidayName: holidayName || '',
      occasionKey: occasionKey || `manual_${Date.now()}`,
      forceMode: forceMode || null
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/send-today', async (req, res) => {
  try {
    const skipAlreadySent = req.body.skipAlreadySent !== false;
    const summary = await schedulerService.runDailyGreetings({ skipAlreadySent });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Holidays & Festivals Management
app.get('/api/holidays', (req, res) => {
  res.json(db.getHolidays());
});

app.post('/api/holidays', (req, res) => {
  const saved = db.saveHoliday(req.body);
  res.json(saved);
});

app.delete('/api/holidays/:id', (req, res) => {
  db.deleteHoliday(req.params.id);
  res.json({ deleted: true });
});

app.post('/api/holidays/:id/send-campaign', async (req, res) => {
  try {
    const summary = await schedulerService.runHolidayCampaign({
      holidayId: req.params.id,
      customTemplateId: req.body.templateId || null
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Settings & Zalo Connection Management
app.get('/api/settings', (req, res) => {
  res.json({
    settings: db.getSettings(),
    qrStatus: zaloService.getQrStatus()
  });
});

app.put('/api/settings', (req, res) => {
  const payload = { ...req.body };
  if (payload.cronTimeDisplay) {
    const [hh, mm] = String(payload.cronTimeDisplay).split(':');
    const hour = parseInt(hh, 10);
    const minute = parseInt(mm, 10);
    if (!isNaN(hour) && !isNaN(minute)) {
      payload.cronSchedule = `${minute} ${hour} * * *`;
    }
  }
  const updated = db.updateSettings(payload);
  schedulerService.initCron();
  res.json(updated);
});

app.post('/api/zalo/qr-start', async (req, res) => {
  try {
    const status = await zaloService.startQrLogin();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/zalo/qr-status', (req, res) => {
  const status = zaloService.getQrStatus();
  if (status.isConnected) {
    autoReplyService.ensureListenerStarted();
  }
  res.json(status);
});

app.post('/api/zalo/personal-login', async (req, res) => {
  try {
    const { cookie, imei, userAgent } = req.body;
    const result = await zaloService.loginPersonalWithCredentials({ cookie, imei, userAgent });
    autoReplyService.ensureListenerStarted();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'Đăng nhập Zalo Cá nhân thất bại: ' + err.message });
  }
});

app.post('/api/zalo/personal-disconnect', (req, res) => {
  res.json(zaloService.disconnectPersonal());
});

app.post('/api/zalo/oa-refresh', async (req, res) => {
  try {
    const result = await zaloService.refreshOaAccessToken();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6b. Zalo Contacts Synchronization
app.get('/api/zalo/contacts', async (req, res) => {
  try {
    const source = req.query.source || 'auto';
    const data = await zaloService.fetchZaloContacts(source);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/zalo/contacts/sync', (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || !contacts.length) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 liên hệ từ danh bạ Zalo để đồng bộ.' });
    }
    const summary = db.bulkUpsertCustomers(contacts);
    res.json({
      success: true,
      ...summary,
      totalSynced: contacts.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đồng bộ danh bạ Zalo: ' + err.message });
  }
});

// 7. Logs History
app.get('/api/logs', (req, res) => {
  res.json(db.getLogs(300));
});

// 8. Auto-Reply Bot Management & Simulator
app.get('/api/autoreply', (req, res) => {
  const listenerStatus = autoReplyService.ensureListenerStarted();
  res.json({
    config: db.getAutoReplyConfig(),
    rules: db.getAutoReplyRules(),
    logs: db.getAutoReplyLogs(100),
    listenerStatus
  });
});

app.put('/api/autoreply/config', (req, res) => {
  const updated = db.updateAutoReplyConfig(req.body);
  const listenerStatus = autoReplyService.ensureListenerStarted();
  res.json({ config: updated, listenerStatus });
});

app.post('/api/autoreply/rules', (req, res) => {
  const saved = db.saveAutoReplyRule(req.body);
  res.json(saved);
});

app.delete('/api/autoreply/rules/:id', (req, res) => {
  db.deleteAutoReplyRule(req.params.id);
  res.json({ deleted: true });
});

app.post('/api/autoreply/test', async (req, res) => {
  try {
    const { incomingText, customerId, sendReal, forceAi } = req.body;
    const result = await autoReplyService.simulateOrSendTest({
      incomingText,
      customerId,
      sendReal: Boolean(sendReal),
      forceAi: Boolean(forceAi)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. AI Customer Care & Conversation Learning Engine
app.get('/api/ai', (req, res) => {
  res.json({
    config: aiService.getConfig(),
    knowledgeDocs: aiService.getKnowledgeDocs(),
    learnedPairs: aiService.getLearnedPairs()
  });
});

app.put('/api/ai/config', (req, res) => {
  const updated = aiService.updateConfig(req.body);
  res.json(updated);
});

app.post('/api/ai/sync-history', async (req, res) => {
  try {
    const result = await aiService.syncAndLearnOldMessagesFromZalo();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ai/learned-pairs', (req, res) => {
  const saved = aiService.addLearnedPair(req.body);
  res.json(saved);
});

app.delete('/api/ai/learned-pairs/:id', (req, res) => {
  aiService.deleteLearnedPair(req.params.id);
  res.json({ deleted: true });
});

app.post('/api/ai/knowledge', (req, res) => {
  const saved = aiService.saveKnowledgeDoc(req.body);
  res.json(saved);
});

app.delete('/api/ai/knowledge/:id', (req, res) => {
  aiService.deleteKnowledgeDoc(req.params.id);
  res.json({ deleted: true });
});

// Start Server & Cron
app.listen(PORT, async () => {
  console.log(`============================================================`);
  console.log(`🚀 Zalo Care Bot Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`============================================================`);
  schedulerService.initCron();
  await zaloService.initPersonalSessionIfConfigured();
  autoReplyService.ensureListenerStarted();
});
