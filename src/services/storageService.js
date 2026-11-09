import {
  DEFAULT_CHANGELOG,
  DEFAULT_PROJECTS,
  STUDIO_CONFIG,
  normalizeLucideIconName
} from '../data/defaultData.js';

const STORAGE_KEYS = {
  PROJECTS: 'mei_studio_projects_v1',
  CHANGELOG: 'mei_studio_changelog_v1',
  RECENT_IDS: 'mei_studio_recent_ids_v1',
  THEME: 'mei_studio_theme_v1',
  ADMIN_UNLOCKED: 'mei_studio_admin_unlocked_v1',
  ADMIN_PIN: 'mei_studio_admin_pin_v1',
  INTRO_SEEN: 'mei_studio_intro_seen_v1'
};

let hasLocalMutationSinceBoot = false;

const memoryStorageFallback = {
  localStorage: new Map(),
  sessionStorage: new Map()
};

function safeStorageGet(storageType, key) {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window[storageType];
    if (storage && typeof storage.getItem === 'function') {
      return storage.getItem(key);
    }
  } catch {
    return memoryStorageFallback[storageType]?.get(key) ?? null;
  }
  return null;
}

function safeStorageSet(storageType, key, value) {
  if (typeof window === 'undefined') return;
  const strVal = String(value);
  memoryStorageFallback[storageType]?.set(key, strVal);
  try {
    const storage = window[storageType];
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(key, strVal);
    }
  } catch {
    // Ignore SecurityError / QuotaExceededError and rely on in-memory fallback
  }
}

function safeStorageRemove(storageType, key) {
  if (typeof window === 'undefined') return;
  memoryStorageFallback[storageType]?.delete(key);
  try {
    const storage = window[storageType];
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(key);
    }
  } catch {
    // Ignore SecurityError
  }
}

function safeParseJSON(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * 驗證並清理專案網址，阻擋危險協定 (javascript: / data: / vbscript:) 並自動補齊外部網域 https://
 */
export function sanitizeProjectUrl(rawUrl, fallback = '/demo-subproject.html') {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return fallback;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return fallback;
  }
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * 同步資料至本地 Vite 伺服器 API (/api/projects)，實現混合式資料層持久化
 */
async function syncToServerFile(payload) {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch {
    return false;
  }
}

const LEGACY_SPEC_PATTERN =
  /晴空雲朵淡藍|跨平台數位專案導引大廳|Cloud Sky Blue|#38BDF8|Bento Grid|Bento UI|Lucide 1\.75|strokeWidth\s*1\.75|Sky-Glass Dock|【管理員專屬私人專案】|Icons by Lucide\.dev/i;
const LEGACY_SPEC_GLOBAL_REGEX = new RegExp(LEGACY_SPEC_PATTERN.source, 'gi');

function migrateLegacyProjects(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  let mutated = false;
  const migrated = list.map((item) => {
    if (!item || typeof item !== 'object') return item;
    let nextItem = item;
    if (LEGACY_SPEC_PATTERN.test(JSON.stringify(item))) {
      mutated = true;
      const defaultMatch = DEFAULT_PROJECTS.find((d) => d.id === item.id);
      if (defaultMatch) {
        nextItem = {
          ...defaultMatch,
          pinned: item.pinned ?? defaultMatch.pinned,
          visibility: item.visibility ?? defaultMatch.visibility,
          status: item.status ?? defaultMatch.status
        };
      } else {
        nextItem = {
          ...item,
          description:
            String(item.description || '')
              .replace(LEGACY_SPEC_GLOBAL_REGEX, '')
              .trim() || '專案導引與詳細資訊'
        };
      }
    }
    if ('tags' in nextItem) {
      mutated = true;
      const { tags: _removedTags, ...cleanRest } = nextItem;
      nextItem = cleanRest;
    }
    return nextItem;
  });
  return { migrated, mutated };
}

function migrateLegacyChangelog(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  let mutated = false;
  const migrated = list.map((item, idx) => {
    if (!item || typeof item !== 'object') return item;
    if (
      LEGACY_SPEC_PATTERN.test(JSON.stringify(item)) ||
      (typeof item.version === 'string' && item.version.startsWith('v2.'))
    ) {
      mutated = true;
      const defaultMatch =
        DEFAULT_CHANGELOG.find((d) => d.id === item.id) ||
        DEFAULT_CHANGELOG[idx];
      if (defaultMatch) {
        return { ...defaultMatch };
      }
    }
    return item;
  });
  return { migrated, mutated };
}

const LEGACY_SAMPLE_IDS = new Set([
  'mei-cloud-canvas',
  'mei-ai-copilot',
  'mei-commerce-portal',
  'mei-voice-agent',
  'mei-motion-lab',
  'mei-brand-design-system',
  'mei-internal-devops',
  'mei-secret-prototype',
  'mei-deploy-console',
  'mei-vision-sandbox'
]);

/**
 * 讀取專案清單（優先讀取本地快取，自動過濾已移除的舊版範例專案；若偵測到舊版規格註解則自動遷移）
 */
export function loadProjects() {
  if (typeof window === 'undefined') return [...DEFAULT_PROJECTS];
  const stored = safeParseJSON(
    safeStorageGet('localStorage', STORAGE_KEYS.PROJECTS),
    null
  );
  if (Array.isArray(stored)) {
    const cleaned = stored.filter(
      (item) => item && !LEGACY_SAMPLE_IDS.has(item.id)
    );
    if (cleaned.length !== stored.length) {
      safeStorageSet(
        'localStorage',
        STORAGE_KEYS.PROJECTS,
        JSON.stringify(cleaned)
      );
      syncToServerFile({
        studio: STUDIO_CONFIG.studioNameZh,
        updatedAt: new Date().toISOString(),
        projects: cleaned,
        changelog: loadChangelog()
      });
      return cleaned;
    }
    if (stored.length > 0) {
      const check = migrateLegacyProjects(stored);
      if (check?.mutated) {
        safeStorageSet(
          'localStorage',
          STORAGE_KEYS.PROJECTS,
          JSON.stringify(check.migrated)
        );
        return check.migrated;
      }
    }
    return stored;
  }
  safeStorageSet(
    'localStorage',
    STORAGE_KEYS.PROJECTS,
    JSON.stringify(DEFAULT_PROJECTS)
  );
  return [...DEFAULT_PROJECTS];
}

/**
 * 儲存專案清單並觸發非阻塞伺服器端 JSON 同步
 */
export function saveProjects(projects) {
  hasLocalMutationSinceBoot = true;
  const cleanedProjects = Array.isArray(projects)
    ? projects.map((item) => {
        if (!item || typeof item !== 'object' || !('tags' in item)) return item;
        const { tags: _removedTags, ...rest } = item;
        return rest;
      })
    : [];
  safeStorageSet(
    'localStorage',
    STORAGE_KEYS.PROJECTS,
    JSON.stringify(cleanedProjects)
  );
  syncToServerFile({
    studio: STUDIO_CONFIG.studioNameZh,
    updatedAt: new Date().toISOString(),
    projects: cleanedProjects,
    changelog: loadChangelog()
  });
  return cleanedProjects;
}

/**
 * 調整專案順序（支援管理員在介面直接上移 / 下移排序專案）
 */
export function reorderProjectList(projects, projectId, direction = 'up') {
  if (!Array.isArray(projects) || projects.length < 2) return projects;
  // 先依置頂分組穩定排列，確保畫面顯示順序與陣列索引一致
  const ordered = [...projects].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return 0;
  });

  const idx = ordered.findIndex((p) => p.id === projectId);
  if (idx === -1) return ordered;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= ordered.length) return ordered;

  const currentItem = { ...ordered[idx] };
  const neighborItem = { ...ordered[targetIdx] };

  // 若跨置頂邊界移動，自動同步置頂狀態以維持使用者直覺預期的排列位置
  if (Boolean(currentItem.pinned) !== Boolean(neighborItem.pinned)) {
    currentItem.pinned = Boolean(neighborItem.pinned);
  }

  ordered[idx] = neighborItem;
  ordered[targetIdx] = currentItem;
  return ordered;
}

/**
 * 從伺服器端 /api/projects 載入最新持久化設定（若有，且尚未發生本地端即時修改）
 */
export async function fetchServerProjectsIfAvailable() {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch('/api/projects', { method: 'GET' });
    if (!res.ok) return null;
    if (hasLocalMutationSinceBoot) return null;
    const data = await res.json();
    if (data && Array.isArray(data.projects) && data.projects.length > 0) {
      const cleanProjects =
        migrateLegacyProjects(data.projects)?.migrated || data.projects;
      const cleanChangelog =
        Array.isArray(data.changelog) && data.changelog.length > 0
          ? migrateLegacyChangelog(data.changelog)?.migrated || data.changelog
          : null;

      if (typeof window !== 'undefined' && !hasLocalMutationSinceBoot) {
        safeStorageSet(
          'localStorage',
          STORAGE_KEYS.PROJECTS,
          JSON.stringify(cleanProjects)
        );
        if (cleanChangelog) {
          safeStorageSet(
            'localStorage',
            STORAGE_KEYS.CHANGELOG,
            JSON.stringify(cleanChangelog)
          );
        }
      }
      return cleanProjects;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 讀取與儲存工作室版本日誌 (Studio Pulse Changelog)
 */
export function loadChangelog() {
  if (typeof window === 'undefined') return [...DEFAULT_CHANGELOG];
  const stored = safeParseJSON(
    safeStorageGet('localStorage', STORAGE_KEYS.CHANGELOG),
    null
  );
  if (Array.isArray(stored) && stored.length > 0) {
    const check = migrateLegacyChangelog(stored);
    if (check?.mutated) {
      safeStorageSet(
        'localStorage',
        STORAGE_KEYS.CHANGELOG,
        JSON.stringify(check.migrated)
      );
      return check.migrated;
    }
    return stored;
  }
  safeStorageSet(
    'localStorage',
    STORAGE_KEYS.CHANGELOG,
    JSON.stringify(DEFAULT_CHANGELOG)
  );
  return [...DEFAULT_CHANGELOG];
}

export function saveChangelog(changelogList) {
  hasLocalMutationSinceBoot = true;
  safeStorageSet(
    'localStorage',
    STORAGE_KEYS.CHANGELOG,
    JSON.stringify(changelogList)
  );
  syncToServerFile({
    studio: STUDIO_CONFIG.studioNameZh,
    updatedAt: new Date().toISOString(),
    projects: loadProjects(),
    changelog: changelogList
  });
  return changelogList;
}

/**
 * 工作室版本日誌回復原廠設定 (Reset Changelog to Default)
 */
export function resetChangelogToDefault() {
  hasLocalMutationSinceBoot = true;
  safeStorageSet(
    'localStorage',
    STORAGE_KEYS.CHANGELOG,
    JSON.stringify(DEFAULT_CHANGELOG)
  );
  syncToServerFile({
    studio: STUDIO_CONFIG.studioNameZh,
    updatedAt: new Date().toISOString(),
    projects: loadProjects(),
    changelog: DEFAULT_CHANGELOG
  });
  return [...DEFAULT_CHANGELOG];
}

/**
 * 最近開啟專案紀錄 (Recent Visits)
 */
export function loadRecentProjectIds() {
  if (typeof window === 'undefined') return [];
  const stored = safeParseJSON(
    safeStorageGet('localStorage', STORAGE_KEYS.RECENT_IDS),
    []
  );
  return Array.isArray(stored) ? stored : [];
}

export function recordProjectVisit(projectId) {
  if (!projectId || typeof window === 'undefined') return [];
  const current = loadRecentProjectIds().filter((id) => id !== projectId);
  const updated = [projectId, ...current].slice(0, 6);
  safeStorageSet(
    'localStorage',
    STORAGE_KEYS.RECENT_IDS,
    JSON.stringify(updated)
  );
  return updated;
}

/**
 * 主題模式管理 (light = 晴空雲朵淡藍預設 / dark = 星夜冰藍)
 */
export function loadTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = safeStorageGet('localStorage', STORAGE_KEYS.THEME);
  return saved === 'dark' ? 'dark' : 'light';
}

export function saveTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  safeStorageSet('localStorage', STORAGE_KEYS.THEME, normalized);
  return normalized;
}

/**
 * 管理員權限與密碼驗證 (預設密碼：mei888)
 */
export function getAdminPin() {
  if (typeof window === 'undefined') return STUDIO_CONFIG.defaultAdminPin;
  return (
    safeStorageGet('localStorage', STORAGE_KEYS.ADMIN_PIN) ||
    STUDIO_CONFIG.defaultAdminPin
  );
}

export function setAdminPin(newPin) {
  if (!newPin || String(newPin).trim().length < 4) {
    throw new Error('管理員密碼長度至少需 4 個字元');
  }
  const clean = String(newPin).trim();
  safeStorageSet('localStorage', STORAGE_KEYS.ADMIN_PIN, clean);
  return clean;
}

export function verifyAdminPin(inputPin) {
  const target = getAdminPin();
  return String(inputPin || '').trim() === target;
}

export function loadAdminUnlocked() {
  if (typeof window === 'undefined') return false;
  return safeStorageGet('sessionStorage', STORAGE_KEYS.ADMIN_UNLOCKED) === 'true';
}

export function saveAdminUnlocked(isUnlocked) {
  safeStorageSet(
    'sessionStorage',
    STORAGE_KEYS.ADMIN_UNLOCKED,
    isUnlocked ? 'true' : 'false'
  );
  return Boolean(isUnlocked);
}

/**
 * 大廳開場動畫同分頁狀態管理 (sessionStorage，含 SecurityError 安全防護)
 */
export function hasSeenEntranceIntro() {
  if (typeof window === 'undefined') return false;
  return safeStorageGet('sessionStorage', STORAGE_KEYS.INTRO_SEEN) === 'true';
}

export function markEntranceIntroSeen() {
  safeStorageSet('sessionStorage', STORAGE_KEYS.INTRO_SEEN, 'true');
  return true;
}

export function resetEntranceIntroSeen() {
  safeStorageRemove('sessionStorage', STORAGE_KEYS.INTRO_SEEN);
  return false;
}

/**
 * 重置為預設工作室資料
 */
export function resetStudioDataToDefault() {
  hasLocalMutationSinceBoot = true;
  safeStorageSet(
    'localStorage',
    STORAGE_KEYS.PROJECTS,
    JSON.stringify(DEFAULT_PROJECTS)
  );
  safeStorageSet(
    'localStorage',
    STORAGE_KEYS.CHANGELOG,
    JSON.stringify(DEFAULT_CHANGELOG)
  );
  safeStorageRemove('localStorage', STORAGE_KEYS.RECENT_IDS);
  syncToServerFile({
    studio: STUDIO_CONFIG.studioNameZh,
    updatedAt: new Date().toISOString(),
    projects: DEFAULT_PROJECTS,
    changelog: DEFAULT_CHANGELOG
  });
  return {
    projects: [...DEFAULT_PROJECTS],
    changelog: [...DEFAULT_CHANGELOG]
  };
}

/**
 * 匯出與匯入 JSON 備份結構驗證
 */
export function createBackupPayload(projects, changelog) {
  const sourceProjects = Array.isArray(projects) ? projects : loadProjects();
  const cleanProjects = sourceProjects.map((item) => {
    if (!item || typeof item !== 'object' || !('tags' in item)) return item;
    const { tags: _removedTags, ...rest } = item;
    return rest;
  });
  return {
    studio: STUDIO_CONFIG.studioNameZh,
    studioEn: STUDIO_CONFIG.studioNameEn,
    version: STUDIO_CONFIG.version,
    exportedAt: new Date().toISOString(),
    projects: cleanProjects,
    changelog: Array.isArray(changelog) ? changelog : loadChangelog()
  };
}

export function parseAndValidateBackupJSON(jsonString) {
  let parsed;
  try {
    parsed =
      typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch {
    throw new Error('JSON 格式無法解析，請確認備份檔案是否完整。');
  }

  const rawCandidate = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.projects)
      ? parsed.projects
      : null;

  const validProjectObjects = Array.isArray(rawCandidate)
    ? rawCandidate.filter(
        (item) => item !== null && typeof item === 'object' && !Array.isArray(item)
      )
    : [];

  if (validProjectObjects.length === 0) {
    throw new Error('備份檔中找不到有效的 projects 專案陣列。');
  }

  const normalizedProjects = validProjectObjects.map((item, idx) => ({
    id: String(item.id || `project-${Date.now()}-${idx}`),
    title: String(item.title || '未命名專案').trim() || '未命名專案',
    subtitle: String(item.subtitle || '').trim(),
    description: String(item.description || '').trim(),
    category: ['ai-automation', 'web-business', 'interactive-media'].includes(
      item.category
    )
      ? item.category
      : 'web-business',
    icon: normalizeLucideIconName(String(item.icon || 'cloud')),
    url: sanitizeProjectUrl(item.url, '/demo-subproject.html'),
    visibility: item.visibility === 'private' ? 'private' : 'public',
    featured: Boolean(item.featured),
    pinned: Boolean(item.pinned),
    status: ['online', 'beta', 'maintenance', 'offline'].includes(item.status)
      ? item.status
      : 'online',
    latencyMs:
      item.status === 'offline' ? null : Math.max(1, Number(item.latencyMs) || 24),
    version: String(item.version || 'v1.0.0'),
    updatedAt: String(item.updatedAt || new Date().toISOString().slice(0, 10)),
    platforms: Array.isArray(item.platforms)
      ? item.platforms.map(String)
      : ['iOS', 'Android', 'macOS', 'Windows'],
    highlights: Array.isArray(item.highlights)
      ? item.highlights.filter(Boolean).map(String)
      : []
  }));

  const rawChangelog = Array.isArray(parsed?.changelog)
    ? parsed.changelog.filter(
        (item) => item !== null && typeof item === 'object' && !Array.isArray(item)
      )
    : null;

  const normalizedChangelog =
    rawChangelog && rawChangelog.length > 0
      ? rawChangelog.map((entry, idx) => ({
          id: String(entry.id || `pulse-import-${Date.now()}-${idx}`),
          version: String(entry.version || 'v1.0.0').trim(),
          date: String(entry.date || new Date().toISOString().slice(0, 10)).trim(),
          title: String(entry.title || '工作室動態更新').trim(),
          category: String(entry.category || '工作室動態').trim(),
          icon: normalizeLucideIconName(String(entry.icon || 'sparkles')),
          summary: String(entry.summary || '').trim()
        }))
      : loadChangelog();

  return {
    projects: normalizedProjects,
    changelog: normalizedChangelog
  };
}

/**
 * 非阻塞式專案連線健康度巡檢器 (Live Health Check Probe)
 * 對同源網址進行真實 HEAD/GET 探測並檢查 HTTP 狀態碼，對外部跨域網址進行 no-cors 探測並計算回應毫秒數
 */
export async function probeProjectHealth(project) {
  const checkedAt = new Date().toISOString();
  if (!project || !project.url || !String(project.url).trim()) {
    return { status: 'offline', latencyMs: null, checkedAt };
  }

  const cleanUrl = sanitizeProjectUrl(project.url, '');
  if (!cleanUrl) {
    return { status: 'offline', latencyMs: null, checkedAt };
  }

  // Keep explicit maintenance status intact unless user changes it
  if (project.status === 'maintenance') {
    return {
      status: 'maintenance',
      latencyMs: project.latencyMs || 38,
      checkedAt
    };
  }

  const start =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const isLocalPath = cleanUrl.startsWith('/');
    if (typeof fetch !== 'undefined') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'http://localhost:5173';
      const targetUrl = isLocalPath ? `${origin}${cleanUrl}` : cleanUrl;

      let res;
      try {
        res = await fetch(targetUrl, {
          method: isLocalPath ? 'HEAD' : 'GET',
          mode: isLocalPath ? 'same-origin' : 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (res && res.type !== 'opaque' && res.ok === false) {
        return {
          status: 'offline',
          latencyMs: null,
          checkedAt
        };
      }
    }

    const end =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const measured = Math.max(8, Math.min(999, Math.round(end - start)));
    return {
      status: project.status === 'beta' ? 'beta' : 'online',
      latencyMs: measured,
      checkedAt
    };
  } catch {
    return {
      status: 'offline',
      latencyMs: null,
      checkedAt
    };
  }
}

/**
 * 產生子專案專屬的「返回咩創意大廳 (mei-dock.js)」嵌入碼
 */
export function generateSubprojectEmbedSnippet(
  project,
  hubOrigin,
  position = 'bottom-right'
) {
  const origin =
    hubOrigin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://mei-studio.example.com');
  const safeTitle = String(project?.title || '咩創意子專案')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safePosition =
    position === 'bottom-left' ? 'bottom-left' : 'bottom-right';

  return `<!-- 咩創意工作室 Mei Creative Studio：返回大廳懸浮導覽膠囊 -->
<script
  src="${origin}/sdk/mei-dock.js"
  data-hub-url="${origin}/"
  data-project-name="${safeTitle}"
  data-position="${safePosition}"
  defer
></script>`;
}
