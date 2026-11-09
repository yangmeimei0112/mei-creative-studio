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

      {/* 4. 中央發光雲朵與極光能量環核心 */}
      <div className="portal-center-core relative z-10 flex flex-col items-center text-center px-6">
        {/* 雙層反向旋轉極光能量環 */}
        <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 mb-6">
          <div
            aria-hidden="true"
            className="portal-aurora-ring-outer absolute inset-0 rounded-full"
          />
          <div
            aria-hidden="true"
            className="portal-aurora-ring-inner absolute inset-3 rounded-full"
          />
          <div
            aria-hidden="true"
            className="portal-aurora-glow absolute inset-6 rounded-full"
          />

          {/* 中心發光雲朵標誌 */}
          <StudioLogo
            size="xl"
            className="portal-core-emblem relative z-10 shadow-2xl backdrop-blur-xl"
          />
        </div>

        {/* 品牌識別與推進狀態提示 */}
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading-lg flex flex-wrap sm:flex-nowrap items-baseline justify-center gap-x-3">
            <span>{STUDIO_CONFIG.studioNameZh}</span>
            <span className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-sky-500 to-sky-700 dark:from-sky-300 dark:to-sky-500 bg-clip-text text-transparent font-en whitespace-nowrap">
              {STUDIO_CONFIG.studioNameEn}
            </span>
          </h2>

          <p className="text-sm sm:text-base font-bold text-sky-600 dark:text-sky-400 font-sans tracking-wider">
            {STUDIO_CONFIG.description}
          </p>

          {/* 流暢能量進度光條 */}
          <div className="pt-3 flex flex-col items-center gap-2">
            <div className="w-48 sm:w-56 h-1.5 rounded-full bg-sky-200/60 dark:bg-slate-800/80 overflow-hidden p-0.5 border border-sky-400/25">
              <div className="portal-progress-bar h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600" />
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {loadPhaseText}
            </span>
          </div>
        </div>
      </div>

      {/* 5. 右下角一鍵略過按鈕 (Click / ESC) */}
      <button
        type="button"
        data-testid="skip-entrance-btn"
        onClick={(e) => {
          e.stopPropagation();
          finishEntrance();
        }}
        className="fixed bottom-7 right-7 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/85 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-sky-400/35 shadow-lg backdrop-blur-xl text-xs font-semibold transition-all hover:scale-105"
      >
        <span>略過開場</span>
        <kbd className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 font-mono text-[10px]">
          ESC
        </kbd>
      </button>
    </div>
  );
}
