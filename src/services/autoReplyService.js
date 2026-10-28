const { db } = require('./dbService');
const { buildVariables, renderText } = require('./personalizer');
const { zaloService } = require('./zaloService');
const { aiService } = require('./aiService');

class AutoReplyService {
  constructor() {
    this.isListening = false;
    this.boundApi = null;
    // Map of `${uid}_${ruleId}` -> lastReplyTimestampMs
    this.cooldownMap = new Map();
  }

  /**
   * Attach listener to Zalo Personal WebSocket if connected
   */
  ensureListenerStarted() {
    const api = zaloService.personalApi;
    const config = db.getAutoReplyConfig();

    if (!api || !api.listener) {
      this.isListening = false;
      return { listening: false, reason: 'Chưa kết nối phiên Zalo Cá nhân' };
    }

    // Always enable selfListen on listener so AI can learn from Owner's outgoing replies
    api.listener.selfListen = true;

    if (!config.enabled && !aiService.getConfig().autoLearnFromZalo) {
      if (this.isListening) {
        try {
          api.listener.stop();
        } catch (_) {}
        this.isListening = false;
      }
      return { listening: false, reason: 'Tính năng Trả lời tự động đang TẮT' };
    }

    if (this.boundApi !== api) {
      this.boundApi = api;
      api.listener.removeAllListeners('message');
      api.listener.on('message', async (message) => {
        try {
          await this.handleIncomingZaloPersonalMessage(message);
        } catch (err) {
          console.error('[AutoReply] Lỗi xử lý tin nhắn đến:', err.message);
        }
      });

      api.listener.on('error', (err) => {
        console.warn('[AutoReply Listener] WebSocket notice:', err && err.message ? err.message : err);
      });
    }

    if (!this.isListening) {
      try {
        api.listener.start({ retryOnClose: true });
        this.isListening = true;
        console.log('[AutoReply] Đã bật lắng nghe & trả lời tin nhắn Zalo tự động (Real-time WebSocket).');
      } catch (err) {
        console.warn('[AutoReply] Không thể khởi chạy listener:', err.message);
      }
    }

    return { listening: this.isListening };
  }

  /**
   * Check if current time matches configured workingHoursMode
   */
  isWithinActiveHours(config) {
    const mode = config.workingHoursMode || 'always';
    if (mode === 'always') return true;

    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    const parseHHMM = (str, fallback) => {
      const [h, m] = String(str || fallback).split(':').map(Number);
      return (isNaN(h) ? 8 : h) * 60 + (isNaN(m) ? 0 : m);
    };

    const startMin = parseHHMM(config.workStartHour, '08:00');
    const endMin = parseHHMM(config.workEndHour, '18:00');
    const isInsideWorkHours = curMinutes >= startMin && curMinutes <= endMin;

    if (mode === 'outside_hours') {
      return !isInsideWorkHours;
    }
    if (mode === 'custom_range') {
      return isInsideWorkHours;
    }
    return true;
  }

  /**
   * Normalize Vietnamese text (NFC + strip accents fallback) so both accented & unaccented keywords match reliably
   */
  normalizeText(str) {
    return String(str || '')
      .normalize('NFC')
      .trim()
      .toLowerCase();
  }

  stripVietnameseTones(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .trim()
      .toLowerCase();
  }

  /**
   * Match an incoming message string against active rules (strict whole-phrase accented matching)
   */
  matchRule(incomingText) {
    const cleanText = this.normalizeText(incomingText);
    if (!cleanText) return null;

    // Immediately ignore casual family/colleague internal chat
    const internalChatFilter = /\b(mày|tao|t chưa|nó đến|nó đấu|bố thỏ|mẹ thỏ|vợ|chồng|gửi bảo vệ|book ship|đợi ở sảnh|lấy xe|đi họp|mặc sơ mi)\b/i;
    if (internalChatFilter.test(cleanText)) {
      return null;
    }

    const rules = db
      .getAutoReplyRules()
      .filter((r) => r.active !== false)
      .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Check exact and whole-phrase contains rules first (preserving Vietnamese accents so "nó đấu" never matches "ở đâu"!)
    for (const rule of rules) {
      if (rule.matchType === 'default_fallback') continue;
      const kwList = String(rule.keywords || '')
        .split(',')
        .map((k) => this.normalizeText(k))
        .filter((k) => k.length >= 3);

      for (const kw of kwList) {
        if (rule.matchType === 'exact') {
          if (cleanText === kw) {
            return { rule, matchedKeyword: kw };
          }
        } else {
          const phraseRe = new RegExp(`(^|[\\s,.!?;:()"'])${escapeRegex(kw)}($|[\\s,.!?;:()"'])`, 'i');
          if (phraseRe.test(cleanText)) {
            return { rule, matchedKeyword: kw };
          }
        }
      }
    }

    // 2. Check fallback rule if enabled
    const fallbackRule = rules.find((r) => r.matchType === 'default_fallback');
    if (fallbackRule) {
      return { rule: fallbackRule, matchedKeyword: 'Mặc định (Ngoài từ khóa)' };
    }

    return null;
  }

  /**
   * Resolve customer profile by Zalo UID or sender display name
   */
  resolveSenderCustomer(uid, senderDisplayName) {
    const customers = db.getCustomers();
    const found = customers.find((c) => c.zaloUid && String(c.zaloUid) === String(uid));
    if (found) return { customer: found, isKnown: true };

    const inferred = zaloService.inferSalutationAndName(senderDisplayName || 'Quý khách', 0);
    return {
      customer: {
        id: `guest_${uid}`,
        fullName: inferred.cleanName || senderDisplayName || 'Quý khách',
        salutation: inferred.salutation || 'Anh/Chị',
        zaloUid: String(uid || '')
      },
      isKnown: false
    };
  }

  /**
   * Build personalized auto-reply text for a customer and rule
   */
  buildReplyText(customer, rule) {
    const settings = db.getSettings();
    const vars = buildVariables({
      customer,
      template: {},
      settings,
      holidayName: ''
    });
    return renderText(rule.replyText, vars);
  }

  /**
   * Handle incoming real-time message from Zalo Personal (zca-js Listener)
   */
  async handleIncomingZaloPersonalMessage(message) {
    if (!message) return;

    // 1. Always let AI Learner observe both incoming customer messages and Owner's outgoing replies
    aiService.observeRealTimeZaloMessage(message);

    // 2. Never reply to our own messages
    if (message.isSelf) return;

    const config = db.getAutoReplyConfig();
    if (!config.enabled) return;

    // ThreadType.User === 0, ThreadType.Group === 1
    const isGroup = message.type === 1;
    if (config.scope === 'private_only' && isGroup) return;

    const content = message.data && message.data.content;
    if (typeof content !== 'string' || !content.trim()) return;

    // 3. If human owner is actively chatting in this thread, pause Bot to let owner chat
    if (aiService.isHumanTakeoverActive(message.threadId)) {
      return;
    }

    if (!this.isWithinActiveHours(config)) return;

    const senderUid = String((message.data && message.data.uidFrom) || message.threadId || '');
    const senderName = (message.data && message.data.dName) || 'Bạn Zalo';

    const { customer, isKnown } = this.resolveSenderCustomer(senderUid, senderName);
    if (config.onlyReplyKnownContacts && !isKnown) return;

    const aiConfig = aiService.getConfig();
    let replyText = '';
    let ruleId = '';
    let ruleName = '';
    let matchedKeyword = '';

    const matchResult = this.matchRule(content);

    // Determine whether to use Keyword Rule or AI Brain
    const hasSpecificKeywordMatch = matchResult && matchResult.rule.matchType !== 'default_fallback';

    if (hasSpecificKeywordMatch && aiConfig.replyPriority !== 'ai_first') {
      const { rule } = matchResult;
      const cooldownKey = `${senderUid}_${rule.id}`;
      const lastSent = this.cooldownMap.get(cooldownKey) || 0;
      if (Date.now() - lastSent < 2 * 60 * 1000) return;

      this.cooldownMap.set(cooldownKey, Date.now());
      replyText = this.buildReplyText(customer, rule);
      ruleId = rule.id;
      ruleName = rule.name;
      matchedKeyword = matchResult.matchedKeyword;
    } else if (aiConfig.enabled) {
      // Cooldown check for AI replies per user (avoid rapid fire within 60s)
      const aiCooldownKey = `${senderUid}_ai_reply`;
      const lastAiSent = this.cooldownMap.get(aiCooldownKey) || 0;
      if (Date.now() - lastAiSent < 60 * 1000) return;

      const aiRes = await aiService.generateAiReply({
        customer,
        incomingText: content,
        threadId: message.threadId,
        isSimulator: false
      });
      if (!aiRes || !aiRes.replyText) return;

      this.cooldownMap.set(aiCooldownKey, Date.now());
      replyText = aiRes.replyText;
      ruleId = 'ai_brain';
      ruleName = aiRes.engine;
      matchedKeyword = aiRes.matchedContext;
    } else if (matchResult) {
      const { rule } = matchResult;
      const cooldownKey = `${senderUid}_${rule.id}`;
      const lastSent = this.cooldownMap.get(cooldownKey) || 0;
      const cooldownMs = Math.max(1, Number(config.cooldownMinutes) || 60) * 60 * 1000;
      if (Date.now() - lastSent < cooldownMs) return;

      this.cooldownMap.set(cooldownKey, Date.now());
      replyText = this.buildReplyText(customer, rule);
      ruleId = rule.id;
      ruleName = rule.name;
      matchedKeyword = matchResult.matchedKeyword;
    } else {
      return;
    }

    if (!replyText) return;

    // Natural delay before replying
    const delayMs = Math.max(1, Number(config.replyDelaySeconds) || 3) * 1000;
    await new Promise((r) => setTimeout(r, delayMs));

    const { ThreadType } = await zaloService.getZcaModule();
    const threadType = isGroup ? ThreadType.Group : ThreadType.User;

    // Mark text as sent by Bot so selfListen knows it was automated
    aiService.markBotSentText(replyText);

    await zaloService.personalApi.sendMessage(
      { msg: replyText },
      message.threadId,
      threadType
    );

    db.addAutoReplyLog({
      senderUid,
      senderName: `${customer.salutation || ''} ${customer.fullName}`.trim(),
      incomingText: content,
      ruleId,
      ruleName,
      matchedKeyword,
      replyText,
      mode: 'personal',
      status: 'replied'
    });
  }

  /**
   * Simulate / Test auto-reply from Web Dashboard (and optionally send for real)
   */
  async simulateOrSendTest({ incomingText, customerId, sendReal = false, forceAi = false }) {
    const customer =
      db.getCustomerById(customerId) ||
      db.getCustomers()[0] || {
        id: 'test_cust',
        fullName: 'Khách Hàng Thử Nghiệm',
        salutation: 'Anh'
      };

    const aiConfig = aiService.getConfig();
    const matchResult = this.matchRule(incomingText);
    const hasSpecificKeywordMatch = matchResult && matchResult.rule.matchType !== 'default_fallback';

    let replyText = '';
    let matchedKeyword = '';
    let ruleName = '';
    let ruleId = '';

    if (!forceAi && hasSpecificKeywordMatch && aiConfig.replyPriority !== 'ai_first') {
      replyText = this.buildReplyText(customer, matchResult.rule);
      matchedKeyword = matchResult.matchedKeyword;
      ruleName = matchResult.rule.name;
      ruleId = matchResult.rule.id;
    } else if (forceAi || aiConfig.enabled) {
      const aiRes = await aiService.generateAiReply({
        customer,
        incomingText,
        threadId: customer.zaloUid || customer.id,
        isSimulator: !sendReal
      });
      replyText = aiRes.replyText;
      matchedKeyword = `${aiRes.engine} • ${aiRes.matchedContext}`;
      ruleName = aiRes.engine;
      ruleId = 'ai_brain';
    } else if (matchResult) {
      replyText = this.buildReplyText(customer, matchResult.rule);
      matchedKeyword = matchResult.matchedKeyword;
      ruleName = matchResult.rule.name;
      ruleId = matchResult.rule.id;
    } else {
      return {
        matched: false,
        customer,
        incomingText,
        message: 'Không khớp từ khóa nào đang bật.'
      };
    }

    if (sendReal && zaloService.personalApi && customer.zaloUid) {
      const { ThreadType } = await zaloService.getZcaModule();
      aiService.markBotSentText(replyText);
      await zaloService.personalApi.sendMessage({ msg: replyText }, customer.zaloUid, ThreadType.User);
    }

    const logEntry = db.addAutoReplyLog({
      senderUid: customer.zaloUid || customer.id,
      senderName: `${customer.salutation || ''} ${customer.fullName}`.trim(),
      incomingText,
      ruleId,
      ruleName,
      matchedKeyword,
      replyText,
      mode: sendReal ? 'personal' : 'simulator',
      status: sendReal ? 'replied' : 'simulated'
    });

    return {
      matched: true,
      customer,
      rule: { id: ruleId, name: ruleName },
      matchedKeyword,
      replyText,
      log: logEntry
    };
  }
}

module.exports = {
  autoReplyService: new AutoReplyService()
};
