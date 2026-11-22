import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import App from '../App';
import HeaderHero from '../components/HeaderHero';
import { DEFAULT_PROJECTS } from '../data/defaultData';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

describe('手機與多比例裝置響應式適配驗證 (Multi-Aspect-Ratio Mobile Responsive Adaptation)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
  });

  it('1. 樣式表涵蓋四大裝置長寬比斷點、流體字級 (clamp) 與動態視窗高度 (dvh) 規範', () => {
    const cssText = fs.readFileSync(
      path.resolve('src/styles/index.css'),
      'utf-8'
    );

    // 驗證流體字級 clamp() 與窄屏標語降級防拉寬
    expect(cssText).toContain('.studio-hero-title-zh');
    expect(cssText).toContain('clamp(');
    expect(cssText).toContain('@media (max-width: 374px)');

    // 驗證動態視窗高度 (dvh) 工具類別
    expect(cssText).toContain('.min-h-dvh-screen');
    expect(cssText).toContain('100dvh');
    expect(cssText).toContain('.h-dvh-90');
    expect(cssText).toContain('90dvh');
    expect(cssText).toContain('.max-h-dvh-92');
    expect(cssText).toContain('.max-h-dvh-90');
    expect(cssText).toContain('.max-h-dvh-85');
    expect(cssText).toContain('.max-h-dvh-60');

    // 驗證四大長寬比媒體查詢：窄屏 (<=360px)、摺疊內螢幕 (4:3~1:1)、手機橫向短高 (landscape <=500px)
    expect(cssText).toContain('@media (max-width: 360px)');
    expect(cssText).toContain('min-aspect-ratio: 3/4');
    expect(cssText).toContain('max-aspect-ratio: 4/3');
    expect(cssText).toContain('@media (orientation: landscape) and (max-height: 500px)');
    expect(cssText).toContain('.mobile-header-bar');
    expect(cssText).toContain('.mobile-bottom-nav');
  });

  it('2. 頂部導覽列與底部導覽列：支援窄屏長會員名稱自動截斷與橫向短高模式自動收斂', () => {
    window.localStorage.setItem(
      'mei_universal_member_sso_v1',
      JSON.stringify({
        unionId: 'mei_user_long_name_test',
        uid: 'long-name-uid',
        email: 'longname@meistudio.live',
        displayName: '超級長的名字測試創作者團隊代表',
        tier: 'architect',
        tierLabel: '領航架構師'
      })
    );

    const { container } = render(<App />);

    // 主容器具備 dvh 動態視窗高度
    expect(container.firstElementChild).toHaveClass('min-h-dvh-screen');

    // 頂部導覽列具備 mobile-header-bar 與窄屏防擠壓限制
    const headerBar = container.querySelector('.mobile-header-bar');
    expect(headerBar).toBeInTheDocument();

    const memberBtn = screen.getByTestId('header-member-portal-btn');
    expect(memberBtn).toHaveClass('max-w-[124px]', 'sm:max-w-[200px]');
    const nameSpan = within(memberBtn).getByText('超級長的名字測試創作者團隊代表');
    expect(nameSpan).toHaveClass('truncate');

    // 底部導覽列具備 mobile-bottom-nav 與橫向模式收斂類別
    const bottomNav = screen.getByTestId('mobile-bottom-nav');
    expect(bottomNav).toHaveClass('mobile-bottom-nav');
    expect(bottomNav.querySelector('.mobile-bottom-nav-grid')).toBeInTheDocument();
    expect(bottomNav.querySelector('.mobile-nav-primary-btn')).toBeInTheDocument();
  });

  it('3. Bento 專案網格：在摺疊機內螢幕/小平板/橫向手機 (sm: 640px+) 自動切換為雙欄佈局，且精選大卡橫跨雙欄', () => {
    window.localStorage.setItem(
      'mei_studio_projects_v1',
      JSON.stringify([
        {
          id: 'rwd-proj-1',
          title: '咩創意雲端白板',
          subtitle: 'Cloud Canvas',
          description: '支援多比例畫布自適應',
          category: 'multimedia',
          icon: 'layers',
          url: '/demo-subproject.html',
          visibility: 'public',
          featured: true,
          pinned: true,
          status: 'online',
          latencyMs: 16,
          version: 'v1.0.0'
        },
        {
          id: 'rwd-proj-2',
          title: '咩智慧自動化助手',
          subtitle: 'AI Copilot',
          description: '行動與桌面雙棲引擎',
          category: 'ai-automation',
          icon: 'bot',
          url: '/demo-subproject.html',
          visibility: 'public',
          featured: false,
          pinned: false,
          status: 'online',
          latencyMs: 21,
          version: 'v1.0.0'
        }
      ])
    );

    render(<App />);

    const gridSection = screen.getByLabelText('專案列表');
    const gridContainer = gridSection.firstElementChild;
    expect(gridContainer).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-12', 'foldable-inner-grid');

    const spotlightCard = screen.getByTestId('project-card-rwd-proj-1');
    const regularCard = screen.getByTestId('project-card-rwd-proj-2');
    expect(spotlightCard).toHaveClass('sm:col-span-2', 'lg:col-span-6');
    expect(regularCard).toHaveClass('sm:col-span-1', 'lg:col-span-4');
  });

  it('4. 內嵌預覽抽屜 (ProjectPreviewDrawer)：支援電腦視角、摺疊/平板 (4:3) 與手機視角 (9:16) 三種比例切換且採用 dvh 防裁切', () => {
    window.localStorage.setItem(
      'mei_studio_projects_v1',
      JSON.stringify([
        {
          id: 'drawer-rwd-proj',
          title: '跨比例預覽測試專案',
          subtitle: 'Aspect Preview',
          description: '測試三種視角比例切換',
          category: 'web-business',
          icon: 'globe',
          url: '/demo-subproject.html',
          visibility: 'public',
          featured: false,
          pinned: false,
          status: 'online',
          latencyMs: 19,
          version: 'v1.0.0'
        }
      ])
    );

    render(<App />);

    const card = screen.getByTestId('project-card-drawer-rwd-proj');
    fireEvent.click(within(card).getByText('快速預覽'));

    const drawer = screen.getByRole('dialog', {
      name: /跨比例預覽測試專案 內嵌預覽與詳情抽屜/i
    });
    expect(drawer.firstElementChild).toHaveClass('h-dvh-90');

    const frame = within(drawer).getByTestId('sandbox-viewport-frame');
    expect(frame).toHaveAttribute('data-viewport-mode', 'desktop');

    // 切換至「摺疊/平板」4:3 視角
    fireEvent.click(within(drawer).getByText('摺疊/平板'));
    expect(frame).toHaveAttribute('data-viewport-mode', 'foldable');
    expect(frame).toHaveClass('aspect-[4/3]');

    // 切換至「手機視角」9:16 視角
    fireEvent.click(within(drawer).getByText('手機視角'));
    expect(frame).toHaveAttribute('data-viewport-mode', 'mobile');
    expect(frame).toHaveClass('aspect-[9/16]');
  });

  it('5. 浮動元件防重疊：管理員模式下手機端 Toast 自動上移 (bottom-36) 避開 AI 客服懸浮鈕 (bottom-20)，且維持亮色淡藍高對比', () => {
    render(<App />);

    // 解鎖管理員模式
    fireEvent.click(screen.getByTestId('footer-admin-unlock-btn'));
    fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
      target: { value: 'mei888' }
    });
    fireEvent.click(screen.getByText('立即解鎖管理後台'));

    const fab = screen.getByTestId('admin-chat-fab');
    const toast = screen.getByTestId('studio-toast');

    expect(fab).toBeInTheDocument();
    expect(toast).toBeInTheDocument();

    // 管理員解鎖時 Toast 在手機端自動上移至 bottom-36，避免與 bottom-20 的 AI 客服按鈕重疊
    expect(toast.className).toContain('bottom-36');
    expect(toast.className).toContain('max-w-[calc(100vw-2rem)]');
    expect(toast.className).toContain('bg-sky-100/95');
    expect(toast.className).toContain('text-slate-900');
  });

  it('6. 子專案懸浮導覽膠囊 (mei-dock.js) 具備窄屏 (max-width: 480px) 與橫向短高模式適配規則且零 Emoji', () => {
    const dockCode = fs.readFileSync(
      path.resolve('public/sdk/mei-dock.js'),
      'utf-8'
    );
    expect(dockCode).toContain('@media (max-width: 480px)');
    expect(dockCode).toContain('calc(100vw - 24px)');
    expect(dockCode).toContain('@media (orientation: landscape) and (max-height: 500px)');
    expect(EMOJI_REGEX.test(dockCode)).toBe(false);
  });

  it('7. 行動端頁尾文字垂直堆疊與底部導覽平齊無凸出驗證 (R4-F1 & R4-F2)', () => {
    const { container } = render(<App />);
    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();

    // R4-F1: 頁尾文字容器具備 flex-col sm:flex-row，且隔點在手機端隱藏 (hidden sm:inline)
    const footerTextContainer = footer.querySelector('.flex.flex-col.sm\\:flex-row.sm\\:items-center');
    expect(footerTextContainer).toBeInTheDocument();
    const dot = footerTextContainer.querySelector('.hidden.sm\\:inline');
    expect(dot).toBeInTheDocument();

    // R4-F2: 底部導覽快速搜尋按鈕平齊，無 -mt-4 突出類別
    const primaryNavBtn = container.querySelector('.mobile-nav-primary-btn');
    expect(primaryNavBtn).toBeInTheDocument();
    expect(primaryNavBtn.className).not.toContain('-mt-4');
  });

  it('8. HeaderHero 頂部導覽列保護品牌區 (md:shrink-0)、防搜尋列 <kbd> 溢出、極窄屏防重疊與管理員 1024px Hero 標題換行', () => {
    const baseProps = {
      projects: DEFAULT_PROJECTS,
      visibleProjects: DEFAULT_PROJECTS,
      filteredCount: DEFAULT_PROJECTS.length,
      recentProjects: [],
      selectedCategory: 'all',
      onSelectCategory: vi.fn(),
      selectedStatus: 'all',
      onSelectStatus: vi.fn(),
      searchQuery: '',
      onSearchChange: vi.fn(),
      theme: 'light',
      onToggleTheme: vi.fn(),
      isAdmin: false,
      onOpenAdminUnlock: vi.fn(),
      onLockAdmin: vi.fn(),
      onOpenAddProject: vi.fn(),
      onOpenCommandPalette: vi.fn(),
      onOpenSdkGuide: vi.fn(),
      onOpenBackupModal: vi.fn(),
      onRefreshHealth: vi.fn(),
      isProbingHealth: false,
      onOpenInstallGuide: vi.fn(),
      onSelectProjectPreview: vi.fn(),
      onReplayEntrance: vi.fn(),
      onResetFilters: vi.fn(),
      sortBy: 'default',
      onSelectSortBy: vi.fn(),
      currentMember: null,
      onOpenMemberPortal: vi.fn()
    };

    const { rerender, container } = render(<HeaderHero {...baseProps} />);

    // 1. 品牌區在 md 以上永不壓縮 (md:shrink-0)，完整保留標題、版本膠囊與英文副標；sm (640px-767px) 隱藏版本膠囊與線上巡檢膠囊以防重疊
    const brandLink = container.querySelector('.mobile-header-bar a[href="#top"]');
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveClass('min-w-0', 'shrink', 'md:shrink-0');
    const titleZh = within(brandLink).getByText('咩創意工作室');
    expect(titleZh).toHaveClass('whitespace-nowrap', 'max-[359px]:text-[13.5px]');
    expect(within(brandLink).getByText('v1.0.0')).toHaveClass('hidden', 'md:inline-flex', 'shrink-0');
    expect(within(brandLink).getByText('Mei Creative Studio')).toHaveClass('hidden', 'min-[400px]:block', 'uppercase', 'truncate');

    const healthBtn = screen.getByTitle('即時巡檢所有子專案連線狀態');
    expect(healthBtn).toHaveClass('hidden', 'md:inline-flex');

    // 2. 中央搜尋列具備 overflow-hidden，且 <kbd> 於 <lg 時隱藏以避讓 768px–950px 空間
    const searchBtn = screen.getByLabelText('開啟全域搜尋命令列');
    expect(searchBtn).toHaveClass('hidden', 'md:flex', 'flex-1', 'min-w-0', 'overflow-hidden');
    const kbd = searchBtn.querySelector('kbd');
    expect(kbd).toBeInTheDocument();
    expect(kbd).toHaveClass('hidden', 'lg:inline-flex', 'shrink-0');

    // 3. 訪客模式 Hero <h1> 維持 sm:flex-nowrap
    const guestHeroH1 = container.querySelector('h1.studio-hero-title-zh');
    expect(guestHeroH1).toHaveClass('flex-wrap', 'sm:flex-nowrap');

    // 4. 切換為「管理員 + 長名稱會員」模式
    rerender(
      <HeaderHero
        {...baseProps}
        isAdmin={true}
        currentMember={{
          unionId: 'mei_user_long_header',
          uid: 'long-header-uid',
          email: 'longheader@meistudio.live',
          displayName: '超級長的名字測試創作者團隊代表',
          tier: 'architect',
          tierLabel: '領航架構師'
        }}
      />
    );

    // 保留測試鎖定之 memberBtn max-w-[124px] / sm:max-w-[200px]，並加入 <430px 與 md 收斂限制
    const memberBtn = screen.getByTestId('header-member-portal-btn');
    expect(memberBtn).toHaveClass(
      'max-w-[124px]',
      'max-[429px]:max-w-[94px]',
      'sm:max-w-[200px]',
      'md:max-w-[144px]',
      'lg:max-w-[200px]'
    );

    // 新增專案保留 DOM 文字節點且於 <lg 折疊為圖示按鈕 (hidden lg:inline)，<375px 交由底部導覽提供入口
    const addProjectTexts = screen.getAllByText('新增專案');
    expect(addProjectTexts[0]).toHaveClass('hidden', 'lg:inline');
    expect(addProjectTexts[0].closest('button')).toHaveClass('hidden', 'min-[375px]:inline-flex');

    // 安裝按鈕保留 title="安裝至桌面或主畫面指南" 並於管理員極窄手機 (<480px) 自動隱藏避讓
    const installBtn = screen.getByTitle('安裝至桌面或主畫面指南');
    expect(installBtn).toHaveClass('hidden', 'min-[480px]:inline-flex');

    // 管理員模式下 1024px (lg:col-span-8) 允許 Hero <h1> 換行防裁切，1280px (xl:) 恢復單行
    const adminHeroH1 = container.querySelector('h1.studio-hero-title-zh');
    expect(adminHeroH1).toHaveClass('lg:flex-wrap', 'xl:flex-nowrap');
  });

  it('9. 全域命令列提供 PWA 安裝應用指南捷徑，且主次按鈕禁止使用 transition: all 干擾響應式寬度收斂', () => {
    const cssText = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf-8');
    const primaryMatch = cssText.match(/\.btn-sky-primary\s*\{[^}]*\}/);
    const secondaryMatch = cssText.match(/\.btn-sky-secondary\s*\{[^}]*\}/);
    expect(primaryMatch?.[0]).not.toContain('transition: all');
    expect(secondaryMatch?.[0]).not.toContain('transition: all');

    render(<App />);
    fireEvent.click(screen.getByLabelText('開啟全域搜尋命令列'));
    const palette = screen.getByRole('dialog', { name: '全域極速搜尋與快捷命令列' });
    const installCmd = within(palette).getByText('安裝應用指南 (PWA)');
    expect(installCmd).toBeInTheDocument();

    fireEvent.click(installCmd);
    expect(screen.queryByRole('dialog', { name: '全域極速搜尋與快捷命令列' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '子專案接入指南與跨平台安裝教學' })).toBeInTheDocument();
    expect(screen.getByText('桌面與行動裝置安裝指南')).toBeInTheDocument();
  });
});
