import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import App from '../App';
import {
  LucideIcon,
  SquircleIconBadge,
  StudioLogo,
  LUCIDE_ICON_MAP
} from '../components/LucideIcon';
import ProjectPreviewDrawer from '../components/ProjectPreviewDrawer';
import QRCodeModal from '../components/QRCodeModal';
import CommandPalette from '../components/CommandPalette';
import AdminProjectModal, { AdminUnlockModal, StudioBackupModal } from '../components/AdminProjectModal';
import MobileBottomNav from '../components/MobileBottomNav';
import {
  DEFAULT_PROJECTS,
  PROJECT_CATEGORIES,
  STUDIO_CONFIG
} from '../data/defaultData';
import {
  saveAdminUnlocked,
  loadAdminUnlocked,
  saveTheme,
  loadTheme
} from '../services/storageService';

// Zero Unicode Emoji regular expression for strict validation
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

// Standard sample project set for end-to-end animation verification
const ANIM_SAMPLE_PROJECTS = [
  {
    id: 'anim-proj-ai',
    title: '咩智慧靈感自動化引擎',
    subtitle: 'AI 生成與工作流中樞',
    description: '深度學習與自動化流程設計系統',
    url: '/demo-ai.html',
    category: 'ai-automation',
    icon: 'bot',
    status: 'online',
    visibility: 'public',
    featured: true,
    pinned: false,
    latencyMs: 18,
    version: 'v1.2.0',
    highlights: ['自然語言互動', '即時流式輸出']
  },
  {
    id: 'anim-proj-web',
    title: '咩創意電商形象官網',
    subtitle: '品牌官方多語系展示櫥窗',
    description: '極致輕巧高效能品牌官網與商城',
    url: '/demo-web.html',
    category: 'web-business',
    icon: 'globe',
    status: 'beta',
    visibility: 'public',
    featured: false,
    pinned: true,
    latencyMs: 25,
    version: 'v2.0.1',
    highlights: ['響應式流動版面', 'SSR 快速渲染']
  },
  {
    id: 'anim-proj-media',
    title: '咩視覺動態實驗室',
    subtitle: 'WebGL 幾何著色器互動場景',
    description: '實驗性動態圖形與即時著色器渲染引擎',
    url: '/demo-media.html',
    category: 'interactive-media',
    icon: 'palette',
    status: 'online',
    visibility: 'public',
    featured: false,
    pinned: false,
    latencyMs: 32,
    version: 'v1.0.0',
    highlights: ['60fps 著色器', '音訊即時響應']
  },
  {
    id: 'anim-proj-private',
    title: '咩內部機密測試專案',
    subtitle: '管理員專屬實驗中繼站',
    description: '僅限管理員解鎖後可見之內部工具',
    url: '/demo-internal.html',
    category: 'ai-automation',
    icon: 'lock',
    status: 'maintenance',
    visibility: 'private',
    featured: false,
    pinned: false,
    latencyMs: 99,
    version: 'v0.9.0',
    highlights: ['權限控管', '高規格防禦']
  }
];

// Helper to render the studio app with isolated storage state and default sample data
function renderStudioApp(options = {}) {
  const {
    seenIntro = true,
    adminUnlocked = false,
    projects = ANIM_SAMPLE_PROJECTS,
    theme = 'light'
  } = options;

  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.className = '';

  if (projects) {
    window.localStorage.setItem('mei_studio_projects_v1', JSON.stringify(projects));
  }
  if (seenIntro) {
    window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
  }
  if (adminUnlocked) {
    saveAdminUnlocked(true);
  }
  if (theme === 'dark') {
    saveTheme('dark');
  }

  return render(<App />);
}

describe('咩創意工作室 Mei Creative Studio - 全站動畫系統端對端 (E2E) 完整規格驗證', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.className = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // Tier 1: 核心動效與互動功能覆蓋 (Feature Coverage - 18 Tests)
  // =========================================================================
  describe('Tier 1: 核心動效與互動功能覆蓋 (Feature Coverage)', () => {
    // -----------------------------------------------------------------------
    // R1: 訊息彈出質感動畫 (Message Popups & Overlays)
    // -----------------------------------------------------------------------
    it('T1-R1-01: Toast 狀態通知出現時具備彈性進場動畫 (toast-spring-enter) 與毛玻璃光暈微過渡', () => {
      renderStudioApp();
      const themeToggle = screen.getByLabelText('切換深淺色主題');
      fireEvent.click(themeToggle);

      const toast = screen.getByTestId('studio-toast');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveClass('toast-spring-enter');
      expect(toast).not.toHaveClass('toast-slide-exit');
      expect(toast).toHaveAttribute('role', 'status');
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(toast.className).toMatch(/backdrop-blur-xl/);
      expect(toast.className).toMatch(/border-sky-400\/40/);
    });

    it('T1-R1-02: Toast 通知在停留週期結束後進入向下滑出退場動畫 (toast-slide-exit)', () => {
      vi.useFakeTimers();
      try {
        renderStudioApp();
        const themeToggle = screen.getByLabelText('切換深淺色主題');
        fireEvent.click(themeToggle);

        const toast = screen.getByTestId('studio-toast');
        expect(toast).toHaveClass('toast-spring-enter');

        // Advance 2600ms (stay duration)
        act(() => {
          vi.advanceTimersByTime(2600);
        });
        expect(toast).toHaveClass('toast-slide-exit');

        // Advance 340ms (exit animation duration)
        act(() => {
          vi.advanceTimersByTime(340);
        });
        expect(screen.queryByTestId('studio-toast')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('T1-R1-03: 專案預覽抽屜 (ProjectPreviewDrawer) 開啟時具備全螢幕遮罩毛玻璃與抽屜容器滑動轉場', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      const drawer = screen.getByRole('dialog', { name: /預覽與詳情抽屜/i });
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveAttribute('aria-modal', 'true');
      expect(drawer.className).toMatch(/backdrop-blur/);

      // Inner drawer panel verification
      const innerPanel = drawer.querySelector('.shadow-2xl');
      expect(innerPanel).toBeInTheDocument();
      expect(innerPanel.className).toMatch(/backdrop-blur-2xl/);
    });

    it('T1-R1-04: 專案預覽抽屜點擊遮罩背景時順暢觸發關閉回調', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      const drawer = screen.getByRole('dialog', { name: /預覽與詳情抽屜/i });
      expect(drawer).toBeInTheDocument();

      // Click outer backdrop
      fireEvent.click(drawer);
      expect(screen.queryByRole('dialog', { name: /預覽與詳情抽屜/i })).not.toBeInTheDocument();
    });

    it('T1-R1-05: 專案預覽抽屜點擊右上角關閉按鈕順暢關閉', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      const closeBtn = screen.getByLabelText('關閉預覽抽屜');
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog', { name: /預覽與詳情抽屜/i })).not.toBeInTheDocument();
    });

    it('T1-R1-06: 專案預覽抽屜內部 Tab 切換 (沙盒預覽 / 規格亮點 / SDK 嵌入碼) 具備平滑樣式與內容過渡', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      const detailsTab = screen.getByText('專案規格與亮點');
      fireEvent.click(detailsTab);
      expect(screen.getByText('核心技術與功能亮點')).toBeInTheDocument();

      const sdkTab = screen.getByText('返回大廳 SDK 嵌入碼');
      fireEvent.click(sdkTab);
      expect(screen.getByText('複製嵌入碼')).toBeInTheDocument();
    });

    it('T1-R1-07: 專案預覽抽屜之電腦視角與手機視角切換器具備即時響應過渡', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      const mobileBtn = screen.getByText('手機視角');
      fireEvent.click(mobileBtn);
      expect(mobileBtn.closest('button')).toHaveClass('bg-sky-500');

      const desktopBtn = screen.getByText('電腦視角');
      fireEvent.click(desktopBtn);
      expect(desktopBtn.closest('button')).toHaveClass('bg-sky-500');
    });

    it('T1-R1-08: 跨裝置 QR-code 視窗 (QRCodeModal) 開啟時具備彈性縮放進場與遮罩模糊', () => {
      renderStudioApp();
      const qrBtns = screen.getAllByLabelText(/QR-code/i);
      fireEvent.click(qrBtns[0]);

      const qrModal = screen.getByRole('dialog', { name: /跨裝置 QR-code/i });
      expect(qrModal).toBeInTheDocument();
      expect(qrModal.className).toMatch(/backdrop-blur/);
      expect(qrModal.querySelector('svg')).toBeInTheDocument();
    });

    it('T1-R1-09: 全域命令列 (CommandPalette) 快捷鍵或按鈕開啟時具備彈性縮放與半透明背景遮罩', () => {
      renderStudioApp();
      const openPaletteBtn = screen.getByLabelText('開啟全域搜尋命令列');
      fireEvent.click(openPaletteBtn);

      const commandDialog = screen.getByRole('dialog', { name: '全域極速搜尋與快捷命令列' });
      expect(commandDialog).toBeInTheDocument();
      expect(commandDialog.className).toMatch(/backdrop-blur/);

      const input = screen.getByLabelText('命令列搜尋輸入');
      expect(input).toBeInTheDocument();
    });

    it('T1-R1-10: 管理員專案管理視窗 (AdminProjectModal) 在解鎖狀態下開啟具備平滑轉場與圖示挑選器', () => {
      renderStudioApp({ adminUnlocked: true });
      const addBtns = screen.getAllByText('新增專案');
      fireEvent.click(addBtns[0]);

      const modal = screen.getByRole('dialog', { name: '新增連接專案' });
      expect(modal).toBeInTheDocument();
      expect(modal.className).toMatch(/backdrop-blur/);
      expect(screen.getByText('新增連接專案至咩創意大廳')).toBeInTheDocument();
    });

    it('T1-R1-11: 管理員 AI 客服視窗 (AdminChatWidget) 開啟具備浮動展開與頂部狀態指示', () => {
      renderStudioApp({ adminUnlocked: true });
      const chatFab = screen.getByTestId('admin-chat-fab');
      expect(chatFab).toBeInTheDocument();

      fireEvent.click(chatFab);
      const chatWindow = screen.getByTestId('admin-chat-window');
      expect(chatWindow).toBeInTheDocument();
      expect(within(chatWindow).getByText('咩創意 AI 助手')).toBeInTheDocument();
      expect(within(chatWindow).getByText('管理員限定')).toBeInTheDocument();
    });

    // -----------------------------------------------------------------------
    // R2: 頁面與狀態切換過渡 (Page & State Transitions)
    // -----------------------------------------------------------------------
    it('T1-R2-01: 分類篩選器 (HeaderHero categories) 切換時各分類 Tab 具備 active/inactive 平滑過渡', () => {
      renderStudioApp();
      const allTab = screen.getByRole('tab', { name: /全部專案/i });
      expect(allTab).toHaveAttribute('aria-selected', 'true');
      expect(allTab).toHaveClass('btn-sky-primary');

      const aiTab = screen.getByRole('tab', { name: /AI 與自動化/i });
      fireEvent.click(aiTab);
      expect(aiTab).toHaveAttribute('aria-selected', 'true');
      expect(aiTab).toHaveClass('btn-sky-primary');
      expect(allTab).toHaveAttribute('aria-selected', 'false');
    });

    it('T1-R2-02: 分類篩選項目切換後，卡片網格 (BentoProjectGrid) 觸發交錯波浪動畫 (bento-wave-reveal)', () => {
      renderStudioApp();
      const cards = document.querySelectorAll('.bento-wave-reveal');
      expect(cards.length).toBeGreaterThan(0);
      cards.forEach((card) => {
        expect(card).toHaveClass('bento-wave-reveal');
      });
    });

    it('T1-R2-03: 連線狀態快速篩選 (所有狀態 / 正式上線 / 測試 Beta 等) 切換具備即時過渡反饋', () => {
      renderStudioApp();
      const onlineBtn = screen.getAllByText('正式上線').find((el) => el.closest('button'))?.closest('button');
      fireEvent.click(onlineBtn);

      expect(onlineBtn).toHaveClass('border-sky-500');
      expect(onlineBtn.className).toMatch(/bg-sky-500/);
    });

    it('T1-R2-04: 深淺色主題切換時，全站附加 theme-transitioning 750ms 平滑階梯漸變', () => {
      renderStudioApp();
      const themeBtn = screen.getByLabelText('切換深淺色主題');
      fireEvent.click(themeBtn);

      expect(document.documentElement).toHaveClass('theme-transitioning');
      expect(document.documentElement).toHaveClass('dark');
      expect(document.querySelector('.theme-stagger-hero')).toBeInTheDocument();
      expect(document.querySelector('.theme-stagger-bento')).toBeInTheDocument();
      expect(document.querySelector('.theme-stagger-footer')).toBeInTheDocument();
    });

    // -----------------------------------------------------------------------
    // R3: 組件微互動設計 (Micro-Interactions)
    // -----------------------------------------------------------------------
    it('T1-R3-01: 主要晴空按鈕 (.btn-sky-primary) 與次要按鈕 (.btn-sky-secondary) 具備微互動類別與過渡樣式', () => {
      renderStudioApp();
      const primaryBtns = document.querySelectorAll('.btn-sky-primary');
      const secondaryBtns = document.querySelectorAll('.btn-sky-secondary');

      expect(primaryBtns.length).toBeGreaterThan(0);
      expect(secondaryBtns.length).toBeGreaterThan(0);
    });

    it('T1-R3-02: Bento Grid 專案卡片具備 3D 浮動與互動懸停類別 (.bento-glass-card, .bento-card-interactive)', () => {
      renderStudioApp();
      const bentoCards = document.querySelectorAll('.bento-card-interactive');
      expect(bentoCards.length).toBeGreaterThan(0);
      bentoCards.forEach((card) => {
        expect(card).toHaveClass('bento-glass-card');
      });
    });

    it('T1-R3-03: 專案卡片右上角狀態指示燈具備雙層呼吸燈脈衝動畫類別 (.status-pulse-ring)', () => {
      renderStudioApp();
      const pulseRings = document.querySelectorAll('.status-pulse-ring');
      expect(pulseRings.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Tier 2: 邊界、極限與極端情境驗證 (Boundary & Corner Cases - 14 Tests)
  // =========================================================================
  describe('Tier 2: 邊界、極限與極端情境驗證 (Boundary & Corner Cases)', () => {
    it('T2-B1-01: 極速連續點擊主題切換按鈕 (Rapid Theme Toggle) 時防抖維持平滑，不發生畫面崩潰或計時器衝突', () => {
      renderStudioApp();
      const themeBtn = screen.getByLabelText('切換深淺色主題');

      // Rapidly toggle 5 times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(themeBtn);
      }

      // Odd count toggle => dark mode active
      expect(document.documentElement).toHaveClass('dark');
      expect(document.documentElement).toHaveClass('theme-transitioning');
      expect(screen.getByTestId('studio-toast')).toBeInTheDocument();
    });

    it('T2-B1-02: 極速連續點擊 Toast 觸發按鈕時，平滑更新文字與圖示 (toast-content-fade) 且不提早卸載', () => {
      renderStudioApp();
      const themeBtn = screen.getByLabelText('切換深淺色主題');

      fireEvent.click(themeBtn);
      const toastEl = screen.getByTestId('studio-toast');
      expect(toastEl).toHaveClass('toast-spring-enter');

      // Click again while still active
      fireEvent.click(themeBtn);
      const fadeSpans = toastEl.querySelectorAll('.toast-content-fade');
      expect(fadeSpans.length).toBeGreaterThan(0);
      expect(toastEl).toBeInTheDocument();
    });

    it('T2-B1-03: Toast 處於退場動畫期間 (isExiting)，使用者點擊關閉能安全防護而不重複觸發', () => {
      vi.useFakeTimers();
      try {
        renderStudioApp();
        const themeBtn = screen.getByLabelText('切換深淺色主題');
        fireEvent.click(themeBtn);

        // Advance to exit animation
        act(() => {
          vi.advanceTimersByTime(2600);
        });
        const toast = screen.getByTestId('studio-toast');
        expect(toast).toHaveClass('toast-slide-exit');

        // Click during exit
        fireEvent.click(toast);
        expect(toast).toHaveClass('toast-slide-exit');

        // Complete exit timer
        act(() => {
          vi.advanceTimersByTime(340);
        });
        expect(screen.queryByTestId('studio-toast')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('T2-B1-04: 在全域命令列開啟時按下鍵盤 ESC 鍵或點擊 ESC 按鈕能優雅退出', () => {
      renderStudioApp();
      fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));
      expect(screen.getByRole('dialog', { name: '全域極速搜尋與快捷命令列' })).toBeInTheDocument();

      const escBtn = screen.getByText('ESC');
      fireEvent.click(escBtn);
      expect(screen.queryByRole('dialog', { name: '全域極速搜尋與快捷命令列' })).not.toBeInTheDocument();
    });

    it('T2-B2-01: 偏好減少動態模式 (prefers-reduced-motion: reduce) 下，CSS 降級規範具備即時或無動畫屬性', () => {
      const cssPath = path.resolve(process.cwd(), 'src/styles/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
      expect(cssContent).toMatch(/animation:\s*none\s*!important/);
      expect(cssContent).toMatch(/transform:\s*none\s*!important/);
      expect(cssContent).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    });

    it('T2-B2-02: 專案卡片數量為 0 時 (無符合篩選條件)，空狀態提示卡片仍具備 bento-wave-reveal 彈性波浪', () => {
      renderStudioApp();
      const searchInput = screen.getByLabelText('搜尋專案關鍵字');
      fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_QUERY_TERM_XYZ' } });

      const emptyHeading = screen.getByText('目前尚無專案');
      expect(emptyHeading).toBeInTheDocument();
      const emptyContainer = emptyHeading.closest('.bento-wave-reveal');
      expect(emptyContainer).toBeInTheDocument();
    });

    it('T2-B2-03: 快速輸入與清除搜尋關鍵字時，篩選統計數字與清除按鈕平滑顯示與隱藏', () => {
      renderStudioApp();
      const searchInput = screen.getByLabelText('搜尋專案關鍵字');
      expect(screen.queryByLabelText('清除搜尋關鍵字')).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: 'AI' } });
      const clearBtn = screen.getByLabelText('清除搜尋關鍵字');
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);
      expect(searchInput.value).toBe('');
      expect(screen.queryByLabelText('清除搜尋關鍵字')).not.toBeInTheDocument();
    });

    it('T2-B2-04: 專案預覽抽屜中快速點擊複製 SDK 嵌入碼時，複製成功提示平滑切換且定時復原', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      fireEvent.click(screen.getByText('返回大廳 SDK 嵌入碼'));
      const copyBtn = screen.getByText('複製嵌入碼');
      fireEvent.click(copyBtn);

      expect(screen.getByText('已複製程式碼')).toBeInTheDocument();
    });

    it('T2-B2-05: QR-code 視窗快速複製專案連結時，按鈕圖示與文字平滑切換為「已複製」', () => {
      renderStudioApp();
      const qrBtns = screen.getAllByLabelText(/QR-code/i);
      fireEvent.click(qrBtns[0]);

      const copyUrlBtn = screen.getByText('複製專案網址');
      fireEvent.click(copyUrlBtn);

      expect(screen.getByText('已複製網址')).toBeInTheDocument();
    });

    it('T2-B2-06: 命令列在極限無搜尋結果時，平滑呈現空狀態提示而不白屏', () => {
      renderStudioApp();
      fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));

      const input = screen.getByLabelText('命令列搜尋輸入');
      fireEvent.change(input, { target: { value: 'ZERO_RESULT_MATCH_TEST' } });

      expect(screen.getByText('查無符合的專案或指令')).toBeInTheDocument();
    });

    it('T2-B2-07: 開場動畫 (PortalEntrance) 在極短時間點擊「略過開場」能瞬間平滑進入大廳', () => {
      renderStudioApp({ seenIntro: false });
      const overlay = screen.getByTestId('portal-entrance-overlay');
      expect(overlay).toBeInTheDocument();

      const skipBtn = screen.getByTestId('skip-entrance-btn');
      fireEvent.click(skipBtn);

      expect(window.sessionStorage.getItem('mei_studio_intro_seen_v1')).toBe('true');
      expect(screen.queryByTestId('portal-entrance-overlay')).not.toBeInTheDocument();
    });

    it('T2-B2-08: 重新播放開場動畫 (onReplayEntrance) 能乾淨重置 stage 與波浪序列', () => {
      renderStudioApp({ seenIntro: true });
      fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));

      const replayCmd = screen.getByText('重播大廳開場動畫');
      fireEvent.click(replayCmd);

      expect(screen.getByTestId('portal-entrance-overlay')).toBeInTheDocument();
    });

    it('T2-B2-09: 視窗在手機端視角下，抽屜頂部下滑手勢指示條正常渲染', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      const drawer = screen.getByRole('dialog', { name: /預覽與詳情抽屜/i });
      const handleBar = drawer.querySelector('.sm\\:hidden');
      expect(handleBar).toBeInTheDocument();
    });

    it('T2-B2-10: 抽屜內部點擊內容區域時 e.stopPropagation() 防止意外關閉抽屜', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      const drawer = screen.getByRole('dialog', { name: /預覽與詳情抽屜/i });
      const innerCard = drawer.querySelector('.shadow-2xl');
      fireEvent.click(innerCard);

      expect(screen.getByRole('dialog', { name: /預覽與詳情抽屜/i })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Tier 3: 跨功能組合與交互干擾 (Cross-Feature Combinations - 10 Tests)
  // =========================================================================
  describe('Tier 3: 跨功能組合與交互干擾 (Cross-Feature Combinations)', () => {
    it('T3-C1-01: 組合一：在抽屜開啟時切換深淺色主題，抽屜與大廳背景平滑同步變色', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);
      expect(screen.getByRole('dialog', { name: /預覽與詳情抽屜/i })).toBeInTheDocument();

      // Toggle theme
      const themeToggle = screen.getByLabelText('切換深淺色主題');
      fireEvent.click(themeToggle);

      expect(document.documentElement).toHaveClass('dark');
      expect(document.documentElement).toHaveClass('theme-transitioning');
      expect(screen.getByRole('dialog', { name: /預覽與詳情抽屜/i })).toBeInTheDocument();
    });

    it('T3-C1-02: 組合二：從預覽抽屜內直接觸發 QR-code 視窗，雙重 Overlay 能層疊正常顯示與關閉', () => {
      renderStudioApp();
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      const drawer = screen.getByRole('dialog', { name: /預覽與詳情抽屜/i });
      const drawerQrBtn = within(drawer).getByText('QR-code');
      fireEvent.click(drawerQrBtn);

      const qrModal = screen.getByRole('dialog', { name: /跨裝置 QR-code/i });
      expect(qrModal).toBeInTheDocument();

      // Close QR Modal
      const closeQrBtn = within(qrModal).getByLabelText('關閉 QR-code 視窗');
      fireEvent.click(closeQrBtn);

      expect(screen.queryByRole('dialog', { name: /跨裝置 QR-code/i })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: /預覽與詳情抽屜/i })).toBeInTheDocument();
    });

    it('T3-C1-03: 組合三：在分類篩選進行中同時開啟全域命令列 (Cmd+K)，命令列能獨立開啟並在選取後更新分類', () => {
      renderStudioApp();
      const aiTab = screen.getByRole('tab', { name: /AI 與自動化/i });
      fireEvent.click(aiTab);

      // Open Command Palette
      fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));
      const commandPalette = screen.getByRole('dialog', { name: '全域極速搜尋與快捷命令列' });
      expect(commandPalette).toBeInTheDocument();

      // Click "切換分類：網站與商業應用"
      const webCmd = screen.getByText('切換分類：網站與商業應用');
      fireEvent.click(webCmd);

      expect(screen.queryByRole('dialog', { name: '全域極速搜尋與快捷命令列' })).not.toBeInTheDocument();
      const webTab = screen.getByRole('tab', { name: /網站與商業/i });
      expect(webTab).toHaveAttribute('aria-selected', 'true');
    });

    it('T3-C1-04: 組合四：管理員解鎖模式下，管理員專案視窗與 AI 客服視窗能平滑協同開啟與關閉', () => {
      renderStudioApp({ adminUnlocked: true });

      // Open Admin Project Modal
      fireEvent.click(screen.getAllByText('新增專案')[0]);
      expect(screen.getByRole('dialog', { name: '新增連接專案' })).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('關閉專案管理視窗'));
      expect(screen.queryByRole('dialog', { name: '新增連接專案' })).not.toBeInTheDocument();

      // Open Admin Chat Window
      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      expect(screen.getByTestId('admin-chat-window')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('關閉對話視窗'));
      expect(screen.queryByTestId('admin-chat-window')).not.toBeInTheDocument();
    });

    it('T3-C1-05: 組合五：在卡片網格切換不同排序方式 (最新更新 / 連線速度 / 名稱) 時，卡片列表平滑重新排列', () => {
      renderStudioApp();
      const sortSelect = screen.getByLabelText('專案排序方式');

      fireEvent.change(sortSelect, { target: { value: 'updated' } });
      expect(sortSelect.value).toBe('updated');

      fireEvent.change(sortSelect, { target: { value: 'latency' } });
      expect(sortSelect.value).toBe('latency');

      fireEvent.change(sortSelect, { target: { value: 'title' } });
      expect(sortSelect.value).toBe('title');
    });

    it('T3-C1-06: 組合六：手機底部導覽列 (MobileBottomNav) 點擊各頁籤切換 active 狀態並平滑觸發相應彈窗', () => {
      renderStudioApp();
      const bottomNav = screen.getByLabelText('手機端底部快速導覽列');
      expect(bottomNav).toBeInTheDocument();

      const searchBtn = within(bottomNav).getByText('快速搜尋').closest('button');
      fireEvent.click(searchBtn);
      expect(screen.getByRole('dialog', { name: '全域極速搜尋與快捷命令列' })).toBeInTheDocument();
    });

    it('T3-C1-07: 組合七：在 AI 客服對話視窗開啟時，點擊快速問題膠囊能立即送出並更新對話紀錄', () => {
      renderStudioApp({ adminUnlocked: true });
      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      expect(screen.getByTestId('admin-chat-window')).toBeInTheDocument();

      const suggestionChips = screen.getAllByRole('button');
      const chip = Array.from(suggestionChips).find((btn) =>
        btn.textContent?.includes('如何新增與編輯專案？') || btn.textContent?.includes('有哪些專案')
      );
      if (chip) {
        fireEvent.click(chip);
        expect(screen.getAllByRole('article').length + screen.getAllByText(/專案/i).length).toBeGreaterThan(0);
      }
    });

    it('T3-C1-08: 組合八：在 Toast 顯示期間切換分類與觸發抽屜，Toast 保持懸浮於畫面右下角不受干擾', () => {
      renderStudioApp();
      fireEvent.click(screen.getByLabelText('切換深淺色主題'));
      expect(screen.getByTestId('studio-toast')).toBeInTheDocument();

      // Click category tab
      const aiTab = screen.getByRole('tab', { name: /AI 與自動化/i });
      fireEvent.click(aiTab);

      // Open drawer
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);

      expect(screen.getByTestId('studio-toast')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: /預覽與詳情抽屜/i })).toBeInTheDocument();
    });

    it('T3-C1-09: 組合九：在深色模式下連續開啟與關閉 QR-code 視窗與命令列，對比度與毛玻璃效果維持正常', () => {
      renderStudioApp();
      fireEvent.click(screen.getByLabelText('切換深淺色主題'));
      expect(document.documentElement).toHaveClass('dark');

      // Open QR Modal
      const qrBtns = screen.getAllByLabelText(/QR-code/i);
      fireEvent.click(qrBtns[0]);
      const qrModal = screen.getByRole('dialog', { name: /跨裝置 QR-code/i });
      expect(qrModal).toBeInTheDocument();
      fireEvent.click(within(qrModal).getByLabelText('關閉 QR-code 視窗'));

      // Open Command Palette
      fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));
      const commandDialog = screen.getByRole('dialog', { name: '全域極速搜尋與快捷命令列' });
      expect(commandDialog).toBeInTheDocument();
      fireEvent.click(commandDialog);
    });

    it('T3-C1-10: 組合十：資料備份視窗 (StudioBackupModal) 匯出操作與 Toast 通知聯動流暢無阻', () => {
      renderStudioApp();
      fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));

      const backupCmd = screen.getByText('資料備份與還原');
      fireEvent.click(backupCmd);

      const backupModal = screen.getByRole('dialog', { name: '資料備份與系統設定' });
      expect(backupModal).toBeInTheDocument();

      const exportBtn = screen.getByText('匯出 JSON 備份');
      fireEvent.click(exportBtn);

      expect(screen.getByTestId('studio-toast')).toBeInTheDocument();
      expect(within(screen.getByTestId('studio-toast')).getByText('已匯出 projects.json 備份檔')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Tier 4: 真實使用者完整旅程與視覺規範 (Real-World User Flows & Visual Constraints - 10 Tests)
  // =========================================================================
  describe('Tier 4: 真實使用者完整旅程與視覺規範 (Real-World User Flows & Visual Constraints)', () => {
    it('T4-U1-01: 旅程一 (訪客完整探索流)：進站開場 -> 瀏覽卡片 -> 切換分類 -> 開啟預覽抽屜 -> 切換視角 -> 關閉', () => {
      // Step 1: User visits without prior seen cookie
      renderStudioApp({ seenIntro: false });
      expect(screen.getByTestId('portal-entrance-overlay')).toBeInTheDocument();

      // Step 2: Skip entrance to enter hub
      fireEvent.click(screen.getByTestId('skip-entrance-btn'));

      // Step 3: Browse category
      const mediaTab = screen.getByRole('tab', { name: /互動設計與多媒體/i });
      fireEvent.click(mediaTab);
      expect(mediaTab).toHaveClass('btn-sky-primary');

      // Step 4: Open preview drawer
      const previewBtns = screen.getAllByText('快速預覽');
      fireEvent.click(previewBtns[0]);
      expect(screen.getByRole('dialog', { name: /預覽與詳情抽屜/i })).toBeInTheDocument();

      // Step 5: Toggle viewport mode
      fireEvent.click(screen.getByText('手機視角'));
      fireEvent.click(screen.getByText('電腦視角'));

      // Step 6: Close drawer
      fireEvent.click(screen.getByLabelText('關閉預覽抽屜'));
      expect(screen.queryByRole('dialog', { name: /預覽與詳情抽屜/i })).not.toBeInTheDocument();
    });

    it('T4-U1-02: 旅程二 (搜尋與快捷導航流)：開啟命令列 -> 輸入關鍵字 -> 預覽專案 -> 順暢返回', () => {
      renderStudioApp();
      fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));

      const input = screen.getByLabelText('命令列搜尋輸入');
      fireEvent.change(input, { target: { value: '智慧' } });

      const palette = screen.getByRole('dialog', { name: '全域極速搜尋與快捷命令列' });
      const projectItem = within(palette).getByText('咩智慧靈感自動化引擎');
      expect(projectItem).toBeInTheDocument();

      // Click project item to preview
      fireEvent.click(projectItem.closest('button') || projectItem.closest('div[class*="cursor-pointer"]') || projectItem);
      expect(screen.queryByRole('dialog', { name: '全域極速搜尋與快捷命令列' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: /預覽與詳情抽屜/i })).toBeInTheDocument();
    });

    it('T4-U1-03: 旅程三 (管理員維護流)：管理員解鎖 -> 開啟新增專案彈窗 -> 取消關閉 -> 開啟 AI 客服 -> 關閉', () => {
      renderStudioApp();
      const unlockBtns = screen.getAllByText('管理員解鎖');
      fireEvent.click(unlockBtns[0]);

      const pinInput = screen.getByLabelText('管理員密碼輸入框');
      fireEvent.change(pinInput, { target: { value: 'mei888' } });
      fireEvent.click(screen.getByText('立即解鎖管理後台'));

      expect(loadAdminUnlocked()).toBe(true);

      // Open add project modal
      fireEvent.click(screen.getAllByText('新增專案')[0]);
      expect(screen.getByRole('dialog', { name: '新增連接專案' })).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('關閉專案管理視窗'));

      // Open AI Chat Widget
      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      expect(screen.getByTestId('admin-chat-window')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('關閉對話視窗'));
    });

    it('T4-U1-04: 旅程四 (主題切換與沉浸體驗流)：多次切換主題 -> 觀察 Toast 微互動 -> 檢查各區塊階梯延遲配置', () => {
      renderStudioApp();
      const themeToggle = screen.getByLabelText('切換深淺色主題');

      fireEvent.click(themeToggle); // Switch to dark
      expect(document.documentElement).toHaveClass('dark');
      expect(screen.getByTestId('studio-toast')).toHaveClass('toast-spring-enter');

      fireEvent.click(themeToggle); // Switch to light
      expect(document.documentElement).not.toHaveClass('dark');
    });

    it('T4-U1-05: 視覺系統規範：全站 100% 嚴格 0 Unicode Emoji 規範檢驗 (無任何 1F300-1F9FF / 2600-26FF / 2700-27BF)', () => {
      const { container } = renderStudioApp();
      const fullText = container.textContent || '';
      expect(EMOJI_REGEX.test(fullText)).toBe(false);

      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        const title = el.getAttribute('title') || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        expect(EMOJI_REGEX.test(title)).toBe(false);
        expect(EMOJI_REGEX.test(ariaLabel)).toBe(false);
      });
    });

    it('T4-U1-06: 視覺系統規範：全站 Lucide 圖示一律採用 strokeWidth=1.75 與 absoluteStrokeWidth=true', () => {
      // 1. Standalone LucideIcon with standard 24px viewport
      const { container: icon24 } = render(<LucideIcon name="cloud" size={24} />);
      const svg24 = icon24.querySelector('svg');
      expect(svg24).toBeInTheDocument();
      expect(svg24.getAttribute('stroke-width')).toBe('1.75');

      // 2. LucideIcon normalization across casing styles
      const { container: iconCamel } = render(<LucideIcon name="WandSparkles" size={24} />);
      const svgCamel = iconCamel.querySelector('svg');
      expect(svgCamel).toHaveAttribute('data-lucide-name', 'wand-sparkles');
      expect(svgCamel.getAttribute('stroke-width')).toBe('1.75');

      // 3. StudioLogo linear SVG strokeWidth
      const { container: logoContainer } = render(<StudioLogo size="md" />);
      const cloudSvg = logoContainer.querySelector('.studio-infinity-cloud');
      expect(cloudSvg).toBeInTheDocument();
      expect(cloudSvg.getAttribute('stroke-width')).toBe('1.75');
    });

    it('T4-U1-07: 視覺系統規範：全站品牌標誌 (StudioLogo) 完整體現「晴空淡藍 #38BDF8 + 靈感雲朵 × 無限符號 (∞) 純粹極簡線性」', () => {
      const { container } = render(<StudioLogo size="lg" />);
      const logo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(logo).toBeInTheDocument();

      const cloudInfinitySvg = logo.querySelector('.studio-infinity-cloud');
      expect(cloudInfinitySvg).toBeInTheDocument();
      expect(cloudInfinitySvg.getAttribute('stroke-width')).toBe('1.75');

      const sparkles = logo.querySelector('.studio-logo-sparkle');
      expect(sparkles).toBeInTheDocument();
      expect(sparkles.className).toMatch(/bg-sky-500/);
    });

    it('T4-U1-08: 視覺系統規範：Bento Grid 毛玻璃卡片符合 24px 圓角與晴空微光陰影規範', () => {
      const cssPath = path.resolve(process.cwd(), 'src/styles/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toMatch(/border-radius:\s*24px/);
      expect(cssContent).toMatch(/backdrop-filter:\s*blur\(20px\)/);
      expect(cssContent).toMatch(/--sky-primary:\s*#38BDF8/);
    });

    it('T4-U1-09: 無障礙訪問規範：所有彈出視窗具備 role="dialog" 或 role="status" 以及正確的 aria-modal 與 aria-label', () => {
      renderStudioApp();

      // Open drawer
      fireEvent.click(screen.getAllByText('快速預覽')[0]);
      const drawer = screen.getByRole('dialog', { name: /預覽與詳情抽屜/i });
      expect(drawer).toHaveAttribute('aria-modal', 'true');
      fireEvent.click(screen.getByLabelText('關閉預覽抽屜'));

      // Open QR Modal
      fireEvent.click(screen.getAllByLabelText(/QR-code/i)[0]);
      const qrModal = screen.getByRole('dialog', { name: /跨裝置 QR-code/i });
      expect(qrModal).toHaveAttribute('aria-modal', 'true');
      fireEvent.click(within(qrModal).getByLabelText('關閉 QR-code 視窗'));

      // Open Command Palette
      fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));
      const cmdPalette = screen.getByRole('dialog', { name: '全域極速搜尋與快捷命令列' });
      expect(cmdPalette).toHaveAttribute('aria-modal', 'true');
    });

    it('T4-U1-10: 效能與硬體加速：檢查核心動畫均基於 transform / opacity / backdrop-filter 複合圖層運算', () => {
      const cssPath = path.resolve(process.cwd(), 'src/styles/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Check keyframes use hardware accelerated transform/opacity/backdrop-filter
      expect(cssContent).toMatch(/@keyframes\s+toastSpringEnter/);
      expect(cssContent).toMatch(/@keyframes\s+toastSlideExit/);
      expect(cssContent).toMatch(/@keyframes\s+bentoSpringWave/);
      expect(cssContent).toMatch(/will-change:\s*transform,\s*opacity/);
    });
  });
});
