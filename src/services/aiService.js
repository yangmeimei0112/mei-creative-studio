/**
 * 咩創意工作室 (Mei Creative Studio) - AI 客服核心服務 (Free AI API Client & Resilience Engine)
 * 標語：創意無限∞咩有極限
 * 規格：完全免金鑰 (Zero-Key)、開放 CORS 直連、三層容錯降級 (Tier 1 -> Tier 2 -> Tier 3)、
 * 上下文滑動窗口修剪、在途連線取消、全站嚴格零 Emoji 規範
 */

import { matchLocalFaq } from './aiFaqMatcher.js';
import { cleanEmoji } from '../data/studioKnowledgeBase.js';

export const POLLINATIONS_TEXT_ENDPOINT = 'https://text.pollinations.ai/';

export const AI_MODELS = {
  PRIMARY: 'openai',
  FALLBACK: 'deepseek',
  LOCAL_KB: 'local-knowledge-base'
};

export const DEFAULT_OPTIONS = {
  timeoutMs: 18000,
  primaryModel: AI_MODELS.PRIMARY,
  fallbackModel: AI_MODELS.FALLBACK,
  enableLocalFallback: true,
  maxHistoryTurns: 4,
  backoffBaseMs: 500,
  backoffJitterMs: 300,
  seed: 42,
  jsonMode: false
};

// 模組層級活動連線控制器與狀態標記
let activeAbortController = null;
let activeIsUserCancelled = false;

/**
 * 角色標準化與驗證
 * @param {string} role
 * @returns {string|null}
 */
function normalizeRole(role) {
  if (!role || typeof role !== 'string') return null;
  const lower = role.trim().toLowerCase();
  if (lower === 'system' || lower === 'developer') return 'system';
  if (lower === 'user') return 'user';
  if (lower === 'assistant' || lower === 'bot') return 'assistant';
  return null;
}

/**
 * 訊息陣列安全過濾與 Zero-Emoji 消毒
 * @param {Array<Object>} rawMessages
 * @returns {Array<{ role: string, content: string }>}
 */
export function sanitizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];

  const sanitized = [];
  for (const m of rawMessages) {
    if (!m || typeof m !== 'object') continue;
    const role = normalizeRole(m.role);
    if (!role) continue;

    const rawContent = m.content != null ? String(m.content) : '';
    const cleanedContent = cleanEmoji(rawContent).trim();
    if (!cleanedContent) continue;

    sanitized.push({
      role,
      content: cleanedContent
    });
  }

  return sanitized;
}

/**
 * 上下文滑動窗口修剪：保留系統提示詞於 index 0，並保留最近 N 輪（2 * maxTurns）對話
 * @param {Array<Object>} messages - 原始對話紀錄
 * @param {number} [maxTurns=4] - 保留之對話輪數 (每輪含 1 user + 1 assistant)
 * @returns {Array<{ role: string, content: string }>} 修剪後之訊息陣列
 */
export function pruneMessages(messages, maxTurns = DEFAULT_OPTIONS.maxHistoryTurns) {
  if (!Array.isArray(messages)) return [];

  const safeTurns =
    typeof maxTurns === 'number' && Number.isFinite(maxTurns) && maxTurns >= 0
      ? Math.floor(maxTurns)
      : DEFAULT_OPTIONS.maxHistoryTurns;

  const sanitized = sanitizeMessages(messages);
  if (sanitized.length === 0) return [];

  // 1. 擷取第一筆系統提示詞 (若存在)
  const firstSystemPrompt = sanitized.find((m) => m.role === 'system') || null;

  // 2. 擷取所有非系統對話
  const nonSystemMessages = sanitized.filter((m) => m.role !== 'system');

  // 3. 保留最新 maxTurns * 2 則非系統對話
  const maxNonSystemCount = safeTurns * 2;
  const retainedNonSystem =
    maxNonSystemCount > 0 ? nonSystemMessages.slice(-maxNonSystemCount) : [];

  // 4. 確保系統提示詞固定置於 index 0
  return firstSystemPrompt
    ? [firstSystemPrompt, ...retainedNonSystem]
    : retainedNonSystem;
}

/**
 * 主動中斷目前進行中之在途對話請求
 */
export function cancelCurrentChat() {
  if (activeAbortController) {
    activeIsUserCancelled = true;
    try {
      activeAbortController.abort();
    } catch {
      // 安全忽略已中斷異常
    }
    activeAbortController = null;
  }
}

/**
 * 判斷當前環境是否處於離線狀態
 * @returns {boolean}
 */
function isClientOffline() {
  return (
    typeof window !== 'undefined' &&
    window.navigator &&
    window.navigator.onLine === false
  );
}

/**
 * 格式化友善繁體中文錯誤訊息（全站零 Emoji 規範）
 * @param {Error|any} err
 * @returns {string}
 */
export function formatFriendlyErrorMessage(err) {
  const msg = String(err?.message || '');
  if (err?.name === 'AbortError' || msg.includes('Timeout') || msg.includes('逾時')) {
    return 'AI 伺服器回應逾時（超過 18 秒）。目前連線較繁忙，請稍後重試。';
  }
  if (msg.includes('429') || msg.includes('Too Many Requests')) {
    return '目前 AI 服務使用量較大，連線頻率受限。請稍候數秒後重試。';
  }
  if (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('500') ||
    msg.includes('504') ||
    msg.includes('Bad Gateway') ||
    msg.includes('Service Unavailable')
  ) {
    return '遠端 AI 服務正在維護或暫時無法連線。建議您稍後重試。';
  }
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('network') ||
    msg.includes('網路') ||
    msg.includes('中斷')
  ) {
    return 'AI 客服連線暫時不穩定（伺服器忙碌或網路逾時）。建議您稍後重試。';
  }
  return 'AI 客服連線暫時不穩定（伺服器忙碌或網路逾時）。建議您稍後重試。';
}

/**
 * 呼叫單一 Pollinations.ai 模型端點
 * @param {Array<{ role: string, content: string }>} prunedMessages
 * @param {string} modelName
 * @param {number} seed
 * @param {boolean} jsonMode
 * @param {AbortSignal} signal
 * @returns {Promise<string>}
 */
async function callPollinationsEndpoint(
  prunedMessages,
  modelName,
  seed,
  jsonMode,
  signal
) {
  let abortListener = null;
  const abortPromise = new Promise((_, reject) => {
    if (signal?.aborted) {
      const err = new Error(signal.reason?.message || 'The operation was aborted.');
      err.name = 'AbortError';
      return reject(err);
    }
    abortListener = () => {
      const err = new Error(signal.reason?.message || 'The operation was aborted.');
      err.name = 'AbortError';
      reject(err);
    };
    signal?.addEventListener('abort', abortListener, { once: true });
  });

  const fetchPromise = (async () => {
    const response = await fetch(POLLINATIONS_TEXT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain, application/json'
      },
      body: JSON.stringify({
        messages: prunedMessages,
        model: modelName,
        seed,
        jsonMode
      }),
      signal
    });

    if (!response.ok) {
      const statusText = response.statusText || 'Error';
      const err = new Error(`HTTP Error ${response.status}: ${statusText}`);
      err.status = response.status;
      throw err;
    }

    const rawText = await response.text();
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('API 回傳空字串或無效回應');
    }

    let textContent = rawText.trim();

    // 容錯防禦：若後端回傳 JSON 格式包裝之 OpenAI 相容格式或錯誤訊息，進行安全解包
    if (textContent.startsWith('{') && textContent.endsWith('}')) {
      try {
        const parsed = JSON.parse(textContent);
        if (parsed.error) {
          throw new Error(
            typeof parsed.error === 'string'
              ? parsed.error
              : parsed.error.message || '遠端模型回傳錯誤'
          );
        }
        if (Array.isArray(parsed.choices) && parsed.choices[0]?.message?.content) {
          textContent = parsed.choices[0].message.content;
        } else if (typeof parsed.text === 'string') {
          textContent = parsed.text;
        } else if (typeof parsed.content === 'string') {
          textContent = parsed.content;
        }
      } catch (jsonErr) {
        if (jsonErr.message && jsonErr.message.includes('遠端模型回傳錯誤')) {
          throw jsonErr;
        }
      }
    }

    // 容錯防禦：若回傳洩漏之 HTML 錯誤頁面 (例如 502 Bad Gateway 網關頁)
    if (textContent.startsWith('<!DOCTYPE') || textContent.startsWith('<html')) {
      throw new Error('收到非預期之 HTML 錯誤頁面');
    }

    const cleaned = cleanEmoji(textContent).trim();
    if (!cleaned) {
      throw new Error('API 回傳內容經消毒後為空');
    }

    return cleaned;
  })();

  try {
    return await Promise.race([fetchPromise, abortPromise]);
  } finally {
    if (abortListener && signal) {
      try {
        signal.removeEventListener('abort', abortListener);
      } catch {}
    }
  }
}

/**
 * 核心對話發送函式（三層韌性容錯引擎）
 * @param {Array<{ role: string, content: string }>} messages - 對話歷程
 * @param {Object} [options] - 呼叫選項
 * @param {number} [options.timeoutMs=18000] - 逾時上限毫秒數
 * @param {string} [options.primaryModel='openai'] - 主要模型
 * @param {string} [options.fallbackModel='deepseek'] - 備用模型
 * @param {boolean} [options.enableLocalFallback=true] - 遠端不可用時是否自動降級為本地知識庫
 * @param {number} [options.maxHistoryTurns=4] - 保留歷史輪數
 * @param {number} [options.backoffBaseMs] - 退避基礎延遲毫秒數
 * @param {number} [options.backoffJitterMs] - 退避隨機抖動毫秒數
 * @param {number} [options.seed=42] - 隨機性種子
 * @param {boolean} [options.jsonMode=false] - 是否啟用 JSON 模式
 * @param {AbortSignal} [options.signal] - 外部中斷信號
 * @returns {Promise<{ reply: string, source: 'remote'|'local_fallback', model: string, isFallback: boolean }>}
 */
export async function sendChatMessage(messages, options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const {
    timeoutMs,
    primaryModel,
    fallbackModel,
    enableLocalFallback,
    maxHistoryTurns,
    seed,
    jsonMode
  } = mergedOptions;

  // 1. 取得最新使用者提問字串（供本地 FAQ 匹配使用）
  const userQuery =
    [...(Array.isArray(messages) ? messages : [])]
      .reverse()
      .find((m) => m && m.role === 'user')?.content || '';

  // 2. 本地網路狀態先驗檢查 (Offline Pre-Check)
  if (isClientOffline()) {
    if (enableLocalFallback) {
      const fallback = matchLocalFaq(userQuery, { fallbackOnNoMatch: true });
      const rawAnswer = fallback?.reply || fallback?.answer || '';
      return {
        reply: cleanEmoji(
          `${rawAnswer}\n\n【提示：偵測到本機處於離線狀態，已由本地知識庫為您解答】`.trim()
        ),
        source: 'local_fallback',
        model: AI_MODELS.LOCAL_KB,
        isFallback: true
      };
    }
    throw new Error('目前處於離線狀態，請檢查您的網路連線。');
  }

  // 3. 準備並掛載當次 AbortController
  cancelCurrentChat();
  const controller = new AbortController();
  activeAbortController = controller;
  activeIsUserCancelled = false;

  let isTimedOut = false;
  let timeoutId = null;

  // 外部傳入信號連動中斷
  let externalAbortListener = null;
  if (options.signal) {
    if (options.signal.aborted) {
      activeIsUserCancelled = true;
      try {
        controller.abort(options.signal.reason);
      } catch {}
    } else {
      externalAbortListener = () => {
        activeIsUserCancelled = true;
        try {
          controller.abort(options.signal.reason);
        } catch {}
      };
      options.signal.addEventListener('abort', externalAbortListener, { once: true });
    }
  }

  // 設定 18s 逾時定時器
  timeoutId = setTimeout(() => {
    isTimedOut = true;
    try {
      controller.abort(
        new Error(`AI 伺服器回應逾時（超過 ${Math.round(timeoutMs / 1000)} 秒）`)
      );
    } catch {}
  }, timeoutMs);

  // 4. 訊息修剪與安全消毒
  const pruned = pruneMessages(messages, maxHistoryTurns);

  // 輔助函式：執行單次嘗試
  const runRemoteAttempt = async (modelName) => {
    return await callPollinationsEndpoint(
      pruned,
      modelName,
      seed,
      jsonMode,
      controller.signal
    );
  };

  try {
    // 5. Tier 1: 呼叫主要模型 (openai)
    try {
      const reply = await runRemoteAttempt(primaryModel);
      return {
        reply,
        source: 'remote',
        model: primaryModel,
        isFallback: false
      };
    } catch (primaryErr) {
      // 檢查是否為外部手動中斷（使用者關閉視窗、鎖定或點擊取消）
      if (activeIsUserCancelled || options.signal?.aborted) {
        const abortErr = new Error('The user aborted a request.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      // 若已逾時，跳過 Tier 2 直接進入 Tier 3 兜底處理
      if (isTimedOut) {
        throw primaryErr;
      }

      // 6. Tier 2: 備用模型容錯重試 (deepseek，含退避抖動)
      try {
        const isTestEnv =
          typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
        const baseMs =
          typeof mergedOptions.backoffBaseMs === 'number'
            ? mergedOptions.backoffBaseMs
            : isTestEnv
              ? 0
              : 500;
        const jitterMs =
          typeof mergedOptions.backoffJitterMs === 'number'
            ? mergedOptions.backoffJitterMs
            : isTestEnv
              ? 0
              : 300;
        const delay = baseMs + (jitterMs > 0 ? Math.random() * jitterMs : 0);

        if (delay > 0) {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, delay);
            controller.signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                reject(new Error('AbortError'));
              },
              { once: true }
            );
          });
        }

        const reply = await runRemoteAttempt(fallbackModel);
        return {
          reply,
          source: 'remote',
          model: fallbackModel,
          isFallback: true
        };
      } catch (fallbackErr) {
        // 若使用者在退避或備用連線期間取消，拋出 AbortError
        if (activeIsUserCancelled || options.signal?.aborted) {
          const abortErr = new Error('The user aborted a request.');
          abortErr.name = 'AbortError';
          throw abortErr;
        }

        throw fallbackErr;
      }
    }
  } catch (finalErr) {
    // 檢查是否為使用者手動中斷
    if (activeIsUserCancelled || options.signal?.aborted) {
      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    // 7. Tier 3: 本地智能知識庫兜底
    if (enableLocalFallback) {
      const fallback = matchLocalFaq(userQuery, { fallbackOnNoMatch: true });
      const rawAnswer = fallback?.reply || fallback?.answer || '';
      const fallbackNotice = isTimedOut
        ? '\n\n【提示：目前遠端 AI 連線逾時，已由本地智能知識庫為您即時解答】'
        : '\n\n【提示：目前遠端 AI 連線繁忙或無法連線，已由本地智能知識庫為您即時解答】';

      return {
        reply: cleanEmoji(`${rawAnswer}${fallbackNotice}`.trim()),
        source: 'local_fallback',
        model: AI_MODELS.LOCAL_KB,
        isFallback: true
      };
    }

    // 若未啟用本地備援，格式化並拋出友善繁體中文錯誤
    throw new Error(formatFriendlyErrorMessage(finalErr));
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (externalAbortListener && options.signal) {
      try {
        options.signal.removeEventListener('abort', externalAbortListener);
      } catch {}
    }
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}

// 支援兩種匯入風格：具名匯入與預設匯入
const aiService = Object.assign(sendChatMessage, {
  sendChatMessage,
  cancelCurrentChat,
  pruneMessages,
  sanitizeMessages,
  formatFriendlyErrorMessage,
  POLLINATIONS_TEXT_ENDPOINT,
  DEFAULT_OPTIONS,
  AI_MODELS
});

export default aiService;
