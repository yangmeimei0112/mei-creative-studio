import React, { useState, useEffect } from 'react';
import { LucideIcon, SquircleIconBadge, StudioLogo } from './LucideIcon';
import {
  MEMBER_TIERS,
  detectBiometricCapability,
  authenticateWithBiometricPasskey,
  authenticateWithOAuthProvider,
  registerOrSignInWithEmail,
  bindPasskeyToCurrentMember,
  exportMemberRoamingCode,
  importMemberRoamingCode,
  loadCloudBaasConfig,
  saveCloudBaasConfig
} from '../services/memberAuthService';

export default function MemberPortalModal({
  isOpen,
  onClose,
  currentMember,
  onMemberChange,
  onNotify
}) {
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'roaming' | 'cloud-config'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTier, setSelectedTier] = useState('creator');
  const [bindPasskey, setBindPasskey] = useState(true);
  const [roamingInput, setRoamingInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cloudConfig, setCloudConfig] = useState(() => loadCloudBaasConfig());

  const bioCap = detectBiometricCapability();

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setCloudConfig(loadCloudBaasConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasskeyQuickAuth = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const profile = await authenticateWithBiometricPasskey({
        displayName,
        email
      });
      onMemberChange?.(profile);
      onNotify?.(`已透過 ${bioCap.biometricLabel} 完成全站聯通登入`, 'fingerprint');
    } catch (err) {
      setErrorMsg(err?.message || '生物辨識驗證未完成，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const profile = await authenticateWithOAuthProvider(provider);
      onMemberChange?.(profile);
      const label = provider === 'apple' ? 'Apple 帳號' : 'Google 帳號';
      onNotify?.(`已使用 ${label} 登入全站會員中心`, 'user-check');
    } catch (err) {
      setErrorMsg(err?.message || '第三方登入失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailRegisterOrLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const profile = await registerOrSignInWithEmail({
        displayName,
        email,
        tier: selectedTier,
        bindPasskey
      });
      onMemberChange?.(profile);
      onNotify?.(`歡迎加入全站聯通會員，${profile.displayName}`, 'sparkles');
    } catch (err) {
      setErrorMsg(err?.message || '註冊或登入失敗，請檢查欄位');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBindDevicePasskey = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const updated = await bindPasskeyToCurrentMember();
      onMemberChange?.(updated);
      onNotify?.(`已成功綁定 ${bioCap.biometricLabel} 金鑰`, 'shield-check');
    } catch (err) {
      setErrorMsg(err?.message || '綁定生物辨識金鑰失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRoamingCode = async () => {
    const code = exportMemberRoamingCode(currentMember);
    if (!code) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      }
      onNotify?.('已複製跨裝置漫遊通行碼，可於其他手機或電腦一鍵匯入', 'copy');
    } catch {
      onNotify?.('已產生跨裝置漫遊通行碼', 'copy');
    }
  };

  const handleImportRoaming = (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const profile = importMemberRoamingCode(roamingInput);
      onMemberChange?.(profile);
      setRoamingInput('');
      setActiveTab('quick');
      onNotify?.(`已成功漫遊匯入會員：${profile.displayName}`, 'cloud');
    } catch (err) {
      setErrorMsg(err?.message || '漫遊通行碼匯入失敗');
    }
  };

  const handleSaveCloudConfig = (e) => {
    e.preventDefault();
    const saved = saveCloudBaasConfig(cloudConfig);
    setCloudConfig(saved);
    onNotify?.('已儲存方案一 × 方案二混合式雲端橋接設定', 'check');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="全站聯通會員專區"
      data-testid="member-portal-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bento-glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 border border-sky-400/35 shadow-2xl relative">
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
                  <span>Universal SSO v1.0</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                單一帳號註冊即可通行旗下所有網站系統與子專案 · 方案一本地生物金庫 × 方案二雲端漫遊雙引擎融合
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

        {/* 導覽分頁切換 */}
        <div className="flex flex-wrap items-center gap-2 mt-5 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('quick');
              setErrorMsg('');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'quick' ? 'btn-sky-primary' : 'btn-sky-secondary'
            }`}
          >
            <LucideIcon name={currentMember ? 'user-check' : 'fingerprint'} size={14} />
            <span>{currentMember ? '會員通行證與生物金鑰' : '多元快速登入 / 註冊'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('roaming');
              setErrorMsg('');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'roaming' ? 'btn-sky-primary' : 'btn-sky-secondary'
            }`}
          >
            <LucideIcon name="smartphone" size={14} />
            <span>跨裝置漫遊同步</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cloud-config');
              setErrorMsg('');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'cloud-config' ? 'btn-sky-primary' : 'btn-sky-secondary'
            }`}
          >
            <LucideIcon name="layers" size={14} />
            <span>雙引擎融合架構</span>
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-2xl bg-rose-500/12 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"
          >
            <LucideIcon name="circle-alert" size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 分頁一：多元登入 / 會員數位通行證 */}
        {activeTab === 'quick' && !currentMember && (
          <div className="space-y-5">
            {/* 生物辨識 Passkey 極速登入主視覺區塊 (方案一核心) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-500/12 via-sky-400/5 to-transparent border border-sky-400/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <SquircleIconBadge name={bioCap.icon} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {bioCap.biometricLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        免密碼秒速通行
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      偵測到本機支援 {bioCap.authenticatorName}（W3C WebAuthn Passkeys 標準）
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="member-passkey-login-btn"
                  disabled={isSubmitting}
                  onClick={handlePasskeyQuickAuth}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full btn-sky-primary text-xs font-bold shrink-0"
                >
                  <LucideIcon name={bioCap.icon} size={16} />
                  <span>指紋 / 人臉快速登入</span>
                </button>
              </div>
            </div>

            {/* Apple / Google 多元第三方單點登入 (方案二核心) */}
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-2">
                <LucideIcon name="globe" size={14} className="text-sky-500" />
                <span>第三方跨平台帳號一鍵聯通 (OAuth 2.0 / OIDC)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="member-apple-login-btn"
                  disabled={isSubmitting}
                  onClick={() => handleOAuthLogin('apple')}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm"
                >
                  <LucideIcon name="shield-check" size={16} />
                  <span>使用 Apple 帳號繼續</span>
                </button>

                <button
                  type="button"
                  data-testid="member-google-login-btn"
                  disabled={isSubmitting}
                  onClick={() => handleOAuthLogin('google')}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl btn-sky-secondary text-xs font-bold"
                >
                  <LucideIcon name="globe" size={16} />
                  <span>使用 Google 帳號繼續</span>
                </button>
              </div>
            </div>

            {/* 統一會員規格快速註冊與信箱登入 */}
            <form
              onSubmit={handleEmailRegisterOrLogin}
              className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <LucideIcon name="mail" size={14} className="text-sky-500" />
                  <span>建立或登入全站統一會員帳號</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  一次註冊 · 全專案通用
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="member-display-name"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                  >
                    會員顯示暱稱
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

                <div>
                  <label
                    htmlFor="member-email-input"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                  >
                    電子郵件信箱 (全站唯一識別)
                  </label>
                  <input
                    id="member-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label
                    htmlFor="member-tier-select"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                  >
                    統一會員規格等級
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

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none pt-3 sm:pt-5">
                  <input
                    type="checkbox"
                    checked={bindPasskey}
                    onChange={(e) => setBindPasskey(e.target.checked)}
                    className="rounded border-sky-400 text-sky-600 focus:ring-sky-500"
                  />
                  <span>同時綁定本機指紋 / 人臉快速登入</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  data-testid="member-email-submit-btn"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-sky-primary text-xs font-bold"
                >
                  <LucideIcon name="user-check" size={15} />
                  <span>立即註冊 / 登入全站會員</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 已登入狀態：顯示全站聯通會員數位通行證與多元驗證管理 */}
        {activeTab === 'quick' && currentMember && (
          <div className="space-y-5" data-testid="member-profile-card">
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
                        <span>{currentMember.tierLabel}</span>
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
                  onClick={() => {
                    onMemberChange?.(null);
                    onNotify?.('已安全登出全站聯通會員，所有子專案已同步卸載憑證', 'log-out');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-rose-500/12 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors self-start sm:self-center"
                >
                  <LucideIcon name="log-out" size={14} />
                  <span>全站登出</span>
                </button>
              </div>

              {/* 已啟用登入通道與權限範圍 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-sky-400/20 text-xs">
                <div className="p-2.5 rounded-xl bg-white/65 dark:bg-slate-900/65 border border-sky-400/20">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    已綁定多元登入通道
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white mt-1 flex flex-wrap gap-1.5">
                    {currentMember.authProviders.map((prov) => (
                      <span
                        key={prov}
                        className="px-2 py-0.5 rounded-md bg-sky-500/12 text-sky-700 dark:text-sky-300 text-[11px] uppercase"
                      >
                        {prov}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/65 dark:bg-slate-900/65 border border-sky-400/20">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    硬體生物金鑰 (Passkeys)
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">
                    {currentMember.biometricPasskeys?.length || 0} 組本機安全晶片憑證
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

            {/* 追加綁定指紋/人臉或連結 Apple/Google */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <LucideIcon name="fingerprint" size={15} className="text-sky-500" />
                    <span>多元生物辨識與跨平台帳號綁定</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    可隨時新增本機指紋 / Face ID 金鑰，或連結 Apple / Google 帳號實現多端登入
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="member-bind-passkey-btn"
                    onClick={handleBindDevicePasskey}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
                  >
                    <LucideIcon name={bioCap.icon} size={14} />
                    <span>新增指紋 / 人臉金鑰</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuthLogin('apple')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-secondary text-xs font-semibold"
                  >
                    <LucideIcon name="shield-check" size={14} />
                    <span>連結 Apple</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuthLogin('google')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-secondary text-xs font-semibold"
                  >
                    <LucideIcon name="globe" size={14} />
                    <span>連結 Google</span>
                  </button>
                </div>
              </div>

              {currentMember.biometricPasskeys?.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  {currentMember.biometricPasskeys.map((pk) => (
                    <div
                      key={pk.credentialId}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-sky-500/8 border border-sky-400/20 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <LucideIcon name="key-round" size={14} className="text-sky-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {pk.biometricType}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          ({pk.deviceName})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400">
                        {pk.credentialId.slice(0, 16)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 分頁二：跨裝置漫遊同步 */}
        {activeTab === 'roaming' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sky-500/8 border border-sky-400/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <LucideIcon name="qr-code" size={15} className="text-sky-500" />
                  <span>匯出本機會員漫遊通行碼</span>
                </h3>
                {currentMember && (
                  <button
                    type="button"
                    data-testid="copy-roaming-code-btn"
                    onClick={handleCopyRoamingCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
                  >
                    <LucideIcon name="copy" size={13} />
                    <span>複製漫遊通行碼</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {currentMember
                  ? '將下方加密漫遊通行碼貼至您的另一台手機、平板或電腦，即可瞬間同步統一會員身分與全站授權：'
                  : '請先於「多元快速登入 / 註冊」分頁登入後，即可產生跨裝置漫遊通行碼。'}
              </p>
              {currentMember && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all select-all">
                  {exportMemberRoamingCode(currentMember)}
                </div>
              )}
            </div>

            <form
              onSubmit={handleImportRoaming}
              className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 space-y-3"
            >
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <LucideIcon name="upload" size={15} className="text-sky-500" />
                <span>從其他裝置匯入漫遊通行碼</span>
              </h3>
              <textarea
                rows={3}
                value={roamingInput}
                onChange={(e) => setRoamingInput(e.target.value)}
                placeholder="貼上以 MEI-SSO- 開頭的跨裝置漫遊通行碼..."
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  data-testid="import-roaming-code-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-sky-primary text-xs font-bold"
                >
                  <LucideIcon name="check" size={14} />
                  <span>立即驗證並同步會員身分</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 分頁三：方案一 × 方案二 雙引擎融合架構說明與雲端橋接設定 */}
        {activeTab === 'cloud-config' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-400/30 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <LucideIcon name="sparkles" size={15} className="text-sky-500" />
                <span>方案一 × 方案二「混合式雙引擎單一登入 (Hybrid SSO)」運作原理</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/75 dark:bg-slate-900/75 border border-sky-400/20">
                  <div className="font-bold text-sky-700 dark:text-sky-300 mb-1 flex items-center gap-1.5">
                    <LucideIcon name="fingerprint" size={14} />
                    <span>方案一：前端原生 Passkeys 先行</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    直接調用裝置硬體安全晶片（Face ID / Touch ID / Windows Hello），搭配 BroadcastChannel 與 mei-dock.js 跨頁面即時廣播，零伺服器成本、斷網離線依然秒速通行各子專案。
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/75 dark:bg-slate-900/75 border border-sky-400/20">
                  <div className="font-bold text-sky-700 dark:text-sky-300 mb-1 flex items-center gap-1.5">
                    <LucideIcon name="cloud" size={14} />
                    <span>方案二：雲端 BaaS 跨網域漫遊</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    內建 Supabase / Firebase OAuth 認證適配器。當填入雲端金鑰後，本地金庫自動與雲端資料庫雙向同步，實現跨網域、跨手機與電腦的無縫漫遊。
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSaveCloudConfig}
              className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <LucideIcon name="server" size={14} className="text-sky-500" />
                  <span>雲端認證中心端點配置 (選填，未填寫時自動以本地先行模式運作)</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  雙引擎適配器就緒
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    雲端專案 URL (Supabase / Firebase Auth Domain)
                  </label>
                  <input
                    type="text"
                    value={cloudConfig.projectUrl}
                    onChange={(e) =>
                      setCloudConfig((prev) => ({ ...prev, projectUrl: e.target.value }))
                    }
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    公開認證金鑰 (Public Anon / API Key)
                  </label>
                  <input
                    type="password"
                    value={cloudConfig.anonKey}
                    onChange={(e) =>
                      setCloudConfig((prev) => ({ ...prev, anonKey: e.target.value }))
                    }
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-sky-400/30 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-sky-secondary text-xs font-bold"
                >
                  <LucideIcon name="check" size={14} />
                  <span>儲存雲端漫遊配置</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
