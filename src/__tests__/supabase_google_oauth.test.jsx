/**
 * src/__tests__/supabase_google_oauth.test.jsx
 *
 * 咩創意工作室 (Mei Creative Studio) - Supabase 原生 Google OAuth 登入整合與雲端資料同步驗證套件
 * 5-Tier 規格化測試矩陣：
 * - Tier 1: 參數契約與觸發驗證 (Parameter Contracts & Trigger Verification)
 * - Tier 2: 雲端診斷與異常防護 (Cloud Diagnostics & URL Error Safeguards)
 * - Tier 3: 回調生命週期與 Session 解析 (OAuth Callback & Session Parsing)
 * - Tier 4: 資料庫同步與 RLS 合規 (Database Sync & RLS Compliance)
 * - Tier 5: 既有功能零迴歸防護與 Zero Emoji (Regression Guard & Zero Emoji)
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import MemberPortalModal from '../components/MemberPortalModal.jsx';
import App from '../App.jsx';
import { supabase } from '../services/supabaseClient.js';
import * as memberAuthService from '../services/memberAuthService.js';
import {
  setupE2ETestEnvironment,
  createMockSupabaseClient,
  expectZeroEmoji
} from './e2e_requirements/e2eHarness.js';

describe('咩創意工作室 - Supabase 原生 Google OAuth 整合與雲端同步 5-Tier 驗證', () => {
  setupE2ETestEnvironment({ skipIntro: true });
  let mockClient;

  const TEST_OAUTH_UUID = '11111111-2222-4333-a444-555555555555';

  beforeEach(() => {
    mockClient = createMockSupabaseClient({
      profiles: [],
      passkeys: [],
      oauthUser: {
        id: TEST_OAUTH_UUID,
        email: 'genuine.creator@meistudio.live',
        user_metadata: {
          full_name: 'Google 原生認證會員',
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
        }
      }
    });

    vi.spyOn(supabase.auth, 'signInWithOAuth').mockImplementation(mockClient.auth.signInWithOAuth);
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation(mockClient.auth.onAuthStateChange);
    vi.spyOn(supabase.auth, 'signInWithPassword').mockImplementation(mockClient.auth.signInWithPassword);
    vi.spyOn(supabase.auth, 'updateUser').mockImplementation(mockClient.auth.updateUser);
    vi.spyOn(supabase.auth, 'getUser').mockImplementation(mockClient.auth.getUser);
    vi.spyOn(supabase.auth, 'getSession').mockImplementation(mockClient.auth.getSession);
    vi.spyOn(supabase.auth, 'signOut').mockImplementation(mockClient.auth.signOut);
    vi.spyOn(supabase, 'from').mockImplementation(mockClient.from);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  // =========================================================================
  // Tier 1: 參數契約與觸發驗證 (Parameter Contracts & Trigger Verification)
  // =========================================================================
  describe('Tier 1: 參數契約與觸發驗證', () => {
    it('T1-OAUTH-01: 點擊 Google 登入按鈕確實觸發 signInWithOAuth 且 provider 為 google', async () => {
      const onNotify = vi.fn();
      const onMemberChange = vi.fn();

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={onMemberChange}
          onNotify={onNotify}
        />
      );

      const googleBtn = screen.getByTestId('member-google-login-btn');
      expect(googleBtn).toBeInTheDocument();
      expect(googleBtn.textContent).toContain('使用 Google 帳號繼續');

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.any(String),
            queryParams: expect.objectContaining({
              access_type: 'offline',
              prompt: 'select_account'
            })
          })
        })
      );
    });

    it('T1-OAUTH-02: signInWithGoogle 參數中嚴格不包含 skipBrowserRedirect: true', async () => {
      let passedOptions = null;
      vi.spyOn(supabase.auth, 'signInWithOAuth').mockImplementation(async (args) => {
        passedOptions = args.options;
        return { data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' }, error: null };
      });

      await memberAuthService.signInWithGoogle();

      expect(passedOptions).not.toBeNull();
      expect(passedOptions.skipBrowserRedirect).toBeUndefined();
      expect(passedOptions.queryParams?.access_type).toBe('offline');
      expect(passedOptions.queryParams?.prompt).toBe('select_account');
    });

    it('T1-OAUTH-03: 未經授權前不主動合成 dummy 假帳號 (creator@meistudio.live 旁路已被移除)', async () => {
      vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
        data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' },
        error: null
      });

      window.localStorage.removeItem('mei_universal_member_sso_v1');
      await memberAuthService.signInWithGoogle();

      // 在真實跳轉未回調前，localStorage 不應被寫入假帳號
      const cached = memberAuthService.loadCurrentMember();
      expect(cached).toBeNull();
    });

    it('T1-OAUTH-04: 登入送出中狀態呈現旋轉圖示與正在導向文案', async () => {
      let resolveOAuth;
      const oauthPromise = new Promise((resolve) => {
        resolveOAuth = resolve;
      });

      vi.spyOn(supabase.auth, 'signInWithOAuth').mockImplementation(() => oauthPromise);

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      const googleBtn = screen.getByTestId('member-google-login-btn');
      act(() => {
        fireEvent.click(googleBtn);
      });

      expect(googleBtn.textContent).toContain('正在導向 Google 授權頁面...');
      expect(googleBtn.disabled).toBe(true);

      // 解除 Promise
      await act(async () => {
        resolveOAuth({ data: { url: 'https://accounts.google.com' }, error: null });
      });
    });
  });

  // =========================================================================
  // Tier 2: 雲端診斷與異常防護 (Cloud Diagnostics & URL Error Safeguards)
  // =========================================================================
  describe('Tier 2: 雲端診斷與異常防護', () => {
    it('T2-DIAG-01: 後台未啟用 Google Provider 時產出繁體中文排查指引', async () => {
      const diag = memberAuthService.diagnoseOAuthError(new Error('Unsupported provider: provider is not enabled'));
      expect(diag.title).toBe('Google 登入服務尚未啟用');
      expect(diag.message).toContain('Supabase 控制台');
      expect(diag.message).toContain('Client ID');

      // 測試 MemberPortalModal 呈現該中文訊息
      vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
        data: null,
        error: new Error('provider is not enabled')
      });

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('member-google-login-btn'));
      });

      const errorAlert = screen.getByTestId('member-error-msg');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert.textContent).toContain('Google 登入服務尚未啟用');
    });

    it('T2-DIAG-02: Google API 憑證無效或重定向網址不符時能精準翻譯', () => {
      const invalidClientDiag = memberAuthService.diagnoseOAuthError({
        message: 'invalid_client: Client secret mismatch'
      });
      expect(invalidClientDiag.title).toBe('Google API 憑證無效');
      expect(invalidClientDiag.message).toContain('Client ID');

      const redirectMismatchDiag = memberAuthService.diagnoseOAuthError({
        message: 'redirect_uri_mismatch'
      });
      expect(redirectMismatchDiag.title).toBe('OAuth 重定向網址不符合');
      expect(redirectMismatchDiag.message).toContain('Authorized Redirect URIs');
    });

    it('T2-DIAG-03: 使用者取消授權 (access_denied) 轉譯為繁體中文且無假登入產生', async () => {
      const diag = memberAuthService.diagnoseOAuthError({
        code: 'access_denied',
        message: 'User cancelled Google consent screen'
      });
      expect(diag.title).toBe('已取消 Google 帳號授權');
      expect(diag.message).toContain('您已取消 Google 帳號授權');

      vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
        data: null,
        error: { code: 'access_denied', message: 'User cancelled' }
      });

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
        fireEvent.click(screen.getByTestId('member-google-login-btn'));
      });

      expect(onMemberChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('member-error-msg').textContent).toContain('已取消 Google 帳號授權');
    });

    it('T2-DIAG-04: App 載入時捕獲網址查詢參數 ?error=access_denied 並透過 Toast 提示與清理網址', async () => {
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
      window.location.search = '?error=access_denied&error_description=User+cancelled+flow';

      render(<App />);

      await waitFor(() => {
        const toast = screen.queryByTestId('studio-toast');
        expect(toast).toBeInTheDocument();
        expect(toast.textContent).toContain('已取消 Google 帳號授權');
      });

      expect(replaceStateSpy).toHaveBeenCalled();
    });

    it('T2-DIAG-05: App 載入時捕獲網址 Hash 參數 #error=provider_disabled 並清理 Hash', async () => {
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
      window.location.search = '';
      window.location.hash = '#error=provider_disabled&error_description=provider+is+not+enabled';

      render(<App />);

      await waitFor(() => {
        const toast = screen.queryByTestId('studio-toast');
        expect(toast).toBeInTheDocument();
        expect(toast.textContent).toContain('Google 登入服務尚未啟用');
      });

      expect(replaceStateSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Tier 3: 回調生命週期與 Session 解析 (OAuth Callback & Session Parsing)
  // =========================================================================
  describe('Tier 3: 回調生命週期與 Session 解析', () => {
    it('T3-CALLBACK-01: 啟動 Google 登入前將自訂暱稱儲存於 sessionStorage', async () => {
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      const nickInput = screen.getByTestId('gmail-nickname-input');
      fireEvent.change(nickInput, { target: { value: '超音速創意領航員' } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('member-google-login-btn'));
      });

      const pendingNick = window.sessionStorage.getItem('mei_pending_oauth_nickname');
      expect(pendingNick).toBe('超音速創意領航員');
    });

    it('T3-CALLBACK-02: onAuthStateChange 回調時套用暫存暱稱並清除 sessionStorage', async () => {
      window.sessionStorage.setItem('mei_pending_oauth_nickname', '極光星系探索者');

      let authCallback;
      vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      let observedMember = null;
      memberAuthService.initAuthListener((m) => {
        observedMember = m;
      });

      // 模擬 Google OAuth 回跳後 Supabase 觸發 SIGNED_IN 事件
      await act(async () => {
        authCallback('SIGNED_IN', {
          user: {
            id: TEST_OAUTH_UUID,
            email: 'aurora@meistudio.live',
            user_metadata: { full_name: '原始 Google 名稱' },
            app_metadata: { provider: 'google', providers: ['google'] }
          }
        });
      });

      expect(observedMember).not.toBeNull();
      expect(observedMember.displayName).toBe('極光星系探索者');
      expect(observedMember.authProvider).toBe('google');
      expect(window.sessionStorage.getItem('mei_pending_oauth_nickname')).toBeNull();
    });

    it('T3-CALLBACK-03: Google 認證會員預設 metadata.has_password 為 false', async () => {
      let authCallback;
      vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      let observedMember = null;
      memberAuthService.initAuthListener((m) => {
        observedMember = m;
      });

      await act(async () => {
        authCallback('SIGNED_IN', {
          user: {
            id: TEST_OAUTH_UUID,
            email: 'genuine.google@meistudio.live',
            app_metadata: { provider: 'google', providers: ['google'] }
          }
        });
      });

      expect(observedMember.metadata?.has_password).toBe(false);
    });

    it('T3-CALLBACK-04: transformSupabaseUserToMemberProfile 正確轉換真實 Google 授權物件', () => {
      const rawUser = {
        id: '22222222-3333-4444-a555-666666666666',
        email: 'designer@meistudio.live',
        user_metadata: {
          full_name: '視覺總監',
          picture: 'https://images.unsplash.com/avatar-test.jpg',
          tier: 'architect'
        },
        app_metadata: {
          provider: 'google',
          providers: ['google']
        }
      };

      const profile = memberAuthService.transformSupabaseUserToMemberProfile(rawUser);
      expect(profile.uid).toBe('22222222-3333-4444-a555-666666666666');
      expect(profile.unionId).toContain('mei_user_22222222-3333-4444-a555-666666666666');
      expect(profile.email).toBe('designer@meistudio.live');
      expect(profile.displayName).toBe('視覺總監');
      expect(profile.avatarUrl).toBe('https://images.unsplash.com/avatar-test.jpg');
      expect(profile.tier).toBe('architect');
      expect(profile.authProvider).toBe('google');
      expect(profile.metadata?.has_password).toBe(false);
    });
  });

  // =========================================================================
  // Tier 4: 資料庫同步與 RLS 合規 (Database Sync & RLS Compliance)
  // =========================================================================
  describe('Tier 4: 資料庫同步與 RLS 合規', () => {
    it('T4-DB-01: 授權完成後會員資料正確 upsert 至 public.mei_member_profiles', async () => {
      const validProfile = {
        uid: TEST_OAUTH_UUID,
        unionId: `mei_user_${TEST_OAUTH_UUID.replace(/-/g, '')}`,
        email: 'genuine.creator@meistudio.live',
        displayName: '雲端同步測試會員',
        tier: 'creator',
        authProvider: 'google',
        isPasskeyEnabled: false,
        connectedProjects: ['*'],
        metadata: { has_password: false }
      };

      const res = await memberAuthService.syncMemberProfileToCloud(validProfile, mockClient);
      expect(res.error).toBeNull();

      const profiles = mockClient._getProfilesData();
      expect(profiles.length).toBeGreaterThan(0);
      const row = profiles.find((p) => p.id === TEST_OAUTH_UUID);
      expect(row).toBeDefined();
      expect(row.display_name).toBe('雲端同步測試會員');
      expect(row.auth_provider).toBe('google');
      expect(row.metadata?.has_password).toBe(false);
    });

    it('T4-DB-02: 寫入資料庫之 id 必須符合 36 字元 UUID 格式滿足 RLS auth.uid() = id', async () => {
      const validUuidProfile = {
        uid: '12345678-1234-4234-a234-1234567890ab',
        unionId: 'mei_user_valid_uuid_test',
        email: 'uuid@meistudio.live',
        displayName: 'UUID驗證會員',
        authProvider: 'google'
      };

      const invalidProfile = {
        uid: 'not-a-valid-uuid',
        unionId: 'mei_user_invalid',
        email: 'invalid@meistudio.live',
        displayName: '非UUID會員',
        authProvider: 'google'
      };

      // 合法 UUID 能正常寫入
      const validRes = await memberAuthService.syncMemberProfileToCloud(validUuidProfile, mockClient);
      expect(validRes.error).toBeNull();
      const profiles = mockClient._getProfilesData();
      expect(profiles.some((p) => p.id === validUuidProfile.uid)).toBe(true);

      // 非 UUID 字串會被安全過濾防護，不觸發資料庫錯誤
      const invalidRes = await memberAuthService.syncMemberProfileToCloud(invalidProfile, mockClient);
      expect(invalidRes.data).toBeNull();
      expect(profiles.some((p) => p.id === 'not-a-valid-uuid')).toBe(false);
    });

    it('T4-DB-03: 同步之會員欄位完整包含跨專案 SSO 所需所有核心結構', async () => {
      const fullProfile = {
        uid: '99999999-8888-4777-a666-555555555555',
        unionId: 'mei_user_full_struct_test',
        email: 'fullstruct@meistudio.live',
        displayName: '結構完整測試會員',
        avatarUrl: 'https://example.com/avatar.png',
        tier: 'creator',
        authProvider: 'google',
        isPasskeyEnabled: true,
        connectedProjects: ['*'],
        metadata: { has_password: false, custom_tag: 'verified' }
      };

      await memberAuthService.syncMemberProfileToCloud(fullProfile, mockClient);
      const row = mockClient._getProfilesData().find((p) => p.id === fullProfile.uid);

      expect(row).toBeDefined();
      expect(row.union_id).toBe('mei_user_full_struct_test');
      expect(row.email).toBe('fullstruct@meistudio.live');
      expect(row.display_name).toBe('結構完整測試會員');
      expect(row.avatar_url).toBe('https://example.com/avatar.png');
      expect(row.tier).toBe('creator');
      expect(row.auth_provider).toBe('google');
      expect(row.is_passkey_enabled).toBe(true);
      expect(row.connected_projects).toEqual(['*']);
      expect(row.metadata?.has_password).toBe(false);
      expect(row.metadata?.custom_tag).toBe('verified');
    });
  });

  // =========================================================================
  // Tier 5: 既有功能零迴歸防護與 Zero Emoji (Regression Guard & Zero Emoji)
  // =========================================================================
  describe('Tier 5: 既有功能零迴歸防護與 Zero Emoji', () => {
    it('T5-REG-01: 純 Google 註冊會員在密碼分頁登入時嚴格阻擋並提示指引', async () => {
      mockClient._setProfilesData([
        {
          id: TEST_OAUTH_UUID,
          union_id: 'mei_user_google_only',
          email: 'googleonly@meistudio.live',
          display_name: '純 Google 會員',
          auth_provider: 'google',
          auth_providers: ['google'],
          metadata: { has_password: false }
        }
      ]);

      const res = await memberAuthService.signInMemberWithPassword('googleonly@meistudio.live', 'AnyPassword123');
      expect(res.success).toBe(false);
      expect(res.isGmailOnly).toBe(true);
      expect(res.error).toContain('此帳號由 Gmail 快速登入建立，尚未增設密碼');
    });

    it('T5-REG-02: Google 帳號於會員專區增設密碼後，解除密碼登入阻擋', async () => {
      // 1. 先透過 Google 快速登入
      await memberAuthService.signInWithGmailFastLogin();
      const memberBefore = memberAuthService.loadCurrentMember();
      expect(memberBefore.metadata?.has_password).toBe(false);

      const addRes = await memberAuthService.addPasswordToCurrentMember('NewPassword123!', 'NewPassword123!');
      expect(addRes.success).toBe(true);
      expect(addRes.member.metadata?.has_password).toBe(true);
      expect(addRes.member.authProviders).toContain('email');

      const cached = memberAuthService.loadCurrentMember();
      expect(cached.metadata?.has_password).toBe(true);
    });

    it('T5-REG-03: 全套件渲染結果與診斷文字 100% 遵循 Zero Emoji 規範', () => {
      const { container } = render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      expectZeroEmoji(container);

      // 檢查診斷字典產生的文字無 emoji
      const errorStrings = [
        'provider is not enabled',
        'invalid_client',
        'redirect_uri_mismatch',
        'access_denied',
        'popup_closed',
        'network error'
      ];

      for (const errStr of errorStrings) {
        const diag = memberAuthService.diagnoseOAuthError(new Error(errStr));
        expectZeroEmoji(diag.title);
        expectZeroEmoji(diag.message);
      }
    });
  });
});
