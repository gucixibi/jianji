/**
 * 健迹 - 主应用
 * 路由 / 导航 / Toast / 全局初始化
 */

const JJApp = {
  currentRoute: 'overview',

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
  },

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
      { key: 'wheel', label: '选择转轮', icon: 'dices' },
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
      case 'wheel':      JJWheel.render(container); break;
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
