/**
 * 健迹 - 服药管理模块
 * 建立医嘱计划 + 按日打卡
 */

const JJMedication = {
  render(container) {
    const entries = JJData.getAllEntries();
    const meds = JJData.getMedications();

    // 服药计划和记录都空时，显示综合引导
    if (entries.length === 0 && meds.length === 0) {
      container.innerHTML = `
        <div class="page-gap fade-in">
          ${this.renderHeader()}
          ${JJApp.renderEmptyState('服药管理')}
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="page-gap fade-in">
        ${this.renderHeader()}
        ${this.renderReminderBar()}
        ${this.renderPlans()}
        ${this.renderCheckinCalendar()}
      </div>
    `;
    this.bindEvents();
    this.bindReminderBar();
  },

  renderHeader() {
    return `
      <div class="px-0.5">
        <h2 class="page-title flex items-center gap-2">
          <i data-lucide="pill" class="w-[18px] h-[18px]" style="color:#2d5791"></i>服药管理
        </h2>
        <p class="page-sub">记录医嘱中的药物计划，按日打卡跟踪执行。仅供个人参考，不替代医生指导。</p>
      </div>
    `;
  },

  /** 提醒开关条 + 当前到期提醒横幅 */
  renderReminderBar() {
    const enabled = JJData.isReminderEnabled();
    const now = new Date();
    const nowHM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const today = JJData.TODAY_STR;
    const meds = JJData.getMedications();
    const checkins = JJData.getCheckins();

    // 找出当前 ±5 分钟内到期的 slot（还没打卡的）
    const dueSoon = meds.flatMap(m =>
      (m.times || []).map(t => {
        const ci = checkins.find(c => c.date === today && c.med_id === m.id && c.time_slot === t);
        if (ci && (ci.status === 'done' || ci.status === 'late')) return null;
        const [ah,am] = nowHM.split(':').map(Number);
        const [bh,bm] = t.split(':').map(Number);
        const diff = Math.abs((ah*60+am) - (bh*60+bm));
        if (diff > 5) return null;
        return { med: m, slot: t };
      }).filter(Boolean)
    );

    const statusText = enabled
      ? ('Notification' in window
          ? (Notification.permission === 'granted' ? '桌面通知已就绪'
             : Notification.permission === 'denied' ? '浏览器已拒绝通知' : '等待授权中')
          : '当前浏览器不支持系统通知')
      : '已关闭';

    const dueBanner = dueSoon.length > 0
      ? `<div class="mt-3 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5" style="background:#fff8ed;border:1px solid #fcd9a2;">
           <span class="inline-flex w-7 h-7 rounded-full items-center justify-center pulse-ring"
                 style="background:#ff9b1a;color:#fff;">
             <i data-lucide="bell" class="w-4 h-4"></i>
           </span>
           <div class="flex-1">
             <div class="text-[13px] font-semibold text-[#b54708]">现在该服：${dueSoon.map(d => `${d.med.name} · ${d.slot}`).join('、')}</div>
             <div class="text-[11.5px] text-[#b07b3c] mt-0.5">点击下方服药卡完成打卡</div>
           </div>
         </div>`
      : '';

    return `
      <div class="card py-3 px-4 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <i data-lucide="bell-ring" class="w-4 h-4 text-slate-500 shrink-0"></i>
          <div class="min-w-0">
            <div class="text-[13px] font-medium text-slate-800">到点服药提醒</div>
            <div class="text-[11.5px] text-slate-500 truncate">${statusText} · 页面打开期间生效</div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="reminder-toggle" class="sr-only peer" ${enabled ? 'checked' : ''}>
            <div class="w-[40px] h-[22px] bg-slate-200 peer-checked:bg-teal-600 rounded-full transition-colors relative">
              <div class="absolute top-[2px] left-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform peer-checked:translate-x-[18px]"></div>
            </div>
          </label>
        </div>
      </div>
      ${dueBanner}
    `;
  },

  renderPlans() {
    const meds = JJData.getMedications();
    const items = meds.map(m => this.renderMedCard(m)).join('');
    return `
      <div class="card">
        <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 class="card-title">
            <i data-lucide="list" class="w-4 h-4 text-slate-400"></i>服药计划
            <span class="badge badge-slate">${meds.length} 项</span>
          </h3>
          <button id="btn-add-med" class="btn-primary">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>添加计划
          </button>
        </div>
        <div class="space-y-2.5">${items || '<div class="text-[13px] text-slate-500 text-center py-6">暂无服药计划，点击上方按钮添加</div>'}</div>
      </div>
    `;
  },

  renderMedCard(m) {
    // 计算到期状态（当前 ±5 分钟内未打卡的 slot 数量）
    const now = new Date();
    const nowHM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const today = JJData.TODAY_STR;
    const checkins = JJData.getCheckins();
    const dueSlots = (m.times || []).filter(t => {
      const ci = checkins.find(c => c.date === today && c.med_id === m.id && c.time_slot === t);
      if (ci && (ci.status === 'done' || ci.status === 'late')) return false;
      const [ah,am] = nowHM.split(':').map(Number);
      const [bh,bm] = t.split(':').map(Number);
      const diff = Math.abs((ah*60+am) - (bh*60+bm));
      return diff <= 5;
    });

    const dueBadge = dueSlots.length > 0
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold pulse-chip"
             style="background:#fff0e0;color:#b54708;border:1px solid #fcd9a2;">
           <i data-lucide="bell" class="w-3 h-3"></i>
           该服用了 · ${dueSlots.join(' / ')}
         </span>`
      : '';

    return `
      <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors ${dueSlots.length > 0 ? 'ring-2 ring-amber-300 ring-offset-1' : ''}">
        <div class="flex items-center justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <i data-lucide="pill" class="w-5 h-5 text-indigo-600"></i>
            </div>
            <div>
              <div class="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                ${m.name} <span class="text-slate-500 font-normal text-sm">· ${m.dosage}</span>
                ${dueBadge}
              </div>
              <div class="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                <i data-lucide="clock" class="w-3.5 h-3.5"></i>${m.times.join(' / ')}
              </div>
              ${m.notes ? `<div class="text-xs text-slate-500 mt-1">${m.notes}</div>` : ''}
            </div>
          </div>
          <div class="flex gap-1">
            <button data-edit-med="${m.id}" class="text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg p-1.5 transition-colors" title="编辑">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
            </button>
            <button data-del-med="${m.id}" class="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-1.5 transition-colors" title="删除">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderEditModal(med = null) {
    const m = med || { name: '', dosage: '', times: ['08:00'], notes: '', start_date: JJData.TODAY_STR };
    return `
      <div id="med-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onclick="document.getElementById('med-modal').remove()">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onclick="event.stopPropagation()">
          <h3 class="font-semibold text-lg mb-5 flex items-center gap-2">
            <i data-lucide="${med ? 'pencil' : 'plus-circle'}" class="w-5 h-5 text-indigo-600"></i>${med ? '编辑' : '新建'}服药计划
          </h3>
          <div class="space-y-4">
            <div><label class="field-label">药物名称</label><input type="text" id="med-name" class="field-input" value="${m.name}" placeholder="如：降压药" /></div>
            <div><label class="field-label">剂量</label><input type="text" id="med-dosage" class="field-input" value="${m.dosage}" placeholder="如：5mg" /></div>
            <div><label class="field-label">服用时间（逗号分隔）</label><input type="text" id="med-times" class="field-input" value="${m.times.join(', ')}" placeholder="如：08:00, 20:00" /></div>
            <div><label class="field-label">备注</label><input type="text" id="med-notes" class="field-input" value="${m.notes || ''}" placeholder="如：饭后服用" /></div>
          </div>
          <div class="flex gap-2 mt-6">
            <button id="btn-med-save" class="btn-primary flex-1"><i data-lucide="save" class="w-4 h-4"></i>保存</button>
            <button id="btn-med-cancel" class="btn-secondary flex-1">取消</button>
          </div>
        </div>
      </div>
    `;
  },

  renderCheckinCalendar() {
    const meds = JJData.getMedications();
    const checkins = JJData.getCheckins();
    const today = JJData.TODAY_STR;
    const days = [];
    for (let i = 13; i >= 0; i--) {
      days.push(JJData.localDateStr(-i));
    }
    const getStatus = (date, medId, timeSlot) => {
      const ci = checkins.find(c => c.date === date && c.med_id === medId && c.time_slot === timeSlot);
      return ci?.status || 'pending';
    };
    const grid = meds.map(m => {
      const col = days.map(date => {
        const slotStatuses = m.times.map(t => getStatus(date, m.id, t));
        const hasDone = slotStatuses.some(s => s === 'done' || s === 'late');
        const hasMissed = slotStatuses.some(s => s === 'missed');
        const isToday = date === today;
        const isFuture = date > today;
        const color = hasMissed ? 'bg-rose-100 text-rose-700 border-rose-200' : hasDone ? 'bg-teal-100 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-400 border-slate-200';
        const clickable = !isFuture;
        const clickCls = clickable ? 'cursor-pointer hover:opacity-80 hover:scale-105 transition-all' : 'opacity-50 cursor-not-allowed';
        const clickAttr = clickable ? `data-checkin="${m.id}" data-checkin-date="${date}"` : '';
        return `<div class="w-10 h-10 flex flex-col items-center justify-center rounded-lg text-xs font-medium border ${color} ${isToday ? 'ring-2 ring-teal-400 ring-offset-1' : ''} ${clickCls}" ${clickAttr}>
          ${hasMissed ? '<i data-lucide="x-circle" class="w-4 h-4"></i>' : hasDone ? '<i data-lucide="check-circle" class="w-4 h-4"></i>' : '<i data-lucide="circle" class="w-3 h-3"></i>'}
          <span class="text-[9px] opacity-70 mt-0.5 leading-none">${date.slice(8)}</span>
        </div>`;
      }).join('');
      return `<div><div class="text-sm font-medium text-slate-700 mb-2">${m.name}</div><div class="flex gap-1 flex-wrap">${col}</div></div>`;
    }).join('');

    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <i data-lucide="calendar-days" class="w-4 h-4 text-slate-500"></i>最近14天打卡状态
          <span class="badge badge-slate text-[10.5px]">点击格子可补卡</span>
        </h3>
        ${grid || '<div class="text-sm text-slate-500 text-center py-4">暂无服药计划</div>'}
        <div class="flex gap-4 mt-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-teal-100 border border-teal-200"></span>已打卡</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-rose-100 border border-rose-200"></span>漏服</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-slate-100 border border-slate-200"></span>待服</span>
        </div>
      </div>
    `;
  },

  /** 补卡弹窗：按 (med + date) 列出每个时间点 + 三个快捷按钮 */
  renderCheckinModal(medId, date) {
    const med = JJData.getMedications().find(m => m.id === medId);
    if (!med) return '';
    const checkins = JJData.getCheckins();

    const statusLabel = { done: '已服', late: '迟服', missed: '漏服', pending: '待服' };
    const statusIcon = { done: 'check-circle', late: 'clock', missed: 'x-circle', pending: 'circle' };
    const statusColor = {
      done:    { bg: 'bg-teal-50',  text: 'text-teal-700',  btn: 'btn-primary' },
      late:    { bg: 'bg-amber-50', text: 'text-amber-700', btn: 'btn-secondary' },
      missed:  { bg: 'bg-rose-50',  text: 'text-rose-700',  btn: 'btn-danger' },
      pending: { bg: 'bg-slate-50', text: 'text-slate-600',  btn: 'btn-secondary' },
    };

    const rows = med.times.map(slot => {
      const ci = checkins.find(c => c.date === date && c.med_id === medId && c.time_slot === slot);
      const curStatus = ci?.status || 'pending';
      const c = statusColor[curStatus];
      return `
        <div class="flex items-center justify-between gap-3 p-3 rounded-xl ${c.bg} border border-slate-100">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="font-mono text-[15px] font-semibold text-slate-700 w-[58px] text-left">${slot}</span>
            <span class="flex items-center gap-1 text-[12px] ${c.text} font-medium">
              <i data-lucide="${statusIcon[curStatus]}" class="w-3.5 h-3.5"></i>
              当前：${statusLabel[curStatus]}
            </span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button data-medit="${medId}" data-slot="${slot}" data-status="done"
                    class="checkin-btn px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors
                           ${curStatus === 'done' ? 'bg-teal-600 text-white' : 'bg-white border border-teal-200 text-teal-700 hover:bg-teal-50'}">
              <i data-lucide="check" class="w-3 h-3 inline mr-0.5"></i>已服
            </button>
            <button data-medit="${medId}" data-slot="${slot}" data-status="late"
                    class="checkin-btn px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors
                           ${curStatus === 'late' ? 'bg-amber-500 text-white' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}">
              <i data-lucide="clock" class="w-3 h-3 inline mr-0.5"></i>迟服
            </button>
            <button data-medit="${medId}" data-slot="${slot}" data-status="missed"
                    class="checkin-btn px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors
                           ${curStatus === 'missed' ? 'bg-rose-600 text-white' : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'}">
              <i data-lucide="x" class="w-3 h-3 inline mr-0.5"></i>漏服
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div id="checkin-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onclick="document.getElementById('checkin-modal').remove()">
        <div class="bg-white rounded-2xl p-5 max-w-[460px] w-full shadow-2xl max-h-[85vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-semibold text-[15px] flex items-center gap-2">
                <i data-lucide="calendar-days" class="w-4 h-4 text-teal-600"></i>${med.name} · 打卡修正
              </h3>
              <p class="text-[12px] text-slate-500 mt-0.5">${date}</p>
            </div>
            <button id="btn-checkin-close" class="p-1 rounded-lg hover:bg-slate-100 transition-colors">
              <i data-lucide="x" class="w-4 h-4 text-slate-500"></i>
            </button>
          </div>
          <div class="space-y-2.5">${rows}</div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    const self = this;
    document.getElementById('btn-add-med')?.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', this.renderEditModal());
      this.bindModal();
      if (window.lucide) { window.lucide.createIcons(); }
    });
    document.querySelectorAll('[data-edit-med]').forEach(btn => {
      btn.addEventListener('click', () => {
        const med = JJData.getMedications().find(m => m.id === btn.dataset.editMed);
        document.body.insertAdjacentHTML('beforeend', this.renderEditModal(med));
        this.bindModal(med);
        if (window.lucide) { window.lucide.createIcons(); }
      });
    });
    document.querySelectorAll('[data-del-med]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('确定删除此服药计划？')) {
          JJData.deleteMedication(btn.dataset.delMed);
          showToast('✓ 已删除');
          this.render(document.getElementById('page-container'));
          this.bindEvents();
          if (window.lucide) { window.lucide.createIcons(); }
        }
      });
    });

    // 日历格子点击 → 补卡弹窗
    document.querySelectorAll('[data-checkin]').forEach(cell => {
      cell.addEventListener('click', () => {
        const medId = cell.dataset.checkin;
        const date = cell.dataset.checkinDate;
        this.openCheckinModal(medId, date);
      });
    });
  },

  /** 打开补卡弹窗 + 绑按钮事件 */
  openCheckinModal(medId, date) {
    const self = this;
    document.body.insertAdjacentHTML('beforeend', this.renderCheckinModal(medId, date));
    if (window.lucide) window.lucide.createIcons();

    const closeBtn = document.getElementById('btn-checkin-close');
    closeBtn?.addEventListener('click', () => document.getElementById('checkin-modal')?.remove());

    // 弹窗内三个状态按钮
    document.querySelectorAll('.checkin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { medit, slot, status } = btn.dataset;
        const res = JJData.setCheckinStatus(date, medit, slot, status);
        if (!res.ok) {
          showToast('✗ ' + res.error);
          return; // 失败：保持弹窗打开，不刷新
        }
        const label = { done: '已服', late: '迟服', missed: '漏服' }[status];
        showToast(`✓ ${slot} 标记为「${label}」`);
        // 成功：关闭弹窗 + 刷新日历
        document.getElementById('checkin-modal')?.remove();
        self.render(document.getElementById('page-container'));
        self.bindEvents();
        if (window.lucide) window.lucide.createIcons();
      });
    });
  },

  bindModal(existing = null) {
    const self = this;
    document.getElementById('btn-med-cancel').addEventListener('click', () => document.getElementById('med-modal').remove());
    document.getElementById('btn-med-save').addEventListener('click', () => {
      const name = document.getElementById('med-name').value.trim();
      if (!name) { showToast('请填写药物名称'); return; }
      const times = document.getElementById('med-times').value.split(/[,，\s]+/).filter(Boolean);
      JJData.saveMedication({
        id: existing?.id,
        name,
        dosage: document.getElementById('med-dosage').value.trim(),
        times: times.length > 0 ? times : ['08:00'],
        notes: document.getElementById('med-notes').value.trim(),
        start_date: existing?.start_date || JJData.TODAY_STR
      });
      document.getElementById('med-modal').remove();
      showToast('✓ 已保存');
      self.render(document.getElementById('page-container'));
      self.bindEvents();
      if (window.lucide) { window.lucide.createIcons(); }
    });
  },

  /** 提醒开关的 toggle 绑定 */
  bindReminderBar() {
    const toggle = document.getElementById('reminder-toggle');
    if (!toggle) return;
    toggle.addEventListener('change', async () => {
      const on = toggle.checked;
      if (on) {
        // 先请求 Notification 权限（如果支持）
        const perm = await JJApp.requestNotificationPermission();
        if (perm === 'denied') {
          showToast('浏览器已拒绝通知，请手动开启后重试');
          toggle.checked = false;
          return;
        }
        JJData.setReminderEnabled(true);
        JJApp.startReminderEngine();
        showToast(`✓ 已开启服药提醒${perm === 'granted' ? '（含桌面通知）' : ''}`);
      } else {
        JJData.setReminderEnabled(false);
        JJApp.stopReminderEngine();
        showToast('已关闭服药提醒');
      }
      // 刷新提醒条状态文字
      this.render(document.getElementById('page-container'));
      if (window.lucide) window.lucide.createIcons();
    });
  }
};

window.JJMedication = JJMedication;
