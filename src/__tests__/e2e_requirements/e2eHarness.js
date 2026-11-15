/**
 * E2E Test Harness & Shared Fixtures
 * 
 * Provides centralized environment setup, teardown, Supabase mock factories,
 * WebAuthn credential mocks, viewport simulation, BroadcastChannel simulation,
 * and zero-emoji compliance verification.
 */

import { vi, beforeEach, afterEach, expect } from 'vitest';
import '@testing-library/jest-dom';
import fs from 'node:fs';
import path from 'node:path';

// Comprehensive Unicode Emoji regular expression adhering to AGENTS.md Rule 4
export const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

/**
 * Safely load projectSyncService at runtime without failing Vite static import analysis if the file does not exist yet
 */
export async function getProjectSyncService() {
  const fullPath = path.resolve('src/services/projectSyncService.js');
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const dynamicPath = '../../services/' + 'projectSyncService.js';
  return import(/* @vite-ignore */ dynamicPath).catch(() => null);
}

/**
 * Helper to query sort popover trigger and menu across testid and accessible ARIA attributes
 */
export function getSortPopoverElements(container = document) {
  const trigger =
    container.querySelector('[data-testid="sort-popover-trigger"]') ||
    container.querySelector('button[aria-haspopup="listbox"]') ||
    Array.from(container.querySelectorAll('button')).find((b) => b.getAttribute('aria-label')?.includes('專案排序'));

  const menu =
    container.querySelector('[data-testid="sort-popover-menu"]') ||
    container.querySelector('[role="listbox"]') ||
    container.querySelector('[aria-label="專案排序選單"]');

  return { trigger, menu };
}

export const SAMPLE_E2E_PROJECTS = [
  {
    id: 'proj-sample-web',
    title: '雲絨極簡品牌官網',
    subtitle: 'CloudFleece Web',
    description: '網站與商業應用示範專案',
    category: 'web-business',
    icon: 'globe',
    url: 'https://example.com/web',
    status: 'online',
    sort_order: 1,
    pinned: false,
    latencyMs: 15
  },
  {
    id: 'proj-sample-interactive',
    title: '咩咩互動設計實驗室',
    subtitle: 'Interactive Lab',
    description: '互動設計與多媒體示範專案',
    category: 'interactive-media',
    icon: 'circle-play',
    url: 'https://example.com/interactive',
    status: 'beta',
    sort_order: 2,
    pinned: true,
    latencyMs: 25
  },
  {
    id: 'proj-sample-ai',
    title: 'AI 智慧助理',
    subtitle: 'AI Copilot',
    description: 'AI 與自動化工具示範專案',
    category: 'ai-automation',
    icon: 'bot',
    url: 'https://example.com/ai',
    status: 'online',
    sort_order: 3,
    pinned: false,
    latencyMs: 30
  }
];

/**
 * Shared in-memory event bus for BroadcastChannel simulation across tabs in JSDOM
 */
class MemoryBroadcastChannel {
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

  postMessage(message) {
    if (this.closed) return;
    const listeners = MemoryBroadcastChannel.channels.get(this.name);
    if (!listeners) return;

    // Dispatch message to other channels in the same namespace (excluding self)
    listeners.forEach((ch) => {
      if (ch !== this && !ch.closed && typeof ch.onmessage === 'function') {
        setTimeout(() => {
          if (!ch.closed && typeof ch.onmessage === 'function') {
            ch.onmessage(new MessageEvent('message', { data: message }));
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
      if (set.size === 0) {
        MemoryBroadcastChannel.channels.delete(this.name);
      }
    }
  }

  static resetAll() {
    MemoryBroadcastChannel.channels.clear();
  }
}

/**
 * Configure viewport simulation on window
 */
export function simulateViewport(width = 1280, height = 800) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  Object.defineProperty(window, 'outerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'outerHeight', { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

/**
 * Evaluates a CSS media query string against given or current window dimensions
 */
export function evaluateMediaQuery(query, width = typeof window !== 'undefined' ? window.innerWidth : 1280, height = typeof window !== 'undefined' ? window.innerHeight : 800) {
  if (!query) return false;
  // Handle compound queries joined by "and"
  const parts = query.split(/\s+and\s+/i);
  return parts.every((subQuery) => {
    const clean = subQuery.trim().replace(/^\(|\)$/g, '');

    // Orientation
    if (clean.includes('orientation')) {
      if (clean.includes('landscape')) return width > height;
      if (clean.includes('portrait')) return width <= height;
    }

    // Max/min height
    const maxH = clean.match(/max-height:\s*(\d+)px/i);
    if (maxH) return height <= parseInt(maxH[1], 10);
    const minH = clean.match(/min-height:\s*(\d+)px/i);
    if (minH) return height >= parseInt(minH[1], 10);

    // Max/min width
    const maxW = clean.match(/max-width:\s*(\d+)px/i);
    if (maxW) return width <= parseInt(maxW[1], 10);
    const minW = clean.match(/min-width:\s*(\d+)px/i);
    if (minW) return width >= parseInt(minW[1], 10);

    // Aspect ratio
    const minAspect = clean.match(/min-aspect-ratio:\s*(\d+)\/(\d+)/i);
    if (minAspect) {
      const targetRatio = parseInt(minAspect[1], 10) / parseInt(minAspect[2], 10);
      return (width / height) >= targetRatio - 0.01;
    }
    const maxAspect = clean.match(/max-aspect-ratio:\s*(\d+)\/(\d+)/i);
    if (maxAspect) {
      const targetRatio = parseInt(maxAspect[1], 10) / parseInt(maxAspect[2], 10);
      return (width / height) <= targetRatio + 0.01;
    }

    // Generic fallback for queries without "px"
    if (clean.includes('max-width')) {
      const val = parseInt(clean.match(/\d+/)?.[0] || '0', 10);
      return width <= val;
    }
    if (clean.includes('min-width')) {
      const val = parseInt(clean.match(/\d+/)?.[0] || '0', 10);
      return width >= val;
    }

    return false;
  });
}

/**
 * Verify that a string or DOM element contains 0 system emojis
 */
export function expectZeroEmoji(target) {
  let content = '';
  if (typeof target === 'string') {
    content = target;
  } else if (target && typeof target === 'object') {
    content = (target.textContent || '') + ' ' + (target.innerHTML || '');
  }
  const hasEmoji = EMOJI_REGEX.test(content);
  expect(hasEmoji).toBe(false);
  return !hasEmoji;
}

/**
 * Mock WebAuthn credentials on navigator.credentials
 */
export function mockWebAuthnCredentials(options = {}) {
  const {
    supported = true,
    createFails = false,
    getFails = false,
    createError = new Error('The operation either timed out or was not allowed.'),
    getError = new Error('User cancelled biometric prompt'),
    credentialId = 'mock-credential-uuid-12345'
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

  navigator.credentials.create = vi.fn().mockImplementation(async (createOptions) => {
    if (createFails) {
      throw createError;
    }
    return {
      id: credentialId,
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([10, 20]).buffer,
        attestationObject: new Uint8Array([30, 40]).buffer
      },
      getClientExtensionResults: () => ({})
    };
  });

  navigator.credentials.get = vi.fn().mockImplementation(async (getOptions) => {
    if (getFails) {
      throw getError;
    }
    return {
      id: credentialId,
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([10, 20]).buffer,
        authenticatorData: new Uint8Array([50, 60]).buffer,
        signature: new Uint8Array([70, 80]).buffer,
        userHandle: new Uint8Array([90, 100]).buffer
      },
      getClientExtensionResults: () => ({})
    };
  });
}

/**
 * Create a mock Supabase client instance with controllable auth and realtime database table operations
 */
export function createMockSupabaseClient(initialState = {}) {
  const realtimeListeners = new Map(); // table -> Set<callback>

  let currentSession = initialState.session || null;
  let currentUser = initialState.user || null;

  // Multi-table in-memory storage with seeding
  const tableDataMap = new Map();
  const initialProjects = initialState.projects ? [...initialState.projects] : [];
  tableDataMap.set('mei_member_projects', initialProjects);
  tableDataMap.set('projects', initialProjects); // backward compatibility alias
  tableDataMap.set(
    'mei_member_profiles',
    initialState.profiles
      ? [...initialState.profiles]
      : (initialState.memberProfiles ? [...initialState.memberProfiles] : [])
  );
  tableDataMap.set(
    'mei_member_passkeys',
    initialState.passkeys
      ? [...initialState.passkeys]
      : (initialState.memberPasskeys ? [...initialState.memberPasskeys] : [])
  );

  const getTableData = (name) => {
    if (!tableDataMap.has(name)) {
      tableDataMap.set(name, []);
    }
    return tableDataMap.get(name);
  };

  const setTableData = (name, data) => {
    tableDataMap.set(name, data);
    if (name === 'mei_member_projects') {
      tableDataMap.set('projects', data);
    } else if (name === 'projects') {
      tableDataMap.set('mei_member_projects', data);
    }
  };

  const authListeners = new Set();

  const mockAuth = {
    flowType: 'pkce',
    storageKey: 'mei_studio_supabase_auth_token_v1',
    getSession: vi.fn().mockImplementation(async () => ({
      data: { session: currentSession },
      error: null
    })),
    getUser: vi.fn().mockImplementation(async () => ({
      data: { user: currentUser },
      error: null
    })),
    signInWithOAuth: vi.fn().mockImplementation(async ({ provider, options } = {}) => {
      if (initialState.oauthError) {
        return { data: null, error: initialState.oauthError };
      }
      const customName =
        options?.queryParams?.customDisplayName ||
        options?.data?.displayName ||
        options?.data?.full_name ||
        'Google 認證創作者';

      currentUser = {
        id: initialState.oauthUser?.id || 'google-oauth-user-id-99',
        email: initialState.oauthUser?.email || 'creator@meistudio.live',
        user_metadata: {
          full_name: customName,
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          has_password: false,
          ...(initialState.oauthUser?.user_metadata || {})
        },
        app_metadata: {
          provider: 'google',
          providers: ['google'],
          ...(initialState.oauthUser?.app_metadata || {})
        }
      };
      currentSession = {
        access_token: 'mock-google-access-token',
        user: currentUser
      };
      authListeners.forEach((cb) => cb('SIGNED_IN', currentSession));
      return { data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' }, error: null };
    }),
    signUp: vi.fn().mockImplementation(async ({ email, password, options = {} } = {}) => {
      if (initialState.signUpError) {
        return { data: null, error: initialState.signUpError };
      }
      const normEmail = String(email || '').trim().toLowerCase();
      const newUserId = options?.data?.sub || `user-uuid-${Math.random().toString(36).substring(2, 10)}`;
      currentUser = {
        id: newUserId,
        aud: 'authenticated',
        role: 'authenticated',
        email: normEmail,
        user_metadata: {
          display_name: options?.data?.displayName || options?.data?.display_name || normEmail.split('@')[0],
          full_name: options?.data?.displayName || options?.data?.full_name || normEmail.split('@')[0],
          tier: options?.data?.tier || 'explorer',
          has_password: true,
          ...(options?.data || {})
        },
        app_metadata: {
          provider: 'email',
          providers: ['email']
        },
        created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString()
      };
      currentSession = {
        access_token: `mock-email-access-token-${newUserId}`,
        token_type: 'bearer',
        user: currentUser
      };
      authListeners.forEach((cb) => cb('SIGNED_IN', currentSession));
      return {
        data: {
          user: currentUser,
          session: currentSession
        },
        error: null
      };
    }),
    signInWithPassword: vi.fn().mockImplementation(async ({ email, password } = {}) => {
      if (initialState.signInError || initialState.signInWithPasswordError) {
        return { data: null, error: initialState.signInError || initialState.signInWithPasswordError };
      }
      const normEmail = String(email || '').trim().toLowerCase();
      if (currentUser && currentUser.email === normEmail) {
        currentSession = {
          access_token: `mock-session-token-${currentUser.id}`,
          token_type: 'bearer',
          user: currentUser
        };
      } else {
        currentUser = {
          id: 'password-user-id-55',
          aud: 'authenticated',
          role: 'authenticated',
          email: normEmail,
          user_metadata: {
            display_name: normEmail.split('@')[0],
            full_name: normEmail.split('@')[0],
            tier: 'explorer',
            has_password: true
          },
          app_metadata: {
            provider: 'email',
            providers: ['email']
          },
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        };
        currentSession = {
          access_token: 'mock-password-access-token',
          token_type: 'bearer',
          user: currentUser
        };
      }
      authListeners.forEach((cb) => cb('SIGNED_IN', currentSession));
      return {
        data: {
          user: currentUser,
          session: currentSession
        },
        error: null
      };
    }),
    updateUser: vi.fn().mockImplementation(async (attributes = {}) => {
      if (initialState.updateUserError) {
        return { data: null, error: initialState.updateUserError };
      }
      if (!currentUser) {
        return { data: null, error: new Error('User not authenticated') };
      }
      if (attributes.data) {
        currentUser.user_metadata = {
          ...(currentUser.user_metadata || {}),
          ...attributes.data
        };
      }
      if (attributes.password) {
        currentUser.user_metadata = {
          ...(currentUser.user_metadata || {}),
          has_password: true
        };
      }
      if (attributes.email) {
        currentUser.email = String(attributes.email).trim().toLowerCase();
      }
      if (currentSession) {
        currentSession.user = currentUser;
      }
      authListeners.forEach((cb) => cb('USER_UPDATED', currentSession));
      return {
        data: { user: currentUser },
        error: null
      };
    }),
    linkIdentity: vi.fn().mockImplementation(async (credentials = {}) => {
      if (initialState.linkIdentityError) {
        return { data: null, error: initialState.linkIdentityError };
      }
      const provider = credentials?.provider || 'google';
      if (currentUser) {
        const existingProviders = currentUser.app_metadata?.providers || [currentUser.app_metadata?.provider || 'email'];
        if (!existingProviders.includes(provider)) {
          existingProviders.push(provider);
        }
        currentUser.app_metadata = {
          ...(currentUser.app_metadata || {}),
          providers: existingProviders
        };
        if (currentSession) {
          currentSession.user = currentUser;
        }
      }
      return {
        data: {
          provider,
          url: `https://accounts.google.com/o/oauth2/v2/auth?provider=${provider}`
        },
        error: null
      };
    }),
    resetPasswordForEmail: vi.fn().mockImplementation(async (email, options = {}) => {
      if (initialState.resetPasswordError) {
        return { data: null, error: initialState.resetPasswordError };
      }
      return { data: {}, error: null };
    }),
    signInWithPasskey: vi.fn().mockImplementation(async () => {
      if (initialState.passkeyError) {
        return { data: null, error: initialState.passkeyError };
      }
      currentUser = {
        id: 'passkey-user-id-88',
        email: 'passkey.member@meistudio.live',
        user_metadata: {
          full_name: '生物辨識通行會員',
          is_passkey_enabled: true
        },
        app_metadata: {
          provider: 'passkey',
          providers: ['passkey']
        }
      };
      currentSession = {
        access_token: 'mock-passkey-access-token',
        user: currentUser
      };
      authListeners.forEach((cb) => cb('SIGNED_IN', currentSession));
      return { data: { user: currentUser, session: currentSession }, error: null };
    }),
    signOut: vi.fn().mockImplementation(async () => {
      currentUser = null;
      currentSession = null;
      authListeners.forEach((cb) => cb('SIGNED_OUT', null));
      return { error: null };
    }),
    onAuthStateChange: vi.fn().mockImplementation((callback) => {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback)
          }
        }
      };
    }),
    passkey: {
      signInWithPasskey: vi.fn().mockImplementation(async () => {
        if (initialState.passkeyError) {
          return { data: null, error: initialState.passkeyError };
        }
        return {
          data: {
            user: {
              id: 'passkey-native-user-77',
              email: 'passkey@meistudio.live',
              app_metadata: { provider: 'passkey', providers: ['passkey'] },
              user_metadata: { is_passkey_enabled: true }
            }
          },
          error: null
        };
      }),
      registerPasskey: vi.fn().mockImplementation(async () => {
        if (initialState.registerPasskeyError) {
          return { data: null, error: initialState.registerPasskeyError };
        }
        return { data: { success: true }, error: null };
      })
    }
  };

  const createQueryBuilder = (tableName) => {
    const filters = [];
    let orderByColumns = [];
    let isUpdate = false;
    let updatePayload = null;

    const executeSelectOrUpdate = () => {
      if (isUpdate) {
        if (initialState.updateError) {
          return { data: null, error: initialState.updateError };
        }
        const tableData = getTableData(tableName);
        const updatedRows = [];
        tableData.forEach((row, idx) => {
          const matches = filters.every((f) => row[f.column] === f.value);
          if (matches) {
            tableData[idx] = { ...tableData[idx], ...updatePayload };
            updatedRows.push(tableData[idx]);
          }
        });
        return { data: updatedRows, error: null };
      }

      if (initialState.selectError) {
        return { data: null, error: initialState.selectError };
      }

      let result = [...getTableData(tableName)];
      if (filters.length > 0) {
        result = result.filter((p) => filters.every((f) => p[f.column] === f.value));
      }
      if (orderByColumns.length > 0) {
        result.sort((a, b) => {
          for (const { column, ascending } of orderByColumns) {
            const valA = a[column];
            const valB = b[column];
            if (valA !== valB) {
              if (ascending) return valA > valB ? 1 : -1;
              return valA < valB ? 1 : -1;
            }
          }
          return 0;
        });
      }
      return { data: result, error: null };
    };

    const builder = {
      select: vi.fn().mockImplementation((columns = '*') => {
        return builder;
      }),
      order: vi.fn().mockImplementation((column, opts = {}) => {
        orderByColumns.push({ column, ascending: opts.ascending !== false });
        return builder;
      }),
      eq: vi.fn().mockImplementation((column, value) => {
        filters.push({ column, value });
        return builder;
      }),
      update: vi.fn().mockImplementation((updates, options = {}) => {
        isUpdate = true;
        updatePayload = updates;
        return builder;
      }),
      insert: vi.fn().mockImplementation((records, options = {}) => {
        const executeInsert = () => {
          if (initialState.insertError) {
            return { data: null, error: initialState.insertError };
          }
          const tableData = getTableData(tableName);
          const recordList = (Array.isArray(records) ? records : [records]).map((r) => ({
            id: r.id || `${tableName}-${Math.random().toString(36).substring(2, 9)}`,
            ...r
          }));
          recordList.forEach((rec) => tableData.push(rec));
          return { data: recordList, error: null };
        };

        const insertPromise = Promise.resolve().then(executeInsert);
        insertPromise.select = vi.fn().mockImplementation(() => insertPromise);
        insertPromise.single = vi.fn().mockImplementation(async () => {
          const res = await insertPromise;
          if (res.error) return res;
          return { data: res.data?.[0] || null, error: null };
        });
        insertPromise.maybeSingle = vi.fn().mockImplementation(async () => {
          const res = await insertPromise;
          if (res.error) return res;
          return { data: res.data?.[0] || null, error: null };
        });
        return insertPromise;
      }),
      upsert: vi.fn().mockImplementation((records, options = {}) => {
        const executeUpsert = () => {
          if (initialState.upsertError) {
            return { data: null, error: initialState.upsertError };
          }
          const tableData = getTableData(tableName);
          const recordList = Array.isArray(records) ? records : [records];
          const conflictKey = options.onConflict || 'id';

          recordList.forEach((rec) => {
            const idx = tableData.findIndex((p) =>
              (rec[conflictKey] !== undefined && p[conflictKey] === rec[conflictKey]) ||
              (rec.id !== undefined && p.id === rec.id)
            );
            if (idx >= 0) {
              tableData[idx] = { ...tableData[idx], ...rec };
            } else {
              tableData.push(rec);
            }
          });
          return { data: recordList, error: null };
        };

        const upsertPromise = Promise.resolve().then(executeUpsert);
        upsertPromise.select = vi.fn().mockImplementation(() => upsertPromise);
        upsertPromise.single = vi.fn().mockImplementation(async () => {
          const res = await upsertPromise;
          if (res.error) return res;
          return { data: res.data?.[0] || null, error: null };
        });
        upsertPromise.maybeSingle = vi.fn().mockImplementation(async () => {
          const res = await upsertPromise;
          if (res.error) return res;
          return { data: res.data?.[0] || null, error: null };
        });
        return upsertPromise;
      }),
      single: vi.fn().mockImplementation(async () => {
        const res = executeSelectOrUpdate();
        if (res.error) return res;
        const list = res.data || [];
        if (list.length === 0 || list.length > 1) {
          return {
            data: null,
            error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }
          };
        }
        return { data: list[0], error: null };
      }),
      maybeSingle: vi.fn().mockImplementation(async () => {
        const res = executeSelectOrUpdate();
        if (res.error) return res;
        const list = res.data || [];
        if (list.length === 0) {
          return { data: null, error: null };
        }
        if (list.length > 1) {
          return {
            data: null,
            error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }
          };
        }
        return { data: list[0], error: null };
      }),
      delete: vi.fn().mockImplementation(() => {
        return {
          eq: vi.fn().mockImplementation(async (col, val) => {
            if (initialState.deleteError) {
              return { data: null, error: initialState.deleteError };
            }
            const tableData = getTableData(tableName);
            const remaining = tableData.filter((p) => p[col] !== val);
            setTableData(tableName, remaining);
            return { data: null, error: null };
          })
        };
      }),
      then: (resolve, reject) => {
        const res = executeSelectOrUpdate();
        return resolve(res);
      }
    };

    return builder;
  };

  const client = {
    auth: mockAuth,
    from: vi.fn().mockImplementation((tableName) => createQueryBuilder(tableName)),
    channel: vi.fn().mockImplementation((channelName) => {
      const channelObj = {
        on: vi.fn().mockImplementation((event, filter, callback) => {
          const table = filter?.table || '*';
          if (!realtimeListeners.has(table)) {
            realtimeListeners.set(table, new Set());
          }
          realtimeListeners.get(table).add(callback);
          return channelObj;
        }),
        subscribe: vi.fn().mockImplementation((statusCallback) => {
          if (typeof statusCallback === 'function') {
            statusCallback('SUBSCRIBED');
          }
          return channelObj;
        }),
        unsubscribe: vi.fn().mockImplementation(() => {
          realtimeListeners.clear();
          return Promise.resolve();
        })
      };
      return channelObj;
    }),
    triggerMockRealtimeEvent: (table, eventType, newRecord, oldRecord) => {
      const listeners = realtimeListeners.get(table) || realtimeListeners.get('*');
      if (listeners) {
        listeners.forEach((cb) => {
          cb({
            eventType,
            new: newRecord || null,
            old: oldRecord || null,
            table
          });
        });
      }
    },
    _getProjectsData: () => getTableData('mei_member_projects'),
    _setProjectsData: (newData) => {
      setTableData('mei_member_projects', [...newData]);
    },
    _getProfilesData: () => getTableData('mei_member_profiles'),
    _setProfilesData: (newData) => {
      setTableData('mei_member_profiles', [...newData]);
    },
    _getPasskeysData: () => getTableData('mei_member_passkeys'),
    _setPasskeysData: (newData) => {
      setTableData('mei_member_passkeys', [...newData]);
    },
    _getTableData: (name) => getTableData(name)
  };

  return client;
}

/**
 * Centralized setup and teardown for E2E tests
 */
export function setupE2ETestEnvironment(options = {}) {
  const {
    skipIntro = true,
    viewport = { width: 1280, height: 800 },
    clearStorage = true,
    cleanDom = true,
    seedProjects = true
  } = options;

  beforeEach(() => {
    // 1. Storage isolation
    if (clearStorage && typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      if (skipIntro) {
        // Prevents the 5-second PortalEntrance intro animation from delaying other tests
        window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
      }
      if (seedProjects) {
        window.localStorage.setItem('mei_studio_projects_v1', JSON.stringify(SAMPLE_E2E_PROJECTS));
      }
    }

    // 2. DOM isolation
    if (cleanDom && typeof document !== 'undefined') {
      document.documentElement.className = '';
      document.body.innerHTML = '';
      if (typeof window !== 'undefined') {
        window.location.hash = '';
      }
    }

    // 3. Viewport simulation
    simulateViewport(viewport.width, viewport.height);

    // 4. Robust matchMedia polyfill in JSDOM supporting width, height, orientation, and aspect-ratio
    if (typeof window !== 'undefined') {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: evaluateMediaQuery(query, window.innerWidth, window.innerHeight),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn().mockReturnValue(false)
      }));
    }

    // 5. Setup BroadcastChannel simulation
    if (typeof window !== 'undefined') {
      window.BroadcastChannel = MemoryBroadcastChannel;
    }
    MemoryBroadcastChannel.resetAll();

    // 6. Default WebAuthn mock
    mockWebAuthnCredentials({ supported: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (cleanDom && typeof document !== 'undefined') {
      document.documentElement.className = '';
      document.body.innerHTML = '';
    }
    MemoryBroadcastChannel.resetAll();
  });
}
