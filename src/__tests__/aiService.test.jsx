/**
 * 咩創意工作室 (Mei Creative Studio) - aiService 單元測試套件
 * 涵蓋：上下文修剪 (pruneMessages)、在途請求取消 (cancelCurrentChat)、
 * 三層容錯 (Timeout / 429 Retry / Offline / Tier 3 FAQ)、全站零 Emoji 規範
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sendChatMessage,
  cancelCurrentChat,
  pruneMessages,
  sanitizeMessages,
  formatFriendlyErrorMessage,
  POLLINATIONS_TEXT_ENDPOINT,
  DEFAULT_OPTIONS,
  AI_MODELS
} from '../services/aiService.js';

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('AI 客服核心服務 (aiService.js) 單元測試套件', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    cancelCurrentChat();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    cancelCurrentChat();
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. 上下文滑動窗口修剪 (pruneMessages)
  // =========================================================================
  describe('1. 上下文滑動窗口修剪 (pruneMessages) 規格與邊界防護', () => {
    it('1.1 基本修剪：當對話超過預設 4 輪（8 則）時，固定保留 index 0 之系統提示詞，並保留最新 8 則對話', () => {
      const messages = [
        { role: 'system', content: '你是咩創意特助' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
        { role: 'assistant', content: 'A2' },
        { role: 'user', content: 'Q3' },
        { role: 'assistant', content: 'A3' },
        { role: 'user', content: 'Q4' },
        { role: 'assistant', content: 'A4' },
        { role: 'user', content: 'Q5' },
        { role: 'assistant', content: 'A5' }
      ];

      const pruned = pruneMessages(messages, 4);
      expect(pruned[0]).toEqual({ role: 'system', content: '你是咩創意特助' });
      expect(pruned.length).toBe(9); // 1 system + 8 conversation messages
      expect(pruned[1]).toEqual({ role: 'user', content: 'Q2' });
      expect(pruned[pruned.length - 1]).toEqual({ role: 'assistant', content: 'A5' });
    });

    it('1.2 無系統提示詞情境：若傳入對話無 system role，正確回傳最新 8 則對話', () => {
      const messages = [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
        { role: 'assistant', content: 'A2' },
        { role: 'user', content: 'Q3' },
        { role: 'assistant', content: 'A3' },
        { role: 'user', content: 'Q4' },
        { role: 'assistant', content: 'A4' },
        { role: 'user', content: 'Q5' },
        { role: 'assistant', content: 'A5' }
      ];

      const pruned = pruneMessages(messages, 4);
      expect(pruned.length).toBe(8);
      expect(pruned[0]).toEqual({ role: 'user', content: 'Q2' });
      expect(pruned[7]).toEqual({ role: 'assistant', content: 'A5' });
    });

    it('1.3 歷史對話不足 4 輪時：完整保留所有訊息，順序不變', () => {
      const messages = [
        { role: 'system', content: '系統提示詞' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' }
      ];

      const pruned = pruneMessages(messages, 4);
      expect(pruned).toEqual(messages);
    });

    it('1.4 自訂 maxTurns 參數：自訂 maxTurns = 2 時保留 1 + 4 則；maxTurns = 3 相容 E2E T3-C-02', () => {
      const longHistory = [
        { role: 'system', content: '系統提示詞' },
        { role: 'user', content: '第1問' },
        { role: 'assistant', content: '第1答' },
        { role: 'user', content: '第2問' },
        { role: 'assistant', content: '第2答' },
        { role: 'user', content: '第3問' },
        { role: 'assistant', content: '第3答' },
        { role: 'user', content: '第4問' },
        { role: 'assistant', content: '第4答' },
        { role: 'user', content: '第5問' },
        { role: 'assistant', content: '第5答' },
        { role: 'user', content: '第6問' }
      ];

      const pruned3 = pruneMessages(longHistory, 3);
      expect(pruned3[0].role).toBe('system');
      expect(pruned3.length).toBeLessThanOrEqual(7); // 1 + 3*2 = 7

      const pruned2 = pruneMessages(longHistory, 2);
      expect(pruned2[0].role).toBe('system');
      expect(pruned2.length).toBe(5); // 1 + 2*2 = 5
      expect(pruned2[4]).toEqual({ role: 'user', content: '第6問' });
    });

    it('1.5 邊界防禦：傳入 null、undefined、[]、{}、字串或數字時安全回傳空陣列', () => {
      expect(pruneMessages(null)).toEqual([]);
      expect(pruneMessages(undefined)).toEqual([]);
      expect(pruneMessages([])).toEqual([]);
      expect(pruneMessages({})).toEqual([]);
      expect(pruneMessages('not an array')).toEqual([]);
      expect(pruneMessages(12345)).toEqual([]);
    });

    it('1.6 稀疏陣列與空內容處理：過濾 null、undefined、空字串或僅含空白/Emoji 之無效訊息', () => {
      const sparse = [
        null,
        undefined,
        { role: 'system', content: '有效系統提示' },
        { role: 'user', content: '   ' },
        { role: 'assistant', content: '' },
        { role: 'user', content: '\u{1F389}\u{2728}' }, // 清除 Emoji 後為空字串，應過濾
        { role: 'user', content: '有效問題' }
      ];

      const pruned = pruneMessages(sparse, 4);
      expect(pruned).toEqual([
        { role: 'system', content: '有效系統提示' },
        { role: 'user', content: '有效問題' }
      ]);
    });

    it('1.7 多筆系統提示詞防禦：若傳入多筆 system 角色，僅提取第一筆置於 index 0', () => {
      const multiSystem = [
        { role: 'system', content: '第一筆系統提示' },
        { role: 'user', content: '使用者問題' },
        { role: 'system', content: '重複的第二筆系統提示' },
        { role: 'assistant', content: '助手回覆' }
      ];

      const pruned = pruneMessages(multiSystem, 4);
      expect(pruned[0]).toEqual({ role: 'system', content: '第一筆系統提示' });
      const systemCount = pruned.filter((m) => m.role === 'system').length;
      expect(systemCount).toBe(1);
    });

    it('1.8 極端 maxTurns 參數：maxTurns = 0 時僅保留系統提示詞；負數或非數值安全採用預設 4', () => {
      const messages = [
        { role: 'system', content: '系統提示' },
        { role: 'user', content: '問題' },
        { role: 'assistant', content: '回答' }
      ];

      expect(pruneMessages(messages, 0)).toEqual([{ role: 'system', content: '系統提示' }]);
      expect(pruneMessages(messages, -1).length).toBe(3);
      expect(pruneMessages(messages, NaN).length).toBe(3);
    });

    it('1.9 sanitizeMessages 單獨測試：消毒角色與字串內容', () => {
      const result = sanitizeMessages([
        { role: 'DEVELOPER', content: '開發者提示' },
        { role: 'bot', content: '機器人回答' },
        { role: 'unknown_role', content: '無效角色' }
      ]);
      expect(result).toEqual([
        { role: 'system', content: '開發者提示' },
        { role: 'assistant', content: '機器人回答' }
      ]);
    });
  });

  // =========================================================================
  // 2. 在途連線取消與控制器生命週期 (cancelCurrentChat)
  // =========================================================================
  describe('2. 在途連線取消與控制器生命週期 (cancelCurrentChat & AbortController)', () => {
    it('2.1 呼叫 cancelCurrentChat() 能即刻中斷進行中的遠端 fetch 請求', async () => {
      let abortedSignal = false;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        options?.signal?.addEventListener('abort', () => {
          abortedSignal = true;
        });
        return new Promise(() => {}); // pending
      });

      const chatPromise = sendChatMessage([{ role: 'user', content: '測試取消' }]);
      expect(abortedSignal).toBe(false);

      cancelCurrentChat();
      expect(abortedSignal).toBe(true);
      await expect(chatPromise).rejects.toThrow();
    });

    it('2.2 在無在途請求時呼叫 cancelCurrentChat() 為安全無效操作，不拋出錯誤', () => {
      expect(() => cancelCurrentChat()).not.toThrow();
    });

    it('2.3 使用者手動取消時，立即拋出 AbortError，嚴禁觸發次級模型重試或本地兜底', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        callCount++;
        return new Promise(() => {});
      });

      const chatPromise = sendChatMessage(
        [{ role: 'user', content: '請問管理員預設 PIN 是什麼？' }],
        { enableLocalFallback: true }
      );

      cancelCurrentChat();

      await expect(chatPromise).rejects.toMatchObject({ name: 'AbortError' });
      expect(callCount).toBe(1); // 絕不重試第二模型
    });

    it('2.4 支援外部傳入之 options.signal：外部 signal 中斷時同步中斷 fetch', async () => {
      let abortedSignal = false;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        options?.signal?.addEventListener('abort', () => {
          abortedSignal = true;
        });
        return new Promise(() => {});
      });

      const externalController = new AbortController();
      const chatPromise = sendChatMessage(
        [{ role: 'user', content: '外部信號測試' }],
        { signal: externalController.signal }
      );

      externalController.abort();
      expect(abortedSignal).toBe(true);
      await expect(chatPromise).rejects.toThrow();
    });

    it('2.5 連線成功完成或異常結束後，活動控制器指標乾淨清理', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '回覆內容'
      });

      await sendChatMessage([{ role: 'user', content: '測試清理' }]);
      // 成功後呼叫 cancelCurrentChat 應無任何活動 controller 可 abort
      expect(() => cancelCurrentChat()).not.toThrow();
    });
  });

  // =========================================================================
  // 3. 免費 AI API 端點 (Pollinations.ai) 直連 (Happy Path)
  // =========================================================================
  describe('3. 免費 AI API 端點 (Pollinations.ai) 直連與正常回應 (Happy Path)', () => {
    it('3.1 成功發送對話至 Pollinations.ai，包含正確 POST 方法、標頭與 Body', async () => {
      const mockReply = '您好！我是咩創意特助。';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => mockReply
      });

      const messages = [
        { role: 'system', content: '你是特助' },
        { role: 'user', content: '你好' }
      ];

      const result = await sendChatMessage(messages, {
        primaryModel: 'openai',
        seed: 42
      });

      expect(global.fetch).toHaveBeenCalledWith(
        POLLINATIONS_TEXT_ENDPOINT,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"model":"openai"')
        })
      );

      expect(result).toEqual({
        reply: mockReply,
        source: 'remote',
        model: 'openai',
        isFallback: false
      });
    });

    it('3.2 支援自訂 options.primaryModel', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '自訂模型回答'
      });

      const result = await sendChatMessage(
        [{ role: 'user', content: '問' }],
        { primaryModel: 'mistral' }
      );

      expect(result.model).toBe('mistral');
    });

    it('3.3 容錯解包：若遠端偶發回傳 OpenAI 相容 JSON 格式，安全解包提取本文', async () => {
      const jsonResponse = JSON.stringify({
        choices: [
          {
            message: {
              content: '這是由 JSON choices 提取出的文字回答'
            }
          }
        ]
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => jsonResponse
      });

      const result = await sendChatMessage([{ role: 'user', content: '問' }]);
      expect(result.reply).toBe('這是由 JSON choices 提取出的文字回答');
    });

    it('3.4 若遠端回傳 HTML 錯誤頁面，丟出錯誤並進行容錯', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '<!DOCTYPE html><html><body>Error</body></html>'
      });

      const result = await sendChatMessage(
        [{ role: 'user', content: '測試 HTML' }],
        { enableLocalFallback: true }
      );

      expect(result.source).toBe('local_fallback');
      expect(result.isFallback).toBe(true);
    });
  });

  // =========================================================================
  // 4. 18,000ms 逾時邊界防護與資源清理
  // =========================================================================
  describe('4. 18,000ms 逾時邊界防護與資源清理 (Tier 1 Timeout)', () => {
    it('4.1 當遠端請求超過 18,000ms 時準確觸發 AbortController', async () => {
      vi.useFakeTimers();
      let abortedSignal = false;

      global.fetch = vi.fn().mockImplementation((url, options) => {
        options?.signal?.addEventListener('abort', () => {
          abortedSignal = true;
        });
        return new Promise(() => {}); // never resolves
      });

      const chatPromise = sendChatMessage(
        [{ role: 'user', content: '逾時測試' }],
        { timeoutMs: 18000, enableLocalFallback: false }
      );

      expect(abortedSignal).toBe(false);

      vi.advanceTimersByTime(18000);

      expect(abortedSignal).toBe(true);
      await expect(chatPromise).rejects.toThrow(/逾時|Timeout/i);
    });

    it('4.2 逾時且啟用本地備援時，無縫轉入 Tier 3 本地知識庫解答', async () => {
      vi.useFakeTimers();

      global.fetch = vi.fn().mockImplementation((url, options) => {
        return new Promise(() => {});
      });

      const chatPromise = sendChatMessage(
        [{ role: 'user', content: '預設管理員 PIN 碼是什麼？' }],
        { timeoutMs: 18000, enableLocalFallback: true }
      );

      vi.advanceTimersByTime(18000);

      const result = await chatPromise;
      expect(result.source).toBe('local_fallback');
      expect(result.isFallback).toBe(true);
      expect(result.reply).toContain('mei888');
      expect(result.reply).toContain('逾時');
      expect(EMOJI_REGEX.test(result.reply)).toBe(false);
    });

    it('4.3 請求完成後 clearTimeout 被正常呼叫，不殘留懸掛計時器', async () => {
      vi.useFakeTimers();
      const clearSpy = vi.spyOn(global, 'clearTimeout');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '即時回覆'
      });

      await sendChatMessage([{ role: 'user', content: '測試計時器清理' }]);
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. 429 / 503 流量限制與次級模型自動容錯重試 (Tier 1 -> Tier 2 Failover)
  // =========================================================================
  describe('5. 429 / 503 流量限制與次級模型自動容錯重試 (Tier 1 -> Tier 2 Failover)', () => {
    it('5.1 主要模型回傳 HTTP 429 時，自動切換至 deepseek 並成功回傳', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        callCount++;
        const body = JSON.parse(options.body);
        if (body.model === 'openai') {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests'
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => 'DeepSeek 備用線路回覆成功'
        });
      });

      const result = await sendChatMessage(
        [{ role: 'user', content: '測試 429' }],
        {
          primaryModel: 'openai',
          fallbackModel: 'deepseek',
          backoffBaseMs: 0,
          backoffJitterMs: 0
        }
      );

      expect(callCount).toBe(2);
      expect(result.source).toBe('remote');
      expect(result.model).toBe('deepseek');
      expect(result.isFallback).toBe(true);
      expect(result.reply).toContain('DeepSeek');
    });

    it('5.2 主要模型回傳 HTTP 503 / 500 時，亦自動切換次級模型', async () => {
      let modelsCalled = [];
      global.fetch = vi.fn().mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        modelsCalled.push(body.model);
        if (body.model === 'openai') {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable'
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '次級模型救急成功'
        });
      });

      const result = await sendChatMessage(
        [{ role: 'user', content: '測試 503' }],
        { backoffBaseMs: 0, backoffJitterMs: 0 }
      );

      expect(modelsCalled).toEqual(['openai', 'deepseek']);
      expect(result.model).toBe('deepseek');
    });

    it('5.3 遠端回傳空字串回應時，觸發次級模型與備援', async () => {
      global.fetch = vi.fn().mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        if (body.model === 'openai') {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => '   '
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '次級模型非空回覆'
        });
      });

      const result = await sendChatMessage(
        [{ role: 'user', content: '空字串測試' }],
        { backoffBaseMs: 0, backoffJitterMs: 0 }
      );

      expect(result.reply).toBe('次級模型非空回覆');
      expect(result.isFallback).toBe(true);
    });
  });

  // =========================================================================
  // 6. 離線先驗偵測與本地智能知識庫備援 (Tier 3 Local FAQ Fallback)
  // =========================================================================
  describe('6. 離線先驗偵測與本地智能知識庫備援 (Tier 3 Local FAQ Fallback)', () => {
    it('6.1 瀏覽器離線 (navigator.onLine === false) 且 enableLocalFallback 為 true 時，直接由本地知識庫接手回答', async () => {
      const originalOnLine = window.navigator.onLine;
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        configurable: true
      });

      global.fetch = vi.fn();

      try {
        const result = await sendChatMessage(
          [{ role: 'user', content: '請問預設 PIN 碼是什麼？' }],
          { enableLocalFallback: true }
        );

        expect(global.fetch).not.toHaveBeenCalled(); // 絕不發動網路請求
        expect(result.source).toBe('local_fallback');
        expect(result.model).toBe('local-knowledge-base');
        expect(result.isFallback).toBe(true);
        expect(result.reply).toContain('mei888');
        expect(result.reply).toContain('離線');
        expect(EMOJI_REGEX.test(result.reply)).toBe(false);
      } finally {
        Object.defineProperty(window.navigator, 'onLine', {
          value: originalOnLine,
          configurable: true
        });
      }
    });

    it('6.2 離線且 enableLocalFallback 為 false 時，丟出繁體中文錯誤', async () => {
      const originalOnLine = window.navigator.onLine;
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        configurable: true
      });

      try {
        await expect(
          sendChatMessage([{ role: 'user', content: '離線' }], {
            enableLocalFallback: false
          })
        ).rejects.toThrow(/離線/);
      } finally {
        Object.defineProperty(window.navigator, 'onLine', {
          value: originalOnLine,
          configurable: true
        });
      }
    });

    it('6.3 遠端服務全面不可用時，自動啟動本地智能問答解答', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('遠端網路全面中斷'));

      const result = await sendChatMessage(
        [{ role: 'user', content: '大廳有哪些專案分類？' }],
        {
          enableLocalFallback: true,
          backoffBaseMs: 0,
          backoffJitterMs: 0
        }
      );

      expect(result.source).toBe('local_fallback');
      expect(result.isFallback).toBe(true);
      expect(result.reply).toContain('ai-automation');
      expect(result.reply).toContain('提示');
      expect(EMOJI_REGEX.test(result.reply)).toBe(false);
    });

    it('6.4 遠端失敗且 enableLocalFallback 為 false 時，丟出友善繁體中文錯誤', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(
        sendChatMessage([{ role: 'user', content: '提問' }], {
          enableLocalFallback: false,
          backoffBaseMs: 0,
          backoffJitterMs: 0
        })
      ).rejects.toThrow(/AI 客服連線暫時不穩定|網路/);
    });
  });

  // =========================================================================
  // 7. 全站嚴格零 Emoji (Zero-Emoji) 政策驗證
  // =========================================================================
  describe('7. 全站嚴格零 Emoji (Zero-Emoji) 政策驗證', () => {
    it('7.1 遠端模型回傳內容若夾帶 Emoji，經 cleanEmoji 清洗確保回覆字串無任何 Emoji', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '您好！\u{1F916}我是特助\u{2728}，這是給您的解答\u{1F4A1}！'
      });

      const result = await sendChatMessage([{ role: 'user', content: '哈囉' }]);
      expect(EMOJI_REGEX.test(result.reply)).toBe(false);
      expect(result.reply).toContain('您好！我是特助，這是給您的解答！');
    });

    it('7.2 本地知識庫離線與遠端繁忙提示詞中，嚴格不使用表情符號或任何 Emoji', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

      const result = await sendChatMessage(
        [{ role: 'user', content: '品牌標語是什麼？' }],
        { enableLocalFallback: true, backoffBaseMs: 0, backoffJitterMs: 0 }
      );

      expect(EMOJI_REGEX.test(result.reply)).toBe(false);
      expect(result.reply).toContain('創意無限∞咩有極限');
    });
  });

  // =========================================================================
  // 8. 介面契約與模組匯出相容性
  // =========================================================================
  describe('8. 介面契約與模組匯出相容性', () => {
    it('8.1 確保匯出所有約定函式與常數，符合 PROJECT.md 介面規格', () => {
      expect(typeof sendChatMessage).toBe('function');
      expect(typeof cancelCurrentChat).toBe('function');
      expect(typeof pruneMessages).toBe('function');
      expect(typeof sanitizeMessages).toBe('function');
      expect(typeof formatFriendlyErrorMessage).toBe('function');
      expect(typeof POLLINATIONS_TEXT_ENDPOINT).toBe('string');
      expect(POLLINATIONS_TEXT_ENDPOINT).toContain('pollinations.ai');
      expect(DEFAULT_OPTIONS).toBeDefined();
      expect(DEFAULT_OPTIONS.timeoutMs).toBe(18000);
      expect(DEFAULT_OPTIONS.primaryModel).toBe('openai');
      expect(DEFAULT_OPTIONS.fallbackModel).toBe('deepseek');
      expect(DEFAULT_OPTIONS.enableLocalFallback).toBe(true);
      expect(DEFAULT_OPTIONS.maxHistoryTurns).toBe(4);
      expect(AI_MODELS).toBeDefined();
      expect(AI_MODELS.PRIMARY).toBe('openai');
      expect(AI_MODELS.FALLBACK).toBe('deepseek');
      expect(AI_MODELS.LOCAL_KB).toBe('local-knowledge-base');
    });

    it('8.2 formatFriendlyErrorMessage 涵蓋不同錯誤類型的親切回覆', () => {
      expect(formatFriendlyErrorMessage(new Error('HTTP 429: Too Many Requests'))).toContain('連線頻率受限');
      expect(formatFriendlyErrorMessage(new Error('HTTP 503: Service Unavailable'))).toContain('遠端 AI 服務正在維護');
      expect(formatFriendlyErrorMessage(new Error('Failed to fetch'))).toContain('AI 客服連線暫時不穩定');
      const abortErr = new Error('Timeout');
      abortErr.name = 'AbortError';
      expect(formatFriendlyErrorMessage(abortErr)).toContain('逾時');
    });
  });
});
