import React from 'react';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import App from '../App';
import {
  loadCurrentMember,
  signOutMember,
  MEMBER_SSO_BROADCAST_CHANNEL
} from '../services/memberAuthService';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

// Hoisted Supabase Client Mock
const { mockAuth, mockState } = vi.hoisted(() => {
  const state = {
    mockAuthStateListener: null,
    mockCurrentSession: null
  };

  const auth = {
    signInWithOAuth: vi.fn(async ({ provider, options }) => {
      if (provider === 'google') {
        return {
          data: {
            provider: 'google',
            url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=mock'
          },
          error: null
        };
      }
      if (provider === 'apple') {
        return {
          data: { provider: 'apple', url: null },
          error: new Error('Apple Sign-in is currently reserved and awaiting backend configuration')
        };
      }
      return { data: { provider, url: null }, error: null };
    }),

    signInWithPassword: vi.fn(async ({ email, password }) => {
      const user = {
        id: 'mock-user-uuid-1234',
        aud: 'authenticated',
        role: 'authenticated',
        email,
        user_metadata: { display_name: 'Alex Chen', tier: 'creator' },
        app_metadata: { provider: 'email' },
        created_at: '2026-11-14T10:00:00.000Z',
        last_sign_in_at: '2026-11-14T10:00:00.000Z'
      };
      const session = {
        access_token: 'mock-token-jwt',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user
      };
      state.mockCurrentSession = session;
      state.mockAuthStateListener?.('SIGNED_IN', session);
      return { data: { user, session }, error: null };
    }),

    signUp: vi.fn(async ({ email, password, options }) => {
      const user = {
        id: 'mock-user-uuid-5678',
        aud: 'authenticated',
        role: 'authenticated',
        email,
        user_metadata: options?.data || { display_name: 'New Explorer', tier: 'explorer' },
        app_metadata: { provider: 'email' },
        created_at: '2026-11-14T10:00:00.000Z',
        last_sign_in_at: '2026-11-14T10:00:00.000Z'
      };
      const session = {
        access_token: 'mock-signup-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user
      };
      state.mockCurrentSession = session;
      state.mockAuthStateListener?.('SIGNED_IN', session);
      return { data: { user, session }, error: null };
    }),

    signOut: vi.fn(async () => {
      state.mockCurrentSession = null;
      state.mockAuthStateListener?.('SIGNED_OUT', null);
      return { error: null };
    }),

    getSession: vi.fn(async () => {
      return { data: { session: state.mockCurrentSession }, error: null };
    }),

    getUser: vi.fn(async () => {
      return { data: { user: state.mockCurrentSession?.user || null }, error: null };
    }),

    onAuthStateChange: vi.fn((callback) => {
      state.mockAuthStateListener = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(() => {
              if (state.mockAuthStateListener === callback) {
                state.mockAuthStateListener = null;
              }
            })
          }
        }
      };
    }),

    passkey: {
      signInWithPasskey: vi.fn(async () => {
        const user = {
          id: 'mock-passkey-uuid',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'passkey.user@meistudio.live',
          user_metadata: { display_name: 'Passkey Creator', tier: 'architect' },
          app_metadata: { provider: 'passkey' },
          created_at: '2026-11-14T10:00:00.000Z',
          last_sign_in_at: '2026-11-14T10:00:00.000Z'
        };
        const session = {
          access_token: 'mock-passkey-token',
          user
        };
        state.mockCurrentSession = session;
        state.mockAuthStateListener?.('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      }),
      registerPasskey: vi.fn(async () => ({
        data: { id: 'mock-passkey-cred-id' },
        error: null
      }))
    }
  };

  return { mockAuth: auth, mockState: state };
});

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: mockAuth
  }
}));

describe('全站聯通雲端會員專區 (Supabase 認證)、頁尾管理員解鎖、亮色淡藍通知與安裝指南無綠燈驗證', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
    mockState.mockCurrentSession = null;
    mockState.mockAuthStateListener = null;
    vi.clearAllMocks();

    if (typeof window !== 'undefined' && !window.BroadcastChannel && typeof BroadcastChannel !== 'undefined') {
      window.BroadcastChannel = BroadcastChannel;
    }
  });

  it('1. 導覽列與頁尾配置：頂部導覽列顯示「會員專區」，「管理員解鎖」移設至主頁面底部頁尾', () => {
    const { container } = render(<App />);

    const headerEl = container.querySelector('header');
    const footerEl = container.querySelector('footer');

    const memberBtn = within(headerEl).getByTestId('header-member-portal-btn');
    expect(memberBtn).toBeInTheDocument();
    expect(memberBtn).toHaveTextContent('會員專區');
    expect(within(headerEl).queryByText('管理員解鎖')).not.toBeInTheDocument();

    const footerUnlockBtn = within(footerEl).getByTestId('footer-admin-unlock-btn');
    expect(footerUnlockBtn).toBeInTheDocument();
    expect(footerUnlockBtn).toHaveTextContent('管理員解鎖');

    fireEvent.click(footerUnlockBtn);
    fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
      target: { value: 'mei888' }
    });
    fireEvent.click(screen.getByText('立即解鎖管理後台'));

    const footerLockBtn = within(footerEl).getByTestId('footer-admin-lock-btn');
    expect(footerLockBtn).toBeInTheDocument();
    expect(footerLockBtn).toHaveTextContent('管理員已解鎖');
  });

  it('2. 會員專區未登入介面：顯示 StudioLogo、多元登入按鈕 (Google/Apple/Passkey/Email)，並徹底清除歷史漫遊與雙引擎分頁', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('header-member-portal-btn'));
    const modal = screen.getByTestId('member-portal-modal');
    expect(modal).toBeInTheDocument();

    // 驗證品牌識別商標
    const logo = within(modal).getByTestId('studio-brand-logo');
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute('data-logo-size')).toBe('md');

    // 驗證多元登入按鈕
    expect(within(modal).getByTestId('member-google-login-btn')).toBeInTheDocument();
    expect(within(modal).getByTestId('member-apple-login-btn')).toBeInTheDocument();
    expect(within(modal).getByTestId('member-passkey-login-btn')).toBeInTheDocument();
    expect(within(modal).getByTestId('member-email-submit-btn')).toBeInTheDocument();

    // 負向驗證：徹底排除歷史模擬代碼分頁與按鈕
    expect(within(modal).queryByText('跨裝置漫遊同步')).not.toBeInTheDocument();
    expect(within(modal).queryByText('雙引擎融合架構')).not.toBeInTheDocument();
    expect(within(modal).queryByTestId('copy-roaming-code-btn')).not.toBeInTheDocument();
    expect(within(modal).queryByTestId('import-roaming-code-btn')).not.toBeInTheDocument();
  });

  it('3. Google OAuth 登入動作：正確調用 signInWithOAuth 且驗證參數', async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('header-member-portal-btn'));
    const googleBtn = screen.getByTestId('member-google-login-btn');

    await act(async () => {
      fireEvent.click(googleBtn);
    });

    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.any(String)
        })
      })
    );
  });

  it('4. Apple 登入預留介面：調用 signInWithOAuth 並在未配置憑證時具備友善降級防護', async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('header-member-portal-btn'));
    const appleBtn = screen.getByTestId('member-apple-login-btn');

    await act(async () => {
      fireEvent.click(appleBtn);
    });

    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        options: expect.objectContaining({
          redirectTo: expect.any(String)
        })
      })
    );

    // 驗證彈窗仍保持開啟，且捕捉錯誤呈現提示或容錯狀態
    expect(screen.getByTestId('member-portal-modal')).toBeInTheDocument();
  });

  it('5. 已登入狀態會員數位通行證展示與全站登出流程', async () => {
    const mockMember = {
      unionId: 'mei_user_mock-uuid-7890',
      uid: 'mock-uuid-7890',
      email: 'alex.chen@meistudio.live',
      displayName: 'Alex Chen',
      avatarUrl: '',
      tier: 'creator',
      tierLabel: '星系創作者',
      authProviders: ['google'],
      isPasskeyEnabled: false,
      connectedProjects: ['*'],
      lastSignInAt: '2026-11-14T10:00:00.000Z'
    };

    window.localStorage.setItem('mei_universal_member_sso_v1', JSON.stringify(mockMember));

    render(<App />);

    fireEvent.click(screen.getByTestId('header-member-portal-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('member-profile-card')).toBeInTheDocument();
    });

    const card = screen.getByTestId('member-profile-card');
    expect(card).toHaveTextContent('Alex Chen');
    expect(card).toHaveTextContent('alex.chen@meistudio.live');
    expect(card).toHaveTextContent('mei_user_mock-uuid-7890');

    // 點擊全站登出
    const signOutBtn = screen.getByTestId('member-signout-btn');
    await act(async () => {
      fireEvent.click(signOutBtn);
    });

    await waitFor(() => {
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    expect(loadCurrentMember()).toBeNull();
  });

  it('6. 跨分頁與子專案 BroadcastChannel 廣播連通性驗證', async () => {
    const receivedMessages = [];
    const testChannel = new BroadcastChannel(MEMBER_SSO_BROADCAST_CHANNEL);
    testChannel.onmessage = (evt) => {
      receivedMessages.push(evt.data);
    };

    render(<App />);

    // 觸發登出
    await signOutMember();

    await waitFor(() => {
      const hasSignOutMsg = receivedMessages.some(
        (msg) => msg.type === 'MEMBER_SIGNED_OUT' || msg.type === 'MEMBER_LOGOUT'
      );
      expect(hasSignOutMsg).toBe(true);
    });

    testChannel.close();
  });

  it('7. 亮色模式下右下角彈出通知 (studio-toast) 底色為淡藍色 (bg-sky-100/95) 且文字深色高對比', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('footer-admin-unlock-btn'));
    fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
      target: { value: 'mei888' }
    });
    fireEvent.click(screen.getByText('立即解鎖管理後台'));

    const toastEl = screen.getByTestId('studio-toast');
    expect(toastEl).toBeInTheDocument();
    expect(toastEl.className).toContain('bg-sky-100/95');
    expect(toastEl.className).toContain('text-slate-900');
    expect(toastEl.className).toContain('border-sky-300/80');
  });

  it('8. 點擊「安裝應用」進入安裝指南時，裝置偵測區塊已移除綠色呼吸燈動畫 (status-pulse-ring)', () => {
    render(<App />);

    const installBtns = screen.getAllByTitle('安裝至桌面或主畫面指南');
    fireEvent.click(installBtns[0]);

    const detectionCard = screen.getByTestId('device-detection-card');
    expect(detectionCard).toBeInTheDocument();
    expect(detectionCard.querySelector('.status-pulse-ring')).toBeNull();
  });

  it('9. 會員系統與 Supabase 相關原始碼嚴格遵守 0 系統 Emoji 規範', () => {
    const files = [
      'src/services/memberAuthService.js',
      'src/components/MemberPortalModal.jsx'
    ];
    if (fs.existsSync(path.resolve('src/services/supabaseClient.js'))) {
      files.push('src/services/supabaseClient.js');
    }
    for (const rel of files) {
      const content = fs.readFileSync(path.resolve(rel), 'utf-8');
      expect(EMOJI_REGEX.test(content)).toBe(false);
    }
  });
});
