import React, { useState, useMemo } from 'react';
import { LucideIcon, SquircleIconBadge } from './LucideIcon';
import { SECURITY_AUDIT_DOMAINS, getSecurityAuditSummary } from '../data/securityAuditData';

export default function SecurityAuditModal({
  isOpen,
  onClose,
  securityMetrics,
  rateLimitStatus
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [copiedCmdId, setCopiedCmdId] = useState(null);
  const [itemStatuses, setItemStatuses] = useState({});

  const summary = useMemo(() => getSecurityAuditSummary(), []);

  // 依關鍵字與分類篩選項目
  const filteredDomains = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return SECURITY_AUDIT_DOMAINS.map((domain) => {
      if (activeTab !== 'all' && domain.id !== activeTab) {
        return null;
      }
      const matchedItems = domain.items.filter((item) => {
        if (!term) return true;
        return (
          item.name.toLowerCase().includes(term) ||
          item.target.toLowerCase().includes(term) ||
          item.checkpoints.toLowerCase().includes(term) ||
          item.queryCmd.toLowerCase().includes(term) ||
          item.inspectTip.toLowerCase().includes(term) ||
          item.sampleLogs.some((log) => log.toLowerCase().includes(term))
        );
      });
      if (matchedItems.length === 0) return null;
      return {
        ...domain,
        items: matchedItems
      };
    }).filter(Boolean);
  }, [activeTab, searchTerm]);

  if (!isOpen) return null;

  const handleCopyCmd = (id, cmd) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cmd).catch(() => {});
      setCopiedCmdId(id);
      setTimeout(() => {
        setCopiedCmdId(null);
      }, 2000);
    }
  };

  const handleToggleItemStatus = (itemId) => {
    setItemStatuses((prev) => {
      const current = prev[itemId] || 'normal';
      const next = current === 'normal' ? 'verified' : current === 'verified' ? 'flagged' : 'normal';
      return { ...prev, [itemId]: next };
    });
  };

  const handleExportReport = () => {
    const reportData = {
      studio: '咩創意工作室 (Mei Creative Studio)',
      system: 'SOC 資安事故清查與防禦報告',
      generatedAt: new Date().toISOString(),
      metrics: {
        interceptCount: securityMetrics?.interceptCount || 0,
        honeypotCount: securityMetrics?.honeypotCount || 0,
        lastEventDesc: securityMetrics?.lastEventDesc || 'SOC 核心運作正常',
        rateLimitLocked: Boolean(rateLimitStatus?.isLocked)
      },
      summary,
      domains: SECURITY_AUDIT_DOMAINS.map((domain) => ({
        id: domain.id,
        title: domain.title,
        subtitle: domain.subtitle,
        description: domain.description,
        items: domain.items.map((item) => ({
          id: item.id,
          name: item.name,
          manualStatus: itemStatuses[item.id] || 'normal',
          target: item.target,
          checkpoints: item.checkpoints,
          sampleLogs: item.sampleLogs,
          queryCmd: item.queryCmd,
          inspectTip: item.inspectTip
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mei-studio-soc-audit-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="SOC 資安事故清查詳細報告"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] max-h-dvh-92 landscape-compact-modal flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-sky-400/40 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 彈窗頂部 */}
        <div className="p-5 sm:p-6 border-b border-sky-400/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SquircleIconBadge name="shield-check" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  SOC 資安事故清查與防禦詳細資料
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-400/30">
                  5 大面向 14 項威脅指標
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                涵蓋身分驗證、網路流量、端點系統、應用資料庫日誌與通訊郵件之深度事故清查準則
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl btn-sky-secondary text-xs font-semibold"
              title="匯出 JSON 格式事故清查報告"
            >
              <LucideIcon name="download" size={14} />
              <span className="hidden sm:inline">匯出報告</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉清查視窗"
              className="p-2 rounded-xl btn-sky-secondary text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <LucideIcon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* 搜尋與面向篩選工具列 */}
        <div className="p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-950/40 border-b border-sky-400/20 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* 面向標籤切換 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'btn-sky-primary'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-sky-400/20'
              }`}
            >
              全部面向 ({summary.totalItems})
            </button>
            {SECURITY_AUDIT_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => setActiveTab(domain.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === domain.id
                    ? 'btn-sky-primary'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-sky-400/20'
                }`}
              >
                <LucideIcon name={domain.icon} size={13} />
                <span>{domain.title}</span>
                <span className="text-[10px] opacity-75">({domain.items.length})</span>
              </button>
            ))}
          </div>

          {/* 關鍵字搜尋 */}
          <div className="relative min-w-[200px] sm:w-64">
            <LucideIcon
              name="search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋清查項目、日誌、指令..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-400/30 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* 清查主內容列表區塊 */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {filteredDomains.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <LucideIcon name="search" size={28} className="mx-auto text-slate-400 opacity-60" />
              <p className="text-sm font-semibold">找不到符合「{searchTerm}」的清查項目</p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-sky-500 underline font-medium"
              >
                清除搜尋條件
              </button>
            </div>
          ) : (
            filteredDomains.map((domain) => (
              <div key={domain.id} className="space-y-3">
                {/* 面向標題列 */}
                <div className="flex items-center justify-between pb-2 border-b border-sky-400/20">
                  <div className="flex items-center gap-2">
                    <SquircleIconBadge name={domain.icon} size="sm" iconSize={16} />
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      {domain.title}
                    </h3>
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                      ({domain.subtitle})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    {domain.badge}
                  </span>
                </div>

                {/* 威脅風險情境說明 */}
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-sky-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-sky-400/15 leading-relaxed">
                  <span className="font-bold text-sky-700 dark:text-sky-300 mr-1.5">威脅入侵情境：</span>
                  {domain.description}
                </p>

                {/* 項目卡片清單 */}
                <div className="grid grid-cols-1 gap-3">
                  {domain.items.map((item) => {
                    const isExpanded = expandedItemId === item.id;
                    const manualStatus = itemStatuses[item.id] || 'normal';

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-white dark:bg-slate-800/80 border border-sky-400/25 p-4 space-y-3 transition-all hover:border-sky-400/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {item.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  manualStatus === 'verified'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                                    : manualStatus === 'flagged'
                                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30'
                                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30'
                                }`}
                              >
                                {manualStatus === 'verified'
                                  ? '已手動核驗'
                                  : manualStatus === 'flagged'
                                    ? '標記需進一步清查'
                                    : item.statusText}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {item.checkpoints}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleItemStatus(item.id)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium btn-sky-secondary text-slate-600 dark:text-slate-300"
                              title="變更核驗標記"
                            >
                              {manualStatus === 'verified' ? '標記異常' : '標記核驗'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                              className="p-1.5 rounded-lg btn-sky-secondary text-slate-500 hover:text-sky-600 dark:hover:text-sky-300"
                              aria-label={isExpanded ? '收合詳細日誌' : '展開詳細日誌'}
                            >
                              <LucideIcon
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={15}
                              />
                            </button>
                          </div>
                        </div>

                        {/* 清查標的系統 */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-sky-400/15">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            清查標的：
                          </span>
                          <span className="font-mono text-sky-600 dark:text-sky-400 truncate">
                            {item.target}
                          </span>
                        </div>

                        {/* 展開之日誌與指令面板 */}
                        {isExpanded && (
                          <div className="pt-2 space-y-3 animate-fadeIn">
                            {/* 實際/模擬稽核日誌 */}
                            <div className="p-3 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 text-[11px] font-mono space-y-1">
                              <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <LucideIcon name="activity" size={12} />
                                <span>SOC 稽核紀錄 (Audit Evidence)</span>
                              </div>
                              {item.sampleLogs.map((log, lIdx) => (
                                <div key={lIdx} className="flex items-start gap-1.5">
                                  <span className="text-emerald-400 select-none">›</span>
                                  <span className="leading-relaxed">{log}</span>
                                </div>
                              ))}
                            </div>

                            {/* 排查指令 */}
                            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-sky-400/20 text-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <LucideIcon name="terminal" size={14} className="text-sky-500 shrink-0" />
                                <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
                                  {item.queryCmd}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyCmd(item.id, item.queryCmd)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium btn-sky-primary shrink-0"
                              >
                                <LucideIcon
                                  name={copiedCmdId === item.id ? 'check' : 'copy'}
                                  size={12}
                                />
                                <span>{copiedCmdId === item.id ? '已複製' : '複製指令'}</span>
                              </button>
                            </div>

                            {/* 應變指引提示 */}
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-amber-500/10 border border-amber-400/20 p-2.5 rounded-xl flex items-start gap-2">
                              <LucideIcon
                                name="circle-alert"
                                size={14}
                                className="text-amber-500 shrink-0 mt-0.5"
                              />
                              <span className="leading-relaxed">
                                <strong className="text-amber-700 dark:text-amber-300">清查指引：</strong>
                                {item.inspectTip}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部資訊列 */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/80 border-t border-sky-400/20 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <LucideIcon name="shield-check" size={15} className="text-emerald-500" />
            <span>5 大面向清查指標就緒，嚴格防範未授權提權、資料外洩與持久化後門</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full btn-sky-primary font-semibold text-xs ml-auto"
          >
            完成清查
          </button>
        </div>
      </div>
    </div>
  );
}
