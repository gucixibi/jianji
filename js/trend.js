/**
 * 健迹 - 趋势回顾模块
 * 7/14/30 天切换、Chart.js 图表、有效样本数、缺失日期、AI 观察草稿
 */

const JJTrend = {
  currentRange: 14,
  currentMetricKey: null,

  render(container) {
    const entries = JJData.getAllEntries();
    if (entries.length === 0) {
      container.innerHTML = `
        <div class="page-gap fade-in">
          ${this.renderHeader()}
          ${JJApp.renderEmptyState('趋势回顾')}
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="page-gap fade-in">
        ${this.renderHeader()}
        ${this.renderRangeSelector()}
        ${this.renderMetricTabs()}
        <div id="trend-charts"></div>
        ${this.renderObservationPanel()}
      </div>
    `;
    this.bindRangeSelector();
    this.bindMetricTabs();
    this.renderAll();
  },

  renderHeader() {
    return `
      <div class="px-0.5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 class="page-title flex items-center gap-2">
            <i data-lucide="trending-up" class="w-[18px] h-[18px]" style="color:#2d5791"></i>趋势回顾
          </h2>
          <p class="page-sub">按时段查看变化，标注有效样本与缺失日期。数据由规则计算，不推断因果。</p>
        </div>
        <div class="flex items-center gap-3 text-[11.5px] text-slate-500 flex-wrap">
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-3 h-3 rounded-sm" style="background:rgba(18,183,106,0.16);border:1px solid rgba(18,183,106,0.45);"></span>正常参考范围
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full" style="background:#d92d20;"></span>偏离正常值
          </span>
        </div>
      </div>
    `;
  },

  renderRangeSelector() {
    return `
      <div class="card">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-[12px] font-medium text-slate-600">回顾周期</span>
            <span class="seg">
              ${[7, 14, 30].map(d => `
                <button data-range="${d}" class="range-btn seg-btn ${this.currentRange === d ? 'active' : ''}">${d} 天</button>
              `).join('')}
            </span>
          </div>
          <span class="text-[11.5px] text-slate-400 font-mono">${this.getRangeStart()} → ${this.getRangeEnd()}</span>
        </div>
      </div>
    `;
  },

  getRangeStart() {
    return JJData.localDateStr(-(this.currentRange - 1));
  },
  getRangeEnd() {
    return JJData.TODAY_STR;
  },

  bindRangeSelector() {
    document.querySelectorAll('.range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentRange = parseInt(btn.dataset.range);
        document.querySelectorAll('.range-btn').forEach(b => b.classList.toggle('active', b === btn));
        this.renderAll();
      });
    });
  },

  renderMetricTabs() {
    const base = 'metric-tab px-3 py-1 rounded-[8px] text-[12.5px] font-medium text-slate-500 transition-all duration-150';
    const active = 'metric-tab px-3 py-1 rounded-[8px] text-[12.5px] font-semibold text-slate-900 transition-all duration-150';
    const activeStyle = 'background:#fff;box-shadow:0 1px 2px rgba(16,24,40,0.08),0 0 0 1px rgba(16,24,40,0.04);';
    return `
      <div class="card">
        <div class="flex flex-wrap items-center gap-[3px] p-[3px] rounded-[10px]" style="background:#f2f4f7;">
          <button data-metric="overview" class="${active}" style="${activeStyle}">
            <i data-lucide="bar-chart-3" class="w-3.5 h-3.5 inline mr-1 align-[-2px]"></i>全部概览
          </button>
          ${JJData.METRIC_CHART_FIELDS.map(m => `
            <button data-metric="${m.key}" class="${base}">${m.label}</button>
          `).join('')}
        </div>
      </div>
    `;
  },

  bindMetricTabs() {
    const base = 'metric-tab px-3 py-1 rounded-[8px] text-[12.5px] font-medium text-slate-500 transition-all duration-150';
    const active = 'metric-tab px-3 py-1 rounded-[8px] text-[12.5px] font-semibold text-slate-900 transition-all duration-150';
    const activeStyle = 'background:#fff;box-shadow:0 1px 2px rgba(16,24,40,0.08),0 0 0 1px rgba(16,24,40,0.04);';
    document.querySelectorAll('.metric-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.metric-tab').forEach(b => {
          b.className = base;
          b.style.cssText = '';
        });
        btn.className = active;
        btn.style.cssText = activeStyle;
        this.currentMetricKey = btn.dataset.metric;
        this.renderAll();
      });
    });
  },

  renderAll() {
    const chartsContainer = document.getElementById('trend-charts');
    const entries = JJData.getRecentEntries(this.currentRange);
    const metric = this.currentMetricKey;

    if (metric === 'overview' || !metric) {
      chartsContainer.innerHTML = this.renderOverviewCharts(entries);
    } else {
      chartsContainer.innerHTML = this.renderSingleMetricChart(entries, metric);
    }
    setTimeout(() => this.initCharts(entries, metric), 50);
    this.renderObservationPanel(entries, metric);
    if (window.lucide) { window.lucide.createIcons(); }
  },

  renderOverviewCharts(entries) {
    if (entries.length === 0) return `<div class="card text-center text-slate-500 py-10">选定时段内暂无记录</div>`;
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        ${JJData.METRIC_CHART_FIELDS.map(m => this.renderMiniChartCard(entries, m)).join('')}
      </div>
      ${this.renderStatsGrid(entries)}
    `;
  },

  renderSingleMetricChart(entries, metricKey) {
    if (entries.length === 0) return `<div class="card text-center text-slate-500 py-10">选定时段内暂无记录</div>`;
    const m = JJData.METRIC_CHART_FIELDS.find(x => x.key === metricKey);
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <i data-lucide="trending-up" class="w-4 h-4" style="color:${m.color}"></i>${m.label} 趋势
        </h3>
        <div class="h-72"><canvas id="chart-main"></canvas></div>
      </div>
      ${this.renderSingleStats(entries, m)}
    `;
  },

  renderMiniChartCard(entries, metric) {
    const stats = JJData.calcStats(entries.map(e => e[metric.key]));
    const coverage = entries.length > 0 ? `${stats.count}/${entries.length}天` : '0/0';
    const hasGap = stats.count < entries.length;
    return `
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-slate-800 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" style="background:${metric.color}"></span>${metric.label}
          </span>
          <div class="flex gap-2 text-xs">
            <span class="badge badge-teal">均值 ${stats.mean ?? '—'}</span>
            ${hasGap ? `<span class="badge badge-amber">${coverage} 有效</span>` : `<span class="badge badge-slate">${coverage}</span>`}
          </div>
        </div>
        <div class="h-40"><canvas id="mini-${metric.key}"></canvas></div>
        ${stats.min != null ? `<div class="text-xs text-slate-500 mt-2">最低 ${stats.min}${metric.unit} · 最高 ${stats.max}${metric.unit}</div>` : ''}
      </div>
    `;
  },

  renderStatsGrid(entries) {
    if (entries.length === 0) return '';
    const allStats = JJData.METRIC_CHART_FIELDS.map(m => ({ ...m, stats: JJData.calcStats(entries.map(e => e[m.key])) }));
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <i data-lucide="clipboard-list" class="w-4 h-4 text-slate-500"></i>时段统计总览（${this.currentRange}天）
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-slate-500">
                <th class="text-left py-2 font-medium">指标</th>
                <th class="text-center py-2 font-medium">有效值均值</th>
                <th class="text-center py-2 font-medium">范围</th>
                <th class="text-center py-2 font-medium">有效覆盖</th>
                <th class="text-center py-2 font-medium">缺口</th>
              </tr>
            </thead>
            <tbody>
              ${allStats.map(m => `
                <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <td class="py-2 font-medium flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" style="background:${m.color}"></span>${m.label}
                  </td>
                  <td class="text-center font-mono">${m.stats.mean ?? '—'}</td>
                  <td class="text-center font-mono">${m.stats.min ?? '—'} ~ ${m.stats.max ?? '—'}</td>
                  <td class="text-center">${m.stats.count}/${entries.length}天</td>
                  <td class="text-center ${entries.length - m.stats.count > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}">${entries.length - m.stats.count > 0 ? `缺 ${entries.length - m.stats.count} 天` : '无'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${this.renderGapDates(entries)}
      </div>
    `;
  },

  renderSingleStats(entries, metric) {
    const stats = JJData.calcStats(entries.map(e => e[metric.key]));
    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card text-center">
          <div class="text-xs text-slate-500 font-medium">均值</div>
          <div class="text-xl font-bold text-teal-700 mt-1">${stats.mean ?? '—'}</div>
          <div class="text-xs text-slate-400">${metric.unit}</div>
        </div>
        <div class="card text-center">
          <div class="text-xs text-slate-500 font-medium">最低</div>
          <div class="text-xl font-bold text-slate-700 mt-1">${stats.min ?? '—'}</div>
          <div class="text-xs text-slate-400">${metric.unit}</div>
        </div>
        <div class="card text-center">
          <div class="text-xs text-slate-500 font-medium">最高</div>
          <div class="text-xl font-bold text-slate-700 mt-1">${stats.max ?? '—'}</div>
          <div class="text-xs text-slate-400">${metric.unit}</div>
        </div>
        <div class="card text-center">
          <div class="text-xs text-slate-500 font-medium">有效样本</div>
          <div class="text-xl font-bold text-teal-700 mt-1">${stats.count}/${entries.length}</div>
          <div class="text-xs text-slate-400">天</div>
        </div>
      </div>
    `;
  },

  renderGapDates(entries) {
    const allDates = [];
    if (entries.length > 0) {
      const startStr = entries[0].date;
      const endStr = entries[entries.length - 1].date;
      // 用本地日期安全递增，避免 UTC 偏移
      const [sy, sm, sd] = startStr.split('-').map(Number);
      const cursor = new Date(sy, sm - 1, sd);
      const [ey, em, ed] = endStr.split('-').map(Number);
      const end = new Date(ey, em - 1, ed);
      while (cursor <= end) {
        allDates.push(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const entryDates = entries.map(e => e.date);
    const gaps = allDates.filter(d => !entryDates.includes(d));
    if (gaps.length === 0) return '';
    return `<div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
      <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
      <div><strong class="text-amber-700">缺失日期：</strong>${gaps.join('、')}（共 ${gaps.length} 天）</div>
    </div>`;
  },

  renderObservationPanel(entries, metricKey) {
    const container = document.getElementById('trend-observation');
    if (!container) {
      const el = document.getElementById('trend-charts')?.parentElement;
      if (el) {
        const div = document.createElement('div');
        div.id = 'trend-observation';
        div.className = 'space-y-5';
        el.appendChild(div);
      }
    }
    const obsEl = document.getElementById('trend-observation');
    if (!obsEl) return;
    if (!entries || entries.length === 0 || !metricKey || metricKey === 'overview') {
      obsEl.innerHTML = `
        <div class="card bg-slate-50">
          <h3 class="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <i data-lucide="search" class="w-4 h-4 text-slate-500"></i>观察提示
          </h3>
          <p class="text-sm text-slate-500">切换到具体指标可查看本地规则生成的客观观察草稿。</p>
        </div>
      `;
      return;
    }
    const m = JJData.METRIC_CHART_FIELDS.find(x => x.key === metricKey);
    if (!m) return;
    const obs = JJAI.generateObservation(entries, metricKey);
    if (!obs) {
      obsEl.innerHTML = `
        <div class="card bg-slate-50">
          <h3 class="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <i data-lucide="search" class="w-4 h-4 text-slate-500"></i>${m.label} 观察
          </h3>
          <p class="text-sm text-slate-500">数据不足，无法生成观察（至少需要 2 条有效记录）。</p>
        </div>
      `;
      return;
    }
    obsEl.innerHTML = `
      <div class="card border-slate-200">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-slate-800 flex items-center gap-2">
            <i data-lucide="search" class="w-4 h-4 text-teal-600"></i>${m.label} 观察（本地规则）
          </h3>
          <span class="text-xs text-slate-400">AI 草稿 · 仅引述数据事实</span>
        </div>
        <div class="space-y-2 text-sm text-slate-700">
          <p class="flex items-start gap-2">
            <i data-lucide="trending-up" class="w-4 h-4 text-teal-500 shrink-0 mt-0.5"></i>${obs.summary}
          </p>
          <p class="flex items-start gap-2">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"></i>${obs.peaks}
          </p>
          ${obs.gaps !== '无缺失。' ? `<p class="flex items-start gap-2 text-amber-700"><i data-lucide="alert-circle" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5"></i>${obs.gaps}</p>` : ''}
          <p class="text-xs text-slate-400 pt-2 border-t border-slate-100 flex items-start gap-2">
            <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>${obs.disclaimer}
          </p>
        </div>
      </div>
    `;
  },

  initCharts(entries, metricKey) {
    if (entries.length === 0) return;
    if (!metricKey || metricKey === 'overview') {
      JJData.METRIC_CHART_FIELDS.forEach(m => {
        const canvas = document.getElementById(`mini-${m.key}`);
        if (canvas) JJChart.renderTrend(`mini-${m.key}`, entries, m);
      });
    } else {
      const m = JJData.METRIC_CHART_FIELDS.find(x => x.key === metricKey);
      if (m) JJChart.renderTrend('chart-main', entries, m);
    }
  }
};

window.JJTrend = JJTrend;
