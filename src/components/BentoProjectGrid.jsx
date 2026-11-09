import React from 'react';
import { LucideIcon, SquircleIconBadge } from './LucideIcon';
import { PROJECT_CATEGORIES, PROJECT_STATUS_META } from '../data/defaultData';

export default function BentoProjectGrid({
  projects,
  isAdmin,
  sortBy = 'default',
  entranceWaveKey = 0,
  onPreviewProject,
  onDirectLaunchProject,
  onOpenQrModal,
  onEditProject,
  onDeleteProject,
  onTogglePinProject,
  onToggleVisibilityProject,
  onReorderProject,
  onOpenProjectSdk,
  onResetFilters,
  onOpenAddProject
}) {
  const getCategoryMeta = (catId) =>
    PROJECT_CATEGORIES.find((c) => c.id === catId) || PROJECT_CATEGORIES[1];

  if (!projects || projects.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 theme-stagger-bento">
        <div className="bento-glass-card bento-wave-reveal p-12 text-center flex flex-col items-center justify-center gap-4">
          <SquircleIconBadge name="package" size="lg" iconSize={28} />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              目前尚無專案
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              {isAdmin
                ? '大廳目前沒有任何專案。您可以點擊下方按鈕新增您的第一個數位作品！'
                : '大廳目前尚無任何專案。'}
            </p>
          </div>
          {isAdmin && onOpenAddProject ? (
            <button
              type="button"
              onClick={onOpenAddProject}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-sky-primary text-xs font-semibold"
            >
              <LucideIcon name="plus" size={15} />
              <span>立即新增專案</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-sky-secondary text-xs font-semibold"
            >
              <LucideIcon name="rotate-ccw" size={15} />
              <span>重置所有篩選條件</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  // 依據排序模式排列專案 (預設將置頂專案排在最前方，並保留管理員自訂順序)
  const sortedProjects = [...projects].sort((a, b) => {
    if (sortBy === 'updated') {
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    }
    if (sortBy === 'latency') {
      const latA = a.status === 'offline' ? 9999 : Number(a.latencyMs) || 50;
      const latB = b.status === 'offline' ? 9999 : Number(b.latencyMs) || 50;
      return latA - latB;
    }
    if (sortBy === 'title') {
      return String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hant');
    }
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return 0;
  });

  return (
    <section
      aria-label="專案列表"
      key={`grid-wave-${entranceWaveKey}`}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 theme-stagger-bento"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {sortedProjects.map((project, index) => {
          const isSpotlight = Boolean(project.featured) && index < 2;
          const colSpanClass = isSpotlight
            ? 'md:col-span-2 lg:col-span-6'
            : 'md:col-span-1 lg:col-span-4';
          const statusMeta =
            PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.online;
          const categoryMeta = getCategoryMeta(project.category);
          const staggerDelay = `${Math.min(index * 65 + 150, 540)}ms`;

          return (
            <article
              key={project.id}
              data-testid={`project-card-${project.id}`}
              style={{ animationDelay: staggerDelay }}
              className={`${colSpanClass} bento-glass-card bento-card-interactive bento-wave-reveal group relative p-6 flex flex-col justify-between overflow-hidden`}
            >
              {/* 置頂精選卡片背景微光裝飾 */}
              {isSpotlight && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-sky-400/15 dark:bg-sky-400/10 blur-2xl"
                />
              )}

              <div>
                {/* 卡片頂部列：圓角圖示底座 + 標題與副標 + 右上角連線狀態燈號 */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <SquircleIconBadge
                      name={project.icon || categoryMeta.icon}
                      size={isSpotlight ? 'lg' : 'md'}
                      className="group-hover:scale-105"
                    />
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold font-heading-md text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                        {project.title}
                      </h3>
                      {project.subtitle && (
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 font-en truncate mt-0.5">
                          {project.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 右上角：即時連線狀態呼吸燈號 + 延遲毫秒數 */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${statusMeta.badgeClass}`}
                    title={`連線狀態：${statusMeta.label} (${project.latencyMs || 20}ms)`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full relative status-pulse-ring ${statusMeta.dotClass}`}
                    />
                    <span>{statusMeta.label}</span>
                    {project.latencyMs && (
                      <span className="font-mono opacity-80 hidden sm:inline">
                        {project.latencyMs}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* 專案屬性膠囊列：分類、版本、置頂、私人權限 */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/25">
                    <LucideIcon name={categoryMeta.icon} size={12} />
                    <span>{categoryMeta.name}</span>
                  </span>

                  {project.version && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border border-sky-400/15">
                      {project.version}
                    </span>
                  )}

                  {project.pinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500 text-white">
                      <LucideIcon name="pin" size={11} />
                      <span>置頂</span>
                    </span>
                  )}

                  {project.visibility === 'private' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <LucideIcon name="lock" size={11} />
                      <span>私人專案</span>
                    </span>
                  )}
                </div>

                {/* 專案簡介描述 */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-3">
                  {project.description}
                </p>

                {/* 精選亮點清單（僅置頂大卡顯示） */}
                {isSpotlight &&
                  Array.isArray(project.highlights) &&
                  project.highlights.length > 0 && (
                    <ul className="mb-4 space-y-1.5 bg-sky-50/75 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-sky-400/20">
                      {project.highlights.slice(0, 2).map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <LucideIcon
                            name="circle-check"
                            size={14}
                            className="text-sky-500 shrink-0"
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              <div className="mt-1">
                {/* 管理員專屬操作列（獨立整齊排列，不擠壓主要操作按鈕） */}
                {isAdmin && (
                  <div className="mb-3 px-3 py-2 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <LucideIcon name="sliders-horizontal" size={12} className="text-sky-500" />
                      <span>管理操作</span>
                    </span>

                    <div className="flex flex-wrap items-center gap-1">
                      {onReorderProject && (
                        <>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => onReorderProject(project.id, 'up')}
                            title="向前排序 (上移)"
                            aria-label={`上移 ${project.title}`}
                            className="p-1.5 rounded-full border border-sky-400/20 bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 hover:text-sky-500 hover:border-sky-400/50 disabled:opacity-35 disabled:pointer-events-none transition-colors"
                          >
                            <LucideIcon name="arrow-up" size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={index === sortedProjects.length - 1}
                            onClick={() => onReorderProject(project.id, 'down')}
                            title="向後排序 (下移)"
                            aria-label={`下移 ${project.title}`}
                            className="p-1.5 rounded-full border border-sky-400/20 bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 hover:text-sky-500 hover:border-sky-400/50 disabled:opacity-35 disabled:pointer-events-none transition-colors"
                          >
                            <LucideIcon name="arrow-down" size={13} />
                          </button>
                        </>
                      )}
                      {onToggleVisibilityProject && (
                        <button
                          type="button"
                          onClick={() => onToggleVisibilityProject(project.id)}
                          title={
                            project.visibility === 'private'
                              ? '目前為私人專案（點擊切換為公開）'
                              : '目前為公開專案（點擊切換為私人）'
                          }
                          aria-label={`切換公開或私人 ${project.title}`}
                          className={`p-1.5 rounded-full border transition-colors ${
                            project.visibility === 'private'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-300'
                              : 'border-sky-400/20 bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-sky-500'
                          }`}
                        >
                          <LucideIcon
                            name={project.visibility === 'private' ? 'lock' : 'globe'}
                            size={13}
                          />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onTogglePinProject(project.id)}
                        title={project.pinned ? '取消置頂' : '設為置頂專案'}
                        aria-label={`置頂 ${project.title}`}
                        className={`p-1.5 rounded-full border transition-colors ${
                          project.pinned
                            ? 'bg-sky-500/20 border-sky-400 text-sky-600 dark:text-sky-300'
                            : 'border-sky-400/20 bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-sky-500'
                        }`}
                      >
                        <LucideIcon name="pin" size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenProjectSdk(project)}
                        title="取得返回大廳嵌入碼與連線狀態"
                        aria-label={`${project.title} 嵌入碼`}
                        className="p-1.5 rounded-full border border-sky-400/20 bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 hover:text-sky-500 hover:border-sky-400/50 transition-colors"
                      >
                        <LucideIcon name="code-2" size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditProject(project)}
                        title="編輯專案資訊"
                        aria-label={`編輯 ${project.title}`}
                        className="p-1.5 rounded-full border border-sky-400/20 bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 hover:text-sky-500 hover:border-sky-400/50 transition-colors"
                      >
                        <LucideIcon name="pencil" size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(project.id)}
                        title="刪除專案"
                        aria-label={`刪除 ${project.title}`}
                        className="p-1.5 rounded-full border border-rose-400/25 bg-white/80 dark:bg-slate-800/80 text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <LucideIcon name="trash-2" size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 卡片底部操作列：快速預覽 + QR-code + 立即前往 */}
                <div className="pt-3.5 border-t border-sky-400/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPreviewProject(project)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full btn-sky-secondary text-xs font-semibold"
                    >
                      <LucideIcon name="panel-right-open" size={15} />
                      <span>快速預覽</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenQrModal(project)}
                      title="展開專案 QR-code"
                      aria-label={`${project.title} QR-code`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full btn-sky-secondary text-xs font-semibold"
                    >
                      <LucideIcon name="qr-code" size={15} />
                      <span className="hidden sm:inline">QR-code</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDirectLaunchProject(project)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-sky-primary text-xs font-semibold"
                  >
                    <span>立即前往</span>
                    <LucideIcon
                      name="arrow-up-right"
                      size={16}
                      className="transition-transform duration-200 hover-arrow-nudge"
                    />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
