const cron = require('node-cron');
const { db } = require('./dbService');
const { zaloService } = require('./zaloService');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function extractMonthDay(dateStr) {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${pad2(parts[1])}-${pad2(parts[2])}`;
  }
  if (parts.length === 2) {
    return `${pad2(parts[0])}-${pad2(parts[1])}`;
  }
  return null;
}

function getDaysUntilMonthDay(monthDayStr) {
  if (!monthDayStr) return null;
  const parts = monthDayStr.split('-');
  if (parts.length !== 2) return null;
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  if (isNaN(month) || isNaN(day)) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = new Date(now.getFullYear(), month - 1, day);

  if (target < today) {
    target = new Date(now.getFullYear() + 1, month - 1, day);
  }
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function matchesTargetAudience(customer, targetAudience) {
  if (!targetAudience || targetAudience === 'all') return true;
  if (targetAudience === 'female') {
    const sal = (customer.salutation || '').toLowerCase();
    return customer.gender === 'female' || sal === 'chị' || sal === 'cô' || sal === 'bà';
  }
  if (targetAudience === 'male') {
    const sal = (customer.salutation || '').toLowerCase();
    return customer.gender === 'male' || sal === 'anh' || sal === 'chú' || sal === 'ông';
  }
  if (targetAudience === 'vip') {
    return (customer.group || '').toUpperCase() === 'VIP';
  }
  return true;
}

class SchedulerService {
  constructor() {
    this.cronTask = null;
    this.isRunningBatch = false;
  }

  initCron() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }

    const settings = db.getSettings();
    if (!settings.cronEnabled) {
      console.log('[Scheduler] Tự động hẹn giờ đang TẮT.');
      return;
    }

    const expr = settings.cronSchedule || '0 8 * * *';
    if (!cron.validate(expr)) {
      console.warn('[Scheduler] Biểu thức cron không hợp lệ, dùng mặc định 0 8 * * *');
    }

    const validExpr = cron.validate(expr) ? expr : '0 8 * * *';
    this.cronTask = cron.schedule(validExpr, async () => {
      console.log(`[Scheduler] Bắt đầu quét & gửi lời chúc tự động (${new Date().toLocaleString('vi-VN')})...`);
      await this.runDailyGreetings({ skipAlreadySent: true });
    });

    console.log(`[Scheduler] Đã bật hẹn giờ tự động mỗi ngày lúc ${settings.cronTimeDisplay || '08:00'} (${validExpr})`);
  }

  getDefaultTemplateByCategory(category) {
    const templates = db.getTemplates();
    return (
      templates.find((t) => t.category === category && t.isDefault) ||
      templates.find((t) => t.category === category) ||
      templates[0]
    );
  }

  /**
   * Scan all customers & holidays to find Today's events and Upcoming events (next 14 days)
   */
  getEventsOverview(maxUpcomingDays = 14) {
    const customers = db.getCustomers().filter((c) => c.active !== false);
    const holidays = db.getHolidays();

    const todayEvents = [];
    const upcomingEvents = [];

    const birthdayTemplate = this.getDefaultTemplateByCategory('birthday');
    const anniversaryTemplate = this.getDefaultTemplateByCategory('anniversary');

    for (const customer of customers) {
      // 1. Check Birthday
      const bdayMD = extractMonthDay(customer.birthday);
      if (bdayMD) {
        const daysLeft = getDaysUntilMonthDay(bdayMD);
        const occasionKey = `birthday_${new Date().getFullYear()}`;
        const alreadySent = db.hasSentToday(customer.id, occasionKey);

        if (daysLeft === 0) {
          todayEvents.push({
            id: `evt_bday_${customer.id}`,
            type: 'birthday',
            typeLabel: 'Sinh nhật',
            occasionKey,
            occasionTitle: 'Chúc mừng Sinh nhật',
            customer,
            templateId: birthdayTemplate ? birthdayTemplate.id : '',
            templateName: birthdayTemplate ? birthdayTemplate.name : '',
            daysRemaining: 0,
            alreadySent
          });
        } else if (daysLeft !== null && daysLeft > 0 && daysLeft <= maxUpcomingDays) {
          upcomingEvents.push({
            id: `up_bday_${customer.id}`,
            type: 'birthday',
            typeLabel: 'Sinh nhật',
            occasionTitle: 'Sinh nhật khách hàng',
            customer,
            templateId: birthdayTemplate ? birthdayTemplate.id : '',
            dateDisplay: bdayMD.split('-').reverse().join('/'),
            daysRemaining: daysLeft
          });
        }
      }

      // 2. Check Anniversary
      const annivMD = extractMonthDay(customer.anniversaryDate);
      if (annivMD) {
        const daysLeft = getDaysUntilMonthDay(annivMD);
        const occasionKey = `anniversary_${new Date().getFullYear()}`;
        const alreadySent = db.hasSentToday(customer.id, occasionKey);

        if (daysLeft === 0) {
          todayEvents.push({
            id: `evt_anniv_${customer.id}`,
            type: 'anniversary',
            typeLabel: customer.anniversaryType || 'Ngày kỷ niệm',
            occasionKey,
            occasionTitle: customer.anniversaryType || 'Kỷ niệm đồng hành',
            customer,
            templateId: anniversaryTemplate ? anniversaryTemplate.id : '',
            templateName: anniversaryTemplate ? anniversaryTemplate.name : '',
            daysRemaining: 0,
            alreadySent
          });
        } else if (daysLeft !== null && daysLeft > 0 && daysLeft <= maxUpcomingDays) {
          upcomingEvents.push({
            id: `up_anniv_${customer.id}`,
            type: 'anniversary',
            typeLabel: customer.anniversaryType || 'Ngày kỷ niệm',
            occasionTitle: customer.anniversaryType || 'Ngày kỷ niệm',
            customer,
            templateId: anniversaryTemplate ? anniversaryTemplate.id : '',
            dateDisplay: annivMD.split('-').reverse().join('/'),
            daysRemaining: daysLeft
          });
        }
      }
    }

    // 3. Check Holidays today
    for (const hol of holidays) {
      const daysLeft = getDaysUntilMonthDay(hol.dateMonthDay);
      if (daysLeft === 0 && hol.autoSend !== false) {
        const holTemplate =
          db.getTemplateById(hol.templateId) || this.getDefaultTemplateByCategory('holiday');

        for (const customer of customers) {
          if (!matchesTargetAudience(customer, hol.targetAudience)) continue;
          const occasionKey = `holiday_${hol.id}_${new Date().getFullYear()}`;
          const alreadySent = db.hasSentToday(customer.id, occasionKey);

          todayEvents.push({
            id: `evt_hol_${hol.id}_${customer.id}`,
            type: 'holiday',
            typeLabel: `Ngày Lễ: ${hol.name}`,
            occasionKey,
            occasionTitle: hol.name,
            customer,
            templateId: holTemplate ? holTemplate.id : '',
            templateName: holTemplate ? holTemplate.name : '',
            daysRemaining: 0,
            alreadySent
          });
        }
      }
    }

    upcomingEvents.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      todayEvents,
      upcomingEvents
    };
  }

  /**
   * Execute sending all today's pending greetings
   */
  async runDailyGreetings({ skipAlreadySent = true } = {}) {
    if (this.isRunningBatch) {
      return { busy: true, message: 'Hệ thống đang thực hiện gửi hàng loạt, vui lòng đợi...' };
    }

    this.isRunningBatch = true;
    const settings = db.getSettings();
    const { todayEvents } = this.getEventsOverview();
    const results = [];

    try {
      for (let i = 0; i < todayEvents.length; i++) {
        const evt = todayEvents[i];
        if (skipAlreadySent && evt.alreadySent) {
          continue;
        }

        const template =
          db.getTemplateById(evt.templateId) || this.getDefaultTemplateByCategory(evt.type);

        const res = await zaloService.sendGreeting({
          customer: evt.customer,
          template,
          holidayName: evt.occasionTitle,
          occasionKey: evt.occasionKey
        });

        results.push(res);

        // Apply protective delay if not mock mode and more items remain
        if (settings.zaloMode !== 'mock' && i < todayEvents.length - 1) {
          const delayMs = Math.max(1000, Number(settings.delayBetweenMessagesMs) || 3000);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    } finally {
      this.isRunningBatch = false;
    }

    return {
      totalProcessed: results.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
      results
    };
  }

  /**
   * Run a Holiday / Festival Campaign for all matching customers
   */
  async runHolidayCampaign({ holidayId, customTemplateId = null }) {
    if (this.isRunningBatch) {
      throw new Error('Hệ thống đang chạy một tiến trình gửi hàng loạt khác.');
    }

    const holiday = db.getHolidays().find((h) => h.id === holidayId);
    if (!holiday) {
      throw new Error('Không tìm thấy dịp lễ này.');
    }

    const template =
      db.getTemplateById(customTemplateId || holiday.templateId) ||
      this.getDefaultTemplateByCategory('holiday');

    const customers = db
      .getCustomers()
      .filter((c) => c.active !== false && matchesTargetAudience(c, holiday.targetAudience));

    this.isRunningBatch = true;
    const settings = db.getSettings();
    const results = [];

    try {
      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        const occasionKey = `campaign_${holiday.id}_${new Date().toISOString().slice(0, 10)}`;

        const res = await zaloService.sendGreeting({
          customer,
          template,
          holidayName: holiday.name,
          occasionKey
        });
        results.push(res);

        if (settings.zaloMode !== 'mock' && i < customers.length - 1) {
          const delayMs = Math.max(1000, Number(settings.delayBetweenMessagesMs) || 3000);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    } finally {
      this.isRunningBatch = false;
    }

    return {
      holidayName: holiday.name,
      totalProcessed: results.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
      results
    };
  }
}

module.exports = {
  schedulerService: new SchedulerService()
};
