import { describe, it, expect } from 'vitest';
import {
  FAQ_KNOWLEDGE_ENTRIES,
  DEFAULT_FALLBACK_GUIDANCE,
  getFallbackGuidance,
  matchLocalFaq
} from '../services/aiFaqMatcher.js';
import { QUICK_SUGGESTION_CHIPS } from '../data/studioKnowledgeBase.js';

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('本地智慧 FAQ 匹配器 (aiFaqMatcher) 規格與韌性驗證', () => {
  it('1. 完整包含 13+ 核心知識條目，條目 ID 不重複且欄位完整', () => {
    expect(FAQ_KNOWLEDGE_ENTRIES.length).toBeGreaterThanOrEqual(13);

    const ids = FAQ_KNOWLEDGE_ENTRIES.map((entry) => entry.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(FAQ_KNOWLEDGE_ENTRIES.length);

    FAQ_KNOWLEDGE_ENTRIES.forEach((entry) => {
      expect(entry.id).toBeTruthy();
      expect(entry.question).toBeTruthy();
      expect(entry.answer).toBeTruthy();
      expect(Array.isArray(entry.keywords)).toBe(true);
      expect(entry.keywords.length).toBeGreaterThan(0);
    });
  });

  it('2. 嚴格貫徹全站零 Emoji 政策：所有問答、關鍵字與引導詞均無 Unicode Emoji', () => {
    expect(EMOJI_REGEX.test(DEFAULT_FALLBACK_GUIDANCE)).toBe(false);
    expect(EMOJI_REGEX.test(getFallbackGuidance())).toBe(false);

    FAQ_KNOWLEDGE_ENTRIES.forEach((entry) => {
      expect(EMOJI_REGEX.test(entry.id)).toBe(false);
      expect(EMOJI_REGEX.test(entry.question)).toBe(false);
      expect(EMOJI_REGEX.test(entry.answer)).toBe(false);
      entry.keywords.forEach((kw) => {
        expect(EMOJI_REGEX.test(kw)).toBe(false);
      });
    });
  });

  it('3. 完整覆蓋 13 大主題之精準模糊匹配測試', () => {
    const testCases = [
      {
        topic: '1. 工作室介紹與理念',
        query: '咩創意工作室標語是什麼？',
        expectedId: 'faq-studio-intro',
        keywordInAnswer: '創意無限∞咩有極限'
      },
      {
        topic: '2. 專案分類領域',
        query: '大廳有哪些專案分類？',
        expectedId: 'faq-categories',
        keywordInAnswer: 'ai-automation'
      },
      {
        topic: '3. 專案列表與咩nu點餐',
        query: '咩nu揪團點餐系統是什麼？',
        expectedId: 'faq-projects-list',
        keywordInAnswer: 'meinu2.vercel.app'
      },
      {
        topic: '4. 管理員解鎖與預設 PIN',
        query: '預設管理員 PIN 碼是多少？如何解鎖？',
        expectedId: 'faq-admin-unlock',
        keywordInAnswer: 'mei888'
      },
      {
        topic: '5. 輸錯密碼速率限制與 5 分鐘鎖定',
        query: '密碼輸錯被鎖定 5 分鐘怎麼辦？',
        expectedId: 'faq-admin-rate-limit',
        keywordInAnswer: '300 秒'
      },
      {
        topic: '6. 修改管理員密碼',
        query: '如何修改管理員解鎖密碼？',
        expectedId: 'faq-change-pin',
        keywordInAnswer: '4 個字元'
      },
      {
        topic: '7. 新增/編輯/刪除專案',
        query: '管理員如何新增專案卡片？',
        expectedId: 'faq-add-edit-delete-project',
        keywordInAnswer: '新增專案'
      },
      {
        topic: '8. 專案排序與置頂',
        query: '如何自訂專案排序與設定置頂？',
        expectedId: 'faq-reorder-pin',
        keywordInAnswer: 'arrow-up'
      },
      {
        topic: '9. 私人專案權限分離',
        query: '私人專案訪客看得到嗎？',
        expectedId: 'faq-private-visibility',
        keywordInAnswer: '完全自 DOM 剔除'
      },
      {
        topic: '10. 資料備份匯出與還原',
        query: '如何匯出 JSON 備份或還原資料？',
        expectedId: 'faq-backup-export-import',
        keywordInAnswer: 'mei-creative-studio-backup'
      },
      {
        topic: '11. 子專案 SDK (mei-dock.js)',
        query: '如何使用 mei-dock.js 返回大廳膠囊？',
        expectedId: 'faq-mei-dock-sdk',
        keywordInAnswer: '/sdk/mei-dock.js'
      },
      {
        topic: '12. 跨裝置 QR Code 掃碼',
        query: '如何使用 QR Code 手機掃描開啟專案？',
        expectedId: 'faq-qr-code',
        keywordInAnswer: 'QRCodeModal'
      },
      {
        topic: '13. 全站連線巡檢與延遲',
        query: '全站連線巡檢與延遲探測如何運作？',
        expectedId: 'faq-health-check',
        keywordInAnswer: 'probeProjectHealth'
      }
    ];

    testCases.forEach(({ topic, query, expectedId, keywordInAnswer }) => {
      const result = matchLocalFaq(query);
      expect(result, `主題「${topic}」提問「${query}」應成功匹配`).not.toBeNull();
      expect(result.matched).toBe(true);
      expect(result.id).toBe(expectedId);
      expect(result.score).toBeGreaterThanOrEqual(10);
      expect(result.reply).toContain(keywordInAnswer);
      expect(result.answer).toContain(keywordInAnswer);
      expect(result.source).toBe('local_fallback');
      expect(result.model).toBe('local-knowledge-base');
    });
  });

  it('4. 支援高信心評分 (score >= 25) 與大小寫不敏感匹配 (Case-Insensitive)', () => {
    // 完全吻合問題獲得高分 (>= 50)
    const exactQuestionMatch = matchLocalFaq('如何解鎖管理員模式？預設 PIN 碼是什麼？');
    expect(exactQuestionMatch).not.toBeNull();
    expect(exactQuestionMatch.score).toBeGreaterThanOrEqual(50);

    // 單一關鍵字 (小寫 "pin")
    const pinLowerMatch = matchLocalFaq('pin');
    expect(pinLowerMatch).not.toBeNull();
    expect(pinLowerMatch.score).toBeGreaterThanOrEqual(25);
    expect(pinLowerMatch.id).toBe('faq-admin-unlock');

    // 單一關鍵字 (大寫 "PIN")
    const pinUpperMatch = matchLocalFaq('PIN');
    expect(pinUpperMatch).not.toBeNull();
    expect(pinUpperMatch.score).toBeGreaterThanOrEqual(25);
    expect(pinUpperMatch.id).toBe('faq-admin-unlock');

    // 密碼 "Mei888" 大小寫不敏感提問
    const meiMatch = matchLocalFaq('Mei888');
    expect(meiMatch).not.toBeNull();
    expect(meiMatch.score).toBeGreaterThanOrEqual(25);
    expect(meiMatch.id).toBe('faq-admin-unlock');

    // SDK 大小寫
    const sdkMatch = matchLocalFaq('SDK');
    expect(sdkMatch).not.toBeNull();
    expect(sdkMatch.id).toBe('faq-mei-dock-sdk');
  });

  it('5. 無匹配或無效輸入之容錯降級與引導回覆驗證', () => {
    // 預設 (fallbackOnNoMatch: false) 下，完全不相關之字串回傳 null
    expect(matchLocalFaq('abcdefg_random_query_xyz_12345')).toBeNull();
    expect(matchLocalFaq('')).toBeNull();
    expect(matchLocalFaq('   ')).toBeNull();
    expect(matchLocalFaq(null)).toBeNull();
    expect(matchLocalFaq(undefined)).toBeNull();
    expect(matchLocalFaq(12345)).toBeNull();
    expect(matchLocalFaq({})).toBeNull();
    expect(matchLocalFaq([])).toBeNull();

    // 啟用 fallbackOnNoMatch: true 時，回傳標準引導物件
    const fallbackResult = matchLocalFaq('今天台北天氣如何？', {
      fallbackOnNoMatch: true
    });
    expect(fallbackResult).not.toBeNull();
    expect(fallbackResult.matched).toBe(false);
    expect(fallbackResult.id).toBe('fallback-guidance');
    expect(fallbackResult.reply).toBe(DEFAULT_FALLBACK_GUIDANCE);
    expect(fallbackResult.answer).toBe(DEFAULT_FALLBACK_GUIDANCE);
    expect(fallbackResult.score).toBeLessThan(10);
    expect(fallbackResult.source).toBe('local_fallback');

    // 無效輸入搭配 fallbackOnNoMatch: true
    const nullFallbackResult = matchLocalFaq(null, { fallbackOnNoMatch: true });
    expect(nullFallbackResult).not.toBeNull();
    expect(nullFallbackResult.matched).toBe(false);
    expect(nullFallbackResult.reply).toBe(DEFAULT_FALLBACK_GUIDANCE);
  });

  it('6. 輸出答案符合繁體中文習慣用語', () => {
    const categoriesMatch = matchLocalFaq('專案分類');
    expect(categoriesMatch).not.toBeNull();
    expect(categoriesMatch.reply).toContain('專案');
    expect(categoriesMatch.reply).not.toContain('項目');

    const pinMatch = matchLocalFaq('修改管理員密碼');
    expect(pinMatch).not.toBeNull();
    expect(pinMatch.reply).not.toContain('界面');
  });

  it('7. 管理員連續輸錯 5 次與 5 分鐘冷卻鎖定之精準語意消歧義 (Rate-Limit vs Unlock)', () => {
    const rateLimitQueries = [
      'admin 鎖定 5 mins 如何辦？',
      'admin 鎖定 5min 怎麼辦？',
      '密碼輸錯 5 次被鎖定 5 分鐘怎麼辦？',
      'admin lockout for 5 minutes',
      '冷卻鎖定 300 秒如何解鎖？',
      '防暴力破解 5 分鐘鎖定'
    ];

    rateLimitQueries.forEach((query) => {
      const res = matchLocalFaq(query);
      expect(res, `提問「${query}」應成功比對`).not.toBeNull();
      expect(res.matched).toBe(true);
      expect(res.id).toBe('faq-admin-rate-limit');
      expect(res.reply).toContain('300 秒');
    });

    // 對照組：一般管理員解鎖提問仍應正確導向 faq-admin-unlock
    const unlockQueries = [
      '如何解鎖管理員模式？',
      '預設 PIN 碼是多少？',
      'admin pin code',
      '忘記預設密碼 mei888',
      'how to 解鎖 admin mode with pin mei888?'
    ];

    unlockQueries.forEach((query) => {
      const res = matchLocalFaq(query);
      expect(res).not.toBeNull();
      expect(res.id).toBe('faq-admin-unlock');
    });
  });

  it('8. 快速建議題組 (QUICK_SUGGESTION_CHIPS) 離線 100% 精準匹配且信心度高於門檻', () => {
    const EXPECTED_CHIP_TARGETS = {
      '咩創意工作室有哪些專案？': 'faq-projects-list',
      '如何新增與編輯專案？': 'faq-add-edit-delete-project',
      '如何修改管理員解鎖密碼？': 'faq-change-pin',
      '如何將專案設為私人模式？': 'faq-private-visibility',
      '如何使用 mei-dock.js 返回膠囊？': 'faq-mei-dock-sdk',
      '全站連線巡檢與延遲探測如何運作？': 'faq-health-check'
    };

    expect(QUICK_SUGGESTION_CHIPS.length).toBe(6);

    QUICK_SUGGESTION_CHIPS.forEach((chip) => {
      const expectedId = EXPECTED_CHIP_TARGETS[chip];
      expect(expectedId, `建議題「${chip}」必須具備明確對應之 FAQ 條目`).toBeTruthy();

      const res = matchLocalFaq(chip);
      expect(res, `建議題「${chip}」於離線狀態必須成功匹配`).not.toBeNull();
      expect(res.matched).toBe(true);
      expect(res.id).toBe(expectedId);
      expect(res.score).toBeGreaterThanOrEqual(25); // 高信心匹配
      expect(res.reply).toBe(res.answer);
      expect(res.source).toBe('local_fallback');
      expect(res.model).toBe('local-knowledge-base');
      expect(EMOJI_REGEX.test(res.reply)).toBe(false);
    });
  });

  it('9. 英文與英數關鍵字具備詞界保護與閾值精確度，防止錯字或 XSS 注入誤判', () => {
    // 錯字不應誤配
    expect(matchLocalFaq('pinn')).toBeNull();
    expect(matchLocalFaq('passwrd')).toBeNull();
    expect(matchLocalFaq('mye888')).toBeNull();
    expect(matchLocalFaq('meinuu')).toBeNull();

    // XSS 探針標籤不應誤配 SDK
    expect(matchLocalFaq('<script>alert(1)</script>')).toBeNull();
    expect(matchLocalFaq('<script src="http://evil.com/xss.js"></script>')).toBeNull();

    // 真正含有獨立單詞的自然語言仍可匹配
    const naturalRes = matchLocalFaq('how to 解鎖 admin mode with pin mei888?');
    expect(naturalRes).not.toBeNull();
    expect(naturalRes.id).toBe('faq-admin-unlock');

    // 閾值測試：單一短關鍵字 pin 在高門檻 50 下應被過濾，在一般門檻下正常回傳
    expect(matchLocalFaq('pin', { threshold: 50 })).toBeNull();
    const pinMatch = matchLocalFaq('pin', { threshold: 30 });
    expect(pinMatch).not.toBeNull();
    expect(pinMatch.id).toBe('faq-admin-unlock');
    expect(pinMatch.score).toBe(35);
  });
});
