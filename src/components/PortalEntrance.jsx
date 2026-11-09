import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LucideIcon, StudioLogo } from './LucideIcon';
import { STUDIO_CONFIG } from '../data/defaultData';
import { markEntranceIntroSeen } from '../services/storageService';

/**
 * 咩創意工作室 — 晴空雲霧散開 × 空間景深推進 開場動畫元件
 * - 同分頁首次進入自動演出完整雲霧散開與鏡頭推進動畫
 * - 支援點擊畫面任意處、點擊略過按鈕或按 Esc 鍵立即略過
 */
export default function PortalEntrance({
  isOpen,
  replayKey = 0,
  onStageChange,
  onComplete
}) {
  const [stage, setStage] = useState('gathering'); // 'gathering' | 'parting'
  const [loadPhaseText, setLoadPhaseText] = useState('正在載入咩創意工作空間與專案資料...');
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onStageChangeRef = useRef(onStageChange);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onStageChangeRef.current = onStageChange;
  }, [onComplete, onStageChange]);

  const finishEntrance = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markEntranceIntroSeen();
    if (onStageChangeRef.current) {
      onStageChangeRef.current('done');
    }
    if (onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      finishedRef.current = false;
      setStage('gathering');
      return undefined;
    }

    finishedRef.current = false;
    setStage('gathering');
    setLoadPhaseText('正在背景載入咩創意工作空間與各項專案...');
    if (onStageChangeRef.current) {
      onStageChangeRef.current('gathering');
    }

    const previousOverflow =
      typeof document !== 'undefined' ? document.body.style.overflow : '';
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    // 5秒開場動畫：第 1.8 秒與 3.6 秒背景載入進度提示切換
    const phase2Timer = setTimeout(() => {
      setLoadPhaseText('同步子專案連線狀態與背景資源...');
    }, 1800);

    const phase3Timer = setTimeout(() => {
      setLoadPhaseText('大廳內容載入完成，正在為您揭幕！');
    }, 3600);

    // 第 3.8 秒進入雲霧散開 (parting) 階段
    const partTimer = setTimeout(() => {
      setStage('parting');
      if (onStageChangeRef.current) {
        onStageChangeRef.current('parting');
      }
    }, 3800);

    // 第 5.0 秒完成揭幕並自動關閉開場動畫
    const doneTimer = setTimeout(() => {
      finishEntrance();
    }, 5000);

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
      clearTimeout(partTimer);
      clearTimeout(doneTimer);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isOpen, replayKey, finishEntrance]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        finishEntrance();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, finishEntrance]);

  if (!isOpen) return null;

  const isParting = stage === 'parting';

  return (
    <div
      role="region"
      aria-label="大廳開場視覺動畫"
      data-testid="portal-entrance-overlay"
      data-stage={stage}
      data-replay-key={replayKey}
      onClick={finishEntrance}
      className={`portal-entrance-overlay fixed inset-0 z-[60] flex items-center justify-center overflow-hidden select-none cursor-pointer ${
        isParting ? 'portal-stage-parting' : 'portal-stage-gathering'
      }`}
    >
      {/* 1. 深邃空間天幕與極光景深底層 */}
      <div
        aria-hidden="true"
        className="portal-sky-backdrop absolute inset-0"
      />

      {/* 2. 3D 空間透視格線與景深推進光環 */}
      <div
        aria-hidden="true"
        className="portal-depth-grid absolute inset-0 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="portal-depth-tunnel absolute rounded-full pointer-events-none"
      />

      {/* 3. 四向立體雲霧層 (隨 stage=parting 向四周散開並推進鏡頭) */}
      <div
        aria-hidden="true"
        className="portal-clouds-stage absolute inset-0 pointer-events-none"
      >
        {/* 左上立體雲層 */}
        <div className="portal-cloud-cluster portal-cloud-nw">
          <div className="portal-cloud-puff portal-cloud-puff-lg" />
          <div className="portal-cloud-puff portal-cloud-puff-md" />
          <div className="portal-cloud-puff portal-cloud-puff-sm" />
        </div>

        {/* 右上立體雲層 */}
        <div className="portal-cloud-cluster portal-cloud-ne">
          <div className="portal-cloud-puff portal-cloud-puff-lg" />
          <div className="portal-cloud-puff portal-cloud-puff-md" />
          <div className="portal-cloud-puff portal-cloud-puff-sm" />
        </div>

        {/* 左下立體雲層 */}
        <div className="portal-cloud-cluster portal-cloud-sw">
          <div className="portal-cloud-puff portal-cloud-puff-xl" />
          <div className="portal-cloud-puff portal-cloud-puff-md" />
          <div className="portal-cloud-puff portal-cloud-puff-sm" />
        </div>

        {/* 右下立體雲層 */}
        <div className="portal-cloud-cluster portal-cloud-se">
          <div className="portal-cloud-puff portal-cloud-puff-xl" />
          <div className="portal-cloud-puff portal-cloud-puff-md" />
          <div className="portal-cloud-puff portal-cloud-puff-sm" />
        </div>
      </div>

      {/* 4. 中央毛玻璃浮島卡片自適應佈局 (Glassmorphic Adaptive Island Card) */}
      <div className="portal-center-core relative z-10 flex flex-col items-center text-center w-[92%] max-w-lg mx-auto p-6 sm:p-9 rounded-3xl bg-white/75 dark:bg-slate-900/80 backdrop-blur-2xl border border-sky-300/40 dark:border-sky-500/25 shadow-2xl ring-1 ring-white/60 dark:ring-white/10 transition-all duration-300">
        {/* 雙層反向旋轉極光能量環 */}
        <div className="relative flex items-center justify-center w-32 h-32 sm:w-44 sm:h-44 mb-5 sm:mb-6">
          <div
            aria-hidden="true"
            className="portal-aurora-ring-outer absolute inset-0 rounded-full"
          />
          <div
            aria-hidden="true"
            className="portal-aurora-ring-inner absolute inset-2.5 sm:inset-3 rounded-full"
          />
          <div
            aria-hidden="true"
            className="portal-aurora-glow absolute inset-5 sm:inset-6 rounded-full"
          />

          {/* 中心發光雲朵與無限標誌 */}
          <StudioLogo
            size="xl"
            className="portal-core-emblem relative z-10 shadow-2xl backdrop-blur-xl"
          />
        </div>

        {/* 智慧響應排版：行動直向雙行置中對齊、平板寬螢幕大氣水平並行 */}
        <div className="space-y-2.5 sm:space-y-3 w-full max-w-md">
          <h2 className="tracking-tight text-slate-900 dark:text-white font-heading-lg flex flex-col sm:flex-row items-center justify-center gap-y-1.5 sm:gap-x-3">
            <span className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {STUDIO_CONFIG.studioNameZh}
            </span>
            <span className="text-xs sm:text-2xl font-bold tracking-widest sm:tracking-normal text-sky-600 dark:text-sky-400 sm:bg-gradient-to-r sm:from-sky-500 sm:to-sky-700 sm:dark:from-sky-300 sm:dark:to-sky-500 sm:bg-clip-text sm:text-transparent font-en uppercase sm:normal-case whitespace-nowrap">
              {STUDIO_CONFIG.studioNameEn}
            </span>
          </h2>

          <p className="text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 font-sans tracking-widest sm:tracking-wider">
            {STUDIO_CONFIG.description}
          </p>

          {/* 流暢能量進度光條 */}
          <div className="pt-2 sm:pt-3 flex flex-col items-center gap-2">
            <div className="w-48 sm:w-60 h-2 rounded-full bg-sky-100 dark:bg-slate-800/90 overflow-hidden p-0.5 border border-sky-400/30 shadow-inner">
              <div className="portal-progress-bar h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              {loadPhaseText}
            </span>
          </div>
        </div>
      </div>

      {/* 5. 右下角一鍵略過按鈕 (支援手機虛擬導航與瀏海 Safe Area) */}
      <button
        type="button"
        data-testid="skip-entrance-btn"
        onClick={(e) => {
          e.stopPropagation();
          finishEntrance();
        }}
        className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-20 pb-[max(0px,env(safe-area-inset-bottom))] pr-[max(0px,env(safe-area-inset-right))] inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-sky-400/35 shadow-xl backdrop-blur-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95"
      >
        <span>略過開場</span>
        <kbd className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 font-mono text-[10px]">
          ESC
        </kbd>
      </button>
    </div>
  );
}
