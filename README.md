# 咩創意工作室 Mei Creative Studio — 跨平台專案導引大廳

> **核心視覺哲學：晴空雲朵淡藍 (`#38BDF8`) × 現代極簡 Bento Grid × 100% 純粹 Lucide (`strokeWidth: 1.75`) 符號系統**
> 支援 **iOS、Android 手機／平板** 與 **macOS、Windows 桌面系統** 跨平台即開即用、PWA 桌面安裝、內嵌沙盒預覽、QR-code 跨裝置開啟與 `mei-dock.js` 子專案一鍵返回大廳。

---

## 1. 快速啟動指南 (Quick Start)

```bash
# 1. 安裝依賴套件
npm install

# 2. 啟動本地開發伺服器 (支援混合式資料持久化 API)
npm run dev

# 3. 執行自動化單元與整合測試
npm test

# 4. 打包正式環境版本
npm run build
```

* **預設管理員解鎖密碼**：`mei888`（解鎖後可查看私人專案、直接於介面新增/編輯/排序專案、挑選 Lucide 圖示與匯出/匯入 JSON 備份）。

---

## 2. 六大核心功能與配套措施

1. **晴空雲霧散開 × 空間景深推進開場動畫 (`PortalEntrance`)**
   * 同分頁首次進入自動演出發光雲朵與極光能量環、四向立體雲層散開與空間景深推進動畫，並同步帶出大廳卡片物理彈簧波浪浮現；重整頁面時直接以流暢卡片波浪快速呈現，且支援點擊／`Esc` 略過與隨時重播。
2. **雙模式智慧專案導引（內嵌沙盒預覽 ＋ 獨立全螢幕啟動）**
   * 點擊卡片「快速預覽 (`panel-right-open`)」可於大廳抽屜內直接互動預覽子專案，並支援一鍵切換「電腦視角 (`monitor`)」與「手機視角 (`smartphone`)」。
3. **全域極速搜尋與多維度篩選 (`Cmd/Ctrl + K`)**
   * 內建三大核心領域分類（`AI 與自動化工具`、`網站與商業應用`、`互動設計與多媒體`）、連線運作狀態與四種排序方式篩選，隨時按 `Cmd/Ctrl + K` 喚出命令列。
4. **專案即時連線狀態巡檢 (Live Health Check)**
   * 自動探測各連接專案健康度與回應延遲毫秒數（`Online` / `Beta` / `Maintenance` / `Offline`）。
5. **手機 × 電腦跨裝置 QR-code (Cross-Device QR-code)**
   * 電腦瀏覽時點擊「QR-code (`qr-code`)」展開晴空淡藍專屬 QR Code 卡，拿起 iOS / Android 手機一掃即開。
6. **管理員解鎖私人專案 ＋ 視覺化管理後台（內建 48 款 Lucide 圖示挑選器）與子專案返回膠囊 (`/sdk/mei-dock.js`)**
   * 未解鎖時僅展示公開專案；輸入 `mei888` 解鎖後可檢視私人專案、透過視覺化 Lucide 圖示挑選面板新增/編輯專案，並支援 JSON 一鍵備份還原。任何子專案只需貼上一行 `<script>`，畫面右下角即浮現可自由拖曳的晴空淡藍「返回咩創意大廳」導覽膠囊：

```html
<!-- 咩創意工作室 Mei Creative Studio：返回大廳懸浮導覽膠囊 -->
<script
  src="/sdk/mei-dock.js"
  data-hub-url="/"
  data-project-name="您的子專案名稱"
  data-position="bottom-right"
  defer
></script>
```
