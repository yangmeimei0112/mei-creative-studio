import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LucideIcon, SquircleIconBadge, StudioLogo } from './LucideIcon';

export default function QRCodeModal({ project, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!project) return null;

  const resolvedUrl =
    project.url && project.url.startsWith('/') && typeof window !== 'undefined'
      ? `${window.location.origin}${project.url}`
      : project.url || 'https://mei-studio.example.com';

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resolvedUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `咩創意工作室 — ${project.title}`,
          text: project.description,
          url: resolvedUrl
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} 跨裝置 QR-code`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bento-glass-card bg-white/95 dark:bg-slate-900/95 p-6 sm:p-7 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題 */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <StudioLogo size="md" />
            <div>
              <span className="text-[11px] font-bold tracking-wider text-sky-600 dark:text-sky-400">
                咩創意工作室 · QR-code
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                手機 × 電腦跨裝置 QR-code
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉 QR-code 視窗"
            className="p-2 rounded-full btn-sky-secondary"
          >
            <LucideIcon name="x" size={16} />
          </button>
        </div>

        {/* QR Code 視覺卡片 */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-sky-50 to-sky-100/70 dark:from-slate-800/90 dark:to-slate-900 border border-sky-400/35 flex flex-col items-center text-center mb-5 shadow-inner">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border border-sky-400/30 text-xs font-semibold text-sky-700 dark:text-sky-300 mb-4">
            <LucideIcon name={project.icon || 'cloud'} size={14} />
            <span>{project.title}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white shadow-md border border-sky-400/30 mb-4 relative">
            <QRCodeSVG
              value={resolvedUrl}
              size={188}
              bgColor="#FFFFFF"
              fgColor="#0369A1"
              level="Q"
              includeMargin={false}
              imageSettings={{
                src: '/favicon.svg',
                height: 38,
                width: 38,
                excavate: true
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <LucideIcon name="scan-line" size={15} className="text-sky-500" />
            <span>使用手機相機掃描即可立即開啟</span>
          </div>
        </div>

        {/* 網址顯示與一鍵複製 / 原生分享 */}
        <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-slate-800/70 border border-sky-400/25 flex items-center justify-between gap-2 mb-4">
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
            {resolvedUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full btn-sky-primary text-xs font-semibold shrink-0"
          >
            <LucideIcon name={copied ? 'check' : 'copy'} size={13} />
            <span>{copied ? '已複製網址' : '複製專案網址'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full btn-sky-secondary text-xs font-semibold"
          >
            <LucideIcon name="share-2" size={15} />
            <span>分享連結</span>
          </button>
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full btn-sky-primary text-xs font-semibold"
          >
            <span>直接開啟</span>
            <LucideIcon name="arrow-up-right" size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
