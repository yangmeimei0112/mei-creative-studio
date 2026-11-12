/**
 * 咩創意工作室 (Mei Creative Studio) - 本地智慧知識庫匹配器 (Tier 3 Fallback Engine)
 * 標語：創意無限∞咩有極限
 * 規格：繁體中文、零 Emoji、13+ 核心領域知識條目、關鍵字模糊加權比對、三層容錯終極備援
 */

import { STUDIO_CONFIG } from '../data/defaultData.js';

/**
 * 13+ 工作室核心領域 FAQ 知識庫
 */
export const FAQ_KNOWLEDGE_ENTRIES = [
  {
    id: 'faq-studio-intro',
    keywords: [
      '工作室',
      '咩創意',
      '理念',
      '標語',
      '品牌',
      '介紹',
      '特色',
      '晴空雲朵淡藍',
      'lucide',
      'mei creative studio',
      '做什麼',
      '關於'
    ],
    question: '咩創意工作室的核心理念、品牌特色與標語是什麼？',
    answer: `歡迎來到**咩創意工作室 (Mei Creative Studio)**！

我們的核心標語是**「創意無限∞咩有極限」**。
全站採用獨創的「晴空雲朵淡藍 (#38BDF8)」為基調，融合現代極簡毛玻璃卡片結構與 100% 純粹 Lucide 向量符號系統。

工作室核心特色：
1. **跨平台專案導引大廳**：支援 iOS、Android 手機/平板與 macOS、Windows 桌面雙模式，提供流暢的觸控與大螢幕瀏覽體驗。
2. **多維度專案導覽**：精心收錄 AI 與自動化工具、網站與商業應用、互動設計與多媒體三大領域專案。
3. **靈感雲朵 × 無限符號 (∞) 線性標誌**：象徵數位工藝的無限探索與追求卓越的創新精神。
4. **全站零 Emoji 規範**：堅持純粹幾何線性美學，全站使用 Lucide 向量圖示，嚴禁使用未經設計的 Unicode 表情符號。`
  },
  {
    id: 'faq-categories',
    keywords: [
      '分類',
      '領域',
      '專案類型',
      '類別',
      'ai-automation',
      'web-business',
      'interactive-media',
      '三大分類',
      '專案分類',
      '大廳有哪些專案分類',
      '有哪些專案分類'
    ],
    question: '大廳有哪些專案分類領域？',
    answer: `咩創意工作室大廳共規劃**三大核心專案分類領域**：

1. **AI 與自動化工具 (AI & Automation - ai-automation)**
   - 代表圖示：bot（子圖示：bot, cpu, wand-sparkles, workflow）
   - 範疇：智慧代理 (AI Agent)、LLM 工作流串接、自動化任務腳本與高效生產力專案。
2. **網站與商業應用 (Web & Business Apps - web-business)**
   - 代表圖示：globe（子圖示：globe, app-window, layout-dashboard, briefcase）
   - 範疇：全端 Web 專案、品牌形象官網、SaaS 商業系統與電商點餐系統（如「咩nu揪團點餐系統」）。
3. **互動設計與多媒體 (Interactive & Media - interactive-media)**
   - 代表圖示：circle-play（子圖示：circle-play, gamepad-2, palette, film, layers）
   - 範疇：WebGL 視覺實驗、互動式畫布、多媒體音訊與小遊戲創作專案。

您可於頂部分類標籤列點擊切換，或按 **Cmd/Ctrl + K** 喚出快捷命令列快速篩選各類專案。`
  },
  {
    id: 'faq-projects-list',
    keywords: [
      '專案列表',
      '有什麼專案',
      '咩nu',
      '點餐',
      '揪團',
      '目前專案',
      '哪些專案',
      '代表專案',
      '精選專案',
      '咩創意工作室有哪些專案',
      '工作室有哪些專案',
      '有哪些專案',
      '專案有哪些'
    ],
    question: '目前大廳收錄了哪些代表性專案？什麼是咩nu揪團點餐系統？',
    answer: `目前咩創意工作室大廳收錄之精選代表專案為：

- **咩nu揪團點餐系統**
  - **所屬分類**：網站與商業應用 (web-business)
  - **運行狀態**：測試 Beta (beta，連線延遲約 142ms)
  - **線上網址**：https://meinu2.vercel.app/
  - **專案特色**：專為多人揪團點餐設計之輕量化 Web 應用，支援桌面與行動裝置流暢操作，具備即時點餐統計與菜單瀏覽功能。
  - **操作互動**：卡片支援點擊「直接開啟」前往正式站點，或於卡片右上工具列展開「快速預覽抽屜」即時體驗，亦支援「QR Code 跨裝置掃碼」。`
  },
  {
    id: 'faq-admin-unlock',
    keywords: [
      '解鎖',
      '如何解鎖',
      '管理員解鎖',
      '預設密碼',
      '預設管理員密碼',
      'pin',
      'mei888',
      '後台',
      'admin',
      '登入',
      '管理權限',
      'admin pin',
      '預設pin',
      '管理員模式'
    ],
    question: '如何解鎖管理員模式？預設 PIN 碼是什麼？',
    answer: `解鎖管理員模式有三種便捷入口：

1. **桌面端**：點擊頂部導覽列右側的「管理員解鎖」按鈕。
2. **行動端**：點擊手機底部導覽列的「管理解鎖」項目。
3. **全域快捷鍵**：按下 **Cmd/Ctrl + K** 喚出命令列，輸入「解鎖」即可快速開啟解鎖對話框。

- **預設管理員 PIN 碼**：\`mei888\`
- **解鎖後管理權限**：
  - 檢視與切換私人專案 (Private Projects)
  - 新增、編輯與刪除專案卡片
  - 調整專案卡片自訂順序 (上下箭頭) 與置頂 (Pin)
  - 資料備份 JSON 匯出、匯入與重置
  - 開啟管理員專屬 AI 客服對話系統
- **恢復訪客模式**：點擊綠色「管理員已解鎖」按鈕即可立即鎖定，自動隱藏私人專案並卸載 AI 客服。`
  },
  {
    id: 'faq-admin-rate-limit',
    keywords: [
      '鎖定',
      '被鎖定',
      '錯誤',
      '輸入錯誤',
      '密碼錯誤',
      '輸錯',
      '防暴力',
      '冷卻',
      '5分鐘',
      '五分鐘',
      '300秒',
      '300 秒',
      '5次',
      '五次',
      '5 mins',
      '5min',
      '5 min',
      'admin 鎖定',
      'admin lockout',
      '冷卻鎖定',
      '多次錯誤',
      '連續錯誤',
      '連續輸錯',
      'rate limit',
      'lockout',
      '解不開',
      '退避',
      '密碼輸入錯誤',
      '密碼鎖定'
    ],
    question: '如果管理員 PIN 碼或密碼輸入錯誤被鎖定該怎麼辦？防暴力破解機制如何運作？',
    answer: `咩創意工作室內建**多層防暴力破解漸進式退避速率限制器 (Anti-Brute-Force Rate Limiter)**：

- **漸進式冷卻退避**：密碼每輸入錯誤一次，系統會依序強制等待 1秒、2秒、4秒、8秒。
- **5 分鐘安全鎖定**：若連續累計嘗試失敗達 **5 次**，系統將自動啟動 **5 分鐘 (300 秒)** 的全域安全鎖定，徹底抵禦字典檔與自動化腳本攻擊。
- **解除鎖定方式**：
  1. 請靜候畫面上顯示的倒數計時器結束（至多 300 秒）後，重新輸入正確 PIN 碼（預設為 \`mei888\`）。
  2. 若您是本機管理者且處於本機開發測試環境，可於瀏覽器 DevTools 中清理 localStorage 鍵值 \`mei_studio_security_rate_limit_v1\`。`
  },
  {
    id: 'faq-change-pin',
    keywords: [
      '修改密碼',
      '變更密碼',
      '修改管理員密碼',
      '變更管理員密碼',
      '修改管理員解鎖密碼',
      '變更管理員解鎖密碼',
      '管理員解鎖密碼',
      '修改解鎖密碼',
      '變更解鎖密碼',
      '換密碼',
      '修改',
      '變更',
      '密碼修改',
      '變更 pin',
      '修改 pin',
      '設定密碼',
      '改 pin',
      'update pin',
      'change pin',
      '密碼長度',
      '密碼'
    ],
    question: '如何修改管理員解鎖 PIN 碼？長度限制與加密規格為何？',
    answer: `修改管理員 PIN 碼操作步驟如下：

1. 先確保已解鎖進入管理員模式（輸入預設密碼 \`mei888\`）。
2. 點擊頂部導覽列工具區的「備份與管理中心」按鈕（滑桿設定圖示 sliders-horizontal）。
3. 捲動至視窗最下方的「變更管理員解鎖密碼」區塊。
4. 輸入新密碼：長度至少需 4 個字元（至少 4 個字元，建議 4 至 12 碼英數字組合）。
5. 點擊「更新密碼」，系統將立即加密儲存。

- **加密資安規格**：
  - 採用標準 FIPS 180-4 SHA-256 加鹽雜湊 (\`salted-sha256:v1:<salt>:<hexHash>\`)。
  - 結合 Web Crypto API 產生 16-byte 高強度隨機 Salt 鹽值。
  - 驗證採用常數時間比對 (timingSafeEqualStrings)，防止時序側信道攻擊。`
  },
  {
    id: 'faq-add-edit-delete-project',
    keywords: [
      '新增專案',
      '編輯專案',
      '刪除專案',
      '修改專案',
      '建立專案',
      '移除專案',
      '管理專案',
      '如何新增與編輯專案',
      '新增與編輯專案',
      'add project',
      'edit project'
    ],
    question: '管理員如何新增、編輯或刪除專案卡片？',
    answer: `管理員模式下之專案維護指南：

- **新增專案**：
  1. 點擊頂部導覽列「新增專案」按鈕（手機版點擊底部導覽列中央「+」按鈕）。
  2. 填寫專案中文名稱、副標題與目標網址（系統會自動校驗並阻擋 javascript: 等危險協定）。
  3. 選擇所屬分類，並從內建 Lucide 圖示中挑選專屬代表符號。
  4. 設定運行狀態（正式上線/測試/維護中/離線）、顯示權限（公開/私人）以及是否置頂與精選推薦。
  5. 點擊「儲存專案」即完成新增。
- **編輯專案**：
  - 於大廳專案卡片右上角點擊鉛筆圖示 (pencil)，即可開啟編輯視窗修改專案屬性。
- **刪除專案**：
  - 於專案卡片右上角點擊紅色垃圾桶圖示 (trash-2)，在二階段確認後即可即時移除。`
  },
  {
    id: 'faq-reorder-pin',
    keywords: [
      '排序',
      '移動',
      '置頂',
      '上下移',
      '順序',
      '調整順序',
      'pin',
      'unpin',
      'reorder'
    ],
    question: '如何調整專案排序與設定置頂？大廳提供哪些排序切換？',
    answer: `在大廳中自訂專案排列方式：

1. **自訂卡片順序**：
   - 管理員解鎖後，每張專案卡片右上工具列均提供「向上箭頭 (arrow-up)」與「向下箭頭 (arrow-down)」。
   - 點擊箭頭可即時向前或向後移動專案位置，順序將自動儲存於本機儲存空間。
2. **置頂功能**：
   - 點擊卡片右上工具列中的大頭針圖示 (pin)，即可將該專案置頂於大廳最前列；再次點擊大頭針可取消置頂。
3. **智慧排序切換**（分類列右側下拉選單）：
   - 預設排序 (default)：依置頂狀態與自訂順序排列。
   - 名稱 A-Z (name-asc)：依專案標題字母與筆劃排序。
   - 延遲極速優先 (latency-asc)：依巡檢連線延遲毫秒數由快到慢排列。
   - 最新更新 (updated-desc)：依專案最後更新日期排序。`
  },
  {
    id: 'faq-private-visibility',
    keywords: [
      '私人專案',
      '公開專案',
      '隱藏專案',
      '權限',
      '私人模式',
      '私人',
      '設為私人',
      '如何將專案設為私人模式',
      'private',
      'public',
      '訪客視角',
      '公開視角',
      'visibility'
    ],
    question: '如何設定私人專案？未解鎖訪客能否看見私人專案？',
    answer: `咩創意工作室支援**雙重視角權限分離機制**：

- **訪客公開視角 (未解鎖)**：
  - 僅展示標記為「公開 (public)」之專案。
  - 所有私人專案完全自 DOM 剔除，訪客無法在畫面上看見或透過列表存取任何私人專案。
- **管理員視角 (已解鎖)**：
  - 同時瀏覽公開專案與私人專案。私人專案卡片上會醒目標記盾牌鎖定徽章 (shield)。
- **切換方式**：
  - 解鎖狀態下，專案卡片右上角工具列提供盾牌/眼睛切換圖示，點擊即可一鍵在「公開」與「私人」之間切換。
  - 新增或編輯專案時，亦可直接勾選「設為私人專案」。`
  },
  {
    id: 'faq-backup-export-import',
    keywords: [
      '備份',
      '匯出',
      '匯入',
      'json',
      '還原',
      '重置',
      'export',
      'import',
      'reset',
      '預設資料',
      'backup'
    ],
    question: '如何匯出、還原專案資料備份？如何重置為原廠設定？',
    answer: `大廳資料備份與還原作業說明：

1. 點擊頂部導覽列「備份與管理中心」按鈕（滑桿圖示 sliders-horizontal）。
2. **匯出備份**：
   - 點擊「匯出 JSON 備份」，系統會自動打包所有專案卡片與動態日誌，下載為 \`mei-creative-studio-backup-YYYY-MM-DD.json\` 備份檔案。
3. **匯入還原**：
   - 支援「選擇 .json 檔案」上傳或直接貼上 JSON 格式代碼。
   - 點擊「套用匯入資料」，系統將經深度資料消毒 (sanitizeObjectDeep) 與結構校驗後完成還原。
4. **重置原廠預設**：
   - 點擊「重置預設」按鈕，可一鍵將專案資料恢復至原廠初始示範狀態。`
  },
  {
    id: 'faq-mei-dock-sdk',
    keywords: [
      'sdk',
      'mei-dock',
      'mei-dock.js',
      'sdk script',
      '返回大廳',
      '嵌入',
      '膠囊',
      '子專案',
      'dock',
      'embed'
    ],
    question: '如何在獨立子專案中整合 mei-dock.js 返回大廳懸浮膠囊？',
    answer: `任何獨立子專案只需在 HTML 中嵌入以下這行 SDK 程式碼，即可在右下角自動浮現晴空淡藍的「返回大廳懸浮導覽膠囊」：

\`\`\`html
<!-- 咩創意工作室：返回大廳懸浮導覽膠囊 -->
<script
  src="/sdk/mei-dock.js"
  data-hub-url="/"
  data-project-name="您的子專案名稱"
  data-position="bottom-right"
  defer
></script>
\`\`\`

- **參數設定說明**：
  - \`data-hub-url\`：大廳首頁網址（預設為 \`/\`）。
  - \`data-project-name\`：子專案名稱，滑鼠懸停膠囊時提示。
  - \`data-position\`：膠囊位置，支援 \`bottom-right\` 或 \`bottom-left\`。
- **膠囊特色**：
  - 支援自由長按拖曳位置。
  - 點擊一鍵平滑跳轉返回咩創意工作室導引大廳。`
  },
  {
    id: 'faq-qr-code',
    keywords: [
      'qr',
      'qrcode',
      '手機掃碼',
      '跨裝置',
      '二維碼',
      '行動版',
      '相機',
      '掃描'
    ],
    question: '如何使用跨裝置 QR Code 功能？手機如何即開即用？',
    answer: `跨裝置 QR Code 操作方式：

1. 在電腦瀏覽大廳專案卡片時，點擊卡片底部的「QR-code」按鈕（或於快速預覽抽屜中點擊行動條碼圖示）。
2. 畫面中央將彈出專屬晴空淡藍 QR Code 視窗 (QRCodeModal)。
3. 拿起 iOS 或 Android 手機開啟內建相機對準螢幕掃描。
4. 點擊手機畫面上出現的連結通知，即可立即在手機瀏覽器中開啟該專案！

免去手動輸入長網址的困擾，實現跨裝置無縫切換體驗。`
  },
  {
    id: 'faq-health-check',
    keywords: [
      '巡檢',
      '延遲',
      '連線',
      'ping',
      'ms',
      '健康度',
      'online',
      'offline',
      'beta',
      'maintenance',
      '狀態檢測',
      '連線巡檢'
    ],
    question: '全站連線巡檢與延遲探測是如何運作的？有哪些連線狀態？',
    answer: `大廳內建**即時連線巡檢探針 (Live Health Check Probe)**：

- **運作機制**：
  - 系統內建 probeProjectHealth 探針，對專案網址發送 HEAD/GET 請求（具備 3.5 秒逾時保護）。
  - 自動量測連線往返時間並記錄為延遲毫秒數 (latencyMs)。
- **手動觸發巡檢**：
  - 點擊頂部導覽列上的連線狀態按鈕（如顯示「1/1 線上」或動態波形圖示 activity），即可立即對全站所有專案發動即時巡檢探測。
- **四種連線狀態定義**：
  1. 正式上線 (online - 綠燈 circle-check)：專案正常運行且連線穩定。
  2. 測試 Beta (beta - 藍燈 activity)：公開測試階段，功能持續迭代中。
  3. 維護更新中 (maintenance - 橙燈 triangle-alert)：伺服器維護升級中。
  4. 離線待命 (offline - 紅燈 wifi-off)：站點暫時無法連線。`
  },
  {
    id: 'faq-command-palette',
    keywords: [
      '快捷鍵',
      'command palette',
      'cmd+k',
      'ctrl+k',
      '搜尋面板',
      '快速搜尋',
      '搜尋'
    ],
    question: '如何使用全域快捷鍵與命令列 (Command Palette)？',
    answer: `咩創意工作室支援全域快捷命令列 (Command Palette)：

- **呼叫方式**：
  - 在任何頁面按下 **Cmd + K** (macOS) 或 **Ctrl + K** (Windows/Linux)。
  - 亦可點擊頂部導覽列中央的搜尋欄開啟。
- **支援功能**：
  1. **即時專案搜尋**：輸入專案關鍵字，即時列出相符專案並可直接跳轉開啟。
  2. **分類快速篩選**：輸入分類名稱快速過濾大廳卡片。
  3. **快捷動作**：未解鎖時輸入「解鎖」即可快速輸入 PIN 碼；已解鎖時可輸入「新增專案」或「備份」。
  4. **主題切換**：快速切換晴空淡藍淺色模式與星夜深色模式。`
  }
];

/**
 * 當查無直接匹配 FAQ 時之標準引導說明 (零 Emoji)
 */
export const DEFAULT_FALLBACK_GUIDANCE = `【咩創意工作室 服務指南】
您好！目前本地知識庫未能直接比對到您的提問。您可以嘗試輸入更具體的關鍵字，或詢問以下主題：
1. 管理員解鎖（預設密碼：mei888）、防暴力破解鎖定與密碼變更
2. 專案新增、編輯、刪除、自訂排序（上下移）與置頂
3. 咩nu揪團點餐系統與三大核心分類導覽
4. 私人專案權限切換與訪客公開視角
5. 資料備份 JSON 匯出匯入與原廠重置
6. 子專案接入 SDK (mei-dock.js) 返回膠囊
7. 跨裝置 QR Code 掃描與全站連線巡檢
8. 全域快捷鍵 Command Palette (Cmd/Ctrl + K)`;

/**
 * 取得預設引導回覆
 */
export function getFallbackGuidance() {
  return DEFAULT_FALLBACK_GUIDANCE;
}

/**
 * 本地智慧 FAQ 模糊匹配演算法 (Tier 3 Fallback Engine)
 * @param {string} userQuery - 使用者提問字串
 * @param {Object} [options] - 匹配選項
 * @param {number} [options.threshold=10] - 判定匹配成功之分數門檻 (預設 10；>=25 屬高信心直接回應)
 * @param {boolean} [options.fallbackOnNoMatch=false] - 當未達門檻時是否回傳引導物件 (若 false 則回傳 null)
 * @returns {Object|null} 匹配結果或 null
 */
export function matchLocalFaq(userQuery, options = {}) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  const { threshold = 10, fallbackOnNoMatch = false } = safeOptions;

  const buildFallbackResult = (score = 0) => ({
    matched: false,
    id: 'fallback-guidance',
    score,
    matchedQuestion: null,
    reply: DEFAULT_FALLBACK_GUIDANCE,
    answer: DEFAULT_FALLBACK_GUIDANCE,
    source: 'local_fallback',
    model: 'local-knowledge-base'
  });

  if (!userQuery || typeof userQuery !== 'string') {
    return fallbackOnNoMatch ? buildFallbackResult(0) : null;
  }

  const q = userQuery.trim().toLowerCase();
  if (!q) {
    return fallbackOnNoMatch ? buildFallbackResult(0) : null;
  }

  let bestEntry = null;
  let highestScore = 0;

  for (const entry of FAQ_KNOWLEDGE_ENTRIES) {
    let score = 0;
    const lowerQuestion = entry.question.toLowerCase();
    const lowerId = entry.id.toLowerCase();

    // 1. 問題完全吻合或包含比對 (包含比對需要長度 >= 4，避免短關鍵字 pin 膨脹分數)
    if (q === lowerQuestion) {
      score += 100;
    } else if (lowerQuestion.includes(q) && q.length >= 4) {
      score += 50;
    } else if (q.includes(lowerQuestion)) {
      score += 40;
    }

    // 2. 條目 ID 比對
    if (q === lowerId || q.includes(lowerId)) {
      score += 30;
    }

    // 3. 關鍵字加權比對
    let hasExactKw = false;
    let partialKwScore = 0;
    for (const kw of entry.keywords) {
      const lowerKw = kw.toLowerCase();
      if (q === lowerKw) {
        // 單一關鍵字完全吻合 (例如使用者僅輸入 "pin" 或 "mei888" 或 "點餐")
        score += 35;
        hasExactKw = true;
      } else {
        const isAsciiWord = /^[a-z0-9_]+$/i.test(lowerKw);
        const isMatch = isAsciiWord
          ? new RegExp('\\b' + lowerKw + '\\b', 'i').test(q)
          : q.includes(lowerKw);

        if (isMatch) {
          if (lowerKw.length >= 4) {
            score += 15;
          } else if (lowerKw.length >= 2) {
            score += 10;
          } else {
            score += 5;
          }
        } else if (lowerKw.includes(q) && q.length >= 2) {
          // 部分包含分數每條目最多累加 8 分，且若已有完全相符關鍵字則不重複計算
          if (!hasExactKw && partialKwScore === 0) {
            partialKwScore = 8;
          }
        }
      }
    }
    score += partialKwScore;

    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
    }
  }

  // 評估是否達到門檻
  if (bestEntry && highestScore >= threshold) {
    return {
      matched: true,
      id: bestEntry.id,
      score: highestScore,
      matchedQuestion: bestEntry.question,
      reply: bestEntry.answer,
      answer: bestEntry.answer, // 雙欄位兼容 aiService 與 AdminChatWidget
      source: 'local_fallback',
      model: 'local-knowledge-base'
    };
  }

  // 未達門檻
  if (fallbackOnNoMatch) {
    return buildFallbackResult(highestScore);
  }

  return null;
}

export default matchLocalFaq;
