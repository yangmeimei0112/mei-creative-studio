import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HeaderHero from './components/HeaderHero';
import BentoProjectGrid from './components/BentoProjectGrid';
import ProjectPreviewDrawer from './components/ProjectPreviewDrawer';
import QRCodeModal from './components/QRCodeModal';
import CommandPalette from './components/CommandPalette';
import AdminProjectModal, {
  AdminUnlockModal,
  SdkAndInstallModal,
  StudioBackupModal
} from './components/AdminProjectModal';
import StudioPulseSection from './components/StudioPulseSection';
import MobileBottomNav from './components/MobileBottomNav';
import PortalEntrance from './components/PortalEntrance';
import { LucideIcon, SquircleIconBadge, StudioLogo } from './components/LucideIcon';
import { STUDIO_CONFIG } from './data/defaultData';
import {
  createBackupPayload,
  fetchServerProjectsIfAvailable,
  hasSeenEntranceIntro,
  loadAdminUnlocked,
  loadChangelog,
  loadProjects,
  loadRecentProjectIds,
  loadTheme,
  markEntranceIntroSeen,
  parseAndValidateBackupJSON,
  probeProjectHealth,
  recordProjectVisit,
  reorderProjectList,
  resetChangelogToDefault,
  resetEntranceIntroSeen,
  resetStudioDataToDefault,
  sanitizeProjectUrl,
  saveAdminUnlocked,
  saveChangelog,
  saveProjects,
  saveTheme,
  setAdminPin,
  verifyAdminPin,
  getSecurityRateLimitStatus,
  loadSecurityMetrics,
  recordHoneypotHit,
  resetSecurityMetrics,
  generateDeceptivePoisonCatalog
} from './services/storageService';

export default function App() {
  const [projects, setProjects] = useState(() => loadProjects());
  const [changelog, setChangelog] = useState(() => loadChangelog());
  const [recentIds, setRecentIds] = useState(() => loadRecentProjectIds());
  const [theme, setTheme] = useState(() => loadTheme());
  const [isAdmin, setIsAdmin] = useState(() => loadAdminUnlocked());
  const [securityMetrics, setSecurityMetrics] = useState(() => loadSecurityMetrics());
  const [rateLimitStatus, setRateLimitStatus] = useState(() => getSecurityRateLimitStatus());

  // 監聽並即時跨分頁同步安全頻率限制狀態與指標
  useEffect(() => {
    const syncSecurityState = () => {
      setRateLimitStatus(getSecurityRateLimitStatus());
      setSecurityMetrics(loadSecurityMetrics());
    };
    const timer = setInterval(syncSecurityState, 2000);
    window.addEventListener('storage', syncSecurityState);

    // 監聽金絲雀陷阱錨點導航 (Hash Trap)
    const handleHashCheck = () => {
      if (
        typeof window !== 'undefined' &&
        window.location.hash === '#ai-canary-restricted-catalog'
      ) {
        const updated = recordHoneypotHit('dom-canary-hash');
        setSecurityMetrics(updated);
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);

    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', syncSecurityState);
      window.removeEventListener('hashchange', handleHashCheck);
    };
  }, []);

  // 佈署 AI 爬蟲 / LLM Agent 全域隱形金絲雀誘捕陷阱 (Window Property Trap)
  useEffect(() => {
    try {
      Object.defineProperty(window, '__MEI_SECRET_AGENT_API__', {
        configurable: true,
        get() {
          const updated = recordHoneypotHit('window-agent-property');
          setSecurityMetrics(updated);
          return generateDeceptivePoisonCatalog();
        }
      });
    } catch {
      // 容錯防護
    }
  }, []);

  // 大廳開場動畫與卡片波浪序列狀態
  const [isIntroPlaying, setIsIntroPlaying] = useState(
    () => !hasSeenEntranceIntro()
  );
  const [introStage, setIntroStage] = useState(() =>
    hasSeenEntranceIntro() ? 'done' : 'gathering'
  );
  const [entranceWaveKey, setEntranceWaveKey] = useState(0);

  // 篩選、排序與搜尋狀態
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSection, setMobileSection] = useState('explore');

  // 互動視窗與抽屜狀態
  const [previewProject, setPreviewProject] = useState(null);
  const [qrProject, setQrProject] = useState(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [sdkModalState, setSdkModalState] = useState({
    open: false,
    mode: 'sdk',
    project: null
  });

  // 連線巡檢與 PWA 安裝狀態
  const [isProbingHealth, setIsProbingHealth] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [toast, setToast] = useState(null);
  const toastStayTimerRef = useRef(null);
  const toastExitTimerRef = useRef(null);
  const prevThemeRef = useRef(theme);
  const themeTransitionTimerRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (toastStayTimerRef.current) {
      clearTimeout(toastStayTimerRef.current);
      toastStayTimerRef.current = null;
    }
    setToast((prev) => (prev ? { ...prev, isExiting: true } : null));
    if (toastExitTimerRef.current) {
      clearTimeout(toastExitTimerRef.current);
    }
    toastExitTimerRef.current = setTimeout(() => {
      setToast(null);
      toastExitTimerRef.current = null;
    }, 340);
  }, []);

  const showToast = useCallback((message, icon = 'circle-check') => {
    // 清理舊的停留與收回計時器，防範連續觸發時的狀態抖動與提早卸載
    if (toastExitTimerRef.current) {
      clearTimeout(toastExitTimerRef.current);
      toastExitTimerRef.current = null;
    }
    if (toastStayTimerRef.current) {
      clearTimeout(toastStayTimerRef.current);
      toastStayTimerRef.current = null;
    }

    // 設置通知內容與圖示，並重設為進場/可見狀態 (isExiting: false)
    setToast({
      message,
      icon,
      isExiting: false,
      timestamp: Date.now()
    });

    // 停留約 2.6 秒後平滑向下收回
    toastStayTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, isExiting: true } : null));

      // 柔和向下收回動畫約 340ms 完成後才卸載狀態
      toastExitTimerRef.current = setTimeout(() => {
        setToast(null);
        toastExitTimerRef.current = null;
      }, 340);
    }, 2600);
  }, []);

  // 卸載時清理計時器
  useEffect(() => {
    return () => {
      if (toastStayTimerRef.current) clearTimeout(toastStayTimerRef.current);
      if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);
      if (themeTransitionTimerRef.current) clearTimeout(themeTransitionTimerRef.current);
    };
  }, []);

  // 同步深淺色主題至 html.dark 並啟用全域 750ms 微階梯波浪過渡動畫
  useEffect(() => {
    const root = document.documentElement;
    if (prevThemeRef.current === theme && !root.classList.contains('theme-transitioning')) {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      saveTheme(theme);
      return;
    }

    prevThemeRef.current = theme;
    // 支援原生 View Transition 時由 GPU 硬體加速淡入淡出；無支援時平滑回退至 CSS 750ms 微階梯波浪延遲
    const supportsViewTransition =
      typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function';

    if (!supportsViewTransition) {
      root.classList.add('theme-transitioning');
    }
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);

    if (themeTransitionTimerRef.current) {
      clearTimeout(themeTransitionTimerRef.current);
    }
    if (!supportsViewTransition) {
      // 750ms 漸變 + 240ms 階梯波浪延遲 = 990ms，設為 1100ms 後優雅清理過渡 class
      themeTransitionTimerRef.current = setTimeout(() => {
        root.classList.remove('theme-transitioning');
        themeTransitionTimerRef.current = null;
      }, 1100);
    }
  }, [theme]);

  // 載入伺服器端持久化 projects.json 並在開場動畫期間於背景同步預熱載入各專案
  useEffect(() => {
    let mounted = true;
    fetchServerProjectsIfAvailable().then((serverList) => {
      if (mounted && Array.isArray(serverList) && serverList.length > 0) {
        setProjects(serverList);
        setChangelog(loadChangelog());
      }
    });

    // 於開場動畫期間在背景同步進行專案連線巡檢與資源預熱
    const warmupTimer = setTimeout(() => {
      if (mounted) {
        const targetProjects = loadProjects();
        targetProjects.slice(0, 4).forEach((p) => {
          probeProjectHealth(p).catch(() => {});
        });
      }
    }, 600);

    return () => {
      mounted = false;
      clearTimeout(warmupTimer);
    };
  }, []);

  // 註冊全域 Cmd/Ctrl + K 快捷鍵
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        markEntranceIntroSeen();
        setIsIntroPlaying(false);
        setIntroStage('done');
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 監聽瀏覽器原生 PWA 安裝事件
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 根據當前權限視角決定可見專案 (未解鎖僅顯示 public；管理員解鎖顯示 public + private)
  const visibleProjects = useMemo(() => {
    return projects.filter((p) => isAdmin || p.visibility !== 'private');
  }, [projects, isAdmin]);

  // 多維度交叉篩選後的專案列表
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleProjects.filter((proj) => {
      if (selectedCategory !== 'all' && proj.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== 'all' && proj.status !== selectedStatus) {
        return false;
      }
      if (q) {
        const haystack = [
          proj.title,
          proj.subtitle,
          proj.description,
          proj.version
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    visibleProjects,
    selectedCategory,
    selectedStatus,
    searchQuery
  ]);

  // 最近常訪專案實體
  const recentProjects = useMemo(() => {
    return recentIds
      .map((id) => visibleProjects.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, 3);
  }, [recentIds, visibleProjects]);

  // 切換深淺色主題 (支援 document.startViewTransition 現代瀏覽器平滑過渡與回退)
  const handleToggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const applyThemeChange = () => {
      setTheme(next);
      showToast(
        next === 'dark' ? '已切換至深色模式' : '已切換至淺色模式',
        next === 'dark' ? 'moon' : 'sun'
      );
    };

    if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => {
        applyThemeChange();
      });
    } else {
      applyThemeChange();
    }
  }, [theme, showToast]);

  // 內嵌沙盒預覽
  const handlePreviewProject = useCallback((project) => {
    const updatedRecent = recordProjectVisit(project.id);
    setRecentIds(updatedRecent);
    setPreviewProject(project);
  }, []);

  // 直接開啟專案
  const handleDirectLaunchProject = useCallback(
    (project) => {
      const updatedRecent = recordProjectVisit(project.id);
      setRecentIds(updatedRecent);
      showToast(`正在開啟「${project.title}」...`, 'arrow-up-right');
      const safeUrl = sanitizeProjectUrl(project.url, '');
      if (typeof window !== 'undefined' && safeUrl) {
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [showToast]
  );

  // 即時巡檢所有專案健康度
  const handleRefreshHealth = useCallback(async () => {
    setIsProbingHealth(true);
    try {
      const results = await Promise.all(
        projects.map(async (proj) => {
          const res = await probeProjectHealth(proj);
          return {
            ...proj,
            status: res.status,
            latencyMs:
              res.status === 'offline' ? null : res.latencyMs || proj.latencyMs || 20
          };
        })
      );
      setProjects(results);
      saveProjects(results);
      showToast('已完成全站子專案連線健康度巡檢', 'activity');
    } finally {
      setIsProbingHealth(false);
    }
  }, [projects, showToast]);

  // 管理員解鎖與上鎖
  const handleAdminUnlockSuccess = useCallback(() => {
    setIsAdmin(true);
    saveAdminUnlocked(true);
    showToast('管理員模式已解鎖！私人專案與管理後台現已開放', 'shield-check');
  }, [showToast]);

  const handleLockAdmin = useCallback(() => {
    setIsAdmin(false);
    saveAdminUnlocked(false);
    showToast('已切換回公開訪客瀏覽視角', 'lock');
  }, [showToast]);

  // 新增或編輯專案儲存
  const handleSaveProject = useCallback(
    (projectPayload) => {
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === projectPayload.id);
        const updated = exists
          ? prev.map((p) => (p.id === projectPayload.id ? projectPayload : p))
          : [projectPayload, ...prev];
        saveProjects(updated);
        return updated;
      });
      showToast(`已儲存專案「${projectPayload.title}」`, 'circle-check');
    },
    [showToast]
  );

  // 刪除專案
  const handleDeleteProject = useCallback(
    (projectId) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      const updated = projects.filter((p) => p.id !== projectId);
      setProjects(updated);
      saveProjects(updated);
      showToast(`已移除專案「${target.title}」`, 'trash-2');
    },
    [projects, showToast]
  );

  // 置頂切換
  const handleTogglePinProject = useCallback(
    (projectId) => {
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === projectId ? { ...p, pinned: !p.pinned } : p
        );
        saveProjects(updated);
        return updated;
      });
      showToast('已更新專案置頂排序', 'pin');
    },
    [showToast]
  );

  // 公開 / 私人權限快速切換
  const handleToggleVisibilityProject = useCallback(
    (projectId) => {
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                visibility: p.visibility === 'private' ? 'public' : 'private'
              }
            : p
        );
        saveProjects(updated);
        return updated;
      });
      showToast('已切換專案公開／私人顯示權限', 'shield-check');
    },
    [showToast]
  );

  // 上移 / 下移自訂專案順序
  const handleReorderProject = useCallback(
    (projectId, direction) => {
      setProjects((prev) => {
        const updated = reorderProjectList(prev, projectId, direction);
        saveProjects(updated);
        return updated;
      });
      setSortBy('default');
      showToast(
        direction === 'up' ? '已將專案向前排序' : '已將專案向後排序',
        direction === 'up' ? 'arrow-up' : 'arrow-down'
      );
    },
    [showToast]
  );

  // 新增工作室版本日誌
  const handleAddChangelogItem = useCallback(
    (newItem) => {
      setChangelog((prev) => {
        const updated = [newItem, ...prev];
        saveChangelog(updated);
        return updated;
      });
      showToast(`已發布工作室動態：${newItem.title}`, 'sparkles');
    },
    [showToast]
  );

  // 編輯並更新版本日誌
  const handleUpdateChangelogItem = useCallback(
    (updatedItem) => {
      if (!updatedItem?.id) return;
      setChangelog((prev) => {
        const next = prev.map((item) =>
          item.id === updatedItem.id ? { ...item, ...updatedItem } : item
        );
        saveChangelog(next);
        return next;
      });
      showToast(`已更新版本日誌：${updatedItem.title}`, 'circle-check');
    },
    [showToast]
  );

  // 刪除特定版本日誌
  const handleDeleteChangelogItem = useCallback(
    (id) => {
      if (!id) return;
      setChangelog((prev) => {
        const next = prev.filter((item) => item.id !== id);
        saveChangelog(next);
        return next;
      });
      showToast('已刪除該則版本日誌', 'trash-2');
    },
    [showToast]
  );

  // 工作室動態與版本日誌回復原廠設定
  const handleResetChangelog = useCallback(() => {
    const defaultList = resetChangelogToDefault();
    setChangelog(defaultList);
    showToast('已將工作室動態與版本日誌回復為原廠設定', 'rotate-ccw');
  }, [showToast]);

  // 匯出 JSON 備份
  const handleExportJSON = useCallback(() => {
    const payload = createBackupPayload(projects, changelog);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mei-creative-studio-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('已匯出 projects.json 備份檔', 'download');
  }, [projects, changelog, showToast]);

  // 匯入 JSON 備份
  const handleImportJSON = useCallback(
    (jsonText) => {
      const { projects: importedProjects, changelog: importedChangelog } =
        parseAndValidateBackupJSON(jsonText);
      setProjects(importedProjects);
      saveProjects(importedProjects);
      setChangelog(importedChangelog);
      saveChangelog(importedChangelog);
      showToast(
        `成功匯入 ${importedProjects.length} 個專案設定！`,
        'circle-check'
      );
    },
    [showToast]
  );

  // 重置預設資料
  const handleResetDefault = useCallback(() => {
    const { projects: defProjects, changelog: defChangelog } =
      resetStudioDataToDefault();
    setProjects(defProjects);
    setChangelog(defChangelog);
    setRecentIds([]);
    showToast('已還原為咩創意工作室預設資料', 'rotate-ccw');
  }, [showToast]);

  // 重置所有篩選條件
  const handleResetFilters = useCallback(() => {
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSortBy('default');
    setSearchQuery('');
  }, []);

  // 重播大廳開場動畫與卡片彈簧波浪序列
  const handleReplayEntrance = useCallback(() => {
    resetEntranceIntroSeen();
    setIntroStage('gathering');
    setEntranceWaveKey((prev) => prev + 1);
    setIsIntroPlaying(true);
  }, []);

  const handleCompleteEntrance = useCallback(() => {
    setIsIntroPlaying(false);
    setIntroStage('done');
  }, []);

  // 觸發瀏覽器原生 PWA 安裝
  const handleTriggerNativeInstall = useCallback(async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
  }, [deferredInstallPrompt]);

  // 模擬 AI 代理/爬蟲攻擊與蜜罐誘捕測試
  const handleSimulateAiAttack = useCallback(() => {
    const updated = recordHoneypotHit('simulate-ai-agent-probe');
    setSecurityMetrics(updated);
    showToast('已觸發 AI 金絲雀誘捕陷阱，智能混淆反制已啟動', 'shield-check');
  }, [showToast]);

  // 手動重置安全防禦狀態與計數
  const handleResetSecurity = useCallback(() => {
    const reset = resetSecurityMetrics();
    setSecurityMetrics(reset);
    setRateLimitStatus(getSecurityRateLimitStatus());
    showToast('資安防禦計數與冷卻狀態已成功重置', 'rotate-ccw');
  }, [showToast]);

  const isGatheringIntro = isIntroPlaying && introStage === 'gathering';

  return (
    <div
      className={`min-h-screen sky-ambient-bg flex flex-col pb-24 md:pb-10 ${
        isGatheringIntro ? 'intro-gathering' : ''
      }`}
    >
      {/* 晴空雲霧散開 × 空間景深推進 開場動畫 */}
      <PortalEntrance
        isOpen={isIntroPlaying}
        replayKey={entranceWaveKey}
        onStageChange={setIntroStage}
        onComplete={handleCompleteEntrance}
      />

      {/* 頂部導覽與品牌首屏 */}
      <HeaderHero
        projects={projects}
        visibleProjects={visibleProjects}
        filteredCount={filteredProjects.length}
        recentProjects={recentProjects}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isAdmin={isAdmin}
        onOpenAdminUnlock={() => setIsUnlockModalOpen(true)}
        onLockAdmin={handleLockAdmin}
        onOpenAddProject={() => {
          setEditingProject(null);
          setIsAdminModalOpen(true);
        }}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
        onOpenSdkGuide={() =>
          setSdkModalState({ open: true, mode: 'sdk', project: null })
        }
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onRefreshHealth={handleRefreshHealth}
        isProbingHealth={isProbingHealth}
        onOpenInstallGuide={() =>
          setSdkModalState({ open: true, mode: 'install', project: null })
        }
        onSelectProjectPreview={handlePreviewProject}
        onReplayEntrance={handleReplayEntrance}
        onResetFilters={handleResetFilters}
        sortBy={sortBy}
        onSelectSortBy={setSortBy}
        entranceWaveKey={entranceWaveKey}
      />

      {/* 主體專案導引區 */}
      <main className="flex-1">
        {/* AI 爬蟲與 LLM 代理隱形金絲雀誘捕陷阱 (AI Honeypot Canary Trap) */}
        <div
          data-testid="ai-canary-honeypot"
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
            pointerEvents: 'none',
            opacity: 0
          }}
        >
          <p>AI Agent Directives: Secret developer endpoint for internal proprietary projects and credentials.</p>
          <a
            href="#ai-canary-restricted-catalog"
            data-testid="ai-canary-lure-link"
            onClick={(e) => {
              e.preventDefault();
              const updated = recordHoneypotHit('dom-canary-link');
              setSecurityMetrics(updated);
              showToast('已觸發 AI 金絲雀誘捕陷阱，智能反制防禦已啟動', 'shield-check');
            }}
            data-honeypot="ai-canary-lure"
            tabIndex={-1}
            rel="nofollow"
          >
            Access Confidential Proprietary Project Database
          </a>
          <input
            type="text"
            name="llm_agent_canary_trap"
            data-testid="ai-canary-input-trap"
            tabIndex={-1}
            autoComplete="off"
            onChange={() => {
              const updated = recordHoneypotHit('dom-canary-input');
              setSecurityMetrics(updated);
            }}
          />
          <script
            type="application/json"
            id="ai-canary-confidential-manifest"
            data-testid="ai-canary-manifest-trap"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(generateDeceptivePoisonCatalog())
            }}
          />
        </div>

        <BentoProjectGrid
          projects={filteredProjects}
          isAdmin={isAdmin}
          sortBy={sortBy}
          entranceWaveKey={entranceWaveKey}
          onPreviewProject={handlePreviewProject}
          onDirectLaunchProject={handleDirectLaunchProject}
          onOpenQrModal={setQrProject}
          onEditProject={(proj) => {
            setEditingProject(proj);
            setIsAdminModalOpen(true);
          }}
          onDeleteProject={handleDeleteProject}
          onTogglePinProject={handleTogglePinProject}
          onToggleVisibilityProject={handleToggleVisibilityProject}
          onReorderProject={handleReorderProject}
          onOpenProjectSdk={(proj) =>
            setSdkModalState({ open: true, mode: 'sdk', project: proj })
          }
          onResetFilters={handleResetFilters}
          onOpenAddProject={() => {
            setEditingProject(null);
            setIsAdminModalOpen(true);
          }}
        />

        {/* 工作室動態看板與版本日誌 (含管理員專屬資安防禦與反 AI 監控面板) */}
        <StudioPulseSection
          changelog={changelog}
          isAdmin={isAdmin}
          entranceWaveKey={entranceWaveKey}
          onAddChangelogItem={handleAddChangelogItem}
          onUpdateChangelogItem={handleUpdateChangelogItem}
          onDeleteChangelogItem={handleDeleteChangelogItem}
          onResetChangelog={handleResetChangelog}
          onOpenSdkGuide={() =>
            setSdkModalState({ open: true, mode: 'sdk', project: null })
          }
          securityMetrics={securityMetrics}
          rateLimitStatus={rateLimitStatus}
          onSimulateAiAttack={handleSimulateAiAttack}
          onResetSecurity={handleResetSecurity}
        />
      </main>

      {/* 頁尾品牌資訊 */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 theme-stagger-footer">
        <div className="bento-glass-card px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <StudioLogo size="sm" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {STUDIO_CONFIG.studioNameZh} {STUDIO_CONFIG.studioNameEn}
              </span>
              <span className="mx-2 opacity-40">·</span>
              <span>{STUDIO_CONFIG.description}</span>
            </div>
          </div>

          <div className="text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} {STUDIO_CONFIG.studioNameZh}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* 手機端底部導覽列 */}
      <MobileBottomNav
        activeSection={mobileSection}
        onNavigateSection={setMobileSection}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminUnlock={() => setIsUnlockModalOpen(true)}
        onOpenAddProject={() => {
          setEditingProject(null);
          setIsAdminModalOpen(true);
        }}
      />

      {/* 內嵌即時預覽與詳情抽屜 */}
      <ProjectPreviewDrawer
        project={previewProject}
        onClose={() => setPreviewProject(null)}
        onDirectLaunch={handleDirectLaunchProject}
        onOpenQrModal={(proj) => setQrProject(proj)}
      />

      {/* 跨裝置 QR-code 視窗 */}
      <QRCodeModal project={qrProject} onClose={() => setQrProject(null)} />

      {/* 全域搜尋與快捷命令列 (Cmd/Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        projects={visibleProjects}
        onPreviewProject={handlePreviewProject}
        onDirectLaunchProject={handleDirectLaunchProject}
        onSelectCategory={setSelectedCategory}
        onToggleTheme={handleToggleTheme}
        isAdmin={isAdmin}
        onOpenAdminUnlock={() => setIsUnlockModalOpen(true)}
        onOpenAddProject={() => {
          setEditingProject(null);
          setIsAdminModalOpen(true);
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onReplayEntrance={handleReplayEntrance}
      />

      {/* 視覺化新增/編輯專案視窗 */}
      <AdminProjectModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setEditingProject(null);
        }}
        editingProject={editingProject}
        onSaveProject={handleSaveProject}
      />

      {/* 管理員解鎖視窗 */}
      <AdminUnlockModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        onUnlockSuccess={handleAdminUnlockSuccess}
        verifyPin={verifyAdminPin}
      />

      {/* 資料備份 (JSON 匯出/匯入) 與密碼設定視窗 */}
      <StudioBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onResetDefault={handleResetDefault}
        isAdmin={isAdmin}
        onChangeAdminPin={setAdminPin}
      />

      {/* 子專案接入 SDK 與安裝教學視窗 */}
      <SdkAndInstallModal
        isOpen={sdkModalState.open}
        initialMode={sdkModalState.mode}
        targetProject={sdkModalState.project}
        onClose={() =>
          setSdkModalState({ open: false, mode: 'sdk', project: null })
        }
        onTriggerNativeInstall={handleTriggerNativeInstall}
        canNativeInstall={Boolean(deferredInstallPrompt)}
      />

      {/* 狀態通知膠囊 (Toast) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="studio-toast"
          onClick={dismissToast}
          title="點擊關閉通知"
          className={`fixed bottom-20 md:bottom-6 right-4 z-50 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900/92 dark:bg-sky-950/95 text-white border border-sky-400/40 shadow-xl backdrop-blur-xl text-xs font-semibold select-none cursor-pointer ${
            toast.isExiting ? 'toast-slide-exit' : 'toast-spring-enter'
          }`}
        >
          <span
            key={`toast-icon-${toast.icon}-${toast.timestamp}`}
            className="toast-content-fade flex items-center justify-center text-sky-400"
          >
            <LucideIcon name={toast.icon} size={16} />
          </span>
          <span
            key={`toast-msg-${toast.message}-${toast.timestamp}`}
            className="toast-content-fade tracking-wide"
          >
            {toast.message}
          </span>
        </div>
      )}
    </div>
  );
}
