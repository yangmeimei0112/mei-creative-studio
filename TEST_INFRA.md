# 咩創意工作室 (Mei Creative Studio) 測試基礎架構與驗證規範 (TEST_INFRA.md)

> **文件版本**：v2.0.0 (Logo Redesign & Hub Integration Architecture)  
> **適用專案**：咩創意工作室跨平台專案導引大廳 (`mei-creative-studio-hub`)  
> **核心商標意象**：靈感雲朵 × 無限符號 (∞) + 靈感火花徽章 (`Inspiration Cloud × Infinity Loop + Sparkles Badge`)  
> **品牌色彩系統**：晴空淡藍科技質感（主色系 `#38BDF8`，深色 `#0284C7` / `#080E1A`）  
> **幾何標準規範**：Lucide 統一線性幾何規範 (`strokeWidth=1.75`, `absoluteStrokeWidth=true`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `fill="none"`)  
> **核心驗證原則**：雙軌不透光端對端驗證 (Dual-Track Opaque-Box E2E Testing)  
> **全站最高戒律**：全站 100% 向量化，嚴格落實零系統 Emoji 政策 (Strict Zero-Emoji Policy)

---

## 1. 測試架構理念與原則 (Testing Philosophy & Architecture)

咩創意工作室採用**雙軌驗證體系 (Dual-Harness Architecture)**，搭配**獨立視覺化檢驗引擎 (Visual Preview Engine)**，在動態行為、靜態合規與視覺呈現三方面實現 100% 嚴謹的品質保證：

```
+-----------------------------------------------------------------------------------+
|               咩創意工作室 (Mei Creative Studio) 整合驗證體系架構                 |
+-----------------------------------------------------------------------------------+
                                         |
     +-----------------------------------+-----------------------------------+
     |                                   |                                   |
     v                                   v                                   v
[軌道一：動態 Vitest + JSDOM]      [軌道二：靜態 Node.js 合規稽核]     [軌道三：視覺對比檢驗引擎]
- React 元件生命週期與掛載          - scripts/verify-hub.mjs            - scripts/generate-logo-previews.mjs
- 7 階響應式尺寸結構完整度          - 靜態正則路徑錨點 (M9.937, M17.5)   - public/logo-preview.html (互動大廳)
- 邊界尺寸與無效參數降級            - 杜絕手繪舊版路徑 (m12 3-1.912)     - public/previews/ (7 尺寸獨立 SVG)
- 動態主題切換 (Dark/Light)         - 跨 18 個檔案之 0 Emoji 掃描        - Chrome/Edge Headless 截圖 (PNG)
- 全站 7 大消費端點掛載測試         - 資安防護與消毒邏輯                - 內建 --check 靜態規格快篩
```

### 1.1 需求驅動不透光測試 (Opaque-Box Testing Driven by Requirements)
所有測試案例均直接自原始需求書 (`ORIGINAL_REQUEST.md`) 與架構規格書 (`PROJECT.md`) 衍生，不依賴特定內部暫存或未公開變數，僅針對外部可觀察之 DOM 結構、SVG 向量屬性、響應式尺寸契約、主題切換與使用者流程進行斷言。

### 1.2 真實邏輯與防作弊保證 (Integrity Mandate)
全站所有測試與輔助腳本均維持實質運算與狀態維護，嚴格杜絕任何寫死假資料 (hardcoding)、虛擬外觀實作 (dummy/facade implementation) 或規避驗證的行為。

### 1.3 嚴格零 Emoji 政策 (Strict Zero-Emoji Policy)
依據工作室「純粹極簡線性美學」核心規範，全站嚴禁在原始碼、SVG 圖檔、測試檔案、標題字串、資料庫與輔助腳本中使用任何 Unicode Emoji（正規表示式：`[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]`）。

### 1.4 向量幾何一致性與零回退 (Zero Regression Policy)
全站所有端點、靜態圖檔 (`public/favicon.svg`, `public/pwa-maskable.svg`) 與外部嵌入 SDK (`public/sdk/mei-dock.js`) 必須保持完全相同的貝茲曲線與幾何特徵，且既有 178+ 單元測試與 E2E 測試必須 100% 維持綠燈通過。

---

## 2. 品牌商標重塑 4-Tier 測試分層架構 (Logo Redesign 4-Tier Test Architecture)

`src/__tests__/logoE2E.test.jsx` 涵蓋 16 項核心功能特性與 10 項極限邊界測試，分為四個測試階梯：

### Tier 1: 核心幾何向量與 7 階響應式尺寸規範 (Feature Coverage & Geometric Specifications)
- **T1-L1-01: 標準雙層複合結構**：
  驗證 `StudioLogo` 正確渲染超橢圓底座 (`.squircle-icon-badge`)、居中靈感雲朵無限環向量 (`.studio-infinity-cloud`) 與右上角靈感火花懸浮徽章 (`.studio-logo-sparkle`)。
- **T1-L1-02: Lucide 幾何線性規範**：
  驗證 SVG 具備 `strokeWidth="1.75"`、`stroke-linecap="round"`、`stroke-linejoin="round"`、`fill="none"`、`stroke="currentColor"`，且包含雙重閉合路徑（雲朵外框 + 無限符號）。
- **T1-L1-03: 7 階完整響應式尺寸支援**：
  驗證 `['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']` 每一階均能正確渲染對應之 `[data-logo-size]` 屬性與對應圖示。
- **T1-L1-04: Favicon 靜態圖檔規格同步**：
  驗證 `public/favicon.svg` 為 64x64 視口、內建超橢圓漸層底座，且路徑命中正則 `/M17\.5 19H9/` 與 `/M9\.937 15\.5/`，不含歷史手繪路徑 `m12 3-1.912`。
- **T1-L1-05: PWA Maskable 圖檔規格同步**：
  驗證 `public/pwa-maskable.svg` 為 512x512 滿版漸層背景，主體標誌嚴格居中落於直徑 409.6px (80%) 安全可視圓形區域內。
- **T1-L1-06: 跨專案 SDK (mei-dock.js) 向量同構**：
  驗證 `public/sdk/mei-dock.js` 內嵌之 `LUCIDE_SVGS.cloud` 與 `LUCIDE_SVGS.sparkles` 與本站元件向量路徑 100% 同步。

### Tier 2: 邊界、極限情境與參數容錯 (Boundary & Corner Cases)
- **T2-L2-01: 未傳入參數預設降級**：
  當 `size` 未傳入或為 `undefined` 時，系統安全回退至預設 `md` (44px) 尺寸規格，無拋錯異常。
- **T2-L2-02: 無效尺寸字串平滑容錯**：
  傳入 `"invalid-size"`, `""`, 或 `null` 等非規格字串時，平滑 fallback 至 `sizeMap.md`，維持頁面穩定不崩潰。
- **T2-L2-03: 極值尺寸幾何穩定性 (2xs 與 2xl)**：
  在超微型 `2xs` (20px) 與展示型 `2xl` (128px) 下，核心 SVG 之 `viewBox` 恆定保持 `0 0 24 24`，確保向量縮放無失真或裁切。
- **T2-L2-04: 自訂樣式類別精確透傳**：
  驗證 `className`、`badgeClassName` 與 `sparkleClassName` 能平滑融入底層 Tailwind 類別中，不覆蓋原有定位與 Flex 佈局。
- **T2-L2-05: 原生屬性與無障礙標籤透傳**：
  自訂 `data-testid`、`aria-label` 正確注入根節點，右上火花裝飾徽章具備 `aria-hidden="true"`。

### Tier 3: 跨功能組合、主題自適應與響應式交互 (Cross-Feature Combinations & State Adaptations)
- **T3-L3-01: 淺色與深色主題色彩自適應**：
  驗證底座包含 `bg-sky-500/10 dark:bg-sky-400/10`，線條包含 `text-sky-500 dark:text-sky-400`，邊框具備 `border-sky-400/25 dark:border-sky-500/25`。
- **T3-L3-02: 動態主題切換響應 (Dark Mode Toggle)**：
  在測試環境下動態對根節點切換 `dark` class，確認元件能即時自適應渲染而不產生殘留狀態。
- **T3-L3-03: 父容器 Hover 縮放交互 (scale-105)**：
  驗證商標置入群組按鈕 (`group`) 時，`group-hover:scale-105` 與過渡動畫能平滑疊加，內部向量不產生邊緣閃爍或位移。

### Tier 4: 全站端點一致性呈現、真實使用者旅程與 Zero Emoji 檢驗 (Real-World Endpoints Delivery)
- **T4-L4-01: 開場動畫大廳 (`PortalEntrance`)**：
  驗證開場全螢幕動態大廳中心正確掛載 `StudioLogo size="xl"` (`.portal-core-emblem`)。
- **T4-L4-02: 頂部黏性導覽列 (`HeaderHero`)**：
  驗證頂欄品牌點位掛載 `StudioLogo size="md"`，並具備懸浮過渡類別。
- **T4-L4-03: 手機底部固定導覽列 (`MobileBottomNav`)**：
  驗證行動版底部導覽列「大廳總覽」按鈕精確掛載 `StudioLogo size="xs"`。
- **T4-L4-04: 管理員 AI 客服助理視窗 (`AdminChatWidget`)**：
  驗證展開之 AI 客服對話面板頂欄正確渲染 `StudioLogo size="xs"`。
- **T4-L4-05: 跨裝置 QR-Code 彈窗 (`QRCodeModal`)**：
  驗證彈出視窗標題區正確掛載 `StudioLogo size="md"`。
- **T4-L4-06: 管理員中樞解鎖視窗 (`AdminUnlockModal`)**：
  驗證安全 PIN 碼解鎖面板頂部標誌掛載 `StudioLogo size="md"`。
- **T4-L4-07: 全域命令列搜尋調色盤 (`CommandPalette`)**：
  驗證搜尋彈窗項目與頁尾同時精確掛載 `StudioLogo size="sm"` 與 `size="xs"`。
- **T4-L4-08: 全站原始碼與靜態資源 Zero Emoji 嚴格稽核**：
  全面掃描元件原始碼、靜態向量圖檔與 SDK 內容，確保 0 處 Unicode Emoji 違規。

---

## 3. 7 階響應式尺寸標準規格表 (7-Tier Responsive Sizing Matrix)

| 尺寸代號 | 規格定位 | 底座尺寸 (`box`) | 底座圓角 | 核心向量大小 (`icon`) | 火花外框 (`sparkleBox`) | 火花圖示大小 (`sparkleIcon`) | 主要應用端點 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| `2xs` | 超微縮型 | `w-5 h-5` (20px) | `rounded-[6px]` | 11px | `w-3 h-3 -top-0.5 -right-0.5` | 6px | 超微縮行內標籤、極致微型狀態點 |
| `xs` | 緊湊型 | `w-6 h-6` (24px) | `rounded-[8px]` | 13px | `w-3.5 h-3.5 -top-1 -right-1` | 8px | 手機底欄 (`MobileBottomNav`)、AI 客服頂欄 (`AdminChatWidget`)、Cmd+K 頁尾 |
| `sm` | 小型 | `w-9 h-9` (36px) | `rounded-[12px]` | 18px | `w-4 h-4 -top-1 -right-1` | 9px | 全域命令列品牌列 (`CommandPalette`)、頁尾版權列 |
| `md` | 標準型 (預設) | `w-[44px] h-[44px]` (44px) | `rounded-[14px]` | 22px | `w-5 h-5 -top-1 -right-1` | 11px | 頂部主導覽列 (`HeaderHero`)、管理員解鎖彈窗、QR-Code 彈窗 |
| `lg` | 增強型 | `w-[56px] h-[56px]` (56px) | `rounded-[18px]` | 28px | `w-6 h-6 -top-1.5 -right-1.5` | 13px | 專案焦點看板、特性卡片徽章 |
| `xl` | 主視覺型 | `w-20 h-20 sm:w-24 sm:h-24` (80~96px) | `rounded-[26px] sm:rounded-[30px]` | 46px | `w-8 h-8 sm:w-9 sm:h-9 -top-2 -right-2` | 18px | 載入大廳開場核心 (`PortalEntrance`)、Hero 視覺中心 |
| `2xl` | 旗艦展示型 | `w-28 h-28 sm:w-32 sm:h-32` (112~128px) | `rounded-[32px] sm:rounded-[36px]` | 60px | `w-10 h-10 sm:w-11 sm:h-11 -top-2.5 -right-2.5` | 22px | 大螢幕劇院展演、品牌發布會、高解析度旗艦展示 |

---

## 4. 判定標準矩陣 (Pass/Fail Criteria Matrix)

| 檢驗維度 | 檢驗項目 | 合格門檻 (Pass Threshold) | 不合格判定 (Fail Condition) | 驗證工具 |
|:---|:---|:---|:---|:---|
| **商標 E2E 測試** | `src/__tests__/logoE2E.test.jsx` | 100% 通過 (所有 Tier 1-4 案例通過) | 任何 1 個測試案例未通過或被略過 | `npx vitest run src/__tests__/logoE2E.test.jsx` |
| **全站整合測試** | `npm test` | 全套測試檔案 100% 通過 | 任何舊有或新增測試失敗 | `npm test` |
| **靜態合規與資安** | `scripts/verify-hub.mjs` | 7 項子測試全數通過 (0 fail) | 向量正則未命中或含 `m12 3-1.912` | `node scripts/verify-hub.mjs` |
| **Zero Emoji 稽核** | 全站原始碼與資產 | 0 個 Unicode Emoji 字符 | 偵測到任何 Emoji 字元 | `EMOJI_REGEX` 靜態掃描 |
| **7 階尺寸規格** | `StudioLogo` 尺寸覆蓋 | 支援 7 階尺寸且正確渲染 | 缺少 `2xs` 或 `2xl` 或未正確定義 | `app.test.jsx` & `logoE2E.test.jsx` |
| **預覽生成與檢驗** | 視覺成果與截圖 | 產出 HTML、7 階 SVG 與 PNG 對比圖 | 腳本報錯或產出檔案為空 | `node scripts/generate-logo-previews.mjs` |
| **靜態規格快篩** | 預覽腳本 `--check` | 退出碼 0，通過幾何與線寬檢驗 | 退出碼 1 或線寬不符 1.75 | `node scripts/generate-logo-previews.mjs --check` |

---

## 5. 常用驗證指令集 (Verification Commands Reference)

```powershell
# 1. 執行專屬商標 E2E 測試套件
npx vitest run src/__tests__/logoE2E.test.jsx

# 2. 執行全站所有單元與端對端測試
npm test

# 3. 執行中樞靜態合規與向量路徑稽核
node scripts/verify-hub.mjs

# 4. 執行預覽腳本規格靜態快篩
node scripts/generate-logo-previews.mjs --check

# 5. 產出完整視覺預覽展示頁面、7 尺寸向量圖與 PNG 對比截圖
npm run preview:logo
# 或直接呼叫
node scripts/generate-logo-previews.mjs

# 6. 生產環境建置驗證
npm run build
```
