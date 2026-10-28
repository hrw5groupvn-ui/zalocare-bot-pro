// Global State
let state = {
  dashboard: null,
  customers: [],
  templates: [],
  holidays: [],
  settings: {},
  logs: [],
  currentTab: 'dashboard',
  qrPollTimer: null
};

// Toast Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  const bg =
    type === 'error'
      ? 'bg-rose-600 text-white'
      : type === 'info'
      ? 'bg-slate-800 text-white'
      : 'bg-emerald-600 text-white';

  el.className = `${bg} px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 transition-all duration-300`;
  el.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" class="opacity-75 hover:opacity-100">&times;</button>`;
  container.appendChild(el);
  setTimeout(() => {
    if (el.parentElement) el.remove();
  }, 4500);
}

// Format Date YYYY-MM-DD -> DD/MM/YYYY
function formatDateVN(str) {
  if (!str) return '—';
  const p = String(str).split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  if (p.length === 2) return `${p[1]}/${p[0]}`;
  return str;
}

// Switch Tabs
function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.className =
      'tab-btn flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 bg-white/10 text-white hover:bg-white/20 border border-white/10';
  });
  const activeBtn = document.getElementById(`tabBtn-${tabName}`);
  if (activeBtn) {
    activeBtn.className =
      'tab-btn flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 bg-white text-zalo-600 shadow-xs';
  }

  if (tabName === 'dashboard') loadDashboard();
  if (tabName === 'customers') loadCustomers();
  if (tabName === 'templates') initTemplateStudio();
  if (tabName === 'holidays') loadHolidays();
  if (tabName === 'autoreply') loadAutoReplyTab();
  if (tabName === 'settings') loadSettingsTab();
  if (tabName === 'logs') loadLogs();
}

// Update Header Badges
function updateHeaderBadges(settings) {
  if (!settings) return;
  const badge = document.getElementById('headerModeBadge');
  const cronTime = document.getElementById('headerCronTime');

  if (settings.zaloMode === 'mock') {
    badge.className = 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900';
    badge.textContent = '🧪 Chế độ: Chạy thử (Mock)';
  } else if (settings.zaloMode === 'personal') {
    badge.className = 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-900';
    badge.textContent = '📱 Chế độ: Zalo Cá Nhân';
  } else if (settings.zaloMode === 'oa') {
    badge.className = 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-300 text-slate-900';
    badge.textContent = '🏢 Chế độ: Zalo OA / ZNS';
  }

  if (cronTime) {
    cronTime.textContent = settings.cronEnabled ? settings.cronTimeDisplay || '08:00' : 'Đang TẮT';
  }
}

// ================= 1. DASHBOARD =================
async function loadDashboard() {
  try {
    const [dashRes, tplRes, custRes] = await Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/templates').then((r) => r.json()),
      fetch('/api/customers').then((r) => r.json())
    ]);

    state.dashboard = dashRes;
    state.settings = dashRes.settings;
    state.templates = tplRes.templates || [];
    state.customers = custRes || [];

    updateHeaderBadges(state.settings);

    document.getElementById('statTotalCustomers').textContent = dashRes.stats.totalCustomers;
    document.getElementById('statTodayCount').textContent = dashRes.stats.todayCount;
    document.getElementById('statTodayPending').textContent = `Chờ gửi: ${dashRes.stats.todayPendingCount} khách`;
    document.getElementById('statUpcomingCount').textContent = dashRes.stats.upcomingCount;
    document.getElementById('statSentCount').textContent = dashRes.stats.totalSentCount;

    renderTodayEvents(dashRes.todayEvents || []);
    renderUpcomingEvents(dashRes.upcomingEvents || []);

    // Load live preview for first today event or first customer
    if (dashRes.todayEvents && dashRes.todayEvents.length > 0) {
      const firstEvt = dashRes.todayEvents[0];
      previewEventOnDashboard(firstEvt.customer.id, firstEvt.templateId, firstEvt.occasionTitle);
    } else if (state.customers.length > 0 && state.templates.length > 0) {
      previewEventOnDashboard(state.customers[0].id, state.templates[0].id, 'Chúc mừng Sinh nhật');
    }
  } catch (err) {
    console.error(err);
  }
}

function renderTodayEvents(events) {
  const container = document.getElementById('todayEventsList');
  if (!events.length) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-500 text-sm">
        Hôm nay không có lịch sinh nhật hay kỷ niệm nào trùng ngày. Bạn có thể bấm vào mục <strong>Khách hàng</strong> hoặc <strong>Chiến dịch Lễ/Tết</strong> để gửi lời chúc bất kỳ lúc nào!
      </div>`;
    return;
  }

  container.innerHTML = events
    .map((evt) => {
      const c = evt.customer;
      const badgeColor =
        evt.type === 'birthday'
          ? 'bg-rose-100 text-rose-700 border-rose-200'
          : evt.type === 'anniversary'
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : 'bg-amber-100 text-amber-800 border-amber-200';
      const icon = evt.type === 'birthday' ? '🎂' : evt.type === 'anniversary' ? '💎' : '🧧';

      const statusBadge = evt.alreadySent
        ? `<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">✓ Đã gửi hôm nay</span>`
        : `<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">⏳ Chờ gửi</span>`;

      return `
      <div class="p-4 hover:bg-slate-50/80 transition flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">${icon}</div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-slate-800 text-sm">${c.salutation || ''} ${c.fullName}</span>
              <span class="text-xs px-2 py-0.5 rounded border font-semibold ${badgeColor}">${evt.typeLabel}</span>
              ${statusBadge}
            </div>
            <p class="text-xs text-slate-500 mt-1">
              📞 SĐT: <strong>${c.phone || 'Chưa có'}</strong> • Nhóm: ${c.group || 'Thân thiết'} • Mẫu: <em>${evt.templateName}</em>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="previewEventOnDashboard('${c.id}', '${evt.templateId}', '${evt.occasionTitle}')" class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition">
            👁️ Xem Thiệp
          </button>
          <button onclick="openQuickSendModal('${c.id}', '${evt.templateId}', '${evt.occasionTitle}', '${evt.occasionKey}')" class="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-zalo-500 hover:bg-zalo-600 text-white shadow-xs transition">
            🚀 Gửi Ngay
          </button>
        </div>
      </div>`;
    })
    .join('');
}

function renderUpcomingEvents(events) {
  const container = document.getElementById('upcomingEventsList');
  if (!events.length) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">Không có sự kiện nào trong 14 ngày tới.</div>`;
    return;
  }

  container.innerHTML = events
    .map((evt) => {
      const c = evt.customer;
      const icon = evt.type === 'birthday' ? '🎂' : '💎';
      return `
      <div class="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
        <div class="flex items-center gap-3">
          <span class="text-base">${icon}</span>
          <div>
            <p class="text-sm font-semibold text-slate-800">${c.salutation || ''} ${c.fullName} <span class="text-xs font-normal text-slate-500">(${evt.typeLabel} - ${evt.dateDisplay})</span></p>
            <p class="text-xs text-slate-500">SĐT: ${c.phone}</p>
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-zalo-600">Còn ${evt.daysRemaining} ngày</span>
          <button onclick="openQuickSendModal('${c.id}', '${evt.templateId}', '${evt.occasionTitle}', 'advance_${Date.now()}')" class="text-xs font-semibold text-zalo-600 hover:underline">
            Gửi sớm
          </button>
        </div>
      </div>`;
    })
    .join('');
}

async function previewEventOnDashboard(customerId, templateId, holidayName) {
  try {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, templateId, holidayName })
    }).then((r) => r.json());

    document.getElementById('simHeaderName').textContent = `${res.customer.salutation || ''} ${res.customer.fullName} (${res.customer.phone})`;
    document.getElementById('dashboardCardPreview').innerHTML = res.svgString;
    document.getElementById('dashboardTextPreview').textContent = res.messageText;
  } catch (err) {
    console.error(err);
  }
}

async function sendAllTodayEvents() {
  const btn = document.getElementById('btnSendAllToday');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>⏳ Đang tạo thiệp & gửi...</span>';

  try {
    const res = await fetch('/api/send-today', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipAlreadySent: false })
    }).then((r) => r.json());

    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Đã xử lý ${res.totalProcessed} lời chúc hôm nay! (Thành công: ${res.successCount})`, 'success');
      await loadDashboard();
    }
  } catch (err) {
    showToast('Lỗi khi gửi hàng loạt: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

// ================= 2. CUSTOMERS & EXCEL =================
let customerRenderLimit = 100;

async function loadCustomers() {
  const custs = await fetch('/api/customers').then((r) => r.json());
  state.customers = custs;
  customerRenderLimit = 100;
  renderCustomersTable();
}

function showMoreCustomers() {
  customerRenderLimit += 200;
  renderCustomersTable();
}

function getCustomerGender(c) {
  if (c.gender === 'female' || c.gender === 'male') return c.gender;
  const sal = String(c.salutation || '').toLowerCase();
  if (sal === 'chị' || sal === 'cô' || sal === 'bà') return 'female';
  return 'male';
}

async function quickChangeCustomerGender(id, newGender) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return;
  let newSalutation = c.salutation;
  if (newGender === 'female' && (c.salutation === 'Anh' || c.salutation === 'Chú')) {
    newSalutation = c.salutation === 'Chú' ? 'Cô' : 'Chị';
  } else if (newGender === 'male' && (c.salutation === 'Chị' || c.salutation === 'Cô')) {
    newSalutation = c.salutation === 'Cô' ? 'Chú' : 'Anh';
  }

  c.gender = newGender;
  c.salutation = newSalutation;
  renderCustomersTable();

  await fetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gender: newGender, salutation: newSalutation })
  });
  showToast(`Đã cập nhật giới tính ${c.fullName} thành ${newGender === 'female' ? 'Nữ' : 'Nam'} (${newSalutation})`);
}

function renderCustomersTable() {
  const tbody = document.getElementById('customersTableBody');
  const q = (document.getElementById('customerSearchInput')?.value || '').trim().toLowerCase();
  const genderFilter = document.getElementById('customerGenderFilter')?.value || '';
  const groupFilter = document.getElementById('customerGroupFilter')?.value || '';
  const monthFilter = document.getElementById('customerMonthFilter')?.value || '';

  const filtered = state.customers.filter((c) => {
    const g = getCustomerGender(c);
    if (genderFilter && g !== genderFilter) return false;
    if (groupFilter && c.group !== groupFilter) return false;
    if (monthFilter) {
      const bParts = String(c.birthday || '').split('-');
      const m = bParts.length === 3 ? bParts[1] : bParts[0];
      if (m !== monthFilter) return false;
    }
    if (q) {
      const hay = `${c.fullName} ${c.phone} ${c.notes} ${c.salutation}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">Không tìm thấy khách hàng phù hợp.</td></tr>`;
    return;
  }

  const visibleList = filtered.slice(0, customerRenderLimit);

  const rowsHtml = visibleList
    .map((c) => {
      const gender = getCustomerGender(c);
      const isFemale = gender === 'female';
      const genderBadgeClass = isFemale
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-blue-50 text-zalo-600 border-blue-200';

      const groupColor =
        c.group === 'VIP'
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : c.group === 'Doanh nghiệp'
          ? 'bg-purple-100 text-purple-800 border-purple-200'
          : 'bg-slate-100 text-slate-700 border-slate-200';

      const avatarHtml = c.avatar
        ? `<img src="${c.avatar}" alt="${c.fullName}" loading="lazy" class="w-8 h-8 rounded-full object-cover border border-slate-200" />`
        : `<div class="w-8 h-8 rounded-full bg-blue-100 text-zalo-600 font-bold text-xs flex items-center justify-center">${(c.fullName || 'K').charAt(0)}</div>`;

      return `
      <tr class="hover:bg-slate-50/90 transition">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-2.5">
            ${avatarHtml}
            <div>
              <div class="font-bold text-slate-800">${c.salutation || ''} ${c.fullName}</div>
              <div class="text-xs text-slate-500">${c.notes || ''}</div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">
          <select onchange="quickChangeCustomerGender('${c.id}', this.value)" class="text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${genderBadgeClass}">
            <option value="male" ${!isFemale ? 'selected' : ''}>👨 Nam</option>
            <option value="female" ${isFemale ? 'selected' : ''}>👩 Nữ</option>
          </select>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-slate-700">${c.phone || '—'}</div>
          <div class="text-[11px] text-slate-400">${c.zaloUid ? `UID: ${c.zaloUid}` : 'Tự động tìm qua SĐT'}</div>
        </td>
        <td class="py-3.5 px-4 font-medium text-slate-700">${formatDateVN(c.birthday)}</td>
        <td class="py-3.5 px-4">
          <div class="font-medium text-slate-700">${formatDateVN(c.anniversaryDate)}</div>
          <div class="text-[11px] text-slate-500">${c.anniversaryType || ''}</div>
        </td>
        <td class="py-3.5 px-4">
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border ${groupColor}">${c.group || 'Thân thiết'}</span>
        </td>
        <td class="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
          <button onclick="openQuickSendModal('${c.id}', '', 'Chúc mừng Sinh nhật', 'manual')" class="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-zalo-600 transition">
            💌 Gửi chúc mừng
          </button>
          <button onclick="editCustomer('${c.id}')" class="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">
            Sửa
          </button>
          <button onclick="deleteCustomer('${c.id}')" class="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600">
            Xóa
          </button>
        </td>
      </tr>`;
    })
    .join('');

  const moreRow =
    filtered.length > customerRenderLimit
      ? `<tr>
          <td colspan="7" class="py-4 text-center bg-slate-50">
            <button onclick="showMoreCustomers()" class="text-xs sm:text-sm font-bold px-5 py-2 rounded-lg bg-zalo-500 hover:bg-zalo-600 text-white shadow">
              👇 Xem thêm khách hàng (Đang hiển thị ${visibleList.length} / ${filtered.length} người)
            </button>
          </td>
        </tr>`
      : '';

  tbody.innerHTML = rowsHtml + moreRow;
}

function onCustSalutationChange(sal) {
  const genderEl = document.getElementById('custGender');
  if (!genderEl) return;
  if (sal === 'Chị' || sal === 'Cô') genderEl.value = 'female';
  else if (sal === 'Anh' || sal === 'Chú') genderEl.value = 'male';
}

function onCustGenderChange(gender) {
  const salEl = document.getElementById('custSalutation');
  if (!salEl) return;
  if (gender === 'female' && (salEl.value === 'Anh' || salEl.value === 'Chú')) {
    salEl.value = salEl.value === 'Chú' ? 'Cô' : 'Chị';
  } else if (gender === 'male' && (salEl.value === 'Chị' || salEl.value === 'Cô')) {
    salEl.value = salEl.value === 'Cô' ? 'Chú' : 'Anh';
  }
}

function openCustomerModal(cust = null) {
  document.getElementById('customerModalTitle').textContent = cust ? 'Cập nhật Khách hàng' : 'Thêm Khách hàng mới';
  document.getElementById('custId').value = cust ? cust.id : '';
  document.getElementById('custSalutation').value = cust ? cust.salutation : 'Anh';
  document.getElementById('custGender').value = cust ? getCustomerGender(cust) : 'male';
  document.getElementById('custFullName').value = cust ? cust.fullName : '';
  document.getElementById('custPhone').value = cust ? cust.phone : '';
  document.getElementById('custGroup').value = cust ? cust.group : 'VIP';
  document.getElementById('custBirthday').value = cust ? cust.birthday : '';
  document.getElementById('custAnniversaryDate').value = cust ? cust.anniversaryDate : '';
  document.getElementById('custAnniversaryType').value = cust ? cust.anniversaryType : 'Kỷ niệm đồng hành';
  document.getElementById('custZaloUid').value = cust ? cust.zaloUid : '';
  document.getElementById('custNotes').value = cust ? cust.notes : '';

  const modal = document.getElementById('customerModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCustomerModal() {
  const modal = document.getElementById('customerModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function editCustomer(id) {
  const c = state.customers.find((x) => x.id === id);
  if (c) openCustomerModal(c);
}

async function saveCustomerForm() {
  const id = document.getElementById('custId').value;
  const payload = {
    salutation: document.getElementById('custSalutation').value,
    gender: document.getElementById('custGender').value,
    fullName: document.getElementById('custFullName').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    group: document.getElementById('custGroup').value,
    birthday: document.getElementById('custBirthday').value,
    anniversaryDate: document.getElementById('custAnniversaryDate').value,
    anniversaryType: document.getElementById('custAnniversaryType').value.trim(),
    zaloUid: document.getElementById('custZaloUid').value.trim(),
    notes: document.getElementById('custNotes').value.trim()
  };

  if (!payload.fullName) {
    showToast('Vui lòng nhập Họ và tên khách hàng', 'error');
    return;
  }

  const url = id ? `/api/customers/${id}` : '/api/customers';
  const method = id ? 'PUT' : 'POST';

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  showToast(id ? 'Đã cập nhật thông tin khách hàng!' : 'Đã thêm khách hàng mới!');
  closeCustomerModal();
  await loadCustomers();
}

async function deleteCustomer(id) {
  if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
  await fetch(`/api/customers/${id}`, { method: 'DELETE' });
  showToast('Đã xóa khách hàng.');
  await loadCustomers();
}

async function handleImportExcel(event) {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/customers/import', {
      method: 'POST',
      body: formData
    }).then((r) => r.json());

    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Nhập Excel thành công! Thêm mới: ${res.added}, Cập nhật: ${res.updated}`, 'success');
      await loadCustomers();
    }
  } catch (err) {
    showToast('Lỗi nhập file Excel: ' + err.message, 'error');
  } finally {
    event.target.value = '';
  }
}

// ================= 3. TEMPLATES & GREETING CARD STUDIO =================
async function initTemplateStudio() {
  const [tplData, custs] = await Promise.all([
    fetch('/api/templates').then((r) => r.json()),
    fetch('/api/customers').then((r) => r.json())
  ]);
  state.templates = tplData.templates || [];
  state.customers = custs || [];

  const tplSelect = document.getElementById('tplSelect');
  tplSelect.innerHTML = state.templates
    .map((t) => `<option value="${t.id}">${t.name}</option>`)
    .join('');

  const custSelect = document.getElementById('tplPreviewCustomerSelect');
  custSelect.innerHTML = state.customers
    .slice(0, 150)
    .map((c) => `<option value="${c.id}">${c.salutation} ${c.fullName} (${c.phone || c.zaloUid || ''})</option>`)
    .join('');

  onSelectTemplateChange();
}

async function toggleShowLogoOnCard(checked) {
  state.settings.showLogoOnCard = Boolean(checked);
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ showLogoOnCard: Boolean(checked) })
  });
  updateStudioPreview();
}

function onSelectTemplateChange() {
  const id = document.getElementById('tplSelect').value;
  const tpl = state.templates.find((t) => t.id === id) || state.templates[0];
  if (!tpl) return;

  const logoToggle = document.getElementById('tplShowLogoToggle');
  if (logoToggle && state.settings) {
    logoToggle.checked = state.settings.showLogoOnCard !== false;
  }

  document.getElementById('tplName').value = tpl.name || '';
  document.getElementById('tplCategory').value = tpl.category || 'birthday';
  document.getElementById('tplCardTheme').value = tpl.cardTheme || 'banviet_obsidian_gold';
  document.getElementById('tplVoucherCode').value = tpl.voucherCode || '';
  document.getElementById('tplCardTitle').value = tpl.cardTitle || '';
  document.getElementById('tplCardSubtitle').value = tpl.cardSubtitle || '';
  document.getElementById('tplContent').value = tpl.content || '';
  document.getElementById('tplIsDefault').checked = Boolean(tpl.isDefault);

  updateStudioPreview();
}

function createNewTemplate() {
  const newTpl = {
    id: '',
    name: 'Mẫu lời chúc mới ' + (state.templates.length + 1),
    category: 'birthday',
    cardTheme: 'royal_gold',
    cardTitle: 'CHÚC MỪNG ĐẶC BIỆT',
    cardSubtitle: 'Kính chúc {xung_ho} {ten} luôn tràn đầy niềm vui và thành công!',
    voucherCode: 'VIPGIFT',
    content:
      'Chúc mừng {xung_ho} {ho_ten}!\n\n{xung_em} từ {ten_thuong_hieu} xin gửi lời chúc tốt đẹp nhất đến {xung_ho_thuong} {ten}. Chúc {xung_ho_thuong} luôn nhiều sức khỏe, hạnh phúc và may mắn!\n\n🎁 Mã quà tặng ưu đãi của {xung_ho_thuong}: [{ma_uu_dai}]',
    isDefault: false
  };

  document.getElementById('tplSelect').innerHTML += `<option value="" selected>✨ ${newTpl.name} (Chưa lưu)</option>`;
  document.getElementById('tplSelect').value = '';
  document.getElementById('tplName').value = newTpl.name;
  document.getElementById('tplCategory').value = newTpl.category;
  document.getElementById('tplCardTheme').value = newTpl.cardTheme;
  document.getElementById('tplVoucherCode').value = newTpl.voucherCode;
  document.getElementById('tplCardTitle').value = newTpl.cardTitle;
  document.getElementById('tplCardSubtitle').value = newTpl.cardSubtitle;
  document.getElementById('tplContent').value = newTpl.content;
  document.getElementById('tplIsDefault').checked = false;

  updateStudioPreview();
}

function getStudioDraftTemplate() {
  return {
    id: document.getElementById('tplSelect').value || undefined,
    name: document.getElementById('tplName').value,
    category: document.getElementById('tplCategory').value,
    cardTheme: document.getElementById('tplCardTheme').value,
    voucherCode: document.getElementById('tplVoucherCode').value,
    cardTitle: document.getElementById('tplCardTitle').value,
    cardSubtitle: document.getElementById('tplCardSubtitle').value,
    content: document.getElementById('tplContent').value,
    isDefault: document.getElementById('tplIsDefault').checked
  };
}

async function updateStudioPreview() {
  const customerId = document.getElementById('tplPreviewCustomerSelect').value;
  const customTemplate = getStudioDraftTemplate();

  const res = await fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      customTemplate,
      holidayName: customTemplate.cardTitle
    })
  }).then((r) => r.json());

  document.getElementById('studioCardPreview').innerHTML = res.svgString;
  document.getElementById('studioTextPreview').textContent = res.messageText;
  document.getElementById('studioRecipientBadge').textContent = `${res.customer.salutation} ${res.customer.fullName}`;
}

function insertVar(token) {
  const textarea = document.getElementById('tplContent');
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value;
  textarea.value = val.slice(0, start) + token + val.slice(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + token.length;
  updateStudioPreview();
}

async function saveCurrentTemplate() {
  const draft = getStudioDraftTemplate();
  const saved = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft)
  }).then((r) => r.json());

  showToast('Đã lưu mẫu lời chúc & thiết kế thiệp!');
  await initTemplateStudio();
  document.getElementById('tplSelect').value = saved.id;
  onSelectTemplateChange();
}

async function sendTestFromStudio() {
  await saveCurrentTemplate();
  const customerId = document.getElementById('tplPreviewCustomerSelect').value;
  const templateId = document.getElementById('tplSelect').value;
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      templateId,
      holidayName: document.getElementById('tplCardTitle').value
    })
  }).then((r) => r.json());

  if (res.success) {
    showToast('Đã tạo thiệp PNG & gửi tin nhắn thành công!');
  } else {
    showToast('Lỗi gửi: ' + res.error, 'error');
  }
}

// ================= 4. HOLIDAYS & CAMPAIGNS =================
async function loadHolidays() {
  const [hols, tplRes] = await Promise.all([
    fetch('/api/holidays').then((r) => r.json()),
    fetch('/api/templates').then((r) => r.json())
  ]);
  state.holidays = hols || [];
  state.templates = tplRes.templates || [];

  const grid = document.getElementById('holidaysGrid');
  const audMap = {
    all: '👥 Tất cả khách hàng',
    female: '👩 Chỉ Khách Nữ (Chị/Cô)',
    male: '👨 Chỉ Khách Nam (Anh/Chú)',
    vip: '👑 Chỉ Khách VIP'
  };

  grid.innerHTML = state.holidays
    .map((h) => {
      const tpl = state.templates.find((t) => t.id === h.templateId);
      const [mm, dd] = String(h.dateMonthDay || '').split('-');
      return `
      <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between gap-4">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              📅 Ngày ${dd}/${mm}
            </span>
            <span class="text-xs font-semibold text-slate-500">${audMap[h.targetAudience] || 'Tất cả'}</span>
          </div>
          <h3 class="text-base font-bold text-slate-800">${h.name}</h3>
          <p class="text-xs text-slate-500">${h.description || ''}</p>
          <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
            🎨 Mẫu thiệp: <strong>${tpl ? tpl.name : 'Mẫu Lễ/Tết mặc định'}</strong>
          </p>
        </div>

        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button onclick="deleteHoliday('${h.id}')" class="text-xs text-rose-500 hover:underline">Xóa</button>
          <button onclick="runHolidayCampaignNow('${h.id}', '${h.name}')" class="bg-zalo-500 hover:bg-zalo-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow transition">
            🚀 Chạy Chiến Dịch Gửi Ngay
          </button>
        </div>
      </div>`;
    })
    .join('');
}

function openHolidayModal() {
  const tplSelect = document.getElementById('holTemplateId');
  tplSelect.innerHTML = state.templates
    .map((t) => `<option value="${t.id}">${t.name}</option>`)
    .join('');

  document.getElementById('holId').value = '';
  document.getElementById('holName').value = '';
  document.getElementById('holMonthDay').value = '';
  document.getElementById('holAudience').value = 'all';
  document.getElementById('holDesc').value = '';

  const modal = document.getElementById('holidayModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeHolidayModal() {
  const modal = document.getElementById('holidayModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function saveHolidayForm() {
  const payload = {
    name: document.getElementById('holName').value.trim(),
    dateMonthDay: document.getElementById('holMonthDay').value.trim(),
    targetAudience: document.getElementById('holAudience').value,
    templateId: document.getElementById('holTemplateId').value,
    description: document.getElementById('holDesc').value.trim(),
    autoSend: true
  };
  if (!payload.name || !payload.dateMonthDay) {
    showToast('Vui lòng nhập Tên ngày lễ và Ngày-Tháng (MM-DD)', 'error');
    return;
  }
  await fetch('/api/holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  showToast('Đã lưu ngày lễ mới!');
  closeHolidayModal();
  await loadHolidays();
}

async function deleteHoliday(id) {
  if (!confirm('Xóa ngày lễ này khỏi lịch tự động?')) return;
  await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
  await loadHolidays();
}

async function runHolidayCampaignNow(id, name) {
  if (!confirm(`Phát động chiến dịch gửi lời chúc & thiệp "${name}" cho toàn bộ khách hàng thuộc nhóm đối tượng?`)) return;
  showToast(`Đang chạy chiến dịch "${name}"...`, 'info');
  try {
    const res = await fetch(`/api/holidays/${id}/send-campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).then((r) => r.json());

    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Chiến dịch "${name}" hoàn tất! Đã gửi thành công: ${res.successCount}/${res.totalProcessed} khách hàng.`, 'success');
    }
  } catch (err) {
    showToast('Lỗi chạy chiến dịch: ' + err.message, 'error');
  }
}

// ================= 5. QUICK SEND MODAL =================
async function openQuickSendModal(customerId, templateId, holidayName, occasionKey) {
  if (!state.templates.length) {
    const tplRes = await fetch('/api/templates').then((r) => r.json());
    state.templates = tplRes.templates || [];
  }

  document.getElementById('sendCustomerId').value = customerId;
  document.getElementById('sendOccasionKey').value = occasionKey || 'manual';
  document.getElementById('sendHolidayName').value = holidayName || 'Sinh nhật';

  const select = document.getElementById('sendTemplateSelect');
  select.innerHTML = state.templates
    .map((t) => `<option value="${t.id}">${t.name}</option>`)
    .join('');

  if (templateId) {
    select.value = templateId;
  }

  const modal = document.getElementById('sendModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  await refreshQuickSendPreview();
}

function closeSendModal() {
  const modal = document.getElementById('sendModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function refreshQuickSendPreview() {
  const customerId = document.getElementById('sendCustomerId').value;
  const templateId = document.getElementById('sendTemplateSelect').value;
  const holidayName = document.getElementById('sendHolidayName').value;

  const res = await fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, templateId, holidayName })
  }).then((r) => r.json());

  document.getElementById('sendModalTitle').textContent = `Gửi chúc mừng: ${res.customer.salutation} ${res.customer.fullName} (${res.customer.phone})`;
  document.getElementById('sendModalCardPreview').innerHTML = res.svgString;
  document.getElementById('sendModalTextPreview').textContent = res.messageText;
}

async function confirmQuickSend() {
  const btn = document.getElementById('btnConfirmQuickSend');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳ Đang tạo thiệp & gửi...</span>';

  try {
    const customerId = document.getElementById('sendCustomerId').value;
    const templateId = document.getElementById('sendTemplateSelect').value;
    const holidayName = document.getElementById('sendHolidayName').value;
    const occasionKey = document.getElementById('sendOccasionKey').value;

    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, templateId, holidayName, occasionKey })
    }).then((r) => r.json());

    if (res.success) {
      showToast('🎉 Đã gửi tin nhắn & thiệp chúc mừng thành công!', 'success');
      closeSendModal();
      if (state.currentTab === 'dashboard') await loadDashboard();
    } else {
      showToast(res.error || 'Gửi thất bại', 'error');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>🚀 Gửi Tin Nhắn & Thiệp Ngay</span>';
  }
}

// ================= 6. SETTINGS & ZALO CONNECTION =================
async function loadSettingsTab() {
  const data = await fetch('/api/settings').then((r) => r.json());
  const s = data.settings || {};
  state.settings = s;

  highlightModeCard(s.zaloMode || 'mock');
  updateHeaderBadges(s);

  document.getElementById('setBrandName').value = s.brandName || '';
  document.getElementById('setSenderPronoun').value = s.senderPronoun || 'em';
  document.getElementById('setHotline').value = s.hotline || '';
  document.getElementById('setDelayMs').value = s.delayBetweenMessagesMs || 3500;
  document.getElementById('setCronEnabled').checked = s.cronEnabled !== false;
  document.getElementById('setCronTime').value = s.cronTimeDisplay || '08:00';
  document.getElementById('setSendCard').checked = s.sendCardWithMessage !== false;

  const p = s.personalConfig || {};
  document.getElementById('setPersonalImei').value = p.imei || '';
  document.getElementById('setPersonalCookie').value = p.cookie || '';
  updatePersonalStatusUI(data.qrStatus, p);

  const oa = s.oaConfig || {};
  document.getElementById('setOaAccessToken').value = oa.accessToken || '';
  document.getElementById('setOaAppId').value = oa.appId || '';
  document.getElementById('setOaSecretKey').value = oa.secretKey || '';
  document.getElementById('setOaRefreshToken').value = oa.refreshToken || '';
  document.getElementById('setOaUseZns').checked = Boolean(oa.useZns);
  document.getElementById('setZnsBirthdayTpl').value = oa.znsBirthdayTemplateId || '';
  document.getElementById('setZnsHolidayTpl').value = oa.znsHolidayTemplateId || '';
}

function highlightModeCard(mode) {
  ['mock', 'personal', 'oa'].forEach((m) => {
    const el = document.getElementById(`modeCard-${m}`);
    if (!el) return;
    if (m === mode) {
      el.className = 'cursor-pointer rounded-xl p-4 border-2 border-zalo-500 bg-blue-50/40 shadow-xs transition';
    } else {
      el.className = 'cursor-pointer rounded-xl p-4 border-2 border-slate-200 hover:border-slate-300 bg-white transition';
    }
  });
}

async function selectZaloMode(mode) {
  state.settings.zaloMode = mode;
  highlightModeCard(mode);
  const updated = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zaloMode: mode })
  }).then((r) => r.json());

  state.settings = updated;
  updateHeaderBadges(updated);
  showToast(`Đã chuyển phương thức gửi sang: ${mode.toUpperCase()}`);
}

async function saveAllSettings() {
  const payload = {
    zaloMode: state.settings.zaloMode || 'mock',
    brandName: document.getElementById('setBrandName').value.trim(),
    senderPronoun: document.getElementById('setSenderPronoun').value.trim(),
    hotline: document.getElementById('setHotline').value.trim(),
    delayBetweenMessagesMs: Number(document.getElementById('setDelayMs').value) || 3500,
    cronEnabled: document.getElementById('setCronEnabled').checked,
    cronTimeDisplay: document.getElementById('setCronTime').value || '08:00',
    sendCardWithMessage: document.getElementById('setSendCard').checked,
    oaConfig: {
      accessToken: document.getElementById('setOaAccessToken').value.trim(),
      appId: document.getElementById('setOaAppId').value.trim(),
      secretKey: document.getElementById('setOaSecretKey').value.trim(),
      refreshToken: document.getElementById('setOaRefreshToken').value.trim(),
      useZns: document.getElementById('setOaUseZns').checked,
      znsBirthdayTemplateId: document.getElementById('setZnsBirthdayTpl').value.trim(),
      znsHolidayTemplateId: document.getElementById('setZnsHolidayTpl').value.trim()
    }
  };

  const updated = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then((r) => r.json());

  state.settings = updated;
  updateHeaderBadges(updated);
  showToast('Đã lưu cấu hình hệ thống & lịch hẹn giờ!');
}

function updatePersonalStatusUI(qrStatus, personalConfig) {
  const statusEl = document.getElementById('personalStatusText');
  if (qrStatus && (qrStatus.isConnected || qrStatus.status === 'connected')) {
    statusEl.innerHTML = `<span class="text-emerald-600 font-bold">● Đã kết nối: ${qrStatus.scannedUser || personalConfig?.accountName || 'Zalo Cá Nhân'}</span>`;
  } else if (personalConfig && personalConfig.connected) {
    statusEl.innerHTML = `<span class="text-amber-600 font-semibold">● Đã lưu cấu hình (${personalConfig.accountName || 'Zalo'})</span>`;
  } else {
    statusEl.innerHTML = `<span class="text-slate-500">Chưa kết nối tài khoản Zalo cá nhân</span>`;
  }
}

async function startPersonalQrLogin() {
  const qrBox = document.getElementById('qrCodeBox');
  const qrImg = document.getElementById('qrImageElem');
  const qrText = document.getElementById('qrInstructionText');

  qrBox.classList.remove('hidden');
  qrText.textContent = '⏳ Đang khởi tạo mã QR từ máy chủ Zalo...';
  qrImg.src = '';

  try {
    const status = await fetch('/api/zalo/qr-start', { method: 'POST' }).then((r) => r.json());
    renderQrSessionState(status);

    if (state.qrPollTimer) clearInterval(state.qrPollTimer);
    state.qrPollTimer = setInterval(async () => {
      const s = await fetch('/api/zalo/qr-status').then((r) => r.json());
      renderQrSessionState(s);
      if (s.status === 'connected' || s.status === 'expired' || s.status === 'error') {
        clearInterval(state.qrPollTimer);
        if (s.status === 'connected') {
          showToast('🎉 Kết nối Zalo Cá Nhân qua QR thành công!');
          loadSettingsTab();
        }
      }
    }, 2000);
  } catch (err) {
    showToast('Không thể tạo QR: ' + err.message, 'error');
  }
}

function renderQrSessionState(s) {
  const qrImg = document.getElementById('qrImageElem');
  const qrText = document.getElementById('qrInstructionText');
  if (!s) return;

  if (s.qrImageBase64) {
    qrImg.src = s.qrImageBase64;
    qrImg.classList.remove('hidden');
  } else {
    qrImg.classList.add('hidden');
  }
  if (s.status === 'waiting_scan') {
    qrText.textContent = '📲 Mở Zalo trên điện thoại và quét mã QR bên dưới để kết nối Bot:';
  } else if (s.status === 'scanned') {
    qrText.textContent = `✅ Đã quét mã (${s.scannedUser}) — Vui lòng bấm "Đăng nhập" trên điện thoại của bạn!`;
  } else if (s.status === 'connected') {
    qrText.innerHTML = `<span class="text-emerald-700 font-bold text-sm">🎉 Đã kết nối thành công Zalo: ${s.scannedUser || 'Zalo Cá Nhân'}! Danh bạ của bạn đã sẵn sàng.</span>`;
  } else if (s.status === 'error' || s.status === 'expired') {
    qrText.textContent = `⚠️ ${s.error || 'Mã QR đã hết hạn'}`;
  }
}

async function loginPersonalWithCookie() {
  const imei = document.getElementById('setPersonalImei').value.trim();
  const cookie = document.getElementById('setPersonalCookie').value.trim();
  if (!imei || !cookie) {
    showToast('Vui lòng nhập đầy đủ IMEI và Cookie JSON', 'error');
    return;
  }

  const res = await fetch('/api/zalo/personal-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imei, cookie })
  }).then((r) => r.json());

  if (res.error) {
    showToast(res.error, 'error');
  } else {
    showToast('Đã kết nối Zalo Cá Nhân bằng Cookie thành công!');
    loadSettingsTab();
  }
}

async function disconnectPersonalZalo() {
  await fetch('/api/zalo/personal-disconnect', { method: 'POST' });
  showToast('Đã ngắt kết nối Zalo Cá Nhân.');
  loadSettingsTab();
}

async function refreshOaToken() {
  await saveAllSettings();
  const res = await fetch('/api/zalo/oa-refresh', { method: 'POST' }).then((r) => r.json());
  if (res.error) {
    showToast(res.error, 'error');
  } else {
    showToast('Đã làm mới Zalo OA Access Token thành công!');
    loadSettingsTab();
  }
}

// ================= 7. MESSAGE LOGS =================
async function loadLogs() {
  const logs = await fetch('/api/logs').then((r) => r.json());
  state.logs = logs || [];
  const tbody = document.getElementById('logsTableBody');

  if (!state.logs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400 text-sm">Chưa có lịch sử gửi tin nhắn nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.logs
    .map((l) => {
      const timeStr = new Date(l.timestamp).toLocaleString('vi-VN');
      const statusBadge =
        l.status === 'success'
          ? `<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Thành công</span>`
          : `<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">✕ Lỗi: ${l.errorMessage || ''}</span>`;

      const modeBadge =
        l.mode === 'mock'
          ? 'Chạy thử (Mock)'
          : l.mode === 'personal'
          ? 'Zalo Cá Nhân'
          : 'Zalo OA / ZNS';

      return `
      <tr class="hover:bg-slate-50">
        <td class="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">${timeStr}</td>
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-800">${l.customerName}</div>
          <div class="text-xs text-slate-500">${l.phone || ''}</div>
        </td>
        <td class="py-3.5 px-4 font-medium text-slate-700">${l.occasionTitle || ''}</td>
        <td class="py-3.5 px-4 text-xs font-semibold text-slate-600">${modeBadge}</td>
        <td class="py-3.5 px-4">${statusBadge}</td>
        <td class="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
          ${
            l.cardUrl
              ? `<a href="${l.cardUrl}" target="_blank" class="text-xs font-semibold text-zalo-600 hover:underline">🖼️ Xem ảnh Thiệp PNG</a>`
              : ''
          }
        </td>
      </tr>`;
    })
    .join('');
}

// ================= 8. ZALO CONTACTS SYNCHRONIZATION =================
let syncModalState = {
  contacts: [],
  availableLabels: [],
  source: 'auto',
  sourceLabel: ''
};

async function openZaloSyncModal() {
  const modal = document.getElementById('zaloSyncModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const sourceSelect = document.getElementById('zaloSyncSourceSelect');
  await fetchContactsForSyncModal(sourceSelect ? sourceSelect.value : 'auto');
}

function closeZaloSyncModal() {
  const modal = document.getElementById('zaloSyncModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function fetchContactsForSyncModal(source = 'auto') {
  const tbody = document.getElementById('zaloSyncTableBody');
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="py-12 text-center text-slate-500 text-sm">
        ⏳ Đang kết nối và tải danh sách bạn bè từ Zalo (bao gồm tên gợi nhớ, giới tính, ngày sinh & thẻ phân loại)...
      </td>
    </tr>`;

  try {
    const res = await fetch(`/api/zalo/contacts?source=${encodeURIComponent(source)}`).then((r) => r.json());
    if (res.error) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-10 px-6 text-center space-y-3">
            <div class="text-rose-600 font-bold text-sm">⚠️ ${res.error}</div>
            <div class="flex items-center justify-center gap-3 pt-2">
              <button onclick="closeZaloSyncModal(); switchTab('settings'); startPersonalQrLogin();" class="bg-zalo-500 hover:bg-zalo-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow">
                📷 Quét mã QR Kết nối Zalo Cá nhân ngay
              </button>
              <button onclick="document.getElementById('zaloSyncSourceSelect').value='mock'; fetchContactsForSyncModal('mock');" class="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-4 py-2 rounded-lg">
                🧪 Thử nghiệm với Danh bạ Zalo Mẫu
              </button>
            </div>
          </td>
        </tr>`;
      return;
    }

    syncModalState.contacts = (res.contacts || []).map((c, idx) => ({
      ...c,
      _idx: idx,
      _selected: true
    }));
    syncModalState.availableLabels = res.availableLabels || [];
    syncModalState.source = res.source;
    syncModalState.sourceLabel = res.sourceLabel || '';

    document.getElementById('zaloSyncSourceLabel').textContent = `Nguồn hiện tại: ${res.sourceLabel}`;
    document.getElementById('syncTotalCount').textContent = res.totalCount || 0;
    document.getElementById('syncBirthdayCount').textContent = res.withBirthdayCount || 0;

    // Populate Zalo Labels filter dropdown
    const lblSelect = document.getElementById('syncLabelFilter');
    lblSelect.innerHTML =
      `<option value="">Tất cả Thẻ phân loại Zalo</option>` +
      syncModalState.availableLabels.map((l) => `<option value="${l}">🏷️ ${l}</option>`).join('');

    renderZaloSyncTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500">Lỗi tải danh bạ: ${err.message}</td></tr>`;
  }
}

function getFilteredSyncContacts() {
  const q = (document.getElementById('syncSearchInput')?.value || '').trim().toLowerCase();
  const labelFilter = document.getElementById('syncLabelFilter')?.value || '';
  const onlyBirthday = Boolean(document.getElementById('syncOnlyBirthday')?.checked);

  return syncModalState.contacts.filter((c) => {
    if (onlyBirthday && !c.birthday) return false;
    if (labelFilter && c.zaloLabel !== labelFilter && c.group !== labelFilter) return false;
    if (q) {
      const hay = `${c.fullName} ${c.zaloName} ${c.alias} ${c.phone} ${c.zaloUid}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function updateSyncSelectedCounter() {
  const selected = syncModalState.contacts.filter((c) => c._selected).length;
  const el = document.getElementById('syncSelectedCount');
  if (el) el.textContent = selected;
}

let syncRenderLimit = 100;

function showMoreSyncContacts() {
  syncRenderLimit += 200;
  renderZaloSyncTable();
}

function renderZaloSyncTable() {
  const tbody = document.getElementById('zaloSyncTableBody');
  const filtered = getFilteredSyncContacts();
  updateSyncSelectedCounter();

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Không có liên hệ Zalo nào khớp bộ lọc.</td></tr>`;
    return;
  }

  const visibleList = filtered.slice(0, syncRenderLimit);

  const rowsHtml = visibleList
    .map((c) => {
      const avatarHtml = c.avatar
        ? `<img src="${c.avatar}" alt="${c.fullName}" loading="lazy" class="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />`
        : `<div class="w-9 h-9 rounded-full bg-blue-100 text-zalo-600 font-bold text-xs flex items-center justify-center shrink-0">${(c.fullName || 'Z').charAt(0)}</div>`;

      const statusBadge = c.alreadyExists
        ? `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-zalo-600 border border-blue-200">Cập nhật</span>`
        : `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Mới</span>`;

      const salOptions = ['Anh', 'Chị', 'Cô', 'Chú', 'Bác', 'Bạn']
        .map((s) => `<option value="${s}" ${c.salutation === s ? 'selected' : ''}>${s}</option>`)
        .join('');

      return `
      <tr class="hover:bg-slate-50/90 transition">
        <td class="py-2.5 px-4">
          <input type="checkbox" ${c._selected ? 'checked' : ''} onchange="onSyncItemFieldChange(${c._idx}, '_selected', this.checked)" class="w-4 h-4 rounded text-zalo-500" />
        </td>
        <td class="py-2.5 px-3">
          <div class="flex items-center gap-2.5">
            ${avatarHtml}
            <div>
              <input type="text" value="${c.fullName}" onchange="onSyncItemFieldChange(${c._idx}, 'fullName', this.value)" class="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-zalo-500 focus:outline-none px-0.5 py-0.5 text-xs sm:text-sm w-44" />
              <div class="text-[11px] text-slate-400">Zalo: ${c.zaloName || c.alias || '—'}</div>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3">
          <select onchange="onSyncItemFieldChange(${c._idx}, 'salutation', this.value)" class="text-xs font-semibold px-2 py-1 rounded border border-slate-300 bg-white">
            ${salOptions}
          </select>
        </td>
        <td class="py-2.5 px-3">
          <input type="text" value="${c.phone || ''}" placeholder="Nhập SĐT (nếu có)" onchange="onSyncItemFieldChange(${c._idx}, 'phone', this.value)" class="text-xs font-medium text-slate-700 px-2 py-1 rounded border border-slate-200 w-28" />
          <div class="text-[10px] text-slate-400 mt-0.5 font-mono">UID: ${c.zaloUid}</div>
        </td>
        <td class="py-2.5 px-3">
          <input type="date" value="${c.birthday || ''}" onchange="onSyncItemFieldChange(${c._idx}, 'birthday', this.value)" class="text-xs px-2 py-1 rounded border ${c.birthday ? 'border-rose-300 bg-rose-50/40 font-semibold text-rose-700' : 'border-slate-200 text-slate-500'}" />
        </td>
        <td class="py-2.5 px-3">
          <input type="text" value="${c.group || 'Thân thiết'}" onchange="onSyncItemFieldChange(${c._idx}, 'group', this.value)" class="text-xs font-semibold px-2 py-1 rounded border border-slate-200 w-28" />
        </td>
        <td class="py-2.5 px-3">${statusBadge}</td>
      </tr>`;
    })
    .join('');

  const moreRow =
    filtered.length > syncRenderLimit
      ? `<tr>
          <td colspan="7" class="py-3 text-center bg-slate-50">
            <button onclick="showMoreSyncContacts()" class="text-xs font-bold px-4 py-1.5 rounded-lg bg-zalo-500 hover:bg-zalo-600 text-white shadow">
              👇 Xem thêm bạn bè (Đang hiển thị ${visibleList.length} / ${filtered.length} người)
            </button>
          </td>
        </tr>`
      : '';

  tbody.innerHTML = rowsHtml + moreRow;
}

function onSyncItemFieldChange(idx, field, value) {
  const item = syncModalState.contacts.find((c) => c._idx === idx);
  if (!item) return;
  item[field] = value;
  if (field === '_selected') {
    updateSyncSelectedCounter();
  }
}

function toggleSelectAllSyncContacts(checked) {
  const filteredSet = new Set(getFilteredSyncContacts().map((c) => c._idx));
  syncModalState.contacts.forEach((c) => {
    if (filteredSet.has(c._idx)) {
      c._selected = Boolean(checked);
    }
  });
  renderZaloSyncTable();
}

async function confirmSyncZaloContacts() {
  const selectedContacts = syncModalState.contacts.filter((c) => c._selected);
  if (!selectedContacts.length) {
    showToast('Vui lòng tích chọn ít nhất 1 liên hệ để đồng bộ!', 'error');
    return;
  }

  const btn = document.getElementById('btnConfirmZaloSync');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳ Đang đồng bộ vào hệ thống...</span>';

  try {
    const res = await fetch('/api/zalo/contacts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: selectedContacts })
    }).then((r) => r.json());

    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(
        `🎉 Đồng bộ Danh bạ Zalo thành công! Đã thêm mới ${res.added} khách và cập nhật ${res.updated} khách.`,
        'success'
      );
      closeZaloSyncModal();
      await loadDashboard();
      if (state.currentTab === 'customers') await loadCustomers();
    }
  } catch (err) {
    showToast('Lỗi đồng bộ: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✅ Đồng bộ các liên hệ đã chọn</span>';
  }
}

// ================= 9. AUTO-REPLY BOT & AI BRAIN MANAGEMENT =================
let autoReplyState = {
  config: {},
  rules: [],
  logs: [],
  listenerStatus: {}
};

let aiBrainState = {
  config: {},
  knowledgeDocs: [],
  learnedPairs: []
};

async function loadAutoReplyTab() {
  try {
    const [arRes, aiRes, custRes] = await Promise.all([
      fetch('/api/autoreply').then((r) => r.json()),
      fetch('/api/ai').then((r) => r.json()),
      state.customers.length ? Promise.resolve(state.customers) : fetch('/api/customers').then((r) => r.json())
    ]);

    autoReplyState = arRes;
    aiBrainState = aiRes || { config: {}, knowledgeDocs: [], learnedPairs: [] };
    state.customers = custRes || [];

    const cfg = arRes.config || {};
    document.getElementById('arEnabledToggle').checked = cfg.enabled !== false;
    document.getElementById('arScope').value = cfg.scope || 'private_only';
    document.getElementById('arWorkingHoursMode').value = cfg.workingHoursMode || 'always';
    document.getElementById('arWorkStart').value = cfg.workStartHour || '08:00';
    document.getElementById('arWorkEnd').value = cfg.workEndHour || '18:00';
    document.getElementById('arDelaySeconds').value = cfg.replyDelaySeconds || 3;
    document.getElementById('arCooldownMinutes').value = cfg.cooldownMinutes || 60;

    const badge = document.getElementById('arListenerBadge');
    if (cfg.enabled === false) {
      badge.className = 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600';
      badge.textContent = '○ Đang TẮT';
    } else if (arRes.listenerStatus && arRes.listenerStatus.listening) {
      badge.className = 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
      badge.textContent = '● Đang lắng nghe & tự học trực tiếp trên Zalo';
    } else {
      badge.className = 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800';
      badge.textContent = '● Bật (Sẵn sàng phản hồi)';
    }

    // Populate simulator customer dropdown
    const simSelect = document.getElementById('arSimCustomerSelect');
    if (simSelect && !simSelect.options.length) {
      simSelect.innerHTML = state.customers
        .slice(0, 120)
        .map((c) => `<option value="${c.id}">${c.salutation || ''} ${c.fullName}</option>`)
        .join('');
    }

    renderAiBrainSection();
    renderAutoReplyRules();
    renderAutoReplyLogs();
  } catch (err) {
    console.error(err);
  }
}

function renderAiBrainSection() {
  const aiCfg = aiBrainState.config || {};
  const docs = aiBrainState.knowledgeDocs || [];
  const pairs = aiBrainState.learnedPairs || [];

  const enabledEl = document.getElementById('aiEnabledToggle');
  if (enabledEl) enabledEl.checked = aiCfg.enabled !== false;

  const providerEl = document.getElementById('aiProviderSelect');
  if (providerEl) providerEl.value = aiCfg.provider || 'auto';

  const modeEl = document.getElementById('aiReplyModeSelect');
  if (modeEl) modeEl.value = aiCfg.replyMode || 'hybrid';

  const autoLearnEl = document.getElementById('aiAutoLearnRealtime');
  if (autoLearnEl) autoLearnEl.checked = aiCfg.autoLearnRealtime !== false;

  const takeoverEl = document.getElementById('aiHumanTakeover');
  if (takeoverEl) takeoverEl.checked = aiCfg.humanTakeoverMinutes > 0;

  const geminiKeyEl = document.getElementById('aiGeminiKey');
  if (geminiKeyEl) geminiKeyEl.value = aiCfg.geminiApiKey || '';

  const openaiKeyEl = document.getElementById('aiOpenaiKey');
  if (openaiKeyEl) openaiKeyEl.value = aiCfg.openaiApiKey || '';

  const styleEl = document.getElementById('aiLearnedStyleSummary');
  if (styleEl) styleEl.value = aiCfg.learnedStyleSummary || '';

  const personaEl = document.getElementById('aiPersonaPrompt');
  if (personaEl) personaEl.value = aiCfg.personaPrompt || '';

  const statusBadge = document.getElementById('aiStatusBadge');
  if (statusBadge) {
    if (aiCfg.enabled === false) {
      statusBadge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300';
      statusBadge.textContent = '○ AI Đang Tắt';
    } else {
      const hasExternalKey = Boolean(aiCfg.geminiApiKey || aiCfg.openaiApiKey);
      statusBadge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30';
      statusBadge.textContent = hasExternalKey
        ? '● AI Cloud + Học Giọng Văn Đang Bật'
        : '● AI Nội Bộ + Học Giọng Văn Đang Bật';
    }
  }

  // Render Knowledge Docs
  const knowCountEl = document.getElementById('aiKnowledgeCount');
  if (knowCountEl) knowCountEl.textContent = docs.length;

  const knowListEl = document.getElementById('aiKnowledgeList');
  if (knowListEl) {
    knowListEl.innerHTML = docs.length
      ? docs
          .map(
            (d) => `
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-700/80 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs font-bold text-amber-200">📌 ${d.title}</span>
              <button onclick="deleteAiKnowledgeDoc('${d.id}')" class="text-[11px] text-rose-400 hover:underline shrink-0">Xóa</button>
            </div>
            <p class="text-[11px] text-slate-300 leading-relaxed">${d.content}</p>
          </div>`
          )
          .join('')
      : `<div class="text-xs text-slate-400 text-center py-4">Chưa có tài liệu kiến thức nào.</div>`;
  }

  // Render Learned Conversation Pairs
  const pairsCountEl = document.getElementById('aiLearnedPairsCount');
  if (pairsCountEl) pairsCountEl.textContent = pairs.length;

  const pairsListEl = document.getElementById('aiLearnedPairsList');
  if (pairsListEl) {
    pairsListEl.innerHTML = pairs.length
      ? pairs
          .slice(0, 60)
          .map((p) => {
            const srcBadge =
              p.source === 'zalo_realtime'
                ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">⚡ Học trực tiếp khi bạn chat</span>`
                : p.source === 'zalo_history'
                ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">📥 Quét lịch sử Zalo</span>`
                : `<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">✍️ Mẫu đã dạy</span>`;

            return `
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-700/80 space-y-1.5 text-xs">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-slate-200">👤 ${p.customerName || 'Khách hàng'}</span>
                  ${srcBadge}
                </div>
                <button onclick="deleteAiLearnedPair('${p.id}')" class="text-[11px] text-rose-400 hover:underline">Xóa</button>
              </div>
              <div class="text-slate-300 bg-slate-800/90 px-2.5 py-1.5 rounded border border-slate-700">
                💬 <strong>Khách hỏi:</strong> "${p.customerText}"
              </div>
              <div class="text-emerald-300 bg-emerald-950/40 px-2.5 py-1.5 rounded border border-emerald-500/30">
                🗣️ <strong>Cách bạn trả lời:</strong> "${p.ownerReply}"
              </div>
            </div>`;
          })
          .join('')
      : `<div class="text-xs text-slate-400 text-center py-6">Chưa có mẫu hội thoại nào. Hãy bấm <strong>"Quét & Học từ Lịch sử Tin nhắn Zalo"</strong>!</div>`;
  }
}

async function saveAiConfigForm() {
  const payload = {
    enabled: document.getElementById('aiEnabledToggle').checked,
    provider: document.getElementById('aiProviderSelect').value,
    replyMode: document.getElementById('aiReplyModeSelect').value,
    autoLearnRealtime: document.getElementById('aiAutoLearnRealtime').checked,
    humanTakeoverMinutes: document.getElementById('aiHumanTakeover').checked ? 30 : 0,
    geminiApiKey: document.getElementById('aiGeminiKey').value.trim(),
    openaiApiKey: document.getElementById('aiOpenaiKey').value.trim(),
    learnedStyleSummary: document.getElementById('aiLearnedStyleSummary').value.trim(),
    personaPrompt: document.getElementById('aiPersonaPrompt').value.trim()
  };

  await fetch('/api/ai/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  showToast('🧠 Đã lưu cấu hình Bộ não AI & Giọng văn của bạn!');
  await loadAutoReplyTab();
}

async function syncZaloHistoryForAi() {
  const btn = document.getElementById('btnSyncZaloAiHistory');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Đang quét tin nhắn Zalo & phân tích giọng văn...</span>';
  }
  showToast('Đang tải lịch sử hội thoại từ Zalo để học phong cách trả lời của bạn...', 'info');

  try {
    const res = await fetch('/api/ai/sync-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then((r) => r.json());

    if (res.success) {
      showToast(res.message || '🎉 Đã quét và học giọng văn từ Zalo thành công!', 'success');
      await loadAutoReplyTab();
    } else {
      showToast(res.error || 'Không thể đồng bộ lịch sử tin nhắn Zalo', 'error');
    }
  } catch (err) {
    showToast('Lỗi quét lịch sử Zalo: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>📥 Quét & Học từ Lịch sử Tin nhắn Zalo</span>';
    }
  }
}

async function teachNewAiPair() {
  const customerText = document.getElementById('aiTeachQuestion').value.trim();
  const ownerReply = document.getElementById('aiTeachAnswer').value.trim();
  if (!customerText || !ownerReply) {
    showToast('Vui lòng nhập cả Câu khách hỏi và Câu trả lời mẫu của bạn!', 'error');
    return;
  }

  await fetch('/api/ai/learned-pairs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Tình huống bạn dạy',
      customerText,
      ownerReply,
      topic: 'Hội thoại mẫu'
    })
  });

  document.getElementById('aiTeachQuestion').value = '';
  document.getElementById('aiTeachAnswer').value = '';
  showToast('✍️ Đã dạy thêm 1 tình huống giao tiếp mẫu cho Bộ não AI!');
  await loadAutoReplyTab();
}

async function deleteAiLearnedPair(id) {
  await fetch(`/api/ai/learned-pairs/${id}`, { method: 'DELETE' });
  showToast('Đã xóa mẫu hội thoại khỏi bộ nhớ AI.');
  await loadAutoReplyTab();
}

function toggleAddKnowledgeBox() {
  const box = document.getElementById('aiAddKnowledgeBox');
  if (box) box.classList.toggle('hidden');
}

async function saveAiKnowledgeDocForm() {
  const title = document.getElementById('aiKnowTitle').value.trim();
  const tags = document.getElementById('aiKnowTags').value.trim();
  const content = document.getElementById('aiKnowContent').value.trim();
  if (!title || !content) {
    showToast('Vui lòng nhập Tiêu đề và Nội dung kiến thức!', 'error');
    return;
  }

  await fetch('/api/ai/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, tags, content })
  });

  document.getElementById('aiKnowTitle').value = '';
  document.getElementById('aiKnowTags').value = '';
  document.getElementById('aiKnowContent').value = '';
  toggleAddKnowledgeBox();
  showToast('📚 Đã lưu tài liệu vào Kho Kiến thức AI!');
  await loadAutoReplyTab();
}

async function deleteAiKnowledgeDoc(id) {
  if (!confirm('Xóa mục kiến thức này khỏi Bộ nhớ AI?')) return;
  await fetch(`/api/ai/knowledge/${id}`, { method: 'DELETE' });
  showToast('Đã xóa mục kiến thức.');
  await loadAutoReplyTab();
}

function renderAutoReplyRules() {
  const container = document.getElementById('autoReplyRulesList');
  const rules = autoReplyState.rules || [];

  if (!rules.length) {
    container.innerHTML = `<div class="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-sm">Chưa có kịch bản trả lời tự động nào.</div>`;
    return;
  }

  container.innerHTML = rules
    .map((r) => {
      const matchBadge =
        r.matchType === 'default_fallback'
          ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">🌙 Mặc định khi bận / Ngoài từ khóa</span>`
          : r.matchType === 'exact'
          ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">🎯 Khớp chính xác 100%</span>`
          : `<span class="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-zalo-600">🔍 Chứa từ khóa</span>`;

      const kwChips = String(r.keywords || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => `<span class="text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">${k}</span>`)
        .join('');

      return `
      <div class="bg-white rounded-xl p-4 shadow-sm border ${r.active ? 'border-slate-200' : 'border-slate-200 opacity-60'} space-y-2.5">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-slate-800 text-sm">${r.name}</span>
              ${matchBadge}
            </div>
            <div class="flex flex-wrap gap-1 pt-0.5">${kwChips}</div>
          </div>

          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input type="checkbox" ${r.active ? 'checked' : ''} onchange="toggleAutoReplyRule('${r.id}', this.checked)" class="w-4 h-4 rounded text-zalo-500" />
              <span>${r.active ? 'Đang Bật' : 'Đang Tắt'}</span>
            </label>
            <button onclick="editAutoReplyRule('${r.id}')" class="text-xs font-semibold px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600">Sửa</button>
            <button onclick="deleteAutoReplyRule('${r.id}')" class="text-xs font-semibold px-2.5 py-1 rounded border border-rose-200 hover:bg-rose-50 text-rose-600">Xóa</button>
          </div>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
          ${r.replyText}
        </div>
      </div>`;
    })
    .join('');
}

function renderAutoReplyLogs() {
  const container = document.getElementById('arRecentLogsList');
  const logs = autoReplyState.logs || [];

  if (!logs.length) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">Chưa có nhật ký phản hồi tự động nào.</div>`;
    return;
  }

  container.innerHTML = logs
    .slice(0, 25)
    .map((l) => {
      const timeStr = new Date(l.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const modeBadge =
        l.mode === 'personal'
          ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Zalo Thật</span>`
          : `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Thử nghiệm</span>`;

      return `
      <div class="p-3 hover:bg-slate-50 space-y-1 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-800">${l.senderName}</span>
          <div class="flex items-center gap-1.5">
            ${modeBadge}
            <span class="text-slate-400">${timeStr}</span>
          </div>
        </div>
        <p class="text-slate-600">💬 <em>"${l.incomingText}"</em> <span class="text-[11px] text-zalo-600 font-semibold">(Khớp: ${l.matchedKeyword})</span></p>
        <p class="text-emerald-700 bg-emerald-50/60 p-2 rounded border border-emerald-100">🤖 ${l.replyText}</p>
      </div>`;
    })
    .join('');
}

async function saveAutoReplyConfigForm() {
  const payload = {
    enabled: document.getElementById('arEnabledToggle').checked,
    scope: document.getElementById('arScope').value,
    workingHoursMode: document.getElementById('arWorkingHoursMode').value,
    workStartHour: document.getElementById('arWorkStart').value || '08:00',
    workEndHour: document.getElementById('arWorkEnd').value || '18:00',
    replyDelaySeconds: Number(document.getElementById('arDelaySeconds').value) || 3,
    cooldownMinutes: Number(document.getElementById('arCooldownMinutes').value) || 60
  };

  await fetch('/api/autoreply/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  showToast('Đã cập nhật cấu hình Trả lời Tự động!');
  await loadAutoReplyTab();
}

async function toggleAutoReplyRule(id, active) {
  const rule = (autoReplyState.rules || []).find((r) => r.id === id);
  if (!rule) return;

  await fetch('/api/autoreply/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...rule, active: Boolean(active) })
  });

  showToast(active ? `Đã bật kịch bản: ${rule.name}` : `Đã tắt kịch bản: ${rule.name}`);
  await loadAutoReplyTab();
}

function openAutoReplyRuleModal(rule = null) {
  document.getElementById('arRuleModalTitle').textContent = rule
    ? 'Cập nhật Kịch bản Trả lời Tự động'
    : 'Thêm Kịch bản Trả lời Tự động mới';
  document.getElementById('arRuleId').value = rule ? rule.id : '';
  document.getElementById('arRuleName').value = rule ? rule.name : '';
  document.getElementById('arRuleMatchType').value = rule ? rule.matchType : 'contains';
  document.getElementById('arRulePriority').value = rule ? rule.priority || 8 : 8;
  document.getElementById('arRuleKeywords').value = rule ? rule.keywords : '';
  document.getElementById('arRuleReplyText').value = rule
    ? rule.replyText
    : 'Dạ chào {xung_ho} {ten}! {xung_em} từ {ten_thuong_hieu} xin phản hồi thông tin đến {xung_ho_thuong} ạ...';
  document.getElementById('arRuleActive').checked = rule ? rule.active !== false : true;

  const modal = document.getElementById('autoReplyRuleModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeAutoReplyRuleModal() {
  const modal = document.getElementById('autoReplyRuleModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function editAutoReplyRule(id) {
  const rule = (autoReplyState.rules || []).find((r) => r.id === id);
  if (rule) openAutoReplyRuleModal(rule);
}

function insertArVar(token) {
  const textarea = document.getElementById('arRuleReplyText');
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value;
  textarea.value = val.slice(0, start) + token + val.slice(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + token.length;
}

async function saveAutoReplyRuleForm() {
  const payload = {
    id: document.getElementById('arRuleId').value || undefined,
    name: document.getElementById('arRuleName').value.trim(),
    matchType: document.getElementById('arRuleMatchType').value,
    priority: Number(document.getElementById('arRulePriority').value) || 8,
    keywords: document.getElementById('arRuleKeywords').value.trim(),
    replyText: document.getElementById('arRuleReplyText').value.trim(),
    active: document.getElementById('arRuleActive').checked
  };

  if (!payload.name || !payload.replyText) {
    showToast('Vui lòng nhập Tên kịch bản và Nội dung câu trả lời!', 'error');
    return;
  }

  await fetch('/api/autoreply/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  showToast('Đã lưu kịch bản trả lời tự động!');
  closeAutoReplyRuleModal();
  await loadAutoReplyTab();
}

async function deleteAutoReplyRule(id) {
  if (!confirm('Xóa kịch bản trả lời tự động này?')) return;
  await fetch(`/api/autoreply/${id}`, { method: 'DELETE' }).catch(() => {});
  await fetch(`/api/autoreply/rules/${id}`, { method: 'DELETE' });
  showToast('Đã xóa kịch bản.');
  await loadAutoReplyTab();
}

function setArSimInput(text, forceAi = false) {
  document.getElementById('arSimInputText').value = text;
  runAutoReplySim(false, forceAi);
}

async function runAutoReplySim(sendReal = false, forceAi = false) {
  const incomingText = document.getElementById('arSimInputText').value.trim();
  const customerId = document.getElementById('arSimCustomerSelect').value;
  if (!incomingText) {
    showToast('Vui lòng nhập nội dung tin nhắn khách gửi để thử!', 'error');
    return;
  }

  const area = document.getElementById('arSimResultArea');
  area.innerHTML = `<div class="text-center text-xs text-slate-500 py-8">⏳ Đang phân tích tin nhắn và tạo câu trả lời theo giọng văn của bạn...</div>`;

  const res = await fetch('/api/autoreply/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incomingText, customerId, sendReal, forceAi })
  }).then((r) => r.json());

  const custName = `${res.customer?.salutation || ''} ${res.customer?.fullName || 'Khách hàng'}`.trim();

  if (!res.matched) {
    area.innerHTML = `
      <div class="flex flex-col items-start">
        <span class="text-[11px] text-slate-500 mb-1">${custName} nhắn:</span>
        <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-xs border border-slate-200 text-xs sm:text-sm text-slate-800 max-w-[88%]">
          ${incomingText}
        </div>
      </div>
      <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center">
        ℹ️ ${res.message}
      </div>`;
    return;
  }

  area.innerHTML = `
    <div class="flex flex-col items-start">
      <span class="text-[11px] text-slate-500 mb-1">${custName} nhắn đến:</span>
      <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-xs border border-slate-200 text-xs sm:text-sm text-slate-800 max-w-[88%]">
        ${incomingText}
      </div>
    </div>

    <div class="flex flex-col items-end">
      <span class="text-[11px] text-indigo-700 font-bold mb-1">🤖 Phản hồi tự động (${res.matchedKeyword}):</span>
      <div class="bg-[#e5efff] p-3.5 rounded-2xl rounded-tr-sm shadow-xs border border-blue-200 text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed max-w-[92%]">
        ${res.replyText}
      </div>
    </div>`;

  await loadAutoReplyTab();
}

// ================= 10. ANIMATED 3D MASCOT WITH BELLY CLOCK =================
let mascotState = {
  emotion: 'happy', // 'happy' | 'ai_code' | 'excited' | 'sleepy'
  manualOverrideUntil: 0,
  colonVisible: true
};

function updateMascotBellyClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  mascotState.colonVisible = !mascotState.colonVisible;
  const text = mascotState.colonVisible ? `${hh}:${mm}` : `${hh} ${mm}`;

  const el1 = document.getElementById('cornerMascotClock');
  const el2 = document.getElementById('miniMascotClock');
  if (el1) el1.textContent = text;
  if (el2) el2.textContent = text;
}

function getMascotFaceSvgMarkup(emotion) {
  if (emotion === 'happy') {
    // Original 3D happy eyes & mouth are already on /mascot-3d-happy.png
    return '';
  }
  if (emotion === 'excited') {
    return `
      <polygon points="-55,-30 -47,-12 -27,-12 -43,0 -37,19 -55,7 -73,19 -67,0 -83,-12 -63,-12" fill="#facc15" stroke="#ffffff" stroke-width="3" />
      <polygon points="55,-30 63,-12 83,-12 67,0 73,19 55,7 37,19 43,0 27,-12 47,-12" fill="#facc15" stroke="#ffffff" stroke-width="3" />
      <path d="M -28 20 Q 0 46 28 20" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" />
    `;
  }
  if (emotion === 'sleepy') {
    return `
      <path d="M -78 -6 Q -52 16 -26 -6" fill="none" stroke="#bae6fd" stroke-width="9" stroke-linecap="round" />
      <path d="M 26 -6 Q 52 16 78 -6" fill="none" stroke="#bae6fd" stroke-width="9" stroke-linecap="round" />
      <circle cx="0" cy="26" r="8" fill="#bae6fd" />
      <text x="54" y="-36" font-family="Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#7df9ff">Zzz</text>
    `;
  }
  // 'ai_code' (>_ Terminal Face)
  return `
    <polyline points="-74,-24 -34,0 -74,24" fill="none" stroke="#7df9ff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="12" y1="24" x2="72" y2="24" stroke="#7df9ff" stroke-width="10" stroke-linecap="round" class="mascot-cursor-blink" />
  `;
}

function applyMascotVisualState(emotion, bubbleText) {
  const imgSrc = emotion === 'happy' ? '/mascot-3d-happy.png' : '/mascot-3d-base.png';
  const img1 = document.getElementById('cornerMascot3dImg');
  const img2 = document.getElementById('miniMascot3dImg');
  if (img1) img1.setAttribute('href', imgSrc);
  if (img2) img2.setAttribute('href', imgSrc);

  const svgMarkup = getMascotFaceSvgMarkup(emotion);
  const f1 = document.getElementById('cornerMascotFace');
  const f2 = document.getElementById('miniMascotFace');
  if (f1) f1.innerHTML = svgMarkup;
  if (f2) f2.innerHTML = svgMarkup;

  if (bubbleText) {
    const b1 = document.getElementById('cornerMascotBubble');
    const b2 = document.getElementById('miniMascotBubble');
    if (b1) b1.textContent = bubbleText;
    if (b2) b2.textContent = bubbleText;
  }
}

function setMascotEmotion(emotion, customBubbleText = null) {
  mascotState.emotion = emotion;
  mascotState.manualOverrideUntil = Date.now() + 25000;

  const defaultLabels = {
    happy: '😊 Đang trực Zalo • Hoàn Phạm',
    ai_code: '💻 AI đang trực & học giọng văn Zalo',
    excited: '🎉 Sẵn sàng gửi thiệp chúc mừng VIP!',
    sleepy: '😴 Đang tạm nghỉ ngơi...'
  };
  const bubbleText = customBubbleText || defaultLabels[emotion] || 'Zalo Care Bot • 24/7';
  applyMascotVisualState(emotion, bubbleText);
}

function cycleMascotEmotion() {
  const order = ['happy', 'ai_code', 'excited', 'sleepy'];
  const nextIdx = (order.indexOf(mascotState.emotion) + 1) % order.length;
  setMascotEmotion(order[nextIdx]);
}

function toggleMiniMascotOverlay(show) {
  const overlay = document.getElementById('mascotMiniModeOverlay');
  if (!overlay) return;
  if (show) {
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  } else {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }
}

async function minimizeAppToMascot() {
  toggleMiniMascotOverlay(true);
  try {
    await fetch('/api/mascot/minimize', { method: 'POST' });
    showToast('🤖 Đã thu nhỏ thành nhân vật Mascot 3D trên màn hình Desktop!');
  } catch (err) {
    console.error(err);
  }
}

async function pollMascotLiveStatus() {
  try {
    const res = await fetch('/api/mascot/status').then((r) => r.json());
    if (Date.now() > mascotState.manualOverrideUntil && res.emotion) {
      mascotState.emotion = res.emotion;
      applyMascotVisualState(res.emotion, res.statusText || '');
    }
  } catch {}
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  updateMascotBellyClock();
  setInterval(updateMascotBellyClock, 1000);
  setInterval(pollMascotLiveStatus, 4500);
});
