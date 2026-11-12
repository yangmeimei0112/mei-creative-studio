import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LucideIcon, SquircleIconBadge, StudioLogo } from './LucideIcon';
import { PROJECT_CATEGORIES } from '../data/defaultData';

export default function CommandPalette({
  isOpen,
  onClose,
  projects,
  onPreviewProject,
  onDirectLaunchProject,
  onSelectCategory,
  onToggleTheme,
  isAdmin,
  onOpenAdminUnlock,
  onOpenAddProject,
  onOpenBackupModal,
  onReplayEntrance
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();

    const projectItems = projects
      .filter((p) => {
        if (!q) return true;
        const haystack = [
          p.title,
          p.subtitle,
          p.description,
          p.version
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .map((p) => ({
        id: `proj-${p.id}`,
        type: 'project',
        title: p.title,
        subtitle: p.subtitle || p.description,
        icon: p.icon || 'cloud',
        badge: p.visibility === 'private' ? '私人專案' : '立即開啟 / 預覽',
        onExecute: () => {
          onClose();
          onPreviewProject(p);
        },
        onSecondaryExecute: () => {
          onClose();
          onDirectLaunchProject(p);
        }
      }));

    const commandItems = [
      ...PROJECT_CATEGORIES.map((cat) => ({
        id: `cat-${cat.id}`,
        type: 'command',
        title: `切換分類：${cat.name}`,
        subtitle: cat.description,
        icon: cat.icon,
        badge: '分類篩選',
        onExecute: () => {
          onSelectCategory(cat.id);
          onClose();
        }
      })),
      ...(onReplayEntrance
        ? [
            {
              id: 'cmd-replay-entrance',
              type: 'command',
              title: '重播大廳開場動畫',
              subtitle: '再次體驗晴空雲霧散開與空間景深推進動畫',
              icon: 'cloud',
              badge: '視覺體驗',
              isStudioBrand: true,
              onExecute: () => {
                onClose();
                onReplayEntrance();
              }
            }
          ]
        : []),
      {
        id: 'cmd-theme',
        type: 'command',
        title: '切換深淺色主題模式',
        subtitle: '在淺色與深色外觀之間切換',
        icon: 'sun',
        badge: '外觀設定',
        onExecute: () => {
          onToggleTheme();
          onClose();
        }
      },
      isAdmin
        ? {
            id: 'cmd-add-project',
            type: 'command',
            title: '新增連接專案',
            subtitle: '將新的專案加入工作室列表',
            icon: 'plus',
            badge: '管理員指令',
            onExecute: () => {
              onClose();
              onOpenAddProject();
            }
          }
        : {
            id: 'cmd-unlock-admin',
            type: 'command',
            title: '管理員解鎖',
            subtitle: '查看私人專案與開啟管理功能',
            icon: 'lock',
            badge: '權限切換',
            onExecute: () => {
              onClose();
              onOpenAdminUnlock();
            }
          },
      {
        id: 'cmd-backup',
        type: 'command',
        title: '資料備份與還原',
        subtitle: '匯出或匯入專案設定檔 (JSON)',
        icon: 'download',
        badge: '資料備份',
        onExecute: () => {
          onClose();
          onOpenBackupModal();
        }
      }
    ].filter((cmd) => {
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.subtitle.toLowerCase().includes(q)
      );
    });

    return [...projectItems, ...commandItems];
  }, [
    query,
    projects,
    isAdmin,
    onClose,
    onPreviewProject,
    onDirectLaunchProject,
    onSelectCategory,
    onToggleTheme,
    onOpenAdminUnlock,
    onOpenAddProject,
    onOpenBackupModal,
    onReplayEntrance
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        items.length > 0 ? (prev - 1 + items.length) % items.length : 0
      );
    } else if (e.key === 'Enter' && items[activeIndex]) {
      e.preventDefault();
      items[activeIndex].onExecute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[max(3.5rem,env(safe-area-inset-top,3.5rem))] sm:pt-24 px-4 bg-slate-950/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="全域極速搜尋與快捷命令列"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bento-glass-card bg-white/95 dark:bg-slate-900/95 overflow-hidden shadow-2xl border border-sky-400/40"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 搜尋輸入列 */}
        <div className="px-4 py-3.5 border-b border-sky-400/20 flex items-center gap-3">
          <LucideIcon name="search" size={19} className="text-sky-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="輸入專案名稱、關鍵字或系統指令 (方向鍵選擇，Enter 執行)..."
            aria-label="命令列搜尋輸入"
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/25"
          >
            ESC
          </button>
        </div>

        {/* 搜尋結果列表 */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              <div>查無符合的專案或指令</div>
              <div className="text-xs mt-1 text-slate-400 dark:text-slate-500">找不到「{query}」</div>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.onExecute}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-500/15 dark:bg-sky-500/20 border border-sky-400/40'
                      : 'border border-transparent hover:bg-sky-50/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.isStudioBrand ? (
                      <StudioLogo size="sm" />
                    ) : (
                      <SquircleIconBadge name={item.icon} size="sm" iconSize={17} />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300">
                      {item.badge}
                    </span>
                    {item.onSecondaryExecute && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          item.onSecondaryExecute();
                        }}
                        title="直接新分頁開啟"
                        className="p-1.5 rounded-full btn-sky-primary"
                      >
                        <LucideIcon name="arrow-up-right" size={13} />
                      </button>
                    )}
                    <LucideIcon
                      name="corner-down-left"
                      size={14}
                      className="text-sky-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部快捷鍵說明列 */}
        <div className="px-4 py-2.5 bg-sky-50/80 dark:bg-slate-950/80 border-t border-sky-400/20 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <LucideIcon name="arrow-up" size={12} />
              <LucideIcon name="arrow-down" size={12} />
              <span>移動選擇</span>
            </span>
            <span className="flex items-center gap-1">
              <LucideIcon name="corner-down-left" size={12} />
              <span>Enter 開啟預覽或執行</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
            <StudioLogo size="xs" />
            <span>咩創意工作室</span>
          </div>
        </div>
      </div>
    </div>
  );
}
