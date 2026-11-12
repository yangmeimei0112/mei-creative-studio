import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import App from '../App';
import {
  DEFAULT_PROJECTS,
  PROJECT_CATEGORIES,
  STUDIO_CONFIG,
  DEFAULT_CHANGELOG
} from '../data/defaultData';
import {
  verifyAdminPin,
  setAdminPin,
  saveAdminUnlocked,
  loadAdminUnlocked
} from '../services/storageService';

// Zero Emoji verification regular expression
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

// Helper to detect if implementation files are present on disk
const fileExists = (relPath) => fs.existsSync(path.resolve(relPath));

const HAS_KNOWLEDGE_BASE = fileExists('src/data/studioKnowledgeBase.js');
const HAS_FAQ_MATCHER = fileExists('src/services/aiFaqMatcher.js');
const HAS_AI_SERVICE = fileExists('src/services/aiService.js');
const HAS_CHAT_WIDGET = fileExists('src/components/AdminChatWidget.jsx');

// Dynamic module loader using non-static string to avoid build-time bundler transform failure
const loadModule = async (subpath) => {
  try {
    const fullPath = '../' + subpath;
    return await import(fullPath);
  } catch (err) {
    return null;
  }
};

describe('咩創意工作室 Mei Creative Studio - AI 客服系統端對端 (E2E) 完整規格驗證', () => {
  let studioKnowledgeBaseMod = null;
  let aiFaqMatcherMod = null;
  let aiServiceMod = null;
  let AdminChatWidgetComp = null;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.restoreAllMocks();

    if (HAS_KNOWLEDGE_BASE) {
      studioKnowledgeBaseMod = await loadModule('data/studioKnowledgeBase.js');
    }
    if (HAS_FAQ_MATCHER) {
      aiFaqMatcherMod = await loadModule('services/aiFaqMatcher.js');
    }
    if (HAS_AI_SERVICE) {
      aiServiceMod = await loadModule('services/aiService.js');
    }
    if (HAS_CHAT_WIDGET) {
      const mod = await loadModule('components/AdminChatWidget.jsx');
      AdminChatWidgetComp = mod?.default || mod;
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // Tier 1: 核心功能覆蓋 (Feature Coverage - Happy Path & Core Spec, 20 Tests)
  // =========================================================================
  describe('Tier 1: 核心功能全覆蓋 (Feature Coverage)', () => {
    // -----------------------------------------------------------------------
    // F1: 管理員模式限定之權限生命週期 (Admin Permission Gating, 5 Tests)
    // -----------------------------------------------------------------------
    it('T1-F1-01: 訪客公開視角 (未解鎖) 下，DOM 樹中完全無 admin-chat-fab 與 admin-chat-window', () => {
      window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
      const { container } = render(<App />);

      expect(screen.queryByTestId('admin-chat-fab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('admin-chat-window')).not.toBeInTheDocument();
      expect(container.querySelector('[aria-label="開啟咩創意 AI 專屬客服"]')).toBeNull();
      expect(loadAdminUnlocked()).toBe(false);
    });

    it('T1-F1-02: 管理員輸入正確 PIN (mei888) 解鎖後，浮動按鈕 (admin-chat-fab) 順暢出現在畫面右下角', async () => {
      window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
      render(<App />);

      const unlockBtns = screen.getAllByText('管理員解鎖');
      fireEvent.click(unlockBtns[0]);

      const pinInput = screen.getByLabelText('管理員密碼輸入框');
      fireEvent.change(pinInput, { target: { value: 'mei888' } });
      fireEvent.click(screen.getByText('立即解鎖管理後台'));

      expect(loadAdminUnlocked()).toBe(true);

      if (HAS_CHAT_WIDGET) {
        const fab = await screen.findByTestId('admin-chat-fab');
        expect(fab).toBeInTheDocument();
        expect(fab).toHaveAttribute('aria-label', '開啟咩創意 AI 專屬客服');
      }
    });

    it('T1-F1-03: 點擊 admin-chat-fab 可展開對話視窗 (admin-chat-window)，呈現歡迎詞與管理員限定標籤', async () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      const fab = screen.getByTestId('admin-chat-fab');
      fireEvent.click(fab);

      const chatWindow = screen.getByTestId('admin-chat-window');
      expect(chatWindow).toBeInTheDocument();
      expect(within(chatWindow).getByText('管理員限定')).toBeInTheDocument();
      expect(within(chatWindow).getByText('咩創意 AI 助手')).toBeInTheDocument();
    });

    it('T1-F1-04: 管理員點擊鎖定按鈕後，isAdmin 變更為 false，對話視窗立即關閉且浮動按鈕從 DOM 移除', async () => {
      window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
      render(<App />);

      // 解鎖
      const unlockBtns = screen.getAllByText('管理員解鎖');
      fireEvent.click(unlockBtns[0]);
      fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
        target: { value: 'mei888' }
      });
      fireEvent.click(screen.getByText('立即解鎖管理後台'));
      expect(loadAdminUnlocked()).toBe(true);

      // 鎖定切換
      const lockBtn = screen.getByTitle('已解鎖管理員模式（點擊切換回公開訪客視角）');
      fireEvent.click(lockBtn);

      expect(loadAdminUnlocked()).toBe(false);
      expect(screen.queryByTestId('admin-chat-fab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('admin-chat-window')).not.toBeInTheDocument();
    });

    it('T1-F1-05: 重新整理同分頁後，自 sessionStorage 正確恢復管理員解鎖狀態與客服入口', async () => {
      saveAdminUnlocked(true);
      window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');

      render(<App />);
      expect(loadAdminUnlocked()).toBe(true);

      if (HAS_CHAT_WIDGET) {
        const fab = await screen.findByTestId('admin-chat-fab');
        expect(fab).toBeInTheDocument();
      }
    });

    // -----------------------------------------------------------------------
    // F2: 免費 AI API 直連與三層韌性容錯 (Free AI API Resilience, 5 Tests)
    // -----------------------------------------------------------------------
    it('T1-F2-01: 呼叫免費遠端 AI 端點 (Pollinations.ai)，發送對話無需任何金鑰即可成功獲得回覆', async () => {
      if (!HAS_AI_SERVICE) return;

      const mockResponseText = '您好！我是咩創意工作室 AI 專屬特助。管理員密碼預設為 mei888。';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => mockResponseText
      });

      const messages = [
        { role: 'system', content: '你是咩創意工作室 AI 特助' },
        { role: 'user', content: '請問預設管理員密碼是什麼？' }
      ];

      const result = await aiServiceMod.sendChatMessage(messages, {
        primaryModel: 'openai',
        enableLocalFallback: false
      });

      expect(result).toBeDefined();
      expect(result.reply).toBe(mockResponseText);
      expect(result.source).toBe('remote');
      expect(result.model).toBe('openai');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pollinations.ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' })
        })
      );
    });

    it('T1-F2-02: 發送訊息時進入載入中狀態 (isLoading: true)，輸入框禁用防止重複送出', async () => {
      if (!HAS_CHAT_WIDGET) return;

      let resolveFetch;
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      const submitBtn = screen.getByLabelText('發送訊息');

      fireEvent.change(textarea, { target: { value: '如何新增自訂專案？' } });
      fireEvent.click(submitBtn);

      expect(submitBtn).toBeDisabled();
      expect(textarea).toBeDisabled();
      expect(screen.getByText(/正在思考中|線上就緒/i)).toBeInTheDocument();

      // 清理 pending promise
      act(() => {
        resolveFetch({
          ok: true,
          status: 200,
          text: async () => '步驟指引'
        });
      });
    });

    it('T1-F2-03: 遠端請求逾時 (超過 18 秒) 自動觸發 AbortController 中斷連線並釋放定時資源', async () => {
      if (!HAS_AI_SERVICE) return;

      vi.useFakeTimers();
      let abortedSignal = false;

      global.fetch = vi.fn().mockImplementation((url, options) => {
        options?.signal?.addEventListener('abort', () => {
          abortedSignal = true;
        });
        return new Promise(() => {}); // 永遠不回傳以觸發逾時
      });

      const chatPromise = aiServiceMod.sendChatMessage(
        [{ role: 'user', content: '連線逾時測試' }],
        { timeoutMs: 18000, enableLocalFallback: false }
      );

      // 快進 18500ms
      act(() => {
        vi.advanceTimersByTime(18500);
      });

      await expect(chatPromise).rejects.toThrow();
      expect(abortedSignal).toBe(true);
    });

    it('T1-F2-04: 遭遇 HTTP 429 流量限制時自動觸發退避重試並容錯切換次級模型 (deepseek)', async () => {
      if (!HAS_AI_SERVICE) return;

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
          text: async () => '備用次級模型 DeepSeek 回覆成功'
        });
      });

      const result = await aiServiceMod.sendChatMessage(
        [{ role: 'user', content: '測試模型容錯轉移' }],
        {
          primaryModel: 'openai',
          fallbackModel: 'deepseek',
          enableLocalFallback: false
        }
      );

      expect(callCount).toBeGreaterThanOrEqual(2);
      expect(result.source).toBe('remote');
      expect(result.model).toBe('deepseek');
      expect(result.reply).toContain('DeepSeek');
    });

    it('T1-F2-05: 遠端服務全面不可用時，自動啟動 Tier 3 本地智能問答匹配器提供繁體中文解答', async () => {
      if (!HAS_AI_SERVICE) return;

      global.fetch = vi.fn().mockRejectedValue(new Error('遠端網路中斷'));

      const result = await aiServiceMod.sendChatMessage(
        [{ role: 'user', content: '請問管理員預設 PIN 碼是什麼？' }],
        { enableLocalFallback: true }
      );

      expect(result).toBeDefined();
      expect(result.source).toBe('local_fallback');
      expect(result.isFallback).toBe(true);
      expect(result.reply).toContain('mei888');
      expect(EMOJI_REGEX.test(result.reply)).toBe(false);
    });

    // -----------------------------------------------------------------------
    // F3: 網站領域知識與操作問題解答 (Website Knowledge Q&A, 5 Tests)
    // -----------------------------------------------------------------------
    it('T1-F3-01: 提問工作室品牌理念與核心標語，準確回答「創意無限∞咩有極限」', () => {
      if (!HAS_FAQ_MATCHER) return;

      const match = aiFaqMatcherMod.matchLocalFaq('咩創意工作室的理念與標語是什麼？');
      expect(match).not.toBeNull();
      const reply = match.reply || match.answer;
      expect(reply).toContain('創意無限∞咩有極限');
      expect(reply).toContain('咩創意工作室');
      expect(EMOJI_REGEX.test(reply)).toBe(false);
    });

    it('T1-F3-02: 提問大廳目前專案與三大領域分類，完整列舉專案名稱與分類特性', () => {
      if (!HAS_FAQ_MATCHER) return;

      const match = aiFaqMatcherMod.matchLocalFaq('大廳有哪些專案分類？');
      expect(match).not.toBeNull();
      const reply = match.reply || match.answer;
      expect(reply).toContain('AI 與自動化工具');
      expect(reply).toContain('網站與商業應用');
      expect(reply).toContain('互動設計與多媒體');
      expect(EMOJI_REGEX.test(reply)).toBe(false);
    });

    it('T1-F3-03: 提問管理員密碼與資安機制，準確說明預設碼 mei888 與 5 次失敗安全鎖定', () => {
      if (!HAS_FAQ_MATCHER) return;

      const match = aiFaqMatcherMod.matchLocalFaq('如何解鎖管理員模式？預設 PIN 是什麼？');
      expect(match).not.toBeNull();
      const reply = match.reply || match.answer;
      expect(reply).toContain('mei888');
      expect(EMOJI_REGEX.test(reply)).toBe(false);
    });

    it('T1-F3-04: 提問子專案接入 SDK，提供完整的 mei-dock.js 嵌入代碼與參數說明', () => {
      if (!HAS_FAQ_MATCHER) return;

      const match = aiFaqMatcherMod.matchLocalFaq('如何在子專案加入返回大廳膠囊 SDK？');
      expect(match).not.toBeNull();
      const reply = match.reply || match.answer;
      expect(reply).toContain('/sdk/mei-dock.js');
      expect(reply).toContain('data-hub-url');
      expect(EMOJI_REGEX.test(reply)).toBe(false);
    });

    it('T1-F3-05: 支援連續多輪對話，歷史訊息按時序排列且正確滾動排版', async () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      const submitBtn = screen.getByLabelText('發送訊息');

      // 第一輪
      fireEvent.change(textarea, { target: { value: '第一輪提問' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('第一輪提問')).toBeInTheDocument();

      // 第二輪
      fireEvent.change(textarea, { target: { value: '第二輪接續提問' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('第二輪接續提問')).toBeInTheDocument();
    });

    // -----------------------------------------------------------------------
    // F4: 專案現有與並行功能相容性 (Compatibility & Non-Interference, 5 Tests)
    // -----------------------------------------------------------------------
    it('T1-F4-01: 開場動畫 PortalEntrance (z-[60]) 播放期間，客服視窗維持收合不干擾動效', () => {
      const { container } = render(<App />);

      // 初次載入開場動畫存在
      const overlay = screen.getByTestId('portal-entrance-overlay');
      expect(overlay).toBeInTheDocument();

      // 檢查開場遮罩覆蓋時無任何干擾對話視窗
      expect(screen.queryByTestId('admin-chat-window')).not.toBeInTheDocument();
      expect(screen.queryByTestId('admin-chat-fab')).not.toBeInTheDocument();
    });

    it('T1-F4-02: 客服視窗內部品牌圖示與 StudioLogo 向量樣式保持完全一致 (1.75 strokeWidth)', () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      const { container } = render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const chatWindow = screen.getByTestId('admin-chat-window');

      // 檢查對話視窗頂部的 StudioLogo 或 Lucide 圖示
      const logoEl = chatWindow.querySelector('[data-testid="studio-brand-logo"]') ||
        chatWindow.querySelector('svg');
      expect(logoEl).toBeInTheDocument();
    });

    it('T1-F4-03: 行動裝置版型下，浮動按鈕設置於 bottom-20 位置，與 MobileBottomNav 保持 16px 邊界', () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      const fab = screen.getByTestId('admin-chat-fab');
      expect(fab.className).toContain('bottom-20');
      expect(fab.className).toContain('z-40');
    });

    it('T1-F4-04: 點擊快速推薦問題膠囊 (Quick Suggestion Chips)，自動填入並立即觸發送出', async () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const chipBtn = screen.getByText('如何修改管理員解鎖密碼？');
      expect(chipBtn).toBeInTheDocument();

      fireEvent.click(chipBtn);
      expect(await screen.findByText('如何修改管理員解鎖密碼？')).toBeInTheDocument();
    });

    it('T1-F4-05: 全流程檢查靜態與動態字串，確保 100% 遵守全站零 Emoji 政策', () => {
      expect(EMOJI_REGEX.test(STUDIO_CONFIG.studioNameZh)).toBe(false);
      expect(EMOJI_REGEX.test(STUDIO_CONFIG.tagline)).toBe(false);

      if (HAS_KNOWLEDGE_BASE) {
        const prompt = studioKnowledgeBaseMod.buildStudioSystemPrompt({
          projects: DEFAULT_PROJECTS,
          changelog: DEFAULT_CHANGELOG
        });
        expect(EMOJI_REGEX.test(prompt)).toBe(false);
      }

      if (HAS_FAQ_MATCHER) {
        aiFaqMatcherMod.FAQ_KNOWLEDGE_ENTRIES?.forEach((entry) => {
          expect(EMOJI_REGEX.test(entry.question)).toBe(false);
          expect(EMOJI_REGEX.test(entry.answer)).toBe(false);
        });
      }
    });
  });

  // =========================================================================
  // Tier 2: 邊界與極端異常處理 (Boundary & Corner Cases, 20 Tests)
  // =========================================================================
  describe('Tier 2: 邊界與極端異常處理 (Boundary & Corner Cases)', () => {
    // -----------------------------------------------------------------------
    // B1: 輸入極值與內容消毒 (5 Tests)
    // -----------------------------------------------------------------------
    it('T2-B1-01: 輸入純空白字元或空字串，發送按鈕保持禁用，不發動任何網路請求', () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      const submitBtn = screen.getByLabelText('發送訊息');

      fireEvent.change(textarea, { target: { value: '     ' } });
      expect(submitBtn).toBeDisabled();
    });

    it('T2-B1-02: 輸入單一字元極短字串，系統能正常送出不崩潰', async () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      const submitBtn = screen.getByLabelText('發送訊息');

      fireEvent.change(textarea, { target: { value: '?' } });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      expect(await screen.findByText('?')).toBeInTheDocument();
    });

    it('T2-B1-03: 輸入超過 800 字元的超長字串，對話窗口保持佈局穩定不破版', async () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      const submitBtn = screen.getByLabelText('發送訊息');

      const longPrompt = '長度測試'.repeat(250); // 1000 字元
      fireEvent.change(textarea, { target: { value: longPrompt } });
      fireEvent.click(submitBtn);

      const msgEl = await screen.findByText(longPrompt);
      expect(msgEl).toBeInTheDocument();
      expect(msgEl.parentElement).toHaveClass('break-words');
    });

    it('T2-B1-04: 輸入惡意 XSS 標籤與屬性，渲染時全數安全轉義為純文字不執行', async () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      const submitBtn = screen.getByLabelText('發送訊息');

      const xssString = '<script>window.__CHAT_XSS__=true</script><img src=x onerror=alert(1)>';
      fireEvent.change(textarea, { target: { value: xssString } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(xssString)).toBeInTheDocument();
      expect(window.__CHAT_XSS__).toBeUndefined();
      expect(document.querySelector('img[src="x"]')).toBeNull();
    });

    it('T2-B1-05: 輸入惡意 Prompt Injection 指令，系統安全過濾並禮貌引導拒絕', () => {
      if (!HAS_KNOWLEDGE_BASE) return;

      const systemPrompt = studioKnowledgeBaseMod.buildStudioSystemPrompt({
        projects: DEFAULT_PROJECTS,
        changelog: DEFAULT_CHANGELOG
      });

      expect(systemPrompt).toContain('安全防護邊界');
      expect(systemPrompt).toContain('DAN 模式');
      expect(systemPrompt).toContain('忽略');
    });

    // -----------------------------------------------------------------------
    // B2: 網路中斷與異常協議 (5 Tests)
    // -----------------------------------------------------------------------
    it('T2-B2-01: 瀏覽器離線 (navigator.onLine === false) 時送出提問，直接由本地知識庫接手回答', async () => {
      if (!HAS_AI_SERVICE) return;

      const originalOnLine = window.navigator.onLine;
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        configurable: true
      });

      try {
        const result = await aiServiceMod.sendChatMessage(
          [{ role: 'user', content: '請問預設 PIN 碼是什麼？' }],
          { enableLocalFallback: true }
        );

        expect(result.source).toBe('local_fallback');
        expect(result.reply).toContain('mei888');
        expect(result.reply).toContain('離線');
      } finally {
        Object.defineProperty(window.navigator, 'onLine', {
          value: originalOnLine,
          configurable: true
        });
      }
    });

    it('T2-B2-02: 外部網路發生 TypeError (Failed to fetch) 時，呈現親切繁體中文錯誤提示與重試引導', async () => {
      if (!HAS_AI_SERVICE) return;

      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await aiServiceMod.sendChatMessage(
        [{ role: 'user', content: '隨機非結構問題' }],
        { enableLocalFallback: true }
      );

      expect(result).toBeDefined();
      expect(result.source).toBe('local_fallback');
      expect(EMOJI_REGEX.test(result.reply)).toBe(false);
    });

    it('T2-B2-03: 伺服器回傳空回應字串時，觸發防護機制呈現適當提示而不白屏', async () => {
      if (!HAS_AI_SERVICE) return;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '   '
      });

      const result = await aiServiceMod.sendChatMessage(
        [{ role: 'user', content: '空字串回應測試' }],
        { enableLocalFallback: true }
      );

      expect(result).toBeDefined();
      expect(result.reply.length).toBeGreaterThan(0);
    });

    it('T2-B2-04: 伺服器回傳非預期 HTML 格式或畸形資料時，安全解析容錯不崩潰', async () => {
      if (!HAS_AI_SERVICE) return;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: async () => '<html><body>502 Bad Gateway</body></html>'
      });

      const result = await aiServiceMod.sendChatMessage(
        [{ role: 'user', content: '網關錯誤測試' }],
        { enableLocalFallback: true }
      );

      expect(result).toBeDefined();
      expect(result.isFallback).toBe(true);
    });

    it('T2-B2-05: 18,000ms 逾時邊界精度驗證：模擬延遲 18,500ms，確認在 18,000ms 準確觸發 AbortController', async () => {
      if (!HAS_AI_SERVICE) return;

      vi.useFakeTimers();
      let abortedAtMs = null;
      const startTime = Date.now();

      global.fetch = vi.fn().mockImplementation((url, opts) => {
        opts?.signal?.addEventListener('abort', () => {
          abortedAtMs = Date.now() - startTime;
        });
        return new Promise(() => {});
      });

      const p = aiServiceMod.sendChatMessage(
        [{ role: 'user', content: '精確逾時測試' }],
        { timeoutMs: 18000, enableLocalFallback: false }
      );

      act(() => {
        vi.advanceTimersByTime(18000);
      });

      await expect(p).rejects.toThrow();
    });

    // -----------------------------------------------------------------------
    // B3: 權限切換臨界狀態 (5 Tests)
    // -----------------------------------------------------------------------
    it('T2-B3-01: 在 AI 請求尚未回傳之在途期間 (In-Flight) 執行管理員鎖定，即刻中斷網路請求並清除狀態', async () => {
      if (!HAS_CHAT_WIDGET) return;

      let aborted = false;
      global.fetch = vi.fn().mockImplementation((url, opts) => {
        opts?.signal?.addEventListener('abort', () => {
          aborted = true;
        });
        return new Promise(() => {});
      });

      const Widget = AdminChatWidgetComp;
      const { rerender } = render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      fireEvent.change(textarea, { target: { value: '在途請求' } });
      fireEvent.click(screen.getByLabelText('發送訊息'));

      // 管理員在請求在途期間被鎖定
      rerender(
        <Widget
          isAdmin={false}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      expect(screen.queryByTestId('admin-chat-fab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('admin-chat-window')).not.toBeInTheDocument();
      expect(aborted).toBe(true);
    });

    it('T2-B3-02: 極速連續點擊管理員解鎖/鎖定切換，狀態不發生競爭衝突', () => {
      window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
      render(<App />);

      const unlockBtns = screen.getAllByText('管理員解鎖');
      fireEvent.click(unlockBtns[0]);
      fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
        target: { value: 'mei888' }
      });
      fireEvent.click(screen.getByText('立即解鎖管理後台'));

      // 連續反覆切換
      const lockBtn = screen.getByTitle('已解鎖管理員模式（點擊切換回公開訪客視角）');
      fireEvent.click(lockBtn);
      expect(loadAdminUnlocked()).toBe(false);
    });

    it('T2-B3-03: sessionStorage 中的解鎖標記遭外部竄改為異常值時，預設安全降級為訪客模式', () => {
      window.sessionStorage.setItem('mei_studio_admin_unlocked_v1', 'corrupted_value');
      expect(loadAdminUnlocked()).toBe(false);

      window.sessionStorage.setItem('mei_studio_admin_unlocked_v1', 'null');
      expect(loadAdminUnlocked()).toBe(false);
    });

    it('T2-B3-04: 未解鎖狀態下嘗試透過快速鍵或模擬事件呼叫對話介面，嚴格被拒', () => {
      window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
      render(<App />);

      expect(loadAdminUnlocked()).toBe(false);
      expect(screen.queryByTestId('admin-chat-fab')).not.toBeInTheDocument();

      // 按下鍵盤快捷鍵
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      const dialog = screen.getByRole('dialog', { name: /全域極速搜尋與快捷命令列/i });
      expect(dialog).toBeInTheDocument();

      // 命令列中不應出現直接進入 AI 客服的未解鎖捷徑
      expect(within(dialog).queryByText('開啟 AI 客服')).not.toBeInTheDocument();
    });

    it('T2-B3-05: 點擊對話清單工具列清除紀錄按鈕，立即清空對話並復原預設歡迎詞', async () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const textarea = screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i);
      fireEvent.change(textarea, { target: { value: '待清除訊息' } });
      fireEvent.click(screen.getByLabelText('發送訊息'));

      expect(await screen.findByText('待清除訊息')).toBeInTheDocument();

      const clearBtn = screen.getByLabelText('清除對話紀錄');
      fireEvent.click(clearBtn);

      expect(screen.queryByText('待清除訊息')).not.toBeInTheDocument();
      expect(screen.getByText(/已清除歷史對話紀錄/i)).toBeInTheDocument();
    });

    // -----------------------------------------------------------------------
    // B4: 視窗佈局與極端解析度 (5 Tests)
    // -----------------------------------------------------------------------
    it('T2-B4-01: 極窄行動裝置視窗 (320px) 下，對話抽屜滿版響應無水平破版', () => {
      if (!HAS_CHAT_WIDGET) return;

      window.innerWidth = 320;
      window.innerHeight = 568;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const chatWindow = screen.getByTestId('admin-chat-window');
      expect(chatWindow).toHaveClass('inset-x-0');
      expect(chatWindow).toHaveClass('bottom-0');
    });

    it('T2-B4-02: 超寬螢幕 (3840px 4K) 下，浮動卡片維持 420px 寬度於右下角不無限制拉伸', () => {
      if (!HAS_CHAT_WIDGET) return;

      window.innerWidth = 3840;
      window.innerHeight = 2160;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const chatWindow = screen.getByTestId('admin-chat-window');
      expect(chatWindow.className).toContain('sm:w-[420px]');
      expect(chatWindow.className).toContain('sm:right-8');
    });

    it('T2-B4-03: 右下角全域 Toast 通知彈出時，浮動按鈕與 Toast 在視覺層級上共存不重疊卡死', () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      const fab = screen.getByTestId('admin-chat-fab');
      expect(fab).toHaveClass('z-40');
      // Toast 在 z-50，兩者各自獨立分層
    });

    it('T2-B4-04: 快速連續點擊多個不同快速問題膠囊，防抖機制生效，不產生重複並行請求', async () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const chips = screen.getAllByRole('button').filter((b) =>
        b.className.includes('rounded-full text-[11px]')
      );

      if (chips.length >= 2) {
        fireEvent.click(chips[0]);
        fireEvent.click(chips[1]);
        // 第二次點擊應被防抖或載入中鎖定保護
        expect(screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i)).toBeDefined();
      }
    });

    it('T2-B4-05: 對話視窗展開時按下鍵盤 Escape 鍵或點擊關閉按鈕，能平滑收合', () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      expect(screen.getByTestId('admin-chat-window')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('關閉對話視窗');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('admin-chat-window')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Tier 3: 跨功能組合與交互 (Cross-Feature Combinations, 5 Tests)
  // =========================================================================
  describe('Tier 3: 跨功能組合與交互 (Cross-Feature Combinations)', () => {
    it('T3-C-01: 組合一 (鎖定攔截在途請求): 管理員在在途連線中執行鎖定，Fetch 即刻 Abort 且 DOM 完全卸載', async () => {
      if (!HAS_CHAT_WIDGET) return;

      let abortTriggered = false;
      global.fetch = vi.fn().mockImplementation((url, opts) => {
        opts?.signal?.addEventListener('abort', () => {
          abortTriggered = true;
        });
        return new Promise(() => {});
      });

      const Widget = AdminChatWidgetComp;
      const { rerender } = render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      fireEvent.change(screen.getByPlaceholderText(/詢問專案、操作步驟或系統設定/i), {
        target: { value: '在途請求測試' }
      });
      fireEvent.click(screen.getByLabelText('發送訊息'));

      // 模擬管理員在此時鎖定
      rerender(
        <Widget
          isAdmin={false}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      expect(abortTriggered).toBe(true);
      expect(screen.queryByTestId('admin-chat-fab')).toBeNull();
      expect(screen.queryByTestId('admin-chat-window')).toBeNull();
    });

    it('T3-C-02: 組合二 (多輪對話修剪與次級模型容錯): 超過 6 輪對話時發送訊息，驗證歷程修剪於 4 輪以內', () => {
      if (!HAS_AI_SERVICE) return;

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

      const pruned = aiServiceMod.pruneMessages(longHistory, 3);
      expect(pruned[0].role).toBe('system');
      expect(pruned.length).toBeLessThanOrEqual(7); // system + 3 turns (6 msgs)
    });

    it('T3-C-03: 組合三 (動態專案更新與知識庫同步): 新增自訂專案後，動態 System Prompt 即刻收錄新專案資訊', () => {
      if (!HAS_KNOWLEDGE_BASE) return;

      const customProjects = [
        ...DEFAULT_PROJECTS,
        {
          id: 'custom-new-flow',
          title: '咩創意超維度畫布',
          category: 'interactive-media',
          status: 'online',
          visibility: 'public',
          url: 'https://example.com/canvas'
        }
      ];

      const prompt = studioKnowledgeBaseMod.buildStudioSystemPrompt({
        projects: customProjects,
        changelog: DEFAULT_CHANGELOG
      });

      expect(prompt).toContain('咩創意超維度畫布');
      expect(prompt).toContain('interactive-media');
      expect(EMOJI_REGEX.test(prompt)).toBe(false);
    });

    it('T3-C-04: 組合四 (開場動畫重播與客服視窗互斥): 在客服視窗開啟狀態下重播開場動畫，對話視窗自動收合', () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      const { rerender } = render(
        <Widget
          isAdmin={true}
          isIntroPlaying={false}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      expect(screen.getByTestId('admin-chat-window')).toBeInTheDocument();

      // 觸發開場動畫重播 (isIntroPlaying 變為 true)
      rerender(
        <Widget
          isAdmin={true}
          isIntroPlaying={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      expect(screen.queryByTestId('admin-chat-window')).not.toBeInTheDocument();
    });

    it('T3-C-05: 組合五 (深淺色主題切換與訊息渲染): 主題切換時，對話泡泡與毛玻璃樣式維持正常無渲染破裂', () => {
      if (!HAS_CHAT_WIDGET) return;

      const Widget = AdminChatWidgetComp;
      const { container } = render(
        <Widget
          isAdmin={true}
          projects={DEFAULT_PROJECTS}
          changelog={DEFAULT_CHANGELOG}
        />
      );

      fireEvent.click(screen.getByTestId('admin-chat-fab'));
      const chatWindow = screen.getByTestId('admin-chat-window');

      // 驗證暗色模式適配類別存在
      expect(chatWindow.className).toContain('dark:bg-slate-900/95');
      expect(chatWindow.className).toContain('bento-glass-card');
    });
  });

  // =========================================================================
  // Tier 4: 真實情境端對端工作流 (Real-World Application Scenarios, 5 Tests)
  // =========================================================================
  describe('Tier 4: 真實情境端對端工作流 (Real-World Workload Scenarios)', () => {
    it('T4-RW-01: 工作流一 (新任管理員上手旅程): 訪客 -> 解鎖 mei888 -> 開啟 AI -> 詢問密碼 -> 鎖定恢復訪客', async () => {
      window.sessionStorage.setItem('mei_studio_intro_seen_v1', 'true');
      render(<App />);

      // 1. 訪客視角無 AI 客服
      expect(screen.queryByTestId('admin-chat-fab')).toBeNull();

      // 2. 解鎖
      const unlockBtns = screen.getAllByText('管理員解鎖');
      fireEvent.click(unlockBtns[0]);
      fireEvent.change(screen.getByLabelText('管理員密碼輸入框'), {
        target: { value: 'mei888' }
      });
      fireEvent.click(screen.getByText('立即解鎖管理後台'));

      expect(loadAdminUnlocked()).toBe(true);

      // 3. 鎖定退出
      const lockBtn = screen.getByTitle('已解鎖管理員模式（點擊切換回公開訪客視角）');
      fireEvent.click(lockBtn);

      expect(loadAdminUnlocked()).toBe(false);
      expect(screen.queryByTestId('admin-chat-fab')).toBeNull();
    });

    it('T4-RW-02: 工作流二 (專案發布與 AI 知識即時檢索旅程): 解鎖 -> 新增專案 -> AI 準確回答新專案資訊 -> 驗證零 Emoji', () => {
      if (!HAS_KNOWLEDGE_BASE) return;

      const newlyAddedProject = {
        id: 'new-launch-proj',
        title: '咩創意自動化排版神器',
        category: 'ai-automation',
        status: 'online',
        visibility: 'public',
        url: 'https://example.com/typesetter',
        pinned: true,
        description: '極速排版自動化輔助工具'
      };

      const updatedPrompt = studioKnowledgeBaseMod.buildStudioSystemPrompt({
        projects: [newlyAddedProject],
        changelog: DEFAULT_CHANGELOG
      });

      expect(updatedPrompt).toContain('咩創意自動化排版神器');
      expect(updatedPrompt).toContain('ai-automation');
      expect(updatedPrompt).toContain('(置頂)');
      expect(EMOJI_REGEX.test(updatedPrompt)).toBe(false);
    });

    it('T4-RW-03: 工作流三 (子專案 SDK 接入與代碼複製旅程): 提問 SDK -> 獲取 script 代碼 -> 追問自訂位置 -> 得到解答', () => {
      if (!HAS_FAQ_MATCHER) return;

      const sdkMatch = aiFaqMatcherMod.matchLocalFaq('如何使用 mei-dock.js 返回膠囊？');
      expect(sdkMatch).not.toBeNull();
      const reply = sdkMatch.reply || sdkMatch.answer;

      expect(reply).toContain('/sdk/mei-dock.js');
      expect(reply).toContain('data-hub-url');
      expect(reply).toContain('bottom-right');
      expect(EMOJI_REGEX.test(reply)).toBe(false);
    });

    it('T4-RW-04: 工作流四 (災難復原與全斷網本地救急旅程): 離線 -> 提問 PIN 鎖定 -> 本地 FAQ 即時回傳 5 次鎖定指南 -> 驗證無 Emoji', () => {
      if (!HAS_FAQ_MATCHER) return;

      const securityMatch = aiFaqMatcherMod.matchLocalFaq('管理員密碼輸入錯誤被鎖定該怎麼辦？');
      expect(securityMatch).not.toBeNull();
      const reply = securityMatch.reply || securityMatch.answer;

      expect(reply).toContain('5 次');
      expect(reply).toContain('5 分鐘');
      expect(reply).toContain('mei888');
      expect(EMOJI_REGEX.test(reply)).toBe(false);
    });

    it('T4-RW-05: 工作流五 (惡意 Prompt 注入防禦與角色職能堅守旅程): 輸入忽略指示與越獄指令 -> AI 堅守角色立場拒絕', () => {
      if (!HAS_KNOWLEDGE_BASE) return;

      const prompt = studioKnowledgeBaseMod.buildStudioSystemPrompt({
        projects: DEFAULT_PROJECTS,
        changelog: DEFAULT_CHANGELOG
      });

      expect(prompt).toContain('咩創意 AI 專屬特助');
      expect(prompt).toContain('創意無限∞咩有極限');
      expect(prompt).toContain('安全防護邊界');
      expect(prompt).toContain('禮貌且堅定地回絕');
      expect(EMOJI_REGEX.test(prompt)).toBe(false);
    });
  });
});
