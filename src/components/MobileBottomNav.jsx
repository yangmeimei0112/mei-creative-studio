import React from 'react';
import { LucideIcon, StudioLogo } from './LucideIcon';

/**
 * 專為行動裝置單手操作設計的底部導覽列
 */
export default function MobileBottomNav({
  activeSection,
  onNavigateSection,
  onOpenCommandPalette,
  isAdmin,
  onOpenAdminUnlock,
  onOpenAddProject
}) {
  const navItems = [
    {
      id: 'explore',
      label: '探索大廳',
      icon: 'cloud',
      onClick: () => {
        onNavigateSection('explore');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      id: 'categories',
      label: '分類篩選',
      icon: 'layers',
      onClick: () => {
        onNavigateSection('categories');
        document
          .getElementById('categories-bar')
          ?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'search',
      label: '快速搜尋',
      icon: 'search',
      isPrimary: true,
      onClick: onOpenCommandPalette
    },
    {
      id: 'pulse',
      label: '版本日誌',
      icon: 'history',
      onClick: () => {
        onNavigateSection('pulse');
        document
          .getElementById('studio-pulse')
          ?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'admin',
      label: isAdmin ? '新增專案' : '管理解鎖',
      icon: isAdmin ? 'plus' : 'lock',
      onClick: isAdmin ? onOpenAddProject : onOpenAdminUnlock
    }
  ];

  return (
    <nav
      aria-label="手機端底部快速導覽列"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/88 dark:bg-slate-950/88 backdrop-blur-2xl border-t border-sky-400/25 pb-safe-bottom theme-stagger-footer"
    >
      <div className="grid grid-cols-5 items-center px-2 pt-2">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <span className="w-11 h-11 rounded-2xl btn-sky-primary flex items-center justify-center shadow-lg">
                  <LucideIcon name={item.icon} size={20} />
                </span>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 mt-1">
                  {item.label}
                </span>
              </button>
            );
          }

          if (item.id === 'explore') {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <StudioLogo size="xs" />
                <span className="text-[10px] mt-1">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <LucideIcon name={item.icon} size={18} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
