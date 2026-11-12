import { describe, it, expect } from 'vitest';
import {
  STUDIO_DOMAIN_KNOWLEDGE,
  QUICK_SUGGESTION_CHIPS,
  buildStudioSystemPrompt,
  cleanEmoji
} from '../data/studioKnowledgeBase.js';

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('工作室領域知識庫 (studioKnowledgeBase) 規格與提示詞生成器驗證', () => {
  describe('1. 靜態領域知識庫 (STUDIO_DOMAIN_KNOWLEDGE)', () => {
    it('應包含正確的品牌基本資料與標語', () => {
      const { brand } = STUDIO_DOMAIN_KNOWLEDGE;
      expect(brand.nameZh).toBe('咩創意工作室');
      expect(brand.nameEn).toBe('Mei Creative Studio');
      expect(brand.tagline).toBe('創意無限∞咩有極限');
      expect(brand.themeColor).toBe('#38BDF8');
      expect(brand.version).toBe('v1.0.0');
      expect(Array.isArray(brand.supportedPlatforms)).toBe(true);
      expect(brand.supportedPlatforms.length).toBeGreaterThan(0);
    });

    it('應正確收錄專案分類與運行狀態定義', () => {
      const { categories, statuses } = STUDIO_DOMAIN_KNOWLEDGE;
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThanOrEqual(4);
      const catIds = categories.map((c) => c.id);
      expect(catIds).toContain('all');
      expect(catIds).toContain('ai-automation');
      expect(catIds).toContain('web-business');
      expect(catIds).toContain('interactive-media');

      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThanOrEqual(4);
      const statusIds = statuses.map((s) => s.id);
      expect(statusIds).toContain('online');
      expect(statusIds).toContain('beta');
      expect(statusIds).toContain('maintenance');
      expect(statusIds).toContain('offline');
    });

    it('應包含管理員手冊指南與預設 PIN (mei888)', () => {
      const { adminGuide } = STUDIO_DOMAIN_KNOWLEDGE;
      expect(adminGuide.defaultPin).toBe('mei888');
      expect(Array.isArray(adminGuide.securityRules)).toBe(true);
      expect(adminGuide.securityRules.length).toBeGreaterThan(0);
      expect(Array.isArray(adminGuide.operations)).toBe(true);
      expect(adminGuide.operations.length).toBeGreaterThanOrEqual(10);

      adminGuide.operations.forEach((op) => {
        expect(op.action).toBeTruthy();
        expect(op.steps).toBeTruthy();
      });
    });

    it('靜態領域知識庫中嚴禁包含任何 Unicode Emoji', () => {
      const jsonString = JSON.stringify(STUDIO_DOMAIN_KNOWLEDGE);
      expect(EMOJI_REGEX.test(jsonString)).toBe(false);
    });
  });

  describe('2. 快速問題建議題組 (QUICK_SUGGESTION_CHIPS)', () => {
    it('應為字串陣列且包含至少 5 個代表性問題', () => {
      expect(Array.isArray(QUICK_SUGGESTION_CHIPS)).toBe(true);
      expect(QUICK_SUGGESTION_CHIPS.length).toBeGreaterThanOrEqual(5);
      QUICK_SUGGESTION_CHIPS.forEach((chip) => {
        expect(typeof chip).toBe('string');
        expect(chip.length).toBeGreaterThan(0);
        expect(EMOJI_REGEX.test(chip)).toBe(false);
      });
    });
  });

  describe('3. 動態系統提示詞生成器 (buildStudioSystemPrompt)', () => {
    it('在無參數、null 或空物件呼叫時應安全回傳字串，不拋出錯誤', () => {
      expect(() => buildStudioSystemPrompt()).not.toThrow();
      expect(() => buildStudioSystemPrompt(null)).not.toThrow();
      expect(() => buildStudioSystemPrompt(undefined)).not.toThrow();
      expect(() => buildStudioSystemPrompt({})).not.toThrow();
      expect(() => buildStudioSystemPrompt({ projects: null, changelog: null })).not.toThrow();

      const defaultPrompt = buildStudioSystemPrompt();
      expect(typeof defaultPrompt).toBe('string');
      expect(defaultPrompt).toContain('咩創意 AI 專屬特助');
      expect(defaultPrompt).toContain('創意無限∞咩有極限');
      expect(defaultPrompt).toContain('目前大廳暫無已儲存專案。');
      expect(defaultPrompt).toContain('暫無最新動態。');
    });

    it('應正確注入即時專案資料與更新日誌', () => {
      const mockProjects = [
        {
          id: 'proj-1',
          title: '咩nu揪團點餐系統',
          category: 'web-business',
          status: 'beta',
          visibility: 'public',
          url: 'https://meinu2.vercel.app/',
          pinned: true,
          description: '專為多人揪團點餐設計之輕量化 Web 應用'
        },
        {
          id: 'proj-2',
          title: 'AI 代理助手',
          category: 'ai-automation',
          status: 'online',
          visibility: 'private',
          url: 'https://agent.example.com',
          pinned: false,
          description: '自動化執行任務工具'
        }
      ];

      const mockChangelog = [
        {
          id: 'log-1',
          date: '2026-11-10',
          version: 'v1.0.0',
          title: '平台正式上線',
          summary: '整合全站數位工具與專案導引大廳'
        }
      ];

      const prompt = buildStudioSystemPrompt({
        projects: mockProjects,
        changelog: mockChangelog
      });

      expect(prompt).toContain('咩nu揪團點餐系統');
      expect(prompt).toContain('(web-business)');
      expect(prompt).toContain('狀態: beta');
      expect(prompt).toContain('權限: public');
      expect(prompt).toContain('(置頂)');
      expect(prompt).toContain('https://meinu2.vercel.app/');
      expect(prompt).toContain('AI 代理助手');
      expect(prompt).toContain('狀態: online');
      expect(prompt).toContain('權限: private');

      expect(prompt).toContain('[2026-11-10] v1.0.0 平台正式上線: 整合全站數位工具與專案導引大廳');
    });

    it('能防禦稀疏陣列中的 falsy 或不完整專案物件', () => {
      const sparseProjects = [
        null,
        undefined,
        { id: 'p1' }, // 缺少 title, category, status 等
        { title: '有效專案' }
      ];

      const prompt = buildStudioSystemPrompt({ projects: sparseProjects });
      expect(prompt).toContain('未命名專案');
      expect(prompt).toContain('有效專案');
    });

    it('包含嚴格之繁體中文語氣、零 Emoji 規範與防 Prompt Injection 邊界', () => {
      const prompt = buildStudioSystemPrompt();
      expect(prompt).toContain('繁體中文（台灣習慣用語）');
      expect(prompt).toContain('零 Emoji 規範');
      expect(prompt).toContain('嚴格禁止');
      expect(prompt).toContain('安全防護邊界');
      expect(prompt).toContain('越獄');
      expect(prompt).toContain('DAN 模式');
    });

    it('確保輸出內容完全符合全站零 Emoji 政策', () => {
      const promptWithPotentialEmoji = buildStudioSystemPrompt({
        projects: [
          {
            title: '測試專案',
            description: '這是一個正常的專案'
          }
        ],
        changelog: [
          {
            title: '更新公告',
            summary: '系統穩定性優化'
          }
        ]
      });

      expect(EMOJI_REGEX.test(promptWithPotentialEmoji)).toBe(false);
    });
  });

  describe('4. 零 Emoji 規範強固性與惡意注入防禦 (Two-Layer Defense)', () => {
    it('在專案物件的所有欄位（分類、狀態、權限、網址、描述）中注入 Emoji，產生的提示詞絕無任何 Emoji 外洩', () => {
      const hostileProjects = [
        {
          id: 'hostile-1',
          title: '超級專案 🚀✨',
          category: '分類 🤖',
          status: 'online 🟢',
          visibility: 'public 🔒',
          url: 'https://example.com/🎉',
          description: '簡介 ✨🎈',
          pinned: true
        }
      ];

      const prompt = buildStudioSystemPrompt({ projects: hostileProjects });
      expect(EMOJI_REGEX.test(prompt)).toBe(false);
      expect(prompt).toContain('超級專案');
      expect(prompt).toContain('分類');
      expect(prompt).toContain('online');
      expect(prompt).toContain('public');
      expect(prompt).toContain('https://example.com/');
      expect(prompt).toContain('創意無限∞咩有極限');
    });

    it('在更新日誌的所有欄位（日期、版本、標題、摘要）中注入 Emoji，產生的提示詞絕無任何 Emoji 外洩', () => {
      const hostileChangelog = [
        {
          date: '2026-11-10 📅',
          version: 'v1.0.0 ⭐',
          title: '重大發布 🔥',
          summary: '全面升級 💡'
        }
      ];

      const prompt = buildStudioSystemPrompt({ changelog: hostileChangelog });
      expect(EMOJI_REGEX.test(prompt)).toBe(false);
      expect(prompt).toContain('2026-11-10');
      expect(prompt).toContain('v1.0.0');
      expect(prompt).toContain('重大發布');
      expect(prompt).toContain('全面升級');
    });

    it('支援擴展區段符號（如 🪐、🪵、🪟、🪄）與複合表情符號之深度清洗，且保留繁體中文與 ∞', () => {
      const extendedEmojiProjects = [
        {
          title: '行星探索 🪐',
          category: '木頭工藝 🪵',
          description: '魔法視窗 🪟🪄 與國旗 🇹🇼 熔化 🫠'
        }
      ];
      const prompt = buildStudioSystemPrompt({ projects: extendedEmojiProjects });
      expect(EMOJI_REGEX.test(prompt)).toBe(false);
      expect(prompt).toContain('行星探索');
      expect(prompt).toContain('木頭工藝');
      expect(prompt).toContain('魔法視窗');
      expect(cleanEmoji('創意無限∞咩有極限 🚀✨')).toBe('創意無限∞咩有極限 ');
    });
  });
});
