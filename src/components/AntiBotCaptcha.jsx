import React, { useState, useEffect, useCallback } from 'react';
import { LucideIcon } from './LucideIcon';

/**
 * Generate a dynamic math captcha challenge (A + B = ?)
 * Complies with auth_cloud_sso_v2.test.jsx T1-F01-02 contract
 */
export function generateMathCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return {
    numA: a,
    numB: b,
    operator: '+',
    question: `${a} + ${b} = ?`,
    equation: `${a} + ${b}`,
    expectedAnswer: String(a + b)
  };
}

/**
 * AntiBotCaptcha Component
 * 100% SVG Vector Graphics, Zero Unicode Emoji, Lucide refresh-cw icon (strokeWidth=1.75)
 */
export default function AntiBotCaptcha({
  captcha: propCaptcha,
  onRefresh: propOnRefresh,
  value: propValue,
  onChange: propOnChange,
  answerValue,
  onAnswerChange,
  onCaptchaChange,
  disabled = false,
  error = false
}) {
  const [internalCaptcha, setInternalCaptcha] = useState(() => generateMathCaptcha());

  const activeCaptcha = propCaptcha || internalCaptcha;

  const handleRefresh = useCallback(() => {
    if (propOnRefresh) {
      propOnRefresh();
    } else {
      const next = generateMathCaptcha();
      setInternalCaptcha(next);
      onCaptchaChange?.(next.expectedAnswer, next);
    }
  }, [propOnRefresh, onCaptchaChange]);

  useEffect(() => {
    if (!propCaptcha && onCaptchaChange) {
      onCaptchaChange(internalCaptcha.expectedAnswer, internalCaptcha);
    }
  }, [internalCaptcha, propCaptcha, onCaptchaChange]);

  const inputValue = propValue !== undefined ? propValue : (answerValue || '');
  const handleInputChange = (e) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/\D/g, '');
    if (propOnChange) {
      propOnChange(sanitized);
    } else if (onAnswerChange) {
      onAnswerChange(sanitized);
    }
  };

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <label htmlFor="register-captcha-input" className="flex items-center gap-1.5">
          <LucideIcon name="shield-check" size={14} className="text-sky-500" strokeWidth={1.75} />
          <span>防機器人安全驗證</span>
        </label>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">請計算算式結果</span>
      </div>

      <div className="flex items-center gap-2">
        {/* SVG Math Code Display Box */}
        <div
          data-testid="register-captcha-code"
          className="relative flex-1 h-11 rounded-xl bg-gradient-to-r from-sky-500/10 via-sky-400/15 to-sky-500/10 border border-sky-400/30 overflow-hidden flex items-center justify-center select-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 160 40"
            className="w-full h-full"
            role="img"
            aria-label={`防機器人驗證題目：${activeCaptcha.question}`}
          >
            <defs>
              <pattern id="captchaGrid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="160" height="40" fill="url(#captchaGrid)" />

            {/* Disturbance wave lines */}
            <path
              d="M 5 20 Q 40 5 80 25 T 155 18"
              fill="none"
              stroke="rgba(14, 165, 233, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <path
              d="M 10 30 Q 50 35 90 12 T 150 25"
              fill="none"
              stroke="rgba(56, 189, 248, 0.3)"
              strokeWidth="1.2"
            />

            {/* Arithmetic Equation Text */}
            <text
              x="50%"
              y="58%"
              dominantBaseline="middle"
              textAnchor="middle"
              className="fill-slate-800 dark:fill-sky-100 font-mono font-black text-base tracking-widest"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontWeight: 900,
                letterSpacing: '0.18em'
              }}
            >
              {activeCaptcha.question}
            </text>
          </svg>
        </div>

        {/* Refresh Button with Lucide refresh-cw */}
        <button
          type="button"
          data-testid="captcha-refresh-btn"
          disabled={disabled}
          onClick={handleRefresh}
          title="重新整理驗證碼"
          aria-label="更換防機器人題目"
          className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-sky-50 dark:hover:bg-slate-700/80 text-sky-600 dark:text-sky-400 border border-sky-400/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shrink-0"
        >
          <LucideIcon name="refresh-cw" size={16} strokeWidth={1.75} />
        </button>

        {/* Captcha Numeric Input */}
        <div className="w-24 sm:w-28 shrink-0">
          <input
            id="register-captcha-input"
            data-testid="register-captcha-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            disabled={disabled}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="計算結果"
            aria-label="輸入防機器人計算結果"
            className={`w-full px-3 py-2.5 rounded-xl text-center text-sm font-mono font-bold bg-white/80 dark:bg-slate-900/80 border ${
              error ? 'border-rose-500 focus:ring-rose-500/50' : 'border-sky-400/30 focus:ring-sky-500/50'
            } text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-50 transition-all`}
          />
        </div>
      </div>
    </div>
  );
}
