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
