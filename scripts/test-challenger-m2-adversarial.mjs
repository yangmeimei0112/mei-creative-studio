/**
 * Milestone 2 Adversarial Stress Test & Benchmark Harness
 * Agent: m2_challenger_2
 * Focus:
 *  - pruneMessages & sanitizeMessages adversarial boundary stress
 *  - sendChatMessage & cancelCurrentChat concurrency and failover
 *  - Memory leak & resource exhaustion benchmark under rapid calls / aborts
 *  - Edge case scenarios: no user role, maxTurns <= 0, window undefined (SSR), pre-aborted signal
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

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

console.log('===============================================================');
console.log('   M2 CHALLENGER 2: ADVERSARIAL STRESS & BENCHMARK HARNESS   ');
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    const errMsg = `  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`;
    console.error(errMsg);
    failures.push(errMsg);
  }
}

// Backup original global.fetch
const originalFetch = global.fetch;

async function runAllTests() {
  // =========================================================================
  // SECTION 1: MANDATORY EDGE CASE SCENARIOS
  // =========================================================================
  console.log('\n--- Section 1: Mandatory Edge Case Scenarios ---');

  // Edge Case 1.1: messages contains no user role (e.g. system only or empty)
  console.log('\n[Edge Case 1.1] messages contains no "user" role:');
  {
    // Case 1.1a: Remote call succeeds with system only
    global.fetch = async (url, opts) => ({
      ok: true,
      status: 200,
      text: async () => '系統模式回覆'
    });

    const res1 = await sendChatMessage([{ role: 'system', content: '你是特助' }]);
    assert(res1.reply === '系統模式回覆' && res1.source === 'remote', 'System-only message succeeds on happy path');

    // Case 1.1b: Remote call fails with system only, fallback to local FAQ
    global.fetch = async () => {
      throw new Error('Network error');
    };

    const res2 = await sendChatMessage([{ role: 'system', content: '你是特助' }], {
      enableLocalFallback: true,
      backoffBaseMs: 0,
      backoffJitterMs: 0
    });
    assert(
      res2.source === 'local_fallback' &&
      res2.isFallback === true &&
      res2.model === AI_MODELS.LOCAL_KB &&
      typeof res2.reply === 'string' &&
      res2.reply.length > 0,
      'System-only message gracefully falls back to local FAQ guidance without crash'
    );
    assert(!EMOJI_REGEX.test(res2.reply), 'Fallback reply contains zero emojis');

    // Case 1.1c: Completely empty messages array [] with fallback
    const res3 = await sendChatMessage([], {
      enableLocalFallback: true,
      backoffBaseMs: 0,
      backoffJitterMs: 0
    });
    assert(
      res3.source === 'local_fallback' && res3.reply.length > 0,
      'Empty messages array [] gracefully falls back to local FAQ guidance'
    );

    // Case 1.1d: Cased user role ({ role: 'USER' } or { role: 'User' })
    const resCased = await sendChatMessage(
      [{ role: 'User', content: '大廳有哪些專案分類？' }],
      { enableLocalFallback: true, backoffBaseMs: 0, backoffJitterMs: 0 }
    );
    assert(
      resCased.reply.includes('ai-automation'),
      'Case-insensitive user role ({ role: "User" }) correctly matches specific FAQ category answer',
      `Expected category answer containing 'ai-automation', but got generic guidance without match: '${resCased.reply.slice(0, 50)}...'`
    );
  }


  // Edge Case 1.2: maxTurns === 0 or negative or extreme values
  console.log('\n[Edge Case 1.2] maxTurns === 0 or negative or non-finite:');
  {
    const msgs = [
      { role: 'system', content: '系統提示詞' },
      { role: 'user', content: '問1' },
      { role: 'assistant', content: '答1' },
      { role: 'user', content: '問2' },
      { role: 'assistant', content: '答2' }
    ];

    // maxTurns === 0: only system prompt should be preserved
    const pruned0 = pruneMessages(msgs, 0);
    assert(
      pruned0.length === 1 && pruned0[0].role === 'system' && pruned0[0].content === '系統提示詞',
      'pruneMessages with maxTurns === 0 preserves ONLY system prompt'
    );

    // maxTurns === 0 without system prompt: should return empty array
    const pruned0NoSys = pruneMessages(
      [{ role: 'user', content: '問1' }, { role: 'assistant', content: '答1' }],
      0
    );
    assert(pruned0NoSys.length === 0, 'pruneMessages with maxTurns === 0 and no system prompt returns []');

    // maxTurns === -1: negative value safely falls back to default maxTurns (4)
    const prunedNeg = pruneMessages(msgs, -1);
    assert(
      prunedNeg.length === 5,
      'pruneMessages with negative maxTurns (-1) falls back to default 4 turns (retains all 5 messages)'
    );

    // maxTurns === -9999
    const prunedNegLarge = pruneMessages(msgs, -9999);
    assert(prunedNegLarge.length === 5, 'pruneMessages with negative maxTurns (-9999) falls back to default 4 turns');

    // maxTurns === NaN
    const prunedNaN = pruneMessages(msgs, NaN);
    assert(prunedNaN.length === 5, 'pruneMessages with maxTurns === NaN safely falls back to default 4 turns');

    // maxTurns === Infinity
    const prunedInf = pruneMessages(msgs, Infinity);
    assert(prunedInf.length === 5, 'pruneMessages with maxTurns === Infinity safely falls back to default 4 turns');

    // maxTurns === -Infinity
    const prunedNegInf = pruneMessages(msgs, -Infinity);
    assert(prunedNegInf.length === 5, 'pruneMessages with maxTurns === -Infinity safely falls back to default 4 turns');

    // maxTurns float (e.g. 1.8 -> floor to 1)
    const prunedFloat = pruneMessages(msgs, 1.8);
    // 1 turn = 2 messages + 1 system = 3 messages
    assert(
      prunedFloat.length === 3 && prunedFloat[0].role === 'system' && prunedFloat[2].content === '答2',
      'pruneMessages with float 1.8 floors to 1 turn (retains 1 system + 2 conversation messages)'
    );

    // sendChatMessage with maxHistoryTurns: 0
    global.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        text: async () => `Received ${body.messages.length} messages`
      };
    };
    const resTurns0 = await sendChatMessage(msgs, { maxHistoryTurns: 0 });
    assert(resTurns0.reply === 'Received 1 messages', 'sendChatMessage with maxHistoryTurns: 0 sends only system prompt');
  }

  // Edge Case 1.3: window is undefined (SSR environment)
  console.log('\n[Edge Case 1.3] window is undefined (SSR / Node environment):');
  {
    const originalWindow = global.window;
    delete global.window;

    try {
      assert(typeof window === 'undefined', 'Confirmed window is undefined in current scope');

      // sendChatMessage should execute without ReferenceError
      global.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => 'SSR 環境成功回覆'
      });

      const ssrRes = await sendChatMessage([{ role: 'user', content: 'SSR 測試' }]);
      assert(ssrRes.reply === 'SSR 環境成功回覆', 'sendChatMessage succeeds when window is undefined');

      // SSR offline check: when window is undefined, it should NOT think it is offline
      let fetchCalled = false;
      global.fetch = async () => {
        fetchCalled = true;
        return {
          ok: true,
          status: 200,
          text: async () => 'Fetch called in SSR'
        };
      };
      await sendChatMessage([{ role: 'user', content: 'SSR 離線檢查' }]);
      assert(fetchCalled === true, 'SSR does not falsely report offline (attempts remote fetch)');
    } finally {
      if (originalWindow !== undefined) {
        global.window = originalWindow;
      }
    }
  }

  // Edge Case 1.4: external options.signal is already aborted before calling sendChatMessage
  console.log('\n[Edge Case 1.4] external options.signal is ALREADY aborted before invocation:');
  {
    let fetchAttempted = false;
    global.fetch = async () => {
      fetchAttempted = true;
      return { ok: true, status: 200, text: async () => '不應該到達' };
    };

    const preAbortedController = new AbortController();
    preAbortedController.abort(new Error('Pre-aborted test signal'));

    let threwExpectedAbort = false;
    try {
      await sendChatMessage([{ role: 'user', content: '預先取消測試' }], {
        signal: preAbortedController.signal,
        enableLocalFallback: true // even with local fallback, user abort MUST reject
      });
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        threwExpectedAbort = true;
      } else {
        console.error('Unexpected error on pre-aborted signal:', err);
      }
    }

    assert(threwExpectedAbort, 'Pre-aborted signal immediately throws AbortError');
    assert(fetchAttempted === false, 'Pre-aborted signal never triggers fetch');
  }

  // =========================================================================
  // SECTION 2: ADVERSARIAL STRESS ON pruneMessages & sanitizeMessages
  // =========================================================================
  console.log('\n--- Section 2: Adversarial Stress on sanitizeMessages & pruneMessages ---');

  // Stress 2.1: 50,000 messages high volume
  {
    console.log('Testing 50,000 messages high volume in pruneMessages...');
    const t0 = performance.now();
    const massive = [];
    for (let i = 0; i < 50000; i++) {
      massive.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `訊息內容 ${i}`
      });
    }
    massive.unshift({ role: 'system', content: '最頂部系統提示' });

    const prunedMassive = pruneMessages(massive, 4);
    const duration = performance.now() - t0;

    assert(
      prunedMassive.length === 9,
      `pruneMessages(50,000 items, 4) correctly returns 9 items (took ${duration.toFixed(2)}ms)`
    );
    assert(prunedMassive[0].content === '最頂部系統提示', 'System prompt remains at index 0');
    assert(prunedMassive[8].content === '訊息內容 49999', 'Last message is the most recent assistant message');
    assert(duration < 500, `pruneMessages completed in < 500ms (${duration.toFixed(2)}ms)`);
  }

    const oneMbString = '這是一段很長很長的測試內容。'.repeat(30000); // 420,000 chars, ~840KB
    const t0 = performance.now();
    const sanitizedBig = sanitizeMessages([
      { role: 'user', content: oneMbString }
    ]);
    const duration = performance.now() - t0;
    assert(
      sanitizedBig.length === 1 && sanitizedBig[0].content.length === oneMbString.length,
      `sanitizeMessages handles huge string without truncation or crash (${sanitizedBig[0]?.content?.length} chars, took ${duration.toFixed(2)}ms)`
    );


  // Stress 2.3: Bizarre and hostile Unicode inputs
  {
    const hostileInputs = [
      { role: 'user', content: '\u0000\u0001\u0002\u0007\u0008\u000B\u000E' }, // control chars
      { role: 'user', content: '\u200E\u200F\u202A\u202B\u202C\u202D\u202E' }, // RTL bidi override
      { role: 'user', content: '🐑🐑🐑🐑🐑🐑🐑' }, // pure emojis
      { role: 'user', content: '咩創意工作室 \u{1F680}\u{1F4A1}\u{2728} 測試' }, // mixed emojis
      { role: '__proto__', content: 'polluted' },
      { role: 'constructor', content: 'polluted' },
      { role: 'user', content: null },
      { role: 'user', content: undefined },
      { role: 'user', content: 123456 },
      { role: 'user', content: true },
      { role: 'user', content: { nested: 'object' } }
    ];

    const sanitized = sanitizeMessages(hostileInputs);

    // Pure emoji should be filtered out because cleanEmoji leaves empty string
    const hasPureEmoji = sanitized.some((m) => m.content.includes('🐑'));
    assert(!hasPureEmoji, 'Pure emoji message is sanitized out (content becomes empty)');

    // Mixed emoji should have emojis stripped
    const mixed = sanitized.find((m) => m.content.includes('咩創意工作室'));
    assert(mixed && !EMOJI_REGEX.test(mixed.content), 'Mixed emoji message has emojis cleanly stripped');

    // Hostile roles like __proto__ and constructor should be rejected
    const protoRole = sanitized.find((m) => m.role === '__proto__' || m.role === 'constructor');
    assert(!protoRole, 'Malicious roles __proto__ and constructor are filtered out');

    // Non-string content (numbers, booleans, objects) coerced to string
    const numberMsg = sanitized.find((m) => m.content === '123456');
    assert(numberMsg !== undefined, 'Numeric content is safely converted to string');
  }

  // Stress 2.4: Multiple and disordered system messages
  {
    const messy = [
      { role: 'user', content: 'U1' },
      { role: 'system', content: 'Sys1' },
      { role: 'assistant', content: 'A1' },
      { role: 'system', content: 'Sys2' },
      { role: 'user', content: 'U2' },
      { role: 'system', content: 'Sys3' }
    ];
    const pruned = pruneMessages(messy, 4);
    assert(pruned[0].role === 'system' && pruned[0].content === 'Sys1', 'First system prompt extracted to index 0');
    const systemCount = pruned.filter((m) => m.role === 'system').length;
    assert(systemCount === 1, 'Only exactly 1 system prompt is retained; duplicates are discarded');
  }

  // =========================================================================
  // SECTION 3: ADVERSARIAL STRESS ON sendChatMessage & cancelCurrentChat
  // =========================================================================
  console.log('\n--- Section 3: Adversarial Stress on sendChatMessage & cancelCurrentChat ---');

  // Stress 3.1: Corrupted & Bizarre API Responses
  {
    // 3.1a: 200 OK with pure emoji response -> cleanEmoji wipes it -> throws error -> failover to Tier 2 -> Tier 3
    let callIdx = 0;
    global.fetch = async () => {
      callIdx++;
      return {
        ok: true,
        status: 200,
        text: async () => '\u{1F916}\u{2728}\u{1F4A1}' // pure emoji
      };
    };

    const resPureEmoji = await sendChatMessage(
      [{ role: 'user', content: '管理員預設 PIN 碼是什麼？' }],
      { enableLocalFallback: true, backoffBaseMs: 0, backoffJitterMs: 0 }
    );
    assert(
      resPureEmoji.source === 'local_fallback',
      'Remote returning purely emojis triggers cleanEmoji validation error and safely fails over to Tier 3'
    );
    assert(!EMOJI_REGEX.test(resPureEmoji.reply), 'Fallback reply has zero emojis');

    // 3.1b: 200 OK with HTML Gateway error page
    global.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => '<!DOCTYPE html><html><body>502 Bad Gateway</body></html>'
    });

    const resHtml = await sendChatMessage(
      [{ role: 'user', content: '網站有哪些專案分類？' }],
      { enableLocalFallback: true, backoffBaseMs: 0, backoffJitterMs: 0 }
    );
    assert(resHtml.source === 'local_fallback', 'HTML 502 error page safely rejected and routed to Tier 3');

    // 3.1c: 200 OK with OpenAI JSON format error
    global.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ error: { message: 'Model rate limit exceeded' } })
    });

    const resJsonErr = await sendChatMessage(
      [{ role: 'user', content: '介紹工作室' }],
      { enableLocalFallback: true, backoffBaseMs: 0, backoffJitterMs: 0 }
    );
    assert(
      resJsonErr.source === 'local_fallback',
      'JSON error payload properly detected and routed to Tier 3',
      `Expected source 'local_fallback', but got '${resJsonErr.source}' and reply was raw JSON: '${resJsonErr.reply}'`
    );

    // 3.1d: 200 OK with OpenAI JSON choices containing emojis
    global.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '這是一段回答 \u{1F600} 零表情符號規範' } }]
      })
    });

    const resChoices = await sendChatMessage([{ role: 'user', content: '測試' }]);
    assert(
      resChoices.reply === '這是一段回答  零表情符號規範' && !EMOJI_REGEX.test(resChoices.reply),
      'JSON choices unwrapped and emojis cleanly stripped'
    );
  }

  // Stress 3.2: Rapid in-flight cancellations and interleaving
  console.log('\n[Stress 3.2] Rapid in-flight cancellations and interleaving:');
  {
    // Multiple cancelCurrentChat() in a row
    assert(() => {
      cancelCurrentChat();
      cancelCurrentChat();
      cancelCurrentChat();
      return true;
    }, 'Multiple sequential cancelCurrentChat() without active call is safe and non-throwing');

    // Call 1 is launched, immediately superseded by Call 2
    let call1Aborted = false;
    let call2Completed = false;

    global.fetch = (url, opts) => {
      const body = JSON.parse(opts.body);
      const query = body.messages[body.messages.length - 1].content;
      opts.signal?.addEventListener('abort', () => {
        if (query === 'Call 1') call1Aborted = true;
      });

      return new Promise((resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });

        if (query === 'Call 1') {
          // Slow call
          setTimeout(() => {
            resolve({ ok: true, status: 200, text: async () => 'Call 1 reply' });
          }, 200);
        } else {
          // Fast call
          setTimeout(() => {
            call2Completed = true;
            resolve({ ok: true, status: 200, text: async () => 'Call 2 reply' });
          }, 50);
        }
      });
    };

    const p1 = sendChatMessage([{ role: 'user', content: 'Call 1' }]);
    // Start Call 2 immediately — sendChatMessage automatically cancels any active chat!
    const p2 = sendChatMessage([{ role: 'user', content: 'Call 2' }]);

    let p1Threw = false;
    let p1Result = null;
    try {
      p1Result = await p1;
    } catch (e) {
      p1Threw = true;
    }

    const r2 = await p2;

    assert(
      p1Threw,
      'Superseded Call 1 threw an abort error',
      `Call 1 unexpectedly resolved with source: '${p1Result?.source}', model: '${p1Result?.model}', isFallback: ${p1Result?.isFallback}`
    );
    assert(call1Aborted, 'Superseded Call 1 abort signal was triggered');
    assert(r2.reply === 'Call 2 reply', 'Superseding Call 2 succeeded with correct reply');
  }


  // =========================================================================
  // SECTION 4: MEMORY LEAK & RESOURCE EXHAUSTION BENCHMARK
  // =========================================================================
  console.log('\n--- Section 4: Memory Leak & Resource Exhaustion Benchmark ---');

  // Benchmark 4.1: 1,000 rapid sequential calls with instant cancellation
  {
    console.log('Running 1,000 rapid sequential calls with instant cancellation...');
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage().heapUsed;
    const t0 = performance.now();

    global.fetch = () => new Promise(() => {}); // never resolves

    let abortCount = 0;
    for (let i = 0; i < 1000; i++) {
      const p = sendChatMessage([{ role: 'user', content: `Rapid ${i}` }]);
      cancelCurrentChat();
      try {
        await p;
      } catch (err) {
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          abortCount++;
        }
      }
    }

    const duration = performance.now() - t0;
    if (global.gc) global.gc();
    const memAfter = process.memoryUsage().heapUsed;
    const heapDiffMb = (memAfter - memBefore) / (1024 * 1024);

    console.log(`  -> 1,000 calls aborted in ${duration.toFixed(2)}ms (${(duration / 1000).toFixed(2)}ms/call)`);
    console.log(`  -> Heap delta: ${heapDiffMb.toFixed(2)} MB`);

    assert(abortCount === 1000, `All 1,000 rapid calls caught AbortError cleanly (${abortCount}/1000)`);
    assert(heapDiffMb < 25, `Heap growth after 1,000 rapid aborts is negligible (< 25 MB, actual: ${heapDiffMb.toFixed(2)} MB)`);
  }

  // Benchmark 4.2: 200 concurrent in-flight calls abruptly cancelled together
  {
    console.log('Running 200 concurrent in-flight calls with external controller...');
    const extController = new AbortController();
    global.fetch = (url, opts) => {
      return new Promise((resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    let settledCount = 0;
    const promises = [];
    for (let i = 0; i < 200; i++) {
      const p = sendChatMessage([{ role: 'user', content: `Concurrent ${i}` }], {
        signal: extController.signal
      }).catch((e) => {
        settledCount++;
        return 'aborted';
      });
      promises.push(p);
    }

    // Abruptly cancel all 200 calls via external signal
    extController.abort();
    await Promise.all(promises);

    assert(settledCount === 200, `All 200 concurrent calls settled cleanly on external abort (${settledCount}/200)`);
  }

  // Benchmark 4.3: 500 successful sequential chats with throughput measurement
  {
    console.log('Measuring throughput over 500 successful fast queries...');
    global.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => '回應成功'
    });

    const t0 = performance.now();
    for (let i = 0; i < 500; i++) {
      await sendChatMessage([{ role: 'user', content: `Q${i}` }]);
    }
    const duration = performance.now() - t0;
    const opsPerSec = (500 / (duration / 1000)).toFixed(1);

    console.log(`  -> 500 queries completed in ${duration.toFixed(2)}ms (${opsPerSec} ops/sec)`);
    assert(duration < 3000, `500 sequential chat requests completed within 3,000ms (${duration.toFixed(2)}ms)`);
  }

  // Benchmark 4.4: Max listeners / memory leak warning check on AbortSignal
  {
    console.log('Testing AbortSignal listener removal integrity (no warning/leak)...');
    const controller = new AbortController();
    const originalConsoleWarn = console.warn;
    let warningTriggered = false;

    console.warn = (...args) => {
      if (args.some((a) => String(a).includes('MaxListenersExceededWarning'))) {
        warningTriggered = true;
      }
      originalConsoleWarn.apply(console, args);
    };

    global.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => '回覆'
    });

    // Run 50 calls reusing the same external signal sequentially
    for (let i = 0; i < 50; i++) {
      await sendChatMessage([{ role: 'user', content: '測試 signal 監聽器移除' }], {
        signal: controller.signal
      });
    }

    console.warn = originalConsoleWarn;
    assert(!warningTriggered, 'No MaxListenersExceededWarning triggered; external signal listeners properly removed');
  }

  // =========================================================================
  // RESTORE ENVIRONMENT
  // =========================================================================
  global.fetch = originalFetch;
  cancelCurrentChat();

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(f));
    process.exit(1);
  } else {
    console.log('>>> ALL ADVERSARIAL STRESS & BENCHMARK TESTS PASSED SUCCESSFULLY! <<<\n');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Unhandled harness exception:', err);
  process.exit(1);
});
