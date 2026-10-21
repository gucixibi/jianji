/**
 * 健迹 - 概览首页
 * 价值主张 + 三层架构 + 就诊CTA + 近7天指标 + 最近记录/快速操作
 */

const JJOverview = {
  render(container) {
    const entries = JJData.getAllEntries();
    const today = JJData.TODAY_STR;
    const todayEntry = entries.find(e => e.date === today);
    const range7 = JJData.getRecentEntries(7);

    container.innerHTML = `
      <div class="space-y-5">
        ${this.renderHero(todayEntry)}
        ${this.renderPipeline()}
        ${this.renderVisitCTA(range7)}
        ${this.renderInsight(range7, todayEntry)}
        ${this.renderStatCards(range7)}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div class="lg:col-span-2">${this.renderRecentFeed(entries.slice(0, 7))}</div>
          <div class="space-y-5">
            ${this.renderQuickActions()}
            ${this.renderReminder(range7)}
          </div>
        </div>
      </div>
    `;
  },

  // 今日洞察：基于近7天数据动态生成一句话建议
  renderInsight(range7, todayEntry) {
    let icon = 'sparkles', color = 'teal', text = '';
    if (range7.length === 0) {
      icon = 'circle-alert'; color = 'amber';
      text = '暂无健康记录，点击「健康记录」开始你的第一次测量，AI 才能帮你整理。';
    } else if (!todayEntry) {
      icon = 'calendar-clock'; color = 'amber';
      text = `你今天还没有记录健康数据，近7天已记录 ${range7.length} 天，建议现在测量血压和心率，保持记录连续。`;
    } else {
      const bpHigh = range7.filter(e => e.systolic > 140);
      const discomforts = range7.filter(e => e.discomfort);
      const lowSleep = range7.filter(e => e.sleep_hours != null && e.sleep_hours < 6.5);
      if (bpHigh.length > 0) {
        const maxBp = range7.reduce((m, e) => (e.systolic && (!m || e.systolic > m.systolic) ? e : m), null);
        icon = 'heart-pulse'; color = 'rose';
        text = `近7天有 ${bpHigh.length} 天收缩压偏高${maxBp ? `（最高 ${maxBp.systolic}，${maxBp.date.slice(5)}）` : ''}，建议记录今日数据并观察变化，必要时生成就诊卡。`;
      } else if (discomforts.length > 0) {
        icon = 'alert-triangle'; color = 'amber';
        text = `近7天记录了 ${discomforts.length} 次不适（${discomforts[0].discomfort}），可在「就诊准备」中整理后与医生沟通。`;
      } else if (lowSleep.length >= 2) {
        icon = 'moon'; color = 'indigo';
        text = `近7天有 ${lowSleep.length} 天睡眠不足 6.5 小时，充足睡眠有助于血压稳定，建议调整作息。`;
      } else {
        icon = 'thumbs-up'; color = 'teal';
        text = '近7天各项指标整体平稳，继续保持规律记录，数据将自动整理到就诊卡。';
      }
    }
    return `
      <div class="card border-${color}-200 bg-${color}-50/60">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-lg bg-${color}-100 flex items-center justify-center shrink-0">
            <i data-lucide="${icon}" class="w-5 h-5 text-${color}-600"></i>
          </div>
          <div class="flex-1">
            <div class="text-xs font-semibold text-${color}-700 mb-0.5 flex items-center gap-1">
              <i data-lucide="lightbulb" class="w-3 h-3"></i>今日洞察
            </div>
            <p class="text-sm text-slate-700 leading-relaxed">${text}</p>
          </div>
        </div>
      </div>
    `;
  },

  // 价值主张 Hero
  renderHero(todayEntry) {
    const hour = new Date().getHours();
    const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
    const hasToday = !!todayEntry;
    const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    return `
      <div class="card bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white border-0 relative overflow-hidden">
        <div class="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10"></div>
        <div class="absolute right-16 top-20 w-28 h-28 rounded-full bg-white/5"></div>
        <div class="relative">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div class="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1 text-xs font-medium mb-2">
                <i data-lucide="heart-pulse" class="w-3.5 h-3.5"></i> 个人健康数据整理助手
              </div>
              <h2 class="text-2xl font-bold tracking-tight">${greeting}</h2>
              <p class="text-teal-50 mt-2 text-base max-w-lg leading-relaxed">
                把分散的血压、睡眠、用药记录，<strong class="text-white">自动整理成医生看得懂的就诊备忘</strong>。
              </p>
            </div>
            <div class="flex items-center gap-2 bg-white/15 backdrop-blur rounded-xl px-4 py-2.5">
              <i data-lucide="${hasToday ? 'check-circle-2' : 'circle-dot'}" class="w-5 h-5 ${hasToday ? 'text-teal-100' : 'text-amber-200'}"></i>
              <div class="text-sm">
                <div class="font-semibold">${hasToday ? '今日已记录' : '今日未记录'}</div>
                <div class="text-teal-100 text-xs">${dateStr}</div>
              </div>
              ${!hasToday ? `<button onclick="JJApp.navigate('record')" class="ml-2 text-xs bg-white text-teal-700 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors">去记录</button>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 三层架构可视化
  renderPipeline() {
    const steps = [
      { icon: 'sparkles', title: 'AI 辅助录入', desc: '文字描述 / 拍照 OCR，自动提取血压、睡眠等字段', color: 'indigo' },
      { icon: 'line-chart', title: '规则统计整理', desc: '本地计算均值、波动、异常，不联网', color: 'teal' },
      { icon: 'stethoscope', title: '人工核对确认', desc: '每条数据可追溯原文，就诊卡可编辑后打印', color: 'rose' },
    ];
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <i data-lucide="workflow" class="w-4 h-4 text-teal-600"></i>健迹如何工作
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
          ${steps.map((s, i) => `
            <div class="relative bg-${s.color}-50 border border-${s.color}-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <i data-lucide="${s.icon}" class="w-5 h-5 text-${s.color}-600"></i>
                </div>
                <div>
                  <div class="text-xs font-bold text-${s.color}-400">STEP ${i + 1}</div>
                  <div class="font-semibold text-slate-800 text-sm">${s.title}</div>
                </div>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed">${s.desc}</p>
            </div>
          `).join('')}
        </div>
        <div class="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-teal-500"></i>
          所有数据与处理均在本地完成，不上传服务器
        </div>
      </div>
    `;
  },

  // 就诊准备 CTA
  renderVisitCTA(range7) {
    const abnormal = range7.find(e => (e.systolic && e.systolic > 140) || e.discomfort);
    const hasGap = range7.length < 7;
    const hint = abnormal
      ? `检测到近期异常：${abnormal.discomfort || '血压偏高'}，建议整理就诊备忘`
      : hasGap
        ? '近7天有数据缺口，就诊前可一并补充'
        : '近7天数据平稳，可生成就诊备忘定期随访';
    return `
      <div class="card border-rose-200 bg-gradient-to-br from-rose-50 to-white relative overflow-hidden">
        <div class="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-rose-100/60"></div>
        <div class="flex items-center justify-between gap-4 flex-wrap relative">
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
              <i data-lucide="stethoscope" class="w-6 h-6 text-white"></i>
            </div>
            <div>
              <h3 class="font-semibold text-slate-800">就诊准备 · 一键生成可打印就诊卡</h3>
              <p class="text-sm text-slate-500 mt-0.5">${hint}</p>
            </div>
          </div>
          <button onclick="JJApp.navigate('visit')" class="btn-primary bg-rose-600 hover:bg-rose-700 shadow-rose-200">
            <i data-lucide="file-text" class="w-4 h-4"></i>生成就诊卡
          </button>
        </div>
      </div>
    `;
  },

  renderStatCards(range) {
    const days = 7;
    const cards = [
      { icon: 'heart-pulse', label: '收缩压均值', unit: 'mmHg', stat: JJData.calcStats(range.map(e => e.systolic)), color: 'rose',    alert: v => v && v > 135 },
      { icon: 'heart',       label: '舒张压均值', unit: 'mmHg', stat: JJData.calcStats(range.map(e => e.diastolic)), color: 'orange', alert: v => v && v > 85 },
      { icon: 'activity',    label: '心率均值',   unit: '次/分', stat: JJData.calcStats(range.map(e => e.heart_rate)), color: 'indigo' },
      { icon: 'moon',        label: '睡眠均值',   unit: '小时',  stat: JJData.calcStats(range.map(e => e.sleep_hours)), color: 'teal', alert: v => v && v < 6.5 },
    ];

    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${cards.map(c => {
          const isAlert = c.alert && c.alert(c.stat.mean);
          return `
            <div class="card ${isAlert ? 'border-rose-300 bg-rose-50/40' : ''}">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500 font-medium">${c.label}</span>
                <i data-lucide="${c.icon}" class="w-4 h-4 ${isAlert ? 'text-rose-500' : `text-${c.color}-500`}"></i>
              </div>
              <div class="text-2xl font-bold mt-1.5 ${isAlert ? 'text-rose-700' : 'text-slate-700'}">${c.stat.mean ?? '—'}</div>
              <div class="text-xs text-slate-400 mt-1">${c.unit} · ${c.stat.count}/${days}天</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderReminder(range) {
    const days = 7;
    const gaps = days - range.length;
    if (gaps <= 0) {
      return `
        <div class="card border-teal-200 bg-teal-50/50 flex items-start gap-3">
          <i data-lucide="check-circle-2" class="w-5 h-5 text-teal-600 shrink-0 mt-0.5"></i>
          <p class="text-sm text-teal-800">近 ${days} 天记录完整，继续保持！</p>
        </div>
      `;
    }
    return `
      <div class="card border-amber-200 bg-amber-50/50">
        <div class="flex items-start gap-3">
          <i data-lucide="alert-circle" class="w-5 h-5 text-amber-600 shrink-0 mt-0.5"></i>
          <div class="flex-1">
            <p class="text-sm text-amber-800">近 ${days} 天有 <strong class="text-amber-700">${gaps} 天</strong>未记录</p>
            <div class="flex gap-2 mt-2.5">
              <button onclick="JJApp.navigate('record')" class="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">去补录</button>
              <button onclick="JJApp.navigate('trend')" class="text-xs bg-white text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">看趋势</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderQuickActions() {
    const actions = [
      { icon: 'pencil',      label: '手动录入', color: 'teal',    onclick: "JJApp.navigate('record')" },
      { icon: 'sparkles',    label: 'AI 提取',  color: 'indigo',  onclick: "JJApp.navigate('record'); setTimeout(()=>document.querySelector('[data-tab=ai]').click(),10)" },
      { icon: 'camera',      label: '图片 OCR', color: 'violet',  onclick: "JJApp.navigate('record'); setTimeout(()=>document.querySelector('[data-tab=ocr]').click(),10)" },
      { icon: 'line-chart',  label: '趋势回顾', color: 'emerald', onclick: "JJApp.navigate('trend')" },
    ];
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <i data-lucide="zap" class="w-5 h-5 text-teal-600"></i>快速操作
        </h3>
        <div class="grid grid-cols-2 gap-3">
          ${actions.map(a => `
            <button onclick="${a.onclick}" class="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-${a.color}-50 hover:bg-${a.color}-100 transition-all duration-150 hover:scale-[1.03]">
              <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                <i data-lucide="${a.icon}" class="w-5 h-5 text-${a.color}-600"></i>
              </div>
              <span class="text-xs font-medium text-${a.color}-700">${a.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderRecentFeed(recent) {
    if (recent.length === 0) {
      return `<div class="card text-center text-slate-500 py-10">还没有记录，点击右侧"快速操作"开始吧</div>`;
    }
    const srcIconMap = { manual: 'pencil', ai_text: 'sparkles', ocr: 'camera', demo: 'file-text' };
    const srcColorMap = { manual: 'text-slate-400', ai_text: 'text-indigo-400', ocr: 'text-violet-400', demo: 'text-slate-300' };
    const items = recent.map(e => {
      const parts = [];
      if (e.systolic) parts.push(`${e.systolic}/${e.diastolic}`);
      if (e.heart_rate) parts.push(`HR ${e.heart_rate}`);
      if (e.sleep_hours) parts.push(`${e.sleep_hours}h`);
      if (e.blood_glucose) parts.push(`血糖 ${e.blood_glucose}`);
      const isAbnormal = (e.systolic && e.systolic > 140) || e.discomfort;
      return `
        <div class="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
          <span class="w-2 h-2 rounded-full shrink-0 ${isAbnormal ? 'bg-rose-500' : 'bg-teal-400'}"></span>
          <span class="text-xs font-mono text-slate-400 w-14 shrink-0">${e.date.slice(5)}</span>
          <span class="text-sm text-slate-700 flex-1">${parts.join(' · ') || '(无数据)'}</span>
          ${e.discomfort ? `<span title="${e.discomfort}"><i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-500"></i></span>` : ''}
          <i data-lucide="${srcIconMap[e.input_source] || 'circle'}" class="w-3.5 h-3.5 ${srcColorMap[e.input_source] || 'text-slate-400'}"></i>
        </div>
      `;
    }).join('');

    return `
      <div class="card h-full">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-slate-800 flex items-center gap-2">
            <i data-lucide="list" class="w-4 h-4 text-slate-500"></i>最近记录
          </h3>
          <button onclick="JJApp.navigate('record')" class="text-xs text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1">查看全部 <i data-lucide="chevron-right" class="w-3 h-3"></i></button>
        </div>
        ${items}
      </div>
    `;
  }
};

window.JJOverview = JJOverview;
