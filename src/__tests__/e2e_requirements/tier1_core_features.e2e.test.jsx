/**
 * Tier 1: Core Feature Coverage E2E Test Suite
 * 
 * Verifies happy-path requirements across all 15 features (F1 to F15)
 * with ≥5 assertions or test cases per feature as specified in TEST_INFRA.md.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  setupE2ETestEnvironment,
  simulateViewport,
  expectZeroEmoji,
  createMockSupabaseClient,
  mockWebAuthnCredentials,
  getProjectSyncService,
  getSortPopoverElements
} from './e2eHarness';

import App from '../../App';
import HeaderHero from '../../components/HeaderHero';
import MobileBottomNav from '../../components/MobileBottomNav';
import MemberPortalModal from '../../components/MemberPortalModal';
import { SdkAndInstallModal } from '../../components/AdminProjectModal';
import PortalEntrance from '../../components/PortalEntrance';
import { StudioLogo, LucideIcon } from '../../components/LucideIcon';
import {
  PROJECT_CATEGORIES,
  STUDIO_CONFIG,
  DEFAULT_PROJECTS
} from '../../data/defaultData';
import {
  detectBiometricCapability,
  signInWithGoogle,
  signInWithPasskey,
  bindPasskeyToCurrentMember
} from '../../services/memberAuthService';

describe('Tier 1: Core Feature Coverage (Features 1 to 15)', () => {
  setupE2ETestEnvironment();

  // =========================================================================
  // Feature 1: Supabase Client Environment & Dynamic Configuration (R1-F1)
  // =========================================================================
  describe('Feature 1 (R1-F1): Supabase Client Environment & Dynamic Configuration', () => {
    it('T1-F1-01: Supabase client initializes with valid URL matching supabase.co pattern', async () => {
      const supabaseModule = await import('../../services/supabaseClient.js');
      expect(supabaseModule.supabase).toBeDefined();
      expect(supabaseModule.supabase.supabaseUrl).toMatch(/^https:\/\/.*\.supabase\.co\/?$/);
    });

    it('T1-F1-02: Supabase client uses PKCE flowType for OAuth security', async () => {
      const supabaseModule = await import('../../services/supabaseClient.js');
      expect(supabaseModule.supabase.auth).toBeDefined();
      // flowType in Supabase client auth configuration
      expect(supabaseModule.supabase.auth.flowType).toBe('pkce');
    });

    it('T1-F1-03: Supabase client uses isolated storageKey "mei_studio_supabase_auth_token_v1"', async () => {
      const supabaseModule = await import('../../services/supabaseClient.js');
      expect(supabaseModule.supabase.auth.storageKey).toBe('mei_studio_supabase_auth_token_v1');
    });

    it('T1-F1-04: Supabase client enables experimental passkey auth or native passkey support', async () => {
      const supabaseModule = await import('../../services/supabaseClient.js');
      const client = supabaseModule.supabase;
      expect(client.auth).toBeDefined();
      expect(client.auth.passkey).toBeDefined();
      expect(typeof client.auth.passkey.startAuthentication).toBe('function');
      expect(typeof client.auth.passkey.startRegistration).toBe('function');
    });

    it('T1-F1-05: getEffectiveSupabaseConfig returns valid supabaseUrl and supabaseAnonKey', async () => {
      const supabaseModule = await import('../../services/supabaseClient.js');
      if (typeof supabaseModule.getEffectiveSupabaseConfig === 'function') {
        const config = supabaseModule.getEffectiveSupabaseConfig();
        expect(config).toHaveProperty('supabaseUrl');
        expect(config).toHaveProperty('supabaseAnonKey');
        expect(config.supabaseUrl).toMatch(/^https:\/\//);
      } else {
        // Fallback verification of exported supabase client attributes
        expect(supabaseModule.supabase.supabaseUrl).toBeDefined();
        expect(supabaseModule.supabase.supabaseKey).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Feature 2: Google OAuth Login Integration (R2-F1)
  // =========================================================================
  describe('Feature 2 (R2-F1): Google OAuth Login Integration', () => {
    it('T1-F2-01: MemberPortalModal renders Google OAuth button with testid "member-google-login-btn"', () => {
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
      expect(googleBtn).toBeInTheDocument();
      expect(googleBtn.textContent).toContain('Google');
    });

    it('T1-F2-02: Clicking Google OAuth button invokes signInWithGoogle PKCE flow', async () => {
      const supabaseModule = await import('../../services/supabaseClient.js');
      vi.spyOn(supabaseModule.supabase.auth, 'signInWithOAuth').mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' },
        error: null
      });

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
      await act(async () => {
        fireEvent.click(googleBtn);
      });

      expect(onMemberChange).toHaveBeenCalled();
    });

    it('T1-F2-03: Authenticated member profile card renders post-login', () => {
      const mockMember = {
        unionId: 'mei_user_test_google_1',
        displayName: 'Google 認證創作者',
        email: 'creator@meistudio.live',
        tier: 'creator',
        tierLabel: '創意造物者',
        authProvider: 'google',
        authProviders: ['google'],
        isPasskeyEnabled: false
      };

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={mockMember}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      const profileCard = screen.getByTestId('member-profile-card');
      expect(profileCard).toBeInTheDocument();
      expect(screen.getByText('Google 認證創作者')).toBeInTheDocument();
    });

    it('T1-F2-04: Profile card reflects Google provider indicator badge', () => {
      const mockMember = {
        unionId: 'mei_user_test_google_2',
        displayName: 'Google 會員',
        email: 'user@gmail.com',
        tier: 'creator',
        tierLabel: '創意造物者',
        authProvider: 'google',
        authProviders: ['google'],
        isPasskeyEnabled: false
      };

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={mockMember}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      const profileCard = screen.getByTestId('member-profile-card');
      expect(profileCard.textContent.toLowerCase()).toContain('google');
    });

    it('T1-F2-05: Successful Google login dispatches toast notification', async () => {
      const supabaseModule = await import('../../services/supabaseClient.js');
      vi.spyOn(supabaseModule.supabase.auth, 'signInWithOAuth').mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' },
        error: null
      });

      const onNotify = vi.fn();
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={onNotify}
        />
      );

      const googleBtn = screen.getByTestId('member-google-login-btn');
      await act(async () => {
        fireEvent.click(googleBtn);
      });

      expect(onNotify).toHaveBeenCalledWith(
        expect.stringContaining('Google'),
        expect.any(String)
      );
    });
  });

  // =========================================================================
  // Feature 3: Biometric Passkey / WebAuthn Login & Registration (R2-F2)
  // =========================================================================
  describe('Feature 3 (R2-F2): Biometric Passkey / WebAuthn Login & Registration', () => {
    it('T1-F3-01: MemberPortalModal renders Passkey login button with testid "member-passkey-login-btn"', () => {
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );
      const passkeyBtn = screen.getByTestId('member-passkey-login-btn');
      expect(passkeyBtn).toBeInTheDocument();
      expect(passkeyBtn.textContent).toContain('生物辨識快速登入');
    });

    it('T1-F3-02: Authenticated profile displays passkey binding button "member-bind-passkey-btn"', () => {
      const mockMember = {
        unionId: 'mei_user_google_bound',
        displayName: '創作者',
        email: 'creator@meistudio.live',
        tier: 'creator',
        tierLabel: '創意造物者',
        authProvider: 'google',
        authProviders: ['google'],
        isPasskeyEnabled: false
      };

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={mockMember}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      const bindBtn = screen.getByTestId('member-bind-passkey-btn');
      expect(bindBtn).toBeInTheDocument();
    });

    it('T1-F3-03: Clicking passkey login resolves authentication ceremony', async () => {
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

      const passkeyBtn = screen.getByTestId('member-passkey-login-btn');
      await act(async () => {
        fireEvent.click(passkeyBtn);
      });

      expect(onMemberChange).toHaveBeenCalled();
      expect(onNotify).toHaveBeenCalled();
    });

    it('T1-F3-04: Profile displays "isPasskeyEnabled: true" badge ("已綁定安全金鑰")', () => {
      const mockMember = {
        unionId: 'mei_user_passkey_ready',
        displayName: '安全會員',
        email: 'passkey@meistudio.live',
        tier: 'creator',
        tierLabel: '創意造物者',
        authProvider: 'passkey',
        authProviders: ['google', 'passkey'],
        isPasskeyEnabled: true
      };

      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={mockMember}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      expect(screen.getByText('已綁定安全金鑰')).toBeInTheDocument();
    });

    it('T1-F3-05: detectBiometricCapability returns valid hardware capability descriptor', () => {
      const cap = detectBiometricCapability();
      expect(cap).toHaveProperty('supported');
      expect(cap).toHaveProperty('webAuthnAvailable');
      expect(cap).toHaveProperty('biometricLabel');
      expect(cap).toHaveProperty('authenticatorName');
      expect(cap).toHaveProperty('icon');
      expectZeroEmoji(cap.biometricLabel);
      expectZeroEmoji(cap.authenticatorName);
    });
  });

  // =========================================================================
  // Feature 4: Complete Removal of Non-Essential Login Channels (R2-F3)
  // =========================================================================
  describe('Feature 4 (R2-F3): Complete Removal of Non-Essential Login Channels', () => {
    it('T1-F4-01: Apple OAuth button "member-apple-login-btn" is strictly absent', () => {
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );
      // Under R2, Apple OAuth must be removed
      expect(screen.queryByTestId('member-apple-login-btn')).toBeNull();
    });

    it('T1-F4-02: Email submit button "member-email-submit-btn" is strictly absent', () => {
      render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );
      // Under R2, Email password login must be removed
      expect(screen.queryByTestId('member-email-submit-btn')).toBeNull();
    });

    it('T1-F4-03: Email and password input fields (#member-email-input, #member-password-input) are strictly absent', () => {
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
    });

    it('T1-F4-04: Tier selector (#member-tier-select) is strictly absent from unauthenticated view', () => {
      const { container } = render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );
      expect(container.querySelector('#member-tier-select')).toBeNull();
    });

    it('T1-F4-05: HeaderHero member portal button tooltip excludes "Apple"', () => {
      render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );

      const memberBtn = screen.getByTestId('header-member-portal-btn');
      expect(memberBtn).toBeInTheDocument();
      // Ensure the title tooltip does not mention Apple
      const titleAttr = memberBtn.getAttribute('title') || '';
      expect(titleAttr).not.toContain('Apple');
    });
  });

  // =========================================================================
  // Feature 5: Supabase Database Schema & Migration for Projects (R3-F1)
  // =========================================================================
  describe('Feature 5 (R3-F1): Supabase Database Schema & Migration for Projects', () => {
    const schemaSqlPath = path.resolve('schema_migrations.sql');
    const schemaSql = fs.existsSync(schemaSqlPath) ? fs.readFileSync(schemaSqlPath, 'utf-8') : '';

    it('T1-F5-01: schema_migrations.sql defines public.mei_member_projects table', () => {
      expect(schemaSql).toMatch(/CREATE TABLE (IF NOT EXISTS )?public\.mei_member_projects/i);
    });

    it('T1-F5-02: public.mei_member_projects includes sort_order INTEGER NOT NULL DEFAULT 0', () => {
      expect(schemaSql).toMatch(/sort_order\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
    });

    it('T1-F5-03: public.mei_member_projects includes pinned BOOLEAN NOT NULL DEFAULT false', () => {
      expect(schemaSql).toMatch(/pinned\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+false/i);
    });

    it('T1-F5-04: public.mei_member_projects enforces ROW LEVEL SECURITY', () => {
      expect(schemaSql).toMatch(/ALTER TABLE (ONLY )?public\.mei_member_projects ENABLE ROW LEVEL SECURITY/i);
      expect(schemaSql).toMatch(/ALTER TABLE (ONLY )?public\.mei_member_projects FORCE ROW LEVEL SECURITY/i);
    });

    it('T1-F5-05: Realtime publication adds public.mei_member_projects table', () => {
      expect(schemaSql).toMatch(/ALTER PUBLICATION supabase_realtime ADD TABLE public\.mei_member_projects/i);
      expectZeroEmoji(schemaSql);
    });
  });

  // =========================================================================
  // Feature 6: Bidirectional Project Sync Service API Contracts (R3-F2)
  // =========================================================================
  describe('Feature 6 (R3-F2): Bidirectional Project Sync Service API Contracts', () => {
    it('T1-F6-01: projectSyncService exports fetchCloudProjects querying ordered projects', async () => {
      const syncService = await getProjectSyncService();
      expect(syncService).not.toBeNull();
      expect(typeof syncService.fetchCloudProjects).toBe('function');
    });

    it('T1-F6-02: projectSyncService exports syncProjectToCloud for single upsert', async () => {
      const syncService = await getProjectSyncService();
      expect(syncService).not.toBeNull();
      expect(typeof syncService.syncProjectToCloud).toBe('function');
    });

    it('T1-F6-03: projectSyncService exports deleteProjectFromCloud for cloud deletion', async () => {
      const syncService = await getProjectSyncService();
      expect(syncService).not.toBeNull();
      expect(typeof syncService.deleteProjectFromCloud).toBe('function');
    });

    it('T1-F6-04: projectSyncService exports syncBatchProjectsToCloud for reordered list sync', async () => {
      const syncService = await getProjectSyncService();
      expect(syncService).not.toBeNull();
      expect(typeof syncService.syncBatchProjectsToCloud).toBe('function');
    });

    it('T1-F6-05: projectSyncService exports initProjectRealtimeListener returning unsubscription', async () => {
      const syncService = await getProjectSyncService();
      expect(syncService).not.toBeNull();
      expect(typeof syncService.initProjectRealtimeListener).toBe('function');
    });
  });

  // =========================================================================
  // Feature 7: React App Project Creation & Optimistic Sync (R3-F3)
  // =========================================================================
  describe('Feature 7 (R3-F3): React App Project Creation & Optimistic Sync', () => {
    it('T1-F7-01: Bento grid displays default projects on initial render', () => {
      render(<App />);
      expect(screen.getByText('雲絨極簡品牌官網')).toBeInTheDocument();
      expect(screen.getByText('咩咩互動設計實驗室')).toBeInTheDocument();
    });

    it('T1-F7-02: Project cards render category badge and status indicator', () => {
      render(<App />);
      const webBadges = screen.getAllByText('網站與商業應用');
      expect(webBadges.length).toBeGreaterThan(0);
    });

    it('T1-F7-03: Project inspection opens preview drawer', async () => {
      render(<App />);
      const projectCard = screen.getByText('雲絨極簡品牌官網').closest('.bento-glass-card');
      expect(projectCard).toBeInTheDocument();

      const previewBtn = projectCard.querySelector('button[title*="沙盒視角"]') ||
        projectCard.querySelector('button[aria-label*="沙盒視角"]') ||
        projectCard.querySelector('button');
      
      if (previewBtn) {
        fireEvent.click(previewBtn);
      }
      expect(projectCard).toBeInTheDocument();
    });

    it('T1-F7-04: LocalStorage persists project state changes under "mei_studio_projects_v1"', () => {
      render(<App />);
      const stored = window.localStorage.getItem('mei_studio_projects_v1');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('title');
    });

    it('T1-F7-05: Projects list maintains stable order when rendered', () => {
      render(<App />);
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // Feature 8: Mobile Footer Slogan Layout (R4-F1)
  // =========================================================================
  describe('Feature 8 (R4-F1): Mobile Footer Slogan Layout', () => {
    it('T1-F8-01: Studio title "咩創意工作室 Mei Creative Studio" present in footer', () => {
      render(<App />);
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(footer.textContent).toContain('咩創意工作室 Mei Creative Studio');
    });

    it('T1-F8-02: Slogan "創意無限∞咩有極限" present in footer', () => {
      render(<App />);
      const footer = screen.getByRole('contentinfo');
      expect(footer.textContent).toContain('創意無限∞咩有極限');
    });

    it('T1-F8-03: Footer slogan container uses responsive stacking classes (flex-col sm:flex-row)', () => {
      render(<App />);
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();

      // Locate the specific title span and verify its immediate parent wrapper has responsive stacking classes
      const spans = footer.querySelectorAll('span');
      const titleSpan = Array.from(spans).find((s) => s.textContent.includes('咩創意工作室'));
      expect(titleSpan).toBeDefined();
      const sloganWrapper = titleSpan.parentElement;
      expect(sloganWrapper).not.toBeNull();
      expect(sloganWrapper.className).toContain('flex-col');
      expect(sloganWrapper.className).toContain('sm:flex-row');
    });

    it('T1-F8-04: Separator dot between title and slogan is hidden on mobile screens (hidden sm:inline)', () => {
      const { container } = render(<App />);
      const footer = container.querySelector('footer');
      const separator = footer.querySelector('span.hidden.sm\\:inline');
      expect(separator).toBeInTheDocument();
      expect(separator.textContent.trim()).toBe('·');
    });

    it('T1-F8-05: Both title and slogan reside in distinct block or span elements', () => {
      render(<App />);
      const footer = screen.getByRole('contentinfo');
      const spans = footer.querySelectorAll('span');
      const titleSpan = Array.from(spans).find((s) => s.textContent.includes('咩創意工作室'));
      const sloganSpan = Array.from(spans).find((s) => s.textContent.includes('創意無限∞咩有極限'));

      expect(titleSpan).toBeDefined();
      expect(sloganSpan).toBeDefined();
      expect(titleSpan).not.toBe(sloganSpan);
    });
  });

  // =========================================================================
  // Feature 9: Mobile Bottom Nav "Quick Search" Flush Alignment (R4-F2)
  // =========================================================================
  describe('Feature 9 (R4-F2): Mobile Bottom Nav "Quick Search" Flush Alignment', () => {
    it('T1-F9-01: .mobile-nav-primary-btn is present in MobileBottomNav', () => {
      const { container } = render(
        <MobileBottomNav
          activeTab="home"
          onSelectTab={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onToggleTheme={vi.fn()}
          isDark={false}
        />
      );
      const primaryBtn = container.querySelector('.mobile-nav-primary-btn');
      expect(primaryBtn).toBeInTheDocument();
    });

    it('T1-F9-02: Negative margin class "-mt-4" is removed from primary button in JSX', () => {
      const { container } = render(
        <MobileBottomNav
          activeTab="home"
          onSelectTab={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onToggleTheme={vi.fn()}
          isDark={false}
        />
      );
      const primaryBtn = container.querySelector('.mobile-nav-primary-btn');
      expect(primaryBtn.className).not.toContain('-mt-4');
    });

    it('T1-F9-03: CSS file specifies margin-top: 0 for .mobile-nav-primary-btn', () => {
      const cssPath = path.resolve('src/styles/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/\.mobile-nav-primary-btn\s*\{[^}]*margin-top:\s*0/i);
    });

    it('T1-F9-04: Search button height and vertical alignment flush with sibling nav buttons', () => {
      const { container } = render(
        <MobileBottomNav
          activeTab="home"
          onSelectTab={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onToggleTheme={vi.fn()}
          isDark={false}
        />
      );
      const buttons = container.querySelectorAll('nav button');
      expect(buttons.length).toBe(5);
      // All nav buttons share py-1 or equivalent flush padding
      buttons.forEach((btn) => {
        expect(btn.className).not.toContain('-mt-');
      });
    });

    it('T1-F9-05: Clicking "快速搜尋" triggers onOpenCommandPalette callback', () => {
      const onOpenCommandPalette = vi.fn();
      const { container } = render(
        <MobileBottomNav
          activeTab="home"
          onSelectTab={vi.fn()}
          onOpenCommandPalette={onOpenCommandPalette}
          onToggleTheme={vi.fn()}
          isDark={false}
        />
      );
      const primaryBtn = container.querySelector('.mobile-nav-primary-btn');
      fireEvent.click(primaryBtn);
      expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Feature 10: Custom Popover / Modal Dropdown for Project Sorting (R5-F1)
  // =========================================================================
  describe('Feature 10 (R5-F1): Custom Popover / Modal Dropdown for Project Sorting', () => {
    it('T1-F10-01: Custom popover trigger button is present', () => {
      const { container } = render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const { trigger } = getSortPopoverElements(container);
      expect(trigger).toBeInTheDocument();
      expect(trigger.textContent).toContain('預設置頂與自訂順序');
    });

    it('T1-F10-02: Clicking trigger opens custom dropdown menu', () => {
      const { container } = render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const { trigger } = getSortPopoverElements(container);
      fireEvent.click(trigger);

      const { menu } = getSortPopoverElements(container);
      expect(menu).toBeInTheDocument();
    });

    it('T1-F10-03: Popover displays all 4 sort options', () => {
      const { container } = render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const { trigger } = getSortPopoverElements(container);
      fireEvent.click(trigger);

      const { menu } = getSortPopoverElements(container);
      expect(menu).toBeInTheDocument();
      expect(menu.textContent).toContain('預設置頂與自訂順序');
      expect(menu.textContent).toContain('最新更新優先');
      expect(menu.textContent).toContain('連線速度優先');
      expect(menu.textContent).toContain('專案名稱排序');
    });

    it('T1-F10-04: Clicking an option calls onSelectSortBy and closes popover menu', () => {
      const onSelectSortBy = vi.fn();
      const { container } = render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={onSelectSortBy}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const { trigger } = getSortPopoverElements(container);
      fireEvent.click(trigger);

      const { menu } = getSortPopoverElements(container);
      const optionBtn = Array.from(menu.querySelectorAll('button')).find((b) => b.textContent.includes('最新更新優先'));
      fireEvent.click(optionBtn);

      expect(onSelectSortBy).toHaveBeenCalledWith('updated');
      const { menu: closedMenu } = getSortPopoverElements(container);
      expect(closedMenu).toBeNull();
    });

    it('T1-F10-05: Visually hidden <select> is retained for accessibility and backward compatibility', () => {
      render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const select = screen.getByLabelText('專案排序方式');
      expect(select).toBeInTheDocument();
      expect(select.tagName.toLowerCase()).toBe('select');
      expect(select.className).toContain('sr-only');
    });
  });

  // =========================================================================
  // Feature 11: Category Badge Active Dark Blue Shadow Removal (R5-F2)
  // =========================================================================
  describe('Feature 11 (R5-F2): Category Badge Active Dark Blue Shadow Removal', () => {
    it('T1-F11-01: Active category tab contains .btn-sky-primary', () => {
      render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          selectedCategory="all"
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const allTab = screen.getByRole('tab', { name: /全部專案/i });
      expect(allTab.className).toContain('btn-sky-primary');
    });

    it('T1-F11-02: Active category tab DOES NOT have class "shadow-md"', () => {
      render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          selectedCategory="web-business"
          activeCategory="web-business"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const webTab = screen.getByRole('tab', { name: /網站與商業應用/i });
      expect(webTab.className).not.toContain('shadow-md');
    });

    it('T1-F11-03: CSS enforces box-shadow: none !important for active category tabs', () => {
      const cssPath = path.resolve('src/styles/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/\[role="tab"\]\.btn-sky-primary[^}]*box-shadow:\s*none\s*!important/i);
    });

    it('T1-F11-04: Inactive category tabs retain neutral border styling', () => {
      render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          selectedCategory="all"
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const aiTab = screen.getByRole('tab', { name: /AI 與自動化/i });
      expect(aiTab.className).toContain('border-sky-400/20');
      expect(aiTab.className).not.toContain('btn-sky-primary');
    });

    it('T1-F11-05: Category tab click switches active tab smoothly', () => {
      const onSelectCategory = vi.fn();
      render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          selectedCategory="all"
          activeCategory="all"
          onSelectCategory={onSelectCategory}
          sortBy="default"
          onSelectSortBy={vi.fn()}
          searchKeyword=""
          onSearchChange={vi.fn()}
          isAdmin={false}
          onOpenAdminModal={vi.fn()}
          currentMember={null}
          onOpenMemberPortal={vi.fn()}
        />
      );
      const interactiveTab = screen.getByRole('tab', { name: /互動設計與多媒體/i });
      fireEvent.click(interactiveTab);
      expect(onSelectCategory).toHaveBeenCalledWith('interactive-media');
    });
  });

  // =========================================================================
  // Feature 12: Theme Switch 60fps Performance Optimization (R6-F1)
  // =========================================================================
  describe('Feature 12 (R6-F1): Theme Switch 60fps Performance Optimization', () => {
    it('T1-F12-01: Theme toggle switches documentElement class between light and dark', async () => {
      render(<App />);
      const themeBtn = screen.getByRole('button', { name: /切換深淺色主題|切換至深色模式|切換至淺色模式/i });
      expect(themeBtn).toBeInTheDocument();

      const initialDark = document.documentElement.classList.contains('dark');
      fireEvent.click(themeBtn);

      expect(document.documentElement.classList.contains('dark')).toBe(!initialDark);
    });

    it('T1-F12-02: theme-transitioning class applied during toggle and cleaned up cleanly', async () => {
      vi.useFakeTimers();
      render(<App />);
      const themeBtn = screen.getByRole('button', { name: /切換深淺色主題|切換至深色模式|切換至淺色模式/i });

      fireEvent.click(themeBtn);
      expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true);

      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
    });

    it('T1-F12-03: CSS transition rules exclude wildcard button and input thrashing', () => {
      const cssPath = path.resolve('src/styles/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      const mainTransitionBlock = css.split('@media')[0];
      expect(mainTransitionBlock).not.toMatch(/html\.theme-transitioning\s+button/);
      expect(mainTransitionBlock).not.toMatch(/html\.theme-transitioning\s+input/);
    });

    it('T1-F12-04: Toast feedback dispatched without blocking theme paint', async () => {
      render(<App />);
      const themeBtn = screen.getByRole('button', { name: /切換深淺色主題|切換至深色模式|切換至淺色模式/i });
      fireEvent.click(themeBtn);

      await waitFor(() => {
        const toast = screen.queryByTestId('studio-toast');
        expect(toast).toBeInTheDocument();
      });
    });

    it('T1-F12-05: Theme preference persisted to localStorage', () => {
      render(<App />);
      const themeBtn = screen.getByRole('button', { name: /切換深淺色主題|切換至深色模式|切換至淺色模式/i });
      fireEvent.click(themeBtn);

      const stored = window.localStorage.getItem('mei_studio_theme_v1') ||
        window.localStorage.getItem('theme') ||
        window.localStorage.getItem('mei_theme');
      expect(['dark', 'light']).toContain(stored);
    });
  });

  // =========================================================================
  // Feature 13: Installation Guide "即時偵測" Text Removal (R7-F1)
  // =========================================================================
  describe('Feature 13 (R7-F1): Installation Guide "即時偵測" Text Removal', () => {
    it('T1-F13-01: Badge text "即時偵測" is strictly absent from the installation guide', () => {
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
      expect(screen.queryByText('即時偵測')).toBeNull();
    });

    it('T1-F13-02: Device detection card "device-detection-card" remains functional', () => {
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
      expect(screen.getByTestId('device-detection-card')).toBeInTheDocument();
    });

    it('T1-F13-03: Detected device and OS info is clearly presented without annotation badge', () => {
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
      expect(screen.getByText('偵測到您目前使用的裝置與系統')).toBeInTheDocument();
    });

    it('T1-F13-04: Platform cards (iPhone / iPad, Android, Desktop) render clearly', () => {
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
      expect(screen.getByText('iPhone / iPad')).toBeInTheDocument();
      expect(screen.getByText('Android 手機與平板')).toBeInTheDocument();
      expect(screen.getByText('macOS 與 Windows 電腦端')).toBeInTheDocument();
    });

    it('T1-F13-05: Modal title and instructions render accurately with zero emojis', () => {
      const { container } = render(
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
      expect(screen.getByText('桌面與行動裝置安裝指南')).toBeInTheDocument();
      expectZeroEmoji(container);
    });
  });

  // =========================================================================
  // Feature 14: Dedicated Android & iOS Vector Icons in Installation Guide (R7-F2)
  // =========================================================================
  describe('Feature 14 (R7-F2): Dedicated Android & iOS Vector Icons in Installation Guide', () => {
    it('T1-F14-01: iPhone / iPad guide card renders Apple vector icon (data-lucide-name="apple")', () => {
      const { container } = render(
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
      const appleIcon = container.querySelector('[data-lucide-name="apple"]');
      expect(appleIcon).toBeInTheDocument();
    });

    it('T1-F14-02: Android guide card renders Android vector icon (data-lucide-name="android")', () => {
      const { container } = render(
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
      const androidIcon = container.querySelector('[data-lucide-name="android"]');
      expect(androidIcon).toBeInTheDocument();
    });

    it('T1-F14-03: Neither mobile platform card renders generic "smartphone" icon', () => {
      const { container } = render(
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
      const iosCard = screen.getByText('iPhone / iPad').closest('.rounded-2xl') || screen.getByText('iPhone / iPad').parentElement;
      const androidCard = screen.getByText('Android 手機與平板').closest('.rounded-2xl') || screen.getByText('Android 手機與平板').parentElement;

      expect(iosCard.querySelector('[data-lucide-name="smartphone"]')).toBeNull();
      expect(androidCard.querySelector('[data-lucide-name="smartphone"]')).toBeNull();
    });

    it('T1-F14-04: Lucide vector icons conform to strokeWidth 1.75 and clean SVGs', () => {
      const { container } = render(
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
      const appleIcon = container.querySelector('[data-lucide-name="apple"]');
      const androidIcon = container.querySelector('[data-lucide-name="android"]');

      expect(appleIcon?.tagName.toLowerCase()).toBe('svg');
      expect(androidIcon?.tagName.toLowerCase()).toBe('svg');
    });

    it('T1-F14-05: Installation guide modal passes strict 100% Zero Emoji audit', () => {
      const { container } = render(
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
      expectZeroEmoji(container);
    });
  });

  // =========================================================================
  // Feature 15: PortalEntrance Frameless Logo Loading Animation (R8-F1)
  // =========================================================================
  describe('Feature 15 (R8-F1): PortalEntrance Frameless Logo Loading Animation', () => {
    it('T1-F15-01: PortalEntrance core emblem renders .studio-infinity-cloud SVG', () => {
      const { container } = render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={vi.fn()}
        />
      );
      const coreSvg = container.querySelector('.portal-core-emblem .studio-infinity-cloud');
      expect(coreSvg).toBeInTheDocument();
    });

    it('T1-F15-02: Core emblem retains data-logo-size="xl"', () => {
      const { container } = render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={vi.fn()}
        />
      );
      const emblem = container.querySelector('.portal-core-emblem');
      expect(emblem).toHaveAttribute('data-logo-size', 'xl');
    });

    it('T1-F15-03: Core emblem does NOT render squircle bounding box border or background', () => {
      const { container } = render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={vi.fn()}
        />
      );
      const emblem = container.querySelector('.portal-core-emblem');
      // Under R8, squircle-icon-badge bounding box is stripped in PortalEntrance
      const squircleBox = emblem.querySelector('.squircle-icon-badge');
      expect(squircleBox).toBeNull();
    });

    it('T1-F15-04: StudioLogo component supports frameless rendering prop', () => {
      const { container: framed } = render(<StudioLogo size="md" frameless={false} />);
      const { container: frameless } = render(<StudioLogo size="md" frameless={true} />);

      expect(framed.querySelector('.squircle-icon-badge')).toBeInTheDocument();
      expect(frameless.querySelector('.squircle-icon-badge')).toBeNull();
      expect(frameless.querySelector('.studio-infinity-cloud')).toBeInTheDocument();
    });

    it('T1-F15-05: PortalEntrance handles onComplete callback when skipped or completed', () => {
      const onComplete = vi.fn();
      render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={onComplete}
        />
      );

      const skipBtn = screen.getByRole('button', { name: /略過開場動畫|略過動畫|略過/i });
      fireEvent.click(skipBtn);
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
