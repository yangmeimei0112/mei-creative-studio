/**
 * Milestone 1 Iteration 2 - Extended Adversarial Stress Harness
 * Authored by teamwork_challenger (critic, specialist)
 * Exhaustively stress-tests:
 * 1. Zero-Emoji invariant against all Unicode emoji categories (surrogates, ZWJ, flags, skin tones, extended pictographs).
 * 2. Word-boundary substring spoofing ('alpine', 'opinion', 'spinner', 'pinnacle', 'happiness').
 * 3. Prototype pollution and property poisoning (__proto__, constructor, toString, valueOf).
 * 4. Precision intent disambiguation across all 13 FAQ entries.
 * 5. High-volume adversarial throughput (10,000 queries) and extreme payloads (200KB strings).
 * 6. Quick question chips 100% resolution confidence.
 */

import { performance } from 'node:perf_hooks';
import {
  FAQ_KNOWLEDGE_ENTRIES,
  DEFAULT_FALLBACK_GUIDANCE,
  getFallbackGuidance,
  matchLocalFaq
} from '../src/services/aiFaqMatcher.js';
import {
  STUDIO_DOMAIN_KNOWLEDGE,
  buildStudioSystemPrompt,
  cleanEmoji,
  QUICK_SUGGESTION_CHIPS
} from '../src/data/studioKnowledgeBase.js';

const COMPREHENSIVE_EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu;

console.log('=== Milestone 1 Iteration 2 Extended Adversarial Verification ===\n');

const stats = {
  passed: 0,
  failed: 0,
  failures: []
};

function assert(description, condition, detail = '') {
  if (condition) {
    stats.passed++;
    console.log(`[PASS] ${description}`);
  } else {
    stats.failed++;
    stats.failures.push({ description, detail });
    console.log(`[FAIL] ${description} -> ${detail}`);
  }
}

// ============================================================================
// SUITE 1: Zero-Emoji Invariant & Symbol Preservation Stress Test
// ============================================================================
console.log('--- Suite 1: Zero-Emoji Invariant & Symbol Preservation ---');

// 1.1 Exotic Emojis
const exoticEmojis = [
  '👩‍💻', '👨‍👩‍👧‍👦', '🏳️‍🌈', '🏴‍☠️', '🇺🇸', '🇹🇼', '👍🏽', '🏃‍♀️',
  '❤️', '⚡', '⭐', '🪩', '🫠', '🫨', '🧌', '1️⃣', '#️⃣',
  '🤖', '🟢', '🔒', '🎉', '📅', '💡', '🔥', '🚀', '✨'
];

for (const emoji of exoticEmojis) {
  const cleaned = cleanEmoji(`測試專案 ${emoji} 標題`);
  assert(
    `cleanEmoji strips exotic emoji '${emoji}'`,
    !COMPREHENSIVE_EMOJI_REGEX.test(cleaned) && cleaned.includes('測試專案') && cleaned.includes('標題'),
    `Result: '${cleaned}'`
  );
}

// 1.2 Preservation of brand slogan, infinity symbol (∞), and Traditional Chinese
const brandText = '咩創意工作室 (Mei Creative Studio) - 創意無限∞咩有極限！晴空雲朵淡藍 #38BDF8';
const cleanedBrand = cleanEmoji(brandText);
assert(
    'cleanEmoji preserves infinity symbol ∞ and all brand typography',
    cleanedBrand === brandText && cleanedBrand.includes('∞') && cleanedBrand.includes('咩創意工作室'),
    `Cleaned was: ${cleanedBrand}`
);

// 1.3 Hostile project object injection across every single field
const hostileProject = {
  id: 'hostile-1 🤖',
  title: '惡意專案 🚀',
  category: '分類 🔒',
  status: '維護中 🟢',
  visibility: 'private 🔑',
  url: 'https://test.com/🎉?x=1️⃣',
  pinned: true,
  description: '這是一個超級專案 💡 與測試 🇹🇼'
};

const hostileChangelog = {
  date: '2026-11-10 📅',
  version: 'v2.0.0 ⭐',
  title: '重大發布 🔥',
  summary: '優化與修復 ⚡'
};

const hostilePrompt = buildStudioSystemPrompt({
  projects: [hostileProject],
  changelog: [hostileChangelog]
});

assert(
  'buildStudioSystemPrompt: zero emoji leak across all fields simultaneously',
  !COMPREHENSIVE_EMOJI_REGEX.test(hostilePrompt),
  `Leaked: ${JSON.stringify(hostilePrompt.match(COMPREHENSIVE_EMOJI_REGEX))}`
);
assert(
  'buildStudioSystemPrompt: retains core Traditional Chinese instructions',
  hostilePrompt.includes('你是由「咩創意工作室 (Mei Creative Studio)」官方開發的「咩創意 AI 專屬特助」') &&
  hostilePrompt.includes('創意無限∞咩有極限') &&
  hostilePrompt.includes('mei888') &&
  hostilePrompt.includes('惡意專案') &&
  hostilePrompt.includes('重大發布'),
  'Core prompt text missing or damaged'
);

// ============================================================================
// SUITE 2: Word-Boundary Substring Spoofing Attack
// ============================================================================
console.log('\n--- Suite 2: Word-Boundary Substring Spoofing Attack ---');

// Words that contain 'pin' as substring but should NOT match 'pin' keyword
const pinSubstrings = [
  'alpine',
  'opinion',
  'spinner',
  'pinnacle',
  'happiness',
  'spinning wheels',
  'clipping',
  'shopping',
  'stopping'
];

for (const word of pinSubstrings) {
  const res = matchLocalFaq(word);
  assert(
    `Substring probe '${word}' does not falsely match 'pin' in faq-admin-unlock`,
    res === null,
    `Falsely matched: ${res ? res.id : 'null'}`
  );
}

// Words containing other keywords as substring
const falseSubstrings = [
  { q: 'dancing', expectNull: true },
  { q: 'predictable', expectNull: true },
  { q: 'broadcast', expectNull: true },
  { q: 'unlocked_fake', expectNull: true },
  { q: 'administrator_fake', expectNull: true }
];

for (const fs of falseSubstrings) {
  const res = matchLocalFaq(fs.q);
  assert(
    `False substring probe '${fs.q}' returns null`,
    res === null,
    `Got ${res ? res.id : 'null'}`
  );
}

// ============================================================================
// SUITE 3: Prototype Pollution & Property Poisoning Attack
// ============================================================================
console.log('\n--- Suite 3: Prototype Pollution & Property Poisoning Attack ---');

const poisoningProbes = [
  '__proto__',
  'constructor',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable'
];

for (const probe of poisoningProbes) {
  try {
    const res = matchLocalFaq(probe);
    assert(
      `Poisoning query '${probe}' handled safely and returns null`,
      res === null,
      `Got ${res ? res.id : 'null'}`
    );
  } catch (err) {
    assert(`Poisoning query '${probe}' threw error`, false, err.message);
  }
}

// Poisoning params in buildStudioSystemPrompt
try {
  const maliciousParams = JSON.parse('{"__proto__": {"polluted": true}}');
  const resPrompt = buildStudioSystemPrompt(maliciousParams);
  assert(
    'buildStudioSystemPrompt survives __proto__ JSON injection',
    typeof resPrompt === 'string' && resPrompt.length > 500,
    'Prompt build failed on __proto__'
  );
} catch (err) {
  assert('buildStudioSystemPrompt survives __proto__ JSON injection', false, err.message);
}

// ============================================================================
// SUITE 4: Disambiguation Across All 13 FAQ Knowledge Entries
// ============================================================================
console.log('\n--- Suite 4: Precision Intent Disambiguation Across All 13 Entries ---');

const disambiguationTests = [
  { intent: '工作室理念與標語', q: '請問工作室的標語是什麼？晴空雲朵淡藍是什麼概念？', expectId: 'faq-studio-intro' },
  { intent: '專案分類', q: '大廳有哪些專案分類？ai-automation 是什麼？', expectId: 'faq-categories' },
  { intent: '專案列表', q: '工作室有哪些專案？什麼是咩nu？', expectId: 'faq-projects-list' },
  { intent: '解鎖管理員', q: '忘記預設 PIN 碼，如何解鎖管理員模式？', expectId: 'faq-admin-unlock' },
  { intent: '鎖定冷卻', q: '連續輸錯 5 次密碼被鎖定 5 分鐘怎麼辦？', expectId: 'faq-admin-rate-limit' },
  { intent: '修改密碼', q: '我想要變更管理員解鎖密碼，如何修改 PIN？', expectId: 'faq-change-pin' },
  { intent: '新增與編輯專案', q: '管理員如何新增專案卡片與編輯既有專案？', expectId: 'faq-add-edit-delete-project' },
  { intent: '排序與置頂', q: '卡片要怎麼調整順序和置頂？', expectId: 'faq-reorder-pin' },
  { intent: '私人模式', q: '如何將專案設為私人模式？訪客看得到嗎？', expectId: 'faq-private-visibility' },
  { intent: '資料備份', q: '如何匯出 JSON 備份或重置為預設資料？', expectId: 'faq-backup-export-import' },
  { intent: 'SDK 返回膠囊', q: '子專案要怎麼引入 mei-dock.js 返回大廳懸浮膠囊？', expectId: 'faq-mei-dock-sdk' },
  { intent: 'QR Code 掃描', q: '手機怎麼透過 QR code 掃描即時開啟專案？', expectId: 'faq-qr-code' },
  { intent: '連線巡檢', q: '全站連線巡檢 probe 延遲探測是怎麼運作的？', expectId: 'faq-health-check' },
  { intent: '快捷鍵', q: '如何使用 Cmd+K 全域快捷命令列？', expectId: 'faq-command-palette' }
];

for (const dt of disambiguationTests) {
  const res = matchLocalFaq(dt.q);
  assert(
    `Disambiguation [${dt.intent}] correctly matches '${dt.expectId}'`,
    res !== null && res.id === dt.expectId && res.score >= 10,
    `Got ${res ? `${res.id} (score: ${res.score})` : 'null'}`
  );
}

// 4.2 Verify all 6 QUICK_SUGGESTION_CHIPS
console.log('\n--- Suite 4.2: Quick Suggestion Chips 100% High Confidence Match ---');

for (const chip of QUICK_SUGGESTION_CHIPS) {
  const res = matchLocalFaq(chip);
  assert(
    `Quick Chip '${chip}' matches with confidence score >= 35`,
    res !== null && res.matched === true && res.score >= 35,
    `Got ${res ? `${res.id} (score: ${res.score})` : 'null'}`
  );
}

// ============================================================================
// SUITE 5: Extreme Load, Memory & Throughput Benchmark
// ============================================================================
console.log('\n--- Suite 5: Extreme Load, Memory & Throughput Benchmark ---');

// 5.1 200,000 characters payload
const hugeString = 'a'.repeat(200000);
const t0Huge = performance.now();
const resHuge = matchLocalFaq(hugeString);
const durHuge = performance.now() - t0Huge;
assert(
  `200,000 char query handled safely without crash in ${durHuge.toFixed(2)}ms (< 50ms)`,
  durHuge < 50 && resHuge === null,
  `Duration: ${durHuge.toFixed(2)}ms, result: ${resHuge}`
);

// 5.2 1,000 projects system prompt generation
const projects1000 = Array.from({ length: 1000 }, (_, i) => ({
  id: `p-${i}`,
  title: `專案 ${i}`,
  category: 'ai-automation',
  status: 'online',
  visibility: 'public',
  url: `https://p${i}.example.com`
}));
const t0Prompt = performance.now();
const prompt1000 = buildStudioSystemPrompt({ projects: projects1000 });
const durPrompt = performance.now() - t0Prompt;
assert(
  `1,000 projects bounded to 25 items generated in ${durPrompt.toFixed(2)}ms (< 30ms)`,
  durPrompt < 30 && prompt1000.includes('專案 24') && !prompt1000.includes('專案 25'),
  `Duration: ${durPrompt.toFixed(2)}ms`
);

// 5.3 10,000 rapid queries benchmark
const sampleQueries = [
  '如何解鎖管理員模式？',
  '預設 PIN 碼是什麼？',
  'admin 鎖定 5 mins 如何辦？',
  '如何新增專案？',
  'mei-dock.js',
  '完全不相關的無效測試',
  'alpine',
  'pin',
  '咩創意工作室有哪些專案？',
  '全站巡檢延遲探測'
];

const t0Rapid = performance.now();
const ITERATIONS = 10000;
for (let i = 0; i < ITERATIONS; i++) {
  const q = sampleQueries[i % sampleQueries.length];
  matchLocalFaq(q);
}
const durRapid = performance.now() - t0Rapid;
const avgLatency = durRapid / ITERATIONS;
assert(
  `10,000 rapid queries executed in ${durRapid.toFixed(2)}ms (avg: ${avgLatency.toFixed(4)}ms < 0.05ms)`,
  avgLatency < 0.05,
  `Avg latency: ${avgLatency.toFixed(4)}ms`
);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n======================================================');
console.log(`Extended Adversarial Verification Results:`);
console.log(`Passed: ${stats.passed}`);
console.log(`Failed: ${stats.failed}`);
console.log('======================================================\n');

if (stats.failures.length > 0) {
  console.log('Failures:');
  stats.failures.forEach((f, idx) => {
    console.log(`${idx + 1}. [${f.description}]`);
    console.log(`   Detail: ${f.detail}`);
  });
}

process.exit(stats.failed > 0 ? 1 : 0);
