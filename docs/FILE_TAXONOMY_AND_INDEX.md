# 咩創意工作室 (Mei Creative Studio) — 全站檔案分類標準與 AI 代理檢索索引

> **文件定位**：本文件為 AI 代理與開發者進行全站檔案定位、修改路由與目錄整潔維護之唯一權威索引（Single Source of Truth）。任何代理在新增、修改或刪除檔案前，請先查閱本索引以鎖定精確目標檔案，避免全庫盲目掃描。

---

## 一、全站標準目錄分類架構 (Directory Taxonomy)

專案採 **10 大職責分區（5 個頂層目錄與 5 個 `src/` 子分區） + 精簡根目錄** 標準：

```text
咩創意工作室/
├── .env.example                     # Supabase 雲端連線環境變數範本（不含機密金鑰；本機另置未入版 .env.local）
├── .gitignore                       # Git 忽略規則（排除 node_modules、dist、.env.local 等本機敏感檔）
├── AGENTS.md                        # 工作區最高工程規範與檔案分類快速入口
├── README.md                        # 專案總覽與快速啟動指南
├── index.html                       # 應用入口 HTML 與 PWA Webmanifest 掛載點
├── package.json                     # 腳本指令與依賴宣告
├── package-lock.json                # npm 鎖定依賴版本樹
├── vite.config.js                   # Vite 建置設定與本地混合式 /api/projects 持久化中介層
├── tailwind.config.js               # Tailwind CSS 主題色票、動畫與斷點設定
├── postcss.config.js                # PostCSS 管線設定
├── vercel.json                      # Vercel 雲端邊緣安全標頭 (CSP / HSTS) 與路由重寫
├── data/
│   └── projects.json                # 本地開發伺服器即時讀寫之專案目錄持久化 JSON
├── docs/
│   └── FILE_TAXONOMY_AND_INDEX.md   # 全站檔案分類標準與 AI 代理檢索索引（本文件）
├── supabase/
│   └── schema_migrations.sql        # 專屬 Supabase (xtyuyuralrnwzsjvyslp) 資料表與 FORCE RLS 遷移腳本
├── public/
│   ├── favicon.svg                  # 瀏覽器頁籤向量圖示 (Mei Flow)
│   ├── pwa-maskable.svg             # PWA 主畫面自適應遮罩圖示
│   ├── manifest.webmanifest         # 標準 PWA Web App Manifest（全站唯一來源）
│   ├── sw.js                        # PWA Service Worker 離線快取腳本
│   ├── robots.txt                   # 搜尋引擎與 AI 爬蟲禮貌性防禦宣告
│   ├── ai.txt                       # AI 訓練擷取政策宣告
│   ├── demo-subproject.html         # 內嵌沙盒與子專案聯通互動示範頁
│   ├── logo-preview.html            # 品牌標誌 7 階尺寸規格互動預覽頁
│   ├── previews/                    # 自動生成之 7 階品牌標誌獨立 SVG (logo-2xs ~ logo-2xl.svg)
│   └── sdk/
│       └── mei-dock.js              # 跨域子專案一鍵返回大廳與跨站 SSO 驗證 SDK (window.MeiStudioSSO)
├── scripts/
│   ├── verify-hub.mjs               # 全站結構、Zero Emoji、Lucide 圖示與資安規範自動檢驗腳本
│   └── generate-logo-previews.mjs   # 品牌標誌 7 階 SVG 與預覽頁生成／快篩檢驗腳本 (--check)
└── src/
    ├── main.jsx                     # React 根節點掛載入口
    ├── App.jsx                      # 全站主容器、全域狀態協調、OAuth 回呼錯誤攔截與 Toast 控制
    ├── styles/
    │   └── index.css                # 全域樣式、多比例 dvh 響應式類別、毛玻璃與關鍵影格動畫
    ├── data/                        # 【純資料層】靜態預設配置、FAQ 知識庫與資安審計種子資料
    ├── services/                    # 【業務服務層】認證、雲端資料庫同步、本地儲存、資安與 AI 客服邏輯
    ├── components/                  # 【UI 元件層】大廳導覽、Bento 網格、會員專區、預覽抽屜與管理彈窗
    └── __tests__/                   # 【自動化測試層】單元測試、整合測試與 e2e_requirements 分層規格驗證
```

---

## 二、AI 代理任務導向快速檢索表 (Task-to-File Quick Lookup Matrix)

當收到使用者需求時，AI 代理應直接依下表鎖定對應檔案進行讀取與修改：

| 修改需求／功能領域 | 首要目標檔案 (Primary Files) | 關聯驗證測試 (Verification Tests) |
| :--- | :--- | :--- |
| **Google OAuth / 信箱註冊 / 密碼登入 / Passkey / 跨站 SSO Token** | `src/services/memberAuthService.js`<br>`src/services/supabaseClient.js`<br>`src/components/MemberPortalModal.jsx`<br>`src/components/AntiBotCaptcha.jsx` | `src/__tests__/supabase_google_oauth.test.jsx`<br>`src/__tests__/auth_cloud_sso_v2.test.jsx`<br>`src/__tests__/e2e_requirements/m1_auth_core.test.jsx`<br>`src/__tests__/e2e_requirements/m2_portal_ui.test.jsx` |
| **子專案返回大廳膠囊與 `window.MeiStudioSSO` SDK** | `public/sdk/mei-dock.js`<br>`public/demo-subproject.html` | `src/__tests__/meiDock.test.js`<br>`scripts/verify-hub.mjs` |
| **Supabase 資料表結構、RLS 政策與會員專案雲端同步** | `supabase/schema_migrations.sql`<br>`src/services/projectSyncService.js`<br>`src/services/supabaseClient.js` | `src/__tests__/e2e_requirements/tier1_core_features.e2e.test.jsx`<br>`src/__tests__/e2e_requirements/tier2_boundaries_errors.e2e.test.jsx` |
| **頂部導覽列、主視覺標題、分類篩選與搜尋列** | `src/components/HeaderHero.jsx`<br>`src/components/MobileBottomNav.jsx`<br>`src/components/CommandPalette.jsx` | `src/__tests__/app.test.jsx`<br>`src/__tests__/mobileResponsiveAdaptation.test.jsx` |
| **Bento 專案卡片網格、內嵌沙盒預覽抽屜、QR-code 彈窗** | `src/components/BentoProjectGrid.jsx`<br>`src/components/ProjectPreviewDrawer.jsx`<br>`src/components/QRCodeModal.jsx` | `src/__tests__/app.test.jsx`<br>`src/__tests__/animationE2E.test.jsx` |
| **管理員解鎖、新增／編輯專案、JSON 備份還原、PWA 安裝指南** | `src/components/AdminProjectModal.jsx`<br>`src/services/storageService.js`<br>`src/data/defaultData.js` | `src/__tests__/installGuideDeviceDetection.test.jsx`<br>`src/__tests__/memberPortalAndToast.test.jsx`<br>`scripts/verify-hub.mjs` |
| **管理員 AI 客服小幫手與離線 FAQ 語意比對** | `src/components/AdminChatWidget.jsx`<br>`src/services/aiService.js`<br>`src/services/aiFaqMatcher.js`<br>`src/data/studioKnowledgeBase.js` | `src/__tests__/aiService.test.jsx`<br>`src/__tests__/aiFaqMatcher.test.jsx`<br>`src/__tests__/studioKnowledgeBase.test.js`<br>`src/__tests__/adminAiCustomerSupport.e2e.test.jsx` |
| **工作室動態脈搏、更新日誌與 SOC 資安防禦審計面板** | `src/components/StudioPulseSection.jsx`<br>`src/components/SecurityAuditModal.jsx`<br>`src/services/securityService.js`<br>`src/data/securityAuditData.js` | `src/__tests__/security.test.jsx`<br>`scripts/verify-hub.mjs` |
| **品牌標誌 (`StudioLogo` Mei Flow) 與 Lucide 圖示系統** | `src/components/LucideIcon.jsx`<br>`scripts/generate-logo-previews.mjs`<br>`public/previews/` | `src/__tests__/logoE2E.test.jsx`<br>`src/__tests__/authAndLogoE2E.test.jsx` |
| **開場雲霧推進動畫、Toast 通知膠囊與多比例響應式 CSS** | `src/components/PortalEntrance.jsx`<br>`src/App.jsx`<br>`src/styles/index.css` | `src/__tests__/animationE2E.test.jsx`<br>`src/__tests__/mobileResponsiveAdaptation.test.jsx`<br>`src/__tests__/mobilePwa.test.jsx` |

---

## 三、核心原始碼模組詳細職責清單 (Module Inventory)

### 1. 業務服務層 (`src/services/`)
| 檔案路徑 | 核心職責與匯出介面 |
| :--- | :--- |
| `src/services/supabaseClient.js` | 初始化專屬 Supabase 客戶端 (`xtyuyuralrnwzsjvyslp` in `ap-northeast-1`)，啟用 `flowType: 'pkce'`、`detectSessionInUrl: true` 與 `persistSession: true`。 |
| `src/services/memberAuthService.js` | 全站會員認證與跨站 SSO 核心：`signInWithGoogle`（原生 Google OAuth `prompt: 'select_account'` 與 `/auth/v1/settings` 預檢）、`diagnoseOAuthError`（繁體中文錯誤診斷）、`registerMemberWithDetails`、`signInMemberWithPassword`、`addPasswordToCurrentMember`、`bindGmailToCurrentMember`、`signInWithPasskey`、`bindPasskeyToCurrentMember`、`generateMemberSsoToken`、`verifyMemberSsoToken`、`initAuthListener`、`syncMemberProfileToCloud`。 |
| `src/services/projectSyncService.js` | 已登入會員之個人化專案收藏、置頂與排序設定與雲端 `public.mei_member_projects` 資料表雙向同步。 |
| `src/services/storageService.js` | 本地專案目錄 CRUD (`loadProjects` / `saveProjects`)、連線健康度探測 (`probeProjectHealth`)、管理員 PIN 雜湊驗證、JSON 備份匯出入與防爆破速率限制連結。 |
| `src/services/securityService.js` | 資安防禦核心：Salted SHA-256 雜湊、常數時間字串比對 (`timingSafeEqualStrings`)、深層 XSS 消毒 (`sanitizeStringDeep`)、PIN 防爆破指數退避冷卻與 AI 爬蟲金絲雀蜜罐指標紀錄。 |
| `src/services/aiService.js` | 管理員 AI 客服雙引擎調度：優先進行本地 FAQ 知識庫高速語意匹配，未命中時串接遠端生成式 API 並具備優雅降級容錯。 |
| `src/services/aiFaqMatcher.js` | 基於關鍵字權重、同義詞擴展與模糊比對之零延遲本地問答檢索引擎。 |

### 2. UI 元件層 (`src/components/`)
| 檔案路徑 | 核心職責 |
| :--- | :--- |
| `src/components/HeaderHero.jsx` | 頂部懸浮導覽列（含會員狀態膠囊、主題切換、安裝按鈕）與晴空藍 Hero 標語、搜尋框及分類篩選列。 |
| `src/components/BentoProjectGrid.jsx` | 響應式 Bento 專案卡片網格（支援精選焦點雙欄卡、雙模式啟動、健康度徽章與管理員快速編輯）。 |
| `src/components/ProjectPreviewDrawer.jsx` | 側邊滑出式子專案互動沙盒預覽抽屜（支援電腦／摺疊平板 `4:3`／手機 `9:16` 視角切換與 SDK 嵌入碼複製）。 |
| `src/components/MemberPortalModal.jsx` | 全站聯通雲端會員中心視窗（未登入三軌分頁：快速登入／信箱密碼登入／真人驗證碼註冊；已登入：會員卡、增設密碼、綁定 Gmail／Passkey、跨專案 SSO Token 複製）。 |
| `src/components/AntiBotCaptcha.jsx` | 純向量 SVG 數學算式防機器人驗證碼產生器與輸入校驗元件。 |
| `src/components/AdminProjectModal.jsx` | 包含四大管理彈窗：`AdminProjectModal`（新增／編輯專案與 48 款 Lucide 圖示挑選器）、`AdminUnlockModal`（管理員密碼解鎖與修改）、`SdkAndInstallModal`（`mei-dock.js` 嵌入指南與跨平台 PWA 安裝教學）、`StudioBackupModal`（JSON 備份匯出／匯入、重置與後台管理設定）。 |
| `src/components/AdminChatWidget.jsx` | 管理員專屬右下角懸浮 AI 客服對話視窗與快捷問題膠囊。 |
| `src/components/StudioPulseSection.jsx` | 工作室即時脈搏指標、更新日誌時間軸與資安防禦狀態總覽區塊。 |
| `src/components/SecurityAuditModal.jsx` | 10 大資安防禦領域深度審計報告與金絲雀誘捕日誌彈窗。 |
| `src/components/CommandPalette.jsx` | `Cmd/Ctrl + K` 全域鍵盤快速命令列。 |
| `src/components/MobileBottomNav.jsx` | 行動端底部單手操作導覽列（探索、搜尋、安裝、會員／設定）。 |
| `src/components/PortalEntrance.jsx` | 首次進站雲霧散開與空間景深推進開場動畫。 |
| `src/components/QRCodeModal.jsx` | 跨裝置掃描開啟子專案之純 SVG QR-code 產生器彈窗。 |
| `src/components/LucideIcon.jsx` | 統一封裝之 Lucide 圖示渲染器（預設 `strokeWidth=1.75`、`absoluteStrokeWidth=true`）、`SquircleIconBadge` 與 `StudioLogo`（M 字時光律動 · Mei Flow 幾何，支援 `2xs` 至 `2xl`）。 |

### 3. 資料層 (`src/data/`)
| 檔案路徑 | 核心職責 |
| :--- | :--- |
| `src/data/defaultData.js` | 品牌資訊、三大預設專案分類、原廠示範專案清單 (`DEFAULT_PROJECTS`) 與預設更新日誌。 |
| `src/data/studioKnowledgeBase.js` | 管理員 AI 客服之結構化知識庫問答集與分類索引。 |
| `src/data/securityAuditData.js` | SOC 資安審計面板之防禦矩陣與合規檢查項目定義。 |

---

## 四、自動化測試分層索引與標準驗證指令 (Test Suite Taxonomy)

### 1. 標準必跑驗證指令
每次修改程式碼或搬移檔案後，必須依序確認以下 4 道檢查全數通過：
1. `npm test -- --run`：執行 Vitest 全站 22 個測試檔案。
2. `npm run build`：執行 Vite 正式環境打包檢查。
3. `node --test scripts/verify-hub.mjs`：執行全站靜態規範、Zero Emoji 與資安防禦快篩（7 大項）。
4. `node scripts/generate-logo-previews.mjs --check`：執行品牌標誌 8 項生成資產完整性快篩。

### 2. 測試檔案分類 (`src/__tests__/`)
- **認證與跨站 SSO 測試**：
  - `src/__tests__/supabase_google_oauth.test.jsx`：Supabase 原生 Google OAuth 5-Tier 驗證（參數契約、無假帳號旁路、中文錯誤診斷、回呼暱稱保留、RLS 同步）。
  - `src/__tests__/auth_cloud_sso_v2.test.jsx`：完整註冊（含驗證碼）、密碼登入、Gmail 綁定、Passkey 與 SSO Token 綜合驗證。
  - `src/__tests__/meiDock.test.js`：`public/sdk/mei-dock.js` 跨域膠囊與 Token 驗證測試。
  - `src/__tests__/memberPortalAndToast.test.jsx`：會員專區入口、頁尾管理員解鎖與亮色淡藍高對比 Toast 驗證。
- **端對端規格矩陣 (`src/__tests__/e2e_requirements/`)**：
  - `e2eHarness.js`：共用 Mock Supabase Client、WebAuthn Passkey 模擬器與 Zero Emoji 斷言工具。
  - `m1_auth_core.test.jsx` / `m2_portal_ui.test.jsx`：認證核心服務與會員專區三軌分頁 UI 規格測試。
  - `tier1_core_features.e2e.test.jsx`：15 項核心功能覆蓋驗證。
  - `tier2_boundaries_errors.e2e.test.jsx`：邊界條件、錯誤處理與防禦降級測試。
  - `tier3_cross_features.e2e.test.jsx`：跨功能交互組合測試。
  - `tier4_user_journeys.e2e.test.jsx`：真實使用者完整旅程測試。
- **品牌視覺、響應式、動畫與資安測試**：
  - `src/__tests__/logoE2E.test.jsx` / `src/__tests__/authAndLogoE2E.test.jsx`：`StudioLogo` Mei Flow 幾何、7 級尺寸與 12 端點一致性驗證。
  - `src/__tests__/mobileResponsiveAdaptation.test.jsx` / `src/__tests__/mobilePwa.test.jsx` / `src/__tests__/installGuideDeviceDetection.test.jsx`：四大長寬比響應式、PWA 與裝置偵測驗證。
  - `src/__tests__/animationE2E.test.jsx`：開場動畫、抽屜轉場、主題波浪切換與無障礙屬性驗證。
  - `src/__tests__/security.test.jsx`：雜湊、XSS 消毒、防爆破鎖定與蜜罐陷阱驗證。
  - `src/__tests__/aiService.test.jsx` / `src/__tests__/aiFaqMatcher.test.jsx` / `src/__tests__/studioKnowledgeBase.test.js` / `src/__tests__/adminAiCustomerSupport.e2e.test.jsx`：AI 客服與 FAQ 語意引擎全套驗證。
  - `src/__tests__/app.test.jsx`：大廳綜合互動、篩選、排序與管理員 CRUD 測試。

---

## 五、檔案新增、搬移與清理守則 (File Hygiene & Anti-Bloat Rules)

1. **根目錄零雜物原則**：根目錄嚴禁存放任何臨時測試報告（如 `TEST_*.md`、`*_REPORT.md`）、一次性腳本或 `.sql` 檔案；資料庫遷移腳本一律置於 `supabase/`，技術規範文件一律置於 `docs/`。
2. **禁止殘留一次性腳本**：`scripts/` 僅保留 `package.json` 正式納管之常駐自動化檢驗與建置腳本（`verify-hub.mjs`、`generate-logo-previews.mjs`），禁止在 `scripts/` 累積臨時壓力測試或單次實驗腳本。
3. **路徑變更同步更新紀律**：凡搬移、重命名或新增核心模組，必須在同一變更中同步更新：(a) 所有 `import` 引用路徑、(b) 相關測試中的 `path.resolve(...)` 檢查、(c) 本索引文件 (`docs/FILE_TAXONOMY_AND_INDEX.md`)。
4. **Zero Emoji 鐵律**：包含 `docs/`、`AGENTS.md`、`README.md` 在內的全站所有檔案，嚴禁出現任何系統 Unicode Emoji。
