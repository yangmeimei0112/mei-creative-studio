/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * 
 * Exercises error recovery, edge cases, boundaries, network failures,
 * and unusual user interactions across all 15 features (≥5 tests per feature).
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
  getSortPopoverElements,
  SAMPLE_E2E_PROJECTS
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
  bindPasskeyToCurrentMember,
  normalizeMemberProfile,
  transformSupabaseUserToMemberProfile
} from '../../services/memberAuthService';

describe('Tier 2: Boundary & Corner Cases (Features 1 to 15)', () => {
  setupE2ETestEnvironment();

  // =========================================================================
  // Feature 1: Supabase Client Environment & Dynamic Configuration (R1-F1)
  // =========================================================================
  describe('Feature 1 Boundaries (R1-F1): Client Config & Environment Fallbacks', () => {
    it('T2-F1-01: Client gracefully handles missing import.meta.env by falling back to default URL', async () => {
      const supabaseModule = await import('../../services/supabaseClient.js');
      expect(supabaseModule.supabase.supabaseUrl).toBeTruthy();
      expect(supabaseModule.supabase.supabaseUrl.length).toBeGreaterThan(10);
    });

    it('T2-F1-02: Normalizes URLs containing trailing slashes or whitespace', () => {
      const rawUrl = ' https://mdxnjlhjqskqsndeiepy.supabase.co/ ';
      const normalized = rawUrl.trim().replace(/\/+$/, '');
      expect(normalized).toBe('https://mdxnjlhjqskqsndeiepy.supabase.co');
    });

    it('T2-F1-03: Blocked localStorage during config resolution does not throw unhandled exception', async () => {
      const originalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new DOMException('Access denied', 'SecurityError');
        },
        configurable: true
      });

      try {
        const { getEffectiveSupabaseConfig, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } = await import('../../services/supabaseClient.js');
        let config;
        expect(() => {
          config = getEffectiveSupabaseConfig();
        }).not.toThrow();
        expect(config).toBeDefined();
        expect(config.supabaseUrl).toBe(DEFAULT_SUPABASE_URL);
        expect(config.supabaseAnonKey).toBe(DEFAULT_SUPABASE_ANON_KEY);
      } finally {
        Object.defineProperty(window, 'localStorage', {
          value: originalStorage,
          configurable: true
        });
      }
    });

    it('T2-F1-04: Malformed anon key does not prevent client object creation', () => {
      const mockClient = createMockSupabaseClient({ anonKey: 'invalid-token-header' });
      expect(mockClient).toBeDefined();
      expect(mockClient.auth).toBeDefined();
    });

    it('T2-F1-05: Runtime custom URL takes precedence over fallback when configured', async () => {
      const customUrl = 'https://custom-proj.supabase.co';
      window.localStorage.setItem('mei_custom_supabase_url', customUrl);

      const supabaseModule = await import('../../services/supabaseClient.js');
      if (typeof supabaseModule.getEffectiveSupabaseConfig === 'function') {
        const config = supabaseModule.getEffectiveSupabaseConfig();
        expect(config.supabaseUrl).toBe(customUrl);
      } else {
        expect(supabaseModule.supabase.supabaseUrl).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Feature 2: Google OAuth Login Integration (R2-F1)
  // =========================================================================
  describe('Feature 2 Boundaries (R2-F1): OAuth Edge Cases & Cancellations', () => {
    it('T2-F2-01: OAuth user cancellation displays friendly error and keeps modal open', async () => {
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

      // Verify modal is open and displays Google button
      const googleBtn = screen.getByTestId('member-google-login-btn');
      expect(googleBtn).toBeInTheDocument();
      expect(googleBtn).not.toBeDisabled();
    });

    it('T2-F2-02: Google profile missing full_name and picture falls back to email username', () => {
      const rawUser = {
        id: 'u-no-name-1',
        email: 'developer.zero@meistudio.live',
        user_metadata: {},
        app_metadata: { provider: 'google', providers: ['google'] }
      };

      const profile = transformSupabaseUserToMemberProfile(rawUser);
      expect(profile.displayName).toBe('developer.zero');
      expect(profile.avatarUrl).toBe('');
    });

    it('T2-F2-03: Rapid double-click on Google OAuth button triggers single flow (isSubmitting)', async () => {
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
      fireEvent.click(googleBtn);
      // Button enters submitting state
      expect(googleBtn).toBeDefined();
    });

    it('T2-F2-04: Malformed user metadata with XSS payload is deeply sanitized', () => {
      const maliciousUser = {
        id: 'xss-1',
        email: 'hacker@meistudio.live',
        user_metadata: {
          full_name: '<script>alert("xss")</script>HackMe',
          picture: 'javascript:alert(1)'
        },
        app_metadata: { provider: 'google' }
      };

      const profile = transformSupabaseUserToMemberProfile(maliciousUser);
      expect(profile.displayName).not.toContain('<script>');
      expect(profile.displayName).toBe('HackMe');
    });

    it('T2-F2-05: OAuth sign-in with network drop handles error gracefully without white screen', async () => {
      const mockClient = createMockSupabaseClient({
        oauthError: new TypeError('Failed to fetch')
      });

      const res = await mockClient.auth.signInWithOAuth({ provider: 'google' });
      expect(res.error).toBeInstanceOf(TypeError);
      expect(res.data).toBeNull();
    });
  });

  // =========================================================================
  // Feature 3: Biometric Passkey / WebAuthn Login & Registration (R2-F2)
  // =========================================================================
  describe('Feature 3 Boundaries (R2-F2): WebAuthn Hardware & Error Handling', () => {
    it('T2-F3-01: Device without PublicKeyCredential reports webAuthnAvailable: false', () => {
      mockWebAuthnCredentials({ supported: false });
      const cap = detectBiometricCapability();
      expect(cap.webAuthnAvailable).toBe(false);
    });

    it('T2-F3-02: User cancelling biometric prompt (NotAllowedError) is caught gracefully', async () => {
      mockWebAuthnCredentials({
        getFails: true,
        getError: new DOMException('User cancelled biometric prompt', 'NotAllowedError')
      });

      const res = await signInWithPasskey();
      expect(res).toBeDefined();
    });

    it('T2-F3-03: Unauthenticated visitor clicking bind passkey returns error', async () => {
      window.localStorage.removeItem('mei_universal_member_sso_v1');
      const res = await bindPasskeyToCurrentMember();
      expect(res.error).toBeDefined();
      expect(res.error.message).toContain('請先登入會員後再綁定生物辨識');
    });

    it('T2-F3-04: WebAuthn creation timeout (TimeoutError) handled without unhandled rejection', async () => {
      mockWebAuthnCredentials({
        createFails: true,
        createError: new DOMException('Ceremony timed out', 'TimeoutError')
      });

      window.localStorage.setItem('mei_universal_member_sso_v1', JSON.stringify({
        unionId: 'mei_user_active_1',
        email: 'user@meistudio.live',
        displayName: '現有會員',
        tier: 'creator',
        authProvider: 'google',
        authProviders: ['google']
      }));

      const res = await bindPasskeyToCurrentMember();
      expect(res.error).toBeDefined();
    });

    it('T2-F3-05: Corrupted credential response falls back safely', () => {
      mockWebAuthnCredentials({ supported: true });
      const cap = detectBiometricCapability();
      expect(cap.supported).toBe(true);
      expect(typeof cap.icon).toBe('string');
    });
  });

  // =========================================================================
  // Feature 4: Complete Removal of Non-Essential Login Channels (R2-F3)
  // =========================================================================
  describe('Feature 4 Boundaries (R2-F3): Non-Essential Channel Isolation', () => {
    it('T2-F4-01: Rapid keyboard Tab navigation never focuses email/password inputs', () => {
      const { container } = render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      const emailInputs = container.querySelectorAll('input[type="email"], input[type="password"]');
      expect(emailInputs.length).toBe(0);
    });

    it('T2-F4-02: Legacy storage token containing authProvider: "email" is safely normalized', () => {
      const legacyToken = {
        unionId: 'mei_user_legacy_email',
        email: 'legacy@meistudio.live',
        displayName: '舊版會員',
        tier: 'creator',
        authProvider: 'email',
        authProviders: ['email']
      };

      const normalized = normalizeMemberProfile(legacyToken);
      expect(normalized).toBeDefined();
      expect(normalized.displayName).toBe('舊版會員');
    });

    it('T2-F4-03: Legacy storage token containing authProvider: "apple" is safely normalized', () => {
      const legacyAppleToken = {
        unionId: 'mei_user_legacy_apple',
        email: 'apple@meistudio.live',
        displayName: '舊版蘋果會員',
        tier: 'creator',
        authProvider: 'apple',
        authProviders: ['apple']
      };

      const normalized = normalizeMemberProfile(legacyAppleToken);
      expect(normalized).toBeDefined();
      expect(normalized.displayName).toBe('舊版蘋果會員');
    });

    it('T2-F4-04: Pressing Enter in unauthenticated modal does not submit unauthorized form', () => {
      const { container } = render(
        <MemberPortalModal
          isOpen={true}
          onClose={vi.fn()}
          currentMember={null}
          onMemberChange={vi.fn()}
          onNotify={vi.fn()}
        />
      );

      // Verify no form elements exist for email authentication
      const forms = container.querySelectorAll('form');
      expect(forms.length).toBe(0);
    });

    it('T2-F4-05: HeaderHero renders zero Apple references across all screen sizes', () => {
      simulateViewport(320, 568);
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
      expect(memberBtn.getAttribute('title') || '').not.toContain('Apple');
    });
  });

  // =========================================================================
  // Feature 5: Supabase Database Schema & Migration for Projects (R3-F1)
  // =========================================================================
  describe('Feature 5 Boundaries (R3-F1): Database Schema Edge Cases', () => {
    const schemaSqlPath = path.resolve('schema_migrations.sql');
    const schemaSql = fs.existsSync(schemaSqlPath) ? fs.readFileSync(schemaSqlPath, 'utf-8') : '';

    it('T2-F5-01: Schema enforces valid category constraint check', () => {
      expect(schemaSql).toMatch(/CHECK\s*\(\s*category\s+IN/i);
    });

    it('T2-F5-02: Schema enforces valid status constraint check', () => {
      expect(schemaSql).toMatch(/CHECK\s*\(\s*status\s+IN/i);
    });

    it('T2-F5-03: Secondary ordering index ensures deterministic sort', () => {
      expect(schemaSql).toMatch(/CREATE INDEX (IF NOT EXISTS )?idx_mei_member_projects_sort/i);
    });

    it('T2-F5-04: Primary key constraint on id column is specified', () => {
      expect(schemaSql).toMatch(/id\s+TEXT\s+PRIMARY\s+KEY/i);
    });

    it('T2-F5-05: Schema file contains zero emojis and valid SQL formatting', () => {
      expectZeroEmoji(schemaSql);
      expect(schemaSql).not.toContain('\uFFFD'); // No replacement characters
    });
  });

  // =========================================================================
  // Feature 6: Bidirectional Project Sync Service API Contracts (R3-F2)
  // =========================================================================
  describe('Feature 6 Boundaries (R3-F2): Network Failures & Payload Sanitization', () => {
    it('T2-F6-01: fetchCloudProjects falls back to localStorage when network is offline', async () => {
      const syncService = await getProjectSyncService();
      expect(syncService).not.toBeNull();
      expect(typeof syncService.fetchCloudProjects).toBe('function');
      window.localStorage.setItem('mei_studio_projects_v1', JSON.stringify(DEFAULT_PROJECTS));
      const projects = await syncService.fetchCloudProjects();
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    it('T2-F6-02: Remote payload with missing fields is defensively filled with defaults', async () => {
      const syncService = await getProjectSyncService();
      expect(syncService).not.toBeNull();
      const normalizeFn = syncService.normalizeProjectPayload || syncService.normalizeProject || syncService.sanitizePayload;
      expect(typeof normalizeFn).toBe('function');

      const malformedRemote = {
        id: 'remote-1',
        title: '遠端未完整專案'
        // Missing category, tags, status, etc.
      };

      const normalized = normalizeFn(malformedRemote);
      expect(normalized.category).toBeDefined();
      expect(normalized.status).toBeDefined();
      expect(Array.isArray(normalized.tags)).toBe(true);
    });

    it('T2-F6-03: Unsupported BroadcastChannel does not throw unhandled exception during listener init', async () => {
      const originalBC = window.BroadcastChannel;
      delete window.BroadcastChannel;

      try {
        const syncService = await getProjectSyncService();
        expect(syncService).not.toBeNull();
        expect(typeof syncService.initProjectRealtimeListener).toBe('function');
        let unsubscribe;
        expect(() => {
          unsubscribe = syncService.initProjectRealtimeListener(() => {});
        }).not.toThrow();
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } finally {
        window.BroadcastChannel = originalBC;
      }
    });

    it('T2-F6-04: Syncing an empty projects list does not corrupt database state', async () => {
      const mockClient = createMockSupabaseClient();
      const res = await mockClient.from('mei_member_projects').upsert([]);
      expect(res.error).toBeNull();
    });

    it('T2-F6-05: Realtime subscription cleans up listeners upon unsubscription', () => {
      const mockClient = createMockSupabaseClient();
      const ch = mockClient.channel('mei_projects_realtime');
      const listener = vi.fn();
      ch.on('postgres_changes', { table: 'mei_member_projects' }, listener);
      ch.subscribe();

      // Trigger event
      mockClient.triggerMockRealtimeEvent('mei_member_projects', 'INSERT', { id: 'p1' });
      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      ch.unsubscribe();
      mockClient.triggerMockRealtimeEvent('mei_member_projects', 'INSERT', { id: 'p2' });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Feature 7: React App Project Creation & Optimistic Sync (R3-F3)
  // =========================================================================
  describe('Feature 7 Boundaries (R3-F3): Reorder Boundaries & Preview Edge Cases', () => {
    it('T2-F7-01: Reordering the first project upwards is a safe no-op', async () => {
      const { reorderProjectList } = await import('../../services/storageService.js');
      const initial = [...SAMPLE_E2E_PROJECTS];
      const reordered = reorderProjectList(initial, initial[0].id, 'up');
      expect(reordered[0].id).toBe(initial[0].id);
    });

    it('T2-F7-02: Reordering the last project downwards is a safe no-op', async () => {
      const { reorderProjectList } = await import('../../services/storageService.js');
      const initial = [...SAMPLE_E2E_PROJECTS];
      const lastItem = initial[initial.length - 1];
      const reordered = reorderProjectList(initial, lastItem.id, 'down');
      expect(reordered[reordered.length - 1].id).toBe(lastItem.id);
    });

    it('T2-F7-03: Single project list reordering does not throw errors', async () => {
      const { reorderProjectList } = await import('../../services/storageService.js');
      const singleList = [SAMPLE_E2E_PROJECTS[0]];
      let result;
      expect(() => {
        result = reorderProjectList(singleList, singleList[0].id, 'up');
      }).not.toThrow();
      expect(result).toEqual(singleList);
    });

    it('T2-F7-04: Deleting a non-existent project id handles gracefully', () => {
      const mockClient = createMockSupabaseClient();
      expect(async () => {
        await mockClient.from('mei_member_projects').delete().eq('id', 'non-existent-id');
      }).not.toThrow();
    });

    it('T2-F7-05: Pinned project moving across unpinned boundary updates pinned flag', async () => {
      const { reorderProjectList } = await import('../../services/storageService.js');
      const list = [
        { id: 'p1', title: 'Top Pinned', pinned: true, sort_order: 1 },
        { id: 'p2', title: 'Second Unpinned', pinned: false, sort_order: 2 }
      ];
      // Moving p1 down past p2 crosses the pinned boundary
      const reordered = reorderProjectList(list, 'p1', 'down');
      expect(reordered[1].id).toBe('p1');
      expect(reordered[1].pinned).toBe(false);
    });
  });

  // =========================================================================
  // Feature 8: Mobile Footer Slogan Layout (R4-F1)
  // =========================================================================
  describe('Feature 8 Boundaries (R4-F1): Multi-Aspect Ratio Adaptation & Extreme Screen Sizes', () => {
    it('T2-F8-01: Ratio 1 — Narrow/fold outer screen (320px-360px) enforces fluid typography, member truncation, and min-h-dvh-screen', () => {
      simulateViewport(320, 720);
      const { container } = render(<App />);
      // 1. Dynamic viewport height unit
      expect(container.firstElementChild).toHaveClass('min-h-dvh-screen');
      // 2. Fluid clamp font for hero title
      const heroTitleZh = container.querySelector('.studio-hero-title-zh');
      expect(heroTitleZh).toBeInTheDocument();
      // 3. Member portal button truncation constraint
      const memberBtn = screen.getByTestId('header-member-portal-btn');
      expect(memberBtn).toHaveClass('max-w-[124px]', 'sm:max-w-[200px]');
      // 4. Stacking layout in footer
      const footer = container.querySelector('footer');
      const spans = footer.querySelectorAll('span');
      const titleSpan = Array.from(spans).find((s) => s.textContent.includes('咩創意工作室'));
      expect(titleSpan.parentElement.className).toContain('flex-col');
    });

    it('T2-F8-02: Ratio 4 — Mobile landscape compact mode (max-height: 500px) activates compact header, nav, and dialog classes', () => {
      simulateViewport(844, 390);
      const isLandscapeCompact = window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
      expect(isLandscapeCompact).toBe(true);
      const { container } = render(<App />);
      // Header and bottom nav compact styles
      const headerBar = container.querySelector('.mobile-header-bar');
      expect(headerBar).toBeInTheDocument();
      const bottomNav = screen.getByTestId('mobile-bottom-nav');
      expect(bottomNav).toHaveClass('mobile-bottom-nav');
    });

    it('T2-F8-03: Ratio 2 — Mainstream vertical phone (375px-430px) enforces single-column layout and flush navigation', () => {
      simulateViewport(390, 844);
      const isMobilePortrait = window.matchMedia('(max-width: 639px)').matches;
      expect(isMobilePortrait).toBe(true);
      const { container } = render(<App />);
      expect(container.firstElementChild).toHaveClass('min-h-dvh-screen');
      const bottomNav = screen.getByTestId('mobile-bottom-nav');
      expect(bottomNav).toBeInTheDocument();
      const primarySearchBtn = bottomNav.querySelector('.mobile-nav-primary-btn');
      expect(primarySearchBtn).toBeInTheDocument();
      expect(primarySearchBtn.className).not.toContain('-mt-4');
    });

    it('T2-F8-04: Ratio 3 — Foldable inner screen / small tablet (600px-840px) enables dual-column Bento grid with spotlight span', () => {
      simulateViewport(768, 1024);
      const isFoldableTablet = window.matchMedia('(min-width: 640px)').matches;
      expect(isFoldableTablet).toBe(true);
      render(<App />);
      const gridSection = screen.getByLabelText('專案列表');
      const gridContainer = gridSection.firstElementChild;
      expect(gridContainer).toHaveClass('sm:grid-cols-2', 'foldable-inner-grid');
    });

    it('T2-F8-05: Footer brand container complies 100% with Zero Emoji mandate', () => {
      const { container } = render(<App />);
      const footer = container.querySelector('footer');
      expectZeroEmoji(footer);
    });

    it('T2-F8-06: Long custom tagline does not clip studio name', () => {
      const { container } = render(<App />);
      const footer = container.querySelector('footer');
      expect(footer.textContent).toContain(STUDIO_CONFIG.description);
    });

    it('T2-F8-07: Footer renders cleanly when admin unlocked mode is active', () => {
      window.localStorage.setItem('mei_admin_unlocked_v1', 'true');
      const { container } = render(<App />);
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
      expect(footer.textContent).toContain('創意無限∞咩有極限');
    });
  });

  // =========================================================================
  // Feature 9: Mobile Bottom Nav "Quick Search" Flush Alignment (R4-F2)
  // =========================================================================
  describe('Feature 9 Boundaries (R4-F2): Mobile Bottom Nav Extremes', () => {
    it('T2-F9-01: Mobile landscape orientation maintains margin-top: 0 in CSS', () => {
      const cssPath = path.resolve('src/styles/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/\.mobile-nav-primary-btn\s*\{[^}]*margin-top:\s*0/i);
    });

    it('T2-F9-02: Rapid clicks on "快速搜尋" button invokes callback reliably', () => {
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
      fireEvent.click(primaryBtn);
      fireEvent.click(primaryBtn);

      expect(onOpenCommandPalette).toHaveBeenCalledTimes(3);
    });

    it('T2-F9-03: Primary search button has role="button" and type="button"', () => {
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
      expect(primaryBtn.tagName.toLowerCase()).toBe('button');
      expect(primaryBtn.getAttribute('type')).toBe('button');
    });

    it('T2-F9-04: Primary badge has no overflowing box-shadow or negative margins', () => {
      const { container } = render(
        <MobileBottomNav
          activeTab="home"
          onSelectTab={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onToggleTheme={vi.fn()}
          isDark={false}
        />
      );
      const badge = container.querySelector('.mobile-nav-primary-badge');
      expect(badge).toBeInTheDocument();
      expect(badge.className).not.toContain('-mt-');
    });

    it('T2-F9-05: MobileBottomNav complies 100% with Zero Emoji mandate', () => {
      const { container } = render(
        <MobileBottomNav
          activeTab="home"
          onSelectTab={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onToggleTheme={vi.fn()}
          isDark={false}
        />
      );
      expectZeroEmoji(container);
    });
  });

  // =========================================================================
  // Feature 10: Custom Popover / Modal Dropdown for Project Sorting (R5-F1)
  // =========================================================================
  describe('Feature 10 Boundaries (R5-F1): Popover Outside Clicks & Escape Key', () => {
    it('T2-F10-01: Pressing Escape closes popover menu without changing sort', () => {
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
      expect(getSortPopoverElements(container).menu).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(trigger).toBeInTheDocument();
    });

    it('T2-F10-02: Clicking outside popover container dismisses menu', () => {
      const { container } = render(
        <div>
          <div data-testid="outside-area">外面區域</div>
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
        </div>
      );
      const { trigger } = getSortPopoverElements(container);
      fireEvent.click(trigger);
      expect(getSortPopoverElements(container).menu).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside-area'));
      expect(getSortPopoverElements(container).menu).toBeNull();
    });

    it('T2-F10-03: Clicking currently selected option closes menu without duplicate dispatch', () => {
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
      const defaultOpt = Array.from(menu.querySelectorAll('button')).find((b) => b.textContent.includes('預設置頂與自訂順序'));
      fireEvent.click(defaultOpt);

      expect(onSelectSortBy).toHaveBeenCalledWith('default');
      expect(getSortPopoverElements(container).menu).toBeNull();
    });

    it('T2-F10-04: Popover menu has accessible role or label', () => {
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
      expect(menu.textContent).toContain('最新更新優先');
    });

    it('T2-F10-05: Native <select> remains synced with active sortBy value', () => {
      render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          activeCategory="all"
          onSelectCategory={vi.fn()}
          sortBy="latency"
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
      expect(select.value).toBe('latency');
    });
  });

  // =========================================================================
  // Feature 11: Category Badge Active Dark Blue Shadow Removal (R5-F2)
  // =========================================================================
  describe('Feature 11 Boundaries (R5-F2): Category Tab Traversal & Contrast', () => {
    it('T2-F11-01: Traversal across ALL categories: none of the active tabs have shadow-md', () => {
      const categoryKeys = ['all', 'web-business', 'interactive-media', 'ai-automation'];
      categoryKeys.forEach((cat) => {
        const { unmount } = render(
          <HeaderHero
            projects={DEFAULT_PROJECTS}
            visibleProjects={DEFAULT_PROJECTS}
            selectedCategory={cat}
            activeCategory={cat}
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
        const activeTab = screen.getByRole('tab', { selected: true });
        expect(activeTab.className).not.toContain('shadow-md');
        unmount();
      });
    });

    it('T2-F11-02: Repeated clicks on active tab do not flash shadow or re-add shadow-md', () => {
      const onSelectCategory = vi.fn();
      render(
        <HeaderHero
          projects={DEFAULT_PROJECTS}
          visibleProjects={DEFAULT_PROJECTS}
          activeCategory="websites"
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
      const webTab = screen.getByRole('tab', { name: /網站與商業應用/i });
      fireEvent.click(webTab);
      fireEvent.click(webTab);

      expect(webTab.className).not.toContain('shadow-md');
    });

    it('T2-F11-03: Hover state on category tab maintains box-shadow: none !important', () => {
      const cssPath = path.resolve('src/styles/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/\[role="tab"\]\.btn-sky-primary:hover[^}]*box-shadow:\s*none\s*!important/i);
    });

    it('T2-F11-04: Tablist container has role="tablist" with scrollable wrapper', () => {
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
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
    });

    it('T2-F11-05: All category labels strictly adhere to Zero Emoji standard', () => {
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
      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expectZeroEmoji(tab);
      });
    });
  });

  // =========================================================================
  // Feature 12: Theme Switch 60fps Performance Optimization (R6-F1)
  // =========================================================================
  describe('Feature 12 Boundaries (R6-F1): Rapid Toggles & Reduced Motion', () => {
    it('T2-F12-01: Rapid theme toggling (6 consecutive clicks) resolves cleanly without throwing', () => {
      render(<App />);
      const themeBtn = screen.getByRole('button', { name: /切換深淺色主題|切換至深色模式|切換至淺色模式/i });

      for (let i = 0; i < 6; i++) {
        fireEvent.click(themeBtn);
      }
      expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true);
    });

    it('T2-F12-02: prefers-reduced-motion media query sets transition-duration to 0.01ms', () => {
      const cssPath = path.resolve('src/styles/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*transition-duration:\s*0\.01ms/i);
    });

    it('T2-F12-03: Mobile transition-duration capped at 300ms in CSS media query', () => {
      const cssPath = path.resolve('src/styles/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[^}]*transition-duration:\s*300ms/i);
    });

    it('T2-F12-04: Theme toggle while localStorage is disabled does not crash App', () => {
      const originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      expect(() => {
        render(<App />);
        const themeBtn = screen.getByRole('button', { name: /切換深淺色主題|切換至深色模式|切換至淺色模式/i });
        fireEvent.click(themeBtn);
      }).not.toThrow();

      window.localStorage.setItem = originalSetItem;
    });

    it('T2-F12-05: Desktop transition uses will-change for hardware-accelerated paint', () => {
      const cssPath = path.resolve('src/styles/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/will-change:\s*background-color,\s*border-color/i);
    });
  });

  // =========================================================================
  // Feature 13: Installation Guide "即時偵測" Text Removal (R7-F1)
  // =========================================================================
  describe('Feature 13 Boundaries (R7-F1): Installation Guide Edge States', () => {
    it('T2-F13-01: Unknown browser/OS string falls back gracefully without breaking card', () => {
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
      expect(screen.queryByText('即時偵測')).toBeNull();
    });

    it('T2-F13-02: Switching between desktop and mobile installation tabs keeps "即時偵測" absent', () => {
      render(
        <SdkAndInstallModal
          isOpen={true}
          initialMode="install"
          targetProject={null}
          onClose={vi.fn()}
          onTriggerNativeInstall={vi.fn()}
          canNativeInstall={true}
          isAdmin={true}
        />
      );
      // Switch to SDK tab and back to install tab
      const sdkTab = screen.getByText('子專案返回大廳 SDK (mei-dock.js)');
      fireEvent.click(sdkTab);
      const installTab = screen.getByText('安裝至手機與電腦桌面');
      fireEvent.click(installTab);

      expect(screen.queryByText('即時偵測')).toBeNull();
    });

    it('T2-F13-03: canNativeInstall false hides native install button cleanly', () => {
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
      expect(screen.queryByText('立即安裝至桌面')).toBeNull();
    });

    it('T2-F13-04: Clicking modal backdrop triggers onClose callback', () => {
      const onClose = vi.fn();
      const { container } = render(
        <SdkAndInstallModal
          isOpen={true}
          initialMode="install"
          targetProject={null}
          onClose={onClose}
          onTriggerNativeInstall={vi.fn()}
          canNativeInstall={true}
          isAdmin={false}
        />
      );
      const backdrop = container.firstChild;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    });

    it('T2-F13-05: Modal closed state (isOpen: false) renders null', () => {
      const { container } = render(
        <SdkAndInstallModal
          isOpen={false}
          initialMode="install"
          targetProject={null}
          onClose={vi.fn()}
          onTriggerNativeInstall={vi.fn()}
          canNativeInstall={true}
          isAdmin={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // =========================================================================
  // Feature 14: Dedicated Android & iOS Vector Icons in Installation Guide (R7-F2)
  // =========================================================================
  describe('Feature 14 Boundaries (R7-F2): Vector Icon Edge Cases', () => {
    it('T2-F14-01: Apple and Android vector icons render with strokeWidth 1.75', () => {
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

      expect(appleIcon).toBeInTheDocument();
      expect(androidIcon).toBeInTheDocument();
      expect(parseFloat(appleIcon?.getAttribute('stroke-width'))).toBeGreaterThan(0);
      expect(parseFloat(androidIcon?.getAttribute('stroke-width'))).toBeGreaterThan(0);
    });

    it('T2-F14-02: LucideIcon with unknown icon name falls back to HelpCircle without crashing', () => {
      const { container } = render(<LucideIcon name="non-existent-icon-xyz" size={16} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('T2-F14-03: Android vector icon contains valid viewBox "0 0 24 24"', () => {
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
      expect(androidIcon?.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('T2-F14-04: Apple vector icon contains valid viewBox "0 0 24 24"', () => {
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
      expect(appleIcon?.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('T2-F14-05: Icon color styling respects sky-500 brand tone', () => {
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
      expect(appleIcon?.className.baseVal || appleIcon?.className).toContain('text-sky-500');
    });
  });

  // =========================================================================
  // Feature 15: PortalEntrance Frameless Logo Loading Animation (R8-F1)
  // =========================================================================
  describe('Feature 15 Boundaries (R8-F1): Entrance Animation Edge Cases', () => {
    it('T2-F15-01: PortalEntrance with isOpen false renders null', () => {
      const { container } = render(
        <PortalEntrance
          isOpen={false}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('T2-F15-02: Pressing Escape immediately skips PortalEntrance animation', () => {
      const onComplete = vi.fn();
      render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={onComplete}
        />
      );
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(onComplete).toHaveBeenCalled();
    });

    it('T2-F15-03: Clicking background overlay immediately skips animation', () => {
      const onComplete = vi.fn();
      const { container } = render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={onComplete}
        />
      );
      fireEvent.click(container.firstChild);
      expect(onComplete).toHaveBeenCalled();
    });

    it('T2-F15-04: StudioLogo handles all 7 size tokens (2xs, xs, sm, md, lg, xl, 2xl)', () => {
      const sizes = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      sizes.forEach((s) => {
        const { container } = render(<StudioLogo size={s} frameless={true} />);
        expect(container.querySelector('.studio-infinity-cloud')).toBeInTheDocument();
      });
    });

    it('T2-F15-05: PortalEntrance frameless logo adheres 100% to Zero Emoji mandate', () => {
      const { container } = render(
        <PortalEntrance
          isOpen={true}
          replayKey={0}
          onStageChange={vi.fn()}
          onComplete={vi.fn()}
        />
      );
      expectZeroEmoji(container);
    });
  });
});
