/**
 * 健迹 - 数据与隐私页面
 * 说明 + 导出 + 重置
 */

const JJPrivacy = {
  render(container) {
    const entriesCount = JJData.getAllEntries().length;
    const medsCount = JJData.getMedications().length;
    const checkinCount = JJData.getCheckins().length;

    container.innerHTML = `
      <div class="space-y-5">
        ${this.renderHeader()}
        ${this.renderDataSummary(entriesCount, medsCount, checkinCount)}
        ${this.renderOCRSettings()}
        ${this.renderPrivacyNote()}
        ${this.renderActions()}
      </div>
    `;
    this.bindActions();
    this.bindOCRSettings();
  },

  renderHeader() {
    return `
      <div class="card">
        <h2 class="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <i data-lucide="shield-check" class="w-5 h-5 text-teal-600"></i>数据与隐私
        </h2>
        <p class="text-sm text-slate-500 mt-1">了解健迹如何保存、使用和保护你的数据。</p>
      </div>
    `;
  },

  renderDataSummary(entriesCount, medsCount, checkinCount) {
    const cards = [
      { icon: 'file-text', label: '健康记录', value: entriesCount, color: 'teal' },
      { icon: 'pill',      label: '服药计划', value: medsCount,    color: 'indigo' },
      { icon: 'check-square', label: '打卡流水', value: checkinCount, color: 'amber' },
    ];
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <i data-lucide="database" class="w-4 h-4 text-slate-500"></i>当前数据概览
        </h3>
        <div class="grid grid-cols-3 gap-3">
          ${cards.map(c => `
            <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
              <i data-lucide="${c.icon}" class="w-5 h-5 text-${c.color}-500 mx-auto mb-2"></i>
              <div class="text-2xl font-bold text-${c.color}-700">${c.value}</div>
              <div class="text-xs text-slate-500 mt-1">${c.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderOCRSettings() {
    const cfg = JJData.getOCRConfig();
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <i data-lucide="camera" class="w-4 h-4 text-slate-500"></i>OCR 识别引擎设置
        </h3>
        <p class="text-xs text-slate-500 mb-4">OCR Key 仅保存在本机 localStorage，不会上传。可选择不同识别引擎。</p>
        <div class="space-y-3">
          <div>
            <label class="field-label">识别引擎</label>
            <div class="flex gap-2 flex-wrap">
              <label class="flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer hover:bg-slate-50 ${cfg.provider === 'tesseract' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}">
                <input type="radio" name="ocr-provider" value="tesseract" ${cfg.provider === 'tesseract' ? 'checked' : ''} class="accent-teal-600" />
                <span class="text-sm">Tesseract.js（纯前端，免 Key）</span>
              </label>
              <label class="flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer hover:bg-slate-50 ${cfg.provider === 'baidu' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}">
                <input type="radio" name="ocr-provider" value="baidu" ${cfg.provider === 'baidu' ? 'checked' : ''} class="accent-teal-600" />
                <span class="text-sm">百度智能云 OCR（需 Key，中文更准）</span>
              </label>
              <label class="flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer hover:bg-slate-50 ${cfg.provider === 'demo' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}">
                <input type="radio" name="ocr-provider" value="demo" ${cfg.provider === 'demo' ? 'checked' : ''} class="accent-teal-600" />
                <span class="text-sm">演示模式（模拟结果）</span>
              </label>
            </div>
          </div>
          <div id="baidu-keys" class="${cfg.provider === 'baidu' ? '' : 'hidden'} space-y-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div>
              <label class="field-label">API Key（AK）</label>
              <input type="text" id="ocr-ak" value="${cfg.baidu_api_key}" placeholder="百度智能云 API Key" class="field-input" />
            </div>
            <div>
              <label class="field-label">Secret Key（SK）</label>
              <input type="password" id="ocr-sk" value="${cfg.baidu_secret_key}" placeholder="百度智能云 Secret Key" class="field-input" />
            </div>
            <p class="text-xs text-slate-500">在 <a href="https://console.bce.baidu.com/ai/#/ai/ocr/overview/index" target="_blank" class="text-teal-600 hover:underline">百度智能云控制台</a> 开通"文字识别"服务后获取。浏览器直连百度 OCR 可能受跨域限制，系统会自动通过代理转发。</p>
          </div>
          <div class="flex gap-2">
            <button id="btn-save-ocr" class="btn-primary"><i data-lucide="save" class="w-4 h-4"></i>保存 OCR 设置</button>
            <button id="btn-clear-ocr" class="btn-secondary">清空 Key</button>
          </div>
        </div>
      </div>
    `;
  },

  bindOCRSettings() {
    const radios = document.querySelectorAll('input[name="ocr-provider"]');
    radios.forEach(r => r.addEventListener('change', () => {
      document.getElementById('baidu-keys').classList.toggle('hidden', r.value !== 'baidu');
    }));
    document.getElementById('btn-save-ocr')?.addEventListener('click', () => {
      const provider = document.querySelector('input[name="ocr-provider"]:checked')?.value || 'tesseract';
      JJData.saveOCRConfig({
        provider,
        baidu_api_key: document.getElementById('ocr-ak')?.value || '',
        baidu_secret_key: document.getElementById('ocr-sk')?.value || '',
      });
      showToast('✓ OCR 设置已保存');
    });
    document.getElementById('btn-clear-ocr')?.addEventListener('click', () => {
      JJData.clearOCRConfig();
      JJPrivacy.render(document.getElementById('page-container'));
      showToast('✓ 已清空 OCR 配置');
    });
  },

  renderPrivacyNote() {
    const notes = [
      { icon: 'package',    color: 'teal', title: '数据存储', text: '所有健康记录、服药计划和就诊卡均保存在当前浏览器的 localStorage 中，不会发送到任何外部服务器。' },
      { icon: 'bot',        color: 'teal', title: 'AI 处理',   text: '本版本采用本地规则引擎，文字不离开你的设备。未来如接入云端 AI 提取/问答，会明确弹窗告知发送范围并请求授权。' },
      { icon: 'download',   color: 'teal', title: '数据导出',  text: '你可以随时导出全部数据为 JSON 文件，便于备份或迁移。' },
      { icon: 'trash-2',    color: 'teal', title: '数据删除',  text: '清空浏览器数据或点击下方"重置全部"会永久删除所有记录，不可恢复。' },
    ];
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <i data-lucide="lock" class="w-4 h-4 text-slate-500"></i>数据与隐私说明
        </h3>
        <div class="space-y-2">
          ${notes.map(n => `
            <div class="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div class="flex items-start gap-2">
                <i data-lucide="${n.icon}" class="w-4 h-4 text-teal-600 shrink-0 mt-0.5"></i>
                <div class="flex-1">
                  <strong class="text-sm text-slate-800">${n.title}：</strong>
                  <span class="text-sm text-slate-600">${n.text}</span>
                </div>
              </div>
            </div>
          `).join('')}
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
            <div>
              <strong class="text-sm text-amber-700">安全提醒：</strong>
              <span class="text-sm text-amber-800 ml-1">健康信息属于敏感个人信息。不要在公共设备上使用本应用，或使用后记得清空。</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderActions() {
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <i data-lucide="settings" class="w-4 h-4 text-slate-500"></i>数据操作
        </h3>
        <div class="flex gap-3 flex-wrap">
          <button id="btn-export" class="btn-primary">
            <i data-lucide="download" class="w-4 h-4"></i>导出全部数据
          </button>
          <button id="btn-reset-demo" class="btn-secondary">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>重置为演示数据
          </button>
          <button id="btn-reset-all" class="btn-danger">
            <i data-lucide="trash-2" class="w-4 h-4"></i>清空全部数据
          </button>
        </div>
        <p class="text-xs text-slate-500 mt-3">导出的 JSON 文件可作为备份，在其他设备上手动导入。</p>
      </div>
    `;
  },

  bindActions() {
    document.getElementById('btn-export').addEventListener('click', () => {
      const data = JJData.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `健迹_数据备份_${JJData.TODAY_STR}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✓ 数据已导出');
    });
    document.getElementById('btn-reset-demo').addEventListener('click', () => {
      if (confirm('确定重置为演示数据吗？当前所有记录将被替换。')) {
        localStorage.removeItem('jianji_v1');
        JJData.initDB();
        showToast('✓ 已重置为演示数据');
        JJPrivacy.render(document.getElementById('page-container'));
        JJPrivacy.bindActions();
        if (window.lucide) { window.lucide.createIcons(); }
      }
    });
    document.getElementById('btn-reset-all').addEventListener('click', () => {
      if (confirm('⚠️ 警告：这将永久删除所有数据！\n\n确定要清空吗？')) {
        if (confirm('再次确认：真的要清空所有数据吗？')) {
          localStorage.removeItem('jianji_v1');
          showToast('✓ 已清空');
          setTimeout(() => location.reload(), 500);
        }
      }
    });
  }
};

window.JJPrivacy = JJPrivacy;
