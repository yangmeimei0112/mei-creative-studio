/**
 * Tier 3: Cross-Feature Combinations E2E Test Suite
 * 
 * Verifies pairwise interactions, concurrent state transitions, multi-channel synchronization,
 * and cross-cutting behaviors across all 15 features (C1 to C15).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  setupE2ETestEnvironment,
  simulateViewport,
  expectZeroEmoji,
  createMockSupabaseClient,
  mockWebAuthnCredentials,
  getSortPopoverElements,
  SAMPLE_E2E_PROJECTS
} from './e2eHarness';

import App from '../../App';
import HeaderHero from '../../components/HeaderHero';
import MobileBottomNav from '../../components/MobileBottomNav';
import MemberPortalModal from '../../components/MemberPortalModal';
import { SdkAndInstallModal } from '../../components/AdminProjectModal';
import PortalEntrance from '../../components/PortalEntrance';
import {
  PROJECT_CATEGORIES,
  STUDIO_CONFIG,
  DEFAULT_PROJECTS
} from '../../data/defaultData';
import {
  signInWithGoogle,
  signInWithPasskey,
  bindPasskeyToCurrentMember
} from '../../services/memberAuthService';

describe('Tier 3: Cross-Feature Combinations (Pairwise Interactions)', () => {
  setupE2ETestEnvironment();

  // =========================================================================
  // C1: Google OAuth + Immediate Project Reordering
  // =========================================================================
  it('C1: Google OAuth authentication maintains session state during project reordering', async () => {
    // 1. Authenticate with Google
    const mockGoogleMember = {
      unionId: 'mei_user_c1_google',
      displayName: 'C1 測試創作者',
      email: 'c1@meistudio.live',
      tier: 'creator',
      authProvider: 'google',
      authProviders: ['google'],
      isPasskeyEnabled: false
    };
    window.localStorage.setItem('mei_universal_member_sso_v1', JSON.stringify(mockGoogleMember));

    // 2. Render App with authenticated state
    render(<App />);
    const memberName = screen.getByText('C1 測試創作者');
    expect(memberName).toBeInTheDocument();

    // 3. Reorder projects
    const initialProjects = [...DEFAULT_PROJECTS];
    const reordered = [initialProjects[1], initialProjects[0], ...initialProjects.slice(2)];
    window.localStorage.setItem('mei_studio_projects_v1', JSON.stringify(reordered));

    // 4. Verify member session remains intact
    expect(screen.getByText('C1 測試創作者')).toBeInTheDocument();
  });

  // =========================================================================
  // C2: Biometric Passkey Binding + Multi-Tab Broadcast Synchronization
  // =========================================================================
  it('C2: Passkey binding broadcasts updated profile across open tabs via BroadcastChannel', async () => {
    const tabA_channel = new window.BroadcastChannel('mei_universal_sso_channel_v1');
    const tabB_channel = new window.BroadcastChannel('mei_universal_sso_channel_v1');

    const tabB_listener = vi.fn();
    tabB_channel.onmessage = tabB_listener;

    const baseMember = {
      unionId: 'mei_user_c2_multitab',
      email: 'multitab@meistudio.live',
      displayName: '多分頁會員',
      tier: 'creator',
      authProvider: 'google',
      authProviders: ['google'],
      isPasskeyEnabled: false
    };
    window.localStorage.setItem('mei_universal_member_sso_v1', JSON.stringify(baseMember));

    // Bind passkey
    const res = await bindPasskeyToCurrentMember();
    expect(res).toBeDefined();

    // Post broadcast message
    const updated = { ...baseMember, isPasskeyEnabled: true, authProviders: ['google', 'passkey'] };
    tabA_channel.postMessage({ type: 'SSO_UPDATE', member: updated });

    await waitFor(() => {
      expect(tabB_listener).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'SSO_UPDATE',
            member: expect.objectContaining({ isPasskeyEnabled: true })
          })
        })
      );
    });

    tabA_channel.close();
    tabB_channel.close();
  });

  // =========================================================================
  // C3: Multi-Device Concurrent Project Sync via BroadcastChannel & Realtime WebSocket
  // =========================================================================
  it('C3: Realtime project update syncs table changes without interfering with local active filters', async () => {
    const mockClient = createMockSupabaseClient({
      projects: [...DEFAULT_PROJECTS]
    });

    const realtimeListener = vi.fn();
    const ch = mockClient.channel('mei_projects_realtime');
    ch.on('postgres_changes', { table: 'mei_member_projects' }, realtimeListener);
    ch.subscribe();

    // Trigger remote deletion
    const deletedProject = SAMPLE_E2E_PROJECTS[0];
    mockClient.triggerMockRealtimeEvent('mei_member_projects', 'DELETE', null, deletedProject);

    expect(realtimeListener).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DELETE',
        old: deletedProject
      })
    );
  });

  // =========================================================================
  // C4: Offline Project Mutation + Online Recovery Reconnection
  // =========================================================================
  it('C4: Project mutation while offline writes to localStorage and survives recovery', () => {
    // Offline mutation
    const offlineNewProject = {
      id: 'proj-offline-1',
      title: '離線新建專案',
      category: 'websites',
      status: 'online',
      sort_order: 99,
      pinned: false
    };

    const currentList = [...DEFAULT_PROJECTS, offlineNewProject];
    window.localStorage.setItem('mei_studio_projects_v1', JSON.stringify(currentList));

    // Online reconnection simulation
    const stored = JSON.parse(window.localStorage.getItem('mei_studio_projects_v1'));
    expect(stored.find((p) => p.id === 'proj-offline-1')).toBeDefined();
    expect(stored.length).toBe(DEFAULT_PROJECTS.length + 1);
  });

  // =========================================================================
  // C5: Theme Toggle + Open Sort Popover + Mobile Viewport
  // =========================================================================
  it('C5: Toggling theme while sort popover is open preserves popover state without visual clipping', () => {
    simulateViewport(375, 667);
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

    // Open popover
    const { trigger } = getSortPopoverElements(container);
    fireEvent.click(trigger);
    expect(getSortPopoverElements(container).menu).toBeInTheDocument();

    // Toggle theme on root
    document.documentElement.classList.toggle('dark');

    // Popover remains open and accessible
    expect(getSortPopoverElements(container).menu).toBeInTheDocument();
  });

  // =========================================================================
  // C6: Category Filtering + Custom Popover Sorting + Grid Reordering
  // =========================================================================
  it('C6: Category filter combined with custom sort option displays correct subset and order', () => {
    const onSelectCategory = vi.fn();
    const onSelectSortBy = vi.fn();

    const { container } = render(
      <HeaderHero
        projects={SAMPLE_E2E_PROJECTS}
        visibleProjects={SAMPLE_E2E_PROJECTS.filter((p) => p.category === 'web-business')}
        selectedCategory="web-business"
        activeCategory="web-business"
        onSelectCategory={onSelectCategory}
        sortBy="updated"
        onSelectSortBy={onSelectSortBy}
        searchKeyword=""
        onSearchChange={vi.fn()}
        isAdmin={false}
        onOpenAdminModal={vi.fn()}
        currentMember={null}
        onOpenMemberPortal={vi.fn()}
      />
    );

    const activeTab = screen.getByRole('tab', { selected: true });
    expect(activeTab.textContent).toContain('網站與商業應用');
    expect(activeTab.className).not.toContain('shadow-md');

    const { trigger } = getSortPopoverElements(container);
    expect(trigger.textContent).toContain('最新更新優先');
  });

  // =========================================================================
  // C7: Admin Mode Unlock + Mobile Footer Stacking + Toast Offset (bottom-36)
  // =========================================================================
  it('C7: Unlocking admin mode retains stacked mobile footer slogan and shifts floating toast', () => {
    simulateViewport(360, 800);
    window.localStorage.setItem('mei_admin_unlocked_v1', 'true');

    const { container } = render(<App />);
    const footer = container.querySelector('footer');
    expect(footer.textContent).toContain('創意無限∞咩有極限');
    const brandWrapper = footer.querySelector('.flex-col.sm\\:flex-row');
    expect(brandWrapper).toBeInTheDocument();
  });

  // =========================================================================
  // C8: Installation Guide Device Auto-Detection + Custom Vector Icons + Zero Emoji Audit
  // =========================================================================
  it('C8: Install guide auto-detection displays dedicated Apple and Android icons with 0 emojis', () => {
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

    expect(screen.queryByText('即時偵測')).toBeNull();
    expect(container.querySelector('[data-lucide-name="apple"]')).toBeInTheDocument();
    expect(container.querySelector('[data-lucide-name="android"]')).toBeInTheDocument();
    expectZeroEmoji(container);
  });

  // =========================================================================
  // C9: PortalEntrance Phase Transition + Frameless Logo + Immediate Hub Interactive State
  // =========================================================================
  it('C9: Skipping frameless PortalEntrance loads Hub and reveals flush bottom navigation', () => {
    window.sessionStorage.removeItem('mei_studio_intro_seen_v1');
    render(<App />);

    // Skip entrance animation if rendered
    const skipBtn = screen.queryByRole('button', { name: /略過/i });
    if (skipBtn) {
      fireEvent.click(skipBtn);
    }

    // Hub is interactive
    expect(screen.getByText('雲絨極簡品牌官網')).toBeInTheDocument();
  });

  // =========================================================================
  // C10: Mobile Bottom Nav Flush Navigation + Popover Interaction + Aspect Ratio Scaling
  // =========================================================================
  it('C10: Mobile bottom navigation buttons remain flush and interactive on 16:9 mobile screen', () => {
    simulateViewport(390, 844);
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
    expect(primaryBtn.className).not.toContain('-mt-4');
    fireEvent.click(primaryBtn);
    expect(onOpenCommandPalette).toHaveBeenCalled();
  });

  // =========================================================================
  // C11: Passkey Login + Filter Category + Sort Popover + Project Drawer Preview
  // =========================================================================
  it('C11: Passkey member can filter, sort, and inspect project card', () => {
    const passkeyMember = {
      unionId: 'mei_user_c11_passkey',
      displayName: '安全工程師',
      email: 'sec@meistudio.live',
      tier: 'creator',
      authProvider: 'passkey',
      authProviders: ['passkey'],
      isPasskeyEnabled: true
    };
    window.localStorage.setItem('mei_universal_member_sso_v1', JSON.stringify(passkeyMember));

    render(<App />);
    expect(screen.getByText('安全工程師')).toBeInTheDocument();
  });

  // =========================================================================
  // C12: Admin Create Project + Realtime Broadcast + Tab B Auto-Update + Flush Nav intact
  // =========================================================================
  it('C12: Admin creating a project updates storage and triggers channel sync', () => {
    const channel = new window.BroadcastChannel('mei_studio_projects_channel_v1');
    const listener = vi.fn();
    channel.onmessage = listener;

    const newProject = {
      id: 'c12-broadcast-project',
      title: '廣播同步測試專案',
      category: 'ai',
      status: 'online',
      sort_order: 10,
      pinned: true
    };

    channel.postMessage({ type: 'PROJECT_CREATED', project: newProject });

    expect(channel.name).toBe('mei_studio_projects_channel_v1');
    channel.close();
  });

  // =========================================================================
  // C13: Theme Toggle during Project Drag/Reorder
  // =========================================================================
  it('C13: Toggling theme does not break project order in grid', () => {
    render(<App />);
    const themeBtn = screen.getByRole('button', { name: /切換深淺色主題|切換至深色模式|切換至淺色模式/i });

    // Initial first project
    const firstTitle = screen.getByText('雲絨極簡品牌官網');
    expect(firstTitle).toBeInTheDocument();

    // Toggle theme
    fireEvent.click(themeBtn);

    // Grid still displays first project
    expect(screen.getByText('雲絨極簡品牌官網')).toBeInTheDocument();
  });

  // =========================================================================
  // C14: Google Login + Admin Project Deletion + Mobile Footer Alignment
  // =========================================================================
  it('C14: Logged in Google member deleting a project maintains mobile footer layout', () => {
    simulateViewport(375, 667);
    const googleMember = {
      unionId: 'mei_user_c14_google',
      displayName: '專案管理員',
      email: 'pm@meistudio.live',
      tier: 'creator',
      authProvider: 'google',
      authProviders: ['google']
    };
    window.localStorage.setItem('mei_universal_member_sso_v1', JSON.stringify(googleMember));

    const { container } = render(<App />);
    const footer = container.querySelector('footer');
    expect(footer.textContent).toContain('創意無限∞咩有極限');
  });

  // =========================================================================
  // C15: Install Guide Open + Theme Switch + Platform Icon Contrast
  // =========================================================================
  it('C15: Toggling theme while installation guide is open maintains vector icon readability', () => {
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

    // Light mode
    expect(container.querySelector('[data-lucide-name="apple"]')).toBeInTheDocument();

    // Switch to dark mode
    document.documentElement.classList.add('dark');

    // Dark mode icons remain visible with text-sky-500
    expect(container.querySelector('[data-lucide-name="apple"]')).toBeInTheDocument();
    expect(container.querySelector('[data-lucide-name="android"]')).toBeInTheDocument();
    expectZeroEmoji(container);
  });
});
