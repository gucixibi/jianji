/**
 * 健迹 - AI 助手模块（混合架构）
 * 云端大模型（BYOK，OpenAI 兼容接口）优先，无配置或断网时降级本地规则引擎
 */

const JJAssistant = {
  history: [],
  busy: false,

  render(container) {
    this.history = [];
    this.busy = false;
    container.innerHTML = `
      <div class="page-gap fade-in">
        ${this.renderHeader()}
        ${this.renderSettings()}
        ${this.renderChatPanel()}
      </div>
    `;
    this.bindSettings();
    this.bindChat();
  },

  renderHeader() {
    const cloud = JJData.isCloudAIReady();
    return `
      <div class="px-0.5">
        <div class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 class="page-title flex items-center gap-2">
              <i data-lucide="bot" class="w-[18px] h-[18px]" style="color:#2d5791"></i>AI 助手
            </h2>
            <p class="page-sub">基于你已确认的健康记录进行归纳整理，不做医学诊断。</p>
          </div>
          <span class="badge ${cloud ? 'badge-indigo' : 'badge-amber'}">
            <i data-lucide="${cloud ? 'cloud' : 'laptop'}" class="w-3 h-3"></i>${cloud ? '云端大模型' : '本地规则引擎'}
          </span>
        </div>
        <div class="mt-2.5 flex flex-wrap gap-1.5">
          <span class="badge badge-amber"><i data-lucide="clipboard-list" class="w-3 h-3"></i>仅基于已确认记录</span>
          <span class="badge badge-slate"><i data-lucide="alert-octagon" class="w-3 h-3"></i>不做诊断建议</span>
          ${cloud ? `<span class="badge badge-slate"><i data-lucide="shield" class="w-3 h-3"></i>记录会发送至你配置的 API</span>` : `<span class="badge badge-slate"><i data-lucide="lock" class="w-3 h-3"></i>文字不出本机</span>`}
        </div>
      </div>
    `;
  },

  renderSettings() {
    const cfg = JJData.getAIConfig();
    const cloud = JJData.isCloudAIReady();
    const presets = [
      { name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
      { name: '通义千问', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
      { name: 'Kimi', base_url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
    ];
    return `
      <div class="card">
        <button id="btn-toggle-settings" class="w-full flex items-center justify-between text-left">
          <span class="card-title">
            <i data-lucide="settings-2" class="w-4 h-4 text-slate-400"></i>云端 AI 设置
            ${cloud ? '<span class="badge badge-indigo">已启用</span>' : '<span class="badge badge-slate">未配置 · 当前用本地规则</span>'}
          </span>
          <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 transition-transform" id="settings-chevron"></i>
        </button>
        <div id="settings-body" class="hidden mt-4 pt-4 border-t border-slate-100">
          <p class="text-xs text-slate-500 mb-3">填入你自己的 API Key（OpenAI 兼容接口），Key 仅保存在本机浏览器。配置后 AI 助手将由大模型驱动；清空则回到本地规则模式。</p>
          <div class="flex gap-2 mb-3 flex-wrap">
            ${presets.map(p => `<button class="preset-btn badge badge-slate hover:bg-slate-200 transition-colors" data-url="${p.base_url}" data-model="${p.model}">${p.name}</button>`).join('')}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="field-label">API 地址 (Base URL)</label>
              <input type="text" id="cfg-base-url" class="field-input font-mono text-xs" value="${cfg.base_url}" placeholder="https://api.deepseek.com/v1" />
            </div>
            <div>
              <label class="field-label">API Key</label>
              <input type="password" id="cfg-api-key" class="field-input font-mono text-xs" value="${cfg.api_key}" placeholder="sk-..." />
            </div>
            <div>
              <label class="field-label">模型</label>
              <input type="text" id="cfg-model" class="field-input font-mono text-xs" value="${cfg.model}" placeholder="deepseek-chat" />
            </div>
          </div>
          <div class="flex gap-2 mt-4 flex-wrap">
            <button id="btn-cfg-save" class="btn-primary"><i data-lucide="save" class="w-4 h-4"></i>保存并启用</button>
            <button id="btn-cfg-test" class="btn-secondary"><i data-lucide="plug-zap" class="w-4 h-4"></i>测试连接</button>
            ${cloud ? `<button id="btn-cfg-clear" class="btn-danger"><i data-lucide="trash-2" class="w-4 h-4"></i>清除配置</button>` : ''}
          </div>
          <div id="cfg-status" class="text-xs mt-3"></div>
        </div>
      </div>
    `;
  },

  bindSettings() {
    const body = document.getElementById('settings-body');
    const chevron = document.getElementById('settings-chevron');
    document.getElementById('btn-toggle-settings').addEventListener('click', () => {
      body.classList.toggle('hidden');
      chevron.style.transform = body.classList.contains('hidden') ? '' : 'rotate(180deg)';
    });
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('cfg-base-url').value = btn.dataset.url;
        document.getElementById('cfg-model').value = btn.dataset.model;
      });
    });
    document.getElementById('btn-cfg-save').addEventListener('click', () => {
      JJData.saveAIConfig({
        base_url: document.getElementById('cfg-base-url').value,
        api_key: document.getElementById('cfg-api-key').value,
        model: document.getElementById('cfg-model').value,
      });
      showToast('✓ 配置已保存');
      this.render(document.getElementById('page-container'));
      if (window.lucide) window.lucide.createIcons();
    });
    document.getElementById('btn-cfg-clear')?.addEventListener('click', () => {
      if (confirm('清除云端配置，回到本地规则模式？')) {
        JJData.clearAIConfig();
        showToast('✓ 已清除');
        this.render(document.getElementById('page-container'));
        if (window.lucide) window.lucide.createIcons();
      }
    });
    document.getElementById('btn-cfg-test').addEventListener('click', async () => {
      const status = document.getElementById('cfg-status');
      JJData.saveAIConfig({
        base_url: document.getElementById('cfg-base-url').value,
        api_key: document.getElementById('cfg-api-key').value,
        model: document.getElementById('cfg-model').value,
      });
      if (!JJData.isCloudAIReady()) { status.innerHTML = '<span class="text-amber-600">请先完整填写三项配置</span>'; return; }
      status.innerHTML = '<span class="text-slate-500">正在连接...</span>';
      try {
        const reply = await this.askCloud('你好，请用一句话介绍你自己');
        status.innerHTML = `<span class="text-teal-700">✓ 连接成功，模型回复：${reply.slice(0, 60)}${reply.length > 60 ? '...' : ''}</span>`;
      } catch (e) {
        status.innerHTML = `<span class="text-rose-600">✕ 连接失败：${e.message}</span>`;
      }
    });
  },

  renderChatPanel() {
    return `
      <div class="card">
        <div id="chat-messages" class="space-y-4 min-h-64 max-h-[500px] overflow-y-auto pb-3 border-b border-slate-100 scroll-smooth"></div>

        <div id="suggestions" class="mt-4 flex flex-wrap gap-2">
          <span class="text-xs text-slate-500 self-center flex items-center gap-1">
            <i data-lucide="lightbulb" class="w-3.5 h-3.5"></i>试试问：
          </span>
          <button class="suggestion-btn badge badge-teal hover:bg-teal-100 transition-colors">按日期归纳近7天血压</button>
          <button class="suggestion-btn badge badge-teal hover:bg-teal-100 transition-colors">我最近的睡眠怎么样？</button>
          <button class="suggestion-btn badge badge-teal hover:bg-teal-100 transition-colors">就诊前还缺什么记录？</button>
          <button class="suggestion-btn badge badge-teal hover:bg-teal-100 transition-colors">有没有数据缺口的日期？</button>
        </div>

        <div class="mt-4 flex gap-2">
          <textarea id="chat-input" rows="2" class="field-input resize-none" placeholder="输入问题，AI 基于你的记录整理回答..."></textarea>
        </div>
        <div class="mt-2 flex gap-2">
          <button id="btn-chat-send" class="btn-primary">
            <i data-lucide="send" class="w-4 h-4"></i>发送
          </button>
          <button id="btn-chat-clear" class="btn-secondary">
            <i data-lucide="trash-2" class="w-4 h-4"></i>清空对话
          </button>
        </div>
      </div>
    `;
  },

  bindChat() {
    const input = document.getElementById('chat-input');
    // 开场：自动展示近7天数据摘要（体现 AI 基于真实数据工作）
    this.showWelcomeSummary();

    const send = async () => {
      const q = input.value.trim();
      if (!q || this.busy) return;
      this.busy = true;
      this.addMessage('user', q);
      input.value = '';
      const loadingId = this.addLoading();
      try {
        let ans;
        if (JJData.isCloudAIReady()) {
          try {
            const text = await this.askCloud(q);
            ans = { text, points: null, source: 'cloud', sourceLabel: '云端大模型' };
          } catch (e) {
            this.removeLoading(loadingId);
            this.addMessage('ai', `⚠ 云端调用失败（${e.message}），已切换本地规则回答：`, null, 'local', '近14天记录');
            ans = { ...this.generateAnswer(q), source: 'local' };
            this.busy = false;
            this.removeLoading(loadingId);
            this.addMessage('ai', ans.text, ans.points, ans.source, ans.sourceLabel);
            return;
          }
        } else {
          await new Promise(r => setTimeout(r, 400));
          ans = { ...this.generateAnswer(q), source: 'local' };
        }
        this.removeLoading(loadingId);
        this.addMessage('ai', ans.text, ans.points, ans.source, ans.sourceLabel);
      } finally {
        this.busy = false;
      }
    };
    document.getElementById('btn-chat-send').addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    document.getElementById('btn-chat-clear').addEventListener('click', () => {
      this.history = [];
      document.getElementById('chat-messages').innerHTML = '';
      showToast('✓ 对话已清空');
    });
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('chat-input').value = btn.textContent;
        send();
      });
    });
  },

  // ========== 开场数据摘要（基于近7天真实数据） ==========
  showWelcomeSummary() {
    const range = JJData.getRecentEntries(7);
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const points = [];
    if (range.length === 0) {
      points.push('你近期还没有健康记录，建议先在「健康记录」中录入数据');
    } else {
      const bp = JJData.calcStats(range.map(e => e.systolic));
      const hr = JJData.calcStats(range.map(e => e.heart_rate));
      const sleep = JJData.calcStats(range.map(e => e.sleep_hours));
      const bpAbnormal = range.filter(e => e.systolic > 140);
      const discomfort = range.filter(e => e.discomfort);
      if (bp.count > 0) {
        const maxBp = range.reduce((m, e) => (e.systolic && (!m || e.systolic > m.systolic) ? e : m), null);
        points.push(`血压：均值 ${bp.mean}mmHg，最高 ${maxBp.systolic}（${maxBp.date.slice(5)}）${bpAbnormal.length > 0 ? `，${bpAbnormal.length}天>140` : ''}`);
      }
      if (hr.count > 0) points.push(`心率：均值 ${hr.mean} 次/分`);
      if (sleep.count > 0) {
        const low = range.filter(e => e.sleep_hours < 6.5).length;
        points.push(`睡眠：均值 ${sleep.mean}h${low > 0 ? `，${low}天不足6.5h` : ''}`);
      }
      if (discomfort.length > 0) points.push(`不适：${discomfort.map(d => `${d.date.slice(5)} ${d.discomfort}`).join('；')}`);
    }

    const text = `你好！我已读取你近7天的健康记录，整理如下：`;
    this.addMessage('ai', text, points, 'local', '近7天记录');
  },

  addLoading() {
    const id = 'loading-' + Date.now();
    const container = document.getElementById('chat-messages');
    container.insertAdjacentHTML('beforeend', `
      <div id="${id}" class="max-w-[85%]">
        <div class="text-xs text-slate-400 mb-1 px-1">健迹 AI</div>
        <div class="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
          <span class="inline-flex gap-1">
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
          </span>正在整理你的记录...
        </div>
      </div>
    `);
    container.scrollTop = container.scrollHeight;
    return id;
  },

  removeLoading(id) {
    document.getElementById(id)?.remove();
  },

  addMessage(role, text, points = null, source = null, sourceLabel = null) {
    const container = document.getElementById('chat-messages');
    const cls = role === 'user' ? 'bg-teal-600 text-white ml-auto' : 'bg-slate-100 text-slate-800';
    const label = role === 'user' ? '你' : (source === 'cloud' ? '健迹 AI · 云端' : '健迹 AI · 本地规则');
    // 简单 markdown：换行 + 粗体
    const html = String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
    container.insertAdjacentHTML('beforeend', `
      <div class="max-w-[85%] ${role === 'user' ? 'ml-auto' : ''}">
        <div class="text-xs text-slate-400 mb-1 px-1">${label}${sourceLabel ? ` · <span class="text-teal-500 flex inline-flex items-center gap-0.5"><i data-lucide="database" class="w-3 h-3"></i>${sourceLabel}</span>` : ''}</div>
        <div class="${cls} rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}">
          <div>${html}</div>
          ${points ? `<ul class="list-disc list-inside text-xs mt-2 opacity-85 space-y-0.5">${points.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
    `);
    container.scrollTop = container.scrollHeight;
    this.history.push({ role, text });
    if (window.lucide) window.lucide.createIcons();
  },

  // ========== 云端大模型调用（OpenAI 兼容） ==========
  async askCloud(question) {
    const cfg = JJData.getAIConfig();
    const entries = JJData.getAllEntries().slice(0, 30).map(e => {
      const { original_text, ...rest } = e;
      return rest;
    });
    const systemPrompt = [
      '你是「健迹」个人健康助手中的 AI 模块。严格遵守以下规则：',
      '1. 只能基于用户消息中提供的健康记录 JSON 数据进行归纳、整理和客观描述；',
      '2. 不做医学诊断、不推测病因、不给出用药或治疗建议；',
      '3. 数据缺失或不足时明确说明，不编造数值；',
      '4. 回答用中文，简洁清晰，可使用要点列表；',
      '5. 回答末尾固定附一句：以上仅为个人数据整理，不构成医疗建议。',
    ].join('\n');
    const userMsg = `我的健康记录（JSON，按日期倒序）：\n${JSON.stringify(entries)}\n\n我的问题：${question}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    let resp;
    try {
      resp = await fetch(`${cfg.base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.api_key}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      throw new Error(e.name === 'AbortError' ? '请求超时（30秒）' : '网络错误，请检查网络或 API 地址');
    }
    clearTimeout(timer);
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status}${resp.status === 401 ? '（Key 无效）' : ''} ${errText.slice(0, 80)}`);
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('模型返回为空');
    return content;
  },

  // ========== 本地规则引擎（降级兜底） ==========
  generateAnswer(question) {
    const entries = JJData.getAllEntries().slice(0, 30);
    const q = question.toLowerCase();
    const points = [];

    if (/血压|收缩压|舒张压/.test(q)) {
      const range = JJData.getRecentEntries(14);
      const sysStats = JJData.calcStats(range.map(e => e.systolic));
      const diaStats = JJData.calcStats(range.map(e => e.diastolic));
      points.push(`近14天收缩压均值 ${sysStats.mean ?? '—'}（${sysStats.min ?? '—'}~${sysStats.max ?? '—'}），${sysStats.count} 条有效`);
      points.push(`近14天舒张压均值 ${diaStats.mean ?? '—'}（${diaStats.min ?? '—'}~${diaStats.max ?? '—'}）`);
      const abnormal = range.filter(e => e.systolic > 140);
      if (abnormal.length > 0) points.push(`⚠️ 有 ${abnormal.length} 天收缩压超过140（${abnormal.map(e => e.date).join('、')}）`);
      return { text: `以下是基于已确认记录的血压整理草稿：`, points, sourceLabel: '近14天记录' };
    }
    if (/睡眠/.test(q)) {
      const range = JJData.getRecentEntries(14);
      const stats = JJData.calcStats(range.map(e => e.sleep_hours));
      points.push(`近14天睡眠均值 ${stats.mean ?? '—'} 小时，${stats.count} 条有效`);
      const lowSleep = range.filter(e => e.sleep_hours && e.sleep_hours < 6.5);
      if (lowSleep.length > 0) points.push(`⚠️ 有 ${lowSleep.length} 天睡眠不足6.5小时（${lowSleep.map(e => `${e.date}: ${e.sleep_hours}h`).join('、')}）`);
      return { text: `睡眠数据整理：`, points, sourceLabel: '近14天记录' };
    }
    if (/心率/.test(q)) {
      const range = JJData.getRecentEntries(14);
      const stats = JJData.calcStats(range.map(e => e.heart_rate));
      points.push(`近14天心率均值 ${stats.mean ?? '—'} 次/分，${stats.count} 条有效`);
      return { text: `心率数据整理：`, points, sourceLabel: '近14天记录' };
    }
    if (/缺口|缺失|漏/.test(q)) {
      const range = JJData.getRecentEntries(14);
      const allDates = [];
      for (let i = 13; i >= 0; i--) allDates.push(JJData.localDateStr(-i));
      const gaps = allDates.filter(d => !range.map(e => e.date).includes(d));
      if (gaps.length === 0) return { text: `近14天记录完整，没有缺口。`, points: [], sourceLabel: '近14天记录' };
      points.push(`近14天有 ${gaps.length} 天未记录：`);
      gaps.forEach(g => points.push(`· ${g}`));
      return { text: `以下日期没有记录，建议补录或在就诊时说明：`, points, sourceLabel: '近14天记录' };
    }
    if (/就诊|准备|缺/.test(q)) {
      const range = JJData.getRecentEntries(14);
      if (range.length === 0) return { text: `近14天没有任何记录，就诊前建议至少测量一次血压、心率、血糖并记录。`, points: [], sourceLabel: '近14天记录' };
      const bpCount = range.filter(e => e.systolic).length;
      const hrCount = range.filter(e => e.heart_rate).length;
      const sleepCount = range.filter(e => e.sleep_hours).length;
      if (bpCount < 7) points.push(`· 血压记录较少（${bpCount}/14天），建议测量并记录`);
      if (hrCount < 7) points.push(`· 心率记录较少（${hrCount}/14天）`);
      if (sleepCount < 7) points.push(`· 睡眠记录较少（${sleepCount}/14天）`);
      const discomfortDays = range.filter(e => e.discomfort);
      if (discomfortDays.length > 0) {
        points.push(`· 有 ${discomfortDays.length} 天记录了不适：`);
        discomfortDays.forEach(d => points.push(`  ${d.date}: ${d.discomfort}`));
      }
      if (points.length === 0) points.push(`· 各项指标记录比较完整，可直接使用"就诊准备"生成自述卡`);
      return { text: `就诊前信息整理建议（基于已确认记录）：`, points, sourceLabel: '近14天记录' };
    }
    if (/归纳|总结|整理/.test(q)) {
      const range = JJData.getRecentEntries(7);
      if (range.length === 0) return { text: `近7天没有记录。`, points: [], sourceLabel: '近7天记录' };
      points.push(`共 ${range.length} 条有效记录`);
      const bpStats = JJData.calcStats(range.map(e => e.systolic));
      if (bpStats.count > 0) points.push(`血压：均值 ${bpStats.mean}mmHg，范围 ${bpStats.min}~${bpStats.max}`);
      const hrStats = JJData.calcStats(range.map(e => e.heart_rate));
      if (hrStats.count > 0) points.push(`心率：均值 ${hrStats.mean} 次/分`);
      const sleepStats = JJData.calcStats(range.map(e => e.sleep_hours));
      if (sleepStats.count > 0) points.push(`睡眠：均值 ${sleepStats.mean}h`);
      return { text: `近7天已确认记录归纳：`, points, sourceLabel: '近7天记录' };
    }
    if (entries.length === 0) {
      return { text: `你的健康记录目前为空。可以先在"健康记录"中添加数据，AI 助手才能帮你整理。`, points: [], sourceLabel: '全部记录' };
    }
    return {
      text: `我理解这个问题。让我基于你已确认的记录整理一下——你共有 ${entries.length} 条健康记录，最近一条在 ${entries[0]?.date || '—'}。你可以试试更具体的问法。`,
      points: [],
      sourceLabel: '全部记录'
    };
  }
};

window.JJAssistant = JJAssistant;
