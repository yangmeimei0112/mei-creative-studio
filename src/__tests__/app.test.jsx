import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import App from '../App';
import {
  LucideIcon,
  SquircleIconBadge,
  StudioLogo,
  LUCIDE_ICON_MAP,
  LUCIDE_PICKER_GROUPS
} from '../components/LucideIcon';
import {
  DEFAULT_PROJECTS,
  PROJECT_CATEGORIES,
  STUDIO_CONFIG
} from '../data/defaultData';
import {
  generateSubprojectEmbedSnippet,
  parseAndValidateBackupJSON,
  verifyAdminPin,
  setAdminPin
} from '../services/storageService';

describe('咩創意工作室 Mei Creative Studio — 跨平台導引大廳完整驗證', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('1. 嚴格遵守 Lucide 圖示規範：統一 strokeWidth=1.75、absoluteStrokeWidth=true、48 款挑選器且全站零 Emoji', () => {
    const { container } = render(<LucideIcon name="cloud" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('data-lucide-name', 'cloud');
    expect(svg.getAttribute('stroke-width')).toBe('1.75');

    // PascalCase / camelCase / snake_case icon names normalize cleanly
    const pascalRender = render(<LucideIcon name="WandSparkles" size={24} />);
    expect(
      pascalRender.container.querySelector('svg')
    ).toHaveAttribute('data-lucide-name', 'wand-sparkles');

    // Check SquircleIconBadge renders with squircle-icon-badge class and supports all 7 tiers
    ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'].forEach((sz) => {
      const badgeRender = render(<SquircleIconBadge name="bot" size={sz} />);
      expect(
        badgeRender.container.querySelector('.squircle-icon-badge')
      ).toBeInTheDocument();
    });

    // Check StudioLogo renders unified structure: squircle cloud + infinity loop (without sparkle badge)
    const studioLogoRender = render(<StudioLogo size="md" />);
    const logoEl = studioLogoRender.container.querySelector(
      '[data-testid="studio-brand-logo"]'
    );
    expect(logoEl).toBeInTheDocument();
    expect(logoEl).toHaveClass('studio-brand-logo');
    expect(logoEl.querySelector('.squircle-icon-badge')).toBeInTheDocument();
    expect(logoEl.querySelector('.studio-logo-sparkle')).not.toBeInTheDocument();

    const cloudSvg = logoEl.querySelector('[data-lucide-name="cloud"]');
    expect(cloudSvg).toBeInTheDocument();
    expect(cloudSvg).toHaveAttribute('data-lucide-name', 'cloud');
    expect(cloudSvg).toHaveClass('studio-infinity-cloud');
    expect(cloudSvg).toHaveAttribute('stroke-width', '1.75');

    // Verify cloud anchor path and Candidate F lemniscate path
    const paths = cloudSvg.querySelectorAll('path');
    expect(paths).toHaveLength(2);
    expect(paths[0]).toHaveAttribute('d', 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z');
    expect(paths[1]).toHaveAttribute(
      'd',
      'M12 14.5c-1.2-1.2-2.4-1.8-3.6-1.8a1.8 1.8 0 1 0 0 3.6c1.2 0 2.4-.6 3.6-1.8Zm0 0c1.2 1.2 2.4 1.8 3.6 1.8a1.8 1.8 0 0 0 0-3.6c-1.2 0-2.4.6-3.6 1.8Z'
    );

    // Verify all 7 size variants of StudioLogo ('2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl')
    ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'].forEach((sz) => {
      const { container: szContainer } = render(<StudioLogo size={sz} />);
      const szEl = szContainer.querySelector(`[data-logo-size="${sz}"]`);
      expect(szEl).toBeInTheDocument();
      expect(szEl.querySelector('[data-lucide-name="cloud"]')).toBeInTheDocument();
      expect(szEl.querySelector('.studio-logo-sparkle')).not.toBeInTheDocument();
    });

    // Verify fallback on invalid sizes
    const { container: fallbackContainer } = render(<StudioLogo size="invalid-size" />);
    const fallbackEl = fallbackContainer.querySelector('[data-logo-size="md"]');
    expect(fallbackEl).toBeInTheDocument();
    expect(fallbackContainer.querySelector('.squircle-icon-badge')).toHaveClass('w-[44px]', 'h-[44px]');

    // Ensure 48 icons in LUCIDE_PICKER_GROUPS and all exist in LUCIDE_ICON_MAP
    const pickerIcons = LUCIDE_PICKER_GROUPS.flatMap((g) => g.icons);
    expect(pickerIcons).toHaveLength(48);
    pickerIcons.forEach((item) => {
      expect(LUCIDE_ICON_MAP[item.name]).toBeDefined();
    });

    // Ensure all category icons and project icons exist in LUCIDE_ICON_MAP
    PROJECT_CATEGORIES.forEach((cat) => {
      expect(LUCIDE_ICON_MAP[cat.icon]).toBeDefined();
    });
    DEFAULT_PROJECTS.forEach((proj) => {
      expect(LUCIDE_ICON_MAP[proj.icon]).toBeDefined();
    });

    // Verify no emoji characters exist in defaultData titles/descriptions
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(STUDIO_CONFIG.studioNameZh)).toBe(false);
    DEFAULT_PROJECTS.forEach((proj) => {
      expect(emojiRegex.test(proj.title)).toBe(false);
      expect(emojiRegex.test(proj.description)).toBe(false);
    });
  });

  it('2. 訪客公開視角 vs 管理員解鎖 (mei888)、舊快取自動清理、私人專案權限切換、專案排序與新增專案閉環', () => {
    // 模擬客戶端已有舊版含規格註解的 localStorage 快取
    window.localStorage.setItem(
      'mei_studio_changelog_v1',
      JSON.stringify([
        {
          id: 'pulse-2026-11-09',
          version: 'v2.4.0',
          date: '2026-11-09',
          title: '晴空雲朵淡藍 (#38BDF8) 跨平台導引大廳正式上線',
          category: '架構升級',
          icon: 'sparkles',
          summary: '整合 Bento Grid 與 Lucide (strokeWidth 1.75) 規格註解'
        }
      ])
    );

    render(<App />);

    // 首次進入同分頁自動演出開場動畫，支援點擊「略過開場」立即進入大廳並寫入 sessionStorage
    const entranceOverlay = screen.getByTestId('portal-entrance-overlay');
    expect(entranceOverlay).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('skip-entrance-btn'));
    expect(
      screen.queryByTestId('portal-entrance-overlay')
    ).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('mei_studio_intro_seen_v1')).toBe(
      'true'
    );

    // 透過快捷命令列 (Ctrl+K) 點擊「重播大廳開場動畫」可隨時再次體驗，並支援按 Escape 略過
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const cmdDialog = screen.getByRole('dialog', {
      name: /全域極速搜尋與快捷命令列/i
    });
    fireEvent.click(within(cmdDialog).getByText('重播大廳開場動畫'));
    expect(screen.getByTestId('portal-entrance-overlay')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByTestId('portal-entrance-overlay')
    ).not.toBeInTheDocument();

    // 品牌名稱與統一品牌 Logo 正確渲染，且不顯示內部設計規格註解或技術標籤（含自動清理舊版快取）
    expect(screen.getAllByText('咩創意工作室').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('studio-brand-logo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v1.0.0').length).toBeGreaterThan(0);
    const taglineEls = screen.getAllByText('創意無限∞咩有極限');
    const taglineEl =
      taglineEls.find((el) => el.classList.contains('studio-tagline-justify')) ||
      taglineEls[0];
    expect(taglineEl).toBeInTheDocument();
    expect(taglineEl).toHaveClass('studio-tagline-justify');
    expect(taglineEl.parentElement).toHaveClass('studio-title-align-box');
    expect(
      screen.queryByText(/數位產品與創意實驗室/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/晴空雲朵淡藍主視覺/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/跨平台數位專案導引大廳/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/晴空雲朵淡藍 \(#38BDF8\)/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Icons by Lucide\.dev/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/strokeWidth 1\.75/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/全站 100% 純粹 Lucide/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/技術標籤/i)).not.toBeInTheDocument();
    expect(screen.queryByText('#React')).not.toBeInTheDocument();
    expect(
      screen.getByText('咩創意工作室專案平台正式上線')
    ).toBeInTheDocument();

    // 訪客公開視角下不顯示「大廳即時運作狀態」與「子專案快速接入指南」
    expect(screen.queryByText('大廳即時運作狀態')).not.toBeInTheDocument();
    expect(screen.queryByText('子專案快速接入指南')).not.toBeInTheDocument();

    // 預設已清空所有範例專案，大廳呈現友善無專案提示
    expect(screen.getAllByText('目前尚無專案').length).toBeGreaterThan(0);
    expect(screen.getByText('大廳目前尚無任何專案。')).toBeInTheDocument();

    // 點擊「管理員解鎖」
    const unlockBtns = screen.getAllByText('管理員解鎖');
    fireEvent.click(unlockBtns[0]);

    const pinInput = screen.getByLabelText('管理員密碼輸入框');
    // 測試錯誤密碼
    fireEvent.change(pinInput, { target: { value: 'wrong-pin' } });
    fireEvent.click(screen.getByText('立即解鎖管理後台'));
    expect(
      screen.getByText(/密碼不正確，請重新輸入/i)
    ).toBeInTheDocument();

    // 輸入正確預設密碼 mei888
    fireEvent.change(pinInput, { target: { value: 'mei888' } });
    fireEvent.click(screen.getByText('立即解鎖管理後台'));

    // 管理員解鎖後，「大廳即時運作狀態」與「子專案快速接入指南」顯示
    expect(screen.getByText('大廳即時運作狀態')).toBeInTheDocument();
    expect(screen.getByText('子專案快速接入指南')).toBeInTheDocument();

    // 管理員點擊「新增專案」並驗證圖示挑選器繁體中文名稱
    const addBtns = screen.getAllByText('新增專案');
    fireEvent.click(addBtns[0]);

    expect(screen.getByText('火箭啟動')).toBeInTheDocument();
    expect(screen.getByText('靈感火花')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('例如：咩創意 AI 視覺生成器');
    fireEvent.change(nameInput, {
      target: { value: '咩創意自動化排版神器' }
    });

    // 挑選圖示 'rocket'
    const rocketIconBtn = screen.getByTitle('火箭啟動 Rocket');
    fireEvent.click(rocketIconBtn);

    fireEvent.click(screen.getByText('立即加入導引大廳'));

    // 新專案立即顯示於大廳中
    expect(screen.getAllByText('咩創意自動化排版神器').length).toBeGreaterThan(0);

    // 再新增第二個專案（私人專案）以驗證公開與私人權限以及排序
    const addAgainBtns = screen.getAllByText('新增專案');
    fireEvent.click(addAgainBtns[0]);
    const nameInput2 = screen.getByPlaceholderText('例如：咩創意 AI 視覺生成器');
    fireEvent.change(nameInput2, {
      target: { value: '工作室內部專用中樞' }
    });
    fireEvent.change(screen.getByLabelText('存取權限視角'), {
      target: { value: 'private' }
    });
    fireEvent.click(screen.getByText('立即加入導引大廳'));

    expect(screen.getAllByText('工作室內部專用中樞').length).toBeGreaterThan(0);
    expect(screen.getAllByText('咩創意自動化排版神器').length).toBeGreaterThan(0);

    // 管理員鎖定後，私人專案隱藏，只顯示公開專案，且「大廳即時運作狀態」與「子專案快速接入指南」隱藏
    const lockBtn = screen.getByTitle('已解鎖管理員模式（點擊切換回公開訪客視角）');
    fireEvent.click(lockBtn);
    expect(screen.queryByText('工作室內部專用中樞')).not.toBeInTheDocument();
    expect(screen.getAllByText('咩創意自動化排版神器').length).toBeGreaterThan(0);
    expect(screen.queryByText('大廳即時運作狀態')).not.toBeInTheDocument();
    expect(screen.queryByText('子專案快速接入指南')).not.toBeInTheDocument();
  });

  it('3. 多維度分類篩選、狀態篩選 (含離線待命)、排序切換、重整時快速交錯浮現、內嵌預覽抽屜與專案 QR-code', () => {
    // 模擬同分頁重整（已看過完整開場動畫），注入自訂專案資料
    window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
    window.localStorage.setItem(
      'mei_studio_projects_v1',
      JSON.stringify([
        {
          id: 'custom-proj-ai',
          title: '咩智慧靈感自動化引擎',
          subtitle: 'Mei AI Copilot',
          description: 'AI 自動化輔助引擎',
          category: 'ai-automation',
          icon: 'bot',
          url: '/demo-subproject.html?scene=ai-copilot',
          visibility: 'public',
          featured: true,
          pinned: true,
          status: 'online',
          latencyMs: 18,
          version: 'v1.0.0',
          highlights: ['智慧輔助']
        },
        {
          id: 'custom-proj-web',
          title: '雲絨極簡品牌電商系統',
          subtitle: 'CloudFleece Store',
          description: '現代電商系統',
          category: 'web-business',
          icon: 'globe',
          url: '/demo-subproject.html?scene=commerce',
          visibility: 'public',
          featured: false,
          pinned: false,
          status: 'online',
          latencyMs: 32,
          version: 'v1.0.0',
          highlights: ['極速結帳']
        }
      ])
    );
    render(<App />);
    expect(
      screen.queryByTestId('portal-entrance-overlay')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('project-card-custom-proj-ai')
    ).toHaveClass('bento-wave-reveal');

    // 切換至「AI 與自動化工具」分類
    const aiTab = screen.getByRole('tab', { name: /AI 與自動化工具/i });
    fireEvent.click(aiTab);
    const projectGrid = screen.getByLabelText('專案列表');
    expect(within(projectGrid).getByText('咩智慧靈感自動化引擎')).toBeInTheDocument();
    expect(
      within(projectGrid).queryByText('雲絨極簡品牌電商系統')
    ).not.toBeInTheDocument();

    // 切回「全部專案」
    const allTab = screen.getByRole('tab', { name: /全部專案/i });
    fireEvent.click(allTab);

    // 驗證「離線待命」狀態篩選按鈕存在且可點擊
    const offlineFilterBtn = screen.getByRole('button', { name: /離線待命/i });
    fireEvent.click(offlineFilterBtn);
    expect(
      screen.getByText('目前尚無專案')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('重置所有篩選條件'));

    // 測試排序選擇器 (切換為連線速度優先)
    const sortSelect = screen.getByLabelText('專案排序方式');
    fireEvent.change(sortSelect, { target: { value: 'latency' } });
    expect(sortSelect.value).toBe('latency');

    // 開啟內嵌即時預覽抽屜 (Live Sandbox Drawer)
    const aiCard = screen.getByTestId('project-card-custom-proj-ai');
    const previewBtn = within(aiCard).getByText('快速預覽');
    fireEvent.click(previewBtn);

    const drawer = screen.getByRole('dialog', {
      name: /咩智慧靈感自動化引擎 內嵌預覽與詳情抽屜/i
    });
    expect(drawer).toBeInTheDocument();

    // 切換至手機視角
    fireEvent.click(within(drawer).getByText('手機視角'));
    // 切換至返回大廳 SDK 嵌入碼分頁
    fireEvent.click(within(drawer).getByText('返回大廳 SDK 嵌入碼'));
    expect(within(drawer).getByText(/mei-dock\.js/i)).toBeInTheDocument();

    // 關閉預覽抽屜
    fireEvent.click(within(drawer).getByLabelText('關閉預覽抽屜'));

    // 開啟手機 × 電腦跨裝置 QR-code
    const qrBtn = within(aiCard).getByLabelText(
      '咩智慧靈感自動化引擎 QR-code'
    );
    fireEvent.click(qrBtn);
    expect(
      screen.getByRole('dialog', { name: /跨裝置 QR-code/i })
    ).toBeInTheDocument();
  });

  it('4. 實機模擬 mei-dock.js 懸浮膠囊：防範 DOM XSS、快速專案切換選單與螢幕旋轉拖曳邊界夾制', () => {
    delete window.__MEI_STUDIO_DOCK_MOUNTED__;
    const existingRoot = document.getElementById('mei-studio-dock-root');
    if (existingRoot) existingRoot.remove();

    // 掛載帶有惡意 XSS 屬性之 script 標籤
    const scriptEl = document.createElement('script');
    scriptEl.setAttribute('src', '/sdk/mei-dock.js');
    scriptEl.setAttribute(
      'data-project-name',
      '白板 <img src=x onerror="window.__XSS_FIRED__=true">'
    );
    scriptEl.setAttribute('data-hub-url', 'javascript:alert(1)');
    document.body.appendChild(scriptEl);

    const dockScriptCode = fs.readFileSync(
      path.resolve('public/sdk/mei-dock.js'),
      'utf-8'
    );
    // Execute mei-dock.js in JSDOM
    new Function(dockScriptCode)();

    const dockRoot = document.getElementById('mei-studio-dock-root');
    expect(dockRoot).toBeInTheDocument();
    // 確認未注入任何 <img> 元素，且 javascript: 網址被阻擋並安全轉為 "/"
    expect(dockRoot.querySelector('img')).toBeNull();
    expect(window.__XSS_FIRED__).toBeUndefined();
    const returnLink = dockRoot.querySelector('#mei-dock-return-link');
    expect(returnLink.getAttribute('href')).toBe('/');

    // 測試展開快速專案切換清單
    const switcherBtn = dockRoot.querySelector('#mei-dock-switcher-btn');
    const popover = dockRoot.querySelector('#mei-dock-popover');
    expect(popover).not.toHaveClass('open');
    fireEvent.click(switcherBtn);
    expect(popover).toHaveClass('open');

    // 測試拖曳超出視窗邊界與旋轉螢幕 (landscape -> portrait) 自動夾制於視窗內
    window.innerWidth = 800;
    window.innerHeight = 600;
    dockRoot.getBoundingClientRect = () => ({
      left: 540,
      top: 530,
      width: 240,
      height: 50
    });

    fireEvent.pointerDown(dockRoot, { clientX: 600, clientY: 550 });
    fireEvent.pointerMove(window, { clientX: 5000, clientY: -3000 });
    fireEvent.pointerUp(window);

    // Transform offset should be clamped, never allowing 4400px or -3550px
    expect(dockRoot.style.transform).not.toContain('4400px');
    expect(dockRoot.style.transform).not.toContain('-3550px');

    // Rotate viewport to narrow mobile portrait (375x667)
    window.innerWidth = 375;
    window.innerHeight = 667;
    fireEvent(window, new Event('resize'));
    expect(dockRoot.style.transform).toMatch(/translate3d\(/);

    scriptEl.remove();
    dockRoot.remove();
  });

  it('5. 開場動畫 5 秒推進時間軸 (gathering 3.8s -> parting 1.2s -> 自動完成)、卡片波浪同步與快捷命令列重播驗證', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<App />);
      const rootWrapper = container.firstElementChild;

      const overlay = screen.getByTestId('portal-entrance-overlay');
      expect(overlay).toHaveAttribute('data-stage', 'gathering');
      expect(overlay).toHaveAttribute('data-replay-key', '0');
      // 在 gathering 雲霧凝聚階段，主容器帶有 intro-gathering 類別以待雲層散開時同步觸發卡片彈簧波浪
      expect(rootWrapper).toHaveClass('intro-gathering');

      // 推進至 3800ms，進入雲層向四周散開與景深鏡頭推進階段 (parting)，並同步釋放卡片彈簧波浪
      act(() => {
        vi.advanceTimersByTime(3800);
      });
      expect(screen.getByTestId('portal-entrance-overlay')).toHaveAttribute(
        'data-stage',
        'parting'
      );
      expect(rootWrapper).not.toHaveClass('intro-gathering');

      // 推進 1200ms (共 5000ms)，開場動畫自動完成並卸載，寫入 sessionStorage
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      expect(
        screen.queryByTestId('portal-entrance-overlay')
      ).not.toBeInTheDocument();
      expect(window.sessionStorage.getItem('mei_studio_intro_seen_v1')).toBe(
        'true'
      );

      // 開啟 Cmd/Ctrl + K 命令列並執行「重播大廳開場動畫」
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      const cmdDialog = screen.getByRole('dialog', {
        name: /全域極速搜尋與快捷命令列/i
      });
      fireEvent.click(within(cmdDialog).getByText('重播大廳開場動畫'));
      expect(screen.getByTestId('portal-entrance-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('portal-entrance-overlay')).toHaveAttribute(
        'data-stage',
        'gathering'
      );
      expect(screen.getByTestId('portal-entrance-overlay')).toHaveAttribute(
        'data-replay-key',
        '1'
      );
      expect(rootWrapper).toHaveClass('intro-gathering');

      // 在開場動畫播放期間按下 Ctrl + K，應自動收起開場遮罩並開啟命令列
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      expect(
        screen.queryByTestId('portal-entrance-overlay')
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('dialog', { name: /全域極速搜尋與快捷命令列/i })
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('6. 深淺色模式切換動畫 (750ms 平滑過渡 ＋ 區塊微階梯波浪) 與右下角通知 (微回彈進場 ＋ 2.6s 停留 ＋ 340ms 柔和收回 ＋ 連續點擊防抖)', () => {
    window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
    vi.useFakeTimers();

    try {
      const { container } = render(<App />);

      // 檢查四大區塊與分類篩選列皆帶有微階梯波浪標記類別
      expect(container.querySelector('.theme-stagger-hero')).toBeInTheDocument();
      expect(container.querySelector('.theme-stagger-bento')).toBeInTheDocument();
      expect(container.querySelector('#categories-bar')).toHaveClass('theme-stagger-bento');
      expect(container.querySelector('.theme-stagger-pulse')).toBeInTheDocument();
      expect(container.querySelector('.theme-stagger-footer')).toBeInTheDocument();

      // 初次載入不應帶有 theme-transitioning 避免閃爍
      expect(document.documentElement).not.toHaveClass('theme-transitioning');
      expect(document.documentElement).not.toHaveClass('dark');

      // 點擊深淺色切換按鈕 -> 切換為深色模式
      const themeToggleBtn = screen.getByLabelText('切換深淺色主題');
      fireEvent.click(themeToggleBtn);

      // 驗證附加 theme-transitioning 與 dark 類別
      expect(document.documentElement).toHaveClass('theme-transitioning');
      expect(document.documentElement).toHaveClass('dark');

      // 驗證右下角通知膠囊已渲染，並具備輕彈微回彈進場動畫類別
      const toastEl = screen.getByTestId('studio-toast');
      expect(toastEl).toBeInTheDocument();
      expect(toastEl).toHaveClass('toast-spring-enter');
      expect(toastEl).not.toHaveClass('toast-slide-exit');
      expect(within(toastEl).getByText('已切換至深色模式')).toBeInTheDocument();
      expect(toastEl.querySelector('svg')).toHaveAttribute('data-lucide-name', 'moon');

      // 推進 1100ms（750ms + 240ms 最長階梯延遲完成後）
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      // theme-transitioning 已清理，恢復正常互動
      expect(document.documentElement).not.toHaveClass('theme-transitioning');
      // Toast 仍在 2.6s 停留期中
      expect(screen.getByTestId('studio-toast')).toBeInTheDocument();
      expect(screen.getByTestId('studio-toast')).toHaveClass('toast-spring-enter');

      // 推進至 2600ms，Toast 進入向下柔和收回階段 (toast-slide-exit)
      act(() => {
        vi.advanceTimersByTime(1500); // 1100 + 1500 = 2600ms
      });
      expect(screen.getByTestId('studio-toast')).toHaveClass('toast-slide-exit');

      // 推進 340ms 完成收回動畫並卸載
      act(() => {
        vi.advanceTimersByTime(340);
      });
      expect(screen.queryByTestId('studio-toast')).not.toBeInTheDocument();

      // 測試連續點擊切換防抖與平滑內容更新
      fireEvent.click(themeToggleBtn); // 切回淺色
      expect(document.documentElement).not.toHaveClass('dark');
      const toast2 = screen.getByTestId('studio-toast');
      expect(within(toast2).getByText('已切換至淺色模式')).toBeInTheDocument();
      expect(toast2.querySelector('svg')).toHaveAttribute('data-lucide-name', 'sun');

      // 停留中途（1000ms）再次連續點擊切換
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      fireEvent.click(themeToggleBtn); // 再次切為深色

      // 容器應保持原節點不卸載，更新內容為深色模式並重新計時 2.6s
      expect(screen.getByTestId('studio-toast')).toBeInTheDocument();
      expect(screen.getByTestId('studio-toast')).not.toHaveClass('toast-slide-exit');
      expect(within(screen.getByTestId('studio-toast')).getByText('已切換至深色模式')).toBeInTheDocument();
      expect(screen.getByTestId('studio-toast').querySelector('svg')).toHaveAttribute('data-lucide-name', 'moon');

      // 推進 1500ms（距離第二次點擊 1500ms < 2600ms），仍保持可見
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByTestId('studio-toast')).toBeInTheDocument();
      expect(screen.getByTestId('studio-toast')).not.toHaveClass('toast-slide-exit');

      // 再推進 1100ms（共 2600ms），啟動收回動畫
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(screen.getByTestId('studio-toast')).toHaveClass('toast-slide-exit');

      // 再推進 340ms，完成卸載
      act(() => {
        vi.advanceTimersByTime(340);
      });
      expect(screen.queryByTestId('studio-toast')).not.toBeInTheDocument();

      // 測試點擊通知膠囊提早柔和向下收回 (click to dismiss)
      fireEvent.click(themeToggleBtn);
      const dismissableToast = screen.getByTestId('studio-toast');
      expect(dismissableToast).toHaveClass('toast-spring-enter');
      fireEvent.click(dismissableToast);
      expect(dismissableToast).toHaveClass('toast-slide-exit');
      act(() => {
        vi.advanceTimersByTime(340);
      });
      expect(screen.queryByTestId('studio-toast')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
