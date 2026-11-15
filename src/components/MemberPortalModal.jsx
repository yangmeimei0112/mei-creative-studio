import React, { useState, useEffect } from 'react';
import { LucideIcon, SquircleIconBadge, StudioLogo } from './LucideIcon';
import AntiBotCaptcha, { generateMathCaptcha } from './AntiBotCaptcha';
import * as memberAuthService from '../services/memberAuthService';

export default function MemberPortalModal({
  isOpen,
  onClose,
  currentMember,
  onMemberChange,
  onNotify
}) {
  const [authTab, setAuthTab] = useState('quick'); // 'quick' | 'login' | 'register'
  const [errorMsg, setErrorMsg] = useState('');
  const [isGmailOnlyError, setIsGmailOnlyError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gmail Fast Login custom nickname
  const [gmailCustomNickname, setGmailCustomNickname] = useState('');

  // Email & Password Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Standard Registration State
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCaptchaAnswer, setRegCaptchaAnswer] = useState('');
  const [captchaObj, setCaptchaObj] = useState(() => generateMathCaptcha());

  // Authenticated Settings State (Add Password + Cross-Project SSO Token)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');
  const [ssoToken, setSsoToken] = useState('');
  const [isCopiedToken, setIsCopiedToken] = useState(false);

  const bioCap = memberAuthService.detectBiometricCapability();

  useEffect(() => {
    if (isOpen) {
      setAuthTab('quick');
      setErrorMsg('');
      setIsGmailOnlyError(false);
      setPasswordErrorMsg('');
      setGmailCustomNickname('');
      setLoginEmail('');
      setLoginPassword('');
      setRegDisplayName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegCaptchaAnswer('');
      setCaptchaObj(generateMathCaptcha());
      setNewPassword('');
      setConfirmPassword('');
      setIsCopiedToken(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let isMounted = true;
    if (currentMember?.unionId) {
      memberAuthService
        .generateMemberSsoToken(currentMember)
        .then((tok) => {
          if (isMounted) setSsoToken(tok);
        })
        .catch(() => {
          if (isMounted) setSsoToken('');
        });
    } else {
      setSsoToken('');
    }
    return () => {
      isMounted = false;
    };
  }, [currentMember]);

  if (!isOpen) return null;

  const switchAuthTab = (nextTab) => {
    setAuthTab(nextTab);
    setErrorMsg('');
    setIsGmailOnlyError(false);
    if (nextTab === 'register') {
      setCaptchaObj(generateMathCaptcha());
      setRegCaptchaAnswer('');
    }
  };

  const handleRefreshCaptcha = () => {
    setCaptchaObj(generateMathCaptcha());
    setRegCaptchaAnswer('');
  };

  const handleOAuthLogin = async () => {
    setErrorMsg('');
    setIsGmailOnlyError(false);
    setIsSubmitting(true);
    try {
      const trimmedNickname = gmailCustomNickname.trim();
      let member = null;
      if (trimmedNickname) {
        const result = await memberAuthService.signInWithGmailFastLogin({
          customDisplayName: trimmedNickname
        });
        if (!result?.success || result?.error) {
          throw new Error(result?.error || '第三方登入失敗，請稍後再試');
        }
        member = result.member || result?.data?.member || null;
      } else {
        const result = await memberAuthService.signInWithGoogle();
        if (result?.error) {
          throw result.error instanceof Error
            ? result.error
            : new Error(result.error?.message || String(result.error));
        }
        member = result?.data?.member || (result?.unionId ? result : null);
      }

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
    setIsGmailOnlyError(false);
    setIsSubmitting(true);
    try {
      const res = await memberAuthService.signInWithPasskey();
      if (res?.error) {
        throw res.error instanceof Error
          ? res.error
          : new Error(res.error?.message || String(res.error));
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

  const handleEmailLogin = async () => {
    setErrorMsg('');
    setIsGmailOnlyError(false);
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('請輸入電子信箱與密碼');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await memberAuthService.signInMemberWithPassword(loginEmail, loginPassword);
      if (!res?.success) {
        setIsGmailOnlyError(Boolean(res?.isGmailOnly));
        setErrorMsg(res?.error || '登入失敗，請確認信箱與密碼');
        return;
      }
      if (res.member) {
        onMemberChange?.(res.member);
      }
      onNotify?.('已使用信箱與密碼登入全站會員中心', 'user-check');
    } catch (err) {
      setErrorMsg(err?.message || '登入流程發生錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setErrorMsg('');
    setIsGmailOnlyError(false);
    setIsSubmitting(true);
    try {
      const res = await memberAuthService.registerMemberWithDetails({
        displayName: regDisplayName,
        email: regEmail,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        captchaAnswer: regCaptchaAnswer,
        captchaExpected: captchaObj.expectedAnswer
      });
      if (!res?.success) {
        setErrorMsg(res?.error || '註冊失敗，請檢查輸入資料');
        setCaptchaObj(generateMathCaptcha());
        setRegCaptchaAnswer('');
        return;
      }
      if (res.member) {
        onMemberChange?.(res.member);
      }
      onNotify?.('已完成會員註冊並登入全站會員中心', 'user-check');
    } catch (err) {
      setErrorMsg(err?.message || '註冊流程發生錯誤');
      setCaptchaObj(generateMathCaptcha());
      setRegCaptchaAnswer('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPassword = async () => {
    setPasswordErrorMsg('');
    setErrorMsg('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMsg('密碼長度至少需要 6 個字元');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('兩次輸入的密碼不一致');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await memberAuthService.addPasswordToCurrentMember(newPassword, confirmPassword);
      if (!res?.success) {
        setPasswordErrorMsg(res?.error || '增設密碼失敗');
        return;
      }
      if (res?.member) {
        onMemberChange?.(res.member);
      }
      setNewPassword('');
      setConfirmPassword('');
      onNotify?.('已成功增設登入密碼，未來可使用信箱與密碼登入', 'key-round');
    } catch (err) {
      setPasswordErrorMsg(err?.message || '增設密碼失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBindGoogle = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await memberAuthService.bindGmailToCurrentMember();
      if (!res?.success) {
        throw new Error(res?.error || '綁定 Gmail 帳號失敗');
      }
      if (res?.member) {
        onMemberChange?.(res.member);
      }
      onNotify?.('已成功綁定 Gmail 帳號', 'globe');
    } catch (err) {
      setErrorMsg(err?.message || '綁定 Gmail 帳號失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBindPasskey = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await memberAuthService.bindPasskeyToCurrentMember();
      if (res?.error) {
        throw res.error instanceof Error
          ? res.error
          : new Error(res.error?.message || String(res.error));
      }
      const updated = res?.data?.member || res?.member || (res?.unionId ? res : null);
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

  const handleCopySsoToken = async () => {
    if (!ssoToken) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ssoToken);
      }
      setIsCopiedToken(true);
      setTimeout(() => setIsCopiedToken(false), 2000);
      onNotify?.('已複製跨專案 SSO 通行憑證', 'copy');
    } catch {
      setIsCopiedToken(true);
      setTimeout(() => setIsCopiedToken(false), 2000);
      onNotify?.('已複製跨專案 SSO 通行憑證', 'copy');
    }
  };

  const handleSignOut = async () => {
    try {
      await memberAuthService.signOutMember();
      onMemberChange?.(null);
      onNotify?.('已安全登出全站聯通會員，所有子專案已同步卸載憑證', 'log-out');
    } catch {
      onMemberChange?.(null);
    }
  };

  const hasPassword = Boolean(
    currentMember?.metadata?.has_password !== undefined
      ? currentMember.metadata.has_password
      : currentMember?.hasPassword !== undefined
      ? currentMember.hasPassword
      : currentMember?.authProvider !== 'google'
  );
  const isGmailBound = Boolean(
    currentMember?.authProvider === 'google' ||
    currentMember?.authProviders?.includes('google')
  );
  const isPasskeyBound = Boolean(
    currentMember?.isPasskeyEnabled ||
    currentMember?.authProviders?.includes('passkey')
  );

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
                  <span>Cloud SSO v3.0</span>
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
            data-testid={authTab === 'register' && !currentMember ? 'register-error-msg' : 'member-error-msg'}
            className="mt-4 p-3 rounded-2xl bg-rose-500/12 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <LucideIcon name="circle-alert" size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {isGmailOnlyError && !currentMember && (
              <div className="pl-6">
                <button
                  type="button"
                  data-testid="switch-to-gmail-login-btn"
                  onClick={() => switchAuthTab('quick')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold transition-colors"
                >
                  <LucideIcon name="globe" size={12} />
                  <span>前往 Gmail 快速登入</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 訪客未登入視圖 */}
        {!currentMember ? (
          <div className="space-y-4 mt-4">
            {/* 導覽分頁列 (Tab Switcher: 快速登入 / 密碼登入 / 標準註冊) */}
            <div
              role="tablist"
              aria-label="會員驗證方式切換"
              className="flex items-center gap-1.5 p-1 rounded-2xl bg-sky-500/10 border border-sky-400/20 text-xs font-semibold"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'quick'}
                data-testid="auth-tab-quick"
                onClick={() => switchAuthTab('quick')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all ${
                  authTab === 'quick'
                    ? 'btn-sky-primary font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                快速登入
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'login'}
                data-testid="auth-tab-login"
                onClick={() => switchAuthTab('login')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all ${
                  authTab === 'login'
                    ? 'btn-sky-primary font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                密碼登入
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'register'}
                data-testid="auth-tab-register"
                onClick={() => switchAuthTab('register')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all ${
                  authTab === 'register'
                    ? 'btn-sky-primary font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                標準註冊
              </button>
            </div>

            {/* Tab 1: 快速登入 (Gmail + Passkey，保持既有測試相容性) */}
            {authTab === 'quick' && (
              <div className="space-y-5 pt-1">
                {/* 1. Google OAuth (Gmail 快速登入，支援預設與修改暱稱) */}
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

                  {/* 可自訂 / 修改 Gmail 快速登入暱稱 */}
                  <div className="space-y-1">
                    <label
                      htmlFor="gmail-nickname-input"
                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between"
                    >
                      <span className="inline-flex items-center gap-1">
                        <LucideIcon name="pencil" size={11} className="text-sky-500" />
                        <span>自訂 Gmail 會員暱稱（選填，未填將帶入 Google 帳號名稱）</span>
                      </span>
                    </label>
                    <input
                      id="gmail-nickname-input"
                      data-testid="gmail-nickname-input"
                      type="text"
                      value={gmailCustomNickname}
                      onChange={(e) => setGmailCustomNickname(e.target.value)}
                      placeholder="輸入偏好的顯示名稱（預設使用 Gmail 名稱）"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white/75 dark:bg-slate-900/75 border border-sky-400/25 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      data-testid="member-google-login-btn"
                      disabled={isSubmitting}
                      onClick={handleOAuthLogin}
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
            )}

            {/* Tab 2: 密碼登入 (信箱 + 密碼登入，含純 Gmail 帳號攔截提示) */}
            {authTab === 'login' && (
              <div className="space-y-3.5 p-4 rounded-2xl bg-white/45 dark:bg-slate-900/45 border border-sky-400/25">
                <div>
                  <label
                    htmlFor="member-email-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    電子信箱 (Email)
                  </label>
                  <input
                    id="member-email-input"
                    data-testid="member-email-input"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sky-400/30 bg-white/80 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="member-password-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    登入密碼
                  </label>
                  <input
                    id="member-password-input"
                    data-testid="member-password-input"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEmailLogin();
                      }
                    }}
                    disabled={isSubmitting}
                    placeholder="請輸入會員密碼"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sky-400/30 bg-white/80 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>

                <button
                  type="button"
                  data-testid="member-email-submit-btn"
                  disabled={isSubmitting}
                  onClick={handleEmailLogin}
                  className="w-full py-2.5 px-4 rounded-xl btn-sky-primary text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <LucideIcon name="lock-open" size={16} />
                  <span>以帳號密碼登入</span>
                </button>
              </div>
            )}

            {/* Tab 3: 標準會員註冊 (暱稱 / 信箱 / 雙重密碼確認 / 防機器人驗證碼) */}
            {authTab === 'register' && (
              <div className="space-y-3 p-4 rounded-2xl bg-white/45 dark:bg-slate-900/45 border border-sky-400/25">
                <div>
                  <label
                    htmlFor="register-name-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    會員暱稱
                  </label>
                  <input
                    id="register-name-input"
                    data-testid="register-name-input"
                    type="text"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="例如：星系探索者（至少 2 字元）"
                    className="w-full px-3 py-2 rounded-xl border border-sky-400/30 bg-white/80 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-email-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    電子信箱 (Email)
                  </label>
                  <input
                    id="register-email-input"
                    data-testid="register-email-input"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="explorer@meistudio.live"
                    className="w-full px-3 py-2 rounded-xl border border-sky-400/30 bg-white/80 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="register-password-input"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      設定密碼（至少 6 字元）
                    </label>
                    <input
                      id="register-password-input"
                      data-testid="register-password-input"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="輸入密碼"
                      className="w-full px-3 py-2 rounded-xl border border-sky-400/30 bg-white/80 dark:bg-slate-900/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="register-confirm-password-input"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      密碼雙重確認
                    </label>
                    <input
                      id="register-confirm-password-input"
                      data-testid="register-confirm-password-input"
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRegister();
                        }
                      }}
                      disabled={isSubmitting}
                      placeholder="再次輸入相同密碼"
                      className="w-full px-3 py-2 rounded-xl border border-sky-400/30 bg-white/80 dark:bg-slate-900/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  </div>
                </div>

                {/* SVG 防機器人算術驗證碼元件 */}
                <AntiBotCaptcha
                  captcha={captchaObj}
                  onRefresh={handleRefreshCaptcha}
                  value={regCaptchaAnswer}
                  onChange={setRegCaptchaAnswer}
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  data-testid="register-submit-btn"
                  disabled={isSubmitting}
                  onClick={handleRegister}
                  className="w-full py-2.5 px-4 rounded-xl btn-sky-primary text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
                >
                  <LucideIcon name="sparkles" size={16} />
                  <span>立即註冊全站會員</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 已登入視圖：展示全站聯通會員數位通行證與安全設定 */
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
                    {isPasskeyBound ? '已綁定安全金鑰' : '未綁定金鑰'}
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

            {/* 增設密碼區塊 (僅在 hasPassword === false 時顯示輸入表單) */}
            {!hasPassword ? (
              <div
                className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 space-y-3"
                data-testid="member-add-password-section"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <LucideIcon name="key-round" size={15} className="text-sky-500" />
                    <span>增設登入密碼（開配信箱密碼雙重登入）</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    尚未設定密碼
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  目前此帳號由 Gmail 快速登入建立，僅限 Google 登入。增設密碼後，您將可同時以「信箱與密碼」或「Gmail」登入全站系統。
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="member-new-password-input"
                      className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                    >
                      新密碼（至少 6 字元）
                    </label>
                    <input
                      id="member-new-password-input"
                      data-testid="member-new-password-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="請輸入新密碼"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-400/25 focus:outline-none focus:border-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="member-confirm-password-input"
                      className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                    >
                      確認新密碼
                    </label>
                    <input
                      id="member-confirm-password-input"
                      data-testid="member-confirm-password-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPassword();
                        }
                      }}
                      placeholder="請再次輸入新密碼"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-400/25 focus:outline-none focus:border-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {passwordErrorMsg && (
                  <p
                    role="alert"
                    data-testid="member-password-error-msg"
                    className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1"
                  >
                    <LucideIcon name="circle-alert" size={13} />
                    <span>{passwordErrorMsg}</span>
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    data-testid="member-set-password-btn"
                    disabled={isSubmitting}
                    onClick={handleAddPassword}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-sky-primary text-xs font-semibold disabled:opacity-60"
                  >
                    <LucideIcon name="key-round" size={14} />
                    <span>增設登入密碼</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LucideIcon name="key-round" size={15} className="text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">登入密碼狀態</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <LucideIcon name="check" size={12} />
                  <span>已啟用密碼登入</span>
                </span>
              </div>
            )}

            {/* Gmail 帳號綁定區塊 */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <LucideIcon name="globe" size={15} className="text-sky-500" />
                    <span>Google / Gmail 帳號綁定</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isGmailBound
                      ? '已綁定 Google / Gmail 快速授權，可一鍵登入'
                      : '綁定 Gmail 帳號後，即可享受一鍵極速授權登入'}
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="member-bind-google-btn"
                  disabled={isSubmitting || isGmailBound}
                  onClick={handleBindGoogle}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    isGmailBound
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 opacity-80 cursor-default'
                      : 'btn-sky-primary disabled:opacity-60'
                  }`}
                >
                  <LucideIcon name={isGmailBound ? 'check' : 'globe'} size={14} />
                  <span>{isGmailBound ? '已綁定 Gmail' : '綁定 Gmail 帳號'}</span>
                </button>
              </div>
            </div>

            {/* 生物金鑰管理與硬體綁定 */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <LucideIcon name={bioCap.icon || 'fingerprint'} size={15} className="text-sky-500" />
                    <span>硬體安全憑證與生物辨識 (Passkey)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isPasskeyBound
                      ? `已綁定本機安全晶片（${bioCap.authenticatorName || 'WebAuthn'}）`
                      : '綁定本機安全晶片（Touch ID / Face ID / Windows Hello），享受全站免密碼極速登入'}
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
                  <span>{isPasskeyBound ? '更新生物辨識金鑰' : '綁定生物辨識金鑰'}</span>
                </button>
              </div>
            </div>

            {/* 跨專案 SSO 漫遊通行憑證 */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-sky-400/20 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <LucideIcon name="orbit" size={15} className="text-sky-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    跨專案 SSO 漫遊通行憑證
                  </h4>
                </div>
                <button
                  type="button"
                  data-testid="member-copy-sso-token-btn"
                  disabled={!ssoToken}
                  onClick={handleCopySsoToken}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full btn-sky-secondary text-xs font-medium shrink-0 disabled:opacity-50"
                >
                  <LucideIcon name={isCopiedToken ? 'check' : 'copy'} size={13} />
                  <span>{isCopiedToken ? '已複製' : '複製憑證'}</span>
                </button>
              </div>

              <div
                data-testid="member-sso-token-display"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-all border border-sky-400/15 max-h-24 overflow-y-auto"
              >
                {ssoToken || '正在簽發 SSO 漫遊憑證...'}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                此憑證可直接在工作室旗下所有子專案網站漫遊授權（有效期限 7 天）
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
