/**
 * 健迹 - 就诊准备模块
 * 选择时段 → 生成时间线 → 编辑就诊自述卡 → 打印
 */

const JJVisit = {
  periodStart: null,
  periodEnd: null,
  visitCard: null,

  render(container) {
    this.periodStart = JJData.localDateStr(-29);
    this.periodEnd = JJData.TODAY_STR;

    // 全局空数据引导（优先于就诊时段检查）
    if (JJData.getAllEntries().length === 0) {
      container.innerHTML = `
        <div class="page-gap fade-in">
          ${this.renderHeader()}
          ${JJApp.renderEmptyState('就诊准备')}
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="page-gap fade-in">
        ${this.renderHeader()}
        ${this.renderPeriodSelector()}
        <div id="visit-content">${this.renderPlaceholder()}</div>
      </div>
    `;
    this.bindPeriodSelector();
    this.renderPeriodContent();
  },

  renderHeader() {
    return `
      <div class="px-0.5">
        <h2 class="page-title flex items-center gap-2">
          <i data-lucide="stethoscope" class="w-[18px] h-[18px]" style="color:#2d5791"></i>就诊准备
        </h2>
        <p class="page-sub">选定时段后自动整理时间线、数据概况与可编辑的就诊自述卡。</p>
      </div>
    `;
  },

  renderPeriodSelector() {
    return `
      <div class="card">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- 左：时段选择 -->
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="seg" id="visit-quick-seg">
              <button data-quick="7"  class="seg-btn quick-btn">近 7 天</button>
              <button data-quick="14" class="seg-btn quick-btn">近 14 天</button>
              <button data-quick="30" class="seg-btn quick-btn active">近 30 天</button>
            </span>
            <div class="flex items-center gap-1.5">
              <input type="date" id="visit-start" value="${this.periodStart}" class="field-input" style="width:134px;padding:6px 8px;" />
              <span class="text-[12px] text-slate-300">→</span>
              <input type="date" id="visit-end" value="${this.periodEnd}" class="field-input" style="width:134px;padding:6px 8px;" />
            </div>
          </div>
          <!-- 右：操作 -->
          <div class="flex items-center gap-2">
            <button id="btn-visit-gen" class="btn-primary">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>更新就诊卡
            </button>
            <button id="btn-visit-print" class="btn-secondary">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i>打印
            </button>
            <button id="btn-visit-pdf" class="btn-secondary">
              <i data-lucide="file-down" class="w-3.5 h-3.5"></i>导出 PDF
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bindPeriodSelector() {
    const apply = () => {
      this.periodStart = document.getElementById('visit-start').value;
      this.periodEnd = document.getElementById('visit-end').value;
      this.renderPeriodContent();
    };
    document.getElementById('btn-visit-gen')?.addEventListener('click', apply);
    document.getElementById('visit-start')?.addEventListener('change', apply);
    document.getElementById('visit-end')?.addEventListener('change', apply);
    document.getElementById('btn-visit-print')?.addEventListener('click', () => window.print());
    document.getElementById('btn-visit-pdf')?.addEventListener('click', () => this.exportVisitPDF());
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.quick);
        this.periodStart = JJData.localDateStr(-(days - 1));
        this.periodEnd = JJData.TODAY_STR;
        document.getElementById('visit-start').value = this.periodStart;
        document.getElementById('visit-end').value = this.periodEnd;
        document.querySelectorAll('.quick-btn').forEach(b => b.classList.toggle('active', b === btn));
        this.renderPeriodContent();
      });
    });
  },

  renderPlaceholder() {
    return `<div class="card text-center text-slate-500 py-10 text-[13px]">正在整理就诊数据…</div>`;
  },

  renderPeriodContent() {
    const container = document.getElementById('visit-content');
    const entries = JJData.getEntriesInRange(this.periodStart, this.periodEnd);
    if (entries.length === 0) {
      container.innerHTML = `<div class="card text-center text-slate-500 py-10">该时段内暂无记录，请先在"健康记录"中录入</div>`;
      return;
    }
    const visitCard = this.buildVisitCard(entries);
    this.visitCard = visitCard;
    container.innerHTML = `
      <div id="visit-print-area" class="space-y-5">
        ${this.renderSummary(entries, visitCard)}
        ${this.renderTimeline(entries)}
        ${this.renderEditableCard(visitCard)}
      </div>
    `;
    this.bindEditableCard();
    if (window.lucide) { window.lucide.createIcons(); }
  },

  buildVisitCard(entries) {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const stats = {
      systolic: JJData.calcStats(sorted.map(e => e.systolic)),
      diastolic: JJData.calcStats(sorted.map(e => e.diastolic)),
      heart_rate: JJData.calcStats(sorted.map(e => e.heart_rate)),
      sleep_hours: JJData.calcStats(sorted.map(e => e.sleep_hours)),
    };
    const discomforts = sorted.filter(e => e.discomfort).map(e => `${e.date}: ${e.discomfort}`);
    // 关键事件：血压飙升日 + 不适日 + 数据缺口日
    const keyEvents = [];
    sorted.forEach(e => {
      if (e.systolic && e.systolic >= 140) keyEvents.push({ date: e.date, type: 'bp_high', text: `血压 ${e.systolic}/${e.diastolic}mmHg（偏高）` });
      if (e.discomfort) keyEvents.push({ date: e.date, type: 'discomfort', text: e.discomfort });
      if (e.systolic == null && e.sleep_hours == null && e.notes) keyEvents.push({ date: e.date, type: 'gap', text: '当日未测量' });
    });
    let chiefComplaint = '';
    const bpJump = this.findBPSpike(sorted);
    if (bpJump) chiefComplaint = `期间血压有波动（${bpJump.date} 收缩压 ${bpJump.systolic}mmHg，较前一天升高 ${bpJump.diff}mmHg），`;
    if (discomforts.length > 0) {
      chiefComplaint += `期间有不适（${discomforts.slice(0,2).join('；')}）。希望了解原因及是否需要调整。`;
    } else {
      chiefComplaint = `定期健康监测，无明显不适。希望了解近期数据整体情况及后续建议。`;
    }
    const defaultQuestions = [
      '近期数据是否在正常范围内？',
      '血压波动需要关注吗？',
      '日常饮食和运动有什么建议？',
    ];
    const saved = JJData.getVisitCard();
    return {
      ...saved,
      period_start: this.periodStart,
      period_end: this.periodEnd,
      chief_complaint: chiefComplaint,
      medications: saved.medications || '',
      allergies: saved.allergies || '',
      questions: saved.questions?.length > 0 ? saved.questions : defaultQuestions,
      summary_stats: stats,
      discomfort_events: discomforts,
      key_events: keyEvents,
    };
  },

  findBPSpike(entries) {
    const sorted = entries.filter(e => e.systolic).sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const diff = sorted[i].systolic - sorted[i-1].systolic;
      if (Math.abs(diff) >= 15) return { date: sorted[i].date, systolic: sorted[i].systolic, diff };
    }
    return null;
  },

  renderSummary(entries, visitCard) {
    const s = visitCard.summary_stats;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const totalDays = sorted.length;
    const days = (new Date(this.periodEnd) - new Date(this.periodStart)) / 86400000 + 1;
    const bpMax = sorted.reduce((m, e) => (e.systolic && (!m || e.systolic > m.systolic) ? e : m), null);
    const lowSleep = sorted.filter(e => e.sleep_hours != null && e.sleep_hours < 6.5).length;
    const abnormalBp = sorted.filter(e => e.systolic > 140).length;

    const cards = [
      { label: '记录天数',   value: `${totalDays}`, unit: `/ ${Math.round(days)} 天`, detail: `覆盖率 ${Math.round(totalDays / days * 100)}%` },
      { label: '收缩压均值', value: s.systolic.mean ?? '—', unit: 'mmHg', detail: bpMax ? `最高 ${bpMax.systolic}（${bpMax.date.slice(5)}）` : '', risk: (s.systolic.mean ?? 0) > 140 },
      { label: '舒张压均值', value: s.diastolic.mean ?? '—', unit: 'mmHg' },
      { label: '心率均值',   value: s.heart_rate.mean ?? '—', unit: '次/分' },
      { label: '睡眠均值',   value: s.sleep_hours.mean ?? '—', unit: '小时', detail: lowSleep > 0 ? `${lowSleep} 天不足 6.5h` : '' },
      { label: '异常天数',   value: `${abnormalBp}`, unit: '天', detail: '收缩压 > 140', risk: abnormalBp > 0 },
    ];
    return `
      <div class="card">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 class="card-title">
            <i data-lucide="clipboard-list" class="w-4 h-4 text-slate-400"></i>记录概况
          </h3>
          <span class="badge badge-slate font-mono">${this.periodStart} → ${this.periodEnd}</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          ${cards.map(c => `
            <div class="rounded-[10px] px-3 py-3" style="background:#fafbfd;border:1px solid var(--border);">
              <div class="text-[11px] text-slate-500 font-medium">${c.label}</div>
              <div class="flex items-baseline mt-1.5">
                <span class="text-[20px] font-semibold leading-none tracking-tight" style="color:${c.risk ? '#b42318' : '#101828'};font-variant-numeric:tabular-nums;">${c.value}</span>
                <span class="text-[10.5px] text-slate-400 ml-1 whitespace-nowrap">${c.unit}</span>
              </div>
              ${c.detail ? `<div class="text-[10.5px] text-slate-400 mt-1 truncate" title="${c.detail}">${c.detail}</div>` : `<div class="text-[10.5px] mt-1">&nbsp;</div>`}
            </div>
          `).join('')}
        </div>

        <!-- 医生速览摘要 -->
        <div class="mt-4 p-3.5 rounded-[10px]" style="background:#f2f7fd;border:1px solid #e4eefa;">
          <div class="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <i data-lucide="stethoscope" class="w-3.5 h-3.5" style="color:#2d5791"></i>医生速览摘要
          </div>
          <p class="text-[12.5px] text-slate-700 leading-relaxed">
            本周期共 <strong>${totalDays}</strong> 天有记录（覆盖 ${Math.round(days)} 天中的 ${Math.round(totalDays/days*100)}%）；
            收缩压均值 <strong>${s.systolic.mean ?? '—'}</strong> mmHg，最高 <strong>${bpMax?.systolic ?? '—'}</strong> mmHg（${bpMax?.date.slice(5) ?? ''}），
            其中 <strong>${abnormalBp}</strong> 天超过 140；
            睡眠均值 <strong>${s.sleep_hours.mean ?? '—'}</strong> 小时${lowSleep > 0 ? `，<strong>${lowSleep}</strong> 天不足 6.5 小时` : ''}；
            ${visitCard.discomfort_events?.length > 0 ? `期间记录不适 <strong>${visitCard.discomfort_events.length}</strong> 次。` : '期间无明显不适记录。'}
          </p>
        </div>

        ${visitCard.discomfort_events?.length > 0 ? `
          <div class="mt-2.5 p-3 rounded-[10px] flex items-start gap-2" style="background:#fef3f2;border:1px solid #fecdca;">
            <i data-lucide="alert-triangle" class="w-3.5 h-3.5 shrink-0 mt-0.5" style="color:#d92d20"></i>
            <div>
              <span class="text-[11px] font-semibold" style="color:#912018;">期间不适事件：</span>
              <span class="text-[12.5px]" style="color:#7a271a;">${visitCard.discomfort_events.join('；')}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderTimeline(entries) {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const items = sorted.map(e => {
      const parts = [];
      if (e.systolic) parts.push(`${e.systolic}/${e.diastolic} mmHg`);
      if (e.heart_rate) parts.push(`心率 ${e.heart_rate}`);
      if (e.sleep_hours) parts.push(`睡 ${e.sleep_hours}h`);
      if (e.activity_min) parts.push(`活动 ${e.activity_min}min`);
      if (e.blood_glucose) parts.push(`血糖 ${e.blood_glucose}`);
      const isAbnormal = (e.systolic && e.systolic > 140) || (e.discomfort);
      return `
        <div class="flex gap-3 items-start py-2.5 px-1 rounded-lg hover:bg-slate-50 transition-colors">
          <span class="w-20 text-xs font-mono text-slate-500 shrink-0 pt-1">${e.date.slice(5)}</span>
          <i data-lucide="${isAbnormal ? 'circle-alert' : 'circle-check-big'}" class="w-4 h-4 mt-1 shrink-0 ${isAbnormal ? 'text-rose-500' : 'text-teal-500'}"></i>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-slate-700">${parts.join(' · ') || '—'}</div>
            ${e.discomfort ? `<div class="text-xs text-rose-600 mt-0.5 flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i>${e.discomfort}</div>` : ''}
            ${e.notes ? `<div class="text-xs text-slate-400 mt-0.5">备注：${e.notes}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    return `
      <div class="card">
        <h3 class="card-title mb-3">
          <i data-lucide="calendar-days" class="w-4 h-4 text-slate-400"></i>就诊时间线
          <span class="text-[11px] text-slate-400 font-normal ml-1">${entries.length} 条记录</span>
        </h3>
        <div class="pl-2" style="border-left:2px solid #f0f3f8;">${items}</div>
      </div>
    `;
  },

  renderEditableCard(card) {
    const questions = card.questions || [];
    const keyEvents = card.key_events || [];
    const eventIcon = { bp_high: 'heart-pulse', discomfort: 'alert-triangle', gap: 'calendar-off' };
    const eventColor = { bp_high: 'rose', discomfort: 'amber', gap: 'slate' };
    return `
      <div class="card relative overflow-hidden">
        <!-- 可编辑提示横幅 -->
        <div class="rounded-[10px] p-3 mb-4 flex items-start gap-2 relative" style="background:#fffaeb;border:1px solid #fedf89;">
          <i data-lucide="edit-3" class="w-3.5 h-3.5 shrink-0 mt-0.5" style="color:#dc6803"></i>
          <p class="text-[12px]" style="color:#93370d;">以下内容由健康记录<strong>自动整理</strong>生成，<strong>所有字段均可直接编辑</strong>，核对无误后点击「保存修改」。</p>
        </div>
        <div class="flex items-center justify-between gap-3 mb-5 relative flex-wrap">
          <h3 class="card-title text-[14px]">
            <i data-lucide="stethoscope" class="w-[17px] h-[17px]" style="color:#2d5791"></i>就诊自述卡
            <span class="text-[11px] text-slate-400 font-normal">可编辑</span>
          </h3>
          <button id="btn-save-card" class="btn-secondary">
            <i data-lucide="save" class="w-3.5 h-3.5"></i>保存修改
          </button>
        </div>

        <div class="space-y-4 relative">
          <!-- 关键事件（自动标注，只读展示） -->
          ${keyEvents.length > 0 ? `
            <div>
              <label class="field-label flex items-center gap-1.5">
                <i data-lucide="flag" class="w-3.5 h-3.5 text-slate-500"></i>关键事件（自动标注）
              </label>
              <div class="flex flex-wrap gap-2">
                ${keyEvents.map(ev => `
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-${eventColor[ev.type]}-50 border border-${eventColor[ev.type]}-200 text-xs text-${eventColor[ev.type]}-700">
                    <i data-lucide="${eventIcon[ev.type]}" class="w-3 h-3"></i>${ev.date.slice(5)} ${ev.text}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div>
            <label class="field-label">主诉 / 主要诉求</label>
            <textarea id="card-chief" rows="2" class="field-input">${card.chief_complaint || ''}</textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="field-label flex items-center gap-1.5">
                <i data-lucide="pill" class="w-3.5 h-3.5 text-slate-500"></i>既往用药
              </label>
              <textarea id="card-meds" rows="2" class="field-input">${card.medications || ''}</textarea>
            </div>
            <div>
              <label class="field-label flex items-center gap-1.5">
                <i data-lucide="ban" class="w-3.5 h-3.5 text-slate-500"></i>过敏史
              </label>
              <input id="card-allergies" type="text" class="field-input" value="${card.allergies || ''}" placeholder="如：青霉素过敏" />
            </div>
          </div>

          <div>
            <label class="field-label flex items-center gap-1.5">
              <i data-lucide="help-circle" class="w-3.5 h-3.5 text-slate-500"></i>准备问医生的问题
            </label>
            <div id="questions-list" class="space-y-2">
              ${questions.map((q, i) => `
                <div class="flex gap-2 items-center">
                  <span class="text-xs text-slate-400 font-mono w-5 text-right">${i+1}.</span>
                  <input type="text" class="field-input flex-1 question-input" data-idx="${i}" value="${q}" />
                  <button class="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-colors" data-del-q="${i}">
                    <i data-lucide="x" class="w-4 h-4"></i>
                  </button>
                </div>
              `).join('')}
            </div>
            <button id="btn-add-q" class="mt-2 text-sm text-teal-600 hover:text-teal-700 inline-flex items-center gap-1">
              <i data-lucide="plus" class="w-4 h-4"></i>添加问题
            </button>
          </div>

          <div class="pt-3 border-t border-slate-200 text-xs text-slate-400 flex items-center gap-1.5">
            <i data-lucide="info" class="w-3.5 h-3.5"></i>
            数据来源：${this.periodStart} ~ ${this.periodEnd} 的健康记录 · 可打印后就诊时携带
          </div>
        </div>
      </div>
    `;
  },

  bindEditableCard() {
    document.getElementById('btn-save-card')?.addEventListener('click', () => {
      const chief = document.getElementById('card-chief').value;
      const meds = document.getElementById('card-meds').value;
      const allergies = document.getElementById('card-allergies').value;
      const questions = Array.from(document.querySelectorAll('.question-input')).map(i => i.value).filter(v => v.trim());
      JJData.saveVisitCard({ chief_complaint: chief, medications: meds, allergies, questions });
      showToast('✓ 就诊卡已保存');
    });

    document.getElementById('btn-add-q')?.addEventListener('click', () => {
      const questionsDiv = document.getElementById('questions-list');
      const idx = questionsDiv.children.length;
      const div = document.createElement('div');
      div.className = 'flex gap-2 items-center';
      div.innerHTML = `
        <span class="text-xs text-slate-400 font-mono w-5 text-right">${idx+1}.</span>
        <input type="text" class="field-input flex-1 question-input" data-idx="${idx}" placeholder="新增问题..." />
        <button class="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5"><i data-lucide="x" class="w-4 h-4"></i></button>
      `;
      questionsDiv.appendChild(div);
      if (window.lucide) { window.lucide.createIcons(); }
    });

    document.querySelectorAll('[data-del-q]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.flex').remove();
      });
    });
  },

  // ========== 导出 PDF ==========
  async _loadPDFLibs() {
    if (window.html2canvas && window.jspdf) return;
    const load = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`加载失败: ${src}`));
      document.head.appendChild(s);
    });
    await Promise.all([
      load('vendor/html2canvas.min.js'),
      load('vendor/jspdf.umd.min.js'),
    ]);
  },

  async exportVisitPDF() {
    const area = document.getElementById('visit-print-area');
    if (!area) {
      showToast('请先生成就诊卡');
      return;
    }
    const btn = document.getElementById('btn-visit-pdf');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>导出中…'; if (window.lucide) window.lucide.createIcons(); }

    try {
      showToast('正在生成 PDF…');
      await this._loadPDFLibs();

      // 先保存当前编辑内容到 DOM（把输入框的值固化到属性，避免 html2canvas 遗漏）
      area.querySelectorAll('input, textarea').forEach(el => {
        if (el.value != null) el.setAttribute('value', el.value);
      });

      const canvas = await html2canvas(area, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageW = pdf.internal.pageSize.getWidth();   // 210mm
      const pageH = pdf.internal.pageSize.getHeight();  // 297mm
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      // 多页处理：将长图按页高切片
      let heightLeft = imgH;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
      heightLeft -= (pageH - margin * 2);

      while (heightLeft > 0) {
        position = margin - (imgH - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
        heightLeft -= (pageH - margin * 2);
      }

      const filename = `健迹_就诊卡_${JJData.TODAY_STR}.pdf`;
      pdf.save(filename);
      showToast(`✓ 已导出 ${filename}`);
    } catch (e) {
      console.error('PDF导出失败:', e);
      showToast('PDF 导出失败：' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="file-down" class="w-4 h-4"></i>导出 PDF'; if (window.lucide) window.lucide.createIcons(); }
    }
  }
};

window.JJVisit = JJVisit;
