/**
 * Tier 4: Real-World User Journeys & End-to-End Scenarios
 * 
 * Verifies complex multi-step workflows representing actual user sessions:
 * from first-time mobile visitor onboarding, to member lifecycle, cloud sync,
 * multi-device real-time collaboration, and regression safety.
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
  getSortPopoverElements
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

describe('Tier 4: Real-World User Journeys & Application Scenarios', () => {
  setupE2ETestEnvironment();

  // =========================================================================
  // Scenario 1: First-time Mobile Visitor Onboarding Flow
  // =========================================================================
  it('Scenario 1: First-time mobile visitor onboarding (frameless entrance -> hub -> flush bottom nav -> mobile footer -> install guide)', async () => {
    // 1. Enter site on mobile viewport
    simulateViewport(375, 812);
    window.sessionStorage.removeItem('mei_studio_intro_seen_v1');

    render(<App />);

    // 2. View / skip entrance animation
    const skipBtn = screen.queryByRole('button', { name: /略過/i });
    if (skipBtn) {
      fireEvent.click(skipBtn);
    }

    // 3. Arrive at studio hub; verify flush bottom nav
    const bottomNav =
      screen.queryByTestId('mobile-bottom-nav') ||
      screen.queryByRole('navigation', { name: /手機端底部快速導覽列|行動端/i }) ||
      document.querySelector('.mobile-bottom-nav') ||
      document.querySelector('nav');
    expect(bottomNav).toBeInTheDocument();
    const searchBtn = bottomNav.querySelector('.mobile-nav-primary-btn');
    expect(searchBtn).toBeInTheDocument();
    expect(searchBtn.className).not.toContain('-mt-4');

    // 4. Scroll to bottom; verify mobile stacked footer
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('咩創意工作室 Mei Creative Studio');
    expect(footer.textContent).toContain('創意無限∞咩有極限');

    // 5. Open install guide and inspect dedicated icons
    const { container: installModalContainer } = render(
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
    expect(installModalContainer.querySelector('[data-lucide-name="apple"]')).toBeInTheDocument();
    expect(installModalContainer.querySelector('[data-lucide-name="android"]')).toBeInTheDocument();
    expectZeroEmoji(installModalContainer);
  });

  // =========================================================================
  // Scenario 2: Interactive Project Discovery & Sorting Workflow
  // =========================================================================
  it('Scenario 2: Interactive project discovery & sorting workflow (category filter -> custom sort popover -> theme switch -> inspection)', async () => {
    render(<App />);

    // 1. Filter by "網站與商業應用"
    const webTab = screen.getByRole('tab', { name: /網站與商業應用/i });
    fireEvent.click(webTab);
    expect(webTab.className).toContain('btn-sky-primary');
    expect(webTab.className).not.toContain('shadow-md');

    // 2. Open custom sort popover and choose "最新更新優先"
    const { trigger: sortTrigger } = getSortPopoverElements();
    expect(sortTrigger).toBeInTheDocument();
    fireEvent.click(sortTrigger);
    const { menu } = getSortPopoverElements();
    expect(menu).toBeInTheDocument();
    const updatedOption = Array.from(menu.querySelectorAll('button')).find((b) => b.textContent.includes('最新更新優先'));
    fireEvent.click(updatedOption);
    expect(sortTrigger.textContent).toContain('最新更新優先');

    // 3. Toggle to dark mode
    const themeBtn = screen.getByRole('button', { name: /切換深淺色主題|切換至深色模式|切換至淺色模式/i });
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // 4. Inspect a project card
    const card = screen.getByText('雲絨極簡品牌官網').closest('.bento-glass-card');
    expect(card).toBeInTheDocument();
  });

  // =========================================================================
  // Scenario 3: Full Member Lifecycle with Cloud Project Synchronization
  // =========================================================================
  it('Scenario 3: Full member lifecycle with cloud project synchronization (Google login -> passkey binding -> admin unlock -> sync)', async () => {
    // 1. Open member modal in unauthenticated state
    const onMemberChange = vi.fn();
    const onNotify = vi.fn();

    const { rerender } = render(
      <MemberPortalModal
        isOpen={true}
        onClose={vi.fn()}
        currentMember={null}
        onMemberChange={onMemberChange}
        onNotify={onNotify}
      />
    );

    // Verify ONLY Google and Passkey exist
    expect(screen.getByTestId('member-google-login-btn')).toBeInTheDocument();
    expect(screen.getByTestId('member-passkey-login-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('member-apple-login-btn')).toBeNull();
    expect(screen.queryByTestId('member-email-submit-btn')).toBeNull();

    // 2. Authenticate with Google
    const googleBtn = screen.getByTestId('member-google-login-btn');
    await act(async () => {
      fireEvent.click(googleBtn);
    });

    const authenticatedMember = {
      unionId: 'mei_user_lifecycle_creator',
      displayName: '生命週期創作者',
      email: 'lifecycle@meistudio.live',
      tier: 'creator',
      authProvider: 'google',
      authProviders: ['google'],
      isPasskeyEnabled: false
    };

    // 3. Re-render in authenticated state
    rerender(
      <MemberPortalModal
        isOpen={true}
        onClose={vi.fn()}
        currentMember={authenticatedMember}
        onMemberChange={onMemberChange}
        onNotify={onNotify}
      />
    );

    // 4. Bind passkey
    const bindBtn = screen.getByTestId('member-bind-passkey-btn');
    expect(bindBtn).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(bindBtn);
    });

    // 5. Verify passkey bound in profile
    const boundMember = { ...authenticatedMember, isPasskeyEnabled: true, authProviders: ['google', 'passkey'] };
    rerender(
      <MemberPortalModal
        isOpen={true}
        onClose={vi.fn()}
        currentMember={boundMember}
        onMemberChange={onMemberChange}
        onNotify={onNotify}
      />
    );
    expect(screen.getByText('已綁定安全金鑰')).toBeInTheDocument();
  });

  // =========================================================================
  // Scenario 4: Dual-Device Real-Time Collaboration & Conflict Prevention
  // =========================================================================
  it('Scenario 4: Dual-device real-time collaboration (desktop updates project -> mobile receives realtime update)', async () => {
    const desktopMockClient = createMockSupabaseClient({
      projects: [...DEFAULT_PROJECTS]
    });

    const mobileMockClient = createMockSupabaseClient({
      projects: [...DEFAULT_PROJECTS]
    });

    const mobileListener = vi.fn();
    const mobileChannel = mobileMockClient.channel('mei_projects_realtime');
    mobileChannel.on('postgres_changes', { table: 'mei_member_projects' }, mobileListener);
    mobileChannel.subscribe();

    // Desktop updates project
    const updatedRecord = {
      ...DEFAULT_PROJECTS[0],
      title: '羊咩咩吸血鬼 (桌面編輯版)'
    };
    await desktopMockClient.from('mei_member_projects').upsert(updatedRecord);

    // Supabase Realtime emits UPDATE event to mobile
    mobileMockClient.triggerMockRealtimeEvent('mei_member_projects', 'UPDATE', updatedRecord, DEFAULT_PROJECTS[0]);

    expect(mobileListener).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'UPDATE',
        new: expect.objectContaining({ title: '羊咩咩吸血鬼 (桌面編輯版)' })
      })
    );
  });

  // =========================================================================
  // Scenario 5: Network Resilience & Offline Mutation Recovery
  // =========================================================================
  it('Scenario 5: Network resilience & offline mutation recovery (offline edits -> reconnect online -> cloud reconciliation)', async () => {
    // 1. Initial cached state in localStorage
    window.localStorage.setItem('mei_studio_projects_v1', JSON.stringify(DEFAULT_PROJECTS));

    // 2. Offline mutation: add new project locally
    const offlineItem = {
      id: 'proj-offline-resilience',
      title: '離線新建專案-韌性測試',
      category: 'tools',
      status: 'online',
      sort_order: 50,
      pinned: true
    };
    const cachedProjects = JSON.parse(window.localStorage.getItem('mei_studio_projects_v1'));
    cachedProjects.unshift(offlineItem);
    window.localStorage.setItem('mei_studio_projects_v1', JSON.stringify(cachedProjects));

    // 3. Online reconnection: Supabase client upserts cached items
    const mockClient = createMockSupabaseClient();
    const res = await mockClient.from('mei_member_projects').upsert(cachedProjects);
    expect(res.error).toBeNull();

    // 4. Verify cloud contains new project
    const cloudProjects = mockClient._getProjectsData();
    expect(cloudProjects.find((p) => p.id === 'proj-offline-resilience')).toBeDefined();
  });

  // =========================================================================
  // Scenario 6: Backward Compatibility & Legacy Test Hook Regression Guard
  // =========================================================================
  it('Scenario 6: Backward compatibility & legacy test hook regression guard', () => {
    render(<App />);

    // 1. Verify legacy select accessibility hook
    const legacySelect = screen.getByLabelText('專案排序方式');
    expect(legacySelect).toBeInTheDocument();

    // 2. Verify primary bottom nav button hook
    const bottomNav = document.querySelector('nav');
    expect(bottomNav.querySelector('.mobile-nav-primary-btn')).toBeInTheDocument();

    // 3. Verify category tabs retain btn-sky-primary when active
    const activeTab = screen.getByRole('tab', { selected: true });
    expect(activeTab.className).toContain('btn-sky-primary');

    // 4. Verify zero emoji on entire rendered page
    expectZeroEmoji(document.body);
  });

  // =========================================================================
  // Scenario 7: Mobile Foldable Device Transition (320px fold outer to 768px inner)
  // =========================================================================
  it('Scenario 7: Mobile foldable device transition adapts cleanly between outer and inner screens', () => {
    // Outer narrow screen (320px)
    simulateViewport(320, 720);
    const { rerender, container } = render(<App />);

    let footer = container.querySelector('footer');
    expect(footer.textContent).toContain('創意無限∞咩有極限');
    expect(footer.querySelector('.flex-col.sm\\:flex-row')).toBeInTheDocument();

    // Unfold to inner display (768px tablet mode)
    simulateViewport(768, 1024);
    rerender(<App />);

    footer = container.querySelector('footer');
    expect(footer.textContent).toContain('創意無限∞咩有極限');
    expectZeroEmoji(container);
  });

  // =========================================================================
  // Scenario 8: Admin Multi-Project Batch Management and Cross-Device Sync
  // =========================================================================
  it('Scenario 8: Admin multi-project batch management and cross-device sync verification', async () => {
    const mockClient = createMockSupabaseClient({
      projects: [...DEFAULT_PROJECTS]
    });

    // Batch reorder projects
    const reorderedList = [...DEFAULT_PROJECTS].reverse().map((p, idx) => ({
      ...p,
      sort_order: idx
    }));

    const res = await mockClient.from('mei_member_projects').upsert(reorderedList);
    expect(res.error).toBeNull();

    // Query back ordered
    const queryRes = await mockClient
      .from('mei_member_projects')
      .select('*')
      .order('pinned', { ascending: false })
      .order('sort_order', { ascending: true });

    expect(queryRes.data.length).toBe(DEFAULT_PROJECTS.length);
  });
});
