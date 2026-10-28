const { db } = require('./dbService');
const { zaloService } = require('./zaloService');
const { buildVariables, renderText } = require('./personalizer');

function getDefaultAiConfig() {
  return {
    enabled: true,
    provider: 'auto', // 'auto' (Gemini/OpenAI if key present, else Smart Local RAG) | 'gemini' | 'openai' | 'local_rag'
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: 'gemini-2.5-flash',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-4o-mini',
    autoLearnFromZalo: true,
    humanTakeoverMinutes: 30, // Pause AI for 30 mins in a thread if the human owner manually replies
    replyPriority: 'ai_after_keywords', // 'ai_first' | 'ai_after_keywords'
    systemPersona:
      'Bạn là Trợ lý Chăm sóc Khách hàng & Tư vấn Thiết kế của Bản Việt Design (đại diện cho anh Hoàn Phạm). Phong cách giao tiếp: Lịch sự, ấm áp, chuyên nghiệp, tôn trọng khách hàng, xưng hô chuẩn mực theo danh xưng ({xung_ho} {ten} - xưng {xung_em}), câu văn ngắn gọn, tự nhiên như người thật đang nhắn tin trên Zalo, không dùng văn phong máy móc.',
    learnedStyleSummary:
      'Thường mở đầu bằng "Dạ", "Dạ vâng ạ", xưng "em" hoặc "mình" tùy mức độ thân thiết, luôn gọi tên khách kèm danh xưng (Anh/Chị), trả lời trọng tâm, nhiệt tình và chu đáo.'
  };
}

function getDefaultKnowledgeDocs() {
  return [
    {
      id: 'kb_banviet_intro',
      title: 'Giới thiệu Dịch vụ Bản Việt Design',
      topic: 'gioi_thieu, dich_vu, thiet_ke, thi_cong, noi_that, kien_truc, nha_dep',
      content:
        'Bản Việt Design chuyên tư vấn, thiết kế và thi công trọn gói Kiến trúc & Nội thất (Biệt thự, Nhà phố, Căn hộ chung cư, Văn phòng, Showroom). Đội ngũ kiến trúc sư giàu kinh nghiệm, cam kết bản vẽ 3D sát thực tế 99%, tối ưu công năng và ngân sách cho gia chủ.'
    },
    {
      id: 'kb_banviet_pricing',
      title: 'Quy trình Tư vấn & Báo giá Thiết kế - Thi công',
      topic: 'bao_gia, gia_thiet_ke, chi_phi, don_gia, bao_nhieu_tien, quy_trinh',
      content:
        'Quy trình làm việc tại Bản Việt Design gồm: 1) Tiếp nhận nhu cầu & khảo sát hiện trạng miễn phí; 2) Lên phương án mặt bằng công năng 2D; 3) Thiết kế phối cảnh 3D chi tiết; 4) Bóc tách dự toán thi công minh bạch từng hạng mục. Đặc biệt ưu đãi giảm tới 50-100% phí thiết kế khi khách hàng ký hợp đồng thi công trọn gói.'
    },
    {
      id: 'kb_banviet_warranty',
      title: 'Chính sách Bảo hành & Cam kết Chất lượng',
      topic: 'bao_hanh, chat_luong, vat_lieu, tien_do, hop_dong, uy_tin',
      content:
        'Bản Việt Design cam kết sử dụng đúng 100% chủng loại vật liệu trong hợp đồng, đảm bảo tiến độ bàn giao chuẩn xác, bảo hành kỹ thuật dài hạn và bảo trì định kỳ tận nơi để khách hàng hoàn toàn an tâm trong suốt quá trình sử dụng.'
    },
    {
      id: 'kb_banviet_contact',
      title: 'Đặt lịch hẹn & Liên hệ Trực tiếp',
      topic: 'hen_gap, lich_hen, dia_chi, so_dien_thoai, hotline, gap_truc_tiep, cafe',
      content:
        'Khách hàng cần trao đổi trực tiếp hoặc khảo sát công trình có thể nhắn khung giờ thuận tiện hoặc liên hệ trực tiếp Hotline {sdt_hotline}. Anh Hoàn Phạm và đội ngũ KTS Bản Việt Design luôn sẵn sàng hỗ trợ tận nơi.'
    }
  ];
}

function getDefaultLearnedPairs() {
  return [
    {
      id: 'lp_1',
      customerText: 'Bên mình có nhận thiết kế thi công nội thất trọn gói không em?',
      ownerReply:
        'Dạ bên {xung_em} nhận tư vấn, thiết kế và thi công trọn gói từ A-Z luôn {xung_ho_thuong} {ten} nhé! {xung_ho} đang dự định làm nhà phố, biệt thự hay căn hộ chung cư để {xung_em} gửi một số mẫu công trình thực tế bên {xung_em} vừa hoàn thiện cho {xung_ho_thuong} tham khảo ạ?',
      customerName: 'Mẫu học tập mặc định',
      source: 'preset',
      createdAt: new Date().toISOString()
    },
    {
      id: 'lp_2',
      customerText: 'Giá thiết kế bên mình tính bao nhiêu 1m2 vậy?',
      ownerReply:
        'Dạ đơn giá thiết kế bên {ten_thuong_hieu} phụ thuộc vào diện tích sàn và phong cách thiết kế (Hiện đại, Tân cổ điển, Luxury hay Wabi Sabi) ạ. Đặc biệt nếu bên {xung_em} thi công trọn gói thì sẽ có chính sách ưu đãi khấu trừ phí thiết kế rất tốt cho {xung_ho_thuong} {ten}. {xung_ho} cho {xung_em} xin diện tích sơ bộ để {xung_em} gửi bảng báo giá chi tiết nhé!',
      customerName: 'Mẫu học tập mặc định',
      source: 'preset',
      createdAt: new Date().toISOString()
    },
    {
      id: 'lp_3',
      customerText: 'Cuối tuần này qua khảo sát giúp anh được không?',
      ownerReply:
        'Dạ hoàn toàn được {xung_ho_thuong} {ten} ơi! {xung_ho} dự kiến khoảng mấy giờ sáng hay chiều cuối tuần này thuận tiện cho {xung_ho_thuong} để {xung_em} sắp xếp lịch qua khảo sát và trao đổi trực tiếp cùng {xung_ho_thuong} ạ?',
      customerName: 'Mẫu học tập mặc định',
      source: 'preset',
      createdAt: new Date().toISOString()
    },
    {
      id: 'lp_4',
      customerText: 'Cảm ơn em đã gửi thiệp chúc mừng nhé, đẹp lắm!',
      ownerReply:
        'Dạ không có chi đâu ạ! 🥰 {xung_em} và {ten_thuong_hieu} rất vui khi {xung_ho_thuong} {ten} thích tấm thiệp này. Chúc {xung_ho_thuong} cùng gia đình luôn thật nhiều sức khỏe, niềm vui và vạn sự hanh thông nhé!',
      customerName: 'Mẫu học tập mặc định',
      source: 'preset',
      createdAt: new Date().toISOString()
    }
  ];
}

class AiService {
  constructor() {
    // threadId -> [{ role: 'customer' | 'owner' | 'bot', text, timestamp }]
    this.threadHistoryMap = new Map();
    // threadId -> { text, customerName, timestamp }
    this.lastCustomerMsgMap = new Map();
    // threadId -> timestampMs when the human owner manually sent a message
    this.humanTakeoverMap = new Map();
    // Set of trimmed text strings recently sent by the Bot itself (to distinguish Bot messages from Owner's manual messages)
    this.botSentTexts = new Set();

    this.ensureDbInitialized();
  }

  ensureDbInitialized() {
    let mutated = false;
    if (!db.data.aiConfig) {
      db.data.aiConfig = getDefaultAiConfig();
      mutated = true;
    }
    if (!Array.isArray(db.data.aiKnowledgeDocs) || db.data.aiKnowledgeDocs.length === 0) {
      db.data.aiKnowledgeDocs = getDefaultKnowledgeDocs();
      mutated = true;
    }
    if (!Array.isArray(db.data.aiLearnedPairs) || db.data.aiLearnedPairs.length === 0) {
      db.data.aiLearnedPairs = getDefaultLearnedPairs();
      mutated = true;
    }
    if (mutated) {
      db.save();
    }
  }

  getConfig() {
    this.ensureDbInitialized();
    return db.data.aiConfig;
  }

  updateConfig(partial) {
    this.ensureDbInitialized();
    db.data.aiConfig = {
      ...db.data.aiConfig,
      ...partial
    };
    db.save();
    return db.data.aiConfig;
  }

  getKnowledgeDocs() {
    this.ensureDbInitialized();
    return db.data.aiKnowledgeDocs;
  }

  saveKnowledgeDoc(doc) {
    this.ensureDbInitialized();
    const docs = db.data.aiKnowledgeDocs;
    if (doc.id) {
      const idx = docs.findIndex((d) => d.id === doc.id);
      if (idx !== -1) {
        docs[idx] = { ...docs[idx], ...doc };
        db.save();
        return docs[idx];
      }
    }
    const newDoc = {
      id: `kb_${Date.now()}`,
      title: (doc.title || 'Kiến thức mới').trim(),
      topic: (doc.topic || '').trim(),
      content: (doc.content || '').trim()
    };
    docs.unshift(newDoc);
    db.save();
    return newDoc;
  }

  deleteKnowledgeDoc(id) {
    this.ensureDbInitialized();
    db.data.aiKnowledgeDocs = db.data.aiKnowledgeDocs.filter((d) => d.id !== id);
    db.save();
    return true;
  }

  getLearnedPairs() {
    this.ensureDbInitialized();
    return db.data.aiLearnedPairs;
  }

  addLearnedPair({ customerText, ownerReply, customerName = 'Khách hàng Zalo', source = 'manual' }, skipSave = false) {
    this.ensureDbInitialized();
    const cleanQ = String(customerText || '').trim();
    const cleanA = String(ownerReply || '').trim();
    if (!cleanQ || !cleanA) return null;
    if (cleanA.length < 3) return null;

    // Avoid exact duplicate
    const exists = db.data.aiLearnedPairs.some(
      (p) =>
        p.customerText.toLowerCase() === cleanQ.toLowerCase() &&
        p.ownerReply.toLowerCase() === cleanA.toLowerCase()
    );
    if (exists) return null;

    const item = {
      id: `lp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      customerText: cleanQ,
      ownerReply: cleanA,
      customerName,
      source,
      createdAt: new Date().toISOString()
    };

    db.data.aiLearnedPairs.unshift(item);
    if (db.data.aiLearnedPairs.length > 500) {
      db.data.aiLearnedPairs = db.data.aiLearnedPairs.slice(0, 500);
    }

    if (!skipSave) {
      this.recomputeStyleSummary();
      db.save();
    }
    return item;
  }

  deleteLearnedPair(id) {
    this.ensureDbInitialized();
    db.data.aiLearnedPairs = db.data.aiLearnedPairs.filter((p) => p.id !== id);
    db.save();
    return true;
  }

  /**
   * Mark a message text as sent by the bot so selfListen doesn't mistake it for a manual human message
   */
  markBotSentText(text) {
    const key = String(text || '').trim().slice(0, 120);
    if (!key) return;
    this.botSentTexts.add(key);
    setTimeout(() => {
      this.botSentTexts.delete(key);
    }, 30000);
  }

  isBotSentText(text) {
    const key = String(text || '').trim().slice(0, 120);
    return this.botSentTexts.has(key);
  }

  /**
   * Check if the human owner is currently handling this conversation thread manually
   */
  isHumanTakeoverActive(threadId) {
    const cfg = this.getConfig();
    const takeoverMin = Number(cfg.humanTakeoverMinutes) || 0;
    if (takeoverMin <= 0) return false;
    const lastHumanTs = this.humanTakeoverMap.get(String(threadId)) || 0;
    return Date.now() - lastHumanTs < takeoverMin * 60 * 1000;
  }

  /**
   * Record and learn from real-time Zalo messages (both Customer incoming and Owner's manual outgoing replies)
   */
  observeRealTimeZaloMessage(message) {
    if (!message || message.type === 1) return; // Only 1-1 private chats
    const content = message.data && message.data.content;
    if (typeof content !== 'string' || !content.trim()) return;

    const text = content.trim();
    const threadId = String(message.threadId || '');
    if (!threadId) return;

    const history = this.threadHistoryMap.get(threadId) || [];

    if (!message.isSelf) {
      // Customer sent a message
      const senderName = (message.data && message.data.dName) || 'Khách hàng Zalo';
      this.lastCustomerMsgMap.set(threadId, {
        text,
        customerName: senderName,
        timestamp: Date.now()
      });
      history.push({ role: 'customer', text, timestamp: Date.now() });
    } else {
      // Logged-in account sent a message
      if (this.isBotSentText(text)) {
        history.push({ role: 'bot', text, timestamp: Date.now() });
      } else {
        // Human Owner manually typed & sent this message on Zalo!
        this.humanTakeoverMap.set(threadId, Date.now());
        history.push({ role: 'owner', text, timestamp: Date.now() });

        const cfg = this.getConfig();
        if (cfg.autoLearnFromZalo !== false) {
          const prevCustomerMsg = this.lastCustomerMsgMap.get(threadId);
          if (prevCustomerMsg && Date.now() - prevCustomerMsg.timestamp < 12 * 3600 * 1000) {
            const cust = db.getCustomers().find((c) => String(c.zaloUid) === threadId);
            const cName = cust ? `${cust.salutation || ''} ${cust.fullName}`.trim() : prevCustomerMsg.customerName;
            this.addLearnedPair({
              customerText: prevCustomerMsg.text,
              ownerReply: text,
              customerName: cName,
              source: 'zalo_realtime'
            });
            console.log(`[AI Learner] Đã tự học câu trả lời mới của bạn với ${cName}!`);
          }
        }
      }
    }

    if (history.length > 14) {
      this.threadHistoryMap.set(threadId, history.slice(-14));
    } else {
      this.threadHistoryMap.set(threadId, history);
    }
  }

  /**
   * Pull recent messages from Zalo WebSocket (`requestOldMessages`) and extract Q&A pairs + owner style
   */
  async syncAndLearnOldMessagesFromZalo() {
    const api = zaloService.personalApi;
    if (!api || !api.listener) {
      throw new Error('Chưa kết nối tài khoản Zalo Cá nhân. Vui lòng kết nối QR trước.');
    }

    const { ThreadType } = await zaloService.getZcaModule();

    // Ensure listener is started
    if (!api.listener.ws) {
      api.listener.start({ retryOnClose: true });
      await new Promise((r) => setTimeout(r, 1500));
    }

    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            learnedCount: 0,
            scannedCount: 0,
            message: 'Đã bật chế độ tự động lắng nghe & học trực tiếp mỗi khi bạn nhắn tin trên Zalo!'
          });
        }
      }, 5500);

      const onOldMsgs = (msgs) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        let learnedCount = 0;
        const list = Array.isArray(msgs) ? msgs : [];

        // Group messages by threadId and sort chronologically
        const byThread = new Map();
        for (const m of list) {
          if (!m || !m.data || typeof m.data.content !== 'string') continue;
          const tid = String(m.threadId || '');
          if (!tid) continue;
          if (!byThread.has(tid)) byThread.set(tid, []);
          byThread.get(tid).push({
            isSelf: Boolean(m.isSelf),
            text: m.data.content.trim(),
            ts: Number(m.data.ts) || 0,
            dName: m.data.dName || ''
          });
        }

        for (const [tid, threadMsgs] of byThread.entries()) {
          threadMsgs.sort((a, b) => a.ts - b.ts);
          const cust = db.getCustomers().find((c) => String(c.zaloUid) === tid);
          const custDisplay = cust ? `${cust.salutation || ''} ${cust.fullName}`.trim() : 'Bạn Zalo';

          // Populate threadHistoryMap as well
          this.threadHistoryMap.set(
            tid,
            threadMsgs.slice(-10).map((x) => ({
              role: x.isSelf ? 'owner' : 'customer',
              text: x.text,
              timestamp: x.ts
            }))
          );

          for (let i = 0; i < threadMsgs.length - 1; i++) {
            const cur = threadMsgs[i];
            const next = threadMsgs[i + 1];
            if (!cur.isSelf && next.isSelf && cur.text.length >= 2 && next.text.length >= 4) {
              const added = this.addLearnedPair(
                {
                  customerText: cur.text,
                  ownerReply: next.text,
                  customerName: custDisplay || cur.dName || 'Khách hàng Zalo',
                  source: 'zalo_history'
                },
                true
              );
              if (added) learnedCount++;
            }
          }
        }

        this.recomputeStyleSummary();
        db.save();

        resolve({
          learnedCount,
          scannedCount: list.length,
          threadsCount: byThread.size,
          message: `Đã quét ${list.length} tin nhắn gần đây trên Zalo và trích xuất thêm ${learnedCount} mẫu đối thoại thực tế của bạn!`
        });
      };

      api.listener.once('old_messages', onOldMsgs);
      try {
        api.listener.requestOldMessages(ThreadType.User, null);
      } catch (e) {
        clearTimeout(timeout);
        resolved = true;
        resolve({
          learnedCount: 0,
          scannedCount: 0,
          message: 'Đã kích hoạt bộ lắng nghe học tập theo thời gian thực trên Zalo của bạn.'
        });
      }
    });
  }

  /**
   * Analyze owner's learned replies to summarize their personal writing style
   */
  recomputeStyleSummary() {
    const pairs = this.getLearnedPairs();
    if (!pairs.length) return;

    const replies = pairs.map((p) => p.ownerReply);
    const totalLen = replies.reduce((acc, r) => acc + r.length, 0);
    const avgLen = Math.round(totalLen / replies.length);

    const commonOpeners = [];
    if (replies.some((r) => /^dạ\b/i.test(r))) commonOpeners.push('"Dạ..."');
    if (replies.some((r) => /vâng/i.test(r))) commonOpeners.push('"Dạ vâng"');
    if (replies.some((r) => /nhé|nha\b/i.test(r))) commonOpeners.push('từ cuối câu thân thiện ("nhé", "ạ")');
    if (replies.some((r) => /em\b/i.test(r))) commonOpeners.push('xưng "em"');

    const summary = `Đã học từ ${pairs.length} mẫu hội thoại của bạn • Độ dài câu trung bình ~${avgLen} ký tự • Đặc trưng văn phong: ${
      commonOpeners.length ? commonOpeners.join(', ') : 'Lịch sự, rõ ràng, trọng tâm'
    }.`;

    db.data.aiConfig.learnedStyleSummary = summary;
  }

  /**
   * Tokenize & strip Vietnamese tones for similarity scoring (RAG retrieval)
   */
  tokenizeNormalized(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);
  }

  computeSimilarity(queryText, targetText) {
    const qTokens = this.tokenizeNormalized(queryText);
    const tTokens = this.tokenizeNormalized(targetText);
    if (!qTokens.length || !tTokens.length) return 0;

    const tSet = new Set(tTokens);
    let matches = 0;
    for (const w of qTokens) {
      if (tSet.has(w)) matches++;
    }

    // Bonus for substring match
    const qNorm = qTokens.join(' ');
    const tNorm = tTokens.join(' ');
    const phraseBonus = tNorm.includes(qNorm) || qNorm.includes(tNorm) ? 0.35 : 0;

    return matches / Math.sqrt(qTokens.length * tTokens.length) + phraseBonus;
  }

  /**
   * Retrieve top matching learned pairs and knowledge base docs for a customer message
   */
  retrieveContext(incomingText) {
    const pairs = this.getLearnedPairs();
    const scoredPairs = pairs
      .map((p) => ({
        pair: p,
        score: this.computeSimilarity(incomingText, p.customerText)
      }))
      .sort((a, b) => b.score - a.score);

    const docs = this.getKnowledgeDocs();
    const scoredDocs = docs
      .map((d) => ({
        doc: d,
        score: this.computeSimilarity(incomingText, `${d.title} ${d.topic} ${d.content}`)
      }))
      .sort((a, b) => b.score - a.score);

    return {
      topPairs: scoredPairs.slice(0, 5),
      topDocs: scoredDocs.slice(0, 3)
    };
  }

  /**
   * Generate intelligent, style-matched customer care response using:
   * 1) Google Gemini API (if configured)
   * 2) OpenAI / Compatible API (if configured)
   * 3) Built-in Smart Local RAG & Few-Shot Style Cloner (always works out of the box!)
   */
  async generateAiReply({ customer, incomingText, threadId = '' }) {
    const cfg = this.getConfig();
    const settings = db.getSettings();
    const vars = buildVariables({ customer, template: {}, settings, holidayName: '' });

    const { topPairs, topDocs } = this.retrieveContext(incomingText);
    const threadHistory = (threadId && this.threadHistoryMap.get(String(threadId))) || [];

    const useGemini =
      (cfg.provider === 'gemini' || cfg.provider === 'auto') &&
      cfg.geminiApiKey &&
      cfg.geminiApiKey.trim().length > 10;

    const useOpenAi =
      (cfg.provider === 'openai' || (cfg.provider === 'auto' && !useGemini)) &&
      cfg.openaiApiKey &&
      cfg.openaiApiKey.trim().length > 10;

    const systemPrompt = this.buildSystemPrompt({
      cfg,
      settings,
      customer,
      vars,
      topPairs,
      topDocs,
      threadHistory
    });

    if (useGemini) {
      try {
        const reply = await this.callGeminiApi({
          apiKey: cfg.geminiApiKey.trim(),
          model: cfg.geminiModel || 'gemini-2.5-flash',
          systemPrompt,
          userMessage: incomingText
        });
        if (reply) {
          return {
            replyText: renderText(reply, vars),
            engine: `Google Gemini (${cfg.geminiModel || 'gemini-2.5-flash'})`,
            matchedContext: topPairs[0] && topPairs[0].score > 0.2 ? topPairs[0].pair.customerText : 'AI Tư duy ngữ cảnh'
          };
        }
      } catch (err) {
        console.warn('[AI Gemini] Fallback to Local RAG:', err.message);
      }
    }

    if (useOpenAi) {
      try {
        const reply = await this.callOpenAiApi({
          apiKey: cfg.openaiApiKey.trim(),
          baseUrl: cfg.openaiBaseUrl || 'https://api.openai.com/v1',
          model: cfg.openaiModel || 'gpt-4o-mini',
          systemPrompt,
          userMessage: incomingText
        });
        if (reply) {
          return {
            replyText: renderText(reply, vars),
            engine: `OpenAI (${cfg.openaiModel || 'gpt-4o-mini'})`,
            matchedContext: topPairs[0] && topPairs[0].score > 0.2 ? topPairs[0].pair.customerText : 'AI Tư duy ngữ cảnh'
          };
        }
      } catch (err) {
        console.warn('[AI OpenAI] Fallback to Local RAG:', err.message);
      }
    }

    // Built-in Smart Local RAG & Style Cloner (Zero external API key needed!)
    const localResult = this.buildLocalSmartRagReply({
      incomingText,
      vars,
      topPairs,
      topDocs
    });

    return localResult;
  }

  buildSystemPrompt({ cfg, settings, customer, vars, topPairs, topDocs, threadHistory }) {
    const persona = renderText(cfg.systemPersona || '', vars);
    const examplesText = topPairs
      .map(
        (x, i) =>
          `Ví dụ ${i + 1}:\n- Khách nhắn: "${x.pair.customerText}"\n- Cách bạn trả lời: "${renderText(x.pair.ownerReply, vars)}"`
      )
      .join('\n\n');

    const kbText = topDocs
      .map((x) => `• [${x.doc.title}]: ${renderText(x.doc.content, vars)}`)
      .join('\n');

    const historyText = threadHistory
      .slice(-6)
      .map((h) => `${h.role === 'customer' ? 'Khách' : 'Bạn'}: ${h.text}`)
      .join('\n');

    return `${persona}

THÔNG TIN KHÁCH HÀNG ĐANG TRÒ CHUYỆN:
- Họ tên: ${customer.fullName || 'Quý khách'}
- Cách gọi khách (xưng hô): "${vars.xung_ho} ${vars.ten}" (hoặc "${vars.xung_ho_thuong} ${vars.ten}" ở giữa câu)
- Đại từ xưng hô của bạn: "${vars.xung_em}"
- Thương hiệu: ${settings.brandName || 'Bản Việt Design'} | Hotline: ${settings.hotline || ''}

ĐẶC TRƯNG GIỌNG VĂN CỦA BẠN (HÃY BẮT CHƯỚC Y HỆT PHONG CÁCH NÀY):
${cfg.learnedStyleSummary || ''}

CÁC MẪU HỘI THOẠI THỰC TẾ BẠN ĐÃ TỪNG TRẢ LỜI TRÊN ZALO:
${examplesText}

KIẾN THỨC DỊCH VỤ CỦA DOANH NGHIỆP:
${kbText}

${historyText ? `LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY VỚI KHÁCH NÀY:\n${historyText}\n` : ''}
YÊU CẦU QUAN TRỌNG:
- Chỉ viết nội dung tin nhắn trả lời trực tiếp cho khách hàng trên Zalo (ngắn gọn 2-4 câu, tự nhiên, chân thành như người thật đang gõ phím).
- Luôn xưng "${vars.xung_em}" và gọi khách là "${vars.xung_ho_thuong} ${vars.ten}" hoặc "${vars.xung_ho} ${vars.ten}".`;
  }

  async callGeminiApi({ apiKey, model, systemPrompt, userMessage }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 350
        }
      })
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || 'Gemini API error');
    }
    const text =
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;
    return text ? text.trim() : '';
  }

  async callOpenAiApi({ apiKey, baseUrl, model, systemPrompt, userMessage }) {
    const cleanBase = String(baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const res = await fetch(`${cleanBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.55,
        max_tokens: 350,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || 'OpenAI API error');
    }
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return text ? text.trim() : '';
  }

  /**
   * Smart Local RAG & Style Cloner fallback (works offline/without external API keys)
   */
  buildLocalSmartRagReply({ incomingText, vars, topPairs, topDocs }) {
    const bestPair = topPairs[0];
    const bestDoc = topDocs[0];

    // 1. If a learned pair from the owner's Zalo matches closely, adapt it with the current customer's salutation & name!
    if (bestPair && bestPair.score >= 0.26) {
      let adapted = bestPair.pair.ownerReply;
      adapted = renderText(adapted, vars);
      return {
        replyText: adapted,
        engine: 'AI Học Giọng Văn Nội Bộ (Khớp mẫu câu của bạn)',
        matchedContext: `Học từ câu: "${bestPair.pair.customerText}"`
      };
    }

    // 2. If a Knowledge Base document matches the customer's question, synthesize a natural response in the owner's tone
    if (bestDoc && bestDoc.score >= 0.16) {
      const kbContent = renderText(bestDoc.doc.content, vars);
      const reply = `Dạ chào ${vars.xung_ho} ${vars.ten} ạ! Về nội dung ${vars.xung_ho_thuong} đang quan tâm, ${vars.xung_em} xin chia sẻ thông tin từ ${vars.ten_thuong_hieu} như sau ạ:\n\n✨ ${kbContent}\n\n${vars.xung_ho} ${vars.ten} cần tư vấn chi tiết hơn về hạng mục nào cứ nhắn để ${vars.xung_em} hỗ trợ ngay nhé!`;
      return {
        replyText: reply,
        engine: 'AI Tri Thức Doanh Nghiệp (RAG)',
        matchedContext: `Kiến thức: ${bestDoc.doc.title}`
      };
    }

    // 3. Conversational greeting / general inquiry handling in owner's warm style
    const norm = this.tokenizeNormalized(incomingText).join(' ');
    if (/\b(alo|chao|hi|hello|shop|em oi|anh oi|co ai)\b/.test(norm)) {
      return {
        replyText: `Dạ ${vars.xung_em} chào ${vars.xung_ho} ${vars.ten} ạ! 👋 Không biết hôm nay ${vars.xung_ho_thuong} ${vars.ten} đang cần ${vars.xung_em} và ${vars.ten_thuong_hieu} tư vấn hay hỗ trợ thông tin gì ạ?`,
        engine: 'AI Giao Tiếp Tự Nhiên',
        matchedContext: 'Chào hỏi & Mở đầu hội thoại'
      };
    }

    return {
      replyText: `Dạ ${vars.xung_em} đã nhận được tin nhắn của ${vars.xung_ho_thuong} ${vars.ten} ạ! ${vars.xung_em} xin phép kiểm tra thông tin chi tiết và phản hồi lại ${vars.xung_ho_thuong} ${vars.ten} ngay trong ít phút nữa nhé. Nếu cần trao đổi gấp, ${vars.xung_ho_thuong} có thể gọi trực tiếp giúp ${vars.xung_em} qua số ${vars.sdt_hotline} ạ! 🙏`,
      engine: 'AI Chăm Sóc Khách Hàng',
      matchedContext: 'Phản hồi tiếp nhận thông minh'
    };
  }
}

module.exports = {
  aiService: new AiService()
};
