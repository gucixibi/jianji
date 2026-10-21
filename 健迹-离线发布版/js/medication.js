/**
 * 健迹 - 服药管理模块
 * 建立医嘱计划 + 按日打卡
 */

const JJMedication = {
  render(container) {
    container.innerHTML = `
      <div class="space-y-5">
        ${this.renderHeader()}
        ${this.renderPlans()}
        ${this.renderCheckinCalendar()}
      </div>
    `;
    this.bindEvents();
  },

  renderHeader() {
    return `
      <div class="card">
        <h2 class="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <i data-lucide="pill" class="w-5 h-5 text-indigo-600"></i>服药管理
        </h2>
        <p class="text-sm text-slate-500 mt-1">记录医嘱中的药物计划，按日打卡跟踪执行。仅供个人参考，不替代医生指导。</p>
      </div>
    `;
  },

  renderPlans() {
    const meds = JJData.getMedications();
    const items = meds.map(m => this.renderMedCard(m)).join('');
    return `
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-slate-800 flex items-center gap-2">
            <i data-lucide="list" class="w-4 h-4 text-slate-500"></i>服药计划 <span class="badge badge-indigo">${meds.length} 项</span>
          </h3>
          <button id="btn-add-med" class="btn-primary">
            <i data-lucide="plus" class="w-4 h-4"></i>添加计划
          </button>
        </div>
        <div class="space-y-3">${items || '<div class="text-sm text-slate-500 text-center py-6">暂无服药计划，点击上方按钮添加</div>'}</div>
      </div>
    `;
  },

  renderMedCard(m) {
    return `
      <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <div class="flex items-center justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <i data-lucide="pill" class="w-5 h-5 text-indigo-600"></i>
            </div>
            <div>
              <div class="font-semibold text-slate-800">${m.name} <span class="text-slate-500 font-normal text-sm">· ${m.dosage}</span></div>
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
        const color = hasMissed ? 'bg-rose-100 text-rose-700 border-rose-200' : hasDone ? 'bg-teal-100 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-400 border-slate-200';
        return `<div class="w-10 h-10 flex flex-col items-center justify-center rounded-lg text-xs font-medium border ${color} ${isToday ? 'ring-2 ring-teal-400 ring-offset-1' : ''}">
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
  }
};

window.JJMedication = JJMedication;
