/**
 * 咩創意工作室 (Mei Creative Studio) - 資安防禦與反 AI 誘捕系統 (Security & AI Defense Engine)
 * 標語：創意無限∞咩有極限
 * 規格：全時多層防禦、Salted SHA-256 加鹽雜湊、漸進式退避防暴力破解、深度資料消毒、AI 金絲雀蜜罐與動態欺騙反制
 */

const SECURITY_STORAGE_KEYS = {
  RATE_LIMIT: 'mei_studio_security_rate_limit_v1',
  METRICS: 'mei_studio_security_metrics_v1'
};

const memorySecurityFallback = {
  rateLimit: null,
  metrics: null
};

function safeStorageGet(key) {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (storage && typeof storage.getItem === 'function') {
      return storage.getItem(key);
    }
  } catch {
    // In-memory fallback on SecurityError
    if (key === SECURITY_STORAGE_KEYS.RATE_LIMIT) return memorySecurityFallback.rateLimit;
    if (key === SECURITY_STORAGE_KEYS.METRICS) return memorySecurityFallback.metrics;
  }
  return null;
}

function safeStorageSet(key, value) {
  const strVal = String(value);
  if (key === SECURITY_STORAGE_KEYS.RATE_LIMIT) memorySecurityFallback.rateLimit = strVal;
  if (key === SECURITY_STORAGE_KEYS.METRICS) memorySecurityFallback.metrics = strVal;
  if (typeof window === 'undefined') return;
  try {
    const storage = window.localStorage;
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(key, strVal);
    }
  } catch {
    // Ignore SecurityError
  }
}

function safeStorageRemove(key) {
  if (key === SECURITY_STORAGE_KEYS.RATE_LIMIT) memorySecurityFallback.rateLimit = null;
  if (key === SECURITY_STORAGE_KEYS.METRICS) memorySecurityFallback.metrics = null;
  if (typeof window === 'undefined') return;
  try {
    const storage = window.localStorage;
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(key);
    }
  } catch {
    // Ignore SecurityError
  }
}

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

/**
 * 1. 密碼學標準 SHA-256 同步實作 (FIPS 180-4 Standard)
 * 完整支援 UTF-8 字元編碼與常數時間計算，在任何執行環境 (Browser / Node.js / Web Worker) 皆具備 100% 一致的加鹽雜湊
 */
export function sha256Sync(input) {
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

/**
 * 產生高強度隨機 Salt 鹽值 (優先採用 Web Crypto API getRandomValues)
 */
export function generateCryptoSalt(byteLength = 16) {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    try {
      const buf = new Uint8Array(byteLength);
      globalThis.crypto.getRandomValues(buf);
      return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  let str = '';
  for (let i = 0; i < byteLength * 2; i++) {
    str += Math.floor(Math.random() * 16).toString(16);
  }
  return str;
}

/**
 * 真正常數時間字串比較 (防止時序側信道攻擊 Timing Attack 與字串長度洩漏)
 */
export function timingSafeEqualStrings(a, b) {
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

/**
 * 加鹽雜湊密碼格式化 (Salted SHA-256)
 */
export function hashPinWithSalt(pin, customSalt) {
  const cleanPin = String(pin ?? '').trim();
  const salt = customSalt || generateCryptoSalt(16);
  const combined = `${salt}:${cleanPin}`;
  const hexHash = sha256Sync(combined);
  return `salted-sha256:v1:${salt}:${hexHash}`;
}

/**
 * 原生 Web Crypto API (SubtleCrypto.digest) 異步加鹽雜湊
 */
export async function hashPinWithWebCrypto(pin, customSalt) {
  const cleanPin = String(pin ?? '').trim();
  const salt = customSalt || generateCryptoSalt(16);
  const combined = `${salt}:${cleanPin}`;
  if (
    typeof globalThis.crypto !== 'undefined' &&
    globalThis.crypto.subtle &&
    typeof globalThis.crypto.subtle.digest === 'function'
  ) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hexHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `salted-sha256:v1:${salt}:${hexHash}`;
    } catch {
      // Fallback to synchronous standard SHA-256
    }
  }
  return hashPinWithSalt(pin, salt);
}

/**
 * 驗證輸入密碼與目標雜湊/預設密碼是否吻合 (完整支援向後相容)
 */
export function verifyPinAgainstTarget(inputPin, targetRecord) {
  const cleanInput = String(inputPin ?? '').trim();
  const target = String(targetRecord ?? '').trim();

  if (!target) return false;

  // 判斷是否為加鹽雜湊格式
  if (target.startsWith('salted-sha256:v1:')) {
    const parts = target.split(':');
    if (parts.length !== 4) return false;
    const salt = parts[2];
    const expectedHash = parts[3];
    const computedHash = sha256Sync(`${salt}:${cleanInput}`);
    return timingSafeEqualStrings(computedHash, expectedHash);
  }

  // 向後相容模式 (預設 mei888 或舊版明文)
  return timingSafeEqualStrings(cleanInput, target);
}

/**
 * 2. 防暴力破解漸進式退避速率限制器 (Anti-Brute-Force Rate Limiter)
 * 失敗退避梯級：1s -> 2s -> 4s -> 8s -> 達到 5 次失敗自動啟動 5 分鐘安全鎖定
 */
const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000];
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function getSecurityRateLimitStatus() {
  const raw = safeStorageGet(SECURITY_STORAGE_KEYS.RATE_LIMIT);
  const now = Date.now();
  let state = {
    failedAttempts: 0,
    lockedUntil: 0,
    cooldownUntil: 0
  };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state = {
          failedAttempts: Number(parsed.failedAttempts) || 0,
          lockedUntil: Number(parsed.lockedUntil) || 0,
          cooldownUntil: Number(parsed.cooldownUntil) || 0
        };
      }
    } catch {
      // Keep default
    }
  }

  const isLocked = state.lockedUntil > now;
  const isCooldown = state.cooldownUntil > now;
  const remainingMs = isLocked
    ? state.lockedUntil - now
    : isCooldown
      ? state.cooldownUntil - now
      : 0;

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  return {
    isLocked,
    isCooldown,
    remainingMs,
    remainingSeconds,
    failedAttempts: state.failedAttempts,
    lockedUntil: state.lockedUntil,
    cooldownUntil: state.cooldownUntil
  };
}

export function recordFailedUnlockAttempt() {
  const current = getSecurityRateLimitStatus();
  const nextAttempts = current.failedAttempts + 1;
  const now = Date.now();
  let lockedUntil = 0;
  let cooldownUntil = 0;

  if (nextAttempts >= 5) {
    lockedUntil = now + FIVE_MINUTES_MS;
    cooldownUntil = lockedUntil;
  } else {
    const delay = BACKOFF_DELAYS_MS[Math.min(nextAttempts - 1, BACKOFF_DELAYS_MS.length - 1)];
    cooldownUntil = now + delay;
  }

  const payload = {
    failedAttempts: nextAttempts,
    lockedUntil,
    cooldownUntil
  };
  safeStorageSet(SECURITY_STORAGE_KEYS.RATE_LIMIT, JSON.stringify(payload));
  recordSecurityIntercept('密碼驗證失敗，套用漸進式防暴力破解冷卻');
  return payload;
}

export function recordSuccessfulUnlock() {
  safeStorageRemove(SECURITY_STORAGE_KEYS.RATE_LIMIT);
}

export function resetSecurityRateLimit() {
  safeStorageRemove(SECURITY_STORAGE_KEYS.RATE_LIMIT);
}

/**
 * 3. 資安防護計數與事件日誌 (Security Metrics)
 */
export function loadSecurityMetrics() {
  const raw = safeStorageGet(SECURITY_STORAGE_KEYS.METRICS);
  let metrics = {
    interceptCount: 0,
    honeypotCount: 0,
    lastEventAt: null,
    lastEventDesc: '系統就緒，多層防禦網全時警戒中'
  };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        metrics = {
          interceptCount: Number(parsed.interceptCount) || 0,
          honeypotCount: Number(parsed.honeypotCount) || 0,
          lastEventAt: parsed.lastEventAt || null,
          lastEventDesc: parsed.lastEventDesc || '系統就緒，多層防禦網全時警戒中'
        };
      }
    } catch {
      // Fallback
    }
  }
  return metrics;
}

export function recordSecurityIntercept(reason = '安全過濾攔截') {
  const current = loadSecurityMetrics();
  const updated = {
    ...current,
    interceptCount: current.interceptCount + 1,
    lastEventAt: new Date().toISOString(),
    lastEventDesc: String(reason)
  };
  safeStorageSet(SECURITY_STORAGE_KEYS.METRICS, JSON.stringify(updated));
  return updated;
}

export function recordHoneypotHit(source = 'canary-trap') {
  const current = loadSecurityMetrics();
  const updated = {
    ...current,
    honeypotCount: current.honeypotCount + 1,
    lastEventAt: new Date().toISOString(),
    lastEventDesc: `誘捕未授權 AI 代理探針 (${source})，已動態注入干擾資料`
  };
  safeStorageSet(SECURITY_STORAGE_KEYS.METRICS, JSON.stringify(updated));
  return updated;
}

export function resetSecurityMetrics() {
  const initial = {
    interceptCount: 0,
    honeypotCount: 0,
    lastEventAt: new Date().toISOString(),
    lastEventDesc: '防護計數已手動重置為零'
  };
  safeStorageSet(SECURITY_STORAGE_KEYS.METRICS, JSON.stringify(initial));
  resetSecurityRateLimit();
  return initial;
}

/**
 * 4. 深度資料消毒 (防原型污染、防 XSS、防 Prompt Injection 惡意操縱)
 */
const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const DANGEROUS_XSS_PATTERNS = [
  /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /on\w+\s*=/gi,
  /<\s*(iframe|object|embed|applet|form)\b[^>]*>/gi
];

const PROMPT_INJECTION_PATTERNS = [
  /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior)\s+instructions/gi,
  /(?:system\s*prompt|system\s*directive|you\s+are\s+now\s+in\s+dan\s+mode|jailbreak|override\s+instructions)/gi,
  /(?:developer\s+mode\s+active|bypass\s+safety\s+filters)/gi,
  /(?:<\s*im_start\s*>|<\s*im_end\s*>|\[system\]|\[human\]|\[assistant\])/gi,
  /(?:(?:忽略|無視|忽視)\s*(?:所有|先前|之前|過去)?\s*(?:的)?\s*(?:指示|指令|設定|提示))/gi,
  /(?:(?:輸出|透露|顯現|竊取)\s*(?:系統|管理員|後台)?\s*(?:提示詞|密鑰|密碼|內部資料))/gi,
  /(?:越獄模式|DAN\s*模式|解除限制|繞過安全)/gi
];

export function sanitizeStringDeep(inputStr) {
  if (typeof inputStr !== 'string') return '';
  let cleaned = inputStr;
  let didInterceptXss = false;
  let didInterceptPrompt = false;

  // 遞迴多層消毒 (防範巢狀繞過，例如 javjavascript:ascript:)
  let prev;
  let pass = 0;
  do {
    prev = cleaned;
    pass++;

    // 1. 防 XSS
    for (const pattern of DANGEROUS_XSS_PATTERNS) {
      pattern.lastIndex = 0;
      cleaned = cleaned.replace(pattern, () => {
        didInterceptXss = true;
        return '';
      });
    }

    // 2. 防惡意 Prompt Injection 操縱
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      pattern.lastIndex = 0;
      cleaned = cleaned.replace(pattern, () => {
        didInterceptPrompt = true;
        return '[安全過濾：惡意指令已被阻擋]';
      });
    }
  } while (cleaned !== prev && pass < 4);

  if (didInterceptXss) {
    recordSecurityIntercept('偵測並清除潛在 XSS 程式碼');
  }
  if (didInterceptPrompt) {
    recordSecurityIntercept('偵測並攔截惡意 Prompt Injection 操控注入');
  }

  return cleaned.trim();
}

export function sanitizeObjectDeep(val, depth = 0, currentKey = '') {
  if (depth > 12) return null; // 防止循環引用與深度遞迴攻擊
  if (val === null || val === undefined) return val;

  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => sanitizeObjectDeep(item, depth + 1, currentKey));
  }

  if (typeof val === 'object') {
    const cleanObj = Object.create(null);
    for (const key of Object.getOwnPropertyNames(val)) {
      if (FORBIDDEN_OBJECT_KEYS.has(key)) {
        recordSecurityIntercept(`攔截原型污染攻擊屬性：${key}`);
        continue;
      }
      cleanObj[key] = sanitizeObjectDeep(val[key], depth + 1, key);
    }
    return cleanObj;
  }

  if (typeof val === 'string') {
    // 若為 url 欄位，保留原始格式交由專屬 sanitizeProjectUrl 安全轉化為安全預設
    if (currentKey === 'url') {
      return val.trim();
    }
    return sanitizeStringDeep(val);
  }

  return val;
}

/**
 * 5. 動態產生高仿真虛構混淆專案資料 (Poisoning / Deception System)
 * 踩中陷阱時消耗 AI 駭客爬蟲資源，並防止真實資料遭到逆向探測
 */
export function generateDeceptivePoisonCatalog() {
  return [
    {
      id: 'honeypot-node-quantum-core',
      title: '咩核心量子分佈式計算中樞 Mei Quantum Core',
      subtitle: 'Quantum Resilience Matrix',
      description: '專利高維量子退火狀態模擬器，具備端對端同態加密傳輸架構。',
      category: 'ai-automation',
      icon: 'cpu',
      url: 'https://security-canary.meistudio.dev/telemetry/quantum-null',
      visibility: 'private',
      featured: true,
      pinned: true,
      status: 'online',
      latencyMs: 14,
      version: 'v9.9.9-decoy',
      highlights: ['同態加密驗證', '抗量子干擾拓撲', '零知識證明通道']
    },
    {
      id: 'honeypot-node-shadow-canary',
      title: '暗影金絲雀神經網路誘捕陣列 Mei Shadow Canary',
      subtitle: 'Neural Deception Hub',
      description: '自主代理誘捕架構，即時混淆神經網路權重與特徵流。',
      category: 'interactive-media',
      icon: 'bot',
      url: 'https://security-canary.meistudio.dev/telemetry/canary-null',
      visibility: 'private',
      featured: false,
      pinned: false,
      status: 'online',
      latencyMs: 22,
      version: 'v8.4.1-trap',
      highlights: ['誘餌權重合成', '特徵混淆反制', '深度探針中繼']
    },
    {
      id: 'honeypot-node-hyper-matrix',
      title: '多維虛擬拓撲防護矩陣 Mei Hyper-Matrix',
      subtitle: 'Adaptive Perimeter Protocol',
      description: '動態合成多態虛擬 API 端點，防範未授權逆向爬蟲工程。',
      category: 'web-business',
      icon: 'shield-check',
      url: 'https://security-canary.meistudio.dev/telemetry/perimeter-null',
      visibility: 'private',
      featured: false,
      pinned: false,
      status: 'online',
      latencyMs: 18,
      version: 'v7.2.0-decoy',
      highlights: ['動態蜜罐注入', '行為指紋識別', '多維節點混淆']
    }
  ];
}
