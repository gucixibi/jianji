/**
 * 健迹 - 图表辅助工具
 */

const JJChart = {
  // 各指标正常参考范围（min/max，null 表示无该侧边界）
  NORMAL_RANGES: {
    systolic:      { min: 90,  max: 140 },
    diastolic:     { min: 60,  max: 90  },
    heart_rate:    { min: 60,  max: 100 },
    sleep_hours:   { min: 6.5, max: 9   },
    blood_glucose: { min: 3.9, max: 6.1 },
    spo2:          { min: 95,  max: 100 },
    activity_min:  { min: 30,  max: null },
  },

  // 本地安全的日期范围生成（避免 toISOString 的 UTC 偏移）
  _localDateRange(startStr, endStr) {
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const cursor = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const list = [];
    while (cursor <= end) {
      list.push(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  },

  // 单指标趋势图
  renderTrend(canvasId, entries, metric) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    // 生成完整日期范围内的日期序列（包含缺失），使用本地日期避免 UTC 偏移
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return null;

    const dateList = JJChart._localDateRange(sorted[0].date, sorted[sorted.length - 1].date);

    // 填充数据（缺失为 null，图表中留空）
    const valueMap = {};
    sorted.forEach(e => { valueMap[e.date] = e[metric.key]; });

    const labels = dateList.map(d => d.slice(5)); // MM-DD
    const values = dateList.map(d => valueMap[d] != null ? Number(valueMap[d]) : null);

    // 正常范围参考线 + 异常点红色标注
    const normal = JJChart.NORMAL_RANGES[metric.key];
    const pointColors = values.map(v => {
      if (v == null) return metric.color;
      if (!normal) return metric.color;
      const abn = (normal.min != null && v < normal.min) || (normal.max != null && v > normal.max);
      return abn ? '#dc2626' : metric.color;
    });

    // 自定义插件：绘制正常范围浅色带 + 边界虚线
    const rangePlugin = normal ? {
      id: 'normalRange',
      beforeDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea || !scales.y) return;
        const y = scales.y;
        ctx.save();
        // 正常范围浅色填充带
        if (normal.min != null && normal.max != null) {
          const yTop = y.getPixelForValue(normal.max);
          const yBot = y.getPixelForValue(normal.min);
          if (yTop >= chartArea.top && yBot <= chartArea.bottom) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.07)';
            ctx.fillRect(chartArea.left, Math.max(chartArea.top, yTop),
              chartArea.right - chartArea.left,
              Math.min(chartArea.bottom, yBot) - Math.max(chartArea.top, yTop));
          }
        }
        // 边界虚线
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        [normal.min, normal.max].forEach(val => {
          if (val == null) return;
          const yp = y.getPixelForValue(val);
          if (yp < chartArea.top || yp > chartArea.bottom) return;
          ctx.beginPath();
          ctx.moveTo(chartArea.left, yp);
          ctx.lineTo(chartArea.right, yp);
          ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.restore();
      }
    } : null;

    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();

    canvas._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${metric.label}（${metric.unit}）`,
          data: values,
          borderColor: metric.color,
          backgroundColor: metric.color + '20',
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          spanGaps: false,  // 不跨越缺口
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.raw == null) return `${metric.label}: (未测量)`;
                let tag = '';
                if (normal) {
                  const abn = (normal.min != null && ctx.raw < normal.min) || (normal.max != null && ctx.raw > normal.max);
                  if (abn) tag = ' ⚠ 偏离正常范围';
                }
                return `${metric.label}: ${ctx.raw} ${metric.unit}${tag}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } },
          y: { beginAtZero: false, grid: { color: '#f1f5f9' } }
        }
      },
      plugins: [rangePlugin].filter(Boolean)
    });
    return canvas._chart;
  },

  // 多指标对比图
  renderMultiTrend(canvasId, entries, metrics) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return null;

    const dateList = JJChart._localDateRange(sorted[0].date, sorted[sorted.length - 1].date);

    const datasets = metrics.map(m => {
      const valueMap = {};
      sorted.forEach(e => { valueMap[e.date] = e[m.key]; });
      return {
        label: `${m.label}（${m.unit}）`,
        data: dateList.map(d => valueMap[d] != null ? Number(valueMap[d]) : null),
        borderColor: m.color,
        backgroundColor: m.color + '15',
        borderWidth: 2,
        pointRadius: 4,
        spanGaps: false,
        tension: 0.3,
        yAxisID: metrics.length > 1 ? (m.key.includes('spo2') || m.key.includes('sleep') || m.key.includes('activity') ? 'y1' : 'y') : 'y',
      };
    });

    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } },
        y: { beginAtZero: false, grid: { color: '#f1f5f9' }, position: 'left' },
      }
    };

    if (metrics.length > 2) {
      options.scales.y1 = { beginAtZero: false, grid: { drawOnChartArea: false }, position: 'right' };
    }

    canvas._chart = new Chart(ctx, {
      type: 'line',
      data: { labels: dateList.map(d => d.slice(5)), datasets },
      options
    });
    return canvas._chart;
  }
};

window.JJChart = JJChart;
