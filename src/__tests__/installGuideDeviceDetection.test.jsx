import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  SdkAndInstallModal,
  detectUserDeviceAndOS
} from '../components/AdminProjectModal';

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('咩創意工作室 - 安裝指南權限隔離與即時裝置/系統偵測驗證', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. 訪客視角 vs 管理員視角之權限隔離
  // =========================================================================
  describe('1. 訪客權限隔離 (Visitor Isolation)', () => {
    it('VISITOR-01: 訪客模式 (isAdmin: false) 下，完全隱藏「子專案返回大廳 SDK (mei-dock.js)」頁籤與內容', () => {
      render(
        <SdkAndInstallModal
          isOpen={true}
          initialMode="sdk" // 即使傳入 initialMode="sdk"，訪客仍被鎖定為 install
          targetProject={null}
          onClose={vi.fn()}
          onTriggerNativeInstall={vi.fn()}
          canNativeInstall={false}
          isAdmin={false}
        />
      );

      // 彈窗標題應為桌面與行動裝置安裝指南
      expect(screen.getByText('桌面與行動裝置安裝指南')).toBeInTheDocument();
      expect(screen.getByText('將本站加入手機主畫面或電腦桌面常駐')).toBeInTheDocument();

      // 完全不應出現 SDK 頁籤按鈕與 mei-dock.js 程式碼區塊
      expect(screen.queryByText('子專案返回大廳 SDK (mei-dock.js)')).not.toBeInTheDocument();
      expect(screen.queryByText('/sdk/mei-dock.js')).not.toBeInTheDocument();
      expect(screen.queryByText(/子專案「返回咩創意大廳」導覽工具接入精靈/i)).not.toBeInTheDocument();

      // 應呈現安裝指南內容與裝置偵測卡片
      expect(screen.getByTestId('device-detection-card')).toBeInTheDocument();
      expect(screen.getByText('iPhone / iPad')).toBeInTheDocument();
      expect(screen.getByText('Android 手機與平板')).toBeInTheDocument();
      expect(screen.getByText('macOS 與 Windows 電腦端')).toBeInTheDocument();
    });

    it('ADMIN-01: 管理員模式 (isAdmin: true) 下，可見並順暢切換「子專案返回大廳 SDK」與「安裝至手機與電腦桌面」雙頁籤', () => {
      render(
        <SdkAndInstallModal
          isOpen={true}
          initialMode="sdk"
          targetProject={{ title: '測試專案', url: '/demo.html', status: 'online' }}
          onClose={vi.fn()}
          onTriggerNativeInstall={vi.fn()}
          canNativeInstall={true}
          isAdmin={true}
        />
      );

      // 管理員模式應顯示雙頁籤
      const sdkTabBtn = screen.getByText('子專案返回大廳 SDK (mei-dock.js)');
      const installTabBtn = screen.getByText('安裝至手機與電腦桌面');
      expect(sdkTabBtn).toBeInTheDocument();
      expect(installTabBtn).toBeInTheDocument();

      // 預設 sdk 頁籤內容
      expect(screen.getByText('子專案「返回咩創意大廳」導覽工具接入精靈')).toBeInTheDocument();
      expect(screen.getByText('/sdk/mei-dock.js')).toBeInTheDocument();

      // 切換至 install 頁籤
      fireEvent.click(installTabBtn);

      expect(screen.getByText('桌面與行動裝置安裝指南')).toBeInTheDocument();
      expect(screen.getByTestId('device-detection-card')).toBeInTheDocument();
      expect(screen.getByText('立即安裝至桌面')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. 即時裝置與系統偵測卡片 (Device & OS Live Detection)
  // =========================================================================
  describe('2. 即時裝置與作業系統偵測顯示 (Device & OS Detection)', () => {
    it('DETECT-01: 偵測卡片位於「立即安裝至桌面」按鈕的上方', () => {
      render(
        <SdkAndInstallModal
          isOpen={true}
          initialMode="install"
          targetProject={null}
          onClose={vi.fn()}
          onTriggerNativeInstall={vi.fn()}
          canNativeInstall={true}
          isAdmin={false}
        />
      );

      const detectionCard = screen.getByTestId('device-detection-card');
      const installButton = screen.getByText('立即安裝至桌面').closest('button');

      expect(detectionCard).toBeInTheDocument();
      expect(installButton).toBeInTheDocument();

      // 驗證 DOM 樹順序：detectionCard 在 installButton 前面
      const isCardBeforeButton = Boolean(
        detectionCard.compareDocumentPosition(installButton) &
          Node.DOCUMENT_POSITION_FOLLOWING
      );
      expect(isCardBeforeButton).toBe(true);
    });

    it('DETECT-02: 裝置偵測函式 (detectUserDeviceAndOS) 正確辨識不同系統與裝置', () => {
      // 預設 JSDOM 環境下
      const clientInfo = detectUserDeviceAndOS();
      expect(clientInfo).toHaveProperty('deviceType');
      expect(clientInfo).toHaveProperty('deviceLabel');
      expect(clientInfo).toHaveProperty('osName');
      expect(clientInfo).toHaveProperty('browserName');
      expect(clientInfo).toHaveProperty('targetCategory');
      expect(clientInfo).toHaveProperty('icon');
      expect(clientInfo).toHaveProperty('isStandalone');
    });

    it('DETECT-03: 針對目前偵測到的裝置類型，自動標註「最適合此裝置」提示', () => {
      render(
        <SdkAndInstallModal
          isOpen={true}
          initialMode="install"
          targetProject={null}
          onClose={vi.fn()}
          onTriggerNativeInstall={vi.fn()}
          canNativeInstall={false}
          isAdmin={false}
        />
      );

      // 下方指南中至少應有一張卡片被標註「最適合此裝置」
      expect(screen.getByText('最適合此裝置')).toBeInTheDocument();
    });

    it('DETECT-04: 安裝指南頁面不應包含任何綠色彈出式動畫或脈衝光圈類別 (.status-pulse-ring)', () => {
      render(
        <SdkAndInstallModal
          isOpen={true}
          initialMode="install"
          targetProject={null}
          onClose={vi.fn()}
          onTriggerNativeInstall={vi.fn()}
          canNativeInstall={true}
          isAdmin={false}
        />
      );

      const detectionCard = screen.getByTestId('device-detection-card');
      expect(detectionCard.querySelector('.status-pulse-ring')).toBeNull();
      expect(document.querySelector('.status-pulse-ring')).toBeNull();
    });
  });

  // =========================================================================
  // 3. 全站規範：Zero Emoji 規範
  // =========================================================================
  describe('3. 規範一致性檢驗', () => {
    it('SPEC-01: AdminProjectModal.jsx 原始碼嚴格遵守 Zero Emoji 規範', () => {
      const source = fs.readFileSync(
        path.resolve('src/components/AdminProjectModal.jsx'),
        'utf-8'
      );
      expect(EMOJI_REGEX.test(source)).toBe(false);
    });
  });
});
