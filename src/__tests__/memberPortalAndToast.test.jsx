import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import App from '../App';
import {
  exportMemberRoamingCode,
  importMemberRoamingCode,
  loadCurrentMember
} from '../services/memberAuthService';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

describe('全站聯通會員專區 (方案一 × 方案二融合)、頁尾管理員解鎖、亮色淡藍通知與安裝指南無綠燈驗證', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
  });

  it('1. 導覽列與頁尾配置：頂部導覽列顯示「會員專區」，「管理員解鎖」移設至主頁面底部頁尾', () => {
    const { container } = render(<App />);

    const headerEl = container.querySelector('header');
    const footerEl = container.querySelector('footer');

    // 頂部導覽列具備「會員專區」按鈕，且不含「管理員解鎖」按鈕
    const memberBtn = within(headerEl).getByTestId('header-member-portal-btn');
    expect(memberBtn).toBeInTheDocument();
    expect(memberBtn).toHaveTextContent('會員專區');
    expect(within(headerEl).queryByText('管理員解鎖')).not.toBeInTheDocument();

    // 主頁面底部頁尾具備「管理員解鎖」按鈕
    const footerUnlockBtn = within(footerEl).getByTestId('footer-admin-unlock-btn');
    expect(footerUnlockBtn).toBeInTheDocument();
    expect(footerUnlockBtn).toHaveTextContent('管理員解鎖');

    // 點擊頁尾「管理員解鎖」並輸入 mei888 後，頁尾按鈕切換為「管理員已解鎖」
    fireEvent.click(footerUnlockBtn);
    fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
      target: { value: 'mei888' }
    });
    fireEvent.click(screen.getByText('立即解鎖管理後台'));

    const footerLockBtn = within(footerEl).getByTestId('footer-admin-lock-btn');
    expect(footerLockBtn).toBeInTheDocument();
    expect(footerLockBtn).toHaveTextContent('管理員已解鎖');
  });

  it('2. 全站聯通會員系統 (方案一 Passkey 指紋/人臉 × 方案二 Apple/Google 雙引擎融合) 完整流程', async () => {
    render(<App />);

    // 開啟會員專區
    fireEvent.click(screen.getByTestId('header-member-portal-btn'));
    const modal = screen.getByTestId('member-portal-modal');
    expect(modal).toBeInTheDocument();

    // 驗證支援指紋/人臉快速登入 (Passkey)、Apple 與 Google 多元登入按鈕
    const passkeyBtn = within(modal).getByTestId('member-passkey-login-btn');
    const appleBtn = within(modal).getByTestId('member-apple-login-btn');
    const googleBtn = within(modal).getByTestId('member-google-login-btn');
    expect(passkeyBtn).toBeInTheDocument();
    expect(appleBtn).toBeInTheDocument();
    expect(googleBtn).toBeInTheDocument();

    // 測試指紋 / 人臉快速登入
    fireEvent.click(passkeyBtn);

    await waitFor(() => {
      expect(screen.getByTestId('member-profile-card')).toBeInTheDocument();
    });

    const savedMember = loadCurrentMember();
    expect(savedMember).not.toBeNull();
    expect(savedMember.unionId).toMatch(/^mei_uid_/);
    expect(savedMember.authProviders).toContain('passkey');
    expect(savedMember.connectedProjects).toContain('*');

    // 驗證跨裝置漫遊通行碼匯出與匯入
    const roamingCode = exportMemberRoamingCode(savedMember);
    expect(roamingCode).toMatch(/^MEI-SSO-/);
    const imported = importMemberRoamingCode(roamingCode);
    expect(imported.unionId).toBe(savedMember.unionId);

    // 測試全站登出
    fireEvent.click(screen.getByTestId('member-signout-btn'));
    expect(loadCurrentMember()).toBeNull();
  });

  it('3. 亮色模式下右下角彈出通知 (studio-toast) 底色為淡藍色 (bg-sky-100/95) 且文字深色高對比', () => {
    render(<App />);

    // 觸發頁尾管理員解鎖以顯示右下角 Toast 通知
    fireEvent.click(screen.getByTestId('footer-admin-unlock-btn'));
    fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
      target: { value: 'mei888' }
    });
    fireEvent.click(screen.getByText('立即解鎖管理後台'));

    const toastEl = screen.getByTestId('studio-toast');
    expect(toastEl).toBeInTheDocument();
    expect(toastEl.className).toContain('bg-sky-100/95');
    expect(toastEl.className).toContain('text-slate-900');
    expect(toastEl.className).toContain('border-sky-300/80');
  });

  it('4. 點擊「安裝應用」進入安裝指南時，裝置偵測區塊已移除綠色呼吸燈動畫 (status-pulse-ring)', () => {
    render(<App />);

    const installBtns = screen.getAllByTitle('安裝至桌面或主畫面指南');
    fireEvent.click(installBtns[0]);

    const detectionCard = screen.getByTestId('device-detection-card');
    expect(detectionCard).toBeInTheDocument();
    expect(detectionCard.querySelector('.status-pulse-ring')).toBeNull();
  });

  it('5. 會員系統相關原始碼嚴格遵守 0 系統 Emoji 規範', () => {
    const files = [
      'src/services/memberAuthService.js',
      'src/components/MemberPortalModal.jsx'
    ];
    for (const rel of files) {
      const content = fs.readFileSync(path.resolve(rel), 'utf-8');
      expect(EMOJI_REGEX.test(content)).toBe(false);
    }
  });
});
