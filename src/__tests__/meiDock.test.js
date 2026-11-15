/**
 * 咩創意工作室 (Mei Creative Studio) - Milestone 3: Cross-Project SSO SDK (mei-dock.js) Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, waitFor } from '@testing-library/react';
import {
  generateMemberSsoToken,
  verifyMemberSsoToken,
  MEMBER_SSO_STORAGE_KEY,
  MEMBER_SSO_BROADCAST_CHANNEL
} from '../services/memberAuthService.js';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/u;

function mountDock(attributes = {}) {
  delete window.__MEI_STUDIO_DOCK_MOUNTED__;
  delete window.MeiStudioSSO;
  const existing = document.getElementById('mei-studio-dock-root');
  if (existing) existing.remove();
  document.querySelectorAll('script[src*="mei-dock.js"]').forEach((s) => s.remove());

  const scriptEl = document.createElement('script');
  scriptEl.setAttribute('src', '/sdk/mei-dock.js');
  Object.entries(attributes).forEach(([k, v]) => scriptEl.setAttribute(k, v));
  document.body.appendChild(scriptEl);

  const code = fs.readFileSync(path.resolve('public/sdk/mei-dock.js'), 'utf-8');
  new Function(code)();
  return document.getElementById('mei-studio-dock-root');
}

describe('Milestone 3: Mei Studio Universal SSO SDK (mei-dock.js)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.__XSS_FIRED__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.__MEI_STUDIO_DOCK_MOUNTED__;
    delete window.MeiStudioSSO;
    delete window.__XSS_FIRED__;
    const existing = document.getElementById('mei-studio-dock-root');
    if (existing) existing.remove();
    document.querySelectorAll('script[src*="mei-dock.js"]').forEach((s) => s.remove());
    window.localStorage.clear();
  });

  // Suite 1: getMember()
  describe('1. window.MeiStudioSSO.getMember()', () => {
    it('returns null when unauthenticated', () => {
      mountDock();
      expect(window.MeiStudioSSO.getMember()).toBeNull();
      expect(window.MeiStudioSSO.currentMember).toBeNull();
    });

    it('returns parsed member profile when valid profile is stored in localStorage', () => {
      const mockMember = {
        unionId: 'mei_user_dock_test',
        displayName: '膠囊測試員',
        email: 'dock.tester@meistudio.live',
        tier: 'creator'
      };
      window.localStorage.setItem(MEMBER_SSO_STORAGE_KEY, JSON.stringify(mockMember));
      mountDock();

      const member = window.MeiStudioSSO.getMember();
      expect(member).toEqual(expect.objectContaining({ unionId: 'mei_user_dock_test', displayName: '膠囊測試員' }));
      expect(window.MeiStudioSSO.currentMember).toEqual(member);
    });

    it('rejects legacy MEI-SSO- roaming tokens in storage', () => {
      window.localStorage.setItem(MEMBER_SSO_STORAGE_KEY, 'MEI-SSO-eyJ1bmlvbklkIjoibWVpX3VzZXJfMTIzIn0=');
      mountDock();
      expect(window.MeiStudioSSO.getMember()).toBeNull();
    });

    it('handles malformed JSON in storage gracefully', () => {
      window.localStorage.setItem(MEMBER_SSO_STORAGE_KEY, '{corrupted-json');
      mountDock();
      expect(window.MeiStudioSSO.getMember()).toBeNull();
    });
  });

  // Suite 2: onAuthStateChange()
  describe('2. window.MeiStudioSSO.onAuthStateChange()', () => {
    it('receives BroadcastChannel updates, storage event updates, and respects unsubscribe', async () => {
      mountDock();
      const updates = [];
      const unsubscribe = window.MeiStudioSSO.onAuthStateChange((m) => updates.push(m));

      // BroadcastChannel notification
      const channel = new BroadcastChannel(MEMBER_SSO_BROADCAST_CHANNEL);
      const newMember = { unionId: 'mei_user_bc_sync', displayName: '廣播同步會員' };
      channel.postMessage({ type: 'SSO_UPDATE', member: newMember });

      await waitFor(() => {
        expect(updates.length).toBeGreaterThanOrEqual(1);
      });
      expect(updates[updates.length - 1].displayName).toBe('廣播同步會員');

      // Storage event notification
      const storageMember = { unionId: 'mei_user_storage_sync', displayName: '存儲同步會員' };
      window.localStorage.setItem(MEMBER_SSO_STORAGE_KEY, JSON.stringify(storageMember));
      window.dispatchEvent(new StorageEvent('storage', { key: MEMBER_SSO_STORAGE_KEY }));

      expect(updates[updates.length - 1].displayName).toBe('存儲同步會員');

      // Unsubscribe cleanup
      const countBeforeUnsub = updates.length;
      unsubscribe();
      channel.postMessage({ type: 'SSO_UPDATE', member: null });
      window.dispatchEvent(new StorageEvent('storage', { key: MEMBER_SSO_STORAGE_KEY }));
      expect(updates.length).toBe(countBeforeUnsub);
      channel.close();
    });
  });

  // Suite 3: getToken() & generateToken()
  describe('3. window.MeiStudioSSO.getToken() & generateToken()', () => {
    it('returns null when unauthenticated', async () => {
      mountDock();
      expect(window.MeiStudioSSO.getToken()).toBeNull();
      expect(await window.MeiStudioSSO.generateToken()).toBeNull();
    });

    it('returns a valid 4-part mei_sso_v2 token cross-verified by memberAuthService', async () => {
      const mockMember = {
        unionId: 'mei_user_token_gen',
        uid: '00000000-0000-0000-0000-000000000001',
        displayName: 'Token 產生者',
        email: 'token.gen@meistudio.live',
        tier: 'explorer'
      };
      window.localStorage.setItem(MEMBER_SSO_STORAGE_KEY, JSON.stringify(mockMember));
      mountDock();

      const syncToken = window.MeiStudioSSO.getToken();
      expect(typeof syncToken).toBe('string');
      expect(syncToken.startsWith('mei_sso_v2.')).toBe(true);
      expect(syncToken.split('.')).toHaveLength(4);

      const serviceVerifySync = await verifyMemberSsoToken(syncToken);
      expect(serviceVerifySync.valid).toBe(true);
      expect(serviceVerifySync.payload.unionId).toBe('mei_user_token_gen');

      const asyncToken = await window.MeiStudioSSO.generateToken(mockMember);
      expect(asyncToken.startsWith('mei_sso_v2.')).toBe(true);
      const serviceVerifyAsync = await verifyMemberSsoToken(asyncToken);
      expect(serviceVerifyAsync.valid).toBe(true);
      expect(serviceVerifyAsync.payload.email).toBe('token.gen@meistudio.live');
    });
  });

  // Suite 4: verifyToken()
  describe('4. window.MeiStudioSSO.verifyToken()', () => {
    it('verifies tokens generated by memberAuthService.generateMemberSsoToken', async () => {
      mountDock();
      const mockMember = {
        unionId: 'mei_user_sdk_verify',
        uid: '00000000-0000-0000-0000-000000000002',
        displayName: '跨專案漫遊驗證者',
        email: 'roam@meistudio.live',
        tier: 'creator'
      };
      const token = await generateMemberSsoToken(mockMember);
      const res = await window.MeiStudioSSO.verifyToken(token);

      expect(res.valid).toBe(true);
      expect(res.payload.unionId).toBe('mei_user_sdk_verify');
      expect(res.profile.displayName).toBe('跨專案漫遊驗證者');
      expect(res.error).toBeNull();
    });

    it('rejects tampered token signatures', async () => {
      mountDock();
      const mockMember = { unionId: 'mei_user_tamper', email: 'tamper@meistudio.live' };
      const token = await generateMemberSsoToken(mockMember);
      const parts = token.split('.');
      const tampered = `${parts[0]}.${parts[1]}.${parts[2]}.bad_signature_hex`;

      const res = await window.MeiStudioSSO.verifyToken(tampered);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Invalid SSO Token signature');
    });

    it('rejects expired tokens', async () => {
      mountDock();
      const mockMember = { unionId: 'mei_user_expired', email: 'expired@meistudio.live' };
      const eightDaysAgo = Date.now() - 8 * 86400 * 1000;
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(eightDaysAgo);
      const expiredToken = await generateMemberSsoToken(mockMember);
      nowSpy.mockRestore();

      const res = await window.MeiStudioSSO.verifyToken(expiredToken);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('SSO Token has expired');
    });

    it('rejects legacy MEI-SSO- tokens', async () => {
      mountDock();
      const res = await window.MeiStudioSSO.verifyToken('MEI-SSO-eyJ1bmlvbklkIjoibWVpX3VzZXJfMTI1In0=');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Legacy MEI-SSO token is deprecated and rejected');
    });

    it('rejects empty, non-string, or malformed tokens', async () => {
      mountDock();
      expect((await window.MeiStudioSSO.verifyToken('')).valid).toBe(false);
      expect((await window.MeiStudioSSO.verifyToken(null)).valid).toBe(false);
      expect((await window.MeiStudioSSO.verifyToken(12345)).valid).toBe(false);
      expect((await window.MeiStudioSSO.verifyToken('invalid.token.parts')).valid).toBe(false);
    });
  });

  // Suite 5: Dock UI Interactions & Zero Unicode Emoji
  describe('5. Dock UI Interactions, XSS Sanitization & Zero Unicode Emoji', () => {
    it('toggles popover, collapses capsule, and sanitizes malicious project/URL attributes', () => {
      const root = mountDock({
        'data-project-name': '互動白板 <img src=x onerror="window.__XSS_FIRED__=true">',
        'data-hub-url': 'javascript:alert(1)'
      });
      expect(root).toBeInTheDocument();
      expect(window.__XSS_FIRED__).toBeUndefined();
      expect(root.querySelector('img')).toBeNull();

      const returnLink = root.querySelector('#mei-dock-return-link');
      expect(returnLink.getAttribute('href')).toBe('/');

      const switcherBtn = root.querySelector('#mei-dock-switcher-btn');
      const popover = root.querySelector('#mei-dock-popover');
      expect(popover).not.toHaveClass('open');

      fireEvent.click(switcherBtn);
      expect(popover).toHaveClass('open');

      const toggleBtn = root.querySelector('#mei-dock-toggle-btn');
      fireEvent.click(toggleBtn);
      expect(root).toHaveClass('mei-dock-collapsed');
      expect(popover).not.toHaveClass('open');
    });

    it('adheres 100% to Zero Unicode Emoji mandate in source and rendered DOM', () => {
      const code = fs.readFileSync(path.resolve('public/sdk/mei-dock.js'), 'utf-8');
      expect(EMOJI_REGEX.test(code)).toBe(false);

      const root = mountDock();
      expect(EMOJI_REGEX.test(root.innerHTML)).toBe(false);
    });
  });
});
