import React, { useState } from 'react';
import { LucideIcon, SquircleIconBadge } from './LucideIcon';

export default function StudioPulseSection({
  changelog,
  isAdmin,
  entranceWaveKey = 0,
  onAddChangelogItem,
  onResetChangelog,
  onOpenSdkGuide
}) {
  const [isAdding, setIsAdding] = useState(false);
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

        {/* 右欄：子專案快速接入指南 (僅管理員視角顯示) */}
        {isAdmin && (
          <div className="lg:col-span-5 flex flex-col gap-6">
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
    </section>
  );
}
