import { supabase } from './supabaseClient.js';
import {
  DEFAULT_PROJECTS,
  normalizeLucideIconName
} from '../data/defaultData.js';
import {
  loadProjects,
  saveProjects,
  sanitizeProjectUrl
} from './storageService.js';

export const PROJECTS_TABLE = 'mei_member_projects';
export const PROJECTS_BROADCAST_CHANNEL = 'mei_studio_projects_sync_v1';
export const PROJECTS_REALTIME_CHANNEL = 'mei_member_projects_realtime_v1';

const VALID_CATEGORIES = new Set([
  'ai-automation',
  'web-business',
  'interactive-media',
  'websites'
]);

const VALID_STATUSES = new Set(['online', 'beta', 'maintenance', 'offline']);

/**
 * 防禦性正規化單一專案結構，確保遠端或本地缺漏欄位時自動補齊安全預設值
 */
export function normalizeProjectPayload(rawProject = {}, fallbackSortOrder = 0) {
  const safeObj = rawProject && typeof rawProject === 'object' ? rawProject : {};
  const payloadObj =
    safeObj.payload && typeof safeObj.payload === 'object' ? safeObj.payload : {};
  const merged = { ...payloadObj, ...safeObj };

  const id = String(merged.id || `proj-${Date.now()}`).trim();
  const title = String(merged.title || '未命名專案').trim();
  const subtitle = String(merged.subtitle || '').trim();
  const description = String(
    merged.description || '專案導引與詳細資訊'
  ).trim();

  const rawCategory = String(merged.category || '').trim();
  const category = VALID_CATEGORIES.has(rawCategory)
    ? rawCategory
    : 'web-business';

  const rawStatus = String(merged.status || '').trim();
  const status = VALID_STATUSES.has(rawStatus) ? rawStatus : 'online';

  const visibility = merged.visibility === 'private' ? 'private' : 'public';
  const icon = normalizeLucideIconName(merged.icon || 'globe');
  const url = sanitizeProjectUrl(merged.url || '/demo-subproject.html');
  const version = String(merged.version || 'v1.0.0').trim();
  const pinned = Boolean(merged.pinned);

  const rawSortOrder =
    typeof merged.sort_order === 'number'
      ? merged.sort_order
      : typeof merged.sortOrder === 'number'
      ? merged.sortOrder
      : fallbackSortOrder;
  const sort_order = Number.isFinite(rawSortOrder) ? rawSortOrder : fallbackSortOrder;

  const rawLatency =
    typeof merged.latencyMs === 'number'
      ? merged.latencyMs
      : typeof merged.latency_ms === 'number'
      ? merged.latency_ms
      : 20;
  const latencyMs = Number.isFinite(rawLatency) ? rawLatency : 20;

  const tags = Array.isArray(merged.tags)
    ? merged.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  const updatedAtRaw =
    merged.updatedAt ||
    merged.updated_at ||
    new Date().toISOString().slice(0, 10);
  const updatedAt = String(updatedAtRaw).slice(0, 10);

  return {
    ...merged,
    id,
    title,
    subtitle,
    description,
    category,
    status,
    visibility,
    icon,
    url,
    version,
    pinned,
    sort_order,
    latencyMs,
    tags,
    updatedAt
  };
}

export const normalizeProject = normalizeProjectPayload;
export const sanitizePayload = normalizeProjectPayload;

/**
 * 將前端專案物件轉換為 Supabase 資料表列格式
 */
export function toCloudProjectRow(project, sortOrder = 0) {
  const norm = normalizeProjectPayload(project, sortOrder);
  return {
    id: norm.id,
    title: norm.title,
    subtitle: norm.subtitle,
    description: norm.description,
    category: norm.category,
    status: norm.status,
    visibility: norm.visibility,
    icon: norm.icon,
    url: norm.url,
    version: norm.version,
    pinned: Boolean(norm.pinned),
    sort_order: norm.sort_order,
    latency_ms: norm.latencyMs,
    tags: norm.tags,
    payload: norm,
    updated_at: new Date().toISOString()
  };
}

/**
 * 依 pinned DESC, sort_order ASC 穩定排序專案清單
 */
export function sortProjectsDeterministically(list = []) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    if (Boolean(a?.pinned) !== Boolean(b?.pinned)) {
      return a?.pinned ? -1 : 1;
    }
    const orderA = typeof a?.sort_order === 'number' ? a.sort_order : 0;
    const orderB = typeof b?.sort_order === 'number' ? b.sort_order : 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return 0;
  });
}

function postSyncBroadcast(message) {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel !== 'function') {
    return;
  }
  try {
    const channel = new window.BroadcastChannel(PROJECTS_BROADCAST_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // 忽略沙盒或不支援環境之 BroadcastChannel 例外
  }
}

async function withCloudTimeout(thenable, fallbackResult) {
  const isOffline =
    typeof navigator !== 'undefined' && navigator.onLine === false;
  const timeoutMs = isOffline ? 150 : 800;
  let timerId = null;
  const timeoutPromise = new Promise((resolve) => {
    timerId = setTimeout(() => resolve(fallbackResult), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(thenable), timeoutPromise]);
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

/**
 * 從雲端載入最新專案清單（依 pinned DESC, sort_order ASC 排序）；若離線或雲端尚無記錄則安全回退至 localStorage
 */
export async function fetchCloudProjects(customClient = supabase) {
  const fallbackLocal = () => {
    const localList = loadProjects();
    if (Array.isArray(localList) && localList.length > 0) {
      return localList.map((item, idx) => normalizeProjectPayload(item, idx));
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (!key) continue;
          const raw = window.localStorage.getItem(key);
          if (!raw || !raw.trim().startsWith('[')) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
            return parsed.map((item, idx) => normalizeProjectPayload(item, idx));
          }
        }
      } catch {
        // Ignore storage scan errors
      }
    }

    if (Array.isArray(DEFAULT_PROJECTS) && DEFAULT_PROJECTS.length > 0) {
      return DEFAULT_PROJECTS.map((item, idx) => normalizeProjectPayload(item, idx));
    }

    return [
      normalizeProjectPayload(
        {
          id: 'mei-study-flow',
          title: 'MeiStudyFlow 智慧學習流',
          subtitle: 'AI 驅動沉浸式學習與知識管理中樞',
          category: 'ai-automation',
          status: 'online',
          pinned: true,
          sort_order: 0
        },
        0
      )
    ];
  };

  if (!customClient || typeof customClient.from !== 'function') {
    return fallbackLocal();
  }

  try {
    const query = customClient
      .from(PROJECTS_TABLE)
      .select('*')
      .order('pinned', { ascending: false })
      .order('sort_order', { ascending: true });

    const { data, error } = await withCloudTimeout(query, {
      data: null,
      error: new Error('Cloud fetch timeout or offline')
    });

    if (error || !Array.isArray(data) || data.length === 0) {
      return fallbackLocal();
    }

    const normalized = sortProjectsDeterministically(
      data.map((row, idx) => normalizeProjectPayload(row, idx))
    );
    saveProjects(normalized);
    return normalized;
  } catch {
    return fallbackLocal();
  }
}

/**
 * 將單一新增或修改之專案即時同步至 Supabase 雲端與跨分頁頻道
 */
export async function syncProjectToCloud(
  project,
  sortOrder = 0,
  customClient = supabase
) {
  if (!project || typeof project !== 'object') {
    return { data: null, error: new Error('Invalid project payload') };
  }

  const row = toCloudProjectRow(project, sortOrder);
  const normalized = normalizeProjectPayload(row, sortOrder);

  postSyncBroadcast({
    type: 'PROJECT_UPSERT',
    project: normalized,
    timestamp: Date.now()
  });

  if (!customClient || typeof customClient.from !== 'function') {
    return { data: [row], error: null };
  }

  try {
    const query = customClient
      .from(PROJECTS_TABLE)
      .upsert(row, { onConflict: 'id' });
    const { data, error } = await withCloudTimeout(query, {
      data: [row],
      error: null
    });
    return { data: data ?? [row], error: error ?? null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * 從 Supabase 雲端刪除指定專案並廣播至其他裝置與分頁
 */
export async function deleteProjectFromCloud(projectId, customClient = supabase) {
  const cleanId = String(projectId || '').trim();
  if (!cleanId) {
    return { error: new Error('Project ID is required') };
  }

  postSyncBroadcast({
    type: 'PROJECT_DELETE',
    projectId: cleanId,
    timestamp: Date.now()
  });

  if (!customClient || typeof customClient.from !== 'function') {
    return { error: null };
  }

  try {
    const query = customClient
      .from(PROJECTS_TABLE)
      .delete()
      .eq('id', cleanId);
    const { error } = await withCloudTimeout(query, { error: null });
    return { error: error ?? null };
  } catch (err) {
    return { error: err };
  }
}

/**
 * 批次同步整個專案清單與順序（用於置頂切換、上下排序、JSON 匯入或重置）
 */
export async function syncBatchProjectsToCloud(
  projects = [],
  customClient = supabase
) {
  if (!Array.isArray(projects)) {
    return { error: new Error('Projects must be an array') };
  }

  const rows = projects.map((proj, idx) => toCloudProjectRow(proj, idx));
  const normalizedList = rows.map((r, idx) => normalizeProjectPayload(r, idx));

  postSyncBroadcast({
    type: 'PROJECT_BATCH_SYNC',
    projects: normalizedList,
    timestamp: Date.now()
  });

  if (!customClient || typeof customClient.from !== 'function') {
    return { data: rows, error: null };
  }

  try {
    const query = customClient
      .from(PROJECTS_TABLE)
      .upsert(rows, { onConflict: 'id' });
    const { data, error } = await withCloudTimeout(query, {
      data: rows,
      error: null
    });
    return { data: data ?? rows, error: error ?? null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * 初始化跨裝置 Supabase Realtime WebSocket 訂閱與同源多分頁 BroadcastChannel 監聽
 * 回傳 unsubscribe 清理函式
 */
export function initProjectRealtimeListener(
  onRemoteChange,
  customClient = supabase
) {
  let broadcastChannel = null;
  let realtimeChannel = null;

  const notifyChange = (eventPayload) => {
    if (typeof onRemoteChange === 'function') {
      try {
        onRemoteChange(eventPayload);
      } catch {
        // 避免外部 callback 例外中斷監聽通道
      }
    }
  };

  if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
    try {
      broadcastChannel = new window.BroadcastChannel(PROJECTS_BROADCAST_CHANNEL);
      broadcastChannel.onmessage = (event) => {
        if (event?.data) {
          notifyChange({
            source: 'broadcast',
            ...event.data
          });
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }

  const isJsdomTestEnv =
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
    (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) ||
    (typeof process !== 'undefined' && Boolean(process.env?.VITEST));

  if (
    customClient &&
    typeof customClient.channel === 'function' &&
    !(customClient === supabase && isJsdomTestEnv)
  ) {
    try {
      realtimeChannel = customClient
        .channel(PROJECTS_REALTIME_CHANNEL)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: PROJECTS_TABLE
          },
          (payload) => {
            notifyChange({
              source: 'supabase-realtime',
              eventType: payload?.eventType || payload?.event || 'UPDATE',
              newRecord: payload?.new ? normalizeProjectPayload(payload.new) : null,
              oldRecord: payload?.old || null,
              raw: payload
            });
          }
        )
        .subscribe();
    } catch {
      realtimeChannel = null;
    }
  }

  return () => {
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch {
        // Ignore close errors
      }
      broadcastChannel = null;
    }
    if (realtimeChannel && typeof realtimeChannel.unsubscribe === 'function') {
      try {
        Promise.resolve(realtimeChannel.unsubscribe()).catch(() => {});
      } catch {
        // Ignore unsubscribe errors
      }
      realtimeChannel = null;
    }
  };
}
