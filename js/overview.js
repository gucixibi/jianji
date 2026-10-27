/**
 * 健迹 - 概览首页
 * 结构：Hero → 近7天指标 → 洞察/最近记录 + 就诊CTA/快速操作 → 工作流程
 */

const JJOverview = {
  render(container) {
    const entries = JJData.getAllEntries();

    // 空数据引导
    if (entries.length === 0) {
      container.innerHTML = `
        <div class="page-gap fade-in">
          ${this.renderHeaderLite()}
          ${JJApp.renderEmptyState('首页概览')}
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const today = JJData.TODAY_STR;
    const todayEntry = entries.find(e => e.date === today);
    const range7 = JJData.getRecentEntries(7);

    container.innerHTML = `
      <div class="page-gap fade-in">
        ${this.renderHero(todayEntry)}
        ${this.renderStatCards(range7)}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-[18px] items-start">
          <div class="lg:col-span-2 space-y-[18px]">
            ${this.renderInsight(range7, todayEntry)}
            ${this.renderRecentFeed(entries.slice(0, 6))}
          </div>
          <div class="space-y-[18px]">
            ${this.renderVisitCTA(range7)}
            ${this.renderQuickActions()}
            ${this.renderReminder(range7)}
          </div>
        </div>
        ${this.renderPipeline()}
      </div>
    `;
  },

  /* ---------- 空状态下的简化标题 ---------- */
  renderHeaderLite() {
    return `
      <div class="px-0.5">
        <h2 class="page-title flex items-center gap-2">
          <i data-lucide="layout-dashboard" class="w-[18px] h-[18px]" style="color:#2d5791"></i>首页概览
        </h2>
        <p class="page-sub">把分散的健康记录整理成医生看得懂的就诊备忘。</p>
      </div>
    `;
  },

  /* ---------- Hero ---------- */
  renderHero(todayEntry) {
    const hour = new Date().getHours();
    const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
    const hasToday = !!todayEntry;
    const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    return `
      <div class="relative overflow-hidden rounded-[16px] p-6 md:px-7 md:py-6 text-white"
           style="background: linear-gradient(118deg,#24446f 0%,#2d5791 45%,#457cba 100%); box-shadow: 0 10px 30px -14px rgba(29,58,92,0.6);">
        <div class="absolute rounded-full" style="right:-56px; top:-64px; width:220px; height:220px; background:rgba(255,255,255,0.07);"></div>
        <div class="absolute rounded-full" style="right:88px; bottom:-70px; width:160px; height:160px; background:rgba(255,255,255,0.05);"></div>
        <div class="relative flex items-start justify-between gap-6 flex-wrap">
          <div class="min-w-0">
            <div class="text-[11px] font-medium tracking-wide" style="color:rgba(255,255,255,0.62);">${dateStr}</div>
            <h2 class="text-[22px] md:text-[25px] font-semibold tracking-tight mt-1.5">${greeting}</h2>
            <p class="text-[13.5px] mt-2 max-w-[430px] leading-relaxed" style="color:rgba(255,255,255,0.78);">
              把分散的血压、睡眠、用药记录，自动整理成<strong class="font-semibold text-white">医生看得懂的就诊备忘</strong>。
            </p>
          </div>
          <div class="flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 shrink-0"
               style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.16);">
            <i data-lucide="${hasToday ? 'check-circle-2' : 'circle-dashed'}" class="w-[18px] h-[18px]" style="color:${hasToday ? '#a7f3d0' : '#fcd34d'}"></i>
            <div class="leading-tight">
              <div class="text-[13px] font-medium">${hasToday ? '今日已记录' : '今日未记录'}</div>
              <div class="text-[11px] mt-0.5" style="color:rgba(255,255,255,0.6);">${hasToday ? '数据已同步到就诊卡' : '花 30 秒补一条记录'}</div>
            </div>
            ${!hasToday ? `<button onclick="JJApp.navigate('record')" class="ml-1 text-[12px] font-medium px-2.5 py-1.5 rounded-lg transition-colors" style="background:#fff;color:#24446f;">去记录</button>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  /* ---------- 近7天指标 ---------- */
  renderStatCards(range) {
    const days = 7;
    const cards = [
      { icon: 'heart-pulse', label: '收缩压均值', unit: 'mmHg',  stat: JJData.calcStats(range.map(e => e.systolic)),    alert: v => v && v > 135, tone: '#b42318' },
      { icon: 'heart',       label: '舒张压均值', unit: 'mmHg',  stat: JJData.calcStats(range.map(e => e.diastolic)),   alert: v => v && v > 85,  tone: '#b54708' },
      { icon: 'activity',    label: '心率均值',   unit: '次/分', stat: JJData.calcStats(range.map(e => e.heart_rate)),  alert: null,              tone: '#2d5791' },
      { icon: 'moon',        label: '睡眠均值',   unit: '小时',  stat: JJData.calcStats(range.map(e => e.sleep_hours)), alert: v => v && v < 6.5, tone: '#475467' },
    ];

    return `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
        ${cards.map(c => {
          const isAlert = c.alert && c.alert(c.stat.mean);
          const value = c.stat.mean ?? '—';
          return `
            <div class="card card-hoverable" style="${isAlert ? 'border-color:#fecdca;background:#fffafa;' : ''}">
              <div class="flex items-center justify-between">
                <span class="metric-label">${c.label}</span>
                <i data-lucide="${c.icon}" class="w-4 h-4" style="color:${isAlert ? '#f04438' : '#c3cbd8'}"></i>
              </div>
              <div class="flex items-baseline mt-3">
                <span class="metric" style="color:${isAlert ? '#b42318' : '#101828'}">${value}</span>
                <span class="metric-unit">${c.unit}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-2">
                ${isAlert
                  ? `<span class="badge" style="background:#fef3f2;color:#b42318;">需关注</span>`
                  : `<span class="w-1.5 h-1.5 rounded-full" style="background:${c.tone};opacity:.35;"></span>`}
                <span class="text-[11px] text-slate-400">近 ${days} 天 · ${c.stat.count}/${days} 天有记录</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /* ---------- 今日洞察 ---------- */
  renderInsight(range7, todayEntry) {
    let icon = 'sparkles', tone = 'brand', text = '';
    if (range7.length === 0) {
      icon = 'circle-alert'; tone = 'amber';
      text = '暂无健康记录。点击「健康记录」开始第一次测量，AI 才能帮你整理成就诊备忘。';
    } else if (!todayEntry) {
      icon = 'calendar-clock'; tone = 'amber';
      text = `你今天还没有记录，近 7 天已记录 ${range7.length} 天。补一条今天的血压和心率，保持记录连续。`;
    } else {
      const bpHigh = range7.filter(e => e.systolic > 140);
      const discomforts = range7.filter(e => e.discomfort);
      const lowSleep = range7.filter(e => e.sleep_hours != null && e.sleep_hours < 6.5);
      if (bpHigh.length > 0) {
        const maxBp = range7.reduce((m, e) => (e.systolic && (!m || e.systolic > m.systolic) ? e : m), null);
        icon = 'heart-pulse'; tone = 'rose';
        text = `近 7 天有 ${bpHigh.length} 天收缩压偏高${maxBp ? `（最高 ${maxBp.systolic} mmHg，${maxBp.date.slice(5)}）` : ''}，建议记录今日数据并观察变化。`;
      } else if (discomforts.length > 0) {
        icon = 'alert-triangle'; tone = 'amber';
        text = `近 7 天记录了 ${discomforts.length} 次不适（${discomforts[0].discomfort}），可在「就诊准备」中整理后与医生沟通。`;
      } else if (lowSleep.length >= 2) {
        icon = 'moon'; tone = 'brand';
        text = `近 7 天有 ${lowSleep.length} 天睡眠不足 6.5 小时。充足睡眠有助于血压稳定，建议调整作息。`;
      } else {
        icon = 'thumbs-up'; tone = 'emerald';
        text = '近 7 天各项指标整体平稳。继续保持规律记录，数据会自动整理到就诊卡。';
      }
    }
    const tones = {
      rose:    { bg: '#fef3f2', bd: '#fecdca', ic: '#d92d20', tx: '#912018' },
      amber:   { bg: '#fffaeb', bd: '#fedf89', ic: '#dc6803', tx: '#93370d' },
      emerald: { bg: '#ecfdf3', bd: '#abefc6', ic: '#079455', tx: '#085d3a' },
      brand:   { bg: '#f2f7fd', bd: '#c6ddf3', ic: '#2d5791', tx: '#24446f' },
    }[tone];

    return `
      <div class="card" style="background:${tones.bg};border-color:${tones.bd};">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style="background:rgba(255,255,255,0.75);">
            <i data-lucide="${icon}" class="w-[17px] h-[17px]" style="color:${tones.ic}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[11px] font-semibold tracking-[0.06em] uppercase mb-1" style="color:${tones.tx};opacity:.85;">今日洞察</div>
            <p class="text-[13px] text-slate-700 leading-relaxed">${text}</p>
          </div>
        </div>
      </div>
    `;
  },

  /* ---------- 就诊准备 CTA ---------- */
  renderVisitCTA(range7) {
    const abnormal = range7.find(e => (e.systolic && e.systolic > 140) || e.discomfort);
    const hasGap = range7.length < 7;
    const hint = abnormal
      ? `检测到近期异常：${abnormal.discomfort || '血压偏高'}，建议整理后就诊`
      : hasGap
        ? '近 7 天有数据缺口，就诊前可一并补充'
        : '近 7 天数据平稳，可生成就诊备忘定期随访';
    return `
      <div class="card card-hoverable">
        <div class="w-8 h-8 rounded-[9px] flex items-center justify-center mb-3" style="background:#fef3f2;">
          <i data-lucide="stethoscope" class="w-[17px] h-[17px]" style="color:#d92d20"></i>
        </div>
        <h3 class="text-[13.5px] font-semibold text-slate-900">就诊准备</h3>
        <p class="text-[12.5px] text-slate-500 mt-1 leading-relaxed">${hint}</p>
        <button onclick="JJApp.navigate('visit')" class="btn-primary w-full mt-3.5">
          <i data-lucide="file-text" class="w-3.5 h-3.5"></i>生成就诊卡
        </button>
      </div>
    `;
  },

  /* ---------- 快速操作 ---------- */
  renderQuickActions() {
    const actions = [
      { icon: 'pencil',   label: '手动录入', onclick: "JJApp.navigate('record')" },
      { icon: 'sparkles', label: 'AI 提取',  onclick: "JJApp.navigate('record'); setTimeout(()=>document.querySelector('[data-tab=ai]').click(),10)" },
      { icon: 'camera',   label: '图片 OCR', onclick: "JJApp.navigate('record'); setTimeout(()=>document.querySelector('[data-tab=ocr]').click(),10)" },
      { icon: 'line-chart', label: '趋势回顾', onclick: "JJApp.navigate('trend')" },
    ];
    return `
      <div class="card">
        <h3 class="card-title mb-3">快速操作</h3>
        <div class="grid grid-cols-2 gap-2">
          ${actions.map(a => `
            <button onclick="${a.onclick}" class="group flex items-center gap-2 px-2.5 py-2.5 rounded-[10px] transition-colors" style="background:#fafbfd;border:1px solid var(--border);">
              <i data-lucide="${a.icon}" class="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors"></i>
              <span class="text-[12px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">${a.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  /* ---------- 记录提醒 ---------- */
  renderReminder(range) {
    const days = 7;
    const gaps = days - range.length;
    if (gaps <= 0) {
      return `
        <div class="card flex items-start gap-2.5" style="background:#ecfdf3;border-color:#abefc6;">
          <i data-lucide="check-circle-2" class="w-4 h-4 shrink-0 mt-0.5" style="color:#079455"></i>
          <p class="text-[12.5px]" style="color:#085d3a;">近 ${days} 天记录完整，继续保持。</p>
        </div>
      `;
    }
    return `
      <div class="card" style="background:#fffaeb;border-color:#fedf89;">
        <div class="flex items-start gap-2.5">
          <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 mt-0.5" style="color:#dc6803"></i>
          <div class="flex-1 min-w-0">
            <p class="text-[12.5px]" style="color:#93370d;">近 ${days} 天有 <strong>${gaps} 天</strong>未记录</p>
            <div class="flex gap-2 mt-2">
              <button onclick="JJApp.navigate('record')" class="text-[11.5px] font-medium px-2.5 py-1 rounded-md" style="background:#b54708;color:#fff;">去补录</button>
              <button onclick="JJApp.navigate('trend')" class="text-[11.5px] font-medium px-2.5 py-1 rounded-md bg-white" style="color:#93370d;border:1px solid #fedf89;">看趋势</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /* ---------- 工作流程（精简横条） ---------- */
  renderPipeline() {
    const steps = [
      { icon: 'sparkles', title: 'AI 辅助录入', desc: '文字描述或拍照 OCR，自动提取血压、睡眠等字段' },
      { icon: 'line-chart', title: '规则统计整理', desc: '本地计算均值、波动与异常，不上传服务器' },
      { icon: 'stethoscope', title: '人工核对确认', desc: '每个字段可追溯原文，就诊卡可编辑后打印导出' },
    ];
    return `
      <div class="card">
        <div class="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
          <h3 class="card-title">健迹如何工作</h3>
          <span class="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <i data-lucide="shield-check" class="w-3.5 h-3.5" style="color:#079455"></i>数据与处理均在本机完成
          </span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          ${steps.map((s, i) => `
            <div class="flex items-start gap-2.5 px-3 py-3 rounded-[10px]" style="background:#fafbfd;border:1px solid var(--border);">
              <span class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10.5px] font-semibold mt-0.5" style="background:#e4eefa;color:#24446f;">${i + 1}</span>
              <div class="min-w-0">
                <div class="text-[12.5px] font-semibold text-slate-800 flex items-center gap-1.5">
                  <i data-lucide="${s.icon}" class="w-3.5 h-3.5 text-slate-400"></i>${s.title}
                </div>
                <p class="text-[11.5px] text-slate-500 mt-1 leading-relaxed">${s.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /* ---------- 最近记录 ---------- */
  renderRecentFeed(recent) {
    if (recent.length === 0) {
      return `<div class="card text-center text-slate-500 py-10 text-[13px]">还没有记录，点击右侧「快速操作」开始吧</div>`;
    }
    const srcIconMap = { manual: 'pencil', ai_text: 'sparkles', ocr: 'camera', demo: 'file-text' };
    const items = recent.map(e => {
      const parts = [];
      if (e.systolic) parts.push(`${e.systolic}/${e.diastolic}`);
      if (e.heart_rate) parts.push(`HR ${e.heart_rate}`);
      if (e.sleep_hours) parts.push(`${e.sleep_hours}h`);
      if (e.blood_glucose) parts.push(`血糖 ${e.blood_glucose}`);
      const isAbnormal = (e.systolic && e.systolic > 140) || e.discomfort;
      const isEmpty = parts.length === 0;
      const dotColor = isAbnormal ? '#f04438' : isEmpty ? '#d0d5dd' : '#12b76a';
      return `
        <div class="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg transition-colors hover:bg-slate-50" style="border-bottom:1px solid #f2f4f7;">
          <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:${dotColor};"></span>
          <span class="text-[11.5px] font-mono text-slate-400 w-[42px] shrink-0">${e.date.slice(5)}</span>
          <span class="text-[12.5px] text-slate-700 flex-1 truncate">${parts.join(' · ') || '(无数据)'}</span>
          ${e.discomfort ? `<span title="${e.discomfort}"><i data-lucide="alert-triangle" class="w-3.5 h-3.5" style="color:#f79009"></i></span>` : ''}
          <i data-lucide="${srcIconMap[e.input_source] || 'circle'}" class="w-3.5 h-3.5 text-slate-300"></i>
        </div>
      `;
    }).join('');

    return `
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <h3 class="card-title">最近记录</h3>
          <button onclick="JJApp.navigate('record')" class="btn-ghost">
            查看全部<i data-lucide="chevron-right" class="w-3 h-3"></i>
          </button>
        </div>
        ${items}
      </div>
    `;
  }
};

window.JJOverview = JJOverview;
