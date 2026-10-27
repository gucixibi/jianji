/**
 * 健迹 - 健康记录模块
 * 手动录入 / AI文字提取 / OCR候选（模拟） / 草稿核对 / 保存 / 编辑 / 删除
 */

const JJRecord = {
  render(container) {
    container.innerHTML = `
      <div class="page-gap fade-in">
        ${this.renderHeader()}
        ${this.renderTabs()}
        <div id="record-panel"></div>
        <div id="record-list"></div>
      </div>
    `;
    this.bindTabs();
    this.switchTab('manual');
    this.renderList();
  },

  renderHeader() {
    return `
      <div class="px-0.5">
        <h2 class="page-title">健康记录</h2>
        <p class="page-sub">每日记录睡眠、活动、体征与感受，支持手动、AI 文字与图片 OCR 三种录入方式。</p>
      </div>
    `;
  },

  renderTabs() {
    const base = 'record-tab px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-medium text-slate-500 transition-all duration-150 inline-flex items-center gap-1.5';
    const active = 'record-tab px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-semibold text-slate-900 transition-all duration-150 inline-flex items-center gap-1.5';
    const activeStyle = 'background:#fff;box-shadow:0 1px 2px rgba(16,24,40,0.08),0 0 0 1px rgba(16,24,40,0.04);';
    return `
      <div class="card">
        <div class="flex flex-wrap items-center gap-[3px] p-[3px] rounded-[10px]" style="background:#f2f4f7;">
          <button data-tab="manual" class="${active}" style="${activeStyle}"><i data-lucide="pencil" class="w-3.5 h-3.5"></i>手动录入</button>
          <button data-tab="ai" class="${base}"><i data-lucide="bot" class="w-3.5 h-3.5"></i>AI 文字提取</button>
          <button data-tab="ocr" class="${base}"><i data-lucide="camera" class="w-3.5 h-3.5"></i>图片 OCR</button>
        </div>
      </div>
    `;
  },

  bindTabs() {
    const base = 'record-tab px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-medium text-slate-500 transition-all duration-150 inline-flex items-center gap-1.5';
    const active = 'record-tab px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-semibold text-slate-900 transition-all duration-150 inline-flex items-center gap-1.5';
    const activeStyle = 'background:#fff;box-shadow:0 1px 2px rgba(16,24,40,0.08),0 0 0 1px rgba(16,24,40,0.04);';
    document.querySelectorAll('.record-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.record-tab').forEach(b => {
          b.className = base;
          b.style.cssText = '';
        });
        btn.className = active;
        btn.style.cssText = activeStyle;
        this.switchTab(btn.dataset.tab);
      });
    });
  },

  switchTab(tab) {
    const panel = document.getElementById('record-panel');
    if (tab === 'manual') panel.innerHTML = this.renderManualForm();
    else if (tab === 'ai') panel.innerHTML = this.renderAIPanel();
    else panel.innerHTML = this.renderOCRPanel();
    if (tab === 'manual') this.bindManualForm();
    else if (tab === 'ai') this.bindAIPanel();
    else this.bindOCRPanel();
  },

  // ========== 手动录入 ==========
  renderManualForm(existing = null) {
    const today = JJData.TODAY_STR;
    const e = existing || {};
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-4">${existing ? '编辑记录' : '新建记录'}</h3>
        <form id="manual-form" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="col-span-2 md:col-span-4">
            <label class="field-label">记录日期 *</label>
            <input type="date" name="date" value="${e.date || today}" required class="field-input" />
          </div>
          <div>
            <label class="field-label">睡眠(小时)</label>
            <input type="number" step="0.1" name="sleep_hours" value="${e.sleep_hours || ''}" placeholder="如 7.0" class="field-input" />
          </div>
          <div>
            <label class="field-label">活动(分钟)</label>
            <input type="number" name="activity_min" value="${e.activity_min || ''}" placeholder="如 30" class="field-input" />
          </div>
          <div>
            <label class="field-label">收缩压(mmHg)</label>
            <input type="number" name="systolic" value="${e.systolic || ''}" placeholder="如 120" class="field-input" />
          </div>
          <div>
            <label class="field-label">舒张压(mmHg)</label>
            <input type="number" name="diastolic" value="${e.diastolic || ''}" placeholder="如 80" class="field-input" />
          </div>
          <div>
            <label class="field-label">心率(次/分)</label>
            <input type="number" name="heart_rate" value="${e.heart_rate || ''}" placeholder="如 72" class="field-input" />
          </div>
          <div>
            <label class="field-label">空腹血糖(mmol/L)</label>
            <input type="number" step="0.1" name="blood_glucose" value="${e.blood_glucose || ''}" placeholder="如 5.5" class="field-input" />
          </div>
          <div>
            <label class="field-label">血氧(%)</label>
            <input type="number" name="spo2" value="${e.spo2 || ''}" placeholder="如 98" class="field-input" />
          </div>
          <div>
            <label class="field-label">心情</label>
            <select name="mood" class="field-input">
              <option value="">—</option>
              <option ${e.mood === '好' ? 'selected' : ''}>好</option>
              <option ${e.mood === '一般' ? 'selected' : ''}>一般</option>
              <option ${e.mood === '差' ? 'selected' : ''}>差</option>
            </select>
          </div>
          <div>
            <label class="field-label">精力</label>
            <select name="energy" class="field-input">
              <option value="">—</option>
              <option ${e.energy === '充沛' ? 'selected' : ''}>充沛</option>
              <option ${e.energy === '一般' ? 'selected' : ''}>一般</option>
              <option ${e.energy === '疲惫' ? 'selected' : ''}>疲惫</option>
            </select>
          </div>
          <div class="col-span-2 md:col-span-4">
            <label class="field-label">不适描述</label>
            <input type="text" name="discomfort" value="${e.discomfort || ''}" placeholder="如：头晕、胸闷..." class="field-input" />
          </div>
          <div class="col-span-2 md:col-span-4">
            <label class="field-label">备注</label>
            <input type="text" name="notes" value="${e.notes || ''}" placeholder="其他说明..." class="field-input" />
          </div>
          <input type="hidden" name="input_source" value="${existing?.input_source || 'manual'}" />
          <div class="col-span-2 md:col-span-4 flex gap-3 pt-2">
            <button type="submit" class="btn-primary"><i data-lucide="save" class="w-4 h-4 inline"></i> 保存记录</button>
            <button type="button" id="btn-clear-form" class="btn-secondary">清空</button>
          </div>
        </form>
      </div>
    `;
  },

  bindManualForm() {
    const form = document.getElementById('manual-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const entry = {};
      fd.forEach((val, key) => {
        if (key === 'date') { entry[key] = val; return; }
        if (['mood','energy','discomfort','notes','input_source'].includes(key)) {
          entry[key] = val || '';
          return;
        }
        entry[key] = val === '' ? null : (key.includes('.') || key === 'blood_glucose' || key === 'sleep_hours' ? parseFloat(val) : parseInt(val));
      });
      if (!entry.date) { showToast('请选择记录日期'); return; }
      JJData.saveEntry(entry);
      showToast('<i data-lucide="check" class="w-4 h-4 inline"></i> 记录已保存');
      form.reset();
      form.querySelector('[name="date"]').value = JJData.TODAY_STR;
      this.renderList();
    });
    document.getElementById('btn-clear-form')?.addEventListener('click', () => {
      form.reset();
      form.querySelector('[name="date"]').value = JJData.TODAY_STR;
    });
  },

  // ========== AI 文字提取 ==========
  renderAIPanel() {
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-2"><i data-lucide="bot" class="w-4 h-4 inline"></i> AI 文字提取</h3>
        <p class="text-sm text-slate-500 mb-4">用自然语言描述今日身体状况，本地规则引擎自动提取字段供核对。文字不出本机。</p>
        <textarea id="ai-input" rows="3" class="field-input font-mono text-sm" placeholder="示例：10月9日睡了7.5小时，散步30分钟，血压120/80，心率72，心情不错"></textarea>
        <div class="flex gap-2 mt-3 flex-wrap">
          <button id="btn-ai-extract" class="btn-primary"><i data-lucide="sparkles" class="w-4 h-4 inline"></i> 提取字段</button>
          <button id="btn-ai-demo" class="btn-secondary"><i data-lucide="wand-2" class="w-4 h-4 inline"></i> 填入示例</button>
        </div>
        <div id="ai-draft" class="mt-5"></div>
      </div>
    `;
  },

  bindAIPanel() {
    const input = document.getElementById('ai-input');
    document.getElementById('btn-ai-demo').addEventListener('click', () => {
      input.value = '10月9日睡了7.5小时，散步30分钟，血压120/80，心率72，空腹血糖5.6，心情不错';
    });
    document.getElementById('btn-ai-extract').addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) { showToast('请先输入描述'); return; }
      const draft = JJAI.extract(text);
      this.renderAIDraft(draft);
    });
  },

  // 证据片段颜色映射（字段 → Tailwind 颜色）
  evidenceColorMap: {
    systolic: { bg: 'bg-rose-200', text: 'text-rose-800', dot: 'bg-rose-500' },
    diastolic: { bg: 'bg-rose-200', text: 'text-rose-800', dot: 'bg-rose-500' },
    heart_rate: { bg: 'bg-indigo-200', text: 'text-indigo-800', dot: 'bg-indigo-500' },
    sleep_hours: { bg: 'bg-teal-200', text: 'text-teal-800', dot: 'bg-teal-500' },
    activity_min: { bg: 'bg-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
    blood_glucose: { bg: 'bg-green-200', text: 'text-green-800', dot: 'bg-green-500' },
    spo2: { bg: 'bg-sky-200', text: 'text-sky-800', dot: 'bg-sky-500' },
    mood: { bg: 'bg-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
    discomfort: { bg: 'bg-rose-200', text: 'text-rose-800', dot: 'bg-rose-500' },
    date: { bg: 'bg-slate-200', text: 'text-slate-800', dot: 'bg-slate-500' },
  },

  // 把原文中各字段对应的证据片段高亮
  highlightEvidence(text, evidence) {
    if (!text) return '';
    const snippets = [];
    const used = new Set();
    for (const [field, snippet] of Object.entries(evidence || {})) {
      if (!snippet || snippet.startsWith('(')) continue;
      if (used.has(snippet)) continue;
      used.add(snippet);
      const c = this.evidenceColorMap[field] || { bg: 'bg-yellow-200', text: 'text-yellow-800' };
      snippets.push({ snippet, ...c });
    }
    if (snippets.length === 0) return text;
    snippets.sort((a, b) => b.snippet.length - a.snippet.length);
    const escaped = snippets.map(s => s.snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'g');
    return text.replace(regex, (match) => {
      const snip = snippets.find(s => s.snippet === match);
      return `<mark class="${snip.bg} ${snip.text} rounded px-0.5 font-medium">${match}</mark>`;
    });
  },

  renderAIDraft(draft) {
    const panel = document.getElementById('ai-draft');
    const fields = draft.fields;
    const ev = draft.evidence;
    const fieldList = JJData.HEALTH_FIELDS;

    const rows = Object.keys(fields).filter(k => fields[k] != null && fields[k] !== '').map(key => {
      const info = fieldList[key];
      const c = this.evidenceColorMap[key];
      return `
        <div class="draft-field border rounded-xl p-3 bg-amber-50">
          <div class="flex items-center justify-between gap-2">
            <label class="text-sm font-medium text-slate-800 flex items-center gap-1.5">
              ${c ? `<span class="w-2 h-2 rounded-full ${c.dot}"></span>` : ''}${info?.label || key}
            </label>
            ${ev[key] ? `<span class="text-xs text-amber-700 truncate max-w-[55%]" title="依据：${ev[key]}">依据: "${ev[key]}"</span>` : ''}
          </div>
          ${info?.type === 'number' ? `<input type="number" step="${info.step || 1}" data-key="${key}" value="${fields[key]}" class="field-input mt-1" />` : ''}
          ${info?.type === 'select' ? `<select data-key="${key}" class="field-input mt-1">${info.options.map(o => `<option ${o === fields[key] ? 'selected' : ''}>${o}</option>`).join('')}</select>` : ''}
          ${info?.type === 'text' ? `<input type="text" data-key="${key}" value="${fields[key]}" class="field-input mt-1" />` : ''}
          ${key === 'date' ? `<input type="date" data-key="${key}" value="${fields[key]}" class="field-input mt-1" />` : ''}
        </div>
      `;
    }).join('');

    panel.innerHTML = `
      <div class="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <i data-lucide="file-search" class="w-4 h-4 text-amber-700"></i>
          <p class="text-sm font-medium text-amber-800">AI 提取草稿 · 请核对后确认入库</p>
        </div>
        <div class="text-xs text-slate-500 mb-3">原文中 <mark class="px-1 rounded bg-slate-200">彩色高亮</mark> 为 AI 识别到的字段依据：</div>
        <div class="text-sm text-slate-700 mb-4 bg-white rounded-lg p-3 border leading-relaxed">
          ${this.highlightEvidence(draft.original_text, ev)}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${rows || '<div class="text-sm text-slate-500">未能提取到有效字段，可手动填写或重新描述。</div>'}
        </div>
        <div class="mt-4 flex gap-2 flex-wrap">
          <button id="btn-ai-confirm" class="btn-primary"><i data-lucide="check" class="w-4 h-4 inline"></i> 确认入库</button>
          <button id="btn-ai-cancel" class="btn-secondary">取消</button>
        </div>
      </div>
    `;

    document.getElementById('btn-ai-confirm')?.addEventListener('click', () => {
      const entry = { input_source: 'ai_text', original_text: draft.original_text };
      panel.querySelectorAll('[data-key]').forEach(inp => {
        const key = inp.dataset.key;
        if (key === 'date') { entry[key] = inp.value; return; }
        const numFields = ['sleep_hours','activity_min','systolic','diastolic','heart_rate','blood_glucose','spo2'];
        if (numFields.includes(key)) {
          entry[key] = inp.value === '' ? null : (key === 'blood_glucose' || key === 'sleep_hours' ? parseFloat(inp.value) : parseInt(inp.value));
        } else {
          entry[key] = inp.value;
        }
      });
      if (!entry.date) { showToast('缺少日期'); return; }
      JJData.saveEntry(entry);
      showToast('<i data-lucide="check" class="w-4 h-4 inline"></i> 记录已保存（来源: AI文字）');
      panel.innerHTML = '';
      document.getElementById('ai-input').value = '';
      this.renderList();
    });

    document.getElementById('btn-ai-cancel')?.addEventListener('click', () => {
      panel.innerHTML = '';
    });
  },

  // ========== OCR 真实识别 ==========
  renderOCRPanel() {
    const cfg = JJData.getOCRConfig();
    const providerLabel = { baidu: '百度 OCR', tesseract: 'Tesseract.js（纯前端）', demo: '演示模式' }[cfg.provider] || '演示模式';
    const configured = cfg.provider === 'baidu' && cfg.baidu_api_key && cfg.baidu_secret_key;
    return `
      <div class="card">
        <div class="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h3 class="font-semibold text-slate-800"><i data-lucide="camera" class="w-4 h-4 inline"></i> 图片 OCR</h3>
          <span class="badge ${configured ? 'badge-emerald' : 'badge-amber'}">
            <i data-lucide="${configured ? 'check' : 'alert-triangle'}" class="w-3 h-3"></i> 当前引擎：${providerLabel}
          </span>
        </div>
        <p class="text-sm text-slate-500 mb-4">上传血压计、血糖仪等测量设备照片，自动识别数值并提取字段。${cfg.provider === 'baidu' ? (configured ? '已配置百度 OCR Key。' : '请先在「数据与隐私」配置百度 OCR Key，否则自动降级为本地识别。') : 'Tesseract.js 纯前端运行，无需配置 Key。'}</p>
        <div class="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 hover:border-teal-400 transition-colors">
          <div class="mb-3"><i data-lucide="image" class="w-12 h-12 mx-auto text-slate-400"></i></div>
          <p class="text-sm text-slate-600 mb-3">拖拽或选择测量图片</p>
          <input type="file" accept="image/*" id="ocr-file" class="hidden" />
          <button id="btn-ocr-pick" class="btn-secondary"><i data-lucide="upload" class="w-4 h-4"></i> 选择图片</button>
          <button id="btn-ocr-demo" class="btn-primary ml-2"><i data-lucide="wand-2" class="w-4 h-4"></i> 使用演示图片</button>
        </div>
        <div id="ocr-preview" class="mt-4 hidden">
          <img id="ocr-preview-img" class="max-h-48 rounded-xl border mx-auto" />
        </div>
        <div id="ocr-progress" class="mt-4 hidden">
          <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div id="ocr-progress-bar" class="h-full bg-teal-500 transition-all duration-300" style="width:0%"></div>
          </div>
          <p id="ocr-progress-text" class="text-xs text-slate-500 mt-1.5 text-center">准备中…</p>
        </div>
        <div id="ocr-raw" class="mt-4 hidden"></div>
        <div id="ocr-result" class="mt-5"></div>
      </div>
    `;
  },

  bindOCRPanel() {
    document.getElementById('btn-ocr-pick').addEventListener('click', () => {
      document.getElementById('ocr-file').click();
    });
    document.getElementById('ocr-file').addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this._runOCR(e.target.files[0]);
      }
    });
    document.getElementById('btn-ocr-demo').addEventListener('click', () => {
      // 用内置的演示图（一个简单的血压计读数示意图，base64 占位→直接走演示文本）
      const cfg = JJData.getOCRConfig();
      if (cfg.provider === 'demo') {
        this._renderOCRResult(JJOCR._demoText(), 'demo');
      } else {
        // 创建一张模拟真实血压计屏幕的演示图
        const canvas = document.createElement('canvas');
        canvas.width = 480; canvas.height = 320;
        const ctx = canvas.getContext('2d');
        // 设备外壳
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 480, 320);
        // 屏幕区域（深色背光 LCD 风格）
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(20, 20, 440, 280);
        // 屏幕高光
        const grad = ctx.createLinearGradient(20, 20, 20, 300);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(20, 20, 440, 280);
        // 标题
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('血压计 · 测量结果', 40, 55);
        // 大数字：收缩压/舒张压
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 64px monospace';
        ctx.fillText('124', 50, 145);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 32px monospace';
        ctx.fillText('/', 185, 140);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 64px monospace';
        ctx.fillText('80', 215, 145);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.fillText('mmHg', 340, 140);
        // 心率
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('♥ 72', 50, 200);
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText('次/分', 140, 198);
        // 血氧
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('SpO₂ 98%', 230, 200);
        // 底部日期
        ctx.fillStyle = '#475569';
        ctx.font = '12px monospace';
        ctx.fillText('2026-10-21  08:32', 50, 260);
        ctx.fillText('AUTO MODE', 340, 260);
        canvas.toBlob(blob => {
          const file = new File([blob], 'demo-bp-monitor.png', { type: 'image/png' });
          this._runOCR(file);
        });
      }
    });
  },

  async _runOCR(file) {
    // 预览
    const preview = document.getElementById('ocr-preview');
    const previewImg = document.getElementById('ocr-preview-img');
    const progress = document.getElementById('ocr-progress');
    const bar = document.getElementById('ocr-progress-bar');
    const ptext = document.getElementById('ocr-progress-text');
    const resultDiv = document.getElementById('ocr-result');
    const rawDiv = document.getElementById('ocr-raw');
    resultDiv.innerHTML = '';
    rawDiv.classList.add('hidden');

    if (file) {
      previewImg.src = URL.createObjectURL(file);
      preview.classList.remove('hidden');
    }
    progress.classList.remove('hidden');
    bar.style.width = '5%';
    ptext.textContent = '准备识别…';

    try {
      const { text, engine } = await JJOCR.recognize(file, (pct, msg) => {
        bar.style.width = pct + '%';
        ptext.textContent = msg;
      });
      progress.classList.add('hidden');
      this._renderOCRResult(text, engine);
    } catch (e) {
      progress.classList.add('hidden');
      showToast('OCR 识别失败：' + e.message);
    }
  },

  _renderOCRResult(text, engine) {
    const rawDiv = document.getElementById('ocr-raw');
    const engineLabel = { baidu: '百度 OCR', tesseract: 'Tesseract.js', demo: '演示模式' }[engine] || engine;
    rawDiv.classList.remove('hidden');
    rawDiv.innerHTML = `
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
        <div class="text-xs text-slate-500 mb-1 flex items-center gap-1">
          <i data-lucide="file-text" class="w-3 h-3"></i> 识别原文（${engineLabel}）
        </div>
        <code class="text-sm text-slate-700 whitespace-pre-wrap">${text}</code>
      </div>
    `;
    // 复用 AI 提取引擎
    const draft = JJAI.extract(text);
    draft.original_text = text;
    this.renderOCRDraft(draft, engine);
  },

  renderOCRDraft(draft, engine) {
    const panel = document.getElementById('ocr-result');
    const ev = draft.evidence;
    const fieldList = JJData.HEALTH_FIELDS;
    const rows = Object.keys(draft.fields).filter(k => draft.fields[k] != null && draft.fields[k] !== '').map(k => {
      const info = fieldList[k];
      const c = this.evidenceColorMap[k];
      const fieldHtml = k === 'date'
        ? `<input type="date" data-key="${k}" value="${draft.fields[k]}" class="field-input" />`
        : `<input type="number" step="${info?.step || 1}" data-key="${k}" value="${draft.fields[k]}" class="field-input" />`;
      return `
        <div class="draft-field border rounded-xl p-2.5 bg-indigo-50">
          <label class="field-label flex items-center gap-1.5 mb-1">
            ${c ? `<span class="w-2 h-2 rounded-full ${c.dot}"></span>` : ''}${info?.label || k}
          </label>
          ${fieldHtml}
        </div>
      `;
    }).join('');

    panel.innerHTML = `
      <div class="border border-indigo-200 bg-indigo-50 rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <i data-lucide="camera" class="w-4 h-4 text-indigo-700"></i>
          <p class="text-sm font-medium text-indigo-800">OCR 识别草稿 · 请核对数值与图片是否一致</p>
        </div>
        <div class="text-xs text-slate-500 mb-3">识别原文中彩色片段为提取到的字段依据：</div>
        <div class="text-sm text-slate-700 mb-4 bg-white rounded-lg p-3 border leading-relaxed">
          ${this.highlightEvidence(draft.original_text, ev)}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          ${rows || '<div class="col-span-full text-sm text-slate-500">未能提取到有效字段，可手动填写。</div>'}
        </div>
        <div class="mt-4 flex gap-2">
          <button id="btn-ocr-confirm" class="btn-primary"><i data-lucide="check" class="w-4 h-4 inline"></i> 确认入库</button>
          <button id="btn-ocr-cancel" class="btn-secondary">取消</button>
        </div>
      </div>
    `;
    document.getElementById('btn-ocr-confirm').addEventListener('click', () => {
      const entry = { input_source: 'ocr', original_text: draft.original_text };
      panel.querySelectorAll('[data-key]').forEach(inp => {
        const k = inp.dataset.key;
        if (k === 'date') { entry[k] = inp.value; return; }
        entry[k] = inp.value;
      });
      JJData.saveEntry(entry);
      showToast('<i data-lucide="check" class="w-4 h-4 inline"></i> OCR结果已保存');
      panel.innerHTML = '';
      this.renderList();
    });
    document.getElementById('btn-ocr-cancel').addEventListener('click', () => { panel.innerHTML = ''; });
  },

  // ========== 记录列表 ==========
  renderList() {
    const container = document.getElementById('record-list');
    const entries = JJData.getAllEntries();
    if (entries.length === 0) {
      container.innerHTML = `<div class="card text-center text-slate-500 py-8">暂无记录，开始录入吧</div>`;
      return;
    }

    const rows = entries.map(e => {
      const srcLabel = { manual: '手动', ai_text: 'AI文字', ocr: 'OCR', demo: '演示' }[e.input_source] || e.input_source;
      return `
        <div class="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow bg-white">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-800">${e.date}</span>
              <span class="badge badge-teal">${srcLabel}</span>
            </div>
            <div class="flex gap-2">
              <button data-edit="${e.date}" class="text-xs text-teal-600 hover:text-teal-700 px-2 py-1">编辑</button>
              <button data-del="${e.date}" class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1">删除</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
            ${e.systolic ? `<span>血压 ${e.systolic}/${e.diastolic || '—'}mmHg</span>` : ''}
            ${e.heart_rate ? `<span>心率 ${e.heart_rate}</span>` : ''}
            ${e.blood_glucose ? `<span>血糖 ${e.blood_glucose}</span>` : ''}
            ${e.spo2 ? `<span>血氧 ${e.spo2}%</span>` : ''}
            ${e.sleep_hours ? `<span>睡 ${e.sleep_hours}h</span>` : ''}
            ${e.activity_min ? `<span>活动 ${e.activity_min}min</span>` : ''}
            ${e.mood ? `<span class="badge badge-slate">心情${e.mood}</span>` : ''}
            ${e.discomfort ? `<span class="text-rose-600"><i data-lucide="alert-triangle" class="w-3 h-3 inline"></i> ${e.discomfort}</span>` : ''}
          </div>
          ${e.notes ? `<div class="text-xs text-slate-500 mt-2">备注：${e.notes}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-3"><i data-lucide="clipboard-list" class="w-4 h-4 inline"></i> 历史记录（${entries.length} 条）</h3>
        <div class="space-y-3">${rows}</div>
      </div>
    `;

    // 绑定编辑/删除
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.edit;
        const entry = JJData.getEntryByDate(date);
        if (entry) {
          // 切到手动录入 tab 并填入
          document.querySelector('[data-tab="manual"]').click();
          setTimeout(() => {
            const panel = document.getElementById('record-panel');
            panel.innerHTML = JJRecord.renderManualForm(entry);
            JJRecord.bindManualForm();
            panel.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      });
    });

    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.del;
        if (confirm(`确定删除 ${date} 的记录？此操作不可恢复。`)) {
          JJData.deleteEntry(date);
          showToast('<i data-lucide="check" class="w-4 h-4 inline"></i> 已删除');
          this.renderList();
        }
      });
    });
  }
};

window.JJRecord = JJRecord;
