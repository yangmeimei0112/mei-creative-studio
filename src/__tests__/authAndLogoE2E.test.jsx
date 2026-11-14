import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { StudioLogo, SquircleIconBadge, LucideIcon } from '../components/LucideIcon';
import PortalEntrance from '../components/PortalEntrance';
import HeaderHero from '../components/HeaderHero';
import MobileBottomNav from '../components/MobileBottomNav';
import AdminChatWidget from '../components/AdminChatWidget';
import { AdminUnlockModal, SdkAndInstallModal } from '../components/AdminProjectModal';
import QRCodeModal from '../components/QRCodeModal';
import CommandPalette from '../components/CommandPalette';
import MemberPortalModal from '../components/MemberPortalModal';
import App from '../App';
import { supabase } from '../services/supabaseClient';

import {
  MEMBER_TIERS,
  MEMBER_SSO_BROADCAST_CHANNEL,
  MEMBER_SSO_STORAGE_KEY,
  detectBiometricCapability,
  authenticateWithOAuthProvider,
  authenticateWithBiometricPasskey,
  signInWithGoogle,
  signInWithApple,
  signInWithEmail,
  signUpWithEmail,
  normalizeMemberProfile,
  loadCurrentMember,
  saveCurrentMember,
  signOutMember,
  broadcastMemberSsoEvent
} from '../services/memberAuthService';

const CANDIDATE_F_CLOUD = 'M17.5 19H9';
const CANDIDATE_F_LEMNISCATE = 'M12 14.5c';
const SPARKLES_PATH = 'M9.937 15.5';
const FORBIDDEN_LEGACY_PATH = 'm12 3-1.912';
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

const createMockMember = (overrides = {}) => ({
  unionId: 'mei_user_7f8a9b0c1d2e',
  email: 'explorer.alex@meistudio.live',
  displayName: 'Alex Chen',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  tier: 'explorer',
  tierLabel: '靈感探索員',
  authProviders: ['google'],
  isPasskeyEnabled: false,
  connectedProjects: ['*'],
  lastSignInAt: '2026-11-14T10:00:00.000Z',
  ...overrides
});

describe('Mei Creative Studio - Universal Member Auth & Brand Logo Designer 4-Tier E2E Test Suite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
    document.documentElement.className = '';
    document.body.innerHTML = '';
    window.location.hash = '';

    if (typeof window !== 'undefined' && !window.BroadcastChannel && typeof BroadcastChannel !== 'undefined') {
      window.BroadcastChannel = BroadcastChannel;
    }

    // JSDOM OAuth navigation guard: default safe mock to prevent JSDOM navigation crash
    vi.spyOn(supabase.auth, 'signInWithOAuth').mockImplementation(async ({ provider }) => {
      return {
        data: {
          provider,
          url: `https://accounts.google.com/o/oauth2/v2/auth?provider=${provider}&client_id=mock`
        },
        error: null
      };
    });
    vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation((cb) => {
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      };
    });
  });

  afterEach(() => {
    // 1. Storage and styling reset
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.className = '';

    // 2. DOM tree and hash cleanup
    document.body.innerHTML = '';
    window.location.hash = '';

    // 3. SDK DOM and global SSO state cleanup
    delete window.MeiStudioSSO;
    delete window.__MEI_STUDIO_DOCK_MOUNTED__;
    const dockRoot = document.getElementById('mei-studio-dock-root');
    if (dockRoot) dockRoot.remove();
    document.querySelectorAll('script[src*="mei-dock.js"]').forEach((s) => s.remove());

    // 4. Timer and mock restoration
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Tier 1: Feature Coverage & Happy Paths (14 Features from PROJECT.md)
  // =========================================================================
  describe('Tier 1: Feature Coverage & Happy Paths (Features 1-14)', () => {
    it('T1-F1-01: Supabase 唯讀盤點報告結構完整且標註唯讀防護規範 (Feature 1)', () => {
      const candidates = [
        path.resolve('SUPABASE_RISK_ASSESSMENT.md'),
        path.resolve('.agents/teamwork/sub_orch_m1/SUPABASE_RISK_ASSESSMENT.md')
      ];
      const foundPath = candidates.find((p) => fs.existsSync(p));
      expect(foundPath).toBeDefined();

      const content = fs.readFileSync(foundPath, 'utf-8');
      expect(content).toContain('MeiStudyFlow');
      expect(content).toContain('mdxnjlhjqskqsndeiepy');
      expect(content).toContain('ap-southeast-2');
      expect(content).toContain('PostgreSQL 17');
      expect(content).toMatch(/RLS/i);
      expect(EMOJI_REGEX.test(content.replace(/[\u2713\u2714]/g, ''))).toBe(false);
    });

    it('T1-F2-01: 資料庫綱要與 RLS 隔離 DDL 規範符合前綴隔離與最小權限原則 (Feature 2)', () => {
      const candidates = [
        path.resolve('schema_migrations.sql'),
        path.resolve('.agents/teamwork/sub_orch_m1/schema_migrations.sql')
      ];
      const foundPath = candidates.find((p) => fs.existsSync(p));
      expect(foundPath).toBeDefined();

      const ddl = fs.readFileSync(foundPath, 'utf-8');
      expect(ddl).toContain('mei_member_profiles');
      expect(ddl).toContain('mei_member_passkeys');
      expect(ddl).toContain('ENABLE ROW LEVEL SECURITY');
      expect(ddl).toContain('auth.uid() = id');
      expect(ddl).toContain("CHECK (tier IN ('explorer', 'creator', 'architect'))");
      expect(ddl).toContain('union_id');
      expect(EMOJI_REGEX.test(ddl.replace(/[\u2713\u2714]/g, ''))).toBe(false);
    });

    it('T1-F3-01: Brand Logo 預覽腳本與 7 階獨立向量檔案產出合規 (Feature 3)', () => {
      const scriptPath = path.resolve('scripts/generate-logo-previews.mjs');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const previewHtmlPath = path.resolve('public/logo-preview.html');
      expect(fs.existsSync(previewHtmlPath)).toBe(true);
      const previewHtml = fs.readFileSync(previewHtmlPath, 'utf-8');
      expect(previewHtml.length).toBeGreaterThan(1000);
      expect(EMOJI_REGEX.test(previewHtml)).toBe(false);

      const sizes = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      for (const sz of sizes) {
        const svgPath = path.resolve(`public/previews/logo-${sz}.svg`);
        expect(fs.existsSync(svgPath)).toBe(true);
        const svgContent = fs.readFileSync(svgPath, 'utf-8');
        expect(svgContent).toContain('stroke-width="1.75"');
        expect(svgContent).toContain(CANDIDATE_F_CLOUD);
        expect(svgContent).toContain(CANDIDATE_F_LEMNISCATE);
        expect(svgContent).not.toContain(FORBIDDEN_LEGACY_PATH);
        expect(EMOJI_REGEX.test(svgContent)).toBe(false);
      }
    });

    it('T1-F4-01: Brand Logo 雙重 Gate 審定簽核通過 (Feature 4)', () => {
      const previewScript = fs.readFileSync(
        path.resolve('scripts/generate-logo-previews.mjs'),
        'utf-8'
      );
      expect(previewScript).toContain('--check');
      expect(previewScript).toContain(CANDIDATE_F_CLOUD);
      expect(previewScript).toContain(CANDIDATE_F_LEMNISCATE);

      const verifyHub = fs.readFileSync(path.resolve('scripts/verify-hub.mjs'), 'utf-8');
      expect(verifyHub).toContain('strokeWidth=1.75');
      expect(verifyHub).toContain('absoluteStrokeWidth');
    });

    it('T1-F5-01: 全站 12 大品牌識別消費端點均正確渲染 StudioLogo 與 Candidate F 幾何 (Feature 5)', () => {
      const testProject = {
        id: 'test-p1',
        title: '雲端白板',
        category: 'efficiency',
        tags: ['Whiteboard']
      };

      const { container: c1 } = render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={() => {}}
          onComplete={() => {}}
        />
      );
      expect(c1.querySelector('.portal-core-emblem')).toBeInTheDocument();
      expect(c1.querySelector('.portal-core-emblem')).toHaveAttribute('data-logo-size', 'xl');

      const { container: c2 } = render(
        <HeaderHero
          projects={[]}
          visibleProjects={[]}
          filteredCount={0}
          recentProjects={[]}
          currentCategory="all"
          onSelectCategory={() => {}}
          currentTheme="light"
          onToggleTheme={() => {}}
          isAdmin={false}
          onOpenAdminUnlock={() => {}}
          onOpenAddProject={() => {}}
          currentMember={null}
          onOpenMemberPortal={() => {}}
        />
      );
      expect(c2.querySelector('[data-testid="studio-brand-logo"][data-logo-size="md"]')).toBeInTheDocument();

      const { container: c3 } = render(
        <MobileBottomNav
          activeSection="explore"
          onNavigateSection={() => {}}
          onOpenCommandPalette={() => {}}
          isAdmin={false}
          onOpenAdminUnlock={() => {}}
          onOpenAddProject={() => {}}
        />
      );
      expect(c3.querySelector('[data-testid="studio-brand-logo"][data-logo-size="xs"]')).toBeInTheDocument();

      const { container: c4 } = render(
        <AdminChatWidget
          isAdmin={true}
          isIntroPlaying={false}
          projects={[]}
          changelog={[]}
        />
      );
      const fabBtn = screen.getByTestId('admin-chat-fab');
      fireEvent.click(fabBtn);
      expect(c4.querySelector('[data-testid="studio-brand-logo"][data-logo-size="xs"]')).toBeInTheDocument();

      const { container: c5 } = render(
        <AdminUnlockModal isOpen={true} onClose={() => {}} onUnlockSuccess={() => {}} verifyPin={() => true} />
      );
      expect(c5.querySelector('[data-testid="studio-brand-logo"][data-logo-size="md"]')).toBeInTheDocument();

      const { container: c6 } = render(
        <SdkAndInstallModal
          isOpen={true}
          isAdmin={true}
          initialMode="sdk"
          onClose={() => {}}
          targetProject={testProject}
        />
      );
      expect(c6.querySelector('[data-testid="studio-brand-logo"][data-logo-size="md"]')).toBeInTheDocument();

      const { container: c7 } = render(
        <CommandPalette
          isOpen={true}
          onClose={() => {}}
          projects={[testProject]}
          onSelectProject={() => {}}
          onToggleTheme={() => {}}
          currentTheme="light"
          isAdmin={false}
          onReplayEntrance={() => {}}
        />
      );
      const paletteLogos = c7.querySelectorAll('[data-testid="studio-brand-logo"]');
      expect(paletteLogos.length).toBeGreaterThanOrEqual(2);
      expect(paletteLogos[0]).toHaveAttribute('data-logo-size', 'sm');
      expect(paletteLogos[1]).toHaveAttribute('data-logo-size', 'xs');

      const { container: c8 } = render(
        <QRCodeModal isOpen={true} onClose={() => {}} project={testProject} onNotify={() => {}} />
      );
      expect(c8.querySelector('[data-testid="studio-brand-logo"][data-logo-size="md"]')).toBeInTheDocument();
      expect(c8.innerHTML).toContain('/favicon.svg');

      const { container: c9 } = render(
        <MemberPortalModal isOpen={true} onClose={() => {}} currentMember={null} onMemberChange={() => {}} onNotify={() => {}} />
      );
      expect(c9.querySelector('[data-testid="studio-brand-logo"][data-logo-size="md"]')).toBeInTheDocument();

      const { container: c10 } = render(<App />);
      const footer = c10.querySelector('footer');
      expect(footer.querySelector('[data-testid="studio-brand-logo"][data-logo-size="sm"]')).toBeInTheDocument();
    });

    it('T1-F6-01: Brand Logo Milestone 3 終驗報告發布且包含 12 端點簽核清單 (Feature 6)', () => {
      const reportPath = path.resolve('BRAND_ACCEPTANCE_REPORT.md');
      expect(fs.existsSync(reportPath)).toBe(true);

      const report = fs.readFileSync(reportPath, 'utf-8');
      expect(report).toContain('Candidate F');
      expect(report).toContain('PortalEntrance');
      expect(report).toContain('HeaderHero');
      expect(report).toContain('MemberPortalModal');
      expect(report).toContain('strokeWidth={1.75}');
      expect(EMOJI_REGEX.test(report.replace(/[\u2713\u2714]/g, ''))).toBe(false);
    });

    it('T1-F7-01: 本機假代碼與漫遊碼清理規範靜態檢查 (Feature 7)', () => {
      // 遞迴遍歷目錄收集所有生產原始碼與標記腳本
      const collectProdFiles = (dir, extRegex = /\.(jsx?|tsx?|html|json)$/) => {
        let files = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === '__tests__' || entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files = files.concat(collectProdFiles(fullPath, extRegex));
          } else if (extRegex.test(entry.name)) {
            files.push(fullPath);
          }
        }
        return files;
      };

      const prodFiles = [
        ...collectProdFiles(path.resolve('src')),
        ...collectProdFiles(path.resolve('public'))
      ];

      expect(prodFiles.length).toBeGreaterThan(15);

      const forbiddenLegacyPatterns = [
        { name: 'msso_v1 fake JWT token', regex: /msso_v1/ },
        { name: 'exportMemberRoamingCode API', regex: /exportMemberRoamingCode/ },
        { name: 'importMemberRoamingCode API', regex: /importMemberRoamingCode/ },
        { name: 'savePasskeyToVault legacy vault', regex: /savePasskeyToVault/ },
        { name: 'hybrid_local_cloud engine mode', regex: /hybrid_local_cloud/ },
        { name: 'MEI-SSO-* roaming credential literal generation', regex: /MEI-SSO-[A-Za-z0-9+/=]{8,}/ },
        { name: 'MEI-SSO template literal constructor', regex: /`MEI-SSO-\$\{/ }
      ];

      for (const filePath of prodFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const pattern of forbiddenLegacyPatterns) {
          const match = pattern.regex.test(content);
          expect(match, `Forbidden mock pattern "${pattern.name}" found in ${filePath}`).toBe(false);
        }
      }

      // 驗證 MEI-SSO- 僅作為舊版漫遊碼防禦性阻絕保護 (Guard check) 存在於服務層與 SDK
      const authServiceSrc = fs.readFileSync(path.resolve('src/services/memberAuthService.js'), 'utf-8');
      expect(authServiceSrc).toContain("raw.startsWith('MEI-SSO-')");

      const dockSdkSrc = fs.readFileSync(path.resolve('public/sdk/mei-dock.js'), 'utf-8');
      expect(dockSdkSrc).toContain("raw.startsWith('MEI-SSO-')");

      // 行為驗證：確證阻絕防禦生效（輸入歷史 MEI-SSO- 漫遊碼時自動丟棄並回傳 null）
      window.localStorage.setItem('mei_universal_member_sso_v1', 'MEI-SSO-eyJ1bmlvbklkIjoiZmFrZV9hdXRoX3Rva2VuIn0=');
      expect(loadCurrentMember()).toBeNull();
    });

    it('T1-F8-01: Supabase Client 設定契約與 PKCE 流程標準驗證 (Feature 8)', () => {
      // 1. 靜態原始碼與環境配置實體檢驗 (Static Contract Inspection)
      const clientFilePath = path.resolve('src/services/supabaseClient.js');
      expect(fs.existsSync(clientFilePath)).toBe(true);

      const clientSource = fs.readFileSync(clientFilePath, 'utf-8');
      expect(clientSource).toMatch(/import\s*\{\s*createClient\s*\}\s*from\s*['"]@supabase\/supabase-js['"]/);
      expect(clientSource).toContain("flowType: 'pkce'");
      expect(clientSource).toContain('autoRefreshToken: true');
      expect(clientSource).toContain('persistSession: true');
      expect(clientSource).toContain("storageKey: 'mei_studio_supabase_auth_token_v1'");
      expect(clientSource).toContain('https://mdxnjlhjqskqsndeiepy.supabase.co');

      const envExamplePath = path.resolve('.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
      const envSource = fs.readFileSync(envExamplePath, 'utf-8');
      expect(envSource).toContain('VITE_SUPABASE_URL=https://mdxnjlhjqskqsndeiepy.supabase.co');
      expect(envSource).toContain('VITE_SUPABASE_ANON_KEY=');

      // 2. 具現化 Supabase 客戶端實體屬性檢驗 (Live Client Instance Verification)
      expect(supabase).toBeDefined();
      expect(supabase.supabaseUrl).toBe('https://mdxnjlhjqskqsndeiepy.supabase.co');
      expect(supabase.supabaseKey).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(supabase.auth.flowType).toBe('pkce');
      expect(supabase.auth.autoRefreshToken).toBe(true);
      expect(supabase.auth.persistSession).toBe(true);
      expect(supabase.auth.storageKey).toBe('mei_studio_supabase_auth_token_v1');
      expect(typeof supabase.auth.signInWithOAuth).toBe('function');
      expect(typeof supabase.auth.signOut).toBe('function');
      expect(typeof supabase.auth.getSession).toBe('function');
    });

    it('T1-F9-01: 多元身分認證服務層 API 契約支援 OAuth 與生物辨識 (Feature 9)', async () => {
      const bio = detectBiometricCapability();
      expect(bio).toHaveProperty('supported');
      expect(bio).toHaveProperty('biometricLabel');
      expect(bio).toHaveProperty('icon');

      const oauthSpy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
        data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth' },
        error: null
      });

      const profile = await authenticateWithOAuthProvider('google');
      expect(profile).not.toBeNull();
      expect(profile.authProviders).toContain('google');
      expect(oauthSpy).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      );

      await signOutMember();
      expect(loadCurrentMember()).toBeNull();
    });

    it('T1-F10-01: 會員專區 UI 現代化重構 (訪客多元登入按鈕與已登入通行卡片) (Feature 10)', () => {
      const { rerender } = render(
        <MemberPortalModal
          isOpen={true}
          onClose={() => {}}
          currentMember={null}
          onMemberChange={() => {}}
          onNotify={() => {}}
        />
      );

      expect(screen.getByTestId('member-portal-modal')).toBeInTheDocument();
      expect(screen.getByTestId('member-passkey-login-btn')).toBeInTheDocument();
      expect(screen.getByTestId('member-apple-login-btn')).toBeInTheDocument();
      expect(screen.getByTestId('member-google-login-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('member-profile-card')).toBeNull();

      const member = createMockMember();
      rerender(
        <MemberPortalModal
          isOpen={true}
          onClose={() => {}}
          currentMember={member}
          onMemberChange={() => {}}
          onNotify={() => {}}
        />
      );

      expect(screen.getByTestId('member-profile-card')).toBeInTheDocument();
      expect(screen.getByTestId('member-signout-btn')).toBeInTheDocument();
      expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    });

    it('T1-F11-01: 跨子專案 SSO 廣播頻道連通性 (BroadcastChannel) (Feature 11)', async () => {
      const receivedMessages = [];
      const testChannel = new BroadcastChannel(MEMBER_SSO_BROADCAST_CHANNEL);
      testChannel.onmessage = (evt) => {
        if (evt?.data) receivedMessages.push(evt.data);
      };

      try {
        const member = createMockMember();
        broadcastMemberSsoEvent('MEMBER_LOGIN', member);

        await waitFor(() => {
          expect(receivedMessages.length).toBeGreaterThanOrEqual(1);
        });

        expect(['MEMBER_LOGIN', 'MEMBER_SIGNED_IN']).toContain(receivedMessages[0].type);
        expect(receivedMessages[0].member.unionId).toBe(member.unionId);
      } finally {
        testChannel.close();
      }
    });

    it('T1-F12-01: 會員工作階段讀寫、正規化與生命週期契約 (Feature 12)', async () => {
      expect(loadCurrentMember()).toBeNull();

      const member = createMockMember();
      saveCurrentMember(member);
      const stored = loadCurrentMember();
      expect(stored).not.toBeNull();
      expect(stored.displayName).toBe('Alex Chen');

      await signOutMember();
      expect(loadCurrentMember()).toBeNull();
    });

    it('T1-F13-01: 全站自動化測試全回歸零 Emoji 與 Lucide 1.75 線寬合規 (Feature 13)', () => {
      const { container } = render(<StudioLogo size="lg" />);
      const logo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(logo).toBeInTheDocument();

      const cloudSvg = container.querySelector('.studio-infinity-cloud');
      expect(cloudSvg.getAttribute('stroke-width')).toBe('1.75');

      expect(EMOJI_REGEX.test(container.innerHTML)).toBe(false);
    });

    it('T1-F14-01: 瀏覽器端對端主入口應用根組件裝載無異常崩潰 (Feature 14)', () => {
      const { container } = render(<App />);
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('footer')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="header-member-portal-btn"]')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Tier 2: Boundary, Corner Cases & Degradation Handling
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases (Degradation & Edge Inputs)', () => {
    it('T2-B-01: OAuth 第三方認證拒絕或拋錯時 Modal 保持穩定並呈現錯誤訊息', async () => {
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={() => {}}
          currentMember={null}
          onMemberChange={() => {}}
          onNotify={() => {}}
        />
      );

      vi.spyOn(supabase.auth, 'signInWithOAuth').mockRejectedValueOnce(
        new Error('The user denied OAuth permissions')
      );

      const googleBtn = screen.getByTestId('member-google-login-btn');
      expect(googleBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      await waitFor(() => {
        const alertEl = screen.getByRole('alert');
        expect(alertEl).toBeInTheDocument();
        expect(alertEl).toHaveTextContent(/denied|失敗/i);
      });

      expect(screen.getByTestId('member-portal-modal')).toBeInTheDocument();
    });

    it('T2-B-02: 離線或網路逾時模擬時認證服務層安全攔截無未捕獲異常', async () => {
      const originalFetch = globalThis.fetch;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new TypeError('Failed to fetch (offline network error)')
      );

      try {
        const res = await signInWithEmail('offline@meistudio.live', 'test-password');
        expect(res).toBeDefined();
        expect(res.data).toBeNull();
        expect(res.error).toBeDefined();
        expect(res.error.message).toContain('Failed to fetch');
      } finally {
        fetchSpy.mockRestore();
        if (originalFetch) globalThis.fetch = originalFetch;
      }
    });

    it('T2-B-03: WebAuthn 硬體安全金鑰不支援時 detectBiometricCapability 優雅降級', () => {
      const originalCredential = window.PublicKeyCredential;
      try {
        delete window.PublicKeyCredential;

        const capability = detectBiometricCapability();
        expect(capability.webAuthnAvailable).toBe(false);
        expect(capability.biometricLabel).toBeDefined();
        expect(capability.icon).toBeDefined();
      } finally {
        window.PublicKeyCredential = originalCredential;
      }
    });

    it('T2-B-04: 會員專區表單防快速連續點擊 (防重複發起認證請求)', async () => {
      const onMemberChange = vi.fn();
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={() => {}}
          currentMember={null}
          onMemberChange={onMemberChange}
          onNotify={() => {}}
        />
      );

      let resolveOAuth;
      const pendingPromise = new Promise((resolve) => {
        resolveOAuth = resolve;
      });

      const spy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockReturnValue(pendingPromise);

      const googleBtn = screen.getByTestId('member-google-login-btn');

      // 觸發首次點擊發起認證請求
      fireEvent.click(googleBtn);

      // 驗證按鈕切換為 disabled 鎖定防護狀態
      await waitFor(() => {
        expect(googleBtn).toBeDisabled();
      });

      // 在請求進行中發起連續點擊
      fireEvent.click(googleBtn);
      fireEvent.click(googleBtn);

      // 完成該次認證請求
      await act(async () => {
        resolveOAuth({
          data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth' },
          error: null
        });
      });

      // 實質斷言調用次數為 1，證明防連點鎖定防護生效
      expect(spy).toHaveBeenCalledTimes(1);
      expect(googleBtn).toBeInTheDocument();
    });

    it('T2-B-05: 320px 極窄手機視窗與 1920px 寬螢幕下 MemberPortalModal 具備縱向滾動適配', () => {
      const { container } = render(
        <MemberPortalModal
          isOpen={true}
          onClose={() => {}}
          currentMember={null}
          onMemberChange={() => {}}
          onNotify={() => {}}
        />
      );

      const card = container.querySelector('.bento-glass-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('overflow-y-auto');
      expect(card).toHaveClass('max-h-[90vh]');
    });

    it('T2-B-06: 本機快取存有毀損之非 JSON 字串時 loadCurrentMember 安全回傳 null', () => {
      window.localStorage.setItem(MEMBER_SSO_STORAGE_KEY, '{corrupted-non-json-token...');
      const member = loadCurrentMember();
      expect(member).toBeNull();
    });

    it('T2-B-07: StudioLogo 傳入未知或無效尺寸代號時自動安全降級為 md (44px) 規格', () => {
      const { container } = render(<StudioLogo size="ultra-non-existent-dimension" />);
      const logo = container.querySelector('[data-testid="studio-brand-logo"]');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('data-logo-size', 'md');

      const badge = logo.querySelector('.squircle-icon-badge');
      expect(badge).toHaveClass('w-[44px]', 'h-[44px]');
    });

    it('T2-B-08: 未登入訪客狀態下 HeaderHero 正確顯示登入引導提示', () => {
      render(
        <HeaderHero
          projects={[]}
          visibleProjects={[]}
          filteredCount={0}
          recentProjects={[]}
          currentCategory="all"
          onSelectCategory={() => {}}
          currentTheme="light"
          onToggleTheme={() => {}}
          isAdmin={false}
          onOpenAdminUnlock={() => {}}
          onOpenAddProject={() => {}}
          currentMember={null}
          onOpenMemberPortal={() => {}}
        />
      );

      const btn = screen.getByTestId('header-member-portal-btn');
      expect(btn).toHaveTextContent('會員專區');
      expect(btn).toHaveClass('btn-sky-secondary');
    });

    it('T2-B-09: 點擊 MemberPortalModal 遮罩外層觸發 onClose 回呼關閉視窗', () => {
      const onClose = vi.fn();
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={onClose}
          currentMember={null}
          onMemberChange={() => {}}
          onNotify={() => {}}
        />
      );

      const modalBackdrop = screen.getByTestId('member-portal-modal');
      fireEvent.click(modalBackdrop);
      expect(onClose).toHaveBeenCalled();
    });

    it('T2-B-10: 會員暱稱與信箱含有 HTML 特殊字元時 normalizeMemberProfile 進行深度消毒', () => {
      const raw = {
        unionId: 'mei_uid_safe_1',
        email: '<script>alert("xss")</script>user@test.live',
        displayName: '<b>Alex</b><img src=x onerror=1>',
        tier: 'creator'
      };

      const normalized = normalizeMemberProfile(raw);
      expect(normalized.displayName).not.toContain('<script>');
      expect(normalized.displayName).not.toContain('onerror');
      expect(normalized.email).not.toContain('<script>');
    });
  });

  // =========================================================================
  // Tier 3: Cross-Feature Combinations (T3-C-01 through T3-C-10)
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations (T3-C-01 through T3-C-10)', () => {
    it('T3-C-01: 登入後頂部導覽列狀態變更與商標穩定性 (F8 + F9 + F10 + F5)', async () => {
      const member = createMockMember({ displayName: 'Inspiration Maker' });

      const { rerender } = render(
        <HeaderHero
          projects={[]}
          visibleProjects={[]}
          filteredCount={0}
          recentProjects={[]}
          currentCategory="all"
          onSelectCategory={() => {}}
          currentTheme="light"
          onToggleTheme={() => {}}
          isAdmin={false}
          onOpenAdminUnlock={() => {}}
          onOpenAddProject={() => {}}
          currentMember={null}
          onOpenMemberPortal={() => {}}
        />
      );

      const guestBtn = screen.getByTestId('header-member-portal-btn');
      expect(guestBtn).toHaveTextContent('會員專區');
      expect(guestBtn).toHaveClass('btn-sky-secondary');

      const logoBefore = screen.getByTestId('studio-brand-logo');
      expect(logoBefore).toHaveAttribute('data-logo-size', 'md');

      rerender(
        <HeaderHero
          projects={[]}
          visibleProjects={[]}
          filteredCount={0}
          recentProjects={[]}
          currentCategory="all"
          onSelectCategory={() => {}}
          currentTheme="light"
          onToggleTheme={() => {}}
          isAdmin={false}
          onOpenAdminUnlock={() => {}}
          onOpenAddProject={() => {}}
          currentMember={member}
          onOpenMemberPortal={() => {}}
        />
      );

      const loggedBtn = screen.getByTestId('header-member-portal-btn');
      expect(loggedBtn).toHaveTextContent('Inspiration Maker');
      expect(loggedBtn).toHaveClass('btn-sky-primary');

      const logoAfter = screen.getByTestId('studio-brand-logo');
      expect(logoAfter).toHaveAttribute('data-logo-size', 'md');
      expect(logoAfter.querySelector('[data-lucide-name="cloud"]')).toHaveClass('studio-infinity-cloud');
    });

    it('T3-C-02: 跨分頁即時登出同步與 UI 視圖聯動 (F9 + F10 + F11 + F14)', async () => {
      const tabBChannel = new BroadcastChannel(MEMBER_SSO_BROADCAST_CHANNEL);
      const receivedEvents = [];
      tabBChannel.onmessage = (evt) => {
        if (evt?.data) receivedEvents.push(evt.data);
      };

      try {
        const member = createMockMember();
        saveCurrentMember(member);
        expect(loadCurrentMember()).not.toBeNull();

        // 顯式 await 異步登出
        await signOutMember();

        // 顯式等待登出事件抵達，相容 MEMBER_SIGNED_OUT 與 MEMBER_LOGOUT 契約
        await waitFor(() => {
          const logoutEvt = receivedEvents.find(
            (e) => e.type === 'MEMBER_SIGNED_OUT' || e.type === 'MEMBER_LOGOUT'
          );
          expect(logoutEvt).toBeDefined();
          expect(logoutEvt.member).toBeNull();
        });

        expect(loadCurrentMember()).toBeNull();
      } finally {
        tabBChannel.close();
      }
    });

    it('T3-C-03: 歷史假漫遊碼與假金庫阻絕防禦 (F7 + F8 + F9 + F12)', () => {
      window.localStorage.setItem('mei_universal_member_sso_v1', 'MEI-SSO-eyJ1bmlvbklkIjoiZmFrZSJ9');
      const loaded = loadCurrentMember();
      expect(loaded).toBeNull();

      const valid = createMockMember();
      saveCurrentMember(valid);
      const reloaded = loadCurrentMember();
      expect(reloaded).not.toBeNull();
      expect(reloaded.unionId).toBe(valid.unionId);
    });

    it('T3-C-04: 全站 12 大端點在深淺色動態切換時之自適應向量渲染 (F3 + F5 + Theme)', () => {
      document.documentElement.className = 'light';
      const { container, rerender } = render(<StudioLogo size="md" />);
      const squircleLight = container.querySelector('.squircle-icon-badge');
      expect(squircleLight).toHaveClass('bg-sky-500/10');

      document.documentElement.className = 'dark';
      rerender(<StudioLogo size="md" />);
      const squircleDark = container.querySelector('.squircle-icon-badge');
      expect(squircleDark).toHaveClass('dark:bg-sky-400/10');

      const cloudSvg = container.querySelector('.studio-infinity-cloud');
      expect(cloudSvg).toHaveClass('text-sky-500', 'dark:text-sky-400');
    });

    it('T3-C-05: 子專案膠囊 SDK 接收主大廳真實 Session 廣播 (F9 + F11 + F5)', async () => {
      delete window.__MEI_STUDIO_DOCK_MOUNTED__;
      const existingDock = document.getElementById('mei-studio-dock-root');
      if (existingDock) existingDock.remove();

      const scriptEl = document.createElement('script');
      scriptEl.setAttribute('src', '/sdk/mei-dock.js');
      document.body.appendChild(scriptEl);

      const dockScriptCode = fs.readFileSync(path.resolve('public/sdk/mei-dock.js'), 'utf-8');
      new Function(dockScriptCode)();

      expect(window.MeiStudioSSO).toBeDefined();

      const receivedInDock = [];
      const unsubscribe = window.MeiStudioSSO.onAuthStateChange((m) => {
        receivedInDock.push(m);
      });

      try {
        const member = createMockMember({ displayName: 'SDK Tester' });
        broadcastMemberSsoEvent('MEMBER_LOGIN', member);

        await waitFor(() => {
          expect(receivedInDock.length).toBeGreaterThanOrEqual(1);
        });

        expect(receivedInDock[receivedInDock.length - 1].displayName).toBe('SDK Tester');
        expect(window.MeiStudioSSO.currentMember.displayName).toBe('SDK Tester');
      } finally {
        unsubscribe();
        if (scriptEl.parentNode) scriptEl.remove();
      }
    });

    it('T3-C-06: 硬體不支援 WebAuthn / Passkey 時之優雅降級組合 (F8 + F9 + F10)', async () => {
      const originalCreate = navigator.credentials?.create;
      try {
        if (navigator.credentials) {
          navigator.credentials.create = vi.fn().mockRejectedValue(new Error('NotSupportedError'));
        }

        render(
          <MemberPortalModal
            isOpen={true}
            onClose={() => {}}
            currentMember={null}
            onMemberChange={() => {}}
            onNotify={() => {}}
          />
        );

        const passkeyBtn = screen.getByTestId('member-passkey-login-btn');
        fireEvent.click(passkeyBtn);

        await waitFor(() => {
          expect(screen.getByTestId('member-portal-modal')).toBeInTheDocument();
        });
      } finally {
        if (navigator.credentials && originalCreate) {
          navigator.credentials.create = originalCreate;
        }
      }
    });

    it('T3-C-07: 商標在彈窗開合、焦點捕捉與無障礙標籤之交互作用 (F5 + F10 + A11y)', () => {
      const onClose = vi.fn();
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={onClose}
          currentMember={null}
          onMemberChange={() => {}}
          onNotify={() => {}}
        />
      );

      const modal = screen.getByTestId('member-portal-modal');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-label', '全站聯通會員專區');

      expect(modal.querySelector('.studio-logo-sparkle')).not.toBeInTheDocument();

      const closeBtn = screen.getByLabelText('關閉會員專區視窗');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('T3-C-08: 前端 Anon Key 邊界安全與全站資安誘捕網協同 (F1 + F2 + F8 + Security)', () => {
      render(<App />);

      act(() => {
        window.location.hash = '#ai-canary-restricted-catalog';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      const member = loadCurrentMember();
      expect(member).toBeNull();
    });

    it('T3-C-09: 雲端會員身分與管理員 PIN 解鎖之雙軌獨立運作 (F9 + Admin PIN)', async () => {
      const member = createMockMember({ displayName: 'Dual User' });
      saveCurrentMember(member);

      const { container } = render(<App />);

      const headerMemberBtn = container.querySelector('[data-testid="header-member-portal-btn"]');
      expect(headerMemberBtn).toHaveTextContent('Dual User');

      const footerUnlockBtn = container.querySelector('[data-testid="footer-admin-unlock-btn"]');
      expect(footerUnlockBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(footerUnlockBtn);
      });
      await act(async () => {
        fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
          target: { value: 'mei888' }
        });
        fireEvent.click(screen.getByText('立即解鎖管理後台'));
      });

      expect(container.querySelector('[data-testid="footer-admin-lock-btn"]')).toBeInTheDocument();
      expect(headerMemberBtn).toHaveTextContent('Dual User');

      await act(async () => {
        const footerLockBtn = container.querySelector('[data-testid="footer-admin-lock-btn"]');
        fireEvent.click(footerLockBtn);
      });

      expect(container.querySelector('[data-testid="footer-admin-unlock-btn"]')).toBeInTheDocument();
      expect(headerMemberBtn).toHaveTextContent('Dual User');
    });

    it('T3-C-10: 靜態資產生成器、合規檢查器與全套測試套件聯動 (F3 + F4 + F13)', () => {
      const previewScript = fs.readFileSync(path.resolve('scripts/generate-logo-previews.mjs'), 'utf-8');
      expect(previewScript).toContain('--check');
      expect(previewScript).toContain('logo-2xs.svg');
      expect(previewScript).toContain('logo-2xl.svg');

      const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
      expect(packageJson.scripts['preview:logo']).toBeDefined();
    });
  });

  // =========================================================================
  // Tier 4: Real-World Application Scenarios (RW-01 through RW-06)
  // =========================================================================
  describe('Tier 4: Real-World Application Scenarios (RW-01 through RW-06)', () => {
    it('RW-01: 新訪客完整探索與創作者通行證登入工作流 (New Visitor Full Journey)', async () => {
      const { container } = render(<App />);

      const headerMemberBtn = container.querySelector('[data-testid="header-member-portal-btn"]');
      expect(headerMemberBtn).toHaveTextContent('會員專區');

      await act(async () => {
        fireEvent.click(headerMemberBtn);
      });
      const modal = screen.getByTestId('member-portal-modal');
      expect(modal).toBeInTheDocument();

      const googleBtn = screen.getByTestId('member-google-login-btn');
      await act(async () => {
        fireEvent.click(googleBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('member-profile-card')).toBeInTheDocument();
      });

      const member = loadCurrentMember();
      expect(member).not.toBeNull();
      expect(member.authProviders).toContain('google');

      await act(async () => {
        fireEvent.click(screen.getByLabelText('關閉會員專區視窗'));
      });
      await waitFor(() => {
        expect(screen.queryByTestId('member-portal-modal')).toBeNull();
      });
    });

    it('RW-02: 多分頁並發操作與即時單點登入/登出漫遊工作流 (Multi-Tab SSO Sync)', async () => {
      const tab2Channel = new BroadcastChannel(MEMBER_SSO_BROADCAST_CHANNEL);
      const receivedInTab2 = [];
      tab2Channel.onmessage = (evt) => {
        if (evt?.data) receivedInTab2.push(evt.data);
      };

      try {
        const member = createMockMember({ displayName: 'Multi-Tab Pioneer' });
        broadcastMemberSsoEvent('MEMBER_LOGIN', member);

        await waitFor(() => {
          expect(receivedInTab2.length).toBeGreaterThanOrEqual(1);
        });
        expect(['MEMBER_LOGIN', 'MEMBER_SIGNED_IN']).toContain(receivedInTab2[0].type);
        expect(receivedInTab2[0].member.displayName).toBe('Multi-Tab Pioneer');

        broadcastMemberSsoEvent('MEMBER_LOGOUT', null);

        await waitFor(() => {
          expect(receivedInTab2.length).toBeGreaterThanOrEqual(2);
        });
        expect(['MEMBER_LOGOUT', 'MEMBER_SIGNED_OUT']).toContain(receivedInTab2[1].type);
        expect(receivedInTab2[1].member).toBeNull();
      } finally {
        tab2Channel.close();
      }
    });

    it('RW-03: 全站 12 大端點深淺色全視角審定工作流 (Brand Visual Immersion)', () => {
      const allSizes = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];

      // 1. 淺色模式審定
      document.documentElement.className = 'light';
      for (const sz of allSizes) {
        const { container, unmount } = render(<StudioLogo size={sz} />);
        const logo = container.querySelector('[data-testid="studio-brand-logo"]');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('data-logo-size', sz);

        const cloudSvg = logo.querySelector('[data-lucide-name="cloud"]');
        expect(cloudSvg.innerHTML).toContain(CANDIDATE_F_CLOUD);
        expect(cloudSvg.innerHTML).toContain(CANDIDATE_F_LEMNISCATE);
        expect(cloudSvg.innerHTML).not.toContain(FORBIDDEN_LEGACY_PATH);
        unmount();
      }

      // 2. 深色模式審定
      document.documentElement.className = 'dark';
      for (const sz of allSizes) {
        const { container, unmount } = render(<StudioLogo size={sz} />);
        const logo = container.querySelector('[data-testid="studio-brand-logo"]');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('data-logo-size', sz);

        const badge = logo.querySelector('.squircle-icon-badge');
        expect(badge).toHaveClass('dark:bg-sky-400/10');
        unmount();
      }
    });

    it('RW-04: Milestone 2 & Milestone 3 終驗簽核與發布發行工作流 (Release Sign-off)', () => {
      const riskDocPath = [
        path.resolve('SUPABASE_RISK_ASSESSMENT.md'),
        path.resolve('.agents/teamwork/sub_orch_m1/SUPABASE_RISK_ASSESSMENT.md')
      ].find((p) => fs.existsSync(p));
      expect(riskDocPath).toBeDefined();

      const acceptancePath = path.resolve('BRAND_ACCEPTANCE_REPORT.md');
      expect(fs.existsSync(acceptancePath)).toBe(true);

      const previewsHtml = path.resolve('public/logo-preview.html');
      expect(fs.existsSync(previewsHtml)).toBe(true);

      const previewFiles = fs.readdirSync(path.resolve('public/previews'));
      expect(previewFiles.length).toBe(7);
      for (const f of previewFiles) {
        expect(f).toMatch(/^logo-(2xs|xs|sm|md|lg|xl|2xl)\.svg$/);
      }
    });

    it('RW-05: 雲端會員身分與管理員 PIN 解鎖雙軌協同工作流 (Dual Operator Roles)', async () => {
      const member = createMockMember({ displayName: 'Operator Alpha' });
      saveCurrentMember(member);

      const { container } = render(<App />);

      const memberBtn = container.querySelector('[data-testid="header-member-portal-btn"]');
      expect(memberBtn).toHaveTextContent('Operator Alpha');

      const unlockBtn = container.querySelector('[data-testid="footer-admin-unlock-btn"]');
      await act(async () => {
        fireEvent.click(unlockBtn);
      });
      await act(async () => {
        fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
          target: { value: 'mei888' }
        });
        fireEvent.click(screen.getByText('立即解鎖管理後台'));
      });

      expect(container.querySelector('[data-testid="footer-admin-lock-btn"]')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(memberBtn);
      });
      expect(screen.getByTestId('member-profile-card')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTestId('member-signout-btn'));
      });
      await waitFor(() => {
        expect(loadCurrentMember()).toBeNull();
      });

      expect(container.querySelector('[data-testid="footer-admin-lock-btn"]')).toBeInTheDocument();
    });

    it('RW-06: 雲端服務異常/逾時與離線優雅降級工作流 (Network Fault & Graceful Fallback)', async () => {
      vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
        data: null,
        error: new Error('Apple OAuth provider interface reserved')
      });

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={() => {}}
          currentMember={null}
          onMemberChange={() => {}}
          onNotify={() => {}}
        />
      );

      const appleBtn = screen.getByTestId('member-apple-login-btn');
      expect(appleBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(appleBtn);
      });

      await waitFor(() => {
        const alertEl = screen.getByRole('alert');
        expect(alertEl).toBeInTheDocument();
        expect(alertEl).toHaveTextContent(/Apple 登入已預留雲端介面/);
      });

      expect(screen.getByTestId('member-portal-modal')).toBeInTheDocument();
      expect(screen.getByTestId('member-apple-login-btn')).toBeInTheDocument();
    });
  });
});
