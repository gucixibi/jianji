/**
 * 健迹 - 主应用
 * 路由 / 导航 / Toast / 全局初始化 / 服药提醒引擎
 */

const JJApp = {
  currentRoute: 'overview',
  _reminderTimer: null,
  _reminderFired: new Set(), // 今日已提醒过的 slot: "date|med_id|time_slot"

  init() {
    // 初始化数据库（首次加载演示数据）
    JJData.initDB();

    // 绑定导航
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.dataset.route;
        this.navigate(route);
        this.closeDrawer();
      });
    });

    // 移动端菜单
    document.getElementById('btn-menu')?.addEventListener('click', () => this.openDrawer());

    // 渲染移动端抽屉导航
    this.renderDrawerNav();

    // 默认页面
    this.navigate('overview');

    // 初始化 Lucide 图标（静态 + 动态渲染都要）
    if (window.lucide) { window.lucide.createIcons(); }

    // 启动服药提醒引擎（如果用户已开启）
    if (JJData.isReminderEnabled()) this.startReminderEngine();
  },

  /* ============== 服药提醒引擎 ============== */

  /** 启动全局提醒定时器（30秒一次） */
  startReminderEngine() {
    if (this._reminderTimer) return;
    this.checkReminders(); // 立即跑一次
    this._reminderTimer = setInterval(() => this.checkReminders(), 30000);
  },

  /** 停止提醒定时器 */
  stopReminderEngine() {
    if (this._reminderTimer) {
      clearInterval(this._reminderTimer);
      this._reminderTimer = null;
    }
  },

  /**
   * 检查今日所有服药时间点，到期则弹提醒
   * - 粒度：(date, med_id, time_slot)
   * - 到点窗口：当前 HH:MM === 预设 HH:MM 或在前后 1 分钟内
   * - 防重复：用内存 Set 记录"今日已提醒过"
   * - 跳过：checkin 已是 done/late 的 slot 不提醒
   */
  checkReminders() {
    const now = new Date();
    const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = JJData.TODAY_STR;
    const meds = JJData.getMedications();
    const checkins = JJData.getCheckins();

    meds.forEach(med => {
      (med.times || []).forEach(slot => {
        const firedKey = `${today}|${med.id}|${slot}`;
        if (this._reminderFired.has(firedKey)) return; // 今日已提醒过

        // 检查当前时间是否在该 slot 的 ±1 分钟窗口内
        if (!this._isTimeNear(nowHM, slot, 1)) return;

        // 检查该 slot 是否已打卡完成
        const ci = checkins.find(c => c.date === today && c.med_id === med.id && c.time_slot === slot);
        if (ci && (ci.status === 'done' || ci.status === 'late')) return;

        // 触发提醒
        this._reminderFired.add(firedKey);
        this._fireReminder(med, slot);
      });
    });
  },

  /** 判断两个 HH:MM 是否在 n 分钟内 */
  _isTimeNear(a, b, windowMin = 1) {
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    const diff = Math.abs((ah * 60 + am) - (bh * 60 + bm));
    return diff <= windowMin;
  },

  /** 触发提醒：Toast + Notification（如授权） */
  _fireReminder(med, slot) {
    const title = `${med.name} · ${med.dosage}`;
    const body = `到点了：${slot} · ${med.notes || '点击服药管理打卡'}`;
    showToast(`⏰ ${title} — ${slot} 该服用了`);

    // 桌面通知（浏览器 Notification API）
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('健迹 · 服药提醒', {
          body,
          tag: `jianji-med-${med.id}-${slot}`,
          silent: false,
        });
      }
    } catch (e) { /* file:// 协议下可能抛错，忽略 */ }
  },

  /** 请求浏览器 Notification 权限（服药页 toggle 开启时调用） */
  async requestNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const res = await Notification.requestPermission();
      return res; // 'granted' | 'denied'
    } catch { return 'error'; }
  },

  /** 仅用于演示/测试：强制触发一次提醒（medication.js 可调用） */
  forceReminderCheck() { this.checkReminders(); },

  renderDrawerNav() {
    const nav = document.getElementById('drawer-nav');
    if (!nav) return;
    const routes = [
      { key: 'overview', label: '概览', icon: 'home' },
      { key: 'record', label: '健康记录', icon: 'clipboard-list' },
      { key: 'trend', label: '趋势回顾', icon: 'trending-up' },
      { key: 'visit', label: '就诊准备', icon: 'stethoscope' },
      { key: 'assistant', label: 'AI 助手', icon: 'bot' },
      { key: 'medication', label: '服药管理', icon: 'pill' },
      { key: 'privacy', label: '数据与隐私', icon: 'shield-check' },
    ];
    nav.innerHTML = routes.map(r => `
      <a href="#" data-drawer="${r.key}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">
        <i data-lucide="${r.icon}" class="w-[18px] h-[18px]"></i> ${r.label}
      </a>
    `).join('');
    nav.querySelectorAll('[data-drawer]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(item.dataset.drawer);
        this.closeDrawer();
      });
    });
    if (window.lucide) { window.lucide.createIcons(); }
  },

  navigate(route) {
    this.currentRoute = route;

    // 更新导航高亮
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });

    // 渲染对应页面
    const container = document.getElementById('page-container');
    const scrollTarget = container;

    switch (route) {
      case 'overview':   JJOverview.render(container); break;
      case 'record':     JJRecord.render(container); break;
      case 'trend':      JJTrend.render(container); break;
      case 'visit':      JJVisit.render(container); break;
      case 'assistant':  JJAssistant.render(container); break;
      case 'medication': JJMedication.render(container); break;
      case 'privacy':    JJPrivacy.render(container); break;
      default:           JJOverview.render(container);
    }

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 重新初始化 Lucide 图标（动态渲染后）
    if (window.lucide) { window.lucide.createIcons(); }
  },

  openDrawer() {
    document.getElementById('drawer')?.classList.remove('hidden');
  },

  closeDrawer() {
    document.getElementById('drawer')?.classList.add('hidden');
  },

  /**
   * 共享空数据引导卡（各页面 render() 开头调用）
   * @param {string} pageName  当前页面名称（用于提示文案）
   * @returns {string} HTML
   */
  renderEmptyState(pageName = '当前页面') {
    return `
      <div class="card text-center py-10 px-6">
        <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4"
             style="background:#eef4fb;">
          <i data-lucide="folder-open" class="w-6 h-6" style="color:#2d5791;"></i>
        </div>
        <h3 class="text-[15px] font-semibold text-slate-800">暂无健康记录</h3>
        <p class="text-[13px] text-slate-500 mt-1.5 max-w-[320px] mx-auto">
          ${pageName} 需要先有至少一条健康记录才能展示数据。可以恢复演示数据或立即开始手动录入。
        </p>
        <div class="flex items-center justify-center gap-2 mt-5 flex-wrap">
          <button onclick="JJApp.restoreDemo()" class="btn-secondary text-[13px]">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>恢复演示数据
          </button>
          <button onclick="JJApp.navigate('record')" class="btn-primary text-[13px]">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>去手动录入
          </button>
        </div>
      </div>
    `;
  },

  /** 一键恢复演示数据（供空状态按钮调用） */
  restoreDemo() {
    localStorage.removeItem(JJData.DB_KEY);
    JJData.initDB();
    showToast('✓ 已恢复演示数据');
    location.reload();
  }
};

// Toast 工具
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2500);
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
  JJApp.init();
  // 暴露到全局供 onclick 使用
  window.JJApp = JJApp;
  window.showToast = showToast;
});
