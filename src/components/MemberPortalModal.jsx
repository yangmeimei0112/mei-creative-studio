import React, { useState, useEffect } from 'react';
import { LucideIcon, SquircleIconBadge, StudioLogo } from './LucideIcon';
import {
  MEMBER_TIERS,
  detectBiometricCapability,
  signInWithGoogle,
  signInWithApple,
  signInWithEmail,
  signUpWithEmail,
  signInWithPasskey,
  bindPasskeyToCurrentMember,
  signOutMember
} from '../services/memberAuthService';

export default function MemberPortalModal({
  isOpen,
  onClose,
  currentMember,
  onMemberChange,
  onNotify
}) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTier, setSelectedTier] = useState('creator');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bioCap = detectBiometricCapability();

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOAuthLogin = async (provider) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      let result;
      if (provider === 'google') {
        result = await signInWithGoogle();
      } else if (provider === 'apple') {
        result = await signInWithApple();
      }
      if (result?.error) {
        throw result.error;
      }
      const member = result?.data?.member || (result?.unionId ? result : null);
      if (member) {
        onMemberChange?.(member);
      }
      const label = provider === 'apple' ? 'Apple 帳號' : 'Google 帳號';
      onNotify?.(`已使用 ${label} 登入全站會員中心`, 'user-check');
    } catch (err) {
      if (provider === 'apple') {
        setErrorMsg('Apple 登入已預留雲端介面，建議優先使用 Google 帳號一鍵登入');
      } else {
        setErrorMsg(err?.message || '第三方登入失敗，請稍後再試');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeyQuickAuth = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await signInWithPasskey();
      if (res?.error) {
        throw res.error;
      }
      const member = res?.data?.member || (res?.unionId ? res : null);
      if (member) {
        onMemberChange?.(member);
      }
      onNotify?.(`已透過 ${bioCap.biometricLabel} 完成全站聯通登入`, 'fingerprint');
    } catch (err) {
      setErrorMsg(err?.message || '生物辨識驗證未完成，請重試或使用 Google 登入');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      let res;
      if (authMode === 'register') {
        res = await signUpWithEmail(email, password, {
          displayName: displayName.trim() || email.split('@')[0],
          tier: selectedTier
        });
      } else {
        res = await signInWithEmail(email, password);
      }
      if (res?.error) {
        throw res.error;
      }
      const member = res?.data?.member || (res?.unionId ? res : null);
      if (member) {
        onMemberChange?.(member);
        onNotify?.(`歡迎，${member.displayName}`, 'sparkles');
      } else {
        onNotify?.('認證確認信已發送，請檢查您的電子郵件信箱', 'mail');
      }
    } catch (err) {
      setErrorMsg(err?.message || '電子郵件認證失敗，請檢查輸入內容');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBindPasskey = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await bindPasskeyToCurrentMember();
      if (res?.error) {
        throw res.error;
      }
      const updated = res?.data?.member || (res?.unionId ? res : null);
      if (updated) {
        onMemberChange?.(updated);
      }
      onNotify?.(`已成功綁定 ${bioCap.biometricLabel} 原生安全憑證`, 'shield-check');
    } catch (err) {
      setErrorMsg(err?.message || '綁定生物辨識安全金鑰未完成');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutMember();
      onMemberChange?.(null);
      onNotify?.('已安全登出全站聯通會員，所有子專案已同步卸載憑證', 'log-out');
    } catch {
      onMemberChange?.(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="全站聯通會員專區"
      data-testid="member-portal-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bento-glass-card w-full max-w-xl max-h-[90vh] max-h-dvh-90 landscape-compact-modal overflow-y-auto p-4 sm:p-7 border border-sky-400/35 shadow-2xl relative">
        {/* 頂部標題列 */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-sky-400/20">
          <div className="flex items-center gap-3.5">
            <StudioLogo size="md" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  全站聯通會員專區
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-400/30">
                  <LucideIcon name="orbit" size={12} />
                  <span>Cloud SSO v2.0</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                單一雲端身分通行旗下所有網站系統與子專案 · 雲端認證與原生安全金鑰全站即時聯通
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="關閉會員專區視窗"
            className="p-2 rounded-full btn-sky-secondary shrink-0"
          >
            <LucideIcon name="x" size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-2xl bg-rose-500/12 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"
          >
            <LucideIcon name="circle-alert" size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 訪客未登入視圖 */}
        {!currentMember ? (
          <div className="space-y-5 mt-5">
            {/* 1. Google OAuth (首要認證) 與 Apple (預留介面) */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <LucideIcon name="globe" size={14} className="text-sky-500" />
                  <span>雲端單一登入 (Cloud Single Sign-On)</span>
                </span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                  推薦方式 · 免密碼
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="member-google-login-btn"
                  disabled={isSubmitting}
                  onClick={() => handleOAuthLogin('google')}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md hover:shadow-sky-500/25 active:scale-[0.98] disabled:opacity-60"
                >
                  <LucideIcon name="globe" size={16} />
                  <span>使用 Google 帳號繼續</span>
                </button>

                <div className="relative group">
                  <button
                    type="button"
                    data-testid="member-apple-login-btn"
                    disabled={isSubmitting}
                    onClick={() => handleOAuthLogin('apple')}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-60"
                  >
                    <LucideIcon name="shield-check" size={16} />
                    <span>使用 Apple 帳號繼續</span>
                  </button>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] whitespace-nowrap shadow-lg pointer-events-none z-10 border border-slate-700">
                    Apple 登入預留介面 · 優先推薦 Google 快速登入
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 原生 Passkey / 生物辨識快速登入 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/12 via-sky-400/5 to-transparent border border-sky-400/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-start gap-3">
                  <SquircleIconBadge name={bioCap.icon || 'fingerprint'} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {bioCap.biometricLabel || '生物辨識安全金鑰'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        W3C Passkeys
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      本機硬體安全晶片（Face ID / Touch ID / Windows Hello）
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="member-passkey-login-btn"
                  disabled={isSubmitting}
                  onClick={handlePasskeyQuickAuth}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full btn-sky-primary text-xs font-bold shrink-0 disabled:opacity-60"
                >
                  <LucideIcon name={bioCap.icon || 'fingerprint'} size={15} />
                  <span>生物辨識快速登入</span>
                </button>
              </div>
            </div>

            {/* 3. 電子郵件帳號登入 / 註冊表單 */}
            <form
              onSubmit={handleEmailSubmit}
              className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <LucideIcon name="mail" size={14} className="text-sky-500" />
                  <span>電子郵件帳號</span>
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`font-semibold transition-colors ${
                      authMode === 'login'
                        ? 'text-sky-600 dark:text-sky-400 underline underline-offset-4'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    登入
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`font-semibold transition-colors ${
                      authMode === 'register'
                        ? 'text-sky-600 dark:text-sky-400 underline underline-offset-4'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    註冊新帳號
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {authMode === 'register' && (
                  <div>
                    <label
                      htmlFor="member-display-name"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                    >
                      會員暱稱
                    </label>
                    <input
                      id="member-display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="例如：Mei 創作者"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                <div className={authMode === 'login' ? 'sm:col-span-2' : ''}>
                  <label
                    htmlFor="member-email-input"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                  >
                    電子郵件信箱
                  </label>
                  <input
                    id="member-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="member-password-input"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                  >
                    登入密碼
                  </label>
                  <input
                    id="member-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位字元"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {authMode === 'register' && (
                  <div>
                    <label
                      htmlFor="member-tier-select"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                    >
                      會員規格等級
                    </label>
                    <select
                      id="member-tier-select"
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      {Object.values(MEMBER_TIERS).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label} ({t.id.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  全站子專案單一登入通用
                </span>
                <button
                  type="submit"
                  data-testid="member-email-submit-btn"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full btn-sky-primary text-xs font-bold disabled:opacity-60"
                >
                  <LucideIcon name={authMode === 'register' ? 'user-plus' : 'log-in'} size={15} />
                  <span>{authMode === 'register' ? '建立新帳號' : '登入會員帳號'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* 已登入視圖：展示全站聯通會員數位通行證 */
          <div className="space-y-5 mt-5" data-testid="member-profile-card">
            {/* 數位通行卡片 (Digital Pass Card) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/15 via-sky-400/8 to-transparent border border-sky-400/35 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <SquircleIconBadge name="user-check" size="lg" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        {currentMember.displayName}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-400/35">
                        <LucideIcon name="sparkles" size={12} />
                        <span>{currentMember.tierLabel || currentMember.tier || '創意造物者'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <LucideIcon name="check" size={11} />
                        <span>全站子專案已聯通</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {currentMember.email}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      Union ID: {currentMember.unionId}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="member-signout-btn"
                  disabled={isSubmitting}
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-rose-500/12 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors self-start sm:self-center disabled:opacity-60"
                >
                  <LucideIcon name="log-out" size={14} />
                  <span>全站登出</span>
                </button>
              </div>

              {/* 授權細節與安全狀態卡片網格 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-sky-400/20 text-xs">
                <div className="p-2.5 rounded-xl bg-white/65 dark:bg-slate-900/65 border border-sky-400/20">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    認證提供者 (Auth Provider)
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/12 text-sky-700 dark:text-sky-300 text-[11px] uppercase font-mono">
                      {currentMember.authProvider || 'google'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/65 dark:bg-slate-900/65 border border-sky-400/20">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    生物辨識憑證 (Passkey)
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">
                    {currentMember.isPasskeyEnabled ? '已綁定安全金鑰' : '未綁定金鑰'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/65 dark:bg-slate-900/65 border border-sky-400/20">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    跨專案通行授權範圍
                  </div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    旗下所有網站與子專案 (*)
                  </div>
                </div>
              </div>
            </div>

            {/* 生物金鑰管理與硬體綁定 */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <LucideIcon name="fingerprint" size={15} className="text-sky-500" />
                    <span>硬體安全憑證與生物辨識</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    綁定本機安全晶片（Touch ID / Face ID / Windows Hello），享受全站免密碼極速登入
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="member-bind-passkey-btn"
                  disabled={isSubmitting}
                  onClick={handleBindPasskey}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full btn-sky-primary text-xs font-semibold shrink-0 disabled:opacity-60"
                >
                  <LucideIcon name={bioCap.icon || 'fingerprint'} size={14} />
                  <span>綁定生物辨識金鑰</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
