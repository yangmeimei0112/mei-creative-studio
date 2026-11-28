/**
 * 咩創意工作室 Mei Creative Studio — 跨專案懸浮返回導覽工具列 (mei-dock.js)
 *
 * 用途：讓子專案嵌入 <script src="/sdk/mei-dock.js"></script> 後，
 * 在畫面角落呈現導覽膠囊，支援：
 * 1. 一鍵返回咩創意工作室大廳
 * 2. 展開快速專案切換清單
 * 3. 支援滑鼠與觸控自由拖曳、視窗邊界自動夾制與折疊收合
 * 4. 提供全域 window.MeiStudioSSO 跨專案漫遊認證與 Token 驗證 API
 */
(function initMeiStudioDock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // =========================================================================
  // Pure Standalone Browser Cryptography & Utilities (Zero Dependencies)
  // =========================================================================
  function stringToUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    const bin = unescape(encodeURIComponent(str));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  function sha256Sync(input) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let i, j;
    let result = '';

    const bytes =
      typeof input === 'string'
        ? stringToUtf8Bytes(input)
        : input || new Uint8Array(0);
    const bitLength = bytes.length * 8;
    const words = [];

    for (i = 0; i < bytes.length; i++) {
      words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
    }

    words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
    words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

    const hash = [];
    const k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    let currentHash = hash.slice(0, 8);
    for (i = 0; i < words.length; i += 16) {
      const w = words.slice(i, i + 16);
      while (w.length < 16) w.push(0);
      const oldHash = currentHash.slice(0);
      for (j = 0; j < 64; j++) {
        const w15 = w[j - 15];
        const w2 = w[j - 2];
        const a = currentHash[0];
        const e = currentHash[4];
        const temp1 =
          currentHash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & currentHash[5]) ^ (~e & currentHash[6])) +
          k[j] +
          (w[j] =
            j < 16
              ? (w[j] || 0) | 0
              : (w[j - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[j - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & currentHash[1]) ^ (a & currentHash[2]) ^ (currentHash[1] & currentHash[2]));

        currentHash = [(temp1 + temp2) | 0].concat(currentHash);
        currentHash[4] = (currentHash[4] + temp1) | 0;
        currentHash.pop();
      }

      for (j = 0; j < 8; j++) {
        currentHash[j] = (currentHash[j] + oldHash[j]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        const b = (currentHash[i] >> (8 * j)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  function timingSafeEqualStrings(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const maxLen = Math.max(a.length, b.length);
    let diff = a.length ^ b.length;
    for (let i = 0; i < maxLen; i++) {
      const codeA = i < a.length ? a.charCodeAt(i) : 0;
      const codeB = i < b.length ? b.charCodeAt(i) : 0;
      diff |= codeA ^ codeB;
    }
    return diff === 0;
  }

  function base64UrlEncode(obj) {
    const jsonStr = typeof obj === 'string' ? obj : JSON.stringify(obj);
    const binStr = unescape(encodeURIComponent(jsonStr));
    const b64 =
      typeof btoa === 'function'
        ? btoa(binStr)
        : typeof Buffer !== 'undefined'
        ? Buffer.from(binStr, 'binary').toString('base64')
        : '';
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlDecode(str) {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binStr =
      typeof atob === 'function'
        ? atob(b64)
        : typeof Buffer !== 'undefined'
        ? Buffer.from(b64, 'base64').toString('binary')
        : '';
    return decodeURIComponent(escape(binStr));
  }

  function normalizeMemberProfile(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const uid = raw.uid || raw.id || (raw.unionId ? raw.unionId.replace(/^mei_user_/, '') : 'guest');
    const unionId = raw.unionId && raw.unionId.startsWith('mei_') ? raw.unionId : `mei_user_${uid}`;
    const tier = raw.tier || 'explorer';
    const tierLabel =
      raw.tierLabel ||
      (tier === 'creator'
        ? '創意造物者'
        : tier === 'architect'
        ? '核心架構師'
        : '靈感探索員');
    return {
      schemaVersion: '2.0.0',
      unionId,
      uid,
      email: raw.email || `${unionId}@meistudio.live`,
      displayName: raw.displayName || raw.display_name || '創意會員',
      avatarUrl: raw.avatarUrl || raw.avatar_url || '',
      tier,
      tierLabel,
      scopes: Array.isArray(raw.scopes)
        ? raw.scopes
        : ['studio:read', 'subprojects:access', 'sso:roaming'],
      authProvider: raw.authProvider || 'google',
      authProviders: Array.isArray(raw.authProviders)
        ? raw.authProviders
        : [raw.authProvider || 'google'],
      isPasskeyEnabled: Boolean(raw.isPasskeyEnabled),
      lastSignInAt: String(raw.lastSignInAt || new Date().toISOString()),
      connectedProjects: Array.isArray(raw.connectedProjects)
        ? raw.connectedProjects
        : ['*'],
      metadata:
        typeof raw.metadata === 'object' && raw.metadata !== null
          ? raw.metadata
          : { has_password: false }
    };
  }

  function createSsoTokenSync(targetMember) {
    if (!targetMember || !targetMember.unionId) return null;
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const uid =
      targetMember.uid ||
      (targetMember.unionId
        ? targetMember.unionId.replace(/^mei_user_/, '')
        : 'guest');
    const tier = targetMember.tier || 'explorer';
    const tierLabel =
      targetMember.tierLabel ||
      (tier === 'creator'
        ? '創意造物者'
        : tier === 'architect'
        ? '核心架構師'
        : '靈感探索員');
    const payload = {
      unionId: targetMember.unionId,
      uid: uid,
      email: targetMember.email || `${targetMember.unionId}@meistudio.live`,
      displayName: targetMember.displayName || '創意會員',
      tier: tier,
      tierLabel: tierLabel,
      authProvider: targetMember.authProvider || 'google',
      authProviders:
        Array.isArray(targetMember.authProviders) &&
        targetMember.authProviders.length > 0
          ? targetMember.authProviders
          : [targetMember.authProvider || 'google'],
      isPasskeyEnabled: Boolean(targetMember.isPasskeyEnabled),
      scopes: Array.isArray(targetMember.scopes)
        ? targetMember.scopes
        : ['studio:read', 'subprojects:access', 'sso:roaming'],
      connectedProjects: Array.isArray(targetMember.connectedProjects)
        ? targetMember.connectedProjects
        : ['*'],
      iss: 'mei-creative-studio',
      iat: now,
      exp: now + 7 * 86400 // 7 days in seconds
    };
    const b64Header = base64UrlEncode(header);
    const b64Payload = base64UrlEncode(payload);
    const signingInput = `${b64Header}.${b64Payload}`;
    const signature = sha256Sync(`mei-sso-salt:${signingInput}`);
    return `mei_sso_v2.${signingInput}.${signature}`;
  }

  // =========================================================================
  // Universal Member SSO Bridge API
  // =========================================================================
  const ssoListeners = new Set();

  function readSharedMember() {
    try {
      const raw =
        window.localStorage &&
        window.localStorage.getItem('mei_universal_member_sso_v1');
      if (!raw || typeof raw !== 'string' || raw.startsWith('MEI-SSO-')) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.unionId) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  function getMember() {
    const raw = readSharedMember();
    if (raw) {
      if (window.MeiStudioSSO) {
        window.MeiStudioSSO.currentMember = raw;
      }
      return raw;
    }
    const cur = window.MeiStudioSSO && window.MeiStudioSSO.currentMember;
    if (cur && typeof cur === 'object' && cur.unionId) {
      try {
        const rawStorage =
          window.localStorage &&
          window.localStorage.getItem('mei_universal_member_sso_v1');
        if (
          rawStorage &&
          typeof rawStorage === 'string' &&
          rawStorage.startsWith('MEI-SSO-')
        ) {
          return null;
        }
      } catch {}
      return cur;
    }
    if (window.MeiStudioSSO) {
      window.MeiStudioSSO.currentMember = null;
    }
    return null;
  }

  function getToken() {
    const member = getMember();
    if (!member || !member.unionId) {
      return null;
    }
    try {
      const cached =
        window.localStorage &&
        window.localStorage.getItem('mei_universal_sso_token_v1');
      if (
        cached &&
        typeof cached === 'string' &&
        cached.startsWith('mei_sso_v2.')
      ) {
        const parts = cached.split('.');
        if (parts.length === 4) {
          const payload = JSON.parse(base64UrlDecode(parts[2]));
          const now = Math.floor(Date.now() / 1000);
          if (
            payload.exp &&
            payload.exp > now + 60 &&
            payload.unionId === member.unionId
          ) {
            const expectedSig = sha256Sync(
              `mei-sso-salt:${parts[1]}.${parts[2]}`
            );
            if (timingSafeEqualStrings(parts[3], expectedSig)) {
              return cached;
            }
          }
        }
      }
    } catch {}

    const newToken = createSsoTokenSync(member);
    try {
      if (window.localStorage && newToken) {
        window.localStorage.setItem('mei_universal_sso_token_v1', newToken);
      }
    } catch {}
    return newToken;
  }

  async function verifyToken(token) {
    if (typeof token !== 'string' || !token.trim()) {
      return {
        valid: false,
        error: 'Token cannot be empty',
        payload: null,
        profile: null,
        member: null
      };
    }

    const cleanToken = token.trim();
    if (cleanToken.startsWith('MEI-SSO-')) {
      return {
        valid: false,
        error: 'Legacy MEI-SSO token is deprecated and rejected',
        payload: null,
        profile: null,
        member: null
      };
    }

    const parts = cleanToken.split('.');
    if (parts.length !== 4 || parts[0] !== 'mei_sso_v2') {
      return {
        valid: false,
        error: 'Malformed SSO Token structure',
        payload: null,
        profile: null,
        member: null
      };
    }

    const [, b64Header, b64Payload, signature] = parts;
    const expectedSig = sha256Sync(`mei-sso-salt:${b64Header}.${b64Payload}`);

    if (!timingSafeEqualStrings(signature, expectedSig)) {
      return {
        valid: false,
        error: 'Invalid SSO Token signature',
        payload: null,
        profile: null,
        member: null
      };
    }

    try {
      const rawPayload = base64UrlDecode(b64Payload);
      const payload = JSON.parse(rawPayload);

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && now > payload.exp) {
        return {
          valid: false,
          error: 'SSO Token has expired',
          payload: null,
          profile: null,
          member: null
        };
      }

      if (!payload.unionId || !payload.unionId.startsWith('mei_user_')) {
        return {
          valid: false,
          error: 'Invalid Union ID in Token',
          payload: null,
          profile: null,
          member: null
        };
      }

      const member = normalizeMemberProfile(payload);
      return {
        valid: true,
        payload,
        member,
        profile: member,
        error: null
      };
    } catch (err) {
      return {
        valid: false,
        error: 'Failed to decode SSO Token payload',
        payload: null,
        profile: null,
        member: null
      };
    }
  }

  function notifySsoListeners(member) {
    if (window.MeiStudioSSO) {
      window.MeiStudioSSO.currentMember = member;
    }
    if (!member) {
      try {
        if (window.localStorage) {
          window.localStorage.removeItem('mei_universal_sso_token_v1');
        }
      } catch {}
    }
    ssoListeners.forEach((cb) => {
      try {
        cb(member);
      } catch {}
    });
  }

  // Mount global MeiStudioSSO immediately upon script execution
  window.MeiStudioSSO = window.MeiStudioSSO || {};
  window.MeiStudioSSO.currentMember = readSharedMember();
  window.MeiStudioSSO.getMember = getMember;
  window.MeiStudioSSO.getToken = getToken;
  window.MeiStudioSSO.generateToken = async function (targetMember) {
    return createSsoTokenSync(targetMember || getMember()) || getToken();
  };
  window.MeiStudioSSO.verifyToken = verifyToken;
  window.MeiStudioSSO.onAuthStateChange = function (cb) {
    if (typeof cb === 'function') {
      ssoListeners.add(cb);
      return function unsubscribe() {
        ssoListeners.delete(cb);
      };
    }
    return function noop() {};
  };
  window.MeiStudioSSO._notify = notifySsoListeners;

  window.addEventListener('storage', (evt) => {
    if (evt.key === 'mei_universal_member_sso_v1') {
      notifySsoListeners(readSharedMember());
    }
  });

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ssoChannel = new BroadcastChannel('mei_universal_sso_channel_v1');
      ssoChannel.onmessage = (evt) => {
        if (evt && evt.data) {
          if ('member' in evt.data) {
            notifySsoListeners(evt.data.member);
          } else {
            notifySsoListeners(readSharedMember());
          }
        }
      };
    } catch {}
  }

  // Guard against duplicate DOM dock mount
  if (window.__MEI_STUDIO_DOCK_MOUNTED__) return;
  window.__MEI_STUDIO_DOCK_MOUNTED__ = true;

  function escapeHtml(raw) {
    return String(raw ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeUrl(rawUrl, fallback = '/') {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return fallback;
    if (/^(javascript|data|vbscript):/i.test(trimmed)) {
      return fallback;
    }
    return trimmed;
  }

  const currentScript =
    document.currentScript || document.querySelector('script[src*="mei-dock.js"]');
  const hubUrl = sanitizeUrl(
    currentScript && currentScript.getAttribute('data-hub-url'),
    '/'
  );
  const projectName =
    (currentScript && currentScript.getAttribute('data-project-name')) ||
    document.title ||
    'Connected Project';
  const positionAttr =
    (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';

  const DEFAULT_QUICK_PROJECTS = [
    {
      title: '咩創意雲端靈感白板',
      category: '互動設計與多媒體',
      url: '/demo-subproject.html?scene=cloud-canvas'
    },
    {
      title: '咩智慧靈感自動化引擎',
      category: 'AI 與自動化工具',
      url: '/demo-subproject.html?scene=ai-copilot'
    },
    {
      title: '雲絨極簡品牌電商系統',
      category: '網站與商業應用',
      url: '/demo-subproject.html?scene=commerce-portal'
    },
    {
      title: '雲朵粒子互動聲音劇場',
      category: '互動設計與多媒體',
      url: '/demo-subproject.html?scene=motion-lab'
    },
    {
      title: '咩創意設計規範與組件庫',
      category: '網站與商業應用',
      url: '/demo-subproject.html?scene=design-system'
    }
  ];

  function getQuickProjects() {
    try {
      const raw =
        window.localStorage &&
        window.localStorage.getItem('mei_studio_projects_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((p) => p && p.visibility !== 'private' && p.title && p.url)
            .slice(0, 6);
        }
      }
    } catch {
      // Ignore cross-origin or storage access restrictions
    }
    return DEFAULT_QUICK_PROJECTS;
  }

  // Brand & Lucide SVG Icons (24x24 grid, stroke-width="1.75", round caps/joins)
  const LUCIDE_SVGS = {
    brandMark:
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 18V8.8a2.1 2.1 0 0 1 3.58-1.48L12 10.95l3.62-3.63A2.1 2.1 0 0 1 19.2 8.8v3.7"/><circle cx="19.2" cy="16.9" r="1.95" fill="currentColor" stroke="none"/></svg>',
    arrowLeft:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
    layoutGrid:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    arrowUpRight:
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
    minimize:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>'
  };

  function isNarrowViewport() {
    try {
      if (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 640px)').matches
      ) {
        return true;
      }
    } catch {
      // 略過 matchMedia 存取異常
    }
    return (
      typeof window.innerWidth === 'number' &&
      window.innerWidth > 0 &&
      window.innerWidth <= 640
    );
  }

  const DOCK_STYLE_TEXT = `
    #mei-studio-dock-root {
      --mei-dock-bg: rgba(255, 255, 255, 0.90);
      --mei-dock-popover-bg: rgba(255, 255, 255, 0.95);
      --mei-dock-border: rgba(56, 189, 248, 0.38);
      --mei-dock-border-hover: rgba(56, 189, 248, 0.72);
      --mei-dock-shadow: 0 12px 32px -6px rgba(14, 165, 233, 0.24), 0 2px 6px rgba(15, 23, 42, 0.06);
      --mei-dock-shadow-hover: 0 14px 36px -6px rgba(14, 165, 233, 0.34);
      --mei-dock-popover-shadow: 0 18px 40px -10px rgba(14, 165, 233, 0.28);
      --mei-dock-text: #0F172A;
      --mei-dock-muted: #64748B;
      --mei-dock-accent: #0284C7;
      --mei-dock-collapse-color: #0369A1;
      --mei-dock-collapse-bg: rgba(56, 189, 248, 0.12);
      --mei-dock-icon-bg: rgba(240, 249, 255, 0.9);
      --mei-dock-hover-bg: #E0F2FE;
      --mei-dock-badge-bg: linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(14, 165, 233, 0.08));
      --mei-dock-badge-border: rgba(56, 189, 248, 0.36);
      --mei-dock-badge-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.7), 0 2px 6px -1px rgba(14, 165, 233, 0.15);
      --mei-dock-divider: rgba(56, 189, 248, 0.2);
      position: fixed;
      z-index: 35;
      font-family: "Plus Jakarta Sans", "Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
    }
    @media (prefers-color-scheme: dark) {
      html:not(.light):not([data-theme="light"]) body:not(.light) #mei-studio-dock-root:not(.mei-dock-light) {
        --mei-dock-bg: rgba(15, 23, 42, 0.86);
        --mei-dock-popover-bg: rgba(15, 23, 42, 0.94);
        --mei-dock-border: rgba(56, 189, 248, 0.36);
        --mei-dock-border-hover: rgba(56, 189, 248, 0.68);
        --mei-dock-shadow: 0 12px 32px -6px rgba(2, 6, 23, 0.65), 0 2px 8px rgba(56, 189, 248, 0.14);
        --mei-dock-shadow-hover: 0 14px 36px -6px rgba(2, 6, 23, 0.75), 0 0 0 1px rgba(56, 189, 248, 0.25);
        --mei-dock-popover-shadow: 0 18px 40px -10px rgba(2, 6, 23, 0.78);
        --mei-dock-text: #F8FAFC;
        --mei-dock-muted: #94A3B8;
        --mei-dock-accent: #38BDF8;
        --mei-dock-collapse-color: #7DD3FC;
        --mei-dock-collapse-bg: rgba(56, 189, 248, 0.18);
        --mei-dock-icon-bg: rgba(30, 41, 59, 0.85);
        --mei-dock-hover-bg: rgba(56, 189, 248, 0.18);
        --mei-dock-badge-bg: linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(14, 165, 233, 0.12));
        --mei-dock-badge-border: rgba(56, 189, 248, 0.42);
        --mei-dock-badge-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.16), 0 2px 8px -1px rgba(2, 6, 23, 0.45);
        --mei-dock-divider: rgba(56, 189, 248, 0.24);
      }
    }
    html.dark #mei-studio-dock-root,
    body.dark #mei-studio-dock-root,
    [data-theme="dark"] #mei-studio-dock-root,
    #mei-studio-dock-root.mei-dock-dark {
      --mei-dock-bg: rgba(15, 23, 42, 0.86);
      --mei-dock-popover-bg: rgba(15, 23, 42, 0.94);
      --mei-dock-border: rgba(56, 189, 248, 0.36);
      --mei-dock-border-hover: rgba(56, 189, 248, 0.68);
      --mei-dock-shadow: 0 12px 32px -6px rgba(2, 6, 23, 0.65), 0 2px 8px rgba(56, 189, 248, 0.14);
      --mei-dock-shadow-hover: 0 14px 36px -6px rgba(2, 6, 23, 0.75), 0 0 0 1px rgba(56, 189, 248, 0.25);
      --mei-dock-popover-shadow: 0 18px 40px -10px rgba(2, 6, 23, 0.78);
      --mei-dock-text: #F8FAFC;
      --mei-dock-muted: #94A3B8;
      --mei-dock-accent: #38BDF8;
      --mei-dock-collapse-color: #7DD3FC;
      --mei-dock-collapse-bg: rgba(56, 189, 248, 0.18);
      --mei-dock-icon-bg: rgba(30, 41, 59, 0.85);
      --mei-dock-hover-bg: rgba(56, 189, 248, 0.18);
      --mei-dock-badge-bg: linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(14, 165, 233, 0.12));
      --mei-dock-badge-border: rgba(56, 189, 248, 0.42);
      --mei-dock-badge-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.16), 0 2px 8px -1px rgba(2, 6, 23, 0.45);
      --mei-dock-divider: rgba(56, 189, 248, 0.24);
    }
    #mei-studio-dock-root.pos-bottom-right {
      right: 20px;
      bottom: max(20px, env(safe-area-inset-bottom, 20px));
    }
    #mei-studio-dock-root.pos-bottom-left {
      left: 20px;
      bottom: max(20px, env(safe-area-inset-bottom, 20px));
    }
    .mei-dock-capsule {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px 8px 10px;
      border-radius: 9999px;
      background: var(--mei-dock-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--mei-dock-border);
      box-shadow: var(--mei-dock-shadow);
      color: var(--mei-dock-text);
      font-size: 13px;
      font-weight: 600;
      cursor: grab;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
    }
    .mei-dock-capsule:hover {
      border-color: var(--mei-dock-border-hover);
      box-shadow: var(--mei-dock-shadow-hover);
    }
    .mei-dock-badge {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--mei-dock-badge-bg);
      border: 1px solid var(--mei-dock-badge-border);
      box-shadow: var(--mei-dock-badge-shadow);
      color: var(--mei-dock-accent);
      flex-shrink: 0;
      position: relative;
    }
    .mei-dock-details {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .mei-dock-label-group {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      padding-right: 2px;
    }
    .mei-dock-eyebrow {
      font-size: 10px;
      color: var(--mei-dock-accent);
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .mei-dock-project-label {
      font-size: 12px;
      color: var(--mei-dock-text);
      max-width: 136px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mei-dock-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 11px;
      border-radius: 9999px;
      background: linear-gradient(135deg, #38BDF8, #0284C7);
      color: #FFFFFF;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .mei-dock-btn:hover {
      opacity: 0.94;
      transform: scale(1.02);
    }
    .mei-dock-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 9999px;
      border: 1px solid var(--mei-dock-border);
      background: var(--mei-dock-icon-bg);
      color: var(--mei-dock-accent);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .mei-dock-icon-btn:hover {
      background: var(--mei-dock-hover-bg);
    }
    .mei-dock-collapse-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      border: none;
      background: var(--mei-dock-collapse-bg);
      color: var(--mei-dock-collapse-color);
      cursor: pointer;
    }
    .mei-dock-collapsed .mei-dock-details,
    .mei-dock-collapsed .mei-dock-popover {
      display: none !important;
    }
    .mei-dock-collapsed .mei-dock-collapse-btn svg {
      transform: rotate(180deg);
    }
    .mei-dock-popover {
      position: absolute;
      bottom: calc(100% + 10px);
      right: 0;
      width: 260px;
      padding: 12px;
      border-radius: 20px;
      background: var(--mei-dock-popover-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--mei-dock-border);
      box-shadow: var(--mei-dock-popover-shadow);
      display: none;
      flex-direction: column;
      gap: 6px;
    }
    #mei-studio-dock-root.pos-bottom-left .mei-dock-popover {
      right: auto;
      left: 0;
    }
    .mei-dock-popover.open {
      display: flex;
    }
    .mei-dock-popover-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--mei-dock-accent);
      padding: 2px 6px 4px;
      border-bottom: 1px solid var(--mei-dock-divider);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mei-dock-popover-meta {
      font-weight: 500;
      color: var(--mei-dock-muted);
    }
    .mei-dock-popover-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 9px;
      border-radius: 12px;
      text-decoration: none;
      color: var(--mei-dock-text);
      font-size: 12px;
      font-weight: 600;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .mei-dock-popover-item:hover {
      background: var(--mei-dock-hover-bg);
      color: var(--mei-dock-accent);
    }
    .mei-dock-arrow {
      color: var(--mei-dock-accent);
      flex-shrink: 0;
    }
    @media (max-width: 480px) {
      #mei-studio-dock-root.pos-bottom-right {
        right: 12px;
        bottom: max(14px, env(safe-area-inset-bottom, 14px));
      }
      #mei-studio-dock-root.pos-bottom-left {
        left: 12px;
        bottom: max(14px, env(safe-area-inset-bottom, 14px));
      }
      .mei-dock-capsule {
        max-width: calc(100vw - 24px);
        padding: 6px 10px 6px 8px;
        gap: 6px;
      }
      #mei-dock-project-label {
        max-width: 82px !important;
      }
      .mei-dock-popover {
        width: min(260px, calc(100vw - 24px));
        max-height: 60dvh;
        overflow-y: auto;
      }
    }
    @media (orientation: landscape) and (max-height: 500px) {
      .mei-dock-popover {
        max-height: 70dvh;
        overflow-y: auto;
      }
    }
  `;

  function mount() {
    if (document.getElementById('mei-studio-dock-root')) return;

    let styleEl = document.getElementById('mei-studio-dock-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'mei-studio-dock-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = DOCK_STYLE_TEXT;

    const container = document.createElement('div');
    container.id = 'mei-studio-dock-root';
    container.className =
      positionAttr === 'bottom-left' ? 'pos-bottom-left' : 'pos-bottom-right';

    const quickProjects = getQuickProjects();
    const quickLinksHtml = quickProjects
      .map(
        (item) => `
        <a href="${escapeHtml(sanitizeUrl(item.url, '/'))}" target="_top" class="mei-dock-popover-item">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.title)}</span>
          <span class="mei-dock-arrow">${LUCIDE_SVGS.arrowUpRight}</span>
        </a>
      `
      )
      .join('');

    container.innerHTML = `
      <div class="mei-dock-popover" id="mei-dock-popover" role="menu" aria-label="快速切換咩創意工作室專案">
        <div class="mei-dock-popover-title">
          <span>快速切換工作室專案</span>
          <span class="mei-dock-popover-meta">Mei Hub</span>
        </div>
        ${quickLinksHtml}
      </div>
      <div class="mei-dock-capsule" title="可拖曳移動位置">
        <span class="mei-dock-badge" title="咩創意工作室">${LUCIDE_SVGS.brandMark}</span>
        <div class="mei-dock-details">
          <div class="mei-dock-label-group">
            <span class="mei-dock-eyebrow">MEI CREATIVE HUB</span>
            <span id="mei-dock-project-label" class="mei-dock-project-label">${escapeHtml(projectName)}</span>
          </div>
          <button type="button" class="mei-dock-icon-btn" id="mei-dock-switcher-btn" title="展開快速專案切換清單" aria-label="展開快速專案切換清單">
            ${LUCIDE_SVGS.layoutGrid}
          </button>
          <a href="${escapeHtml(hubUrl)}" target="_top" class="mei-dock-btn" id="mei-dock-return-link">
            ${LUCIDE_SVGS.arrowLeft}
            <span>返回咩創意大廳</span>
          </a>
        </div>
        <button type="button" class="mei-dock-collapse-btn" id="mei-dock-toggle-btn" aria-label="收合或展開導覽膠囊" aria-expanded="true" title="收合導覽膠囊">
          ${LUCIDE_SVGS.minimize}
        </button>
      </div>
    `;

    document.body.appendChild(container);

    const toggleBtn = container.querySelector('#mei-dock-toggle-btn');
    const switcherBtn = container.querySelector('#mei-dock-switcher-btn');
    const popover = container.querySelector('#mei-dock-popover');

    let userToggledCollapse = false;

    function applyCollapsedState(collapsed) {
      const nextCollapsed = Boolean(collapsed);
      container.classList.toggle('mei-dock-collapsed', nextCollapsed);
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(!nextCollapsed));
        toggleBtn.setAttribute(
          'title',
          nextCollapsed ? '展開導覽膠囊' : '收合導覽膠囊'
        );
      }
      if (nextCollapsed && popover) {
        popover.classList.remove('open');
      }
    }

    // 手機端（窄視窗 <= 640px）掛載時預設自動收合
    applyCollapsedState(isNarrowViewport());

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userToggledCollapse = true;
        applyCollapsedState(!container.classList.contains('mei-dock-collapsed'));
        clampToViewport();
      });
    }

    if (switcherBtn && popover) {
      switcherBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          popover.classList.remove('open');
        }
      });
    }

    // Drag support for desktop mouse and mobile touch with viewport boundary clamping
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let baseLeft = 0;
    let baseTop = 0;

    function measureBasePosition() {
      const rect = container.getBoundingClientRect();
      baseLeft = rect.left - offsetX;
      baseTop = rect.top - offsetY;
    }

    function clampOffset(nextX, nextY) {
      const margin = 8;
      const vw = Math.max(window.innerWidth || 320, 200);
      const vh = Math.max(window.innerHeight || 480, 200);
      const rect = container.getBoundingClientRect();
      const width = Math.min(rect.width || 240, vw - margin * 2);
      const height = Math.min(rect.height || 48, vh - margin * 2);

      // Recompute base coordinates without transform offset
      baseLeft = rect.left - offsetX;
      baseTop = rect.top - offsetY;

      const minX = margin - baseLeft;
      const maxX = vw - margin - width - baseLeft;
      const minY = margin - baseTop;
      const maxY = vh - margin - height - baseTop;

      return {
        x: Math.min(Math.max(nextX, Math.min(minX, maxX)), Math.max(minX, maxX)),
        y: Math.min(Math.max(nextY, Math.min(minY, maxY)), Math.max(minY, maxY))
      };
    }

    function clampToViewport() {
      const clamped = clampOffset(offsetX, offsetY);
      offsetX = clamped.x;
      offsetY = clamped.y;
      container.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    }

    const onPointerDown = (e) => {
      if (
        e.target.closest('a') ||
        e.target.closest('button') ||
        e.target.closest('.mei-dock-popover')
      ) {
        return;
      }
      isDragging = true;
      measureBasePosition();
      startX = e.clientX - offsetX;
      startY = e.clientY - offsetY;
      container.style.transition = 'none';
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const rawX = e.clientX - startX;
      const rawY = e.clientY - startY;
      const clamped = clampOffset(rawX, rawY);
      offsetX = clamped.x;
      offsetY = clamped.y;
      container.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      container.style.transition =
        'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)';
      clampToViewport();
    };

    function handleViewportChange() {
      if (!userToggledCollapse) {
        applyCollapsedState(isNarrowViewport());
      }
      clampToViewport();
    }

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    // Expose safe label updater for multi-scene subproject sandboxes
    window.__MEI_STUDIO_DOCK_SET_PROJECT__ = (newTitle) => {
      const labelEl = container.querySelector('#mei-dock-project-label');
      if (labelEl && newTitle) {
        labelEl.textContent = String(newTitle);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
