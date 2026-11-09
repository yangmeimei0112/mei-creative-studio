import React, { useState } from 'react';
import { LucideIcon, SquircleIconBadge } from './LucideIcon';
import { PROJECT_CATEGORIES, PROJECT_STATUS_META } from '../data/defaultData';
import { generateSubprojectEmbedSnippet } from '../services/storageService';

export default function ProjectPreviewDrawer({
  project,
  onClose,
  onDirectLaunch,
  onOpenQrModal
}) {
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [activeTab, setActiveTab] = useState('sandbox'); // 'sandbox' | 'details' | 'sdk'
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!project) return null;

  const statusMeta =
    PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.online;
  const categoryMeta =
    PROJECT_CATEGORIES.find((c) => c.id === project.category) ||
    PROJECT_CATEGORIES[1];
  const sdkSnippet = generateSubprojectEmbedSnippet(project);

  const handleCopySnippet = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sdkSnippet);
      }
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      setCopiedSnippet(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end items-end sm:items-stretch bg-slate-950/45 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} 內嵌預覽與詳情抽屜`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl lg:max-w-4xl h-[90vh] sm:h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t sm:border-t-0 sm:border-l border-sky-400/30 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 手機端頂部下滑手勢指示條 */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-sky-300/60 dark:bg-slate-700" />
        </div>

        {/* 抽屜頂部標題與操作列 */}
        <div className="px-5 py-4 border-b border-sky-400/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SquircleIconBadge name={project.icon || categoryMeta.icon} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {project.title}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
                >
                  <LucideIcon name={statusMeta.icon} size={12} />
                  <span>{statusMeta.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                {project.url}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* QR-code 按鈕 */}
            <button
              type="button"
              onClick={() => onOpenQrModal(project)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-secondary text-xs font-semibold"
            >
              <LucideIcon name="qr-code" size={15} />
              <span className="hidden sm:inline">QR-code</span>
            </button>

            {/* 獨立全螢幕開啟按鈕 */}
            <button
              type="button"
              onClick={() => onDirectLaunch(project)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
            >
              <span>全螢幕開啟</span>
              <LucideIcon name="arrow-up-right" size={15} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="關閉預覽抽屜"
              className="p-2 rounded-full btn-sky-secondary"
            >
              <LucideIcon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* 抽屜功能分頁與電腦/手機視角切換器 */}
        <div className="px-5 py-2.5 bg-sky-50/80 dark:bg-slate-950/60 border-b border-sky-400/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'sandbox', label: '互動沙盒預覽', icon: 'panel-right-open' },
              { id: 'details', label: '專案規格與亮點', icon: 'info' },
              { id: 'sdk', label: '返回大廳 SDK 嵌入碼', icon: 'code-2' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-sky-500/10'
                }`}
              >
                <LucideIcon name={tab.icon} size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'sandbox' && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-full border border-sky-400/25">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  viewportMode === 'desktop'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <LucideIcon name="monitor" size={13} />
                <span>電腦視角</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  viewportMode === 'mobile'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <LucideIcon name="smartphone" size={13} />
                <span>手機視角</span>
              </button>
            </div>
          )}
        </div>

        {/* 抽屜主內容區 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-sky-50/40 dark:bg-slate-950/40 flex flex-col">
          {activeTab === 'sandbox' && (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[420px]">
              <div
                className={`transition-all duration-300 bg-white dark:bg-slate-900 border-2 border-sky-400/35 shadow-xl overflow-hidden flex flex-col ${
                  viewportMode === 'mobile'
                    ? 'w-[375px] max-w-full h-[640px] rounded-[36px] border-4 border-slate-800 dark:border-slate-700'
                    : 'w-full h-full min-h-[460px] rounded-2xl'
                }`}
              >
                {/* 模擬瀏覽器狀態列 */}
                <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border-b border-sky-400/20 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="font-mono text-[11px] truncate max-w-[220px]">
                    {project.url}
                  </span>
                  <LucideIcon name="shield-check" size={13} className="text-sky-500" />
                </div>

                <iframe
                  src={project.url}
                  title={`${project.title} 即時沙盒預覽`}
                  className="w-full flex-1 bg-white border-0"
                  sandbox={
                    typeof project.url === 'string' && project.url.startsWith('/')
                      ? 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals'
                      : 'allow-scripts allow-forms allow-popups allow-modals'
                  }
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="lazy"
                />
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <LucideIcon name="info" size={13} className="text-sky-500" />
                <span>
                  若目標外部網站限制 iframe 嵌入，可點擊右上角「全螢幕開啟」或使用「QR-code」。
                </span>
              </p>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-5">
              <div className="bento-glass-card p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <LucideIcon name="sparkles" size={16} className="text-sky-500" />
                  <span>專案定位與功能說明</span>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {project.description}
                </p>
              </div>

              {Array.isArray(project.highlights) && project.highlights.length > 0 && (
                <div className="bento-glass-card p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <LucideIcon name="circle-check" size={16} className="text-sky-500" />
                    <span>專案核心亮點</span>
                  </h3>
                  <ul className="space-y-2">
                    {project.highlights.map((hl, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <LucideIcon
                          name="arrow-right"
                          size={15}
                          className="text-sky-500 mt-0.5 shrink-0"
                        />
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bento-glass-card p-4">
                  <div className="text-xs text-slate-400 mb-1">支援作業系統</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {(project.platforms || ['iOS', 'Android', 'macOS', 'Windows']).join(' / ')}
                  </div>
                </div>
                <div className="bento-glass-card p-4">
                  <div className="text-xs text-slate-400 mb-1">當前版本與更新日</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                    {project.version || 'v1.0.0'} ({project.updatedAt || '2026-11-09'})
                  </div>
                </div>
                <div className="bento-glass-card p-4">
                  <div className="text-xs text-slate-400 mb-1">即時連線健康度</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {statusMeta.label} · {project.latencyMs || 20} ms
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sdk' && (
            <div className="space-y-4">
              <div className="bento-glass-card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <LucideIcon name="code-2" size={18} className="text-sky-500" />
                      <span>子專案「一鍵返回咩創意大廳」懸浮導覽膠囊嵌入碼</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      將以下腳本貼入「{project.title}」的 HTML 底部，即可在子專案畫面顯示返回大廳的懸浮導覽按鈕（支援自由拖曳位置）：
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full btn-sky-primary text-xs font-semibold shrink-0"
                  >
                    <LucideIcon name={copiedSnippet ? 'check' : 'copy'} size={14} />
                    <span>{copiedSnippet ? '已複製嵌入碼' : '複製嵌入碼'}</span>
                  </button>
                </div>

                <pre className="p-4 rounded-2xl bg-slate-900 text-sky-300 font-mono text-xs overflow-x-auto border border-sky-400/30 leading-relaxed">
                  <code>{sdkSnippet}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
