import React from 'react';
import { LucideIcon, SquircleIconBadge, StudioLogo } from './LucideIcon';
import {
  PROJECT_CATEGORIES,
  STUDIO_CONFIG
} from '../data/defaultData';

export default function HeaderHero({
  projects,
  visibleProjects,
  filteredCount,
  recentProjects,
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  theme,
  onToggleTheme,
  isAdmin,
  onOpenAdminUnlock,
  onLockAdmin,
  onOpenAddProject,
  onOpenCommandPalette,
  onOpenSdkGuide,
  onOpenBackupModal,
  onRefreshHealth,
  isProbingHealth,
  onOpenInstallGuide,
  onSelectProjectPreview,
  onReplayEntrance,
  onResetFilters,
  sortBy = 'default',
  onSelectSortBy,
  entranceWaveKey = 0
}) {
  const onlineCount = visibleProjects.filter(
    (p) => p.status === 'online' || p.status === 'beta'
  ).length;
  const privateCount = projects.filter((p) => p.visibility === 'private').length;
  const avgLatency =
    visibleProjects.length > 0
      ? Math.round(
          visibleProjects.reduce((acc, p) => acc + (Number(p.latencyMs) || 22), 0) /
            visibleProjects.length
        )
      : 0;

  const hasActiveFilter =
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    Boolean(searchQuery && searchQuery.trim()) ||
    sortBy !== 'default';

  const displayedCount =
    typeof filteredCount === 'number' ? filteredCount : visibleProjects.length;

  return (
    <header className="w-full theme-stagger-hero">
      {/* 頂部毛玻璃導覽列 */}
      <div className="sticky top-0 z-30 border-b border-sky-400/20 bg-white/82 dark:bg-slate-950/82 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* 品牌主標誌 */}
          <a
            href="#top"
            className="flex items-center gap-3 group focus:outline-none shrink-0"
            aria-label="咩創意工作室首頁"
          >
            <StudioLogo size="md" className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors font-heading-lg">
                  {STUDIO_CONFIG.studioNameZh}
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-400/30">
                  {STUDIO_CONFIG.version}
                </span>
              </div>
              <span className="text-[11px] font-medium tracking-wider uppercase text-sky-700/80 dark:text-sky-300/80 font-en">
                {STUDIO_CONFIG.studioNameEn}
              </span>
            </div>
          </a>

          {/* 中央極速搜尋觸發列 (Cmd/Ctrl + K) */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center justify-between gap-6 px-4 py-2 rounded-full bg-sky-50/90 dark:bg-slate-900/90 border border-sky-400/30 hover:border-sky-400/70 text-slate-500 dark:text-slate-400 text-xs transition-all w-80 md:w-96 lg:w-[460px] xl:w-[540px] shadow-inner"
            aria-label="開啟全域搜尋命令列"
          >
            <span className="flex items-center gap-2">
              <LucideIcon name="search" size={15} className="text-sky-500" />
              <span>搜尋專案、分類或快捷指令...</span>
            </span>
            <kbd className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-sky-400/25 text-[11px] font-mono text-sky-700 dark:text-sky-300">
              <LucideIcon name="command" size={11} />
              <span>K</span>
            </kbd>
          </button>

          {/* 右側工具控制組 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 即時狀態巡檢按鈕 */}
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={isProbingHealth}
              title="即時巡檢所有子專案連線狀態"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-secondary text-xs font-medium"
            >
              <LucideIcon
                name={isProbingHealth ? 'refresh-cw' : 'activity'}
                size={15}
                className={isProbingHealth ? 'animate-spin text-sky-500' : 'text-emerald-500'}
              />
              <span>
                {isProbingHealth ? '巡檢中...' : `${onlineCount}/${visibleProjects.length} 線上`}
              </span>
            </button>

            {/* 桌面與行動裝置安裝引導 */}
            <button
              type="button"
              onClick={onOpenInstallGuide}
              title="安裝至桌面或主畫面指南"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-secondary text-xs font-medium"
            >
              <LucideIcon name="smartphone" size={15} />
              <span className="hidden lg:inline">安裝應用</span>
            </button>

            {/* 深淺色主題切換 */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
              aria-label="切換深淺色主題"
              className="p-2 rounded-full btn-sky-secondary"
            >
              <LucideIcon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
            </button>

            {/* 管理員視角切換 / 新增專案 */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenAddProject}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
                >
                  <LucideIcon name="plus" size={16} />
                  <span className="hidden sm:inline">新增專案</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenBackupModal}
                  title="備份匯出 / 匯入 JSON 與後台設定"
                  aria-label="資料備份與管理設定"
                  className="p-2 rounded-full btn-sky-secondary"
                >
                  <LucideIcon name="sliders-horizontal" size={16} />
                </button>
                <button
                  type="button"
                  onClick={onLockAdmin}
                  title="已解鎖管理員模式（點擊切換回公開訪客視角）"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
                >
                  <LucideIcon name="lock-open" size={15} />
                  <span className="hidden md:inline">管理員已解鎖</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminUnlock}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full btn-sky-secondary text-xs font-semibold"
              >
                <LucideIcon name="lock" size={15} />
                <span>管理員解鎖</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 品牌首屏與主控儀表板 */}
      <div
        id="top"
        key={`hero-wave-${entranceWaveKey}`}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 左側主視覺大卡片 (訪客視角 12 cols，管理員視角 8 cols) */}
          <div className={`${isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'} bento-glass-card bento-wave-reveal p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between`}>
            {/* 背景柔光裝飾 */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full bg-sky-300/25 dark:bg-sky-400/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-24 -bottom-20 w-56 h-56 rounded-full bg-sky-200/35 dark:bg-sky-500/10 blur-2xl"
            />

            <div className="relative z-10">
              <div className="studio-title-align-box mb-4">
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight mb-2.5 font-heading-lg flex flex-wrap sm:flex-nowrap items-baseline gap-x-3">
                  <span className="shrink-0">{STUDIO_CONFIG.studioNameZh}</span>
                  <span className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-sky-500 to-sky-700 dark:from-sky-300 dark:to-sky-500 bg-clip-text text-transparent font-en whitespace-nowrap">
                    {STUDIO_CONFIG.studioNameEn}
                  </span>
                </h1>

                <p className="studio-tagline-justify text-base sm:text-lg md:text-xl font-bold text-slate-600 dark:text-slate-300 tracking-[0.04em] sm:tracking-normal leading-relaxed">
                  {STUDIO_CONFIG.description}
                </p>
              </div>
            </div>
          </div>

          {/* 右側即時狀態與最近常訪儀表板 (僅管理員視角顯示) */}
          {isAdmin && (
            <div
              style={{ animationDelay: '70ms' }}
              className="lg:col-span-4 bento-glass-card bento-wave-reveal p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <SquircleIconBadge name="activity" size="sm" iconSize={18} />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        大廳即時運作狀態
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        專案連線與快速開啟
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 relative status-pulse-ring" />
                    <span>系統正常</span>
                  </span>
                </div>

                {/* 三格關鍵數據 */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      已連接專案
                    </div>
                    <div className="text-xl font-extrabold text-sky-700 dark:text-sky-300">
                      {visibleProjects.length}
                      {!isAdmin && privateCount > 0 && (
                        <span
                          className="ml-1 text-[11px] font-normal text-slate-400"
                          title="另有管理員私人專案隱藏中"
                        >
                          (+{privateCount})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      平均延遲
                    </div>
                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {avgLatency}
                      <span className="text-xs font-semibold ml-0.5">ms</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-slate-900/70 border border-sky-400/20">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      當前視角
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1">
                      <LucideIcon
                        name={isAdmin ? 'lock-open' : 'globe'}
                        size={14}
                        className="text-sky-500"
                      />
                      <span>{isAdmin ? '管理員' : '公開訪客'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 最近常訪或快速體驗區 */}
              <div className="pt-3 border-t border-sky-400/20">
                <div className="flex items-center text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="clock" size={14} className="text-sky-500" />
                    <span>{recentProjects.length > 0 ? '最近開啟專案' : '推薦立即體驗'}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(recentProjects.length > 0 ? recentProjects : visibleProjects.slice(0, 2)).length > 0 ? (
                    (recentProjects.length > 0 ? recentProjects : visibleProjects.slice(0, 2)).map(
                      (proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => onSelectProjectPreview(proj)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-sky-400/25 hover:border-sky-400 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all max-w-full"
                        >
                          <LucideIcon name={proj.icon} size={14} className="text-sky-500" />
                          <span className="truncate max-w-[140px]">{proj.title}</span>
                          <LucideIcon
                            name="panel-right-open"
                            size={12}
                            className="text-slate-400 shrink-0"
                          />
                        </button>
                      )
                    )
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">目前尚無專案</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 乾淨整潔的專案分類、搜尋與狀態篩選列 */}
        <div
          id="categories-bar"
          style={{ animationDelay: '130ms' }}
          className="mt-6 bento-glass-card bento-wave-reveal p-4 sm:p-5 flex flex-col gap-3.5 theme-stagger-bento"
        >
          {/* 第一列：四大領域分類切換 + 關鍵字搜尋與排序 */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* 四大分類切換膠囊 */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar"
              role="tablist"
              aria-label="專案領域分類"
            >
              {PROJECT_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const count =
                  cat.id === 'all'
                    ? visibleProjects.length
                    : visibleProjects.filter((p) => p.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'btn-sky-primary shadow-md'
                        : 'bg-sky-50/75 dark:bg-slate-900/65 text-slate-600 dark:text-slate-300 border border-sky-400/20 hover:border-sky-400/50 hover:text-sky-700 dark:hover:text-sky-300'
                    }`}
                  >
                    <LucideIcon name={cat.icon} size={16} />
                    <span>{cat.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 即時搜尋框 + 排序選單 */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <LucideIcon
                  name="search"
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="搜尋專案名稱或關鍵字..."
                  aria-label="搜尋專案關鍵字"
                  className="w-full pl-9 pr-8 py-2 rounded-full text-xs sm:text-sm bg-sky-50/90 dark:bg-slate-900/80 border border-sky-400/30 focus:border-sky-500 focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="清除搜尋關鍵字"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <LucideIcon name="x" size={14} />
                  </button>
                )}
              </div>

              {onSelectSortBy && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
                    排序：
                  </span>
                  <select
                    aria-label="專案排序方式"
                    value={sortBy}
                    onChange={(e) => onSelectSortBy(e.target.value)}
                    className="px-3.5 py-2 rounded-full text-xs font-semibold bg-sky-50/90 dark:bg-slate-900/90 border border-sky-400/30 text-sky-700 dark:text-sky-300 focus:border-sky-500 focus:outline-none cursor-pointer"
                  >
                    <option value="default">預設置頂與自訂順序</option>
                    <option value="updated">最新更新優先</option>
                    <option value="latency">連線速度優先</option>
                    <option value="title">專案名稱排序</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 第二列：連線狀態快速篩選與結果統計 */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sky-400/15">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0 mr-1 hidden sm:inline">
                狀態篩選：
              </span>
              {[
                { id: 'all', label: '所有狀態', icon: 'filter' },
                { id: 'online', label: '正式上線', icon: 'circle-check' },
                { id: 'beta', label: '測試 Beta', icon: 'activity' },
                { id: 'maintenance', label: '維護中', icon: 'triangle-alert' },
                { id: 'offline', label: '離線待命', icon: 'wifi-off' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onSelectStatus(st.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                    selectedStatus === st.id
                      ? 'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 font-semibold shadow-sm'
                      : 'bg-transparent border-sky-400/20 text-slate-500 dark:text-slate-400 hover:border-sky-400/45 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <LucideIcon name={st.icon} size={13} />
                  <span>{st.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 ml-auto text-xs text-slate-500 dark:text-slate-400">
              <span>
                顯示 <strong className="text-sky-700 dark:text-sky-300">{displayedCount}</strong> / {visibleProjects.length} 個專案
              </span>
              {hasActiveFilter && onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors"
                >
                  <LucideIcon name="rotate-ccw" size={12} />
                  <span>清除篩選</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
