import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { StudioLogo, SquircleIconBadge, LucideIcon } from '../components/LucideIcon';
import PortalEntrance from '../components/PortalEntrance';
import HeaderHero from '../components/HeaderHero';
import MobileBottomNav from '../components/MobileBottomNav';
import AdminChatWidget from '../components/AdminChatWidget';
import { AdminUnlockModal } from '../components/AdminProjectModal';
import QRCodeModal from '../components/QRCodeModal';
import CommandPalette from '../components/CommandPalette';
import MemberPortalModal from '../components/MemberPortalModal';
import App from '../App';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const LOGO_SIZES = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];

describe('Mei Creative Studio - Brand Logo (StudioLogo) E2E Specification & Endpoint Harness', () => {
  beforeEach(() => {
    document.documentElement.className = '';
  });

  // =========================================================================
  // Tier 1: 核心幾何向量與 7 階響應式尺寸規範 (Feature Coverage)
  // =========================================================================
  describe('Tier 1: 核心幾何向量與 7 階響應式尺寸規範 (Feature Coverage)', () => {
    it('T1-L1-01: StudioLogo 預設渲染標準結構 (Squircle 底座 + 靈感雲朵無限環向量，無右上角火花徽章)', () => {
      const { container } = render(<StudioLogo size="md" />);
      const logoRoot = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(logoRoot).toBeInTheDocument();
      expect(logoRoot).toHaveClass('studio-brand-logo');

      const badge = logoRoot.querySelector('.squircle-icon-badge');
      expect(badge).toBeInTheDocument();

      const cloudSvg = logoRoot.querySelector('[data-lucide-name="cloud"]');
      expect(cloudSvg).toBeInTheDocument();
      expect(cloudSvg).toHaveClass('studio-infinity-cloud');

      expect(logoRoot.querySelector('.studio-logo-sparkle')).not.toBeInTheDocument();
    });

    it('T1-L1-02: 向量幾何嚴格遵循 Lucide 規範 (strokeWidth=1.75, strokeLinecap="round", strokeLinejoin="round")', () => {
      const { container } = render(<StudioLogo size="md" />);
      const cloudSvg = container.querySelector('.studio-infinity-cloud');
      expect(cloudSvg.getAttribute('stroke-width')).toBe('1.75');
      expect(cloudSvg.getAttribute('stroke-linecap')).toBe('round');
      expect(cloudSvg.getAttribute('stroke-linejoin')).toBe('round');
      expect(cloudSvg.getAttribute('fill')).toBe('none');
      expect(cloudSvg.getAttribute('stroke')).toBe('currentColor');

      const paths = cloudSvg.querySelectorAll('path');
      expect(paths.length).toBeGreaterThanOrEqual(2); // 雲朵外框 + 無限符號創意環
    });

    it('T1-L1-03: 完整支援 7 階響應式尺寸規格 (2xs, xs, sm, md, lg, xl, 2xl)', () => {
      const EXPECTED_SPECS = {
        '2xs': { widthClass: 'w-5', iconWidth: '11' },
        'xs': { widthClass: 'w-6', iconWidth: '13' },
        'sm': { widthClass: 'w-9', iconWidth: '18' },
        'md': { widthClass: 'w-[44px]', iconWidth: '22' },
        'lg': { widthClass: 'w-[56px]', iconWidth: '28' },
        'xl': { widthClass: 'w-20', iconWidth: '46' },
        '2xl': { widthClass: 'w-28', iconWidth: '58' }
      };

      LOGO_SIZES.forEach((sz) => {
        const spec = EXPECTED_SPECS[sz];
        const { container } = render(<StudioLogo size={sz} />);
        const el = container.querySelector(`[data-logo-size="${sz}"]`);
        expect(el).toBeInTheDocument();

        const badge = el.querySelector('.squircle-icon-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass(spec.widthClass);

        const cloudSvg = el.querySelector('.studio-infinity-cloud');
        expect(cloudSvg).toBeInTheDocument();
        expect(cloudSvg).toHaveAttribute('width', spec.iconWidth);
        expect(cloudSvg).toHaveAttribute('height', spec.iconWidth);

        expect(el.querySelector('.studio-logo-sparkle')).not.toBeInTheDocument();
      });
    });

    it('T1-L1-04: 靜態圖示 public/favicon.svg 具備 64x64 視口與正統 Lucide 雲朵無限路徑', () => {
      const faviconPath = path.resolve('public/favicon.svg');
      expect(fs.existsSync(faviconPath)).toBe(true);
      const content = fs.readFileSync(faviconPath, 'utf-8');
      expect(content).toContain('viewBox="0 0 64 64"');
      expect(content).toContain('stroke-width="1.75"');
      expect(content).toMatch(/M17\.5 19H9/); // Lucide Cloud path
      expect(content).toMatch(/M12 14\.5c/); // Infinity loop path
      expect(content).not.toContain('m12 3-1.912'); // 杜絕手繪舊版路徑
    });

    it('T1-L1-05: 靜態圖示 public/pwa-maskable.svg 符合 512x512 尺寸與安全可視區規格', () => {
      const pwaPath = path.resolve('public/pwa-maskable.svg');
      expect(fs.existsSync(pwaPath)).toBe(true);
      const content = fs.readFileSync(pwaPath, 'utf-8');
      expect(content).toContain('viewBox="0 0 512 512"');
      expect(content).toContain('stroke-width="1.75"');
      expect(content).toMatch(/M17\.5 19H9/);
      expect(content).toMatch(/M12 14\.5c/);
    });

    it('T1-L1-06: 跨專案 SDK public/sdk/mei-dock.js 內嵌之 SVG 與 StudioLogo 保持向量一致', () => {
      const dockPath = path.resolve('public/sdk/mei-dock.js');
      expect(fs.existsSync(dockPath)).toBe(true);
      const content = fs.readFileSync(dockPath, 'utf-8');
      expect(content).toContain('stroke-width="1.75"');
      expect(content).toMatch(/M17\.5 19H9/);
      expect(content).toMatch(/M12 14\.5c/);
      expect(content).not.toContain('m12 3-1.912');
    });
  });

  // =========================================================================
  // Tier 2: 邊界、極限情境與參數容錯 (Boundary & Corner Cases)
  // =========================================================================
  describe('Tier 2: 邊界、極限情境與參數容錯 (Boundary & Corner Cases)', () => {
    it('T2-L2-01: 未傳入 size 或傳入 undefined 時，安全降級為預設 md 尺寸', () => {
      const { container } = render(<StudioLogo />);
      const logoEl = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(logoEl).toHaveAttribute('data-logo-size', 'md');
      expect(logoEl.querySelector('.squircle-icon-badge')).toHaveClass('w-[44px]', 'h-[44px]');
    });

    // T2-L2-02
    it('T2-L2-02: 傳入無效 size 鍵值 (如 "invalid-size", "", null) 時，平滑回退至 md 且不引發崩潰', () => {
      const { container: c1 } = render(<StudioLogo size="invalid-size" />);
      const logo1 = c1.querySelector('[data-testid="studio-brand-logo"]');
      expect(logo1).toHaveAttribute('data-logo-size', 'md');
      expect(c1.querySelector('.squircle-icon-badge')).toHaveClass('w-[44px]', 'h-[44px]');
      const cloudSvg1 = c1.querySelector('.studio-infinity-cloud');
      expect(cloudSvg1).toBeInTheDocument();
      expect(cloudSvg1).toHaveAttribute('width', '22');

      const { container: c2 } = render(<StudioLogo size="" />);
      const logo2 = c2.querySelector('[data-testid="studio-brand-logo"]');
      expect(logo2).toHaveAttribute('data-logo-size', 'md');
      expect(c2.querySelector('.squircle-icon-badge')).toHaveClass('w-[44px]', 'h-[44px]');
      const cloudSvg2 = c2.querySelector('.studio-infinity-cloud');
      expect(cloudSvg2).toBeInTheDocument();
      expect(cloudSvg2).toHaveAttribute('width', '22');

      const { container: c3 } = render(<StudioLogo size={null} />);
      const logo3 = c3.querySelector('[data-testid="studio-brand-logo"]');
      expect(logo3).toHaveAttribute('data-logo-size', 'md');
      expect(c3.querySelector('.squircle-icon-badge')).toHaveClass('w-[44px]', 'h-[44px]');
      const cloudSvg3 = c3.querySelector('.studio-infinity-cloud');
      expect(cloudSvg3).toBeInTheDocument();
      expect(cloudSvg3).toHaveAttribute('width', '22');
    });

    it('T2-L2-03: 微型 2xs 與展示型 2xl 邊界尺寸比例完整且 viewBox 保持 0 0 24 24', () => {
      const { container: c2xs } = render(<StudioLogo size="2xs" />);
      const svg2xs = c2xs.querySelector('.studio-infinity-cloud');
      expect(svg2xs).toHaveAttribute('viewBox', '0 0 24 24');

      const { container: c2xl } = render(<StudioLogo size="2xl" />);
      const svg2xl = c2xl.querySelector('.studio-infinity-cloud');
      expect(svg2xl).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('T2-L2-04: 自訂類別名稱 (className, badgeClassName) 精確透傳無覆蓋遺失', () => {
      const { container } = render(
        <StudioLogo
          size="sm"
          className="custom-root-class"
          badgeClassName="custom-badge-class"
        />
      );
      const root = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(root).toHaveClass('custom-root-class');
      expect(root.querySelector('.squircle-icon-badge')).toHaveClass('custom-badge-class');
    });

    it('T2-L2-05: 原生屬性透傳與無障礙標籤 (aria-label, data-*) 完整支援', () => {
      const { container } = render(
        <StudioLogo
          size="md"
          aria-label="咩創意工作室品牌商標"
          data-custom-id="logo-brand-test"
          data-testid="custom-logo-target"
        />
      );
      const root = container.querySelector('[data-testid="custom-logo-target"]');
      expect(root).toBeInTheDocument();
      expect(root).toHaveAttribute('aria-label', '咩創意工作室品牌商標');
      expect(root).toHaveAttribute('data-custom-id', 'logo-brand-test');
    });
  });

  // =========================================================================
  // Tier 3: 跨功能組合、主題自適應與響應式交互 (Cross-Feature Combinations)
  // =========================================================================
  describe('Tier 3: 跨功能組合、主題自適應與響應式交互 (Cross-Feature Combinations)', () => {
    it('T3-L3-01: 淺色與深色主題色彩樣式自適應 (sky-500 vs dark:sky-400)', () => {
      const { container } = render(<StudioLogo size="md" />);
      const badge = container.querySelector('.squircle-icon-badge');
      expect(badge.className).toContain('bg-sky-500/10');
      expect(badge.className).toContain('dark:bg-sky-400/10');

      const svg = container.querySelector('.studio-infinity-cloud');
      expect(svg.getAttribute('class')).toContain('text-sky-500');
      expect(svg.getAttribute('class')).toContain('dark:text-sky-400');
    });

    it('T3-L3-02: 動態切換根節點深色模式 (dark class) 時維持正確渲染與樣式持久化', () => {
      const { container, rerender } = render(<StudioLogo size="lg" />);
      const badge = container.querySelector('.squircle-icon-badge');
      const cloudSvg = container.querySelector('.studio-infinity-cloud');

      // 驗證初始淺色主題對應樣式
      expect(badge).toHaveClass('bg-sky-500/10', 'dark:bg-sky-400/10');
      expect(cloudSvg).toHaveClass('text-sky-500', 'dark:text-sky-400');

      // 動態切換深色模式並重新渲染
      document.documentElement.classList.add('dark');
      rerender(<StudioLogo size="lg" />);

      const darkLogo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(darkLogo).toBeInTheDocument();
      expect(darkLogo).toHaveAttribute('data-logo-size', 'lg');
      const darkBadge = darkLogo.querySelector('.squircle-icon-badge');
      expect(darkBadge).toHaveClass('w-[56px]', 'h-[56px]', 'dark:bg-sky-400/10');
      const darkCloud = darkLogo.querySelector('.studio-infinity-cloud');
      expect(darkCloud).toHaveAttribute('width', '28');
      expect(darkCloud).toHaveClass('dark:text-sky-400');

      // 動態切換回淺色模式並重新渲染
      document.documentElement.classList.remove('dark');
      rerender(<StudioLogo size="lg" />);

      const lightLogo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(lightLogo).toBeInTheDocument();
      expect(lightLogo).toHaveAttribute('data-logo-size', 'lg');
      const lightBadge = lightLogo.querySelector('.squircle-icon-badge');
      expect(lightBadge).toHaveClass('w-[56px]', 'h-[56px]', 'bg-sky-500/10');
      const lightCloud = lightLogo.querySelector('.studio-infinity-cloud');
      expect(lightCloud).toHaveAttribute('width', '28');
      expect(lightCloud).toHaveClass('text-sky-500');
    });

    it('T3-L3-03: 外部容器 hover 縮放過渡 (scale-105) 正常作用不影響內部比例', () => {
      const { container } = render(
        <div className="group">
          <StudioLogo size="md" className="group-hover:scale-105 transition-transform" />
        </div>
      );
      const groupDiv = container.querySelector('.group');
      fireEvent.mouseEnter(groupDiv);
      const logo = container.querySelector('.studio-brand-logo');
      expect(logo).toHaveClass('group-hover:scale-105', 'transition-transform');
    });
  });

  // =========================================================================
  // Tier 4: 全站端點一致性呈現、真實使用者旅程與 Zero Emoji 檢驗 (Real-World Delivery)
  // =========================================================================
  describe('Tier 4: 全站端點一致性呈現、真實使用者旅程與 Zero Emoji 檢驗 (Real-World Delivery)', () => {
    it('T4-L4-01: PortalEntrance (開場動畫) 端點正確渲染 StudioLogo (size=xl)', () => {
      const { container } = render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={() => {}}
          onComplete={() => {}}
        />
      );
      const entranceLogo = container.querySelector('.portal-core-emblem');
      expect(entranceLogo).toBeInTheDocument();
      expect(entranceLogo).toHaveAttribute('data-logo-size', 'xl');
    });

    it('T4-L4-02: HeaderHero (頂部導覽列) 端點正確渲染 StudioLogo (size=md)', () => {
      const { container } = render(
        <HeaderHero
          projects={[]}
          visibleProjects={[]}
          filteredCount={0}
          recentProjects={[]}
          selectedCategory="all"
          onSelectCategory={() => {}}
          selectedStatus="all"
          onSelectStatus={() => {}}
          searchQuery=""
          onSearchChange={() => {}}
          theme="light"
          onToggleTheme={() => {}}
          isAdmin={false}
          onOpenAdminUnlock={() => {}}
          onLockAdmin={() => {}}
          onOpenAddProject={() => {}}
          onOpenCommandPalette={() => {}}
          onOpenSdkGuide={() => {}}
          onOpenBackupModal={() => {}}
          onRefreshHealth={() => {}}
          isProbingHealth={false}
          onOpenInstallGuide={() => {}}
        />
      );
      const heroLogo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(heroLogo).toBeInTheDocument();
      expect(heroLogo).toHaveAttribute('data-logo-size', 'md');
    });

    it('T4-L4-03: MobileBottomNav (手機底部導覽列) 端點正確渲染 StudioLogo (size=xs)', () => {
      const { container } = render(
        <MobileBottomNav
          activeSection="explore"
          onNavigateSection={() => {}}
          onOpenCommandPalette={() => {}}
          isAdmin={false}
          onOpenAdminUnlock={() => {}}
          onOpenAddProject={() => {}}
        />
      );
      const navLogo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(navLogo).toBeInTheDocument();
      expect(navLogo).toHaveAttribute('data-logo-size', 'xs');
    });

    it('T4-L4-04: AdminChatWidget (客服浮動面板) 端點在展開時正確渲染 StudioLogo (size=xs)', () => {
      const { container } = render(
        <AdminChatWidget
          isAdmin={true}
          isIntroPlaying={false}
          projects={[]}
          changelog={[]}
        />
      );
      const fabBtn = screen.getByTestId('admin-chat-fab');
      expect(fabBtn).toBeInTheDocument();
      fireEvent.click(fabBtn);

      const widgetLogo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(widgetLogo).toBeInTheDocument();
      expect(widgetLogo).toHaveAttribute('data-logo-size', 'xs');
    });

    it('T4-L4-05: QRCodeModal (跨裝置 QR 彈窗) 端點正確渲染 StudioLogo (size=md)', () => {
      const sampleProj = {
        id: 'test-proj',
        title: '測試專案',
        description: '測試專案描述',
        url: 'https://example.com'
      };
      const { container } = render(
        <QRCodeModal project={sampleProj} onClose={() => {}} />
      );
      const qrLogo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(qrLogo).toBeInTheDocument();
      expect(qrLogo).toHaveAttribute('data-logo-size', 'md');
    });

    it('T4-L4-06: AdminUnlockModal (管理員中樞解鎖彈窗) 端點正確渲染 StudioLogo (size=md)', () => {
      const { container } = render(
        <AdminUnlockModal
          isOpen={true}
          onClose={() => {}}
          onUnlockSuccess={() => {}}
          verifyPin={() => false}
        />
      );
      const unlockLogo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(unlockLogo).toBeInTheDocument();
      expect(unlockLogo).toHaveAttribute('data-logo-size', 'md');
    });

    it('T4-L4-07: CommandPalette (快捷調色盤) 端點正確渲染 StudioLogo (size=xs)', () => {
      const { container } = render(
        <CommandPalette
          isOpen={true}
          onClose={() => {}}
          projects={[]}
          onSelectProject={() => {}}
          onToggleTheme={() => {}}
          currentTheme="light"
          isAdmin={false}
        />
      );
      const paletteLogos = container.querySelectorAll('[data-testid="studio-brand-logo"]');
      expect(paletteLogos.length).toBeGreaterThanOrEqual(1);
      expect(paletteLogos[0]).toHaveAttribute('data-logo-size', 'xs');
    });

    it('T4-L4-08: 全站商標元件、靜態 SVG 與端點呈現 100% 零 Emoji 違規', () => {
      // 掃描包含 HeaderHero, PortalEntrance, MobileBottomNav, AdminChatWidget, QRCodeModal, CommandPalette 等所有端點元件
      const componentFiles = fs
        .readdirSync(path.resolve('src/components'))
        .filter((file) => file.endsWith('.jsx'))
        .map((file) => path.join('src/components', file));

      const staticFiles = [
        'public/favicon.svg',
        'public/pwa-maskable.svg',
        'public/sdk/mei-dock.js'
      ];

      const allFilesToCheck = [...componentFiles, ...staticFiles];
      expect(allFilesToCheck.length).toBeGreaterThanOrEqual(10);

      for (const rel of allFilesToCheck) {
        const text = fs.readFileSync(path.resolve(rel), 'utf-8');
        expect(EMOJI_REGEX.test(text)).toBe(false);
      }
    });

    it('T4-L4-09: MemberPortalModal (全站聯通會員專區) 端點在開啟時正確渲染 StudioLogo (size=md)', () => {
      const { container } = render(
        <MemberPortalModal
          isOpen={true}
          onClose={() => {}}
          currentMember={null}
          onMemberChange={() => {}}
          onNotify={() => {}}
        />
      );
      const modal = container.querySelector('[data-testid="member-portal-modal"]');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-label', '全站聯通會員專區');

      const modalLogo = modal.querySelector('[data-testid="studio-brand-logo"]');
      expect(modalLogo).toBeInTheDocument();
      expect(modalLogo).toHaveAttribute('data-logo-size', 'md');

      const badge = modalLogo.querySelector('.squircle-icon-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('w-[44px]', 'h-[44px]');
      expect(modalLogo.querySelector('.studio-logo-sparkle')).not.toBeInTheDocument();
    });

    it('T4-L4-10: App footer (主頁面頁尾) 端點正確渲染 StudioLogo (size=sm)', () => {
      window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
      const { container } = render(<App />);
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();

      const footerLogo = footer.querySelector('[data-testid="studio-brand-logo"]');
      expect(footerLogo).toBeInTheDocument();
      expect(footerLogo).toHaveAttribute('data-logo-size', 'sm');

      const badge = footerLogo.querySelector('.squircle-icon-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('w-9', 'h-9');
      expect(footerLogo.querySelector('.studio-logo-sparkle')).not.toBeInTheDocument();
    });
  });
});
