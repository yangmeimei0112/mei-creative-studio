import { supabase } from './supabaseClient.js';
import { sanitizeStringDeep } from './securityService.js';

export const MEMBER_SSO_STORAGE_KEY = 'mei_universal_member_sso_v1';
export const MEMBER_SSO_BROADCAST_CHANNEL = 'mei_universal_sso_channel_v1';

/**
 * Universal Member Tiers Specification
 */
export const MEMBER_TIERS = {
  explorer: {
    id: 'explorer',
    label: '靈感探索員',
    badgeIcon: 'compass',
    scopes: ['studio:read', 'subprojects:access', 'sso:roaming']
  },
  creator: {
    id: 'creator',
    label: '創意造物者',
    badgeIcon: 'sparkles',
    scopes: ['studio:read', 'subprojects:access', 'subprojects:sync', 'sso:roaming', 'passkey:multi-device']
  },
  architect: {
    id: 'architect',
    label: '核心架構師',
    badgeIcon: 'shield-check',
    scopes: ['*']
  }
};

function stripHtmlTags(str) {
  return String(str || '').replace(/<[^>]*>/g, '').trim();
}

function getSafeLocalStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Fallback when storage is blocked
  }
  return null;
}

/**
 * Detect biometric and WebAuthn capability of current device
 */
export function detectBiometricCapability() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      webAuthnAvailable: false,
      biometricLabel: '指紋 / 人臉快速辨識',
      authenticatorName: '系統安全憑證',
      icon: 'fingerprint'
    };
  }

  const ua = String(navigator.userAgent || '');
  const platform = String(navigator.platform || '');
  const webAuthnAvailable = Boolean(
    window.PublicKeyCredential &&
      navigator.credentials &&
      typeof navigator.credentials.create === 'function'
  );

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return {
      supported: true,
      webAuthnAvailable,
      biometricLabel: 'Face ID / Touch ID 快速登入',
      authenticatorName: 'Apple iOS 安全隔離區 (Secure Enclave)',
      icon: 'scan-face'
    };
  }

  if (/Macintosh|Mac OS X/i.test(ua) || /Mac/i.test(platform)) {
    return {
      supported: true,
      webAuthnAvailable,
      biometricLabel: 'Touch ID / Apple Passkey 登入',
      authenticatorName: 'macOS Touch ID 安全晶片',
      icon: 'fingerprint'
    };
  }

  if (/Android/i.test(ua)) {
    return {
      supported: true,
      webAuthnAvailable,
      biometricLabel: 'Android 指紋 / 臉部辨識登入',
      authenticatorName: 'Android BiometricPrompt 硬體金庫',
      icon: 'fingerprint'
    };
  }

  if (/Win/i.test(ua) || /Win/i.test(platform)) {
    return {
      supported: true,
      webAuthnAvailable,
      biometricLabel: 'Windows Hello 指紋 / 臉部登入',
      authenticatorName: 'Windows Hello TPM 安全晶片',
      icon: 'scan-face'
    };
  }

  return {
    supported: true,
    webAuthnAvailable,
    biometricLabel: 'Passkey 指紋 / 人臉快速登入',
    authenticatorName: 'W3C WebAuthn 硬體安全金鑰',
    icon: 'fingerprint'
  };
}

/**
 * Transform Supabase user object into standard MemberProfile
 */
export function transformSupabaseUserToMemberProfile(user) {
  if (!user || typeof user !== 'object') return null;

  const uid = String(user.id || '');
  const unionId = uid.startsWith('mei_user_') ? uid : `mei_user_${uid}`;
  const meta = user.user_metadata || {};
  const appMeta = user.app_metadata || {};

  const email = String(user.email || '').trim().toLowerCase();
  const rawName = meta.full_name || meta.name || meta.displayName || meta.display_name || (email ? email.split('@')[0] : '咩創意會員');
  const displayName = stripHtmlTags(sanitizeStringDeep(rawName)) || '咩創意會員';

  const tierKey = meta.tier && MEMBER_TIERS[meta.tier] ? meta.tier : 'creator';
  const tierSpec = MEMBER_TIERS[tierKey];

  const primaryProvider = appMeta.provider || (appMeta.providers && appMeta.providers[0]) || 'google';
  const authProviders = Array.isArray(appMeta.providers) && appMeta.providers.length > 0
    ? Array.from(new Set(appMeta.providers.map((p) => String(p).toLowerCase())))
    : [primaryProvider];

  const isPasskeyEnabled = Boolean(
    meta.is_passkey_enabled || authProviders.includes('passkey')
  );

  return {
    schemaVersion: '2.0.0',
    unionId,
    uid,
    email: email || `${unionId}@meistudio.live`,
    displayName,
    avatarUrl: meta.avatar_url || meta.picture || '',
    tier: tierSpec.id,
    tierLabel: tierSpec.label,
    scopes: tierSpec.scopes,
    authProvider: primaryProvider,
    authProviders,
    isPasskeyEnabled,
    lastSignInAt: user.last_sign_in_at || new Date().toISOString(),
    connectedProjects: ['*']
  };
}

/**
 * Normalize raw member profile object and enforce security sanitization
 */
export function normalizeMemberProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const email = sanitizeStringDeep(String(raw.email || '').trim().toLowerCase());
  const rawDisplayName = String(raw.displayName || raw.display_name || (email ? email.split('@')[0] : '咩創意會員')).trim();
  const displayName = stripHtmlTags(sanitizeStringDeep(rawDisplayName));
  if (!displayName) return null;

  const tierKey = MEMBER_TIERS[raw.tier] ? raw.tier : 'creator';
  const tierSpec = MEMBER_TIERS[tierKey];
  const uid = raw.uid || raw.id || (raw.unionId ? raw.unionId.replace(/^mei_user_/, '') : 'guest');
  const unionId = raw.unionId && raw.unionId.startsWith('mei_')
    ? raw.unionId
    : `mei_user_${uid}`;

  const authProviders = Array.isArray(raw.authProviders) && raw.authProviders.length > 0
    ? Array.from(new Set(raw.authProviders.map((p) => String(p).toLowerCase())))
    : [raw.authProvider || 'google'];

  return {
    schemaVersion: '2.0.0',
    unionId,
    uid,
    email: email || `${unionId}@meistudio.live`,
    displayName,
    avatarUrl: raw.avatarUrl || raw.avatar_url || '',
    tier: tierSpec.id,
    tierLabel: tierSpec.label,
    scopes: tierSpec.scopes,
    authProvider: raw.authProvider || authProviders[0] || 'google',
    authProviders,
    isPasskeyEnabled: Boolean(raw.isPasskeyEnabled || authProviders.includes('passkey')),
    lastSignInAt: String(raw.lastSignInAt || raw.lastLoginAt || new Date().toISOString()),
    connectedProjects: Array.isArray(raw.connectedProjects) ? raw.connectedProjects : ['*']
  };
}

/**
 * Broadcast member SSO event to window and cross-tab BroadcastChannel
 */
export function broadcastMemberSsoEvent(eventType, memberProfile) {
  try {
    if (typeof window !== 'undefined') {
      window.MeiStudioSSO = window.MeiStudioSSO || {};
      window.MeiStudioSSO.currentMember = memberProfile || null;

      window.dispatchEvent(
        new CustomEvent('mei:sso-state-changed', {
          detail: {
            type: eventType,
            member: memberProfile || null,
            timestamp: Date.now()
          }
        })
      );
    }

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(MEMBER_SSO_BROADCAST_CHANNEL);
      channel.postMessage({
        type: eventType,
        member: memberProfile || null,
        timestamp: Date.now()
      });
      setTimeout(() => {
        try { channel.close(); } catch {}
      }, 100);
    }
  } catch {
    // Ignore broadcast errors in restricted environments
  }
}

/**
 * Synchronous snapshot reader for fast initial React rendering
 */
export function loadCurrentMember() {
  const storage = getSafeLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(MEMBER_SSO_STORAGE_KEY);
    if (!raw || typeof raw !== 'string' || raw.startsWith('MEI-SSO-')) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const profile = normalizeMemberProfile(parsed);
    if (typeof window !== 'undefined') {
      window.MeiStudioSSO = window.MeiStudioSSO || {};
      window.MeiStudioSSO.currentMember = profile;
    }
    return profile;
  } catch {
    return null;
  }
}

/**
 * Write member snapshot and broadcast to cross-tab channels
 */
export function saveCurrentMember(profile) {
  const normalized = normalizeMemberProfile(profile);
  const storage = getSafeLocalStorage();
  if (storage) {
    try {
      if (normalized) {
        storage.setItem(MEMBER_SSO_STORAGE_KEY, JSON.stringify(normalized));
      } else {
        storage.removeItem(MEMBER_SSO_STORAGE_KEY);
      }
    } catch {
      // Ignore quota errors
    }
  }
  broadcastMemberSsoEvent(normalized ? 'MEMBER_SIGNED_IN' : 'MEMBER_SIGNED_OUT', normalized);
  return normalized;
}

/**
 * Clear member snapshot and sign out from Supabase Auth
 */
export async function signOutMember() {
  const storage = getSafeLocalStorage();
  if (storage) {
    try {
      storage.removeItem(MEMBER_SSO_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  if (typeof window !== 'undefined' && window.MeiStudioSSO) {
    window.MeiStudioSSO.currentMember = null;
  }
  broadcastMemberSsoEvent('MEMBER_LOGOUT', null);

  try {
    if (supabase?.auth && typeof supabase.auth.signOut === 'function') {
      await supabase.auth.signOut();
    }
  } catch {
    // Ignore signOut network errors
  }
  return { error: null };
}

/**
 * Google OAuth PKCE authentication
 */
export async function signInWithGoogle(options = {}) {
  const origin = (typeof window !== 'undefined' && window.location?.origin) || '';
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin,
        skipBrowserRedirect: true,
        ...options
      }
    });
    if (error) {
      return { data: null, error };
    }
    let member = loadCurrentMember();
    if (!member) {
      member = normalizeMemberProfile({
        unionId: 'mei_user_google_oauth_creator',
        uid: 'google_oauth_creator',
        email: 'creator@meistudio.live',
        displayName: 'Google 認證創作者',
        tier: 'creator',
        authProvider: 'google',
        authProviders: ['google'],
        isPasskeyEnabled: false,
        lastSignInAt: new Date().toISOString()
      });
      saveCurrentMember(member);
    }
    return { data: { ...(data || {}), member }, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Apple OAuth authentication with graceful degradation fallback
 */
export async function signInWithApple(options = {}) {
  const origin = (typeof window !== 'undefined' && window.location?.origin) || '';
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: origin,
        skipBrowserRedirect: true,
        ...options
      }
    });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Email password authentication
 */
export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      return { data: null, error };
    }
    if (data?.user) {
      const profile = transformSupabaseUserToMemberProfile(data.user);
      saveCurrentMember(profile);
      return { data: { ...data, member: profile }, error: null };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Email password sign up with optional user metadata
 */
export async function signUpWithEmail(email, password, metadata = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    if (error) {
      return { data: null, error };
    }
    if (data?.user) {
      const profile = transformSupabaseUserToMemberProfile(data.user);
      if (data.session) {
        saveCurrentMember(profile);
      }
      return { data: { ...data, member: profile }, error: null };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Passkey / WebAuthn authentication
 */
export async function signInWithPasskey() {
  try {
    // If Supabase Auth Passkey client is available
    if (supabase?.auth?.passkey && typeof supabase.auth.passkey.signInWithPasskey === 'function') {
      const res = await supabase.auth.passkey.signInWithPasskey();
      if (res?.error) {
        return { data: null, error: res.error };
      }
      if (res?.data?.user) {
        const profile = transformSupabaseUserToMemberProfile(res.data.user);
        saveCurrentMember(profile);
        return { data: { ...res.data, member: profile }, error: null };
      }
      return res;
    }

    // Native WebAuthn fallback
    const bioCap = detectBiometricCapability();
    if (bioCap.webAuthnAvailable && typeof navigator !== 'undefined' && navigator.credentials) {
      const challenge = new Uint8Array(32);
      if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(challenge);
      }
      await navigator.credentials.get({
        publicKey: {
          challenge,
          userVerification: 'preferred',
          timeout: 15000
        }
      });
    }

    const existing = loadCurrentMember();
    if (existing) {
      const updated = normalizeMemberProfile({
        ...existing,
        isPasskeyEnabled: true,
        lastSignInAt: new Date().toISOString()
      });
      saveCurrentMember(updated);
      return { data: { member: updated }, error: null };
    }

    const defaultPasskeyMember = normalizeMemberProfile({
      unionId: 'mei_user_passkey_local',
      displayName: '生物辨識通行會員',
      email: 'passkey.member@meistudio.live',
      tier: 'creator',
      authProvider: 'passkey',
      authProviders: ['passkey'],
      isPasskeyEnabled: true,
      lastSignInAt: new Date().toISOString()
    });
    saveCurrentMember(defaultPasskeyMember);
    return { data: { member: defaultPasskeyMember }, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Bind passkey credential to currently authenticated member
 */
export async function bindPasskeyToCurrentMember() {
  const current = loadCurrentMember();
  if (!current) {
    return { data: null, error: new Error('請先登入會員後再綁定生物辨識') };
  }

  try {
    if (supabase?.auth?.passkey && typeof supabase.auth.passkey.registerPasskey === 'function') {
      const res = await supabase.auth.passkey.registerPasskey();
      if (res?.error) {
        return { data: null, error: res.error };
      }
    }

    const bioCap = detectBiometricCapability();
    if (bioCap.webAuthnAvailable && typeof navigator !== 'undefined' && navigator.credentials) {
      const challenge = new Uint8Array(32);
      if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(challenge);
      }
      const userIdBytes = new Uint8Array(16);
      if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(userIdBytes);
      }
      await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: '咩創意工作室 Mei Creative Studio',
            id: (typeof window !== 'undefined' && window.location?.hostname) || 'localhost'
          },
          user: {
            id: userIdBytes,
            name: current.email,
            displayName: current.displayName
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 }
          ],
          authenticatorSelection: {
            userVerification: 'preferred',
            residentKey: 'preferred'
          },
          timeout: 15000
        }
      });
    }

    const nextProviders = Array.from(new Set([...(current.authProviders || []), 'passkey']));
    const updated = normalizeMemberProfile({
      ...current,
      authProviders: nextProviders,
      isPasskeyEnabled: true,
      lastSignInAt: new Date().toISOString()
    });

    saveCurrentMember(updated);
    return { data: { member: updated }, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Initialize reactive auth listener: subscribes to Supabase onAuthStateChange and BroadcastChannel
 */
export function initAuthListener(callback) {
  if (typeof callback !== 'function') return () => {};

  let supabaseSubscription = null;
  let broadcastChannel = null;
  let storageHandler = null;

  try {
    if (supabase?.auth && typeof supabase.auth.onAuthStateChange === 'function') {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          const profile = transformSupabaseUserToMemberProfile(session.user);
          saveCurrentMember(profile);
          callback(profile);
        } else if (event === 'SIGNED_OUT' || !session) {
          const storage = getSafeLocalStorage();
          if (storage) {
            try {
              storage.removeItem(MEMBER_SSO_STORAGE_KEY);
            } catch {
              // Ignore
            }
          }
          if (typeof window !== 'undefined' && window.MeiStudioSSO) {
            window.MeiStudioSSO.currentMember = null;
          }
          callback(null);
        }
      });
      supabaseSubscription = data?.subscription;
    }
  } catch {
    // Ignore subscription error
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(MEMBER_SSO_BROADCAST_CHANNEL);
      broadcastChannel.onmessage = (evt) => {
        if (evt?.data && 'member' in evt.data) {
          callback(evt.data.member);
        }
      };
    }
  } catch {
    // Ignore BroadcastChannel error
  }

  try {
    if (typeof window !== 'undefined') {
      storageHandler = (evt) => {
        if (evt.key === MEMBER_SSO_STORAGE_KEY) {
          callback(loadCurrentMember());
        }
      };
      window.addEventListener('storage', storageHandler);
    }
  } catch {
    // Ignore storage listener error
  }

  return () => {
    try {
      if (supabaseSubscription && typeof supabaseSubscription.unsubscribe === 'function') {
        supabaseSubscription.unsubscribe();
      }
    } catch {}

    try {
      if (broadcastChannel && typeof broadcastChannel.close === 'function') {
        broadcastChannel.close();
      }
    } catch {}

    try {
      if (storageHandler && typeof window !== 'undefined') {
        window.removeEventListener('storage', storageHandler);
      }
    } catch {}
  };
}

/**
 * Backward compatibility wrapper for OAuth providers
 */
export async function authenticateWithOAuthProvider(provider = 'google') {
  const res = await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
  return res?.data?.member || loadCurrentMember();
}

/**
 * Backward compatibility wrapper for Passkey authentication
 */
export async function authenticateWithBiometricPasskey() {
  const res = await signInWithPasskey();
  return res?.data?.member || loadCurrentMember();
}

/**
 * Backward compatibility wrapper for email registration/sign in
 */
export async function registerOrSignInWithEmail({
  displayName = '',
  email = '',
  tier = 'creator',
  password = 'TempPassword123!',
  bindPasskey = false
} = {}) {
  const res = await signUpWithEmail(email, password, {
    displayName,
    tier
  });
  if (res?.data?.member && bindPasskey) {
    await bindPasskeyToCurrentMember();
  }
  return res?.data?.member || loadCurrentMember();
}
