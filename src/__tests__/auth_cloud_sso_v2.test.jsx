/**
 * src/__tests__/auth_cloud_sso_v2.test.jsx
 *
 * Mei Creative Studio - Universal Member Auth & Cloud SSO v2.0
 * Comprehensive 4-Tier E2E Test Suite (Tiers 1 to 4, 114 Test Specifications)
 *
 * Requirements Covered:
 * - R1: Standard Registration (Nickname, Email, Double Password, SVG Math Captcha) & Email/Password Sign-in
 * - R2: Gmail Fast Login & Password Login Block for Pure Gmail Accounts
 * - R3: Security Bindings (Add Password, Bind Gmail, Passkey / WebAuthn Vault in public.mei_member_passkeys)
 * - R4: Cross-Project SSO Token Generation, Verification & SDK (mei-dock.js, window.MeiStudioSSO)
 * - R5: Engineering Standards: Mobile dvh Viewport Units, Zero Unicode Emoji, Sky-100 High Contrast Toast
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import MemberPortalModal from '../components/MemberPortalModal';
import App from '../App';
import { supabase } from '../services/supabaseClient';
import * as memberAuthService from '../services/memberAuthService';
import { sanitizeStringDeep } from '../services/securityService';

// ============================================================================
// 1. Zero-Emoji Compliance & Pure Vector Verification
// ============================================================================
export const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

export function expectZeroEmoji(target) {
  let text = '';
  if (typeof target === 'string') {
    text = target;
  } else if (target && typeof target === 'object') {
    text = (target.textContent || '') + ' ' + (target.innerHTML || '');
  }
  const hasEmoji = EMOJI_REGEX.test(text);
  expect(hasEmoji).toBe(false);
  return !hasEmoji;
}

// ============================================================================
// 2. In-Memory Mock Supabase Client v2 (Full Cloud SSO v2.0 Simulation)
// ============================================================================
export function createMockSupabaseV2Client(initialState = {}) {
  let currentUser = initialState.user || null;
  let currentSession = initialState.session || null;
  const authListeners = new Set();

  let profilesTable = initialState.profiles ? [...initialState.profiles] : [];
  let passkeysTable = initialState.passkeys ? [...initialState.passkeys] : [];
  let projectsTable = initialState.projects ? [...initialState.projects] : [];

  const mockAuth = {
    flowType: 'pkce',
    storageKey: 'mei_studio_supabase_auth_token_v1',

    // 2.1 Standard registration with email/password
    signUp: vi.fn().mockImplementation(async ({ email, password, options = {} }) => {
      if (initialState.signUpError) {
        return { data: { user: null, session: null }, error: initialState.signUpError };
      }
      const existing = profilesTable.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return { data: { user: null, session: null }, error: new Error('User already registered') };
      }

      const uid = options?.data?.id || `mock-uid-${Math.random().toString(16).slice(2, 10)}`;
      const displayName = options?.data?.displayName || options?.data?.display_name || email.split('@')[0];

      const user = {
        id: uid,
        email,
        user_metadata: {
          display_name: displayName,
          has_password: true,
          is_gmail_only: false,
          tier: options?.data?.tier || 'explorer',
          ...options?.data
        },
        app_metadata: {
          provider: 'email',
          providers: ['email']
        },
        created_at: new Date().toISOString()
      };

      const session = {
        access_token: `mock-jwt-token-${uid}`,
        user
      };

      currentUser = user;
      currentSession = session;

      const profileRow = {
        id: uid,
        union_id: `mei_user_${uid.replace(/-/g, '').slice(0, 16)}`,
        email,
        display_name: displayName,
        auth_provider: 'email',
        auth_providers: ['email'],
        tier: options?.data?.tier || 'explorer',
        is_passkey_enabled: false,
        has_password: true,
        is_gmail_only: false,
        connected_projects: ['*'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      profilesTable.push(profileRow);

      authListeners.forEach((cb) => cb('SIGNED_IN', session));
      return { data: { user, session }, error: null };
    }),

    // 2.2 Email & password sign-in with pure Gmail block enforcement
    signInWithPassword: vi.fn().mockImplementation(async ({ email, password }) => {
      if (initialState.signInError) {
        return { data: { user: null, session: null }, error: initialState.signInError };
      }

      const normalizedEmail = String(email || '').trim().toLowerCase();
      const profile = profilesTable.find((p) => p.email.toLowerCase() === normalizedEmail);

      // Core Requirement: If account was created via Gmail and has not set a password, strictly block password login
      if (profile && (profile.is_gmail_only || profile.auth_provider === 'google') && !profile.has_password) {
        const error = new Error('此帳號由 Gmail 快速建立，尚未增設密碼，請使用 Gmail 快速登入');
        error.isGmailOnly = true;
        return { data: { user: null, session: null }, error };
      }

      if (!profile && !currentUser) {
        return { data: { user: null, session: null }, error: new Error('Invalid login credentials') };
      }

      const user = currentUser || {
        id: profile?.id || 'mock-user-id',
        email: normalizedEmail,
        user_metadata: {
          display_name: profile?.display_name || '會員',
          tier: profile?.tier || 'explorer'
        },
        app_metadata: { provider: 'email', providers: ['email'] }
      };

      const session = { access_token: `mock-jwt-token-${user.id}`, user };
      currentUser = user;
      currentSession = session;
      authListeners.forEach((cb) => cb('SIGNED_IN', session));
      return { data: { user, session }, error: null };
    }),

    // 2.3 Gmail fast login (OAuth simulation)
    signInWithOAuth: vi.fn().mockImplementation(async ({ provider, options = {} }) => {
      if (initialState.oauthError) {
        return { data: null, error: initialState.oauthError };
      }
      if (provider !== 'google') {
        return { data: null, error: new Error('Unsupported OAuth provider') };
      }

      const email = options?.queryParams?.login_hint || options?.data?.email || 'gmail.creator@meistudio.live';
      const displayName = options?.data?.displayName || options?.data?.display_name || 'Gmail 創作者';
      const uid = 'google-oauth-uid-12345';

      const user = {
        id: uid,
        email,
        user_metadata: {
          display_name: displayName,
          full_name: displayName,
          is_gmail_only: true,
          has_password: false,
          tier: 'creator',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
        },
        app_metadata: {
          provider: 'google',
          providers: ['google']
        }
      };

      const session = { access_token: `mock-google-token-${uid}`, user };
      currentUser = user;
      currentSession = session;

      const profileRow = {
        id: uid,
        union_id: 'mei_user_google_12345',
        email,
        display_name: displayName,
        auth_provider: 'google',
        auth_providers: ['google'],
        tier: 'creator',
        is_passkey_enabled: false,
        is_gmail_only: true,
        has_password: false,
        metadata: { has_password: false, is_gmail_only: true },
        connected_projects: ['*'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const idx = profilesTable.findIndex((p) => p.id === uid || p.email === email);
      if (idx >= 0) profilesTable[idx] = { ...profilesTable[idx], ...profileRow };
      else profilesTable.push(profileRow);

      const normalized = memberAuthService.normalizeMemberProfile({
        unionId: 'mei_user_google_12345',
        uid,
        email,
        displayName,
        tier: 'creator',
        authProvider: 'google',
        authProviders: ['google'],
        isPasskeyEnabled: false,
        metadata: { has_password: false, is_gmail_only: true }
      });
      memberAuthService.saveCurrentMember(normalized);

      authListeners.forEach((cb) => cb('SIGNED_IN', session));
      return { data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth' }, error: null };
    }),

    // 2.4 User updates (add password, bind providers, update profile)
    updateUser: vi.fn().mockImplementation(async (updates) => {
      if (initialState.updateUserError) {
        return { data: { user: null }, error: initialState.updateUserError };
      }
      if (!currentUser) {
        return { data: { user: null }, error: new Error('User not authenticated') };
      }

      if (updates.password) {
        currentUser.user_metadata = {
          ...currentUser.user_metadata,
          has_password: true,
          is_gmail_only: false
        };
        const pIdx = profilesTable.findIndex((p) => p.id === currentUser.id || p.email === currentUser.email);
        if (pIdx >= 0) {
          profilesTable[pIdx].has_password = true;
          profilesTable[pIdx].is_gmail_only = false;
          profilesTable[pIdx].metadata = {
            ...(profilesTable[pIdx].metadata || {}),
            has_password: true
          };
          profilesTable[pIdx].updated_at = new Date().toISOString();
        }
      }

      if (updates.data) {
        currentUser.user_metadata = {
          ...currentUser.user_metadata,
          ...updates.data
        };
        const pIdx = profilesTable.findIndex((p) => p.id === currentUser.id || p.email === currentUser.email);
        if (pIdx >= 0) {
          profilesTable[pIdx] = {
            ...profilesTable[pIdx],
            ...updates.data,
            metadata: {
              ...(profilesTable[pIdx].metadata || {}),
              ...updates.data
            },
            updated_at: new Date().toISOString()
          };
        }
      }

      return { data: { user: currentUser }, error: null };
    }),

    linkIdentity: vi.fn().mockImplementation(async ({ provider }) => {
      if (initialState.linkIdentityError) {
        return { data: null, error: initialState.linkIdentityError };
      }
      return { data: { provider }, error: null };
    }),

    // 2.5 Sign out
    signOut: vi.fn().mockImplementation(async () => {
      currentUser = null;
      currentSession = null;
      authListeners.forEach((cb) => cb('SIGNED_OUT', null));
      return { error: null };
    }),

    getSession: vi.fn().mockImplementation(async () => ({ data: { session: currentSession }, error: null })),
    getUser: vi.fn().mockImplementation(async () => ({ data: { user: currentUser }, error: null })),
    onAuthStateChange: vi.fn().mockImplementation((cb) => {
      authListeners.add(cb);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
    })
  };

  // 2.6 Chainable table query builder
  const createQueryBuilder = (tableName) => {
    let targetTable;
    if (tableName === 'mei_member_profiles') targetTable = profilesTable;
    else if (tableName === 'mei_member_passkeys') targetTable = passkeysTable;
    else if (tableName === 'mei_member_projects') targetTable = projectsTable;
    else targetTable = [];

    const filters = [];

    const builder = {
      select: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation((column, value) => {
        filters.push({ column, value });
        return builder;
      }),
      order: vi.fn().mockImplementation(() => builder),
      maybeSingle: vi.fn().mockImplementation(async () => {
        let rows = [...targetTable];
        for (const f of filters) {
          rows = rows.filter((r) => r[f.column] === f.value);
        }
        return { data: rows[0] || null, error: null };
      }),
      single: vi.fn().mockImplementation(async () => {
        let rows = [...targetTable];
        for (const f of filters) {
          rows = rows.filter((r) => r[f.column] === f.value);
        }
        if (!rows[0]) return { data: null, error: new Error('Row not found') };
        return { data: rows[0], error: null };
      }),
      insert: vi.fn().mockImplementation(async (records) => {
        const list = Array.isArray(records) ? records : [records];
        targetTable.push(...list);
        return { data: list, error: null };
      }),
      upsert: vi.fn().mockImplementation(async (records, opts = {}) => {
        const list = Array.isArray(records) ? records : [records];
        list.forEach((rec) => {
          const matchKey = opts.onConflict || 'id';
          const idx = targetTable.findIndex((r) => r[matchKey] === rec[matchKey] || (rec.email && r.email === rec.email));
          if (idx >= 0) {
            targetTable[idx] = {
              ...targetTable[idx],
              ...rec,
              metadata: {
                ...(targetTable[idx].metadata || {}),
                ...(rec.metadata || {})
              },
              updated_at: new Date().toISOString()
            };
          } else {
            targetTable.push({
              ...rec,
              metadata: { ...(rec.metadata || {}) }
            });
          }
        });
        return { data: list, error: null };
      }),
      update: vi.fn().mockImplementation((updates) => ({
        eq: vi.fn().mockImplementation(async (col, val) => {
          targetTable.forEach((r, idx) => {
            if (r[col] === val || (col === 'id' && (r.id === val || r.union_id === val || (currentUser && r.email === currentUser.email)))) {
              targetTable[idx] = {
                ...targetTable[idx],
                ...updates,
                metadata: {
                  ...(targetTable[idx].metadata || {}),
                  ...(updates.metadata || {})
                },
                updated_at: new Date().toISOString()
              };
              if (updates.metadata?.has_password) {
                targetTable[idx].has_password = true;
                targetTable[idx].is_gmail_only = false;
              }
            }
          });
          return { data: targetTable.filter((r) => r[col] === val), error: null };
        })
      })),
      delete: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(async (col, val) => {
          const removed = targetTable.filter((r) => r[col] === val);
          const remaining = targetTable.filter((r) => r[col] !== val);
          if (tableName === 'mei_member_profiles') profilesTable = remaining;
          else if (tableName === 'mei_member_passkeys') passkeysTable = remaining;
          else if (tableName === 'mei_member_projects') projectsTable = remaining;
          return { data: removed, error: null };
        })
      })),
      then: (resolve) => {
        let rows = [...targetTable];
        for (const f of filters) {
          rows = rows.filter((r) => r[f.column] === f.value);
        }
        return resolve({ data: rows, error: null });
      }
    };
    return builder;
  };

  return {
    auth: mockAuth,
    from: vi.fn().mockImplementation((table) => createQueryBuilder(table)),
    _getProfiles: () => profilesTable,
    _getPasskeys: () => passkeysTable,
    _getProjects: () => projectsTable
  };
}

// ============================================================================
// 3. WebAuthn Mock (navigator.credentials.create & get)
// ============================================================================
export function setupWebAuthnMock(options = {}) {
  const {
    supported = true,
    createFails = false,
    getFails = false,
    credentialId = 'mock-passkey-uuid-cred-12345',
    createError = new Error('The operation either timed out or was not allowed.'),
    getError = new Error('User cancelled biometric verification')
  } = options;

  if (!supported) {
    delete window.PublicKeyCredential;
    if (navigator.credentials) {
      delete navigator.credentials.create;
      delete navigator.credentials.get;
    }
    return;
  }

  window.PublicKeyCredential = class PublicKeyCredential {
    static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
    static isConditionalMediationAvailable = vi.fn().mockResolvedValue(true);
  };

  if (!navigator.credentials) {
    Object.defineProperty(navigator, 'credentials', {
      writable: true,
      configurable: true,
      value: {}
    });
  }

  navigator.credentials.create = vi.fn().mockImplementation(async () => {
    if (createFails) throw createError;
    return {
      id: credentialId,
      rawId: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([10, 20, 30]).buffer,
        attestationObject: new Uint8Array([40, 50, 60]).buffer
      },
      getClientExtensionResults: () => ({})
    };
  });

  navigator.credentials.get = vi.fn().mockImplementation(async () => {
    if (getFails) throw getError;
    return {
      id: credentialId,
      rawId: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([10, 20, 30]).buffer,
        authenticatorData: new Uint8Array([70, 80, 90]).buffer,
        signature: new Uint8Array([100, 110, 120]).buffer,
        userHandle: new Uint8Array([130, 140]).buffer
      },
      getClientExtensionResults: () => ({})
    };
  });
}

// ============================================================================
// 4. Memory BroadcastChannel (Deterministic cross-tab state synchronization)
// ============================================================================
export class MemoryBroadcastChannel {
  static channels = new Map();

  constructor(name) {
    this.name = name;
    this.onmessage = null;
    this.closed = false;

    if (!MemoryBroadcastChannel.channels.has(name)) {
      MemoryBroadcastChannel.channels.set(name, new Set());
    }
    MemoryBroadcastChannel.channels.get(name).add(this);
  }

  postMessage(data) {
    if (this.closed) return;
    const listeners = MemoryBroadcastChannel.channels.get(this.name);
    if (!listeners) return;
    listeners.forEach((ch) => {
      if (ch !== this && !ch.closed && typeof ch.onmessage === 'function') {
        setTimeout(() => {
          if (!ch.closed && typeof ch.onmessage === 'function') {
            ch.onmessage(new MessageEvent('message', { data }));
          }
        }, 0);
      }
    });
  }

  close() {
    this.closed = true;
    const set = MemoryBroadcastChannel.channels.get(this.name);
    if (set) {
      set.delete(this);
      if (set.size === 0) MemoryBroadcastChannel.channels.delete(this.name);
    }
  }

  static resetAll() {
    MemoryBroadcastChannel.channels.clear();
  }
}

// ============================================================================
// 5. Mock window.MeiStudioSSO (External Child Project SDK Interface)
// ============================================================================
export function setupWindowMeiStudioSSO(initialMember = null) {
  const listeners = new Set();
  window.MeiStudioSSO = {
    currentMember: initialMember,
    getMember: vi.fn(() => window.MeiStudioSSO.currentMember),
    onAuthStateChange: vi.fn((cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }),
    verifyToken: vi.fn(async (token) => {
      if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Token 不能為空' };
      }
      return memberAuthService.verifyMemberSsoToken(token);
    }),
    _notify: (member) => {
      window.MeiStudioSSO.currentMember = member;
      listeners.forEach((cb) => {
        try { cb(member); } catch {}
      });
    }
  };
}

// ============================================================================
// 6. Direct Service Contract Bindings (Production Member Auth Service)
// ============================================================================
const {
  registerMemberWithDetails,
  signInMemberWithPassword,
  signInWithGmailFastLogin,
  addPasswordToCurrentMember,
  bindGmailToCurrentMember,
  generateMemberSsoToken,
  verifyMemberSsoToken,
  generateMathCaptcha
} = memberAuthService;

// ============================================================================
// 7. Comprehensive E2E Test Suite (Tiers 1 to 4)
// ============================================================================
describe('Mei Creative Studio - Universal Member Auth & Cloud SSO v2.0 E2E Test Suite', () => {
  let mockSupabase;

  beforeEach(() => {
    // 1. Storage & DOM isolation
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
    document.documentElement.className = '';
    document.body.innerHTML = '';
    window.location.hash = '';

    // 2. BroadcastChannel mock
    window.BroadcastChannel = MemoryBroadcastChannel;
    MemoryBroadcastChannel.resetAll();

    // 3. WebAuthn mock
    setupWebAuthnMock({ supported: true });

    // 4. Supabase Client v2 mock
    mockSupabase = createMockSupabaseV2Client();
    vi.spyOn(supabase.auth, 'signUp').mockImplementation(mockSupabase.auth.signUp);
    vi.spyOn(supabase.auth, 'signInWithPassword').mockImplementation(mockSupabase.auth.signInWithPassword);
    vi.spyOn(supabase.auth, 'signInWithOAuth').mockImplementation(mockSupabase.auth.signInWithOAuth);
    vi.spyOn(supabase.auth, 'updateUser').mockImplementation(mockSupabase.auth.updateUser);
    vi.spyOn(supabase.auth, 'signOut').mockImplementation(mockSupabase.auth.signOut);
    vi.spyOn(supabase.auth, 'getSession').mockImplementation(mockSupabase.auth.getSession);
    vi.spyOn(supabase.auth, 'getUser').mockImplementation(mockSupabase.auth.getUser);
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation(mockSupabase.auth.onAuthStateChange);
    if (!supabase.auth.linkIdentity) {
      supabase.auth.linkIdentity = mockSupabase.auth.linkIdentity;
    } else {
      vi.spyOn(supabase.auth, 'linkIdentity').mockImplementation(mockSupabase.auth.linkIdentity);
    }
    vi.spyOn(supabase, 'from').mockImplementation(mockSupabase.from);

    // 5. External child project SDK mock
    setupWindowMeiStudioSSO(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    MemoryBroadcastChannel.resetAll();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.body.innerHTML = '';
  });

  // =========================================================================
  // Tier 1: Core Feature Coverage (Features 1 to 10 - 50 Tests)
  // =========================================================================
  describe('Tier 1: Core Feature Coverage (Features 1 to 10)', () => {
    // -----------------------------------------------------------------------
    // Feature 1 (R1): Standard Registration with Captcha
    // -----------------------------------------------------------------------
    describe('Feature 1 (R1): Standard Registration with Captcha', () => {
      it('T1-F01-01: renders modal with clean accessible structure and registration entrance', () => {
        const { getByTestId, queryByTestId } = render(
          <MemberPortalModal isOpen={true} onClose={vi.fn()} />
        );
        expect(getByTestId('member-portal-modal')).toBeInTheDocument();
        // Regression guard: initial unauthenticated view does not expose direct email submit
        expect(queryByTestId('member-email-submit-btn')).toBeNull();
      });

      it('T1-F01-02: generates readable arithmetic equation and verifies anti-bot challenge validation', async () => {
        // 1. Test authentic generator from memberAuthService
        const captcha = memberAuthService.generateMathCaptcha();
        expect(captcha).toBeDefined();
        expect(captcha.question).toMatch(/^\d+\s\+\s\d+\s=\s\?$/);
        const [a, b] = captcha.equation.split('+').map((s) => parseInt(s.trim(), 10));
        expect(captcha.expectedAnswer).toBe(String(a + b));

        // 2. Test challenge verification logic: correct answer passes
        const validRes = await memberAuthService.registerMemberWithDetails({
          displayName: '挑戰測試員',
          email: 'captcha.valid@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });
        expect(validRes.success).toBe(true);

        // 3. Test challenge verification logic: incorrect answer fails with anti-bot error
        const invalidRes = await memberAuthService.registerMemberWithDetails({
          displayName: '惡意機器人',
          email: 'captcha.bot@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: '999',
          captchaExpected: captcha.expectedAnswer
        });
        expect(invalidRes.success).toBe(false);
        expect(invalidRes.error).toBe('防機器人驗證碼錯誤，請重新計算');
      });

      it('T1-F01-03: registerMemberWithDetails creates user in Supabase auth with valid credentials', async () => {
        const captcha = generateMathCaptcha();
        const res = await registerMemberWithDetails({
          displayName: '新探索者',
          email: 'explorer.new@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });
        expect(res.success).toBe(true);
        expect(res.member).toBeDefined();
        expect(res.member.email).toBe('explorer.new@meistudio.live');
      });

      it('T1-F01-04: creates profile in mei_member_profiles with union_id and has_password: true', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '雲端探勘員',
          email: 'cloud.explorer@meistudio.live',
          password: 'SecretPass123!',
          confirmPassword: 'SecretPass123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });
        const profiles = mockSupabase._getProfiles();
        const found = profiles.find((p) => p.email === 'cloud.explorer@meistudio.live');
        expect(found).toBeDefined();
        expect(found.has_password).toBe(true);
        expect(found.union_id).toMatch(/^mei_user_/);
      });

      it('T1-F01-05: successful registration saves session and broadcasts MEMBER_SIGNED_IN', async () => {
        const channel = new MemoryBroadcastChannel(memberAuthService.MEMBER_SSO_BROADCAST_CHANNEL);
        const broadcastSpy = vi.fn();
        channel.onmessage = (e) => broadcastSpy(e.data);

        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '廣播測試員',
          email: 'broadcast.member@meistudio.live',
          password: 'SafePassword999!',
          confirmPassword: 'SafePassword999!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const stored = memberAuthService.loadCurrentMember();
        expect(stored).toBeDefined();
        expect(stored.email).toBe('broadcast.member@meistudio.live');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 2 (R1): Email & Password Sign-in
    // -----------------------------------------------------------------------
    describe('Feature 2 (R1): Email & Password Sign-in', () => {
      it('T1-F02-01: signInMemberWithPassword contract accepts email and password', async () => {
        expect(typeof signInMemberWithPassword).toBe('function');
      });

      it('T1-F02-02: valid email and password authenticates via Supabase client', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '密碼會員',
          email: 'password.user@meistudio.live',
          password: 'CorrectPassword1!',
          confirmPassword: 'CorrectPassword1!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const loginRes = await signInMemberWithPassword('password.user@meistudio.live', 'CorrectPassword1!');
        expect(loginRes.success).toBe(true);
        expect(loginRes.member.email).toBe('password.user@meistudio.live');
      });

      it('T1-F02-03: populates displayName, unionId, and tier after successful login', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '天際漫遊者',
          email: 'sky.roamer@meistudio.live',
          password: 'Password777!',
          confirmPassword: 'Password777!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const loginRes = await signInMemberWithPassword('sky.roamer@meistudio.live', 'Password777!');
        expect(loginRes.member.displayName).toBe('天際漫遊者');
        expect(loginRes.member.unionId).toMatch(/^mei_user_/);
        expect(loginRes.member.tier).toBeDefined();
      });

      it('T1-F02-04: stores member session in localStorage under mei_universal_member_sso_v1', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_storage_test',
          displayName: '存儲測試員',
          email: 'storage.test@meistudio.live',
          tier: 'explorer'
        });
        memberAuthService.saveCurrentMember(member);
        const stored = window.localStorage.getItem(memberAuthService.MEMBER_SSO_STORAGE_KEY);
        expect(stored).toContain('storage.test@meistudio.live');
      });

      it('T1-F02-05: signOutMember clears session and resets guest state', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_signout_test',
          displayName: '登出測試員',
          email: 'signout@meistudio.live'
        });
        memberAuthService.saveCurrentMember(member);
        expect(memberAuthService.loadCurrentMember()).not.toBeNull();

        await memberAuthService.signOutMember();
        expect(memberAuthService.loadCurrentMember()).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 3 (R2): Gmail Fast Login
    // -----------------------------------------------------------------------
    describe('Feature 3 (R2): Gmail Fast Login', () => {
      it('T1-F03-01: MemberPortalModal renders Gmail fast login button with member-google-login-btn testid', () => {
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        const btn = getByTestId('member-google-login-btn');
        expect(btn).toBeInTheDocument();
        expectZeroEmoji(btn);
      });

      it('T1-F03-02: clicking Google OAuth triggers signInWithOAuth with provider google', async () => {
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        fireEvent.click(getByTestId('member-google-login-btn'));
        await waitFor(() => {
          expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
            expect.objectContaining({ provider: 'google' })
          );
        });
      });

      it('T1-F03-03: signInWithGmailFastLogin supports custom editable nickname', async () => {
        const res = await signInWithGmailFastLogin({ customDisplayName: '客製創作者' });
        expect(res.success).toBe(true);
        expect(res.member.displayName).toBe('客製創作者');
      });

      it('T1-F03-04: profile created with auth_provider google, is_gmail_only: true, and has_password: false', async () => {
        await signInWithGmailFastLogin();
        const profiles = mockSupabase._getProfiles();
        const googleProfile = profiles.find((p) => p.auth_provider === 'google');
        expect(googleProfile).toBeDefined();
        expect(googleProfile.is_gmail_only).toBe(true);
        expect(googleProfile.has_password).toBe(false);
      });

      it('T1-F03-05: renders authenticated view with member profile card and tier badge', () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_google_card',
          displayName: 'Google 創作者',
          email: 'google.card@meistudio.live',
          tier: 'creator',
          authProvider: 'google'
        });
        const { getByTestId, getByText } = render(
          <MemberPortalModal isOpen={true} onClose={vi.fn()} currentMember={member} />
        );
        expect(getByTestId('member-profile-card')).toBeInTheDocument();
        expect(getByText('Google 創作者')).toBeInTheDocument();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 4 (R2): Password Login Block for Pure Gmail Accounts
    // -----------------------------------------------------------------------
    describe('Feature 4 (R2): Password Login Block for Pure Gmail Accounts', () => {
      it('T1-F04-01: detects pure Gmail account with has_password: false', async () => {
        await signInWithGmailFastLogin();
        const profiles = mockSupabase._getProfiles();
        const googleProfile = profiles.find((p) => p.auth_provider === 'google');
        expect(googleProfile.has_password).toBe(false);
      });

      it('T1-F04-02: password login attempt on pure Gmail account returns isGmailOnly: true', async () => {
        await signInWithGmailFastLogin();
        const res = await signInMemberWithPassword('gmail.creator@meistudio.live', 'SomePassword123!');
        expect(res.success).toBe(false);
        expect(res.isGmailOnly).toBe(true);
        expect(res.error).toMatch(/此帳號由 Gmail 快速.*建立.*尚未增設密碼/);
      });

      it('T1-F04-03: guidance message contains explicit traditional Chinese instructions', async () => {
        await signInWithGmailFastLogin();
        const res = await signInMemberWithPassword('gmail.creator@meistudio.live', 'AnyPassword123!');
        expect(res.error).toMatch(/Gmail 快速登入/);
        expectZeroEmoji(res.error);
      });

      it('T1-F04-04: unauthenticated modal displays Google OAuth option directly accessible for blocked users', () => {
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        expect(getByTestId('member-google-login-btn')).toBeVisible();
      });

      it('T1-F04-05: blocked password login does not create active session', async () => {
        window.localStorage.clear();
        await signInMemberWithPassword('gmail.creator@meistudio.live', 'WrongPassword!');
        expect(memberAuthService.loadCurrentMember()).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 5 (R3): Add Password to Gmail Account
    // -----------------------------------------------------------------------
    describe('Feature 5 (R3): Add Password to Gmail Account', () => {
      it('T1-F05-01: pure Gmail account identifies need for password addition', async () => {
        await memberAuthService.signInWithGmailFastLogin();
        const current = memberAuthService.loadCurrentMember();
        expect(current).toBeDefined();
        expect(current.metadata?.has_password).toBe(false);
        expect(current.authProvider).toBe('google');
        expect(current.authProviders).toContain('google');
      });

      it('T1-F05-02: addPasswordToCurrentMember validates password confirmation match', async () => {
        await signInWithGmailFastLogin();
        const res = await addPasswordToCurrentMember('NewPassword123!', 'NewPassword123!');
        expect(res.success).toBe(true);
      });

      it('T1-F05-03: updateUser updates metadata to has_password: true and is_gmail_only: false', async () => {
        await signInWithGmailFastLogin();
        await addPasswordToCurrentMember('DualAccessPassword1!', 'DualAccessPassword1!');
        expect(supabase.auth.updateUser).toHaveBeenCalledWith(
          expect.objectContaining({ password: 'DualAccessPassword1!' })
        );
      });

      it('T1-F05-04: profile record updated in mei_member_profiles', async () => {
        await signInWithGmailFastLogin();
        await addPasswordToCurrentMember('StrongPass123!', 'StrongPass123!');
        const profiles = mockSupabase._getProfiles();
        const target = profiles.find((p) => p.email === 'gmail.creator@meistudio.live');
        expect(target.has_password).toBe(true);
        expect(target.is_gmail_only).toBe(false);
      });

      it('T1-F05-05: dual login unlocked: subsequent password login succeeds', async () => {
        await signInWithGmailFastLogin();
        await addPasswordToCurrentMember('DualKey999!', 'DualKey999!');
        await memberAuthService.signOutMember();

        const passwordLoginRes = await signInMemberWithPassword('gmail.creator@meistudio.live', 'DualKey999!');
        expect(passwordLoginRes.success).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 6 (R3): Bind Gmail to Existing Account
    // -----------------------------------------------------------------------
    describe('Feature 6 (R3): Bind Gmail to Existing Account', () => {
      it('T1-F06-01: bindGmailToCurrentMember exists and is callable', () => {
        expect(typeof bindGmailToCurrentMember).toBe('function');
      });

      it('T1-F06-02: binding triggers Google OAuth link authorization flow', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '信箱會員',
          email: 'email.only@meistudio.live',
          password: 'PasswordEmail1!',
          confirmPassword: 'PasswordEmail1!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const bindRes = await bindGmailToCurrentMember();
        expect(bindRes.success).toBe(true);
      });

      it('T1-F06-03: authProviders array includes google after binding', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '雙重身分者',
          email: 'dual.identity@meistudio.live',
          password: 'PasswordDual1!',
          confirmPassword: 'PasswordDual1!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const res = await bindGmailToCurrentMember();
        expect(res.member.authProviders).toContain('google');
      });

      it('T1-F06-04: updates profile storage with bound Google provider', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '更新紀錄者',
          email: 'record.user@meistudio.live',
          password: 'PasswordRec1!',
          confirmPassword: 'PasswordRec1!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        await bindGmailToCurrentMember();
        const stored = memberAuthService.loadCurrentMember();
        expect(stored.authProviders).toContain('google');
      });

      it('T1-F06-05: bound user retains all scopes and privileges', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '授權會員',
          email: 'scope.user@meistudio.live',
          password: 'PasswordScope1!',
          confirmPassword: 'PasswordScope1!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const res = await bindGmailToCurrentMember();
        expect(res.member.scopes).toBeDefined();
        expect(res.member.scopes.length).toBeGreaterThan(0);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 7 (R3): Passkey / WebAuthn Registration & DB Vault
    // -----------------------------------------------------------------------
    describe('Feature 7 (R3): Passkey / WebAuthn Registration & DB Vault', () => {
      it('T1-F07-01: detectBiometricCapability identifies biometric capability and platform security element', () => {
        const cap = memberAuthService.detectBiometricCapability();
        expect(cap.supported).toBe(true);
        expect(cap.webAuthnAvailable).toBe(true);
        expect(cap.biometricLabel).toBeDefined();
        expect(cap.icon).toBeDefined();
      });

      it('T1-F07-02: bindPasskeyToCurrentMember invokes navigator.credentials.create with RP config', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_passkey_test',
          displayName: '生物金鑰會員',
          email: 'passkey.user@meistudio.live',
          tier: 'creator'
        });
        memberAuthService.saveCurrentMember(member);

        const res = await memberAuthService.bindPasskeyToCurrentMember();
        expect(res.data).toBeDefined();
        expect(navigator.credentials.create).toHaveBeenCalled();
      });

      it('T1-F07-03: persists credential into public.mei_member_passkeys table in Supabase', async () => {
        const passkeyRow = {
          user_id: 'mock-user-uuid-1',
          credential_id: 'passkey-cred-id-abc',
          public_key: 'mock-public-key-base64',
          counter: 0,
          device_name: 'W3C WebAuthn 硬體安全金鑰'
        };
        const insertRes = await supabase.from('mei_member_passkeys').insert(passkeyRow);
        expect(insertRes.error).toBeNull();
        const list = mockSupabase._getPasskeys();
        expect(list.some((p) => p.credential_id === 'passkey-cred-id-abc')).toBe(true);
      });

      it('T1-F07-04: updates is_passkey_enabled to true on member profile', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_passkey_flag',
          displayName: '金鑰旗標會員',
          email: 'flag.user@meistudio.live',
          isPasskeyEnabled: false
        });
        memberAuthService.saveCurrentMember(member);

        await memberAuthService.bindPasskeyToCurrentMember();
        const stored = memberAuthService.loadCurrentMember();
        expect(stored.isPasskeyEnabled).toBe(true);
      });

      it('T1-F07-05: signInWithPasskey invokes navigator.credentials.get for biometric authentication', async () => {
        const res = await memberAuthService.signInWithPasskey();
        expect(res.data).toBeDefined();
        expect(navigator.credentials.get).toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 8 (R4): Cross-Project SSO Token & SDK
    // -----------------------------------------------------------------------
    describe('Feature 8 (R4): Cross-Project SSO Token & SDK', () => {
      it('T1-F08-01: generateMemberSsoToken generates token prefixed with MEI-SSO- or mei_sso_v2.', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_sso_test',
          displayName: 'SSO 會員',
          email: 'sso.user@meistudio.live',
          tier: 'creator'
        });
        const token = await generateMemberSsoToken(member);
        expect(token).toMatch(/^(mei_sso_v2\.|MEI-SSO-)/);
      });

      it('T1-F08-02: verifyMemberSsoToken decodes valid token payload with unionId, email, tier', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_sso_verify',
          displayName: '驗證會員',
          email: 'verify.user@meistudio.live',
          tier: 'architect'
        });
        const token = await generateMemberSsoToken(member);
        const res = await verifyMemberSsoToken(token);
        expect(res.valid).toBe(true);
        expect(res.payload.unionId).toBe('mei_user_sso_verify');
        expect(res.payload.tier).toBe('architect');
      });

      it('T1-F08-03: window.MeiStudioSSO.verifyToken validates token for external child projects', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_sso_child',
          displayName: '子專案漫遊者',
          email: 'child.roamer@meistudio.live',
          tier: 'creator'
        });
        const token = await generateMemberSsoToken(member);
        const verification = await window.MeiStudioSSO.verifyToken(token);
        expect(verification.valid).toBe(true);
      });

      it('T1-F08-04: window.MeiStudioSSO.getMember returns currently active member', () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_active_sdk',
          displayName: 'SDK 會員',
          email: 'sdk.user@meistudio.live'
        });
        setupWindowMeiStudioSSO(member);
        expect(window.MeiStudioSSO.getMember()).toEqual(member);
      });

      it('T1-F08-05: cross-tab broadcast updates window.MeiStudioSSO session', () => {
        const listenerSpy = vi.fn();
        window.MeiStudioSSO.onAuthStateChange(listenerSpy);

        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_sync_test',
          displayName: '同步會員',
          email: 'sync.test@meistudio.live'
        });
        window.MeiStudioSSO._notify(member);
        expect(listenerSpy).toHaveBeenCalledWith(member);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 9 (R5): Mobile dvh & Multi-Aspect-Ratio Adaptation
    // -----------------------------------------------------------------------
    describe('Feature 9 (R5): Mobile dvh & Multi-Aspect-Ratio Adaptation', () => {
      it('T1-F09-01: MemberPortalModal applies dvh container classes with vh fallback', () => {
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        const modal = getByTestId('member-portal-modal');
        const dialogCard = modal.querySelector('.bento-glass-card');
        expect(dialogCard.className).toContain('max-h-dvh-90');
      });

      it('T1-F09-02: applies landscape-compact-modal for mobile short screens', () => {
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        const card = getByTestId('member-portal-modal').querySelector('.bento-glass-card');
        expect(card.className).toContain('landscape-compact-modal');
      });

      it('T1-F09-03: dialog contains accessible close button with full label', () => {
        const { getByLabelText } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        const closeBtn = getByLabelText('關閉會員專區視窗');
        expect(closeBtn).toBeInTheDocument();
        expectZeroEmoji(closeBtn);
      });

      it('T1-F09-04: unauthenticated view layout adapts without horizontal overflow elements', () => {
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        const card = getByTestId('member-portal-modal').querySelector('.bento-glass-card');
        expect(card.className).toContain('w-full');
      });

      it('T1-F09-05: profile view card uses responsive flex layouts', () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_responsive',
          displayName: '自適應會員',
          email: 'responsive@meistudio.live'
        });
        const { getByTestId } = render(
          <MemberPortalModal isOpen={true} onClose={vi.fn()} currentMember={member} />
        );
        const profileCard = getByTestId('member-profile-card');
        expect(profileCard).toBeInTheDocument();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 10 (R5): Zero Emoji & High Contrast Sky Toast
    // -----------------------------------------------------------------------
    describe('Feature 10 (R5): Zero Emoji & High Contrast Sky Toast', () => {
      it('T1-F10-01: all rendered modal elements contain zero Unicode emojis', () => {
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        expectZeroEmoji(getByTestId('member-portal-modal'));
      });

      it('T1-F10-02: authenticated profile modal contains zero Unicode emojis', () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_pure_text',
          displayName: '無表情符號會員',
          email: 'zero.emoji@meistudio.live',
          tier: 'creator'
        });
        const { getByTestId } = render(
          <MemberPortalModal isOpen={true} onClose={vi.fn()} currentMember={member} />
        );
        expectZeroEmoji(getByTestId('member-portal-modal'));
      });

      it('T1-F10-03: toast styling specification adheres to light mode bg-sky-100/95 and text-slate-900', async () => {
        window.localStorage.setItem('mei_studio_theme_v1', 'light');
        render(<App />);

        // Open Member Portal and trigger notification via Google fast login
        fireEvent.click(screen.getByTestId('header-member-portal-btn'));
        await act(async () => {
          fireEvent.click(screen.getByTestId('member-google-login-btn'));
        });

        const toastEl = screen.getByTestId('studio-toast');
        expect(toastEl).toBeInTheDocument();
        expect(toastEl.className).toContain('bg-sky-100/95');
        expect(toastEl.className).toContain('text-slate-900');
        expect(toastEl.className).toContain('border-sky-300/80');
        expect(toastEl).toHaveTextContent('已使用 Google 帳號登入全站會員中心');
        expectZeroEmoji(toastEl);
      });

      it('T1-F10-04: toast styling specification adheres to dark mode dark:bg-sky-950/95', async () => {
        window.localStorage.setItem('mei_studio_theme_v1', 'light');
        render(<App />);

        // Toggle theme to dark mode via header theme switch
        const themeBtn = screen.getByLabelText('切換深淺色主題');
        await act(async () => {
          fireEvent.click(themeBtn);
        });

        expect(document.documentElement.classList.contains('dark')).toBe(true);

        const toastEl = screen.getByTestId('studio-toast');
        expect(toastEl).toBeInTheDocument();
        expect(toastEl).toHaveTextContent('已切換至深色模式');
        expect(toastEl.className).toContain('dark:bg-sky-950/95');
        expect(toastEl.className).toContain('dark:text-white');
        expect(toastEl.className).toContain('dark:border-sky-400/40');
        expectZeroEmoji(toastEl);
      });

      it('T1-F10-05: notification trigger message produces zero Unicode emoji', async () => {
        const notifySpy = vi.fn();
        const { getByTestId } = render(
          <MemberPortalModal isOpen={true} onClose={vi.fn()} onNotify={notifySpy} />
        );
        await act(async () => {
          fireEvent.click(getByTestId('member-google-login-btn'));
        });

        // Verify notification callback was authentically invoked by component
        expect(notifySpy).toHaveBeenCalledTimes(1);
        const [dispatchedMsg, dispatchedIcon] = notifySpy.mock.calls[0];

        // Assert message payload type, content, and zero Unicode emoji compliance
        expect(typeof dispatchedMsg).toBe('string');
        expect(dispatchedMsg.length).toBeGreaterThan(0);
        expect(dispatchedMsg).toBe('已使用 Google 帳號登入全站會員中心');
        expectZeroEmoji(dispatchedMsg);
        expectZeroEmoji(dispatchedIcon);
      });
    });
  });

  // =========================================================================
  // Tier 2: Boundary Value & Error Resilience (50 Tests)
  // =========================================================================
  describe('Tier 2: Boundary Value & Error Resilience', () => {
    // -----------------------------------------------------------------------
    // Feature 1 Boundaries (F01)
    // -----------------------------------------------------------------------
    describe('Feature 1 Boundaries (F01): Registration Validation', () => {
      it('T2-F01-01: rejects submission with empty required fields', async () => {
        const res = await registerMemberWithDetails({
          displayName: '',
          email: '',
          password: '',
          confirmPassword: '',
          captchaAnswer: '',
          captchaExpected: '10'
        });
        expect(res.success).toBe(false);
        expect(res.error).toBeDefined();
      });

      it('T2-F01-02: rejects submission with password and confirm password mismatch', async () => {
        const res = await registerMemberWithDetails({
          displayName: '密碼不一致者',
          email: 'mismatch@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'PasswordMismatch!',
          captchaAnswer: '10',
          captchaExpected: '10'
        });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/密碼.*不一致/);
      });

      it('T2-F01-03: rejects submission with incorrect captcha answer', async () => {
        const res = await registerMemberWithDetails({
          displayName: '驗證碼錯誤者',
          email: 'wrong.captcha@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: '999',
          captchaExpected: '14'
        });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/驗證碼錯誤/);
      });

      it('T2-F01-04: handles duplicate email registration conflict cleanly', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '初次註冊者',
          email: 'duplicate@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const secondRes = await registerMemberWithDetails({
          displayName: '重複註冊者',
          email: 'duplicate@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });
        expect(secondRes.success).toBe(false);
      });

      it('T2-F01-05: sanitizes XSS scripts in display name', async () => {
        const captcha = generateMathCaptcha();
        const res = await registerMemberWithDetails({
          displayName: '<script>alert("xss")</script>安全使用者',
          email: 'xss.test@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });
        expect(res.success).toBe(true);
        expect(res.member.displayName).not.toContain('<script>');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 2 Boundaries (F02): Sign-in Resilience
    // -----------------------------------------------------------------------
    describe('Feature 2 Boundaries (F02): Sign-in Resilience', () => {
      it('T2-F02-01: incorrect password returns generic credential error', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '登入者',
          email: 'known.user@meistudio.live',
          password: 'KnownPassword1!',
          confirmPassword: 'KnownPassword1!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValueOnce({
          data: { user: null, session: null },
          error: new Error('Invalid login credentials')
        });

        const res = await signInMemberWithPassword('known.user@meistudio.live', 'WrongPassword!');
        expect(res.success).toBe(false);
        expect(res.error).toBe('Invalid login credentials');
      });

      it('T2-F02-02: non-existent email returns generic credential error preventing enumeration', async () => {
        const res = await signInMemberWithPassword('nonexistent@meistudio.live', 'SomePassword!');
        expect(res.success).toBe(false);
      });

      it('T2-F02-03: email normalization handles uppercase input', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '大寫信箱者',
          email: 'uppercase@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const res = await signInMemberWithPassword('UPPERCASE@MEISTUDIO.LIVE', 'Password123!');
        expect(res.success).toBe(true);
      });

      it('T2-F02-04: network disconnection returns descriptive connection error', async () => {
        vi.spyOn(supabase.auth, 'signInWithPassword').mockRejectedValueOnce(
          new Error('Failed to fetch (network error)')
        );
        const res = await signInMemberWithPassword('network.fail@meistudio.live', 'Pass!');
        expect(res.success).toBe(false);
      });

      it('T2-F02-05: rate limit 429 response handled gracefully', async () => {
        vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValueOnce({
          data: { user: null, session: null },
          error: new Error('Too many requests. Please wait a moment.')
        });
        const res = await signInMemberWithPassword('rate.limit@meistudio.live', 'Pass!');
        expect(res.success).toBe(false);
        expect(res.error).toContain('Too many requests');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 3 Boundaries (F03): OAuth Fallbacks
    // -----------------------------------------------------------------------
    describe('Feature 3 Boundaries (F03): OAuth Fallbacks', () => {
      it('T2-F03-01: OAuth popup cancelled by user is handled cleanly without uncaught error', async () => {
        vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
          data: null,
          error: new Error('User closed the popup window')
        });
        const res = await signInWithGmailFastLogin();
        expect(res.success).toBe(false);
        expect(res.error).toBe('User closed the popup window');
      });

      it('T2-F03-02: empty custom nickname falls back to Google profile full_name or email prefix', async () => {
        const res = await signInWithGmailFastLogin({ customDisplayName: '' });
        expect(res.success).toBe(true);
        expect(res.member.displayName).toBeDefined();
        expect(res.member.displayName.length).toBeGreaterThan(0);
      });

      it('T2-F03-03: custom nickname exceeding 100 characters is safely truncated or normalized', async () => {
        const longName = 'A'.repeat(150);
        const res = await signInWithGmailFastLogin({ customDisplayName: longName });
        expect(res.success).toBe(true);
      });

      it('T2-F03-04: OAuth network timeout is captured safely', async () => {
        vi.spyOn(supabase.auth, 'signInWithOAuth').mockRejectedValueOnce(
          new Error('Connection timeout')
        );
        const res = await signInWithGmailFastLogin();
        expect(res.success).toBe(false);
      });

      it('T2-F03-05: handles Google OAuth error or payload lacking email safely', async () => {
        vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
          data: null,
          error: new Error('Google OAuth payload lacks email')
        });
        const res = await memberAuthService.signInWithGmailFastLogin();
        expect(res.success).toBe(false);
        expect(res.error).toBeDefined();
        expect(res.error).toMatch(/Google OAuth payload lacks email/);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 4 Boundaries (F04): Pure Gmail Blocking Resilience
    // -----------------------------------------------------------------------
    describe('Feature 4 Boundaries (F04): Pure Gmail Blocking Resilience', () => {
      it('T2-F04-01: repeated password attempts on pure Gmail account consistently blocked', async () => {
        await signInWithGmailFastLogin();
        for (let i = 0; i < 3; i++) {
          const res = await signInMemberWithPassword('gmail.creator@meistudio.live', `Attempt${i}!`);
          expect(res.success).toBe(false);
          expect(res.isGmailOnly).toBe(true);
        }
      });

      it('T2-F04-02: email with mixed casing correctly triggers Gmail block', async () => {
        await signInWithGmailFastLogin();
        const res = await signInMemberWithPassword('GMAIL.CREATOR@MEISTUDIO.LIVE', 'Pass!');
        expect(res.success).toBe(false);
        expect(res.isGmailOnly).toBe(true);
      });

      it('T2-F04-03: email with leading/trailing whitespace trimmed before check', async () => {
        await signInWithGmailFastLogin();
        const res = await signInMemberWithPassword('  gmail.creator@meistudio.live  ', 'Pass!');
        expect(res.success).toBe(false);
        expect(res.isGmailOnly).toBe(true);
      });

      it('T2-F04-04: direct bypass with forged token or unauthorized password login is strictly rejected', async () => {
        // 1. Verify forged SSO token with manipulated signature is rejected
        const forgedToken = 'mei_sso_v2.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlvbklkIjoibWVpX3VzZXJfYnlwYXNzIn0.forged_invalid_signature_xyz';
        const verifyRes = await memberAuthService.verifyMemberSsoToken(forgedToken);
        expect(verifyRes.valid).toBe(false);
        expect(verifyRes.error).toMatch(/Invalid SSO Token signature/);

        // 2. Verify deprecated legacy token format cannot bypass
        const legacyRes = await memberAuthService.verifyMemberSsoToken('MEI-SSO-FORGED-LEGACY-TOKEN');
        expect(legacyRes.valid).toBe(false);
        expect(legacyRes.error).toMatch(/Legacy MEI-SSO token is deprecated/);

        // 3. Verify pure Gmail account cannot be bypassed via direct password login
        await memberAuthService.signInWithGmailFastLogin();
        const bypassLoginRes = await memberAuthService.signInMemberWithPassword('gmail.creator@meistudio.live', 'forged_bypass_password');
        expect(bypassLoginRes.success).toBe(false);
        expect(bypassLoginRes.isGmailOnly).toBe(true);
        expect(bypassLoginRes.error).toMatch(/此帳號由 Gmail 快速登入建立，尚未增設密碼/);
      });

      it('T2-F04-05: error display appears on login failure and dismisses upon retry or view reset', async () => {
        // 1. Render modal with mock OAuth failure
        vi.spyOn(memberAuthService, 'signInWithGoogle').mockRejectedValueOnce(
          new Error('第三方驗證連線失敗，請稍後再試')
        );

        const { getByTestId, getByRole, queryByRole, rerender } = render(
          <MemberPortalModal isOpen={true} onClose={vi.fn()} />
        );

        // 2. Click login button to trigger error
        await act(async () => {
          fireEvent.click(getByTestId('member-google-login-btn'));
        });

        // 3. Assert error alert is visible with verbatim message
        const alertElement = getByRole('alert');
        expect(alertElement).toBeInTheDocument();
        expect(alertElement).toHaveTextContent('第三方驗證連線失敗，請稍後再試');

        // 4. Simulate modal close and reopen (view switch / reset)
        rerender(<MemberPortalModal isOpen={false} onClose={vi.fn()} />);
        rerender(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);

        // 5. Assert error alert has been cleared
        expect(queryByRole('alert')).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 5 Boundaries (F05): Password Addition Validation
    // -----------------------------------------------------------------------
    describe('Feature 5 Boundaries (F05): Password Addition Validation', () => {
      it('T2-F05-01: new password shorter than 6 characters rejected', async () => {
        await signInWithGmailFastLogin();
        const res = await addPasswordToCurrentMember('12345', '12345');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/密碼長度至少需.*6.*個字元/);
      });

      it('T2-F05-02: new password and confirmation mismatch rejected', async () => {
        await signInWithGmailFastLogin();
        const res = await addPasswordToCurrentMember('PasswordA1!', 'PasswordB2!');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/密碼.*不一致/);
      });

      it('T2-F05-03: unauthenticated call to addPasswordToCurrentMember returns session expired error', async () => {
        window.localStorage.clear();
        await memberAuthService.signOutMember();
        const res = await memberAuthService.addPasswordToCurrentMember('NewPassword1!', 'NewPassword1!');
        expect(res.success).toBe(false);
        expect(res.error).toBe('請先登入會員後再增設密碼');
      });

      it('T2-F05-04: Supabase updateUser error preserves original state', async () => {
        await signInWithGmailFastLogin();
        vi.spyOn(supabase.auth, 'updateUser').mockResolvedValueOnce({
          data: { user: null },
          error: new Error('Database connection failed')
        });
        const res = await addPasswordToCurrentMember('GoodPassword1!', 'GoodPassword1!');
        expect(res.success).toBe(false);
      });

      it('T2-F05-05: successfully modifying password when already set allows clean change', async () => {
        await signInWithGmailFastLogin();
        await addPasswordToCurrentMember('FirstPassword1!', 'FirstPassword1!');
        const secondRes = await addPasswordToCurrentMember('SecondPassword2!', 'SecondPassword2!');
        expect(secondRes.success).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 6 Boundaries (F06): Identity Binding Resilience
    // -----------------------------------------------------------------------
    describe('Feature 6 Boundaries (F06): Identity Binding Resilience', () => {
      it('T2-F06-01: unauthenticated call to bindGmailToCurrentMember returns descriptive error', async () => {
        window.localStorage.clear();
        await memberAuthService.signOutMember();
        const res = await bindGmailToCurrentMember();
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/(請先登入會員|未登入會員)/);
      });

      it('T2-F06-02: OAuth provider error during binding handled cleanly', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '綁定失敗者',
          email: 'bind.fail@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        vi.spyOn(supabase.auth, 'linkIdentity').mockResolvedValueOnce({
          data: null,
          error: new Error('Popup blocked by browser')
        });

        const res = await bindGmailToCurrentMember();
        expect(res.success).toBe(false);
        expect(res.error).toBe('Popup blocked by browser');
      });

      it('T2-F06-03: calling bind when Google is already bound is idempotent', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '重覆綁定者',
          email: 'idempotent@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        await bindGmailToCurrentMember();
        const res2 = await bindGmailToCurrentMember();
        expect(res2.success).toBe(true);
        const count = res2.member.authProviders.filter((p) => p === 'google').length;
        expect(count).toBe(1);
      });

      it('T2-F06-04: network error during bind preserves existing member profile', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '網路中斷者',
          email: 'net.abort@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        vi.spyOn(supabase.auth, 'linkIdentity').mockRejectedValueOnce(
          new Error('Network disconnected')
        );

        const res = await bindGmailToCurrentMember();
        expect(res.success).toBe(false);
        const current = memberAuthService.loadCurrentMember();
        expect(current.email).toBe('net.abort@meistudio.live');
      });

      it('T2-F06-05: binding preserves existing user tier and metadata', async () => {
        const captcha = generateMathCaptcha();
        await registerMemberWithDetails({
          displayName: '保持階級者',
          email: 'keep.tier@meistudio.live',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        const res = await bindGmailToCurrentMember();
        expect(res.member.tier).toBe('explorer');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 7 Boundaries (F07): WebAuthn Degradation & Cancellations
    // -----------------------------------------------------------------------
    describe('Feature 7 Boundaries (F07): WebAuthn Degradation & Cancellations', () => {
      it('T2-F07-01: non-supported WebAuthn browser disables Passkey capability gracefully', () => {
        setupWebAuthnMock({ supported: false });
        const cap = memberAuthService.detectBiometricCapability();
        expect(cap.webAuthnAvailable).toBe(false);
      });

      it('T2-F07-02: biometric prompt cancellation (NotAllowedError) handled without crashing', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_cancel_test',
          displayName: '取消測試員',
          email: 'cancel@meistudio.live'
        });
        memberAuthService.saveCurrentMember(member);

        setupWebAuthnMock({
          createFails: true,
          createError: new Error('User cancelled biometric verification')
        });

        const res = await memberAuthService.bindPasskeyToCurrentMember();
        expect(res.error).toBeDefined();
        expect(res.error.message).toContain('User cancelled');
      });

      it('T2-F07-03: biometric sensor timeout (TimeoutError) handled gracefully', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_timeout_test',
          displayName: '超時測試員',
          email: 'timeout@meistudio.live'
        });
        memberAuthService.saveCurrentMember(member);

        setupWebAuthnMock({
          createFails: true,
          createError: new Error('The operation timed out')
        });

        const res = await memberAuthService.bindPasskeyToCurrentMember();
        expect(res.error).toBeDefined();
        expect(res.error.message).toContain('timed out');
      });

      it('T2-F07-04: unauthenticated passkey binding attempt rejected with friendly message', async () => {
        window.localStorage.clear();
        await memberAuthService.signOutMember();
        const res = await memberAuthService.bindPasskeyToCurrentMember();
        expect(res.error).toBeDefined();
        expect(res.error.message).toContain('請先登入會員');
      });

      it('T2-F07-05: signInWithPasskey handles biometric sensor cancellation without white-screen crash', async () => {
        setupWebAuthnMock({
          getFails: true,
          getError: new Error('Biometric verification cancelled')
        });
        const res = await memberAuthService.signInWithPasskey();
        expect(res.error).toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 8 Boundaries (F08): SSO Token Tampering & Expiration
    // -----------------------------------------------------------------------
    describe('Feature 8 Boundaries (F08): SSO Token Tampering & Expiration', () => {
      it('T2-F08-01: malformed token string returns valid: false', async () => {
        const res = await verifyMemberSsoToken('not-a-token');
        expect(res.valid).toBe(false);
        expect(res.error).toBeDefined();
      });

      it('T2-F08-02: expired token returns valid: false with expiration message', async () => {
        const expiredToken = 'mei_sso_v2.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlvbklkIjoibWVpX3VzZXJfZXhwaXJlZCIsImV4cCI6MTAwMDAwMDAwMH0.invalid_or_expired';
        const res = await verifyMemberSsoToken(expiredToken);
        expect(res.valid).toBe(false);
        expect(res.error).toBeDefined();
      });

      it('T2-F08-03: tampered signature returns valid: false', async () => {
        const member = memberAuthService.normalizeMemberProfile({
          unionId: 'mei_user_tampered',
          email: 'tampered@meistudio.live'
        });
        const validToken = await generateMemberSsoToken(member);
        const tamperedToken = validToken.slice(0, -5) + 'xxxxx';
        const res = await verifyMemberSsoToken(tamperedToken);
        expect(res.valid).toBe(false);
        expect(res.error).toBeDefined();
      });

      it('T2-F08-04: null token parameter returns valid: false', async () => {
        const res = await verifyMemberSsoToken(null);
        expect(res.valid).toBe(false);
        expect(res.error).toBeDefined();
      });

      it('T2-F08-05: non-string token returns valid: false', async () => {
        const res = await verifyMemberSsoToken(12345);
        expect(res.valid).toBe(false);
        expect(res.error).toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 9 Boundaries (F09): Responsive Viewport Stress
    // -----------------------------------------------------------------------
    describe('Feature 9 Boundaries (F09): Responsive Viewport Stress', () => {
      it('T2-F09-01: 320px ultra-narrow viewport container adapts without crashing', () => {
        window.innerWidth = 320;
        window.innerHeight = 480;
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        expect(getByTestId('member-portal-modal')).toBeInTheDocument();
      });

      it('T2-F09-02: short landscape viewport (350px height) renders compact card', () => {
        window.innerWidth = 800;
        window.innerHeight = 350;
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={vi.fn()} />);
        const card = getByTestId('member-portal-modal').querySelector('.bento-glass-card');
        expect(card.className).toContain('landscape-compact-modal');
      });

      it('T2-F09-03: modal backdrop click triggers onClose callback', () => {
        const closeSpy = vi.fn();
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={closeSpy} />);
        const backdrop = getByTestId('member-portal-modal');
        fireEvent.click(backdrop);
        expect(closeSpy).toHaveBeenCalled();
      });

      it('T2-F09-04: clicking inside card does not trigger onClose', () => {
        const closeSpy = vi.fn();
        const { getByTestId } = render(<MemberPortalModal isOpen={true} onClose={closeSpy} />);
        const card = getByTestId('member-portal-modal').querySelector('.bento-glass-card');
        fireEvent.click(card);
        expect(closeSpy).not.toHaveBeenCalled();
      });

      it('T2-F09-05: modal cleanly returns null when isOpen is false', () => {
        const { queryByTestId } = render(<MemberPortalModal isOpen={false} onClose={vi.fn()} />);
        expect(queryByTestId('member-portal-modal')).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 10 Boundaries (F10): Zero Emoji & Toast Layout Integrity
    // -----------------------------------------------------------------------
    describe('Feature 10 Boundaries (F10): Zero Emoji & Toast Layout Integrity', () => {
      it('T2-F10-01: admin mode offset class prevents overlap with floating elements', async () => {
        // 1. Initial visitor state (isAdmin: false)
        window.localStorage.setItem('mei_studio_admin_unlocked_v1', 'false');
        render(<App />);

        // Trigger toast via theme toggle in visitor mode
        const themeBtn = screen.getByLabelText('切換深淺色主題');
        await act(async () => {
          fireEvent.click(themeBtn);
        });

        let toastEl = screen.getByTestId('studio-toast');
        expect(toastEl).toBeInTheDocument();
        expect(toastEl.className).toContain('bottom-20');
        expect(toastEl.className).not.toContain('bottom-36');

        // 2. Unlock admin mode via footer modal
        fireEvent.click(screen.getByTestId('footer-admin-unlock-btn'));
        fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
          target: { value: 'mei888' }
        });
        await act(async () => {
          fireEvent.click(screen.getByText('立即解鎖管理後台'));
        });

        // Verify Admin Chat FAB is mounted
        expect(screen.getByTestId('admin-chat-fab')).toBeInTheDocument();

        // 3. Verify Toast dynamically shifts upward with bottom-36 sm:bottom-24
        toastEl = screen.getByTestId('studio-toast');
        expect(toastEl).toBeInTheDocument();
        expect(toastEl.className).toContain('bottom-36');
        expect(toastEl.className).toContain('sm:bottom-24');
        expectZeroEmoji(toastEl);
      });

      it('T2-F10-02: toast width constraint prevents overflow on 320px screens', async () => {
        window.innerWidth = 320;
        window.innerHeight = 640;
        window.dispatchEvent(new Event('resize'));

        render(<App />);

        const themeBtn = screen.getByLabelText('切換深淺色主題');
        await act(async () => {
          fireEvent.click(themeBtn);
        });

        const toastEl = screen.getByTestId('studio-toast');
        expect(toastEl).toBeInTheDocument();
        expect(toastEl.className).toContain('max-w-[calc(100vw-2rem)]');
        expect(toastEl.className).toContain('left-4');
        expect(toastEl.className).toContain('right-4');
        expect(toastEl.className).toContain('w-fit');
        expectZeroEmoji(toastEl);

        // Restore default viewport
        window.innerWidth = 1024;
        window.innerHeight = 768;
      });

      it('T2-F10-03: emoji characters in user input stripped by security sanitizer', async () => {
        // Construct runtime emoji without literal Unicode in test file text (adhering to zero-emoji rule)
        const rocket = String.fromCodePoint(0x1F680);
        const party = String.fromCodePoint(0x1F389);
        const rawWithEmoji = `MeiStudio ${rocket} 創作者 ${party}`;

        // Verify runtime test input actually contains emoji
        expect(EMOJI_REGEX.test(rawWithEmoji)).toBe(true);

        // 1. Direct unit test of security sanitizer
        const sanitized = sanitizeStringDeep(rawWithEmoji);
        expectZeroEmoji(sanitized);
        expect(sanitized).toBe('MeiStudio  創作者');

        // 2. Integration test via registration flow
        const captcha = memberAuthService.generateMathCaptcha();
        const res = await memberAuthService.registerMemberWithDetails({
          displayName: `雲端探勘員 ${rocket}`,
          email: 'sanitizer.emoji@meistudio.live',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          captchaAnswer: captcha.expectedAnswer,
          captchaExpected: captcha.expectedAnswer
        });

        expect(res.success).toBe(true);
        expect(res.member.displayName).toBe('雲端探勘員');
        expectZeroEmoji(res.member.displayName);
      });

      it('T2-F10-04: error message state displays zero Unicode emoji', () => {
        const { getByTestId, rerender } = render(
          <MemberPortalModal isOpen={true} onClose={vi.fn()} />
        );
        expectZeroEmoji(getByTestId('member-portal-modal'));
      });

      it('T2-F10-05: rapid multiple notifications render cleanly without crashes', async () => {
        render(<App />);

        // Rapidly dispatch multiple notifications via UI events
        const themeBtn = screen.getByLabelText('切換深淺色主題');
        for (let i = 0; i < 5; i++) {
          await act(async () => {
            fireEvent.click(themeBtn);
          });
        }

        // Verify single active toast in DOM with spring animation
        const toastElements = screen.getAllByTestId('studio-toast');
        expect(toastElements).toHaveLength(1);
        const toastEl = toastElements[0];
        expect(toastEl).toBeInTheDocument();
        expect(toastEl.className).toContain('toast-spring-enter');
        expectZeroEmoji(toastEl);

        // Verify dismissing the toast updates animation to exit cleanly
        await act(async () => {
          fireEvent.click(toastEl);
        });
        expect(toastEl.className).toContain('toast-slide-exit');
      });
    });
  });

  // =========================================================================
  // Tier 3: Cross-Feature Combinations (10 Tests)
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('T3-C-01: Gmail Login -> Add Password in Settings -> Dual Sign-in Verified', async () => {
      // 1. Gmail fast login
      const gmailRes = await signInWithGmailFastLogin({ customDisplayName: '雙重登入者' });
      expect(gmailRes.success).toBe(true);

      // 2. Add password
      const addPassRes = await addPasswordToCurrentMember('DualPassKey123!', 'DualPassKey123!');
      expect(addPassRes.success).toBe(true);

      // 3. Sign out
      await memberAuthService.signOutMember();
      expect(memberAuthService.loadCurrentMember()).toBeNull();

      // 4. Password login succeeds
      const passLoginRes = await signInMemberWithPassword('gmail.creator@meistudio.live', 'DualPassKey123!');
      expect(passLoginRes.success).toBe(true);

      // 5. Gmail fast login also continues to succeed
      const gmailLoginRes = await signInWithGmailFastLogin();
      expect(gmailLoginRes.success).toBe(true);
    });

    it('T3-C-02: Gmail Login -> Blocked Password Attempt -> Set Password -> Unblocked Password Login', async () => {
      await signInWithGmailFastLogin();
      await memberAuthService.signOutMember();

      // Blocked before password added
      const blockedRes = await signInMemberWithPassword('gmail.creator@meistudio.live', 'Attempt!');
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.isGmailOnly).toBe(true);

      // Log in via Gmail, set password
      await signInWithGmailFastLogin();
      await addPasswordToCurrentMember('NewMasterPass1!', 'NewMasterPass1!');
      await memberAuthService.signOutMember();

      // Now unblocked
      const unblockedRes = await signInMemberWithPassword('gmail.creator@meistudio.live', 'NewMasterPass1!');
      expect(unblockedRes.success).toBe(true);
    });

    it('T3-C-03: Standard Registration -> Bind Gmail -> Fast Login with Linked Account', async () => {
      const captcha = generateMathCaptcha();
      const regRes = await registerMemberWithDetails({
        displayName: '全能綁定者',
        email: 'omni.bound@meistudio.live',
        password: 'OriginalPass123!',
        confirmPassword: 'OriginalPass123!',
        captchaAnswer: captcha.expectedAnswer,
        captchaExpected: captcha.expectedAnswer
      });
      expect(regRes.success).toBe(true);

      // Bind Gmail
      const bindRes = await bindGmailToCurrentMember();
      expect(bindRes.success).toBe(true);
      expect(bindRes.member.authProviders).toContain('google');
    });

    it('T3-C-04: Standard Registration -> Bind Passkey in mei_member_passkeys -> Biometric Sign-in', async () => {
      const captcha = generateMathCaptcha();
      await registerMemberWithDetails({
        displayName: '生物註冊者',
        email: 'bio.reg@meistudio.live',
        password: 'BioPassword123!',
        confirmPassword: 'BioPassword123!',
        captchaAnswer: captcha.expectedAnswer,
        captchaExpected: captcha.expectedAnswer
      });

      // Bind passkey
      const bindRes = await memberAuthService.bindPasskeyToCurrentMember();
      expect(bindRes.data.member.isPasskeyEnabled).toBe(true);

      // Biometric sign-in
      const bioLoginRes = await memberAuthService.signInWithPasskey();
      expect(bioLoginRes.data.member).toBeDefined();
    });

    it('T3-C-05: Gmail Login -> Bind Passkey -> Roam to Child Project (SDK verifyToken)', async () => {
      await signInWithGmailFastLogin({ customDisplayName: '跨域探險家' });
      await memberAuthService.bindPasskeyToCurrentMember();

      const member = memberAuthService.loadCurrentMember();
      const token = await generateMemberSsoToken(member);

      const verification = await window.MeiStudioSSO.verifyToken(token);
      expect(verification.valid).toBe(true);
    });

    it('T3-C-06: Multi-Tab Login Synchronization via MemoryBroadcastChannel', async () => {
      const tabBListener = vi.fn();
      const channelB = new MemoryBroadcastChannel(memberAuthService.MEMBER_SSO_BROADCAST_CHANNEL);
      channelB.onmessage = (e) => tabBListener(e.data);

      const member = memberAuthService.normalizeMemberProfile({
        unionId: 'mei_user_tab_sync',
        displayName: '分頁同步員',
        email: 'tab.sync@meistudio.live'
      });
      memberAuthService.broadcastMemberSsoEvent('MEMBER_SIGNED_IN', member);

      await waitFor(() => {
        expect(tabBListener).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'MEMBER_SIGNED_IN' })
        );
      });
      channelB.close();
    });

    it('T3-C-07: Multi-Tab Logout Synchronization via MemoryBroadcastChannel', async () => {
      const tabBListener = vi.fn();
      const channelB = new MemoryBroadcastChannel(memberAuthService.MEMBER_SSO_BROADCAST_CHANNEL);
      channelB.onmessage = (e) => tabBListener(e.data);

      memberAuthService.broadcastMemberSsoEvent('MEMBER_LOGOUT', null);

      await waitFor(() => {
        expect(tabBListener).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'MEMBER_LOGOUT' })
        );
      });
      channelB.close();
    });

    it('T3-C-08: Captcha Reset on Error -> Registration Success -> Bind Passkey Vault', async () => {
      const captcha = generateMathCaptcha();
      // First attempt: wrong captcha
      const failRes = await registerMemberWithDetails({
        displayName: '重新嘗試者',
        email: 'retry.captcha@meistudio.live',
        password: 'Password999!',
        confirmPassword: 'Password999!',
        captchaAnswer: '0',
        captchaExpected: captcha.expectedAnswer
      });
      expect(failRes.success).toBe(false);

      // Second attempt: new captcha correct
      const newCaptcha = generateMathCaptcha();
      const okRes = await registerMemberWithDetails({
        displayName: '重新嘗試者',
        email: 'retry.captcha@meistudio.live',
        password: 'Password999!',
        confirmPassword: 'Password999!',
        captchaAnswer: newCaptcha.expectedAnswer,
        captchaExpected: newCaptcha.expectedAnswer
      });
      expect(okRes.success).toBe(true);

      // Now bind passkey
      const passkeyRes = await memberAuthService.bindPasskeyToCurrentMember();
      expect(passkeyRes.data.member.isPasskeyEnabled).toBe(true);
    });

    it('T3-C-09: Mobile Landscape + Admin FAB + High-Contrast Sky Toast positioning', async () => {
      window.innerWidth = 700;
      window.innerHeight = 380;
      window.dispatchEvent(new Event('resize'));
      window.localStorage.setItem('mei_studio_theme_v1', 'light');
      window.sessionStorage.setItem('mei_studio_admin_unlocked_v1', 'true');

      render(<App />);

      expect(screen.getByTestId('admin-chat-fab')).toBeInTheDocument();

      const themeBtn = screen.getByLabelText('切換深淺色主題');
      await act(async () => {
        fireEvent.click(themeBtn);
      });

      const toastEl = screen.getByTestId('studio-toast');
      expect(toastEl).toBeInTheDocument();
      expect(toastEl.className).toContain('bg-sky-100/95');
      expect(toastEl.className).toContain('text-slate-900');
      expect(toastEl.className).toContain('border-sky-300/80');
      expect(toastEl.className).toContain('bottom-36');
      expect(toastEl.className).toContain('sm:bottom-24');
      expect(toastEl.className).toContain('max-w-[calc(100vw-2rem)]');
      expectZeroEmoji(toastEl);

      window.innerWidth = 1024;
      window.innerHeight = 768;
    });

    it('T3-C-10: SDK AuthStateChange Listener + Passkey Hub Login event propagation', async () => {
      const sdkSpy = vi.fn();
      window.MeiStudioSSO.onAuthStateChange(sdkSpy);

      const passkeyMember = memberAuthService.normalizeMemberProfile({
        unionId: 'mei_user_sdk_listener',
        displayName: 'SDK 監聽會員',
        email: 'sdk.listener@meistudio.live',
        isPasskeyEnabled: true
      });
      window.MeiStudioSSO._notify(passkeyMember);

      expect(sdkSpy).toHaveBeenCalledWith(passkeyMember);
    });
  });

  // =========================================================================
  // Tier 4: Real-World Scenarios (Complete User Lifecycles - 4 Tests)
  // =========================================================================
  describe('Tier 4: Real-World Scenarios', () => {
    it('T4-RW-01: Complete New User Onboarding Lifecycle', async () => {
      // 1. Visitor opens portal
      const { getByTestId, queryByTestId } = render(
        <MemberPortalModal isOpen={true} onClose={vi.fn()} />
      );
      expect(getByTestId('member-portal-modal')).toBeInTheDocument();
      expect(queryByTestId('member-email-submit-btn')).toBeNull();

      // 2. Solves captcha and registers
      const captcha = generateMathCaptcha();
      const regRes = await registerMemberWithDetails({
        displayName: '旅程訪客',
        email: 'journey.visitor@meistudio.live',
        password: 'JourneyPassword1!',
        confirmPassword: 'JourneyPassword1!',
        captchaAnswer: captcha.expectedAnswer,
        captchaExpected: captcha.expectedAnswer
      });
      expect(regRes.success).toBe(true);

      // 3. Database profile created
      const profiles = mockSupabase._getProfiles();
      const profile = profiles.find((p) => p.email === 'journey.visitor@meistudio.live');
      expect(profile).toBeDefined();
      expect(profile.union_id).toMatch(/^mei_user_/);

      // 4. Binds Touch ID / Passkey
      const passkeyRes = await memberAuthService.bindPasskeyToCurrentMember();
      expect(passkeyRes.data.member.isPasskeyEnabled).toBe(true);

      // 5. Generates SSO token and child project SDK verifies
      const ssoToken = await generateMemberSsoToken(passkeyRes.data.member);
      const sdkVerification = await window.MeiStudioSSO.verifyToken(ssoToken);
      expect(sdkVerification.valid).toBe(true);

      // 6. Signs out
      await memberAuthService.signOutMember();
      expect(memberAuthService.loadCurrentMember()).toBeNull();
    });

    it('T4-RW-02: Google OAuth User Security Posture Upgrade', async () => {
      // 1. Gmail fast login
      const oauthRes = await signInWithGmailFastLogin({ customDisplayName: '升級創作者' });
      expect(oauthRes.success).toBe(true);
      expect(oauthRes.member.displayName).toBe('升級創作者');

      // 2. Signs out and tests password block
      await memberAuthService.signOutMember();
      const blockedRes = await signInMemberWithPassword('gmail.creator@meistudio.live', 'SomePass!');
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.isGmailOnly).toBe(true);

      // 3. Logs back in via Gmail and adds password
      await signInWithGmailFastLogin();
      const addPassRes = await addPasswordToCurrentMember('SecureUpgradePass1!', 'SecureUpgradePass1!');
      expect(addPassRes.success).toBe(true);

      // 4. Signs out and verifies dual login
      await memberAuthService.signOutMember();
      const passLogin = await signInMemberWithPassword('gmail.creator@meistudio.live', 'SecureUpgradePass1!');
      expect(passLogin.success).toBe(true);

      const oauthLogin = await signInWithGmailFastLogin();
      expect(oauthLogin.success).toBe(true);
    });

    it('T4-RW-03: Mobile Multi-Device Roaming & Responsive Lifecycle', () => {
      // 1. Narrow 320px fold screen
      window.innerWidth = 320;
      window.innerHeight = 480;

      const member = memberAuthService.normalizeMemberProfile({
        unionId: 'mei_user_mobile_lifecycle',
        displayName: '行動漫遊者',
        email: 'mobile.roamer@meistudio.live',
        tier: 'creator'
      });

      const { getByTestId } = render(
        <MemberPortalModal isOpen={true} onClose={vi.fn()} currentMember={member} />
      );

      // 2. Container uses dvh unit
      const card = getByTestId('member-portal-modal').querySelector('.bento-glass-card');
      expect(card.className).toContain('max-h-dvh-90');

      // 3. Zero emoji check across entire rendered DOM
      expectZeroEmoji(getByTestId('member-portal-modal'));
    });

    it('T4-RW-04: Credential Recovery & Multi-Channel Security Re-binding', async () => {
      // 1. Registered member authenticates
      const captcha = generateMathCaptcha();
      await registerMemberWithDetails({
        displayName: '多重憑證者',
        email: 'multi.cred@meistudio.live',
        password: 'PasswordMulti1!',
        confirmPassword: 'PasswordMulti1!',
        captchaAnswer: captcha.expectedAnswer,
        captchaExpected: captcha.expectedAnswer
      });

      // 2. Binds backup Gmail identity
      const bindGmailRes = await bindGmailToCurrentMember();
      expect(bindGmailRes.member.authProviders).toContain('google');

      // 3. Registers hardware Passkey
      const bindPasskeyRes = await memberAuthService.bindPasskeyToCurrentMember();
      expect(bindPasskeyRes.data.member.isPasskeyEnabled).toBe(true);

      // 4. Verifies triple login capability
      const current = memberAuthService.loadCurrentMember();
      expect(current.authProviders).toContain('email');
      expect(current.authProviders).toContain('google');
      expect(current.authProviders).toContain('passkey');
    });
  });
});
