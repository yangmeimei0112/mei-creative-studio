/**
 * 咩創意工作室 (Mei Creative Studio) - 里程碑二會員專區 UI 與防機器人驗證碼測試套件 (Milestone 2 Test Suite)
 * 涵蓋需求：
 * 1. AntiBotCaptcha SVG 向量圖形數學驗證碼渲染、更新與純數字輸入過濾（零 Unicode Emoji）
 * 2. MemberPortalModal 預設快速登入分頁向下相容性（無信箱密碼表單、無 <form> 標籤）與 Gmail 自訂暱稱傳遞
 * 3. 標準註冊分頁表單驗證（暱稱、信箱、密碼雙重確認、防機器人驗證碼）與完成註冊回呼
 * 4. 信箱密碼登入分頁與純 Gmail 帳號密碼登入阻斷引導
 * 5. 已登入設定視圖：純 Gmail 帳號增設密碼、綁定 Gmail、綁定 Passkey 與跨專案 SSO Token 複製
 */

import React, { useState } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AntiBotCaptcha, { generateMathCaptcha } from '../../components/AntiBotCaptcha';
import MemberPortalModal from '../../components/MemberPortalModal';
import * as memberAuthService from '../../services/memberAuthService';
import { supabase } from '../../services/supabaseClient';
import {
  setupE2ETestEnvironment,
  createMockSupabaseClient,
  mockWebAuthnCredentials,
  EMOJI_REGEX
} from './e2eHarness';

describe('Milestone 2: Member Portal UI & Anti-Bot Captcha Component', () => {
  setupE2ETestEnvironment();
  let mockClient;

  beforeEach(() => {
    mockWebAuthnCredentials({ supported: true });
    window.localStorage.removeItem('mei_universal_member_sso_v1');

    mockClient = createMockSupabaseClient({
      profiles: [],
      passkeys: []
    });

    vi.spyOn(supabase.auth, 'signUp').mockImplementation(mockClient.auth.signUp);
    vi.spyOn(supabase.auth, 'signInWithPassword').mockImplementation(mockClient.auth.signInWithPassword);
    vi.spyOn(supabase.auth, 'signInWithOAuth').mockImplementation(mockClient.auth.signInWithOAuth);
    vi.spyOn(supabase.auth, 'updateUser').mockImplementation(mockClient.auth.updateUser);
    vi.spyOn(supabase.auth, 'linkIdentity').mockImplementation(mockClient.auth.linkIdentity);
    vi.spyOn(supabase.auth, 'signOut').mockImplementation(mockClient.auth.signOut);
    vi.spyOn(supabase.auth, 'getUser').mockImplementation(mockClient.auth.getUser);
    vi.spyOn(supabase, 'from').mockImplementation(mockClient.from);
  });

  // =========================================================================
  // 1. AntiBotCaptcha Component Tests
  // =========================================================================
  describe('1. AntiBotCaptcha SVG Math Challenge', () => {
    it('renders SVG math captcha, refresh button, and numeric input with zero Unicode emojis', () => {
      const captcha = {
        question: '3 + 5 = ?',
        equation: '3 + 5',
        expectedAnswer: '8'
      };
      const onRefresh = vi.fn();
      const onChange = vi.fn();

      const { container } = render(
        <AntiBotCaptcha
          captcha={captcha}
          onRefresh={onRefresh}
          value=""
          onChange={onChange}
        />
      );

      const codeBox = screen.getByTestId('register-captcha-code');
      expect(codeBox).toBeInTheDocument();
      expect(codeBox.querySelector('svg')).not.toBeNull();
      expect(codeBox).toHaveTextContent('3 + 5 = ?');

      const refreshBtn = screen.getByTestId('captcha-refresh-btn');
      expect(refreshBtn).toBeInTheDocument();
      fireEvent.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalledTimes(1);

      const input = screen.getByTestId('register-captcha-input');
      fireEvent.change(input, { target: { value: '8ab!' } });
      expect(onChange).toHaveBeenCalledWith('8');

      expect(EMOJI_REGEX.test(container.innerHTML)).toBe(false);
    });

    it('generates valid dynamic addition challenges via generateMathCaptcha()', () => {
      const challenge = generateMathCaptcha();
      expect(challenge.question).toMatch(/^\d+\s\+\s\d+\s=\s\?$/);
      expect(Number(challenge.expectedAnswer)).toBe(challenge.numA + challenge.numB);
    });
  });

  // =========================================================================
  // 2. Backward Compatibility & Quick Login Tab
  // =========================================================================
  describe('2. Default Quick Login Tab & Backward Compatibility', () => {
    it('keeps email/password inputs and <form> tags strictly absent on initial quick tab mount', () => {
      const { container } = render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      expect(container.querySelector('#member-email-input')).toBeNull();
      expect(container.querySelector('#member-password-input')).toBeNull();
      expect(screen.queryByTestId('member-email-submit-btn')).toBeNull();
      expect(screen.queryByTestId('member-apple-login-btn')).toBeNull();
      expect(container.querySelector('#member-tier-select')).toBeNull();
      expect(container.querySelectorAll('form')).toHaveLength(0);
    });

    it('forwards optional custom Gmail nickname to signInWithGmailFastLogin', async () => {
      const spyGmailFast = vi.spyOn(memberAuthService, 'signInWithGmailFastLogin');
      const onMemberChange = vi.fn();
      const onNotify = vi.fn();

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={onMemberChange}
          onNotify={onNotify}
        />
      );

      const nickInput = screen.getByTestId('gmail-nickname-input');
      fireEvent.change(nickInput, { target: { value: '星海設計師' } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('member-google-login-btn'));
      });

      expect(spyGmailFast).toHaveBeenCalledWith({ customDisplayName: '星海設計師' });
      expect(onMemberChange).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: '星海設計師' })
      );
      expect(onNotify).toHaveBeenCalledWith('已使用 Google 帳號登入全站會員中心', 'user-check');
    });

    it('supports Google fast login without custom nickname and Passkey quick login', async () => {
      const onMemberChange = vi.fn();
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={onMemberChange}
          onNotify={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('member-passkey-login-btn'));
      });

      expect(onMemberChange).toHaveBeenCalledWith(
        expect.objectContaining({ isPasskeyEnabled: true })
      );
    });
  });

  // =========================================================================
  // 3. Standard Registration Tab & Validation
  // =========================================================================
  describe('3. Standard Registration Tab Flow', () => {
    it('validates invalid fields and wrong captcha before completing registration', async () => {
      const onMemberChange = vi.fn();
      const onNotify = vi.fn();

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={onMemberChange}
          onNotify={onNotify}
        />
      );

      fireEvent.click(screen.getByTestId('auth-tab-register'));
      expect(document.querySelectorAll('form')).toHaveLength(0);

      // 1. Mismatch password test
      fireEvent.change(screen.getByTestId('register-name-input'), { target: { value: '極光創作者' } });
      fireEvent.change(screen.getByTestId('register-email-input'), { target: { value: 'aurora@meistudio.live' } });
      fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'Mismatch123!' } });
      fireEvent.change(screen.getByTestId('register-captcha-input'), { target: { value: '99' } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('register-submit-btn'));
      });

      expect(screen.getByTestId('register-error-msg')).toHaveTextContent('兩次輸入的密碼不一致');
      expect(onMemberChange).not.toHaveBeenCalled();

      // 2. Wrong captcha test
      fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByTestId('register-captcha-input'), { target: { value: '999' } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('register-submit-btn'));
      });

      expect(screen.getByTestId('register-error-msg')).toHaveTextContent('防機器人驗證碼錯誤');

      // 3. Solve current SVG captcha equation and submit
      const equationText = screen.getByTestId('register-captcha-code').textContent || '';
      const match = equationText.match(/(\d+)\s*\+\s*(\d+)/);
      expect(match).not.toBeNull();
      const expectedSum = String(parseInt(match[1], 10) + parseInt(match[2], 10));

      fireEvent.change(screen.getByTestId('register-captcha-input'), { target: { value: expectedSum } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('register-submit-btn'));
      });

      expect(screen.queryByTestId('register-error-msg')).toBeNull();
      expect(onMemberChange).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: '極光創作者',
          email: 'aurora@meistudio.live'
        })
      );
      expect(onNotify).toHaveBeenCalledWith('已完成會員註冊並登入全站會員中心', 'user-check');
    });
  });

  // =========================================================================
  // 4. Email & Password Login Tab + Pure Gmail Block
  // =========================================================================
  describe('4. Password Login Tab & Pure Gmail Block', () => {
    it('logs in registered email/password member and blocks pure-Gmail accounts with guidance', async () => {
      // Seed pure-Gmail profile in mock Supabase
      const gmailRes = await memberAuthService.signInWithGmailFastLogin();
      await memberAuthService.signOutMember();

      const onMemberChange = vi.fn();
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={onMemberChange}
          onNotify={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('auth-tab-login'));
      expect(screen.getByTestId('member-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('member-password-input')).toBeInTheDocument();

      fireEvent.change(screen.getByTestId('member-email-input'), {
        target: { value: gmailRes.member.email }
      });
      fireEvent.change(screen.getByTestId('member-password-input'), {
        target: { value: 'AttemptPass123!' }
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('member-email-submit-btn'));
      });

      const alertEl = screen.getByRole('alert');
      expect(alertEl).toHaveTextContent('此帳號由 Gmail 快速登入建立，尚未增設密碼');
      expect(onMemberChange).not.toHaveBeenCalled();

      // Switch back to quick login via helper CTA
      fireEvent.click(screen.getByTestId('switch-to-gmail-login-btn'));
      expect(screen.getByTestId('member-google-login-btn')).toBeInTheDocument();

      // Seed email-password member and verify login succeeds
      const cap = generateMathCaptcha();
      await memberAuthService.registerMemberWithDetails({
        displayName: '信箱測試員',
        email: 'email.member@meistudio.live',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        captchaAnswer: cap.expectedAnswer,
        captchaExpected: cap.expectedAnswer
      });
      await memberAuthService.signOutMember();

      fireEvent.click(screen.getByTestId('auth-tab-login'));
      fireEvent.change(screen.getByTestId('member-email-input'), {
        target: { value: 'email.member@meistudio.live' }
      });
      fireEvent.change(screen.getByTestId('member-password-input'), {
        target: { value: 'ValidPassword123!' }
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('member-email-submit-btn'));
      });

      expect(onMemberChange).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'email.member@meistudio.live',
          authProvider: 'email',
          metadata: expect.objectContaining({ has_password: true })
        })
      );
    });
  });

  // =========================================================================
  // 5. Authenticated Member Settings (Add Password, Bindings, SSO Token)
  // =========================================================================
  describe('5. Authenticated Member Settings & Cross-Project SSO Token', () => {
    function StatefulPortalWrapper({ initialMember, onNotify }) {
      const [member, setMember] = useState(initialMember);
      return (
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={member}
          onMemberChange={setMember}
          onNotify={onNotify}
        />
      );
    }

    it('renders add-password section for pure-Gmail user, validates, and unlocks password state', async () => {
      const gmailRes = await memberAuthService.signInWithGmailFastLogin({
        customDisplayName: '無密碼探險家'
      });
      const onNotify = vi.fn();

      render(<StatefulPortalWrapper initialMember={gmailRes.member} onNotify={onNotify} />);

      expect(screen.getByTestId('member-add-password-section')).toBeInTheDocument();
      expect(screen.getByTestId('member-bind-google-btn')).toBeDisabled();

      // Short password validation
      fireEvent.change(screen.getByTestId('member-new-password-input'), { target: { value: '123' } });
      fireEvent.change(screen.getByTestId('member-confirm-password-input'), { target: { value: '123' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('member-set-password-btn'));
      });
      expect(screen.getByTestId('member-password-error-msg')).toHaveTextContent('密碼長度至少需要 6 個字元');

      // Mismatch validation
      fireEvent.change(screen.getByTestId('member-new-password-input'), { target: { value: 'MasterPass1!' } });
      fireEvent.change(screen.getByTestId('member-confirm-password-input'), { target: { value: 'OtherPass2!' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('member-set-password-btn'));
      });
      expect(screen.getByTestId('member-password-error-msg')).toHaveTextContent('兩次輸入的密碼不一致');

      // Valid submission hides add-password form
      fireEvent.change(screen.getByTestId('member-confirm-password-input'), { target: { value: 'MasterPass1!' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('member-set-password-btn'));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('member-add-password-section')).toBeNull();
      });
      expect(onNotify).toHaveBeenCalledWith('已成功增設登入密碼，未來可使用信箱與密碼登入', 'key-round');
    });

    it('allows binding Gmail, binding Passkey, and copying Cross-Project SSO Token', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true
      });

      const cap = generateMathCaptcha();
      const regRes = await memberAuthService.registerMemberWithDetails({
        displayName: '跨站設計師',
        email: 'sso.designer@meistudio.live',
        password: 'DesignerPass123!',
        confirmPassword: 'DesignerPass123!',
        captchaAnswer: cap.expectedAnswer,
        captchaExpected: cap.expectedAnswer
      });

      const onNotify = vi.fn();
      render(<StatefulPortalWrapper initialMember={regRes.member} onNotify={onNotify} />);

      // Standard registered account already has password
      expect(screen.queryByTestId('member-add-password-section')).toBeNull();

      // Bind Gmail
      const bindGoogleBtn = screen.getByTestId('member-bind-google-btn');
      expect(bindGoogleBtn).not.toBeDisabled();
      await act(async () => {
        fireEvent.click(bindGoogleBtn);
      });
      expect(screen.getByTestId('member-bind-google-btn')).toBeDisabled();
      expect(onNotify).toHaveBeenCalledWith('已成功綁定 Gmail 帳號', 'globe');

      // Bind Passkey
      await act(async () => {
        fireEvent.click(screen.getByTestId('member-bind-passkey-btn'));
      });
      expect(screen.getByText('已綁定安全金鑰')).toBeInTheDocument();

      // Wait for SSO token generation & copy
      await waitFor(() => {
        expect(screen.getByTestId('member-sso-token-display').textContent).toMatch(/^mei_sso_v2\./);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('member-copy-sso-token-btn'));
      });
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringMatching(/^mei_sso_v2\./));
      expect(onNotify).toHaveBeenCalledWith('已複製跨專案 SSO 通行憑證', 'copy');
    });
  });
});
