import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LucideIcon, StudioLogo } from './LucideIcon';
import { QUICK_SUGGESTION_CHIPS, buildStudioSystemPrompt } from '../data/studioKnowledgeBase';
import { cancelCurrentChat, sendChatMessage } from '../services/aiService';

const INITIAL_WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  content: '您好！我是咩創意工作室 AI 專屬特助。我可以協助您解答網站功能、專案管理、分類篩選、密碼鎖定與子專案 SDK 等操作疑問。請問今天有什麼我可以為您服務的呢？'
};

/**
 * 咩創意工作室 — 管理員專屬 AI 客服系統 (AdminChatWidget)
 * 規格：
 * - 嚴格限制僅在管理員模式 (isAdmin === true) 且非開場動畫播放中顯示
 * - 完全免金鑰 (Zero-Key)，串接 Pollinations.ai 遠端 API 並具備本地智慧 FAQ 降級容錯
 * - 支援多輪對話歷程、滑動窗口修剪、在途請求中斷、快速建議題組與一鍵清除
 * - 嚴格恪守全站 0 Emoji 規範與 Lucide 1.75 向量標準
 */
export default function AdminChatWidget({
  isAdmin = false,
  isIntroPlaying = false,
  projects = [],
  changelog = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([INITIAL_WELCOME_MSG]);
  const messagesEndRef = useRef(null);

  // 當管理員鎖定或開場動畫播放時，立即中斷在途連線並關閉視窗
  useEffect(() => {
    if (!isAdmin || isIntroPlaying) {
      cancelCurrentChat();
      setIsOpen(false);
    }
    return () => {
      cancelCurrentChat();
    };
  }, [isAdmin, isIntroPlaying]);

  // 按下 ESC 鍵平滑關閉視窗
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 新訊息自動平滑滾動至底端 (防護 JSDOM 與無捲動環境)
  useEffect(() => {
    if (isOpen) {
      if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = useCallback(
    async (textToSend) => {
      const prompt = (typeof textToSend === 'string' ? textToSend : input).trim();
      if (!prompt || isLoading) return;

      const userMsg = {
        id: 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        role: 'user',
        content: prompt
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput('');
      setIsLoading(true);

      try {
        const systemPrompt = buildStudioSystemPrompt({ projects, changelog });
        const messagesForApi = [
          { role: 'system', content: systemPrompt },
          ...nextMessages
        ];

        const res = await sendChatMessage(messagesForApi);
        if (res && res.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              role: 'assistant',
              content: res.reply,
              source: res.source
            }
          ]);
        }
      } catch (err) {
        if (err?.name !== 'AbortError' && !err?.message?.includes('中斷')) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'ai-err-' + Date.now(),
              role: 'assistant',
              content: '抱歉，連線暫時發生異常，請稍候重試或改用其他問題提問。'
            }
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, projects, changelog]
  );

  const handleClearHistory = useCallback(() => {
    cancelCurrentChat();
    setIsLoading(false);
    setMessages([
      {
        id: 'system-reset-' + Date.now(),
        role: 'assistant',
        content: '已清除歷史對話紀錄，您可以重新開始提問。'
      }
    ]);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 權限與動畫守護：未解鎖或開場遮罩中完全不渲染
  if (!isAdmin || isIntroPlaying) {
    return null;
  }

  return (
    <>
      {/* 浮動客服助手喚出按鈕 (FAB) */}
      <button
        type="button"
        data-testid="admin-chat-fab"
        aria-label="開啟咩創意 AI 專屬客服"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-20 mb-[env(safe-area-inset-bottom,0px)] sm:bottom-8 sm:mb-0 right-4 sm:right-6 md:right-8 z-40 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
      >
        <LucideIcon name="bot" size={24} strokeWidth={1.75} absoluteStrokeWidth={true} />
      </button>

      {/* 浮動對話視窗卡片 */}
      {isOpen && (
        <div
          data-testid="admin-chat-window"
          role="dialog"
          aria-label="咩創意 AI 助手對話視窗"
          className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:right-8 sm:bottom-24 sm:w-[420px] max-h-[85vh] max-h-dvh-85 sm:max-h-[640px] flex flex-col z-40 bento-glass-card bg-white/95 dark:bg-slate-900/95 border border-sky-300/40 dark:border-sky-500/25 shadow-2xl rounded-t-3xl sm:rounded-3xl backdrop-blur-2xl overflow-hidden transition-all duration-300"
        >
          {/* 對話視窗頂部 Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <StudioLogo size="xs" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    咩創意 AI 助手
                  </h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-400/30">
                    管理員限定
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {isLoading ? 'AI 正在處理回覆...' : '線上就緒 (創意無限∞咩有極限)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="清除對話紀錄"
                onClick={handleClearHistory}
                title="清除對話紀錄"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LucideIcon
                  name="rotate-ccw"
                  size={15}
                  strokeWidth={1.75}
                  absoluteStrokeWidth={true}
                />
              </button>
              <button
                type="button"
                aria-label="關閉對話視窗"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LucideIcon
                  name="minimize"
                  size={15}
                  strokeWidth={1.75}
                  absoluteStrokeWidth={true}
                />
              </button>
            </div>
          </div>

          {/* 快速推薦問題膠囊 (對話初期引導使用，展開對話後收合以極大化訊息可讀區) */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/50 bg-sky-50/30 dark:bg-slate-900/40 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
              {QUICK_SUGGESTION_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(chip)}
                  className="rounded-full text-[11px] px-2.5 py-1 font-medium bg-white/80 dark:bg-slate-800/80 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500 dark:hover:text-white text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-all shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* 訊息對話歷程列表 */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px] max-h-[360px] sm:max-h-[400px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-br-sm'
                      : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-bl-sm'
                  }`}
                >
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 rounded-bl-sm flex items-center gap-2">
                  <LucideIcon
                    name="refresh-cw"
                    size={13}
                    className="animate-spin text-sky-500"
                    strokeWidth={1.75}
                    absoluteStrokeWidth={true}
                  />
                  <span>正在思考中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 訊息輸入框與發送按鈕 */}
          <form
            onSubmit={handleSubmit}
            className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] sm:pb-3 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 flex items-end gap-2 shrink-0"
          >
            <textarea
              rows={1}
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="詢問專案、操作步驟或系統設定 (Enter 送出)..."
              className="flex-1 max-h-24 p-2 text-xs rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="發送訊息"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white transition-all shrink-0 active:scale-95"
            >
              <LucideIcon name="send" size={15} strokeWidth={1.75} absoluteStrokeWidth={true} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
