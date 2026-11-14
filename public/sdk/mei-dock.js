/**
 * 咩創意工作室 Mei Creative Studio — 跨專案懸浮返回導覽工具列 (mei-dock.js)
 *
 * 用途：讓子專案嵌入 <script src="/sdk/mei-dock.js"></script> 後，
 * 在畫面角落呈現導覽膠囊，支援：
 * 1. 一鍵返回咩創意工作室大廳
 * 2. 展開快速專案切換清單
 * 3. 支援滑鼠與觸控自由拖曳、視窗邊界自動夾制與折疊收合
 */
(function initMeiStudioDock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__MEI_STUDIO_DOCK_MOUNTED__) return;
  window.__MEI_STUDIO_DOCK_MOUNTED__ = true;

  function escapeHtml(raw) {
    return String(raw ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeUrl(rawUrl, fallback = '/') {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return fallback;
    if (/^(javascript|data|vbscript):/i.test(trimmed)) {
      return fallback;
    }
    return trimmed;
  }

  const currentScript =
    document.currentScript || document.querySelector('script[src*="mei-dock.js"]');
  const hubUrl = sanitizeUrl(
    currentScript && currentScript.getAttribute('data-hub-url'),
    '/'
  );
  const projectName =
    (currentScript && currentScript.getAttribute('data-project-name')) ||
    document.title ||
    'Connected Project';
  const positionAttr =
    (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';

  const DEFAULT_QUICK_PROJECTS = [
    {
      title: '咩創意雲端靈感白板',
      category: '互動設計與多媒體',
      url: '/demo-subproject.html?scene=cloud-canvas'
    },
    {
      title: '咩智慧靈感自動化引擎',
      category: 'AI 與自動化工具',
      url: '/demo-subproject.html?scene=ai-copilot'
    },
    {
      title: '雲絨極簡品牌電商系統',
      category: '網站與商業應用',
      url: '/demo-subproject.html?scene=commerce-portal'
    },
    {
      title: '雲朵粒子互動聲音劇場',
      category: '互動設計與多媒體',
      url: '/demo-subproject.html?scene=motion-lab'
    },
    {
      title: '咩創意設計規範與組件庫',
      category: '網站與商業應用',
      url: '/demo-subproject.html?scene=design-system'
    }
  ];

  function getQuickProjects() {
    try {
      const raw = window.localStorage && window.localStorage.getItem('mei_studio_projects_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((p) => p && p.visibility !== 'private' && p.title && p.url)
            .slice(0, 6);
        }
      }
    } catch {
      // Ignore cross-origin or storage access restrictions
    }
    return DEFAULT_QUICK_PROJECTS;
  }

  // Pure Lucide SVG Icons (24x24 grid, stroke-width="1.75", round caps/joins)
  const LUCIDE_SVGS = {
    cloud:
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="M12 14.5c-1.2-1.2-2.4-1.8-3.6-1.8a1.8 1.8 0 1 0 0 3.6c1.2 0 2.4-.6 3.6-1.8Zm0 0c1.2 1.2 2.4 1.8 3.6 1.8a1.8 1.8 0 0 0 0-3.6c-1.2 0-2.4.6-3.6 1.8Z"/></svg>',
    arrowLeft:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
    layoutGrid:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    arrowUpRight:
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
    minimize:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>'
  };

  const style = document.createElement('style');
  style.textContent = `
    #mei-studio-dock-root {
      position: fixed;
      z-index: 2147483640;
      font-family: "Plus Jakarta Sans", "Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
    }
    #mei-studio-dock-root.pos-bottom-right {
      right: 20px;
      bottom: max(20px, env(safe-area-inset-bottom, 20px));
    }
    #mei-studio-dock-root.pos-bottom-left {
      left: 20px;
      bottom: max(20px, env(safe-area-inset-bottom, 20px));
    }
    .mei-dock-capsule {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px 8px 10px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.90);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(56, 189, 248, 0.38);
      box-shadow: 0 12px 32px -6px rgba(14, 165, 233, 0.24), 0 2px 6px rgba(15, 23, 42, 0.06);
      color: #0F172A;
      font-size: 13px;
      font-weight: 600;
      cursor: grab;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .mei-dock-capsule:hover {
      border-color: rgba(56, 189, 248, 0.72);
      box-shadow: 0 14px 36px -6px rgba(14, 165, 233, 0.34);
    }
    .mei-dock-badge {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(14, 165, 233, 0.08));
      border: 1px solid rgba(56, 189, 248, 0.36);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.7), 0 2px 6px -1px rgba(14, 165, 233, 0.15);
      color: #0284C7;
      flex-shrink: 0;
      position: relative;
    }
    .mei-dock-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 11px;
      border-radius: 9999px;
      background: linear-gradient(135deg, #38BDF8, #0284C7);
      color: #FFFFFF;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .mei-dock-btn:hover {
      opacity: 0.94;
      transform: scale(1.02);
    }
    .mei-dock-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 9999px;
      border: 1px solid rgba(56, 189, 248, 0.3);
      background: rgba(240, 249, 255, 0.9);
      color: #0284C7;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .mei-dock-icon-btn:hover {
      background: #E0F2FE;
    }
    .mei-dock-collapse-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      border: none;
      background: rgba(56, 189, 248, 0.12);
      color: #0369A1;
      cursor: pointer;
    }
    .mei-dock-collapsed .mei-dock-details,
    .mei-dock-collapsed .mei-dock-popover {
      display: none !important;
    }
    .mei-dock-collapsed .mei-dock-collapse-btn svg {
      transform: rotate(180deg);
    }
    .mei-dock-popover {
      position: absolute;
      bottom: calc(100% + 10px);
      right: 0;
      width: 260px;
      padding: 12px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(56, 189, 248, 0.38);
      box-shadow: 0 18px 40px -10px rgba(14, 165, 233, 0.28);
      display: none;
      flex-direction: column;
      gap: 6px;
    }
    #mei-studio-dock-root.pos-bottom-left .mei-dock-popover {
      right: auto;
      left: 0;
    }
    .mei-dock-popover.open {
      display: flex;
    }
    .mei-dock-popover-title {
      font-size: 11px;
      font-weight: 700;
      color: #0284C7;
      padding: 2px 6px 4px;
      border-bottom: 1px solid rgba(56, 189, 248, 0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mei-dock-popover-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 9px;
      border-radius: 12px;
      text-decoration: none;
      color: #0F172A;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.15s ease;
    }
    .mei-dock-popover-item:hover {
      background: #E0F2FE;
      color: #0284C7;
    }
    @media (max-width: 480px) {
      #mei-studio-dock-root.pos-bottom-right {
        right: 12px;
        bottom: max(14px, env(safe-area-inset-bottom, 14px));
      }
      #mei-studio-dock-root.pos-bottom-left {
        left: 12px;
        bottom: max(14px, env(safe-area-inset-bottom, 14px));
      }
      .mei-dock-capsule {
        max-width: calc(100vw - 24px);
        padding: 6px 10px 6px 8px;
        gap: 6px;
      }
      #mei-dock-project-label {
        max-width: 82px !important;
      }
      .mei-dock-popover {
        width: min(260px, calc(100vw - 24px));
        max-height: 60dvh;
        overflow-y: auto;
      }
    }
    @media (orientation: landscape) and (max-height: 500px) {
      .mei-dock-popover {
        max-height: 70dvh;
        overflow-y: auto;
      }
    }
  `;

  function mount() {
    if (document.getElementById('mei-studio-dock-root')) return;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'mei-studio-dock-root';
    container.className =
      positionAttr === 'bottom-left' ? 'pos-bottom-left' : 'pos-bottom-right';

    const quickProjects = getQuickProjects();
    const quickLinksHtml = quickProjects
      .map(
        (item) => `
        <a href="${escapeHtml(sanitizeUrl(item.url, '/'))}" target="_top" class="mei-dock-popover-item">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.title)}</span>
          <span style="color:#0284C7;flex-shrink:0;">${LUCIDE_SVGS.arrowUpRight}</span>
        </a>
      `
      )
      .join('');

    container.innerHTML = `
      <div class="mei-dock-popover" id="mei-dock-popover" role="menu" aria-label="快速切換咩創意工作室專案">
        <div class="mei-dock-popover-title">
          <span>快速切換工作室專案</span>
          <span style="font-weight:500;color:#64748B;">Mei Hub</span>
        </div>
        ${quickLinksHtml}
      </div>
      <div class="mei-dock-capsule" title="可拖曳移動位置">
        <span class="mei-dock-badge" title="咩創意工作室">${LUCIDE_SVGS.cloud}</span>
        <div class="mei-dock-details" style="display:flex;align-items:center;gap:7px;">
          <div style="display:flex;flex-direction:column;line-height:1.2;padding-right:2px;">
            <span style="font-size:10px;color:#0284C7;font-weight:700;letter-spacing:0.03em;">MEI CREATIVE HUB</span>
            <span id="mei-dock-project-label" style="font-size:12px;color:#0F172A;max-width:136px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(projectName)}</span>
          </div>
          <button type="button" class="mei-dock-icon-btn" id="mei-dock-switcher-btn" title="展開快速專案切換清單" aria-label="展開快速專案切換清單">
            ${LUCIDE_SVGS.layoutGrid}
          </button>
          <a href="${escapeHtml(hubUrl)}" target="_top" class="mei-dock-btn" id="mei-dock-return-link">
            ${LUCIDE_SVGS.arrowLeft}
            <span>返回咩創意大廳</span>
          </a>
        </div>
        <button type="button" class="mei-dock-collapse-btn" id="mei-dock-toggle-btn" aria-label="收合或展開導覽膠囊">
          ${LUCIDE_SVGS.minimize}
        </button>
      </div>
    `;

    document.body.appendChild(container);

    const toggleBtn = container.querySelector('#mei-dock-toggle-btn');
    const switcherBtn = container.querySelector('#mei-dock-switcher-btn');
    const popover = container.querySelector('#mei-dock-popover');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.toggle('mei-dock-collapsed');
        if (popover) popover.classList.remove('open');
        clampToViewport();
      });
    }

    if (switcherBtn && popover) {
      switcherBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          popover.classList.remove('open');
        }
      });
    }

    // Drag support for desktop mouse and mobile touch with viewport boundary clamping
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let baseLeft = 0;
    let baseTop = 0;

    function measureBasePosition() {
      const rect = container.getBoundingClientRect();
      baseLeft = rect.left - offsetX;
      baseTop = rect.top - offsetY;
    }

    function clampOffset(nextX, nextY) {
      const margin = 8;
      const vw = Math.max(window.innerWidth || 320, 200);
      const vh = Math.max(window.innerHeight || 480, 200);
      const rect = container.getBoundingClientRect();
      const width = Math.min(rect.width || 240, vw - margin * 2);
      const height = Math.min(rect.height || 48, vh - margin * 2);

      // Recompute base coordinates without transform offset
      baseLeft = rect.left - offsetX;
      baseTop = rect.top - offsetY;

      const minX = margin - baseLeft;
      const maxX = vw - margin - width - baseLeft;
      const minY = margin - baseTop;
      const maxY = vh - margin - height - baseTop;

      return {
        x: Math.min(Math.max(nextX, Math.min(minX, maxX)), Math.max(minX, maxX)),
        y: Math.min(Math.max(nextY, Math.min(minY, maxY)), Math.max(minY, maxY))
      };
    }

    function clampToViewport() {
      const clamped = clampOffset(offsetX, offsetY);
      offsetX = clamped.x;
      offsetY = clamped.y;
      container.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    }

    const onPointerDown = (e) => {
      if (
        e.target.closest('a') ||
        e.target.closest('button') ||
        e.target.closest('.mei-dock-popover')
      ) {
        return;
      }
      isDragging = true;
      measureBasePosition();
      startX = e.clientX - offsetX;
      startY = e.clientY - offsetY;
      container.style.transition = 'none';
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const rawX = e.clientX - startX;
      const rawY = e.clientY - startY;
      const clamped = clampOffset(rawX, rawY);
      offsetX = clamped.x;
      offsetY = clamped.y;
      container.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      container.style.transition =
        'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)';
      clampToViewport();
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', clampToViewport);
    window.addEventListener('orientationchange', clampToViewport);

    // Expose safe label updater for multi-scene subproject sandboxes
    window.__MEI_STUDIO_DOCK_SET_PROJECT__ = (newTitle) => {
      const labelEl = container.querySelector('#mei-dock-project-label');
      if (labelEl && newTitle) {
        labelEl.textContent = String(newTitle);
      }
    };

    // Expose Universal Member SSO Bridge for all connected child projects
    const ssoListeners = new Set();
    function readSharedMember() {
      try {
        const raw =
          window.localStorage &&
          window.localStorage.getItem('mei_universal_member_sso_v1');
        if (!raw || typeof raw !== 'string' || raw.startsWith('MEI-SSO-')) {
          return null;
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.unionId) {
          return parsed;
        }
        return null;
      } catch {
        return null;
      }
    }

    window.MeiStudioSSO = {
      currentMember: readSharedMember(),
      getMember: readSharedMember,
      onAuthStateChange(cb) {
        if (typeof cb === 'function') {
          ssoListeners.add(cb);
          return () => ssoListeners.delete(cb);
        }
        return () => {};
      }
    };

    function notifySsoListeners(member) {
      window.MeiStudioSSO.currentMember = member;
      ssoListeners.forEach((cb) => {
        try {
          cb(member);
        } catch {
          // Ignore callback error
        }
      });
    }

    window.addEventListener('storage', (evt) => {
      if (evt.key === 'mei_universal_member_sso_v1') {
        notifySsoListeners(readSharedMember());
      }
    });

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ssoChannel = new BroadcastChannel('mei_universal_sso_channel_v1');
        ssoChannel.onmessage = (evt) => {
          if (evt && evt.data) {
            if ('member' in evt.data) {
              notifySsoListeners(evt.data.member);
            } else {
              notifySsoListeners(readSharedMember());
            }
          }
        };
      } catch {
        // Ignore broadcast error
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
