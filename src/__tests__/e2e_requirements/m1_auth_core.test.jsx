/**
 * 咩創意工作室 (Mei Creative Studio) - 里程碑一核心認證與資料庫整合測試套件 (Milestone 1 Test Suite)
 * 涵蓋需求：
 * R1: 會員標準註冊 (registerMemberWithDetails) 與信箱密碼登入 (signInMemberWithPassword)
 * R2: Gmail 快速登入 (signInWithGmailFastLogin) 與純 Gmail 帳號密碼登入阻斷機制
 * R3: 會員專區安全增設密碼 (addPasswordToCurrentMember)、綁定 Gmail (bindGmailToCurrentMember)、綁定 Passkey (bindPasskeyToCurrentMember) 並寫入 public.mei_member_passkeys
 * R4: 跨專案 SSO Token 簽章生成與校驗 (generateMemberSsoToken, verifyMemberSsoToken)
 * 工程約束：零 Unicode Emoji (Zero Emoji)，直連獨立資料庫 schema 與 e2eHarness 模擬環境
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerMemberWithDetails,
  signInMemberWithPassword,
  signInWithGmailFastLogin,
  addPasswordToCurrentMember,
  bindGmailToCurrentMember,
  bindPasskeyToCurrentMember,
  generateMemberSsoToken,
  verifyMemberSsoToken,
  loadCurrentMember,
  saveCurrentMember,
  signOutMember
} from '../../services/memberAuthService.js';
import { supabase } from '../../services/supabaseClient.js';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment,
  createMockSupabaseClient,
  mockWebAuthnCredentials
} from './e2eHarness.js';

describe('Milestone 1: Authentication Core Service & Database Integration', () => {
  setupE2ETestEnvironment();
  let mockClient;

  beforeEach(async () => {
    mockWebAuthnCredentials({ supported: true });
    window.localStorage.removeItem('mei_universal_member_sso_v1');

    mockClient = createMockSupabaseClient({
      profiles: [],
      passkeys: []
    });

    // 替換 Supabase Client 方法以直連 mock 儲存庫
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
  // R1: Standard Registration (registerMemberWithDetails)
  // =========================================================================
  describe('R1: Standard Member Registration Flow', () => {
    it('M1-R1-01: 成功註冊會員寫入 profiles 並設定 has_password 為 true', async () => {
      const res = await registerMemberWithDetails({
        displayName: '咩創開創者',
        email: 'founder@meistudio.live',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        captchaAnswer: '12',
        captchaExpected: '12'
      });

      expect(res.success).toBe(true);
      expect(res.member).toBeDefined();
      expect(res.member.displayName).toBe('咩創開創者');
      expect(res.member.email).toBe('founder@meistudio.live');
      expect(res.member.metadata?.has_password).toBe(true);
      expect(res.member.authProvider).toBe('email');

      // 驗證寫入 public.mei_member_profiles
      const profiles = mockClient._getProfilesData();
      expect(profiles.length).toBe(1);
      expect(profiles[0].email).toBe('founder@meistudio.live');
      expect(profiles[0].display_name).toBe('咩創開創者');
      expect(profiles[0].metadata?.has_password).toBe(true);

      // 驗證登入快取已建立
      const cached = loadCurrentMember();
      expect(cached).not.toBeNull();
      expect(cached.email).toBe('founder@meistudio.live');
    });

    it('M1-R1-02: 暱稱不符長度限制時回傳驗證錯誤', async () => {
      const resShort = await registerMemberWithDetails({
        displayName: 'A',
        email: 'test@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('至少 2 個字元');

      const resLong = await registerMemberWithDetails({
        displayName: 'A'.repeat(51),
        email: 'test@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      expect(resLong.success).toBe(false);
      expect(resLong.error).toContain('不能超過 50 個字元');
    });

    it('M1-R1-03: 電子信箱格式不正確時拒絕提交', async () => {
      const res = await registerMemberWithDetails({
        displayName: '測試者',
        email: 'invalid-email-format',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('請輸入有效的電子信箱地址');
    });

    it('M1-R1-04: 密碼短於 6 碼或兩次密碼不一致時拒絕提交', async () => {
      const resShort = await registerMemberWithDetails({
        displayName: '測試者',
        email: 'valid@meistudio.live',
        password: '123',
        confirmPassword: '123'
      });
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('密碼長度至少需要 6 個字元');

      const resMismatch = await registerMemberWithDetails({
        displayName: '測試者',
        email: 'valid@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'MismatchPassword!'
      });
      expect(resMismatch.success).toBe(false);
      expect(resMismatch.error).toContain('兩次輸入的密碼不一致');
    });

    it('M1-R1-05: 防機器人驗證碼計算錯誤時拒絕註冊', async () => {
      const res = await registerMemberWithDetails({
        displayName: '測試者',
        email: 'valid@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        captchaAnswer: '99',
        captchaExpected: '15'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('防機器人驗證碼錯誤');
    });
  });

  // =========================================================================
  // R1 & R2: Password Sign In & Pure Gmail Blocking
  // =========================================================================
  describe('R1 & R2: Password Sign In & Gmail Only Restriction', () => {
    it('M1-R2-01: 純 Gmail 建立且未增設密碼之帳號以密碼登入時，必須嚴格阻擋並回傳指定中文錯誤', async () => {
      // 模擬資料庫中已有一筆 Gmail 註冊且未設定密碼的會員資料
      mockClient._setProfilesData([
        {
          id: 'user-gmail-only-101',
          union_id: 'mei_user_gmail101',
          email: 'gmailuser@meistudio.live',
          display_name: '純 Gmail 會員',
          auth_provider: 'google',
          auth_providers: ['google'],
          metadata: { has_password: false }
        }
      ]);

      const res = await signInMemberWithPassword('gmailuser@meistudio.live', 'AnyPassword123');

      expect(res.success).toBe(false);
      expect(res.isGmailOnly).toBe(true);
      expect(res.error).toBe('此帳號由 Gmail 快速登入建立，尚未增設密碼。請使用 Gmail 登入或於登入後至會員專區增設密碼');
    });

    it('M1-R2-02: 正常設定過密碼之會員能順暢以信箱與密碼登入', async () => {
      // 模擬資料庫中已有設定密碼之會員
      mockClient._setProfilesData([
        {
          id: 'password-user-id-55',
          union_id: 'mei_user_pwd55',
          email: 'standard@meistudio.live',
          display_name: '標準會員',
          auth_provider: 'email',
          auth_providers: ['email'],
          metadata: { has_password: true }
        }
      ]);

      const res = await signInMemberWithPassword('standard@meistudio.live', 'CorrectPassword123!');

      expect(res.success).toBe(true);
      expect(res.member).toBeDefined();
      expect(res.member.email).toBe('standard@meistudio.live');
      expect(loadCurrentMember()).not.toBeNull();
    });

    it('M1-R2-03: 缺少信箱或密碼時回傳提醒訊息', async () => {
      const res = await signInMemberWithPassword('', '');
      expect(res.success).toBe(false);
      expect(res.error).toBe('請輸入電子信箱與密碼');
    });
  });

  // =========================================================================
  // R2: Gmail Fast Login (signInWithGmailFastLogin)
  // =========================================================================
  describe('R2: Gmail Fast Login Flow', () => {
    it('M1-R2-04: Gmail 快速登入預設設定 has_password: false 並支援自訂暱稱', async () => {
      const res = await signInWithGmailFastLogin({
        customDisplayName: '星際自訂創作者'
      });

      expect(res.success).toBe(true);
      expect(res.member).toBeDefined();
      expect(res.member.displayName).toBe('星際自訂創作者');
      expect(res.member.authProvider).toBe('google');
      expect(res.member.authProviders).toContain('google');
      expect(res.member.metadata?.has_password).toBe(false);

      const profiles = mockClient._getProfilesData();
      expect(profiles.length).toBeGreaterThan(0);
      const googleProfile = profiles.find((p) => p.auth_provider === 'google');
      expect(googleProfile).toBeDefined();
      expect(googleProfile.metadata?.has_password).toBe(false);
    });
  });

  // =========================================================================
  // R3: Security Bindings & Password Setting
  // =========================================================================
  describe('R3: Security Bindings & Password Setting', () => {
    it('M1-R3-01: 未登入狀態嘗試增設密碼回傳錯誤', async () => {
      await signOutMember();
      const res = await addPasswordToCurrentMember('NewPassword123!', 'NewPassword123!');
      expect(res.success).toBe(false);
      expect(res.error).toContain('請先登入會員');
    });

    it('M1-R3-02: 已登入之純 Gmail 會員增設密碼成功後解除密碼登入限制', async () => {
      // 1. 先透過 Gmail 快速登入
      await signInWithGmailFastLogin();
      const memberBefore = loadCurrentMember();
      expect(memberBefore.metadata?.has_password).toBe(false);

      // 2. 於會員設定中增設密碼
      const addRes = await addPasswordToCurrentMember('MyNewSecurePassword888!', 'MyNewSecurePassword888!');
      expect(addRes.success).toBe(true);
      expect(addRes.member.metadata?.has_password).toBe(true);
      expect(addRes.member.authProviders).toContain('email');

      // 3. 登出後以該信箱密碼登入，應能順暢登入且不再被阻擋
      await signOutMember();
      const loginRes = await signInMemberWithPassword(memberBefore.email, 'MyNewSecurePassword888!');
      expect(loginRes.success).toBe(true);
      expect(loginRes.isGmailOnly).toBeUndefined();
    });

    it('M1-R3-03: 增設密碼時兩次密碼不一致或長度不足拒絕更新', async () => {
      await signInWithGmailFastLogin();
      const resShort = await addPasswordToCurrentMember('123', '123');
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('密碼長度至少需要 6 個字元');

      const resMismatch = await addPasswordToCurrentMember('ValidPassword123', 'DifferentPassword');
      expect(resMismatch.success).toBe(false);
      expect(resMismatch.error).toContain('兩次輸入的密碼不一致');
    });

    it('M1-R3-04: 會員專區綁定 Gmail 成功更新 authProviders 與資料庫表記錄', async () => {
      // 註冊標準 Email 會員
      await registerMemberWithDetails({
        displayName: '郵件探索者',
        email: 'explorer.email@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

      const bindRes = await bindGmailToCurrentMember();
      expect(bindRes.success).toBe(true);
      expect(bindRes.member.authProviders).toContain('google');

      // 重複綁定時返回已綁定友善提示
      const repeatRes = await bindGmailToCurrentMember();
      expect(repeatRes.success).toBe(true);
      expect(repeatRes.message).toBe('已綁定 Gmail 帳號');
    });

    it('M1-R3-05: 綁定 Passkey 正確寫入 public.mei_member_passkeys 且更新 is_passkey_enabled: true', async () => {
      await registerMemberWithDetails({
        displayName: '生物金庫會員',
        email: 'vault.user@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

      const bindRes = await bindPasskeyToCurrentMember();

      expect(bindRes.success).toBe(true);
      expect(bindRes.member.isPasskeyEnabled).toBe(true);
      expect(bindRes.member.authProviders).toContain('passkey');

      // 檢查 public.mei_member_passkeys 資料表
      const passkeys = mockClient._getPasskeysData();
      expect(passkeys.length).toBe(1);
      expect(passkeys[0].credential_id).toBeDefined();
      expect(passkeys[0].public_key).toBeDefined();
      expect(passkeys[0].device_name).toBeDefined();
      expect(passkeys[0].counter).toBe(0);

      // 檢查 public.mei_member_profiles 資料表更新
      const profiles = mockClient._getProfilesData();
      const profile = profiles.find((p) => p.email === 'vault.user@meistudio.live');
      expect(profile).toBeDefined();
      expect(profile.is_passkey_enabled).toBe(true);
    });

    it('M1-R3-06: 未登入狀態呼叫 bindPasskeyToCurrentMember 安全回傳錯誤且不拋出未捕捉異常', async () => {
      await signOutMember();
      const res = await bindPasskeyToCurrentMember();
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.message).toContain('請先登入會員');
    });

    it('M1-R3-07: WebAuthn 憑證建立逾時或取消時優雅處理錯誤', async () => {
      await registerMemberWithDetails({
        displayName: '逾時會員',
        email: 'timeout@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

      mockWebAuthnCredentials({
        createFails: true,
        createError: new DOMException('User cancelled ceremony', 'NotAllowedError')
      });

      const res = await bindPasskeyToCurrentMember();
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  // =========================================================================
  // R4: Cross-Project SSO Token (generateMemberSsoToken & verifyMemberSsoToken)
  // =========================================================================
  describe('R4: Cross-Project SSO Token Protocol', () => {
    it('M1-R4-01: 為登入會員生成符合 mei_sso_v2 格式之防篡改 HMAC-SHA256 Token', async () => {
      await registerMemberWithDetails({
        displayName: 'SSO 旅人',
        email: 'sso.traveler@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

      const token = await generateMemberSsoToken();
      expect(typeof token).toBe('string');
      expect(token.startsWith('mei_sso_v2.')).toBe(true);

      const parts = token.split('.');
      expect(parts.length).toBe(4);
    });

    it('M1-R4-02: 成功校驗合法之 SSO Token 並解出會員憑證資訊', async () => {
      await registerMemberWithDetails({
        displayName: '校驗測試員',
        email: 'verifier@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

      const token = await generateMemberSsoToken();
      const verifyRes = await verifyMemberSsoToken(token);

      expect(verifyRes.valid).toBe(true);
      expect(verifyRes.payload).toBeDefined();
      expect(verifyRes.payload.email).toBe('verifier@meistudio.live');
      expect(verifyRes.payload.displayName).toBe('校驗測試員');
      expect(verifyRes.member).toBeDefined();
      expect(verifyRes.member.unionId).toBe(verifyRes.payload.unionId);
    });

    it('M1-R4-03: 篡改簽章或內容之 Token 必須被拒絕', async () => {
      await registerMemberWithDetails({
        displayName: '抗篡改測試',
        email: 'tamper@meistudio.live',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

      const token = await generateMemberSsoToken();
      const parts = token.split('.');
      // 篡改簽章
      const tamperedSigToken = `${parts[0]}.${parts[1]}.${parts[2]}.bad_signature_string`;
      const resTampered = await verifyMemberSsoToken(tamperedSigToken);

      expect(resTampered.valid).toBe(false);
      expect(resTampered.error).toContain('Invalid SSO Token signature');
    });

    it('M1-R4-04: 歷史棄用之 MEI-SSO- 漫遊碼格式必須被嚴格阻絕', async () => {
      const legacyToken = 'MEI-SSO-eyJ1bmlvbklkIjoibWVpX3VzZXJfMTIzNCIsImVtYWlsIjoidGVzdEBtZWlzdHVkaW8ubGl2ZSJ9';
      const res = await verifyMemberSsoToken(legacyToken);

      expect(res.valid).toBe(false);
      expect(res.error).toContain('Legacy MEI-SSO token is deprecated');
    });

    it('M1-R4-05: 空字串或結構不合法之 Token 回傳格式錯誤', async () => {
      const resEmpty = await verifyMemberSsoToken('');
      expect(resEmpty.valid).toBe(false);

      const resMalformed = await verifyMemberSsoToken('not_a_valid_token');
      expect(resMalformed.valid).toBe(false);
      expect(resMalformed.error).toContain('Malformed SSO Token structure');
    });

    it('M1-R4-06: 未登入狀態嘗試生成 SSO Token 拋出明確例外', async () => {
      await signOutMember();
      await expect(generateMemberSsoToken()).rejects.toThrow('未登入會員無法產生跨專案 SSO Token');
    });
  });
});
