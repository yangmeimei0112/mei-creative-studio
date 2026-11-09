import React, { useEffect, useState } from 'react';
import { LucideIcon, SquircleIconBadge } from './LucideIcon';

export function ChangelogEditModal({
  isOpen,
  item,
  onClose,
  onSave,
  onDelete
}) {
  const [version, setVersion] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (item) {
      setVersion(item.version || 'v1.0.0');
      setDate(item.date || new Date().toISOString().slice(0, 10));
      setCategory(item.category || '官方動態');
      setTitle(item.title || '');
      setSummary(item.summary || '');
      setConfirmDelete(false);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      ...item,
      version: version.trim() || 'v1.0.0',
      date: date.trim() || new Date().toISOString().slice(0, 10),
      category: category.trim() || '官方動態',
      title: title.trim(),
      summary: summary.trim()
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete?.(item.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="編輯版本日誌"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-sky-400/35 rounded-3xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-sky-400/20">
          <div className="flex items-center gap-3">
            <SquircleIconBadge name="pencil" size="md" />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                編輯版本日誌動態
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                更新發布日期、版本編號、分類標籤與詳細說明
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉編輯視窗"
            className="p-2 rounded-full btn-sky-secondary"
          >
            <LucideIcon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                版本號
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-sky-400/30 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                發布日期 (YYYY-MM-DD)
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="2026-11-10"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-sky-400/30 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                分類標籤
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="官方動態"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-sky-400/30 text-xs text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              動態標題
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入動態標題"
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-sky-400/30 text-xs font-bold text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              詳細摘要說明
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="輸入更新內容摘要..."
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-sky-400/30 text-xs text-slate-900 dark:text-white leading-relaxed"
            />
          </div>

          {/* 即時卡片外觀預覽 */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-slate-800/60 border border-sky-400/20 space-y-1.5">
            <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5 mb-1">
              <LucideIcon name="sparkles" size={13} />
              <span>日誌效果預覽</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500 text-white">
                {version || 'v1.0.0'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/20">
                {category || '官方動態'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono ml-auto">
                {date || '2026-11-10'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {title || '未命名動態'}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
              {summary || '尚無說明摘要'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LucideIcon name="trash-2" size={14} />
                <span>{confirmDelete ? '確定刪除？' : '刪除此動態'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-full btn-sky-secondary text-xs font-semibold"
              >
                取消
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
              >
                <LucideIcon name="check" size={14} />
                <span>儲存變更</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudioPulseSection({
  changelog,
  isAdmin,
  entranceWaveKey = 0,
  onAddChangelogItem,
  onUpdateChangelogItem,
  onDeleteChangelogItem,
  onResetChangelog,
  onOpenSdkGuide,
  securityMetrics = { interceptCount: 0, honeypotCount: 0, lastEventDesc: '' },
  rateLimitStatus = { isLocked: false, isCooldown: false, remainingSeconds: 0, failedAttempts: 0 },
  onSimulateAiAttack,
  onResetSecurity
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [version, setVersion] = useState('v1.0.1');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('新專案上線');
  const [summary, setSummary] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddChangelogItem({
      id: `pulse-${Date.now()}`,
      version: version.trim() || 'v1.0.1',
      date: new Date().toISOString().slice(0, 10),
      title: title.trim(),
      category: category.trim() || '工作室動態',
      icon: 'sparkles',
      summary: summary.trim() || '咩創意工作室里程碑更新紀錄。'
    });
    setTitle('');
    setSummary('');
    setIsAdding(false);
  };

  return (
    <section
      id="studio-pulse"
      key={`pulse-wave-${entranceWaveKey}`}
      aria-label="工作室動態看板與版本日誌"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 theme-stagger-pulse"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左欄：Studio Pulse 工作室動態與版本日誌時間軸 */}
        <div
          style={{ animationDelay: '220ms' }}
          className={`${isAdmin ? 'lg:col-span-7' : 'lg:col-span-12'} bento-glass-card bento-wave-reveal p-6 sm:p-8`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <SquircleIconBadge name="history" size="md" />
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  工作室動態與版本日誌
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  追蹤咩創意工作室與各連接子專案的近期里程碑
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
                >
                  <LucideIcon name={isAdding ? 'x' : 'plus'} size={14} />
                  <span>{isAdding ? '取消新增' : '發布新動態'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 管理員新增版本動態表單 */}
          {isAdmin && isAdding && (
            <form
              onSubmit={handleSubmit}
              className="mb-6 p-4 rounded-2xl bg-sky-50/80 dark:bg-slate-900/80 border border-sky-400/30 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="版本號 (如 v2.5.0)"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-400/30 text-xs font-mono text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="分類標籤 (如 新專案上線)"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-400/30 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="動態標題 *"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-400/30 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="輸入本次更新內容摘要..."
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-400/30 text-xs text-slate-900 dark:text-white"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
                >
                  <LucideIcon name="check" size={14} />
                  <span>發布至時間軸</span>
                </button>
              </div>
            </form>
          )}

          {/* 時間軸列表 */}
          <div className="relative pl-6 border-l-2 border-sky-400/35 space-y-6">
            {changelog.map((item) => (
              <div key={item.id} className="relative group">
                <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-sky-100 dark:bg-slate-900 border-2 border-sky-400 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                </span>

                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-sky-500 text-white">
                    {item.version}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/20">
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono ml-auto">
                    {item.date}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      data-testid={`edit-changelog-btn-${item.id}`}
                      onClick={() => setEditingItem(item)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-sky-500/10 border border-transparent hover:border-sky-400/25 transition-all"
                      title="編輯此則動態"
                      aria-label={`編輯動態 ${item.title}`}
                    >
                      <LucideIcon name="pencil" size={12} />
                      <span>編輯</span>
                    </button>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <LucideIcon
                    name={item.icon || 'git-commit-horizontal'}
                    size={15}
                    className="text-sky-500"
                  />
                  <span>{item.title}</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 右欄：僅管理員視角顯示「資安防禦與反 AI 監控面板」與「子專案快速接入指南」 */}
        {isAdmin && (
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* 資安防禦與反 AI 監控面板 */}
            <div
              data-testid="security-monitor-panel"
              style={{ animationDelay: '260ms' }}
              className="bento-glass-card bento-wave-reveal p-6 sm:p-7 border border-sky-400/40 space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <SquircleIconBadge name="shield-check" size="md" />
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      資安防禦與反 AI 監控面板
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      即時防禦網與 AI 金絲雀誘捕指標
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>防禦全時啟動</span>
                </span>
              </div>

              {/* 三大即時防禦狀態膠囊 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20">
                  <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold mb-1">
                    <LucideIcon name="shield-check" size={14} />
                    <span>多層防禦網</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    CSP/HSTS 全開
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20">
                  <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold mb-1">
                    <LucideIcon name="bot" size={14} />
                    <span>AI 金絲雀蜜罐</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    誘捕佈防就緒
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20">
                  <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold mb-1">
                    <LucideIcon name="lock" size={14} />
                    <span>防暴力破解盾</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {rateLimitStatus.isLocked
                      ? `鎖定 (${rateLimitStatus.remainingSeconds}s)`
                      : rateLimitStatus.isCooldown
                        ? `冷卻 (${rateLimitStatus.remainingSeconds}s)`
                        : '待命護盾正常'}
                  </p>
                </div>
              </div>

              {/* 攔截與誘捕命中計數 */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-sky-50/60 dark:bg-slate-900/60 border border-sky-400/25">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-600 dark:text-sky-300">
                    <LucideIcon name="zap" size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      累計防護攔截
                    </div>
                    <div
                      data-testid="security-intercept-count"
                      className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white"
                    >
                      {securityMetrics.interceptCount} 次
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-300">
                    <LucideIcon name="circle-alert" size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      AI 誘捕命中
                    </div>
                    <div
                      data-testid="security-honeypot-count"
                      className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white"
                    >
                      {securityMetrics.honeypotCount} 次
                    </div>
                  </div>
                </div>
              </div>

              {/* 最新安全事件摘要 */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1 truncate">
                <LucideIcon name="activity" size={13} className="text-sky-500 shrink-0" />
                <span className="truncate">
                  最新事件：{securityMetrics.lastEventDesc || '多層防禦網全時警戒中'}
                </span>
              </div>

              {/* 控制與測試按鈕 */}
              <div className="pt-2 border-t border-sky-400/20 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid="simulate-ai-attack-btn"
                  onClick={onSimulateAiAttack}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
                >
                  <LucideIcon name="bot" size={14} />
                  <span>模擬 AI 誘捕測試</span>
                </button>
                <button
                  type="button"
                  data-testid="reset-security-btn"
                  onClick={onResetSecurity}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-secondary text-xs font-semibold"
                >
                  <LucideIcon name="rotate-ccw" size={13} />
                  <span>重置安全防禦</span>
                </button>
              </div>
            </div>

            {/* 子專案快速接入指南 */}
            <div
              style={{ animationDelay: '280ms' }}
              className="bento-glass-card bento-wave-reveal p-6 sm:p-7 flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <SquircleIconBadge name="workflow" size="md" />
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      子專案快速接入指南
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      三步驟將獨立專案整合至工作室平台
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20 flex items-start gap-3">
                    <SquircleIconBadge name="plus" size="sm" iconSize={16} />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                        步驟 1：新增專案資訊
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        解鎖管理員模式後點擊「新增專案」，填寫專案名稱、網址並選擇代表圖示與分類。
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20 flex items-start gap-3">
                    <SquircleIconBadge name="code-2" size="sm" iconSize={16} />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                        步驟 2：掛載返回大廳導覽工具列
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        在子專案嵌入一行輕量腳本，即可顯示「返回咩創意大廳」導覽按鈕與快速專案切換選單。
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20 flex items-start gap-3">
                    <SquircleIconBadge name="qr-code" size="sm" iconSize={16} />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                        步驟 3：線上預覽與行動裝置 QR-code
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        支援於側邊面板直接預覽互動，或展開 QR-code 在手機與平板上掃描開啟。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-sky-400/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                  <LucideIcon name="shield-check" size={15} />
                  <span>支援各類網頁框架與靜態專案串接</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenSdkGuide}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-sky-primary text-xs font-semibold"
                >
                  <LucideIcon name="code-2" size={14} />
                  <span>開啟接入精靈</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 管理員專屬：版本日誌編輯彈窗 */}
      <ChangelogEditModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(updated) => {
          onUpdateChangelogItem?.(updated);
          setEditingItem(null);
        }}
        onDelete={(id) => {
          onDeleteChangelogItem?.(id);
          setEditingItem(null);
        }}
      />
    </section>
  );
}
