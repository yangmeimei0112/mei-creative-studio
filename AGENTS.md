# 咩創意工作室 (Mei Creative Studio) — Workspace Engineering Rules

## 1. 行動端多比例響應式規範 (Multi-Aspect-Ratio Mobile Adaptation)
- **動態視窗高度 (`dvh`)**：全站主容器、抽屜與彈窗必須優先使用 `dvh` 單位（`.min-h-dvh-screen`、`.h-dvh-90`、`.max-h-dvh-92`、`.max-h-dvh-90`、`.max-h-dvh-85`、`.max-h-dvh-60` 並保留 `vh` 退路），防止 iOS Safari 與 Android Chrome 動態網址列裁切底部操作鈕。
- **四大長寬比自適應矩陣**：
  1. **窄屏 / 摺疊外螢幕 (`21:9 ~ 22:9`, `320px–360px`)**：主標題使用 `clamp()` 流體字級（`.studio-hero-title-zh` / `.studio-hero-title-en`）；`≤374px` 時標語取消強制兩端對齊以防字距拉寬；頂部導覽列會員名稱須加上 `truncate` 與最大寬度限制。
  2. **主流直向手機 (`16:9 ~ 20:9`, `375px–430px`)**：維持單欄卡片、底部單手導覽列與安全區域內距（`env(safe-area-inset-*)`）。
  3. **摺疊內螢幕 / 小平板 (`4:3 ~ 1:1`, `600px–840px`)**：Bento 專案網格自 `sm:` (`640px+`) 與 `.foldable-inner-grid` 起啟用雙欄排版（精選焦點卡片 `sm:col-span-2`）。
  4. **手機橫向短高模式 (`orientation: landscape` 且 `max-height: 500px`)**：自動套用 `.mobile-header-bar`、`.mobile-bottom-nav` 與 `.landscape-compact-modal` 收斂上下導覽列與彈窗高度。
- **內嵌沙盒預覽比例切換**：`ProjectPreviewDrawer` 必須支援 `電腦視角`、`摺疊/平板` (`aspect-[4/3]`) 與 `手機視角` (`aspect-[9/16]`) 彈性縮放，禁止寫死超出小螢幕高度的固定像素容器。

## 2. 狀態通知膠囊 (Toast) 視覺對比與防重疊規範
- **亮色模式高對比淡藍底色**：`[data-testid="studio-toast"]` 在亮色模式下必須使用淡藍色高對比底色 `bg-sky-100/95`、深色文字 `text-slate-900` 與邊框 `border-sky-300/80`（深色模式為 `dark:bg-sky-950/95 dark:text-white dark:border-sky-400/40`），嚴禁使用透明或純白底色。
- **行動端浮動元件防重疊**：在手機端當管理員模式解鎖（顯示右下角 `admin-chat-fab`）時，Toast 必須自動上移至 `bottom-36 sm:bottom-24`，並加上 `max-w-[calc(100vw-2rem)]` 防止窄屏溢位。

## 3. 全站聯通雲端會員認證規範 (Supabase Cloud SSO v2.0 — 方案二)
- 嚴格採用 `@supabase/supabase-js` 真實雲端認證（Google OAuth 主力登入、Apple OAuth 預留介面與降級防護、Email 登入/註冊、Passkey 生物辨識）。
- 嚴禁重新引入本地假會員產生器、`MEI-SSO-` 跨裝置漫遊碼或雙軌混合分頁。
- 與 `MeiStudyFlow` 共用 Supabase 實例時，所有工作室資料表必須維持 `mei_member_` 前綴隔離與 `FORCE ROW LEVEL SECURITY`。

## 4. 零系統 Emoji 與品牌視覺規範
- 全站原始碼、SVG、HTML 與測試檔案嚴格禁止任何系統 Unicode Emoji，100% 使用 Lucide 向量圖示（`strokeWidth=1.75`、`absoluteStrokeWidth=true`）。
- 品牌標誌 `StudioLogo` 嚴格維持 Candidate F 雲朵無限幾何路徑與 7 級尺寸規範（`2xs` 至 `2xl`）。

## 5. 任務狀態回報與多代理監控紀律 (Task Status Reporting Integrity & Anti-Noise Protocol)
- **靜默過濾純心跳檢查**：攔截 `[Sentinel Liveness Check]` 或僅表達「運作正常／請稍候」且無實質代碼或閘門狀態變更的訊息，嚴禁轉發給使用者；僅於任務完成、里程碑狀態切換（過閘或退回）、發生阻塞／錯誤／重啟、或需要使用者輸入資料時才回報。
- **零幻覺與零重複贅詞**：嚴格依據實際讀取的檔案（`GATE_STATUS.md`、`handoff.md`、`git status`）或子代理已送達的明確內容回報；禁止推測或預先編造「第 N 輪」尚未發生的進度，並禁止於訊息尾端重複貼上「請稍候」模板語句。
- **子軌道閘門直讀查核**：彙整多代理（Teamwork）進度前，必須直接核對所有活躍子協調員的 `GATE_STATUS.md`（不可只看頂層 `progress.md`）；凡出現 `FAIL`、`REQUEST_CHANGES` 或 `INTEGRITY VIOLATION`，必須如實標註「審查退回／待修復項目」及影響檔案。
- **佇列合併與單一固定狀態看板**：多條非同步通知同時抵達或系統重啟恢復時，必須合併去重為**單一結構化狀態看板**，固定分四欄呈現：`已完成`、`進行中`、`待處理／阻礙與退回原因`、`需要您配合或輸入的事項`。
- **防刷屏派遣規範**：啟動 `teamwork` 等長駐背景協調器時，必須明確指定 Sentinel 僅在事件觸發（里程碑完成／閘門退回／需要使用者輸入／停滯超過 20 分鐘異常）時主動回報，禁止定時發送純健康確認訊息。
