import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import MobileBottomNav from '../components/MobileBottomNav';
import AdminChatWidget from '../components/AdminChatWidget';
import PortalEntrance from '../components/PortalEntrance';
import { STUDIO_CONFIG } from '../data/defaultData';

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('咩創意工作室 Mei Creative Studio - 行動裝置比例與 PWA APP 規格深度驗證', () => {
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
  // 1. PWA Manifest 與 Viewport 標準規範
  // =========================================================================
  describe('1. PWA Manifest 與 Viewport 標準規範', () => {
    it('PWA-01: index.html 必須包含 viewport-fit=cover 且支援縮放', () => {
      const htmlPath = path.resolve('index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      expect(htmlContent).toContain('viewport-fit=cover');
      expect(htmlContent).toContain('width=device-width');
      expect(htmlContent).toContain('initial-scale=1.0');
    });

    it('PWA-02: index.html 必須包含正確之 PWA meta 標籤與 manifest.webmanifest 連結', () => {
      const htmlPath = path.resolve('index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      expect(htmlContent).toContain('rel="manifest"');
      expect(htmlContent).toContain('href="/manifest.webmanifest"');
      expect(htmlContent).toContain('apple-mobile-web-app-capable');
      expect(htmlContent).toContain('mobile-web-app-capable');
      expect(htmlContent).toContain('apple-mobile-web-app-status-bar-style');
      expect(htmlContent).toContain('apple-touch-icon');
      expect(htmlContent).toContain('name="theme-color"');
    });

    it('PWA-03: manifest.webmanifest 必須為合法 JSON 且符合 Standalone App 標準', () => {
      const manifestPath = path.resolve('public/manifest.webmanifest');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw);

      expect(manifest.name).toBe('咩創意工作室 Mei Creative Studio');
      expect(manifest.short_name).toBe('咩創意工作室');
      expect(manifest.display).toBe('standalone');
      expect(manifest.start_url).toBe('/');
      expect(manifest.background_color).toBe('#F4F9FF');
      expect(manifest.theme_color).toBe('#38BDF8');
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

      const maskableIcon = manifest.icons.find((i) => i.purpose === 'maskable');
      expect(maskableIcon).toBeDefined();
    });
  });

  // =========================================================================
  // 2. 介面佈局比例與 Safe Area Insets 避讓驗證
  // =========================================================================
  describe('2. 介面佈局比例與 Safe Area Insets 避讓驗證', () => {
    it('SAFE-01: MobileBottomNav 必須在 md 寬度以下顯示並具備 pb-safe-bottom 避讓底部 Home Bar', () => {
      const onNavigate = vi.fn();
      const onOpenCommand = vi.fn();

      render(
        <MobileBottomNav
          activeSection="explore"
          onNavigateSection={onNavigate}
          onOpenCommandPalette={onOpenCommand}
          isAdmin={false}
          onOpenAdminUnlock={vi.fn()}
          onOpenAddProject={vi.fn()}
        />
      );

      const nav = screen.getByRole('navigation', { name: '手機端底部快速導覽列' });
      expect(nav).toHaveClass('md:hidden');
      expect(nav).toHaveClass('fixed');
      expect(nav).toHaveClass('bottom-0');
      expect(nav).toHaveClass('pb-safe-bottom');
    });

    it('SAFE-02: 頂部 Header 在 HeaderHero.jsx 中必須具備 pt-[env(safe-area-inset-top,0px)] 避讓 iPhone 瀏海與靈動島', () => {
      const headerPath = path.resolve('src/components/HeaderHero.jsx');
      const content = fs.readFileSync(headerPath, 'utf-8');

      expect(content).toContain('pt-[env(safe-area-inset-top,0px)]');
      expect(content).toContain('sticky top-0');
    });

    it('SAFE-03: AdminChatWidget 浮動按鈕在行動端必須向上避讓底部導覽列與 Safe Area', () => {
      render(<AdminChatWidget isAdmin={true} isIntroPlaying={false} />);

      const fab = screen.getByTestId('admin-chat-fab');
      expect(fab.className).toContain('bottom-20');
      expect(fab.className).toContain('env(safe-area-inset-bottom');
      expect(fab.className).toContain('sm:bottom-8');
    });

    it('SAFE-04: AdminChatWidget 訊息輸入表單必須具備 safe-area-inset-bottom 避讓防止 Home Bar 遮擋', () => {
      render(<AdminChatWidget isAdmin={true} isIntroPlaying={false} />);

      // 打開對話視窗
      fireEvent.click(screen.getByTestId('admin-chat-fab'));

      const windowDialog = screen.getByTestId('admin-chat-window');
      expect(windowDialog).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      const form = textarea.closest('form');
      expect(form.className).toContain('env(safe-area-inset-bottom');
    });

    it('SAFE-05: PortalEntrance 略過按鈕具備 safe-area-inset 避讓', () => {
      render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={vi.fn()}
        />
      );

      const skipBtn = screen.getByTestId('skip-entrance-btn');
      expect(skipBtn.className).toContain('env(safe-area-inset-bottom)');
      expect(skipBtn.className).toContain('env(safe-area-inset-right)');
    });
  });

  // =========================================================================
  // 3. 規範一致性：Zero Emoji 與品牌標語驗證
  // =========================================================================
  describe('3. 規範一致性：Zero Emoji 與品牌標語驗證', () => {
    it('SPEC-01: index.html 與 manifest.webmanifest 無系統 Emoji', () => {
      const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
      const manifest = fs.readFileSync(path.resolve('public/manifest.webmanifest'), 'utf-8');

      expect(EMOJI_REGEX.test(html)).toBe(false);
      expect(EMOJI_REGEX.test(manifest)).toBe(false);
    });

    it('SPEC-02: 品牌標語文字完全符合「創意無限∞咩有極限」', () => {
      expect(STUDIO_CONFIG.description).toBe('創意無限∞咩有極限');
    });
  });
});
