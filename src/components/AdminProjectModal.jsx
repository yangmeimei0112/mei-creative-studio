import React, { useEffect, useState } from 'react';
import {
  LUCIDE_PICKER_GROUPS,
  LucideIcon,
  SquircleIconBadge,
  StudioLogo,
  normalizeLucideIconName,
  getLucideIconZhName
} from './LucideIcon';
import { PROJECT_CATEGORIES, PROJECT_STATUS_META } from '../data/defaultData';
import {
  generateSubprojectEmbedSnippet,
  probeProjectHealth,
  sanitizeProjectUrl
} from '../services/storageService';

/**
 * 1. 視覺化專案新增 / 編輯彈窗 (內建 Lucide 圖示視覺化挑選面板)
 */
export default function AdminProjectModal({
  isOpen,
  onClose,
  editingProject,
  onSaveProject
}) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('/demo-subproject.html');
  const [category, setCategory] = useState('ai-automation');
  const [icon, setIcon] = useState('cloud');
  const [visibility, setVisibility] = useState('public');
  const [status, setStatus] = useState('online');
  const [featured, setFeatured] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [version, setVersion] = useState('v1.0.0');
  const [highlightsInput, setHighlightsInput] = useState('');
  const [iconSearch, setIconSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingProject) {
      setTitle(editingProject.title || '');
      setSubtitle(editingProject.subtitle || '');
      setDescription(editingProject.description || '');
      setUrl(editingProject.url || '/demo-subproject.html');
      setCategory(editingProject.category || 'ai-automation');
      setIcon(editingProject.icon || 'cloud');
      setVisibility(editingProject.visibility || 'public');
      setStatus(editingProject.status || 'online');
      setFeatured(Boolean(editingProject.featured));
      setPinned(Boolean(editingProject.pinned));
      setVersion(editingProject.version || 'v1.0.0');
      setHighlightsInput(
        Array.isArray(editingProject.highlights)
          ? editingProject.highlights.join('\n')
          : ''
      );
    } else {
      setTitle('');
      setSubtitle('');
      setDescription('');
      setUrl('/demo-subproject.html');
      setCategory('ai-automation');
      setIcon('bot');
      setVisibility('public');
      setStatus('online');
      setFeatured(false);
      setPinned(false);
      setVersion('v1.0.0');
      setHighlightsInput('支援桌面與行動裝置流暢操作\n整合快速導覽工具列');
    }
    setIconSearch('');
    setErrorMsg('');
  }, [editingProject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入專案名稱');
      return;
    }
    if (!url.trim()) {
      setErrorMsg('請輸入專案連接網址或路徑');
      return;
    }

    const highlights = highlightsInput
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);

    const payload = {
      id: editingProject?.id || `mei-proj-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim(),
      description:
        description.trim() ||
        '咩創意工作室旗下的數位創作專案。',
      url: sanitizeProjectUrl(url.trim(), '/demo-subproject.html'),
      category,
      icon: normalizeLucideIconName(icon),
      visibility,
      status,
      featured,
      pinned,
      version: version.trim() || 'v1.0.0',
      latencyMs: status === 'offline' ? null : editingProject?.latencyMs || 18,
      updatedAt: new Date().toISOString().slice(0, 10),
      platforms: ['iOS', 'Android', 'macOS', 'Windows'],
      highlights
    };

    onSaveProject(payload);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/55 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={editingProject ? '編輯連接專案' : '新增連接專案'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl my-auto bento-glass-card bg-white/95 dark:bg-slate-900/95 border border-sky-400/40 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題列 */}
        <div className="px-6 py-4 border-b border-sky-400/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SquircleIconBadge name={icon} size="md" />
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {editingProject ? `編輯專案：${editingProject.title}` : '新增連接專案至咩創意大廳'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                設定專案基本資訊、所屬分類與顯示權限
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉專案管理視窗"
            className="p-2 rounded-full btn-sky-secondary"
          >
            <LucideIcon name="x" size={16} />
          </button>
        </div>

        {/* 表單內容 */}
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-5 flex-1"
        >
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/12 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <LucideIcon name="triangle-alert" size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 基本資訊：名稱、副標、網址 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                專案中文名稱 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：咩創意 AI 視覺生成器"
                className="w-full px-3.5 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-sm text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                英文副標題 / 代號
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="例如：Mei Vision Studio"
                className="w-full px-3.5 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-sm text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                目標專案網址 (URL 或相對路徑) *
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://... 或 /demo-subproject.html"
                className="w-full px-3.5 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-sm font-mono text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                版本號
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full px-3.5 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-sm font-mono text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 專案簡介 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              專案簡介與導引說明
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="簡述此專案的核心價值與操作方式..."
              className="w-full px-3.5 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-sm text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* 分類、公開/私人權限、運作狀態 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="project-category" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                所屬專案分類
              </label>
              <select
                id="project-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-sm text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
              >
                {PROJECT_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="project-visibility" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                存取權限視角
              </label>
              <select
                id="project-visibility"
                aria-label="存取權限視角"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-sm text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="public">公開展示（訪客可見）</option>
                <option value="private">私人專案（僅管理員可見）</option>
              </select>
            </div>

            <div>
              <label htmlFor="project-status" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                連線運作狀態
              </label>
              <select
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-sm text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="online">正式上線</option>
                <option value="beta">測試 Beta</option>
                <option value="maintenance">維護更新中</option>
                <option value="offline">離線待命</option>
              </select>
            </div>
          </div>

          {/* 置頂與精選大卡切換 */}
          <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-2xl bg-sky-50/70 dark:bg-slate-800/60 border border-sky-400/20">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded border-sky-400 text-sky-500 focus:ring-sky-400"
              />
              <LucideIcon name="pin" size={14} className="text-sky-500" />
              <span>設為優先置頂專案</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-sky-400 text-sky-500 focus:ring-sky-400"
              />
              <LucideIcon name="sparkles" size={14} className="text-sky-500" />
              <span>設為精選焦點卡片</span>
            </label>
          </div>

          {/* 專案圖示挑選器 */}
          <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-slate-950/60 border border-sky-400/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <LucideIcon name="sparkles" size={16} className="text-sky-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  選擇專案圖示（已選：{getLucideIconZhName(icon)}）
                </span>
              </div>
              <input
                type="text"
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="搜尋圖示名稱 (如 機器人, 雲朵, 數據儀表板)..."
                className="px-3 py-1 rounded-full text-xs bg-white dark:bg-slate-800 border border-sky-400/30 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {LUCIDE_PICKER_GROUPS.map((group) => {
                const filteredIcons = group.icons.filter(
                  (item) =>
                    !iconSearch.trim() ||
                    item.name.toLowerCase().includes(iconSearch.toLowerCase()) ||
                    item.label.toLowerCase().includes(iconSearch.toLowerCase())
                );
                if (filteredIcons.length === 0) return null;

                return (
                  <div key={group.groupName}>
                    <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 mb-1.5">
                      {group.groupName}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {filteredIcons.map((item) => {
                        const isSelected = icon === item.name;
                        const zhName = item.label.replace(/\s+[A-Za-z0-9]+$/, '');
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setIcon(item.name)}
                            title={item.label}
                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-[10px] transition-all ${
                              isSelected
                                ? 'bg-sky-500 text-white border-sky-500 shadow-sm scale-105'
                                : 'bg-white/90 dark:bg-slate-800/90 border-sky-400/20 text-slate-600 dark:text-slate-300 hover:border-sky-400'
                            }`}
                          >
                            <LucideIcon name={item.name} size={18} />
                            <span className="truncate w-full text-center font-medium">
                              {zhName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 置頂精選亮點 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              置頂精選亮點 (每行一項)
            </label>
            <textarea
              rows={2}
              value={highlightsInput}
              onChange={(e) => setHighlightsInput(e.target.value)}
              placeholder="支援跨平台安裝&#10;內嵌返回大廳膠囊"
              className="w-full px-3.5 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-sky-400/20 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full btn-sky-secondary text-xs font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full btn-sky-primary text-xs font-semibold"
            >
              <LucideIcon name="check" size={15} />
              <span>{editingProject ? '儲存專案變更' : '立即加入導引大廳'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 2. 管理員解鎖驗證彈窗 (預設密碼：mei888)
 */
export function AdminUnlockModal({ isOpen, onClose, onUnlockSuccess, verifyPin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (verifyPin(pin)) {
      onUnlockSuccess();
      onClose();
    } else {
      setError('密碼不正確，請重新輸入（預設管理員密碼：mei888）');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="管理員解鎖驗證"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bento-glass-card bg-white/95 dark:bg-slate-900/95 p-6 border border-sky-400/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <StudioLogo size="md" />
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                管理員中樞解鎖
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                解鎖後可檢視私人專案、新增/編輯專案與管理版本動態
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉解鎖視窗"
            className="p-2 rounded-full btn-sky-secondary"
          >
            <LucideIcon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              請輸入工作室管理員密碼
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="預設密碼：mei888"
              aria-label="管理員密碼輸入框"
              autoFocus
              className="w-full px-4 py-2.5 rounded-2xl bg-sky-50/90 dark:bg-slate-800 border border-sky-400/35 text-sm text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <LucideIcon name="key-round" size={12} />
              <span>預設解鎖密碼為 <strong>mei888</strong>（解鎖後可於設定中修改）</span>
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/12 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full btn-sky-secondary text-xs font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full btn-sky-primary text-xs font-semibold"
            >
              <LucideIcon name="lock-open" size={15} />
              <span>立即解鎖管理後台</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 3. 資料備份 (匯出/匯入 JSON) 與密碼設定視窗
 */
export function StudioBackupModal({
  isOpen,
  onClose,
  onExportJSON,
  onImportJSON,
  onResetDefault,
  isAdmin,
  onChangeAdminPin
}) {
  const [jsonText, setJsonText] = useState('');
  const [newPin, setNewPin] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (isOpen) {
      setJsonText('');
      setNewPin('');
      setFeedback('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImportSubmit = () => {
    if (!jsonText.trim()) {
      setFeedback('請先貼上或選擇要匯入的 JSON 備份內容');
      return;
    }
    try {
      onImportJSON(jsonText);
      setFeedback('成功匯入專案與版本日誌備份！');
      setJsonText('');
    } catch (err) {
      setFeedback(err.message || '匯入失敗');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setJsonText(content);
    };
    reader.readAsText(file);
  };

  const handlePinUpdate = (e) => {
    e.preventDefault();
    try {
      onChangeAdminPin(newPin);
      setNewPin('');
      setFeedback('管理員密碼已成功更新！');
    } catch (err) {
      setFeedback(err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="資料備份與系統設定"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bento-glass-card bg-white/95 dark:bg-slate-900/95 p-6 border border-sky-400/40 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SquircleIconBadge name="database" size="md" />
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                資料備份與管理中心
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                支援專案設定檔匯出、匯入還原與管理員密碼設定
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉備份視窗"
            className="p-2 rounded-full btn-sky-secondary"
          >
            <LucideIcon name="x" size={16} />
          </button>
        </div>

        {feedback && (
          <div className="p-3 rounded-2xl bg-sky-500/12 border border-sky-400/35 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-2">
            <LucideIcon name="info" size={15} />
            <span>{feedback}</span>
          </div>
        )}

        {/* 匯出與重置 */}
        <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-slate-800/60 border border-sky-400/25 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              匯出完整大廳設定檔 (projects.json)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              下載包含所有公開/私人專案、分類與版本日誌的 JSON 備份
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportJSON}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-sky-primary text-xs font-semibold"
            >
              <LucideIcon name="download" size={15} />
              <span>匯出 JSON 備份</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onResetDefault();
                setFeedback('已還原為咩創意工作室預設示範資料');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full btn-sky-secondary text-xs font-semibold"
            >
              <LucideIcon name="rotate-ccw" size={14} />
              <span>重置預設</span>
            </button>
          </div>
        </div>

        {/* 匯入 JSON 備份 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              匯入 JSON 備份還原
            </label>
            <label className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 cursor-pointer hover:underline">
              <LucideIcon name="upload" size={13} />
              <span>選擇 .json 檔案</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <textarea
            rows={4}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='貼上匯出的 JSON 內容，例如 {"projects": [...]}'
            className="w-full p-3 rounded-2xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleImportSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-sky-secondary text-xs font-semibold"
          >
            <LucideIcon name="upload" size={14} />
            <span>套用匯入資料</span>
          </button>
        </div>

        {/* 修改管理員密碼 */}
        {isAdmin && (
          <form
            onSubmit={handlePinUpdate}
            className="pt-4 border-t border-sky-400/20 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
          >
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                變更管理員解鎖密碼
              </label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="輸入新密碼 (至少 4 碼)"
                className="w-full px-3.5 py-2 rounded-xl bg-sky-50/80 dark:bg-slate-800 border border-sky-400/30 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full btn-sky-primary text-xs font-semibold"
            >
              <LucideIcon name="key-round" size={14} />
              <span>更新密碼</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * 4. 子專案接入 SDK 精靈 與 跨四平台 (iOS/Android/Mac/Windows) 安裝指南視窗
 */
export function SdkAndInstallModal({
  isOpen,
  initialMode = 'sdk',
  targetProject,
  onClose,
  onTriggerNativeInstall,
  canNativeInstall
}) {
  const [tab, setTab] = useState(initialMode);
  const [copied, setCopied] = useState(false);
  const [dockPosition, setDockPosition] = useState('bottom-right');
  const [diagReport, setDiagReport] = useState(null);
  const [isProbingSingle, setIsProbingSingle] = useState(false);

  const effectiveProject = targetProject || {
    title: '我的新創意專案',
    url: '/demo-subproject.html',
    status: 'online',
    latencyMs: 18
  };

  useEffect(() => {
    if (isOpen) {
      setTab(initialMode);
      setCopied(false);
      setDockPosition('bottom-right');
      setDiagReport({
        status: effectiveProject.status || 'online',
        latencyMs: effectiveProject.latencyMs ?? 18,
        checkedAt: new Date().toLocaleTimeString('zh-TW', { hour12: false })
      });
    }
  }, [isOpen, initialMode, targetProject]);

  if (!isOpen) return null;

  const snippet = generateSubprojectEmbedSnippet(
    effectiveProject,
    undefined,
    dockPosition
  );

  const statusMeta =
    PROJECT_STATUS_META[diagReport?.status || effectiveProject.status] ||
    PROJECT_STATUS_META.online;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippet);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
    }
  };

  const handleRunDiagnostic = async () => {
    setIsProbingSingle(true);
    try {
      const res = await probeProjectHealth(effectiveProject);
      setDiagReport({
        status: res.status,
        latencyMs: res.latencyMs,
        checkedAt: new Date().toLocaleTimeString('zh-TW', { hour12: false })
      });
    } finally {
      setIsProbingSingle(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="子專案接入指南與跨平台安裝教學"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bento-glass-card bg-white/95 dark:bg-slate-900/95 p-6 border border-sky-400/40 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {tab === 'sdk' ? (
              <StudioLogo size="md" />
            ) : (
              <SquircleIconBadge name="smartphone" size="md" />
            )}
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {tab === 'sdk'
                  ? '子專案「返回咩創意大廳」導覽工具接入精靈'
                  : '桌面與行動裝置安裝指南'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                快速整合子專案導覽或將本站加入主畫面
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉指南視窗"
            className="p-2 rounded-full btn-sky-secondary"
          >
            <LucideIcon name="x" size={16} />
          </button>
        </div>

        {/* 分頁切換 */}
        <div className="flex items-center gap-2 border-b border-sky-400/20 pb-3">
          <button
            type="button"
            onClick={() => setTab('sdk')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              tab === 'sdk' ? 'btn-sky-primary' : 'btn-sky-secondary'
            }`}
          >
            <LucideIcon name="code-2" size={15} />
            <span>子專案返回大廳 SDK (mei-dock.js)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('install')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              tab === 'install' ? 'btn-sky-primary' : 'btn-sky-secondary'
            }`}
          >
            <LucideIcon name="smartphone" size={15} />
            <span>安裝至手機與電腦桌面</span>
          </button>
        </div>

        {tab === 'sdk' ? (
          <div className="space-y-4">
            {/* 專屬專案連線檢測報告 */}
            <div className="p-4 rounded-2xl bg-sky-50/90 dark:bg-slate-800/80 border border-sky-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    目標專案連線檢測報告：{effectiveProject.title}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
                  >
                    <LucideIcon name={statusMeta.icon} size={11} />
                    <span>{statusMeta.label}</span>
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                  <span>網址：{effectiveProject.url || '/demo-subproject.html'}</span>
                  <span>
                    延遲：{diagReport?.latencyMs ? `${diagReport.latencyMs}ms` : 'N/A'}
                  </span>
                  {diagReport?.checkedAt && (
                    <span>檢測時間：{diagReport.checkedAt}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={isProbingSingle}
                onClick={handleRunDiagnostic}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-sky-secondary text-xs font-semibold shrink-0"
              >
                <LucideIcon
                  name={isProbingSingle ? 'refresh-cw' : 'activity'}
                  size={13}
                  className={isProbingSingle ? 'animate-spin text-sky-500' : 'text-emerald-500'}
                />
                <span>{isProbingSingle ? '探測中...' : '重新檢測連線'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                只需將下方{' '}
                <code className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 font-mono">
                  /sdk/mei-dock.js
                </code>{' '}
                貼入子專案的 <code className="font-mono">&lt;body&gt;</code> 內，即可在子專案顯示「返回咩創意大廳」與「快速專案切換」導覽按鈕：
              </p>
              <div className="inline-flex items-center gap-1 bg-sky-50 dark:bg-slate-800 p-1 rounded-full border border-sky-400/25 text-xs">
                <button
                  type="button"
                  onClick={() => setDockPosition('bottom-right')}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                    dockPosition === 'bottom-right'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 dark:text-slate-300'
                  }`}
                >
                  右下角吸附
                </button>
                <button
                  type="button"
                  onClick={() => setDockPosition('bottom-left')}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                    dockPosition === 'bottom-left'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 dark:text-slate-300'
                  }`}
                >
                  左下角吸附
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-900 text-sky-300 font-mono text-xs overflow-x-auto border border-sky-400/30 leading-relaxed">
                <code>{snippet}</code>
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-3 right-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full btn-sky-primary text-xs font-semibold"
              >
                <LucideIcon name={copied ? 'check' : 'copy'} size={13} />
                <span>{copied ? '已複製' : '複製嵌入碼'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-slate-800/70 border border-sky-400/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <LucideIcon name="sparkles" size={18} className="text-sky-500 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  想直接查看實際效果？點擊右側按鈕開啟示範子專案預覽。
                </span>
              </div>
              <a
                href={effectiveProject.url?.startsWith('/demo-subproject.html') ? effectiveProject.url : '/demo-subproject.html'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full btn-sky-primary text-xs font-semibold shrink-0"
              >
                <span>開啟示範預覽</span>
                <LucideIcon name="arrow-up-right" size={14} />
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {canNativeInstall && (
              <div className="p-4 rounded-2xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-sky-900 dark:text-sky-100">
                  您的瀏覽器支援一鍵安裝「咩創意工作室」至桌面！
                </div>
                <button
                  type="button"
                  onClick={onTriggerNativeInstall}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-sky-primary text-xs font-semibold shrink-0"
                >
                  <LucideIcon name="download" size={14} />
                  <span>立即安裝至桌面</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-slate-800/70 border border-sky-400/25">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white mb-2">
                  <LucideIcon name="smartphone" size={16} className="text-sky-500" />
                  <span>iPhone / iPad</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  使用 Safari 開啟本站 → 點擊底部「分享」按鈕 → 選擇<strong>「加入主畫面」</strong>，即可全螢幕操作。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-slate-800/70 border border-sky-400/25">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white mb-2">
                  <LucideIcon name="smartphone" size={16} className="text-sky-500" />
                  <span>Android 手機與平板</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  使用 Chrome 開啟本站 → 點擊右上角選單 → 選擇<strong>「安裝應用程式」</strong>，即會產生專屬桌面圖示。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-slate-800/70 border border-sky-400/25 sm:col-span-2">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white mb-2">
                  <LucideIcon name="laptop" size={16} className="text-sky-500" />
                  <span>macOS 與 Windows 電腦端</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  於 Chrome、Edge 或 macOS Safari 網址列右側點擊<strong>「安裝 咩創意工作室」</strong>圖示（或「加入 Dock」），即可作為獨立桌面應用程式常駐系統。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
