/**
 * 健迹 - 选择转轮模块
 * 用户列出爱吃的菜/餐馆，系统随机转盘选择，解决选择困难
 */

const WHEEL_COLORS = [
  '#f97316', '#0ea5e9', '#22c55e', '#ef4444', '#a855f7',
  '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16',
  '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#8b5cf6',
];

const CATEGORY_LABELS = {
  all: '全部',
  dish: '菜品',
  restaurant: '餐馆',
};

const JJWheel = {
  state: {
    filter: 'all',
    spinning: false,
    currentRotation: 0,
    result: null,
  },

  render(container) {
    container.innerHTML = `
      <div class="space-y-5">
        ${this.renderHeader()}
        <div class="grid md:grid-cols-2 gap-5">
          <div id="wheel-area">${this.renderWheelCard()}</div>
          <div id="wheel-options">${this.renderOptionsCard()}</div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.drawWheel();
  },

  renderHeader() {
    return `
      <div class="card">
        <h2 class="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <i data-lucide="dices" class="w-5 h-5 text-amber-500"></i>选择转轮
        </h2>
        <p class="text-sm text-slate-500 mt-1">不知道吃什么？列出你爱吃的菜或想去的餐馆，让转盘替你决定。</p>
      </div>
    `;
  },

  renderWheelCard() {
    const active = this.getActiveOptions();
    const count = active.length;
    return `
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <i data-lucide="circle-dot" class="w-4 h-4 text-amber-500"></i>转盘
          <span class="badge badge-amber">${count} 个选项</span>
        </h3>
        <div class="flex flex-col items-center">
          <div class="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px]">
            <!-- 指针 -->
            <div class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 z-20">
              <div class="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-slate-800 drop-shadow" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));"></div>
            </div>
            <!-- 转盘画布 -->
            <div id="wheel-rotator" class="w-full h-full rounded-full" style="transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99); transform: rotate(0deg);">
              <canvas id="wheel-canvas" width="680" height="680" class="w-full h-full"></canvas>
            </div>
            <!-- 中心按钮 -->
            <button id="btn-spin" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white shadow-lg border-4 border-amber-400 hover:border-amber-500 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center z-10 ${count < 2 ? 'opacity-50 cursor-not-allowed' : ''}">
              <span class="text-amber-600 font-bold text-sm leading-tight">开始</span>
              <i data-lucide="play" class="w-4 h-4 text-amber-600 mt-0.5"></i>
            </button>
          </div>
          <div id="wheel-result" class="mt-5 min-h-[56px] text-center"></div>
          <p class="text-xs text-slate-400 mt-2">点击中心按钮开始旋转</p>
        </div>
      </div>
    `;
  },

  renderOptionsCard() {
    const options = JJData.getWheelOptions();
    const filtered = this.state.filter === 'all'
      ? options
      : options.filter(o => o.category === this.state.filter);
    const activeCount = options.filter(o => o.enabled).length;

    const items = filtered.map(o => this.renderOptionItem(o)).join('');

    return `
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-slate-800 flex items-center gap-2">
            <i data-lucide="list-checks" class="w-4 h-4 text-slate-500"></i>选项管理
            <span class="badge badge-slate">启用 ${activeCount} / ${options.length}</span>
          </h3>
          <div class="flex gap-1">
            <button id="btn-add-opt" class="btn-primary !py-1.5 !px-3 text-xs">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>添加
            </button>
            <button id="btn-reset-opt" class="btn-secondary !py-1.5 !px-3 text-xs" title="恢复默认">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- 分类筛选 -->
        <div class="flex gap-2 mb-3">
          ${['all', 'dish', 'restaurant'].map(c => `
            <button data-filter="${c}" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${this.state.filter === c ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
              ${CATEGORY_LABELS[c]}
            </button>
          `).join('')}
        </div>

        <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          ${items || '<div class="text-sm text-slate-500 text-center py-6">暂无选项，点击「添加」开始</div>'}
        </div>
      </div>
    `;
  },

  renderOptionItem(o) {
    const catBadge = o.category === 'dish'
      ? '<span class="badge badge-teal">菜品</span>'
      : '<span class="badge badge-indigo">餐馆</span>';
    return `
      <div class="flex items-center gap-3 p-3 rounded-xl border ${o.enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'} hover:border-slate-300 transition-colors">
        <label class="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" data-toggle-opt="${o.id}" class="sr-only peer" ${o.enabled ? 'checked' : ''}>
          <div class="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
        </label>
        <span class="text-xl shrink-0">${o.emoji || '🍽️'}</span>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-slate-800 truncate">${o.name}</div>
          <div class="mt-0.5">${catBadge}</div>
        </div>
        <div class="flex gap-0.5 shrink-0">
          <button data-edit-opt="${o.id}" class="text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg p-1.5 transition-colors" title="编辑">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          </button>
          <button data-del-opt="${o.id}" class="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-colors" title="删除">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  },

  renderEditModal(opt = null) {
    const o = opt || { name: '', emoji: '', category: 'dish' };
    const emojis = ['🍲','🍢','🍣','🍜','🍗','🌶️','🍔','🍕','🥟','🐟','🍱','🍛','🥘','🍝','🌮','🥗','🍤','🍖'];
    return `
      <div id="opt-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onclick="document.getElementById('opt-modal').remove()">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onclick="event.stopPropagation()">
          <h3 class="font-semibold text-lg mb-5 flex items-center gap-2">
            <i data-lucide="${opt ? 'pencil' : 'plus-circle'}" class="w-5 h-5 text-amber-500"></i>${opt ? '编辑' : '添加'}选项
          </h3>
          <div class="space-y-4">
            <div>
              <label class="field-label">名称</label>
              <input type="text" id="opt-name" class="field-input" value="${o.name}" placeholder="如：火锅、海底捞" />
            </div>
            <div>
              <label class="field-label">分类</label>
              <select id="opt-category" class="field-input">
                <option value="dish" ${o.category === 'dish' ? 'selected' : ''}>菜品</option>
                <option value="restaurant" ${o.category === 'restaurant' ? 'selected' : ''}>餐馆</option>
              </select>
            </div>
            <div>
              <label class="field-label">图标</label>
              <div class="flex flex-wrap gap-1.5">
                ${emojis.map(e => `
                  <button type="button" data-emoji="${e}" class="w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${o.emoji === e ? 'bg-teal-100 ring-2 ring-teal-400' : 'bg-slate-100 hover:bg-slate-200'}">${e}</button>
                `).join('')}
              </div>
              <input type="hidden" id="opt-emoji" value="${o.emoji || ''}" />
            </div>
          </div>
          <div class="flex gap-2 mt-6">
            <button id="btn-opt-save" class="btn-primary flex-1"><i data-lucide="save" class="w-4 h-4"></i>保存</button>
            <button id="btn-opt-cancel" class="btn-secondary flex-1">取消</button>
          </div>
        </div>
      </div>
    `;
  },

  // ========== 转轮绘制 ==========
  getActiveOptions() {
    const options = JJData.getWheelOptions();
    const list = this.state.filter === 'all'
      ? options.filter(o => o.enabled)
      : options.filter(o => o.enabled && o.category === this.state.filter);
    return list;
  },

  drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 10;
    const active = this.getActiveOptions();

    ctx.clearRect(0, 0, size, size);

    if (active.length === 0) {
      // 空状态
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请先添加选项', cx, cy);
      return;
    }

    const segAngle = (2 * Math.PI) / active.length;

    active.forEach((opt, i) => {
      const start = i * segAngle - Math.PI / 2; // 从顶部开始
      const end = start + segAngle;

      // 扇形
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 文字：旋转到扇形中心
      const mid = start + segAngle / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // emoji
      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(opt.emoji || '🍽️', 0, -radius * 0.68);
      // 名称
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 3;
      ctx.fillText(opt.name, 0, -radius * 0.45);
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // 外圈装饰
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.stroke();
  },

  // ========== 旋转逻辑 ==========
  spin() {
    if (this.state.spinning) return;
    const active = this.getActiveOptions();
    if (active.length < 2) {
      showToast('至少需要 2 个选项才能旋转');
      return;
    }

    this.state.spinning = true;
    this.state.result = null;
    document.getElementById('wheel-result').innerHTML = '';

    // 1. 先决定随机结果（等概率）
    const index = Math.floor(Math.random() * active.length);
    const segAngleDeg = 360 / active.length;
    const targetCenterDeg = index * segAngleDeg + segAngleDeg / 2; // 该扇形中心角（从顶部顺时针）

    // 2. 计算目标旋转角度：让 targetCenter 对齐顶部指针
    // 需要把扇形中心转到 12 点方向，即旋转 -targetCenterDeg
    const targetAngle = (360 - targetCenterDeg) % 360;
    let delta = targetAngle - (this.state.currentRotation % 360);
    if (delta < 0) delta += 360;
    const fullTurns = 5;
    this.state.currentRotation += fullTurns * 360 + delta;

    const rotator = document.getElementById('wheel-rotator');
    rotator.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    rotator.style.transform = `rotate(${this.state.currentRotation}deg)`;

    // 3. 动画结束后展示结果
    const onEnd = () => {
      rotator.removeEventListener('transitionend', onEnd);
      this.state.spinning = false;
      this.showResult(active[index]);
    };
    rotator.addEventListener('transitionend', onEnd);
  },

  showResult(opt) {
    this.state.result = opt;
    const el = document.getElementById('wheel-result');
    el.innerHTML = `
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
        <span class="text-2xl">${opt.emoji || '🎉'}</span>
        <div class="text-left">
          <div class="text-xs text-amber-600">今天就吃</div>
          <div class="font-bold text-amber-800 text-lg">${opt.name}</div>
        </div>
      </div>
    `;
    showToast(`🎉 就决定是「${opt.name}」啦！`);
  },

  // ========== 事件绑定 ==========
  bindEvents() {
    const self = this;

    // 旋转按钮
    document.getElementById('btn-spin')?.addEventListener('click', () => self.spin());

    // 分类筛选
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        self.state.filter = btn.dataset.filter;
        self.render(document.getElementById('page-container'));
      });
    });

    // 切换启用
    document.querySelectorAll('[data-toggle-opt]').forEach(cb => {
      cb.addEventListener('change', () => {
        JJData.toggleWheelOption(cb.dataset.toggleOpt);
        self.render(document.getElementById('page-container'));
      });
    });

    // 添加
    document.getElementById('btn-add-opt')?.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', self.renderEditModal());
      self.bindModal();
      if (window.lucide) { window.lucide.createIcons(); }
    });

    // 编辑
    document.querySelectorAll('[data-edit-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = JJData.getWheelOptions().find(o => o.id === btn.dataset.editOpt);
        document.body.insertAdjacentHTML('beforeend', self.renderEditModal(opt));
        self.bindModal(opt);
        if (window.lucide) { window.lucide.createIcons(); }
      });
    });

    // 删除
    document.querySelectorAll('[data-del-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = JJData.getWheelOptions().find(o => o.id === btn.dataset.delOpt);
        if (confirm(`确定删除「${opt?.name}」？`)) {
          JJData.deleteWheelOption(btn.dataset.delOpt);
          showToast('✓ 已删除');
          self.render(document.getElementById('page-container'));
        }
      });
    });

    // 重置默认
    document.getElementById('btn-reset-opt')?.addEventListener('click', () => {
      if (confirm('恢复默认选项？当前自定义内容将被覆盖。')) {
        JJData.resetWheelOptions();
        showToast('✓ 已恢复默认');
        self.render(document.getElementById('page-container'));
      }
    });
  },

  bindModal(existing = null) {
    const self = this;
    let selectedEmoji = existing?.emoji || '';

    document.getElementById('opt-emoji').value = selectedEmoji;

    document.querySelectorAll('[data-emoji]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedEmoji = btn.dataset.emoji;
        document.getElementById('opt-emoji').value = selectedEmoji;
        document.querySelectorAll('[data-emoji]').forEach(b => {
          b.classList.toggle('bg-teal-100', b.dataset.emoji === selectedEmoji);
          b.classList.toggle('ring-2', b.dataset.emoji === selectedEmoji);
          b.classList.toggle('ring-teal-400', b.dataset.emoji === selectedEmoji);
          b.classList.toggle('bg-slate-100', b.dataset.emoji !== selectedEmoji);
        });
      });
    });

    document.getElementById('btn-opt-cancel').addEventListener('click', () => document.getElementById('opt-modal').remove());

    document.getElementById('btn-opt-save').addEventListener('click', () => {
      const name = document.getElementById('opt-name').value.trim();
      if (!name) { showToast('请填写名称'); return; }
      JJData.saveWheelOption({
        id: existing?.id,
        name,
        emoji: selectedEmoji || '🍽️',
        category: document.getElementById('opt-category').value,
        enabled: existing?.enabled ?? true,
      });
      document.getElementById('opt-modal').remove();
      showToast('✓ 已保存');
      self.render(document.getElementById('page-container'));
    });
  }
};

window.JJWheel = JJWheel;
