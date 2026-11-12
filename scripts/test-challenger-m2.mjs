/**
 * Milestone 2 Adversarial Stress & Verification Harness
 * Authored by m2_challenger_1 (critic, specialist)
 *
 * Target: src/services/aiService.js
 *
 * Suites:
 * 1. Extreme Inputs & Invariants (Gigantic histories, sparse arrays, circular payloads, prompt injection, role casing)
 * 2. Concurrency & In-Flight Cancellation (Sequential calls, cancellation flag isolation, abort guarantees)
 * 3. Network Simulation & Error Handling (HTTP 429, 500, 502, 503, 504, timeout, JSON errors, HTML doctype leakage, offline)
 * 4. Zero-Emoji Invariant & Symbol Preservation (Hostile unicode, ZWJ sequences, skin tones, infinity symbol preservation)
 */

import { performance } from 'node:perf_hooks';
import {
  sendChatMessage,
  cancelCurrentChat,
  pruneMessages,
  sanitizeMessages,
  formatFriendlyErrorMessage,
  POLLINATIONS_TEXT_ENDPOINT,
  DEFAULT_OPTIONS,
  AI_MODELS
} from '../src/services/aiService.js';
import { cleanEmoji } from '../src/data/studioKnowledgeBase.js';

const COMPREHENSIVE_EMOJI_REGEX =
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu;

console.log('=== Milestone 2: Adversarial Stress & Verification Test Harness ===\n');

const stats = {
  passed: 0,
  failed: 0,
  findings: []
};

function recordTest(description, passed, detail = '') {
  if (passed) {
    stats.passed++;
    console.log(`[PASS] ${description}`);
  } else {
    stats.failed++;
    stats.findings.push({ description, detail });
    console.log(`[FAIL] ${description} -> ${detail}`);
  }
}

const originalFetch = global.fetch;

// ============================================================================
// SUITE 1: Extreme Inputs & Message Invariants
// ============================================================================
console.log('--- Suite 1: Extreme Inputs & Message Invariants ---');

// 1.1 Gigantic message histories (5,000 messages)
try {
  const giantMessages = [
    { role: 'system', content: '你是咩創意特助' }
  ];
  for (let i = 0; i < 5000; i++) {
    giantMessages.push({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `對話輪次 #${i} 內容測試：創意無限∞咩有極限`
    });
  }

  const t0 = performance.now();
  const prunedGiant = pruneMessages(giantMessages, 4);
  const elapsed = performance.now() - t0;

  recordTest(
    '1.1 5,000 則巨量歷史對話修剪效能 (< 50ms) 且正確保留系統提示詞與最新 8 則非系統對話',
    prunedGiant.length === 9 &&
      prunedGiant[0].role === 'system' &&
      prunedGiant[prunedGiant.length - 1].content.includes('#4999') &&
      elapsed < 50,
    `修剪後筆數: ${prunedGiant.length}, 耗時: ${elapsed.toFixed(2)}ms`
  );
} catch (err) {
  recordTest('1.1 5,000 則巨量歷史對話修剪效能', false, err.message);
}

// 1.2 Sparse arrays and holes
try {
  const sparse = [];
  sparse[0] = undefined;
  sparse[2] = null;
  sparse[5] = { role: 'system', content: '有效系統提示詞' };
  sparse[10] = { role: 'user', content: '   ' };
  sparse[12] = { role: 'user', content: '有效使用者問題' };
  sparse[20] = { role: 'assistant', content: '有效回答' };

  const prunedSparse = pruneMessages(sparse, 4);
  recordTest(
    '1.2 稀疏陣列 (Holes) 與空洞值容錯：過濾空位並產出結構完整之訊息陣列',
    prunedSparse.length === 3 &&
      prunedSparse[0].content === '有效系統提示詞' &&
      prunedSparse[1].content === '有效使用者問題' &&
      prunedSparse[2].content === '有效回答',
    `實際筆數: ${prunedSparse.length}`
  );
} catch (err) {
  recordTest('1.2 稀疏陣列容錯', false, err.message);
}

// 1.3 Circular payload within message object
try {
  const circularMsg = {
    role: 'user',
    content: '正常問題'
  };
  circularMsg.self = circularMsg;

  const sanitized = sanitizeMessages([circularMsg]);
  recordTest(
    '1.3 訊息物件內部循環引用 (Circular Payload) 防護：無遞迴溢位崩潰且內容正確消毒',
    sanitized.length === 1 && sanitized[0].content === '正常問題',
    `消毒結果: ${JSON.stringify(sanitized)}`
  );
} catch (err) {
  recordTest('1.3 訊息物件內部循環引用防護', false, err.message);
}

// 1.4 Prototype poisoning / pollution attributes
try {
  const polluted = [
    { role: '__proto__', content: 'pollute' },
    { role: 'constructor', content: 'exploit' },
    { role: 'prototype', content: 'exploit' },
    { role: 'user', content: '安全問題' }
  ];

  const sanitized = sanitizeMessages(polluted);
  recordTest(
    '1.4 原型屬性角色防護 (__proto__, constructor, prototype)：非法角色完全過濾',
    sanitized.length === 1 && sanitized[0].role === 'user',
    `保留項目: ${sanitized.map((m) => m.role).join(', ')}`
  );
} catch (err) {
  recordTest('1.4 原型屬性角色防護', false, err.message);
}

// 1.5 Extreme content size (1MB message string)
try {
  const hugeContent = '咩創意工作室'.repeat(100000); // ~1.8MB
  const t0 = performance.now();
  const sanitized = sanitizeMessages([{ role: 'user', content: hugeContent }]);
  const elapsed = performance.now() - t0;

  recordTest(
    '1.5 超大 1.8MB 文字內容安全過濾效能 (< 200ms) 且無 Catastrophic Backtracking',
    sanitized.length === 1 && sanitized[0].content.length > 500000 && elapsed < 200,
    `耗時: ${elapsed.toFixed(2)}ms, 長度: ${sanitized[0]?.content?.length}`
  );
} catch (err) {
  recordTest('1.5 超大文字內容安全過濾效能', false, err.message);
}

// ============================================================================
// SUITE 2: Concurrency & In-Flight Abort Stress
// ============================================================================
console.log('\n--- Suite 2: Concurrency & In-Flight Abort Stress ---');

// 2.1 Rapid sequential calls: Call 1 must reject with AbortError when Call 2 starts
async function testSequentialCallsAbort() {
  cancelCurrentChat();
  let fetchCount = 0;
  global.fetch = () => {
    fetchCount++;
    return new Promise(() => {}); // never settles
  };

  const p1 = sendChatMessage([{ role: 'user', content: '第一次提問：管理員 PIN？' }]);
  const p2 = sendChatMessage([{ role: 'user', content: '第二次提問：三大分類？' }]);

  let p1Error = null;
  let p1Result = null;
  try {
    p1Result = await p1;
  } catch (err) {
    p1Error = err;
  }

  cancelCurrentChat();
  try {
    await p2;
  } catch (e) {}

  const passed =
    p1Error !== null &&
    (p1Error.name === 'AbortError' || p1Error.message.includes('aborted')) &&
    p1Result === null;

  recordTest(
    '2.1 連續快速呼叫 sendChatMessage 時，先前在途請求必須被即時中斷 (拋出 AbortError) 且嚴禁兜底解析成文字回應',
    passed,
    passed
      ? '前次請求如期以 AbortError 中斷'
      : `前次請求未拋出 AbortError！反而返回結果: ${JSON.stringify(p1Result?.reply?.slice(0, 60))}`
  );
}

// 2.2 Massive concurrent stampede (10 rapid calls in flight)
async function testConcurrentStampede() {
  cancelCurrentChat();
  global.fetch = () => new Promise(() => {}); // never settles

  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      sendChatMessage([{ role: 'user', content: `並行提問 #${i}` }])
    );
  }

  const results = await Promise.allSettled(promises);
  cancelCurrentChat();

  // The first 9 promises (indices 0 to 8) were superseded by subsequent calls.
  // They should ALL be rejected with AbortError!
  const firstNineRejectedWithAbort = results.slice(0, 9).every((r) => {
    return (
      r.status === 'rejected' &&
      (r.reason?.name === 'AbortError' || r.reason?.message?.includes('aborted'))
    );
  });

  const spuriousResolutions = results.slice(0, 9).filter((r) => r.status === 'fulfilled');

  recordTest(
    '2.2 10 筆突發高並行請求時，前 9 筆被覆蓋請求皆應確切中斷，無任何假性成功 (Spurious Resolution)',
    firstNineRejectedWithAbort,
    firstNineRejectedWithAbort
      ? '前 9 筆全部正確中斷'
      : `發生 ${spuriousResolutions.length} 筆非預期的假性成功回應！`
  );
}

// 2.3 Multiple successive cancelCurrentChat() calls when idle
function testIdleCancelSafety() {
  cancelCurrentChat();
  let throws = false;
  try {
    for (let i = 0; i < 5; i++) {
      cancelCurrentChat();
    }
  } catch {
    throws = true;
  }

  recordTest(
    '2.3 閒置時或連續多次呼叫 cancelCurrentChat() 安全無副作用且不拋出任何異常',
    !throws,
    throws ? '拋出了異常' : '安全無副作用'
  );
}

// 2.4 Pre-aborted options.signal immediate rejection
async function testPreAbortedSignal() {
  cancelCurrentChat();
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return { ok: true, status: 200, text: async () => 'hello' };
  };

  const preAborted = new AbortController();
  preAborted.abort(new Error('Pre-aborted'));

  let caughtErr = null;
  try {
    await sendChatMessage([{ role: 'user', content: '測試已中斷信號' }], {
      signal: preAborted.signal
    });
  } catch (err) {
    caughtErr = err;
  }

  recordTest(
    '2.4 傳入已預先中斷之 options.signal 時，即刻拒絕且絕不發動任何 fetch 網路連線',
    !fetchCalled && caughtErr !== null,
    `fetch 呼叫狀態: ${fetchCalled}, 捕捉錯誤: ${caughtErr?.name || caughtErr?.message}`
  );
}

// ============================================================================
// SUITE 3: Network Simulation & HTTP Status Stress
// ============================================================================
console.log('\n--- Suite 3: Network Simulation & HTTP Status Stress ---');

// 3.1 Simulated HTTP 429, 500, 502, 503, 504 Failover
async function testHttpStatusFailovers() {
  const statusCodes = [429, 500, 502, 503, 504];

  for (const status of statusCodes) {
    cancelCurrentChat();
    let attemptedModels = [];

    global.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      attemptedModels.push(body.model);
      if (body.model === 'openai') {
        return {
          ok: false,
          status,
          statusText: `Simulated ${status}`
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => `來自 ${body.model} 的備援成功回答`
      };
    };

    const res = await sendChatMessage([{ role: 'user', content: `測試 HTTP ${status}` }], {
      backoffBaseMs: 0,
      backoffJitterMs: 0
    });

    const passed =
      attemptedModels.includes('openai') &&
      attemptedModels.includes('deepseek') &&
      res.model === 'deepseek' &&
      res.isFallback === true;

    recordTest(
      `3.1 HTTP ${status} 錯誤時，主要模型自動容錯切換至次級模型 (deepseek) 並成功回覆`,
      passed,
      `嘗試模型: ${attemptedModels.join(' -> ')}, 最終模型: ${res.model}`
    );
  }
}

// 3.2 Corrupted / Error JSON response in 200 OK (e.g. { error: "Rate limit" } or { error: { message: "Busy" } })
async function testJsonErrorHandling() {
  cancelCurrentChat();
  let modelsCalled = [];

  // Case A: { error: { message: "Model is overloaded" } }
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    modelsCalled.push(body.model);
    if (body.model === 'openai') {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ error: { message: 'Model is overloaded' } })
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => '次級模型深思考回答'
    };
  };

  const resA = await sendChatMessage([{ role: 'user', content: '測試 JSON 錯誤物件' }], {
    backoffBaseMs: 0,
    backoffJitterMs: 0
  });

  const passedA =
    modelsCalled.includes('deepseek') &&
    resA.model === 'deepseek' &&
    !resA.reply.includes('overloaded');

  recordTest(
    '3.2.1 遠端以 200 OK 回傳 { error: { message: ... } } 錯誤時，嚴禁吞沒錯誤直接當成 AI 回覆，應容錯切換次級模型',
    passedA,
    passedA
      ? '成功切換次級模型'
      : `錯誤被吞沒！直接將 JSON 錯誤回傳給使用者: ${resA.reply}`
  );

  // Case B: { error: "Rate limit exceeded" }
  cancelCurrentChat();
  modelsCalled = [];
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    modelsCalled.push(body.model);
    if (body.model === 'openai') {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ error: 'Rate limit exceeded' })
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => '次級模型救急回答'
    };
  };

  const resB = await sendChatMessage([{ role: 'user', content: '測試 JSON 錯誤字串' }], {
    backoffBaseMs: 0,
    backoffJitterMs: 0
  });

  const passedB =
    modelsCalled.includes('deepseek') &&
    resB.model === 'deepseek' &&
    !resB.reply.includes('Rate limit exceeded');

  recordTest(
    '3.2.2 遠端以 200 OK 回傳 { error: "string" } 錯誤時，嚴禁吞沒錯誤直接當成 AI 回覆，應容錯切換次級模型',
    passedB,
    passedB
      ? '成功切換次級模型'
      : `錯誤被吞沒！直接將 JSON 錯誤回傳給使用者: ${resB.reply}`
  );
}

// 3.3 HTML Doctype error page leakage (Lowercase <!doctype html>)
async function testHtmlDoctypeLeakage() {
  cancelCurrentChat();
  let modelsCalled = [];

  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    modelsCalled.push(body.model);
    if (body.model === 'openai') {
      return {
        ok: true,
        status: 200,
        text: async () => '<!doctype html><html><head><title>502</title></head><body>Bad Gateway</body></html>'
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => '備援線路正確回答'
    };
  };

  const res = await sendChatMessage([{ role: 'user', content: '測試 HTML Doctype 洩漏' }], {
    backoffBaseMs: 0,
    backoffJitterMs: 0
  });

  const passed =
    modelsCalled.includes('deepseek') &&
    !res.reply.includes('<!doctype') &&
    !res.reply.includes('<html>');

  recordTest(
    '3.3 小寫 <!doctype html> 錯誤網頁洩漏防禦：應判定為非預期 HTML 並觸發容錯，不得將原始碼回傳至對話框',
    passed,
    passed
      ? '成功防禦 HTML 頁面洩漏'
      : `小寫 <!doctype html> 未被攔截！洩漏之原始碼: ${res.reply.slice(0, 60)}`
  );
}

// 3.4 Role casing in userQuery extraction for Tier 3 local FAQ
async function testRoleCasingInLocalFaq() {
  cancelCurrentChat();
  global.fetch = async () => { throw new Error('Network failure'); };

  const res = await sendChatMessage([
    { role: 'User', content: '預設管理員 PIN 碼是什麼？' }
  ], {
    enableLocalFallback: true,
    backoffBaseMs: 0,
    backoffJitterMs: 0
  });

  // When role is 'User', does it properly extract userQuery and match the PIN FAQ?
  // If matched, the reply starts with "解鎖管理員模式有三種便捷入口：" and contains "mei888".
  // If it failed to extract userQuery, it returns DEFAULT_FALLBACK_GUIDANCE which starts with "【咩創意工作室 服務指南】".
  const matchedExactFaq =
    res.source === 'local_fallback' &&
    res.reply.includes('解鎖管理員模式有三種便捷入口');

  recordTest(
    '3.4 對話歷程中 role: "User" (大寫或混寫) 時，仍能正確提取 userQuery 並命中對應領域 FAQ',
    matchedExactFaq,
    matchedExactFaq
      ? '成功命中 PIN 解鎖 FAQ 條目'
      : `未能精確命中 FAQ！退回通用引導: ${res.reply.slice(0, 50)}...`
  );
}

// ============================================================================
// SUITE 4: Zero-Emoji Invariant & Symbol Preservation
// ============================================================================
console.log('\n--- Suite 4: Zero-Emoji Invariant & Symbol Preservation ---');

// 4.1 Hostile Unicode Emojis in remote API response
async function testHostileUnicodeEmojisInResponse() {
  cancelCurrentChat();
  const hostilePayload =
    '您好！🤖 歡迎使用咩創意 AI 特助！✨ 我們的理念是創意無限∞咩有極限！🚀 ' +
    '這是管理員 PIN 碼：mei888 🔒！請妥善保管 👍🏽 祝您順心 🎉！👩‍💻🏳️‍🌈';

  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => hostilePayload
  });

  const res = await sendChatMessage([{ role: 'user', content: '介紹特助' }]);

  const containsEmoji = COMPREHENSIVE_EMOJI_REGEX.test(res.reply);
  const preservesInfinity = res.reply.includes('創意無限∞咩有極限');
  const preservesPin = res.reply.includes('mei888');

  recordTest(
    '4.1 遠端模型回應夾帶惡意 Unicode 表情符號 (含多重 ZWJ、膚色修飾、圖形符號) 時 100% 徹底清除',
    !containsEmoji,
    containsEmoji
      ? `未清除之殘留內容: ${res.reply}`
      : '所有 Unicode 表情符號均徹底消毒過濾'
  );

  recordTest(
    '4.2 零 Emoji 消毒嚴格保留品牌核心數學符號「∞」與管理員資訊',
    preservesInfinity && preservesPin,
    `檢查結果: ∞符號存在=${preservesInfinity}, PIN存在=${preservesPin}`
  );
}

// 4.3 Hostile Unicode Emojis in error messages
function testFriendlyErrorEmojis() {
  const sampleErrors = [
    new Error('HTTP Error 429: Too Many Requests 🤖'),
    new Error('HTTP Error 503: Service Unavailable 💥'),
    new Error('Timeout after 18000ms ⌛'),
    new Error('Failed to fetch 🌐')
  ];

  let allClean = true;
  for (const err of sampleErrors) {
    const formatted = formatFriendlyErrorMessage(err);
    if (COMPREHENSIVE_EMOJI_REGEX.test(formatted)) {
      allClean = false;
    }
  }

  recordTest(
    '4.3 formatFriendlyErrorMessage 格式化之友善錯誤訊息 100% 符合全站零 Emoji 規範',
    allClean,
    allClean ? '完全符合零 Emoji 規範' : '錯誤訊息中檢出 Emoji'
  );
}

// ============================================================================
// RUNNER
// ============================================================================
async function runAll() {
  await testSequentialCallsAbort();
  await testConcurrentStampede();
  testIdleCancelSafety();
  await testPreAbortedSignal();
  await testHttpStatusFailovers();
  await testJsonErrorHandling();
  await testHtmlDoctypeLeakage();
  await testRoleCasingInLocalFaq();
  await testHostileUnicodeEmojisInResponse();
  testFriendlyErrorEmojis();

  global.fetch = originalFetch;

  console.log('\n============================================================');
  console.log(`Verification Summary: ${stats.passed} Passed, ${stats.failed} Failed`);
  console.log('============================================================');

  if (stats.failed > 0) {
    console.log('\nCRITICAL FINDINGS / DISCREPANCIES DETECTED:');
    stats.findings.forEach((f, idx) => {
      console.log(`${idx + 1}. [FAIL] ${f.description}`);
      console.log(`   Evidence: ${f.detail}\n`);
    });
  }

  process.exit(stats.failed > 0 ? 1 : 0);
}

runAll();
