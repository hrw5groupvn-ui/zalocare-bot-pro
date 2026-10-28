const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { db } = require('./dbService');
const { generateGreetingCard } = require('./cardGenerator');
const { personalizeTemplate } = require('./personalizer');

class ZaloService {
  constructor() {
    this.personalApi = null;
    this.qrSession = {
      status: 'idle', // 'idle' | 'waiting_scan' | 'scanned' | 'connected' | 'expired' | 'error'
      qrImageBase64: null,
      scannedUser: null,
      error: null,
      updatedAt: null
    };
  }

  async getZcaModule() {
    return await import('zca-js');
  }

  async createZaloInstance() {
    const { Zalo } = await this.getZcaModule();
    return new Zalo({
      selfListen: true,
      checkUpdate: false,
      logging: false,
      imageMetadataGetter: async (filePath) => {
        const metadata = await sharp(filePath).metadata();
        const stats = await fs.promises.stat(filePath);
        return {
          width: metadata.width || 1200,
          height: metadata.height || 675,
          size: stats.size || 0
        };
      }
    });
  }

  /**
   * Attempt auto-reconnect for Zalo Personal if credentials exist in DB
   */
  async initPersonalSessionIfConfigured() {
    const settings = db.getSettings();
    const pConfig = settings.personalConfig || {};
    if (pConfig.cookie && pConfig.imei && pConfig.userAgent) {
      try {
        await this.loginPersonalWithCredentials({
          cookie: pConfig.cookie,
          imei: pConfig.imei,
          userAgent: pConfig.userAgent
        });
      } catch (err) {
        console.warn('[ZaloPersonal] Auto-login skipped or expired:', err.message);
      }
    }
  }

  async loginPersonalWithCredentials({ cookie, imei, userAgent }) {
    const zalo = await this.createZaloInstance();
    const parsedCookie = typeof cookie === 'string' ? JSON.parse(cookie) : cookie;
    const api = await zalo.login({
      cookie: parsedCookie,
      imei: imei.trim(),
      userAgent:
        userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    });

    this.personalApi = api;
    let accountName = 'Zalo Cá Nhân (Đã kết nối)';
    try {
      const ownId = api.getOwnId ? api.getOwnId() : '';
      if (ownId) accountName = `Zalo UID: ${ownId}`;
    } catch (_) {}

    db.updateSettings({
      personalConfig: {
        connected: true,
        accountName,
        imei: imei.trim(),
        cookie: typeof cookie === 'string' ? cookie : JSON.stringify(cookie),
        userAgent
      }
    });

    this.qrSession = {
      status: 'connected',
      qrImageBase64: null,
      scannedUser: accountName,
      error: null,
      updatedAt: new Date().toISOString()
    };

    return { connected: true, accountName };
  }

  async startQrLogin() {
    const { LoginQRCallbackEventType } = await this.getZcaModule();
    const zalo = await this.createZaloInstance();

    this.qrSession = {
      status: 'generating',
      qrImageBase64: null,
      scannedUser: null,
      error: null,
      updatedAt: new Date().toISOString()
    };

    const qrPath = path.join(__dirname, '..', '..', 'data', 'qr_login.png');

    // Run loginQR asynchronously and update qrSession state via callback
    zalo
      .loginQR(
        {
          qrPath,
          language: 'vi'
        },
        (event) => {
          if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
            const imgData = event.data && event.data.image ? event.data.image : null;
            this.qrSession = {
              status: 'waiting_scan',
              qrImageBase64: imgData
                ? imgData.startsWith('data:image')
                  ? imgData
                  : `data:image/png;base64,${imgData}`
                : null,
              scannedUser: null,
              error: null,
              updatedAt: new Date().toISOString()
            };
          } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
            this.qrSession = {
              ...this.qrSession,
              status: 'scanned',
              scannedUser: (event.data && event.data.display_name) || 'Đã quét mã QR, vui lòng xác nhận trên điện thoại...',
              updatedAt: new Date().toISOString()
            };
          } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
            this.qrSession = {
              ...this.qrSession,
              status: 'expired',
              error: 'Mã QR đã hết hạn. Vui lòng bấm Tạo mã QR mới.',
              updatedAt: new Date().toISOString()
            };
          } else if (event.type === LoginQRCallbackEventType.QRCodeDeclined) {
            this.qrSession = {
              ...this.qrSession,
              status: 'error',
              error: 'Bạn đã từ chối đăng nhập trên điện thoại.',
              updatedAt: new Date().toISOString()
            };
          } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
            const { cookie, imei, userAgent } = event.data || {};
            db.updateSettings({
              zaloMode: 'personal',
              personalConfig: {
                connected: true,
                accountName: this.qrSession.scannedUser || 'Zalo Cá Nhân',
                cookie: JSON.stringify(cookie),
                imei,
                userAgent
              }
            });
          }
        }
      )
      .then(async (api) => {
        this.personalApi = api;
        let ownId = '';
        try {
          ownId = api.getOwnId ? api.getOwnId() : '';
        } catch (_) {}
        const display = this.qrSession.scannedUser || (ownId ? `Zalo (${ownId})` : 'Zalo Cá Nhân');
        db.updateSettings({
          zaloMode: 'personal',
          personalConfig: {
            ...db.getSettings().personalConfig,
            connected: true,
            accountName: display
          }
        });
        this.qrSession = {
          status: 'connected',
          qrImageBase64: null,
          scannedUser: display,
          error: null,
          updatedAt: new Date().toISOString()
        };

        // Automatically sync Zalo friends into database upon QR login
        try {
          const fetched = await this.fetchZaloContacts('personal');
          if (fetched && Array.isArray(fetched.contacts) && fetched.contacts.length > 0) {
            db.bulkUpsertCustomers(fetched.contacts);
            console.log(`[ZaloPersonal] Tự động đồng bộ ${fetched.contacts.length} bạn bè Zalo thành công!`);
          }
        } catch (syncErr) {
          console.warn('[ZaloPersonal] Auto-sync after QR login error:', syncErr.message);
        }
      })
      .catch((err) => {
        this.qrSession = {
          ...this.qrSession,
          status: 'error',
          error: err.message || 'Không thể khởi tạo đăng nhập QR Zalo',
          updatedAt: new Date().toISOString()
        };
      });

    // Wait briefly up to 3.5s for QRCodeGenerated event so first response already has QR image
    for (let i = 0; i < 14; i++) {
      if (this.qrSession.qrImageBase64 || this.qrSession.status === 'error') break;
      await new Promise((r) => setTimeout(r, 250));
    }

    return this.qrSession;
  }

  getQrStatus() {
    return {
      ...this.qrSession,
      isConnected: Boolean(this.personalApi)
    };
  }

  disconnectPersonal() {
    this.personalApi = null;
    this.qrSession = {
      status: 'idle',
      qrImageBase64: null,
      scannedUser: null,
      error: null,
      updatedAt: new Date().toISOString()
    };
    db.updateSettings({
      personalConfig: {
        connected: false,
        accountName: '',
        cookie: '',
        imei: ''
      }
    });
    return { disconnected: true };
  }

  /**
   * Normalize Vietnamese phone to 84... format for Zalo ZNS / lookup
   */
  normalizePhone84(phone) {
    const digits = String(phone || '').replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
      return '84' + digits.slice(1);
    }
    if (digits.startsWith('84')) {
      return digits;
    }
    return '84' + digits;
  }

  /**
   * Main unified function to send a greeting message + optional card image
   */
  async sendGreeting({ customer, template, holidayName = '', occasionKey = 'manual', forceMode = null }) {
    const settings = db.getSettings();
    const mode = forceMode || settings.zaloMode || 'mock';

    // 1. Personalize text & generate greeting card image if enabled
    let cardResult = null;
    let personalized = null;

    if (settings.sendCardWithMessage) {
      cardResult = await generateGreetingCard({
        customer,
        template,
        settings,
        holidayName
      });
      personalized = cardResult.personalized;
    } else {
      personalized = personalizeTemplate({
        customer,
        template,
        settings,
        holidayName
      });
    }

    const messageText = personalized.messageText;
    const cardUrl = cardResult ? cardResult.publicUrl : null;

    try {
      let providerResponse = null;

      if (mode === 'mock') {
        // Simulated instant delivery in Sandbox mode
        await new Promise((r) => setTimeout(r, 350));
        providerResponse = {
          provider: 'mock_sandbox',
          simulated: true,
          recipientPhone: customer.phone,
          recipientName: customer.fullName,
          cardAttached: Boolean(cardResult),
          deliveredAt: new Date().toISOString()
        };
      } else if (mode === 'personal') {
        providerResponse = await this.sendViaPersonalZalo({
          customer,
          messageText,
          cardResult
        });
      } else if (mode === 'oa') {
        providerResponse = await this.sendViaZaloOA({
          customer,
          template,
          personalized,
          messageText,
          cardResult,
          settings
        });
      } else {
        throw new Error(`Chế độ gửi không hợp lệ: ${mode}`);
      }

      const logEntry = db.addLog({
        customerId: customer.id,
        customerName: `${customer.salutation || ''} ${customer.fullName}`.trim(),
        phone: customer.phone,
        occasionKey,
        occasionTitle: holidayName || template.name,
        templateId: template.id,
        mode,
        messageText,
        cardUrl,
        status: 'success',
        providerResponse
      });

      return {
        success: true,
        log: logEntry,
        messageText,
        cardUrl
      };
    } catch (err) {
      const logEntry = db.addLog({
        customerId: customer.id,
        customerName: `${customer.salutation || ''} ${customer.fullName}`.trim(),
        phone: customer.phone,
        occasionKey,
        occasionTitle: holidayName || template.name,
        templateId: template.id,
        mode,
        messageText,
        cardUrl,
        status: 'error',
        errorMessage: err.message
      });

      return {
        success: false,
        error: err.message,
        log: logEntry,
        messageText,
        cardUrl
      };
    }
  }

  /**
   * Send via Zalo Personal Account using zca-js
   */
  async sendViaPersonalZalo({ customer, messageText, cardResult }) {
    if (!this.personalApi) {
      await this.initPersonalSessionIfConfigured();
    }
    if (!this.personalApi) {
      throw new Error(
        'Chưa kết nối tài khoản Zalo Cá Nhân. Vui lòng vào mục "Cấu hình Zalo" để quét mã QR hoặc chuyển sang chế độ Chạy thử (Mock).'
      );
    }

    const { ThreadType } = await this.getZcaModule();
    let targetUid = customer.zaloUid;

    if (!targetUid) {
      if (!customer.phone) {
        throw new Error(`Khách hàng ${customer.fullName} chưa có SĐT hoặc Zalo UID.`);
      }
      const cleanPhone = String(customer.phone).replace(/[^0-9]/g, '');
      const userInfo = await this.personalApi.findUser(cleanPhone);
      if (!userInfo || !userInfo.uid) {
        throw new Error(`Không tìm thấy tài khoản Zalo từ SĐT ${customer.phone}`);
      }
      targetUid = userInfo.uid;
      // Save resolved UID back to customer record for faster future delivery
      db.updateCustomer(customer.id, { zaloUid: targetUid });
    }

    const msgPayload = {
      msg: messageText
    };
    if (cardResult && cardResult.filePath && fs.existsSync(cardResult.filePath)) {
      msgPayload.attachments = [cardResult.filePath];
    }

    const sendRes = await this.personalApi.sendMessage(msgPayload, targetUid, ThreadType.User);
    return {
      provider: 'zalo_personal',
      targetUid,
      result: sendRes
    };
  }

  /**
   * Send via Zalo Official Account (OA V3 Message API or ZNS Template API)
   */
  async sendViaZaloOA({ customer, template, personalized, messageText, cardResult, settings }) {
    const oaConfig = settings.oaConfig || {};
    if (!oaConfig.accessToken) {
      throw new Error(
        'Chưa cấu hình Zalo OA Access Token. Vui lòng nhập Access Token trong phần Cấu hình Zalo OA hoặc chọn chế độ Chạy thử (Mock).'
      );
    }

    // Option A: Use Zalo Notification Service (ZNS) by Phone Number
    if (oaConfig.useZns) {
      const templateId =
        template.category === 'birthday'
          ? oaConfig.znsBirthdayTemplateId || oaConfig.znsHolidayTemplateId
          : oaConfig.znsHolidayTemplateId || oaConfig.znsBirthdayTemplateId;

      if (!templateId) {
        throw new Error('Chưa nhập ZNS Template ID trong cấu hình Zalo OA / ZNS.');
      }

      const phone84 = this.normalizePhone84(customer.phone);
      const response = await fetch('https://business.openapi.zalo.me/message/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: oaConfig.accessToken
        },
        body: JSON.stringify({
          phone: phone84,
          template_id: String(templateId),
          template_data: {
            customer_name: customer.fullName,
            salutation: customer.salutation || 'Quý khách',
            occasion: personalized.cardTitle,
            voucher_code: personalized.vars.ma_uu_dai,
            date: personalized.vars.ngay_sinh
          },
          tracking_id: `zns_${customer.id}_${Date.now()}`
        })
      });

      const data = await response.json();
      if (data.error && data.error !== 0) {
        throw new Error(`Zalo ZNS Error (${data.error}): ${data.message || 'Gửi ZNS thất bại'}`);
      }
      return {
        provider: 'zalo_zns',
        phone: phone84,
        data
      };
    }

    // Option B: Zalo OA V3 Customer Care Message API (requires customer.zaloUid)
    if (!customer.zaloUid) {
      throw new Error(
        `Khách hàng ${customer.fullName} chưa có Zalo OA User ID (zaloUid). Để gửi theo SĐT không cần UID, hãy bật tùy chọn ZNS hoặc dùng Zalo Cá Nhân.`
      );
    }

    let attachmentId = null;
    if (cardResult && cardResult.filePath && fs.existsSync(cardResult.filePath)) {
      try {
        const fileBuffer = await fs.promises.readFile(cardResult.filePath);
        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer], { type: 'image/png' }), cardResult.fileName);

        const uploadRes = await fetch('https://openapi.zalo.me/v2.0/oa/upload/image', {
          method: 'POST',
          headers: {
            access_token: oaConfig.accessToken
          },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData && uploadData.data && uploadData.data.attachment_id) {
          attachmentId = uploadData.data.attachment_id;
        }
      } catch (uploadErr) {
        console.warn('[ZaloOA] Image upload skipped:', uploadErr.message);
      }
    }

    const messageBody = {
      recipient: {
        user_id: customer.zaloUid
      },
      message: {
        text: messageText
      }
    };

    if (attachmentId) {
      messageBody.message.attachment = {
        type: 'template',
        payload: {
          template_type: 'media',
          elements: [
            {
              media_type: 'image',
              attachment_id: attachmentId
            }
          ]
        }
      };
    }

    const response = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: oaConfig.accessToken
      },
      body: JSON.stringify(messageBody)
    });

    const data = await response.json();
    if (data.error && data.error !== 0) {
      throw new Error(`Zalo OA API Error (${data.error}): ${data.message || 'Gửi tin OA thất bại'}`);
    }

    return {
      provider: 'zalo_oa_v3',
      recipientUid: customer.zaloUid,
      data
    };
  }

  /**
   * Refresh Zalo OA Access Token using OAuth v4
   */
  async refreshOaAccessToken() {
    const settings = db.getSettings();
    const { appId, secretKey, refreshToken } = settings.oaConfig || {};
    if (!appId || !secretKey || !refreshToken) {
      throw new Error('Vui lòng nhập đầy đủ App ID, Secret Key và Refresh Token của Zalo OA.');
    }

    const params = new URLSearchParams();
    params.append('app_id', appId);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        secret_key: secretKey
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!data.access_token) {
      throw new Error(data.error_description || data.error_name || 'Làm mới Access Token thất bại');
    }

    db.updateSettings({
      oaConfig: {
        ...settings.oaConfig,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken
      }
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in
    };
  }

  /**
   * Parse Zalo dob (unix seconds) or sdob ("DD/MM/YYYY" or "DD/MM") into YYYY-MM-DD
   */
  parseZaloBirthday(dob, sdob) {
    if (sdob && typeof sdob === 'string' && sdob.trim()) {
      const clean = sdob.trim();
      const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
      }
      const dm = clean.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
      if (dm) {
        return `1995-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
      }
    }
    if (typeof dob === 'number' && dob > 86400) {
      const d = new Date(dob * 1000);
      if (!isNaN(d.getTime()) && d.getFullYear() > 1920 && d.getFullYear() <= new Date().getFullYear()) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    return '';
  }

  /**
   * Detect Vietnamese salutation from Zalo Alias/DisplayName or Gender
   */
  inferSalutationAndName(rawName, genderCode) {
    const text = String(rawName || '').trim();
    const prefixMatch = text.match(/^(Anh|Chị|Cô|Chú|Bác|Em|Bạn)\s+(.+)$/i);
    if (prefixMatch) {
      const rawSal = prefixMatch[1].toLowerCase();
      const salMap = {
        anh: 'Anh',
        'chị': 'Chị',
        cô: 'Cô',
        chú: 'Chú',
        bác: 'Bác',
        em: 'Bạn',
        bạn: 'Bạn'
      };
      return {
        salutation: salMap[rawSal] || 'Anh/Chị',
        cleanName: prefixMatch[2].trim(),
        gender: rawSal === 'chị' || rawSal === 'cô' ? 'female' : 'male'
      };
    }

    const isFemale = Number(genderCode) === 1;
    return {
      salutation: isFemale ? 'Chị' : 'Anh',
      cleanName: text,
      gender: isFemale ? 'female' : 'male'
    };
  }

  /**
   * Fetch contacts from Zalo (Personal Friends via zca-js, Zalo OA Followers, or Mock Demo Contacts)
   */
  async fetchZaloContacts(preferredSource = 'auto') {
    const settings = db.getSettings();
    const existingCustomers = db.getCustomers();

    let source = preferredSource;
    if (source === 'auto') {
      if (this.personalApi) {
        source = 'personal';
      } else if (settings.zaloMode === 'oa' && settings.oaConfig && settings.oaConfig.accessToken) {
        source = 'oa';
      } else {
        source = 'personal_or_mock';
      }
    }

    // Try auto-initializing personal session if saved in DB
    if ((source === 'personal' || source === 'personal_or_mock') && !this.personalApi) {
      await this.initPersonalSessionIfConfigured();
    }

    if (source === 'personal' || (source === 'personal_or_mock' && this.personalApi)) {
      if (!this.personalApi) {
        throw new Error(
          'Chưa kết nối tài khoản Zalo Cá Nhân. Vui lòng bấm "Quét mã QR" để đăng nhập Zalo của bạn trước khi đồng bộ danh bạ thật, hoặc chọn "Dùng Danh bạ mẫu (Chạy thử)".'
        );
      }

      // 1. Fetch all friends from Zalo Personal
      const friendsRaw = await this.personalApi.getAllFriends(20000, 1);
      const friends = Array.isArray(friendsRaw) ? friendsRaw : (friendsRaw && friendsRaw.data) || [];

      // 2. Fetch custom aliases if available
      const aliasMap = new Map();
      try {
        if (this.personalApi.getAliasList) {
          const aliasRes = await this.personalApi.getAliasList();
          const items = (aliasRes && aliasRes.items) || [];
          for (const it of items) {
            if (it.userId && it.alias) aliasMap.set(String(it.userId), it.alias);
          }
        }
      } catch (e) {
        console.warn('[ZaloSync] getAliasList skipped:', e.message);
      }

      // 3. Fetch Zalo Labels (Thẻ phân loại khách hàng) if available
      const userLabelMap = new Map();
      const availableLabels = [];
      try {
        if (this.personalApi.getLabels) {
          const labelRes = await this.personalApi.getLabels();
          const labelData = (labelRes && labelRes.labelData) || [];
          for (const lbl of labelData) {
            if (lbl.text) availableLabels.push(lbl.text);
            if (Array.isArray(lbl.conversations)) {
              for (const uid of lbl.conversations) {
                userLabelMap.set(String(uid), lbl.text);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[ZaloSync] getLabels skipped:', e.message);
      }

      const mappedContacts = friends.map((f) => {
        const uid = String(f.userId || f.uid || '');
        const alias = aliasMap.get(uid) || '';
        const rawDisplay = alias || f.displayName || f.zaloName || 'Bạn Zalo';
        const { salutation, cleanName, gender } = this.inferSalutationAndName(rawDisplay, f.gender);
        const birthday = this.parseZaloBirthday(f.dob, f.sdob);
        const phone = String(f.phoneNumber || '').replace(/[^0-9+]/g, '');
        const zaloLabel = userLabelMap.get(uid) || '';

        const alreadyExists = existingCustomers.some(
          (c) => (uid && c.zaloUid === uid) || (phone && c.phone === phone)
        );

        return {
          zaloUid: uid,
          fullName: cleanName,
          zaloName: f.zaloName || f.displayName || '',
          alias,
          salutation,
          gender,
          phone,
          birthday,
          avatar: f.avatar || '',
          group: zaloLabel || 'Thân thiết',
          zaloLabel,
          notes: alias ? `Tên gợi nhớ Zalo: ${alias}` : 'Đồng bộ từ Danh bạ Zalo Cá nhân',
          alreadyExists
        };
      });

      return {
        source: 'personal',
        sourceLabel: 'Danh bạ Zalo Cá Nhân (Trực tiếp)',
        totalCount: mappedContacts.length,
        withBirthdayCount: mappedContacts.filter((c) => Boolean(c.birthday)).length,
        availableLabels,
        contacts: mappedContacts
      };
    }

    if (source === 'oa') {
      const oaConfig = settings.oaConfig || {};
      if (!oaConfig.accessToken) {
        throw new Error('Chưa cấu hình Zalo OA Access Token.');
      }

      const listRes = await fetch(
        'https://openapi.zalo.me/v3.0/oa/user/getlist?data={"offset":0,"count":50}',
        {
          method: 'GET',
          headers: { access_token: oaConfig.accessToken }
        }
      );
      const listData = await listRes.json();
      if (listData.error && listData.error !== 0) {
        throw new Error(`Zalo OA API Error (${listData.error}): ${listData.message || 'Không lấy được danh sách'}`);
      }

      const users = (listData.data && listData.data.users) || [];
      const mappedContacts = [];

      for (const u of users.slice(0, 30)) {
        const uid = String(u.user_id || '');
        if (!uid) continue;
        let detail = {};
        try {
          const dRes = await fetch(
            `https://openapi.zalo.me/v3.0/oa/user/detail?data=${encodeURIComponent(JSON.stringify({ user_id: uid }))}`,
            { headers: { access_token: oaConfig.accessToken } }
          );
          const dJson = await dRes.json();
          detail = dJson.data || {};
        } catch (_) {}

        const displayName = detail.display_name || detail.user_alias || `Khách hàng OA (${uid.slice(-4)})`;
        const { salutation, cleanName, gender } = this.inferSalutationAndName(displayName, detail.user_gender === 2 ? 1 : 0);
        const alreadyExists = existingCustomers.some((c) => c.zaloUid === uid);

        mappedContacts.push({
          zaloUid: uid,
          fullName: cleanName,
          zaloName: detail.display_name || '',
          alias: detail.user_alias || '',
          salutation,
          gender,
          phone: (detail.shared_info && detail.shared_info.phone) || '',
          birthday: '',
          avatar: detail.avatar || '',
          group: 'Thân thiết',
          zaloLabel: 'Quan tâm OA',
          notes: 'Đồng bộ từ Zalo Official Account',
          alreadyExists
        });
      }

      return {
        source: 'oa',
        sourceLabel: 'Danh sách Người quan tâm Zalo OA',
        totalCount: mappedContacts.length,
        withBirthdayCount: mappedContacts.filter((c) => Boolean(c.birthday)).length,
        availableLabels: ['Quan tâm OA'],
        contacts: mappedContacts
      };
    }

    // Mock / Demo Zalo Contact List for instant testing
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const todayMD = `${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const in2Days = new Date(now.getTime() + 2 * 86400000);
    const in2DaysMD = `${pad2(in2Days.getMonth() + 1)}-${pad2(in2Days.getDate())}`;

    const mockFriends = [
      {
        zaloUid: 'zuid_880192831',
        fullName: 'Đặng Hoàng Minh',
        zaloName: 'Hoàng Minh BĐS',
        alias: 'Anh Hoàng Minh BĐS',
        salutation: 'Anh',
        gender: 'male',
        phone: '0903112288',
        birthday: `1989-${todayMD}`,
        avatar: 'https://ui-avatars.com/api/?name=Hoang+Minh&background=0068ff&color=fff',
        group: 'VIP',
        zaloLabel: 'VIP',
        notes: 'Đồng bộ từ Danh bạ Zalo (Sinh nhật hôm nay)'
      },
      {
        zaloUid: 'zuid_880192832',
        fullName: 'Nguyễn Phương Thảo',
        zaloName: 'Phương Thảo Spa',
        alias: 'Chị Phương Thảo Spa',
        salutation: 'Chị',
        gender: 'female',
        phone: '0918223344',
        birthday: `1994-${todayMD}`,
        avatar: 'https://ui-avatars.com/api/?name=Phuong+Thao&background=e11d48&color=fff',
        group: 'VIP',
        zaloLabel: 'VIP',
        notes: 'Đồng bộ từ Danh bạ Zalo (Sinh nhật hôm nay)'
      },
      {
        zaloUid: 'zuid_880192833',
        fullName: 'Bùi Đức Duy',
        zaloName: 'Đức Duy Interior',
        alias: 'Anh Đức Duy Nội Thất',
        salutation: 'Anh',
        gender: 'male',
        phone: '0989556677',
        birthday: `1991-${in2DaysMD}`,
        avatar: 'https://ui-avatars.com/api/?name=Duc+Duy&background=059669&color=fff',
        group: 'Doanh nghiệp',
        zaloLabel: 'Doanh nghiệp',
        notes: 'Đồng bộ từ Danh bạ Zalo'
      },
      {
        zaloUid: 'zuid_880192834',
        fullName: 'Lý Mỹ Kỳ',
        zaloName: 'Mỹ Kỳ',
        alias: 'Chị Mỹ Kỳ Quận 7',
        salutation: 'Chị',
        gender: 'female',
        phone: '0972668899',
        birthday: '1996-11-18',
        avatar: 'https://ui-avatars.com/api/?name=My+Ky&background=7c3aed&color=fff',
        group: 'Thân thiết',
        zaloLabel: 'Thân thiết',
        notes: 'Đồng bộ từ Danh bạ Zalo'
      },
      {
        zaloUid: 'zuid_880192835',
        fullName: 'Trịnh Văn Quyết',
        zaloName: 'Chú Quyết',
        alias: 'Chú Quyết Vật Liệu',
        salutation: 'Chú',
        gender: 'male',
        phone: '0913889900',
        birthday: '1972-04-12',
        avatar: 'https://ui-avatars.com/api/?name=Van+Quyet&background=d97706&color=fff',
        group: 'VIP',
        zaloLabel: 'VIP',
        notes: 'Đồng bộ từ Danh bạ Zalo'
      },
      {
        zaloUid: 'zuid_880192836',
        fullName: 'Hoàng Thanh Mai',
        zaloName: 'Thanh Mai',
        alias: 'Cô Thanh Mai',
        salutation: 'Cô',
        gender: 'female',
        phone: '0908776655',
        birthday: '1978-08-25',
        avatar: 'https://ui-avatars.com/api/?name=Thanh+Mai&background=db2777&color=fff',
        group: 'Thân thiết',
        zaloLabel: 'Thân thiết',
        notes: 'Đồng bộ từ Danh bạ Zalo'
      }
    ].map((item) => ({
      ...item,
      alreadyExists: existingCustomers.some(
        (c) => c.zaloUid === item.zaloUid || (item.phone && c.phone === item.phone)
      )
    }));

    return {
      source: 'mock',
      sourceLabel: 'Danh bạ Zalo Mô phỏng (Chưa quét QR - Chế độ chạy thử)',
      totalCount: mockFriends.length,
      withBirthdayCount: mockFriends.filter((c) => Boolean(c.birthday)).length,
      availableLabels: ['VIP', 'Thân thiết', 'Doanh nghiệp'],
      contacts: mockFriends
    };
  }
}

module.exports = {
  zaloService: new ZaloService()
};
