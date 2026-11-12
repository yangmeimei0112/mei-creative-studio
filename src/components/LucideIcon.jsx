import React from 'react';
import {
  Activity,
  AppWindow,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bell,
  Blocks,
  BookOpen,
  Bot,
  Box,
  BrainCircuit,
  Briefcase,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CirclePlay,
  Clock,
  Cloud,
  Code2,
  Command,
  Compass,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode,
  FileJson,
  Film,
  Filter,
  Fingerprint,
  FolderGit2,
  Gamepad2,
  GitCommitHorizontal,
  Globe,
  HardDrive,
  Heart,
  History,
  Home,
  Image,
  Info,
  KeyRound,
  Laptop,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Lock,
  LockOpen,
  LogOut,
  Mail,
  Maximize2,
  MessageSquareCode,
  Mic,
  Milestone,
  Monitor,
  Moon,
  Music,
  Orbit,
  Package,
  Palette,
  PanelRightOpen,
  Pencil,
  Pin,
  PinOff,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Rocket,
  RotateCcw,
  ScanFace,
  ScanLine,
  Search,
  Send,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Terminal,
  Trash2,
  TriangleAlert,
  Upload,
  UserCheck,
  UserCog,
  Video,
  WandSparkles,
  Wifi,
  WifiOff,
  Workflow,
  Wrench,
  X,
  Zap,
  CornerDownLeft
} from 'lucide-react';

/**
 * 全站 Lucide 圖示註冊表 (Lucide Icon Registry)
 * 100% 遵循 https://lucide.dev/ 命名規範，嚴禁混用任何系統 Emoji
 */
export const LUCIDE_ICON_MAP = {
  'activity': Activity,
  'app-window': AppWindow,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-up-right': ArrowUpRight,
  'bell': Bell,
  'blocks': Blocks,
  'book-open': BookOpen,
  'bot': Bot,
  'box': Box,
  'brain-circuit': BrainCircuit,
  'briefcase': Briefcase,
  'calendar': Calendar,
  'camera': Camera,
  'check': Check,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-dot': CircleDot,
  'circle-play': CirclePlay,
  'clock': Clock,
  'cloud': Cloud,
  'code-2': Code2,
  'command': Command,
  'compass': Compass,
  'copy': Copy,
  'corner-down-left': CornerDownLeft,
  'cpu': Cpu,
  'database': Database,
  'download': Download,
  'external-link': ExternalLink,
  'eye': Eye,
  'eye-off': EyeOff,
  'file-code': FileCode,
  'file-json': FileJson,
  'film': Film,
  'filter': Filter,
  'fingerprint': Fingerprint,
  'folder-git-2': FolderGit2,
  'gamepad-2': Gamepad2,
  'git-commit-horizontal': GitCommitHorizontal,
  'globe': Globe,
  'hard-drive': HardDrive,
  'heart': Heart,
  'history': History,
  'home': Home,
  'image': Image,
  'info': Info,
  'key-round': KeyRound,
  'laptop': Laptop,
  'layers': Layers,
  'layout-dashboard': LayoutDashboard,
  'layout-grid': LayoutGrid,
  'link-2': Link2,
  'lock': Lock,
  'lock-open': LockOpen,
  'log-out': LogOut,
  'mail': Mail,
  'maximize-2': Maximize2,
  'message-square-code': MessageSquareCode,
  'mic': Mic,
  'milestone': Milestone,
  'monitor': Monitor,
  'moon': Moon,
  'music': Music,
  'orbit': Orbit,
  'package': Package,
  'palette': Palette,
  'panel-right-open': PanelRightOpen,
  'pencil': Pencil,
  'pin': Pin,
  'pin-off': PinOff,
  'plus': Plus,
  'qr-code': QrCode,
  'radio': Radio,
  'refresh-cw': RefreshCw,
  'rocket': Rocket,
  'rotate-ccw': RotateCcw,
  'scan-face': ScanFace,
  'scan-line': ScanLine,
  'search': Search,
  'send': Send,
  'server': Server,
  'settings': Settings,
  'share-2': Share2,
  'shield-check': ShieldCheck,
  'sliders-horizontal': SlidersHorizontal,
  'smartphone': Smartphone,
  'sparkles': Sparkles,
  'star': Star,
  'sun': Sun,
  'terminal': Terminal,
  'trash-2': Trash2,
  'triangle-alert': TriangleAlert,
  'upload': Upload,
  'user-check': UserCheck,
  'user-cog': UserCog,
  'video': Video,
  'wand-sparkles': WandSparkles,
  'wifi': Wifi,
  'wifi-off': WifiOff,
  'workflow': Workflow,
  'wrench': Wrench,
  'x': X,
  'zap': Zap
};

/**
 * 後台視覺化 Lucide 圖示挑選器分類清單 (48 款精選 Lucide 圖示)
 */
export const LUCIDE_PICKER_GROUPS = [
  {
    groupName: '品牌與雲端靈感',
    icons: [
      { name: 'cloud', label: '雲朵 Cloud' },
      { name: 'sparkles', label: '靈感火花 Sparkles' },
      { name: 'rocket', label: '火箭啟動 Rocket' },
      { name: 'zap', label: '極速閃電 Zap' },
      { name: 'compass', label: '探索羅盤 Compass' },
      { name: 'orbit', label: '星軌生態 Orbit' },
      { name: 'star', label: '精選星標 Star' },
      { name: 'heart', label: '喜愛收藏 Heart' },
      { name: 'milestone', label: '里程碑 Milestone' },
      { name: 'shield-check', label: '安全防護 Shield' },
      { name: 'bell', label: '動態通知 Bell' },
      { name: 'home', label: '大廳首頁 Home' }
    ]
  },
  {
    groupName: 'AI 與自動化工具',
    icons: [
      { name: 'bot', label: 'AI 機器人 Bot' },
      { name: 'cpu', label: '運算核心 CPU' },
      { name: 'wand-sparkles', label: '魔法生成 Wand' },
      { name: 'workflow', label: '自動化流程 Workflow' },
      { name: 'brain-circuit', label: '神經網路 Brain' },
      { name: 'message-square-code', label: '對話助手 Chat' },
      { name: 'terminal', label: '終端指令 Terminal' },
      { name: 'code-2', label: '程式開發 Code' },
      { name: 'file-code', label: '程式碼檔 FileCode' },
      { name: 'file-json', label: '結構資料 FileJson' },
      { name: 'wrench', label: '開發工具 Wrench' },
      { name: 'activity', label: '即時監控 Activity' }
    ]
  },
  {
    groupName: '網站與商業應用',
    icons: [
      { name: 'globe', label: '全球網站 Globe' },
      { name: 'app-window', label: '網頁應用 Window' },
      { name: 'layout-dashboard', label: '數據儀表板 Dashboard' },
      { name: 'briefcase', label: '商務專案 Briefcase' },
      { name: 'layout-grid', label: '模組方格 Grid' },
      { name: 'database', label: '資料庫 Database' },
      { name: 'server', label: '雲端伺服器 Server' },
      { name: 'blocks', label: '系統模組 Blocks' },
      { name: 'book-open', label: '知識文件 Docs' },
      { name: 'folder-git-2', label: '版本倉庫 Repo' },
      { name: 'laptop', label: '桌面系統 Laptop' },
      { name: 'package', label: '產品套件 Package' }
    ]
  },
  {
    groupName: '互動設計與多媒體',
    icons: [
      { name: 'circle-play', label: '影音播放 Play' },
      { name: 'gamepad-2', label: '互動遊戲 Gamepad' },
      { name: 'palette', label: '視覺調色盤 Palette' },
      { name: 'film', label: '動態影像 Film' },
      { name: 'layers', label: '視覺圖層 Layers' },
      { name: 'camera', label: '攝影視覺 Camera' },
      { name: 'image', label: '圖像創作 Image' },
      { name: 'music', label: '聲音設計 Music' },
      { name: 'video', label: '串流視訊 Video' },
      { name: 'mic', label: '語音互動 Mic' },
      { name: 'radio', label: '即時串流 Radio' },
      { name: 'smartphone', label: '行動互動 Mobile' }
    ]
  }
];

import { normalizeLucideIconName } from '../data/defaultData.js';

export { normalizeLucideIconName };

/**
 * 取得指定 Lucide 圖示之繁體中文顯示名稱
 */
export function getLucideIconZhName(iconName) {
  if (!iconName) return '雲朵';
  const normalized = normalizeLucideIconName(iconName);
  for (const group of LUCIDE_PICKER_GROUPS) {
    const found = group.icons.find((item) => item.name === normalized);
    if (found) {
      return found.label.replace(/\s+[A-Za-z0-9]+$/, '');
    }
  }
  return normalized;
}

/**
 * 全站統一 Lucide 圖示組件
 * 強制預設：
 * - strokeWidth = 1.75
 * - absoluteStrokeWidth = true
 */
export function LucideIcon({
  name = 'cloud',
  size = 20,
  strokeWidth = 1.75,
  absoluteStrokeWidth = true,
  className = '',
  ...rest
}) {
  const normalizedName = normalizeLucideIconName(name);
  const IconComponent = LUCIDE_ICON_MAP[normalizedName] || Cloud;

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={absoluteStrokeWidth}
      className={`lucide-icon-token shrink-0 ${className}`.trim()}
      data-lucide-name={normalizedName}
      {...rest}
    />
  );
}

/**
 * 晴空淡藍柔光圓角圖示底座 (Squircle Icon Badge)
 * - 支援尺寸規格：2xs, xs, sm, md, lg, xl, 2xl
 * - 圓角與尺寸自適應，內含 #38BDF8 / #0284C7 晴空淡藍漸層與柔光邊框
 */
export function SquircleIconBadge({
  name = 'cloud',
  size = 'md',
  iconSize,
  className = '',
  children
}) {
  const dimensions = {
    '2xs': { box: 'w-5 h-5 rounded-[6px]', icon: 11 },
    xs: { box: 'w-6 h-6 rounded-[8px]', icon: 13 },
    sm: { box: 'w-9 h-9 rounded-[12px]', icon: 18 },
    md: { box: 'w-[44px] h-[44px] rounded-[14px]', icon: 22 },
    lg: { box: 'w-[56px] h-[56px] rounded-[18px]', icon: 28 },
    xl: { box: 'w-20 h-20 sm:w-24 sm:h-24 rounded-[26px] sm:rounded-[30px]', icon: 46 },
    '2xl': { box: 'w-28 h-28 sm:w-32 sm:h-32 rounded-[32px] sm:rounded-[36px]', icon: 58 }
  };

  const selected = dimensions[size] || dimensions.md;
  const resolvedIconSize = iconSize || selected.icon;

  return (
    <div
      className={`squircle-icon-badge inline-flex items-center justify-center shrink-0 transition-transform duration-300 ${selected.box} ${className}`.trim()}
    >
      {children || (
        <LucideIcon
          name={name}
          size={resolvedIconSize}
          strokeWidth={1.75}
          absoluteStrokeWidth={true}
        />
      )}
    </div>
  );
}

/**
 * 咩創意工作室統一品牌標誌徽章 (Studio Brand Logo Emblem)
 * - 核心意象：靈感雲朵 × 無限符號 (∞)
 * - 視覺風格：純粹極簡線性美學 (Pure Linear Minimalist)
 * - 統一 1.75 線寬、俐落黃金比例幾何負空間、深淺色自適應
 * - 支援標準尺寸：2xs, xs, sm, md, lg, xl, 2xl
 */
export function StudioLogo({
  size = 'md',
  className = '',
  badgeClassName = '',
  sparkleClassName = '',
  'data-testid': testId = 'studio-brand-logo',
  ...rest
}) {
  const sizeMap = {
    '2xs': {
      box: 'w-5 h-5 rounded-[6px]',
      icon: 11,
      sparkleBox: 'w-2.5 h-2.5 -top-0.5 -right-0.5',
      sparkleIcon: 6
    },
    xs: {
      box: 'w-6 h-6 rounded-[8px]',
      icon: 13,
      sparkleBox: 'w-3.5 h-3.5 -top-1 -right-1',
      sparkleIcon: 8
    },
    sm: {
      box: 'w-9 h-9 rounded-[12px]',
      icon: 18,
      sparkleBox: 'w-4 h-4 -top-1 -right-1',
      sparkleIcon: 9
    },
    md: {
      box: 'w-[44px] h-[44px] rounded-[14px]',
      icon: 22,
      sparkleBox: 'w-5 h-5 -top-1 -right-1',
      sparkleIcon: 11
    },
    lg: {
      box: 'w-[56px] h-[56px] rounded-[18px]',
      icon: 28,
      sparkleBox: 'w-6 h-6 -top-1.5 -right-1.5',
      sparkleIcon: 13
    },
    xl: {
      box: 'w-20 h-20 sm:w-24 sm:h-24 rounded-[26px] sm:rounded-[30px]',
      icon: 46,
      sparkleBox: 'w-8 h-8 sm:w-9 sm:h-9 -top-2 -right-2',
      sparkleIcon: 18
    },
    '2xl': {
      box: 'w-28 h-28 sm:w-32 sm:h-32 rounded-[32px] sm:rounded-[36px]',
      icon: 58,
      sparkleBox: 'w-10 h-10 sm:w-11 sm:h-11 -top-2.5 -right-2.5',
      sparkleIcon: 22
    }
  };

  const normalizedSize = sizeMap[size] ? size : 'md';
  const activeSize = sizeMap[size] ? size : 'md';
  const current = sizeMap[normalizedSize];

  return (
    <div
      className={`studio-brand-logo relative inline-flex items-center justify-center shrink-0 ${className}`.trim()}
      data-testid={testId}
      data-logo-size={normalizedSize}
      {...rest}
    >
      <div
        className={`squircle-icon-badge inline-flex items-center justify-center shrink-0 transition-transform duration-300 border border-sky-400/25 dark:border-sky-500/25 bg-sky-500/10 dark:bg-sky-400/10 ${current.box} ${badgeClassName}`.trim()}
      >
        {/* 純粹極簡線性：靈感雲朵 × 無限符號 (∞) */}
        <svg
          data-lucide-name="cloud"
          xmlns="http://www.w3.org/2000/svg"
          width={current.icon}
          height={current.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-sky-500 dark:text-sky-400 studio-infinity-cloud"
        >
          {/* 靈感雲朵輪廓 (Lucide Standard Anchor) */}
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          {/* 核心無限符號 (∞) 創意環 (Refined Orthogonal Lemniscate) */}
          <path d="M12 14.5c-1.2-1.2-2.4-1.8-3.6-1.8a1.8 1.8 0 1 0 0 3.6c1.2 0 2.4-.6 3.6-1.8Zm0 0c1.2 1.2 2.4 1.8 3.6 1.8a1.8 1.8 0 0 0 0-3.6c-1.2 0-2.4.6-3.6 1.8Z" />
        </svg>
      </div>
      <span
        aria-hidden="true"
        className={`studio-logo-sparkle absolute rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm border border-white/90 dark:border-slate-900/90 ${current.sparkleBox} ${sparkleClassName}`.trim()}
      >
        <LucideIcon
          name="sparkles"
          size={current.sparkleIcon}
          strokeWidth={1.75}
          absoluteStrokeWidth={true}
        />
      </span>
    </div>
  );
}

export default LucideIcon;
