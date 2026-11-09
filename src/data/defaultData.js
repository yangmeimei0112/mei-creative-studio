/**
 * 咩創意工作室 Mei Creative Studio — 預設品牌、分類、示範專案與版本動態資料
 * 全站 100% 採用 Lucide 圖示名稱，嚴禁使用任何 Emoji
 */

export const STUDIO_CONFIG = {
  studioNameZh: '咩創意工作室',
  studioNameEn: 'Mei Creative Studio',
  tagline: '創意無限∞咩有極限',
  description: '創意無限∞咩有極限',
  themeColor: '#38BDF8',
  version: 'v1.0.0',
  defaultAdminPin: 'mei888'
};

/**
 * 將任意格式之圖示名稱 (如 WandSparkles, circle_play, Gamepad2) 正規化為 Lucide kebab-case
 */
export function normalizeLucideIconName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'cloud';
  return rawName
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Za-z])([0-9]+)/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

export const PROJECT_CATEGORIES = [
  {
    id: 'all',
    name: '全部專案',
    enName: 'All Projects',
    icon: 'layout-grid',
    description: '瀏覽工作室所有公開與已解鎖之專案'
  },
  {
    id: 'ai-automation',
    name: 'AI 與自動化工具',
    enName: 'AI & Automation',
    icon: 'bot',
    subIcons: ['bot', 'cpu', 'wand-sparkles', 'workflow'],
    description: '智慧代理、LLM 工作流、自動化腳本與生產力助手'
  },
  {
    id: 'web-business',
    name: '網站與商業應用',
    enName: 'Web & Business Apps',
    icon: 'globe',
    subIcons: ['globe', 'app-window', 'layout-dashboard', 'briefcase'],
    description: '全端 Web 應用、品牌形象官網、SaaS 商業系統與電商平台'
  },
  {
    id: 'interactive-media',
    name: '互動設計與多媒體',
    enName: 'Interactive & Media',
    icon: 'circle-play',
    subIcons: ['circle-play', 'gamepad-2', 'palette', 'film', 'layers'],
    description: 'WebGL 視覺實驗、互動畫布、多媒體音訊與小遊戲創作'
  }
];

export const PROJECT_STATUS_META = {
  online: {
    id: 'online',
    label: '正式上線',
    enLabel: 'Online',
    icon: 'circle-check',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400',
    badgeClass:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
  },
  beta: {
    id: 'beta',
    label: '測試 Beta',
    enLabel: 'Beta',
    icon: 'activity',
    dotClass: 'bg-sky-500 dark:bg-sky-400',
    badgeClass: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30'
  },
  maintenance: {
    id: 'maintenance',
    label: '維護更新中',
    enLabel: 'Maintenance',
    icon: 'triangle-alert',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
    badgeClass:
      'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30'
  },
  offline: {
    id: 'offline',
    label: '離線待命',
    enLabel: 'Offline',
    icon: 'wifi-off',
    dotClass: 'bg-rose-500 dark:bg-rose-400',
    badgeClass: 'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30'
  }
};

export const DEFAULT_PROJECTS = [];

export const DEFAULT_CHANGELOG = [
  {
    id: 'pulse-2026-11-10',
    version: 'v1.0.0',
    date: '2026-11-10',
    title: '咩創意工作室專案平台正式上線',
    category: '官方動態',
    icon: 'sparkles',
    summary:
      '整合工作室旗下各項數位工具與創意專案，支援線上互動預覽、連線狀態即時檢測與行動裝置掃碼功能。'
  }
];
