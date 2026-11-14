import React, { useState, useEffect } from 'react';
import { LucideIcon, SquircleIconBadge, StudioLogo } from './LucideIcon';
import {
  detectBiometricCapability,
  signInWithGoogle,
  signInWithPasskey,
  bindPasskeyToCurrentMember,
  signOutMember
} from '../services/memberAuthService';
import * as supabaseClientModule from '../services/supabaseClient';

function safeGetEffectiveConfig() {
  try {
    if (typeof supabaseClientModule.getEffectiveSupabaseConfig === 'function') {
      return supabaseClientModule.getEffectiveSupabaseConfig();
    }
  } catch {
    // Fallback when module is partially mocked in unit tests
  }
  return {
    supabaseUrl:
      typeof window !== 'undefined'
        ? window.localStorage?.getItem('mei_custom_supabase_url') || ''
        : '',
    supabaseAnonKey:
      typeof window !== 'undefined'
        ? window.localStorage?.getItem('mei_custom_supabase_anon_key') || ''
        : ''
  };
}

function safeIsValidHttpUrl(val) {
  try {
    if (typeof supabaseClientModule.isValidHttpUrl === 'function') {
      return supabaseClientModule.isValidHttpUrl(val);
    }
  } catch {
    // Fallback when module is partially mocked
  }
  return /^https?:\/\/.+/i.test(String(val || '').trim());
}

export default function MemberPortalModal({
  isOpen,
  onClose,
  currentMember,
  onMemberChange,
  onNotify
}) {
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState('');
  const [customSupabaseAnonKey, setCustomSupabaseAnonKey] = useState('');

  const bioCap = detectBiometricCapability();

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      const effective = safeGetEffectiveConfig();
      setCustomSupabaseUrl(effective.supabaseUrl || '');
      setCustomSupabaseAnonKey(effective.supabaseAnonKey || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSupabaseConfig = () => {
    setErrorMsg('');
    const trimmedUrl = String(customSupabaseUrl || '').trim();
    const trimmedKey = String(customSupabaseAnonKey || '').trim();
    if (!safeIsValidHttpUrl(trimmedUrl) || !trimmedKey) {
      setErrorMsg('請輸入有效的 Supabase Project URL (https://...) 與 Anon Public Key');
      return;
    }
    try {
      if (typeof supabaseClientModule.saveCustomSupabaseConfig === 'function') {
        supabaseClientModule.saveCustomSupabaseConfig(trimmedUrl, trimmedKey);
      }
    } catch {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('mei_custom_supabase_url', trimmedUrl);
        window.localStorage.setItem('mei_custom_supabase_anon_key', trimmedKey);
      }
    }
    onNotify?.('已儲存自訂 Supabase 雲端資料庫連線設定', 'database');
    setShowSupabaseConfig(false);
  };

  const handleResetSupabaseConfig = () => {
    setErrorMsg('');
    try {
      if (typeof supabaseClientModule.clearCustomSupabaseConfig === 'function') {
        supabaseClientModule.clearCustomSupabaseConfig();
      }
    } catch {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('mei_custom_supabase_url');
        window.localStorage.removeItem('mei_custom_supabase_anon_key');
      }
    }
    const effective = safeGetEffectiveConfig();
    setCustomSupabaseUrl(effective.supabaseUrl || '');
    setCustomSupabaseAnonKey(effective.supabaseAnonKey || '');
    onNotify?.('已還原預設 Supabase 雲端連線設定', 'rotate-ccw');
  };

  const handleOAuthLogin = async (provider = 'google') => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result?.error) {
        throw result.error;
      }
      const member = result?.data?.member || (result?.unionId ? result : null);
      if (member) {
        onMemberChange?.(member);
      }
      onNotify?.('已使用 Google 帳號登入全站會員中心', 'user-check');
    } catch (err) {
      setErrorMsg(err?.message || '第三方登入失敗，請稍後再試');
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
            {/* 1. Google OAuth (首要認證) */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <LucideIcon name="globe" size={14} className="text-sky-500" />
                  <span>雲端單一登入 (Cloud Single Sign-On)</span>
                </span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                  Google 快速授權 · 免密碼
                </span>
              </div>

              <div>
                <button
                  type="button"
                  data-testid="member-google-login-btn"
                  disabled={isSubmitting}
                  onClick={() => handleOAuthLogin('google')}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-sky-500/25 active:scale-[0.98] disabled:opacity-60"
                >
                  <LucideIcon name="globe" size={16} />
                  <span>使用 Google 帳號繼續</span>
                </button>
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

        {/* 進階：自訂 Supabase 雲端連線設定（預設收合） */}
        <div className="mt-5 pt-4 border-t border-sky-400/20">
          <button
            type="button"
            data-testid="toggle-supabase-config-btn"
            aria-expanded={showSupabaseConfig}
            onClick={() => setShowSupabaseConfig((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <LucideIcon name="database" size={14} className="text-sky-500" />
              <span>Supabase 雲端資料庫連線設定</span>
            </span>
            <LucideIcon
              name="chevron-down"
              size={14}
              className={`transition-transform duration-200 ${showSupabaseConfig ? 'rotate-180' : ''}`}
            />
          </button>

          {showSupabaseConfig && (
            <div
              data-testid="supabase-config-panel"
              className="mt-3 p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 space-y-3"
            >
              <div>
                <label
                  htmlFor="supabase-custom-url-input"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1"
                >
                  Supabase Project URL
                </label>
                <input
                  id="supabase-custom-url-input"
                  data-testid="supabase-url-input"
                  type="url"
                  value={customSupabaseUrl}
                  onChange={(e) => setCustomSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/90 dark:bg-slate-950/80 border border-sky-400/25 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                />
              </div>

              <div>
                <label
                  htmlFor="supabase-custom-anon-key-input"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1"
                >
                  Supabase Anon Public Key
                </label>
                <input
                  id="supabase-custom-anon-key-input"
                  data-testid="supabase-anon-key-input"
                  type="text"
                  value={customSupabaseAnonKey}
                  onChange={(e) => setCustomSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white/90 dark:bg-slate-950/80 border border-sky-400/25 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  data-testid="reset-supabase-config-btn"
                  onClick={handleResetSupabaseConfig}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 transition-colors"
                >
                  <LucideIcon name="rotate-ccw" size={12} />
                  <span>還原預設</span>
                </button>
                <button
                  type="button"
                  data-testid="save-supabase-config-btn"
                  onClick={handleSaveSupabaseConfig}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11px] font-semibold btn-sky-primary"
                >
                  <LucideIcon name="check" size={12} />
                  <span>套用連線設定</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
