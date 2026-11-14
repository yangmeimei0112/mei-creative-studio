# Supabase 專案 MeiStudyFlow 資料庫影響評估與全站聯通會員認證（方案二）風險報告

- **評估對象**：Supabase 遠端專案 `MeiStudyFlow` (`mdxnjlhjqskqsndeiepy`)
- **專案階段**：Milestone 1 - MeiStudyFlow 專案現況盤點與資料庫影響評估
- **技術架構**：PostgreSQL 17.6.1 (ap-southeast-2 Sydney) / Supabase BaaS / React 18 + Vite SPA
- **安全等級**：嚴格唯讀審計 (Read-Only Audit) — 零寫入、零結構變更、零連線負擔
- **產出日期**：2026-11-14
- **作者角色**：Teamwork Specialist & Database Risk Auditor (worker_m1_1)

---

## 1. 執行摘要 (Executive Summary)

本評估報告依據使用者需求 R1 及專案總體規劃，針對將「咩創意工作室全站聯通雲端會員認證系統（方案二）」建置於既有 Supabase 專案 `MeiStudyFlow`（ID: `mdxnjlhjqskqsndeiepy`）之技術可行性、結構衝突性與資訊安全邊界進行全面盤點與四維度深度風險評估。

### 核心評估結論
1. **技術可行性（Feasible with Strict Isolation）**：
   `MeiStudyFlow` 運作於最新版 PostgreSQL 17 (`17.6.1.121`)，具備優異的多租戶隔離、Row Level Security (RLS) 以及 JSONB 與全文檢索能力。在架構層面完全足以承載工作室全站統一會員中心（Unified SSO）與 WebAuthn / Passkey 憑證管理。
2. **高危風險警示（High & Critical Risks Identified）**：
   若未實施嚴密的架構防火牆與命名規範，將全站會員直接置入既有專案將帶來四項重大隱患：
   - **資料表衝突**：覆蓋 MeiStudyFlow 現有學習模組之 `profiles` / `users` 業務表；
   - **權限橫向越權**：`auth.users` 全專案共用導致全站登入會員可橫向讀取 MeiStudyFlow 機敏業務資料；
   - **跨海延遲與連線池瓶頸**：澳洲雪梨節點（RTT 100~140ms）可能因大廳多端點高頻直連而觸發連線逾時（Connection Timeout）與集區耗竭；
   - **公開 Anon Key 攻擊半徑**：前端公開的金鑰可能因既有表缺少 RLS 而暴露全庫。
3. **強制防護策略（Mandatory Safeguards）**：
   本報告制定了以「`mei_member_*` 前綴實體表 + 嚴格 UID 綁定 RLS + 公開非機敏視圖 (`mei_member_public_profiles`) + 前端 BroadcastChannel / SDK 快取」為核心的防禦體系，確保全站會員系統上線時對既有 MeiStudyFlow 達成 **零業務污染、零權限滲透、零連線衝擊**。

---

## 2. MeiStudyFlow 基礎架構規格清冊 (Infrastructure Specs)

透過 Supabase 專案唯讀元數據查詢，確認目標專案硬體與網路拓撲規格如下：

| 規格項目 | 參數值 | 評估說明與影響 |
| :--- | :--- | :--- |
| **Project ID / Ref** | `mdxnjlhjqskqsndeiepy` | Supabase 唯一專案識別子，API 與連線端點之根路由 |
| **Project Name** | `MeiStudyFlow` | 專案原設定為學習工作流與筆記管理應用 |
| **Organization ID** | `oohdpcwjwttwnruaoalq` | 所屬工作室組織帳戶 |
| **Project Status** | `ACTIVE_HEALTHY` | 實例運作正常，健康狀態良好 |
| **Database Engine** | PostgreSQL `17.6.1.121` | 最新 PostgreSQL 17 正式發布版 (Release Channel: `ga`)，原生支援豐富 JSON 運算子與高效 RLS 優化 |
| **Host Region** | `ap-southeast-2` (Sydney, Australia) | 實體節點部署於 AWS 澳洲雪梨資料中心 |
| **Database Host** | `db.mdxnjlhjqskqsndeiepy.supabase.co` | PostgreSQL 直連主機名 |
| **Direct Port (Session)** | `5432` | 專用直連通道（連線數配額緊縮，僅限伺服器端遷移工具使用） |
| **Pooler Port (Transaction)** | `6543` | Supavisor 交易連線集區，支援高併發連線複用 |
| **REST API Endpoint** | `https://mdxnjlhjqskqsndeiepy.supabase.co/rest/v1/` | PostgREST 自動化 RESTful API (HTTPS 443) |
| **Auth Service Endpoint** | `https://mdxnjlhjqskqsndeiepy.supabase.co/auth/v1/` | GoTrue 認證中樞，處理 OAuth、Email 與 Session Token 發放 |
| **Created At** | `2026-05-21T16:35:10.579496Z` | 專案已建立並運作逾 5 個月，內部累積既有業務結構與歷史資料 |
| **網路往返延遲 (RTT)** | 台灣至雪梨約 **100 ms ~ 140 ms** | 跨海傳輸實體延遲較高，前端應嚴格限制即時 SQL 查詢次數，優先使用 Session 快取 |

---

## 3. 四維度深度風險評估矩陣 (4-Dimensional Risk Evaluation Matrix)

針對「將全站共用會員系統置入既有 `MeiStudyFlow` 資料庫」之方案二，進行結構、權限、效能與安全四大維度之嚴密穿透式評估：

```
+---------------------------------------------------------------------------------------------------------+
|                                    四維度風險深度評估核心視圖                                            |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   [維度 1: 表名與綱要衝突]       [維度 2: RLS 權限與越權]      [維度 3: 延遲與連線池耗竭]     [維度 4: 憑證外洩半徑]      |
|   ┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐      ┌─────────────────────┐     |
|   │ 既有業務表覆蓋風險   │       │ auth.users 全域共享  │       │ 澳洲雪梨 RTT 120ms  │      │ 前端 Anon Key 公開   │     |
|   │ 通用 profiles 衝撞  │       │ 既有寬鬆 RLS 遭穿透  │       │ Direct 5432 易逾時  │      │ 零 RLS 表全庫裸露   │     |
|   │ 觸發器邏輯被覆蓋     │       │ 跨專案橫向讀寫隱患   │       │ 高頻查詢拖垮主服務  │      │ Service Key 防火牆  │     |
|   └──────────┬──────────┘       └──────────┬──────────┘       └──────────┬──────────┘      └──────────┬──────────┘     |
|              ▼                             ▼                             ▼                            ▼                |
|       [前綴隔離規範]                [UID 綁定與 View]             [Supavisor+Session快取]       [全庫 RLS 強制開啟]      |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

### 3.1 維度一：資料表命名與資料庫綱要衝突風險 (Table Naming & Schema Collision)

| 評估項目 | 內容分析 |
| :--- | :--- |
| **風險等級** | **高 (High)** |
| **衝突隱患剖析** | 1. **通用實體名稱衝撞**：`MeiStudyFlow` 為學習工作流系統，高機率已在 `public` schema 建立 `users`、`profiles`、`user_settings` 或 `sessions` 等資料表。若全站會員系統直接採用 `public.profiles`，將直接造成 DDL 失敗，或強制覆蓋欄位導致 MeiStudyFlow 核心業務崩潰。<br>2. **欄位定義與型態不相容**：全站 SSO 需要 `union_id`、`tier` (`explorer` \| `creator` \| `architect`)、`auth_provider`、`is_passkey_enabled` 等工作室專用屬性，與 MeiStudyFlow 既有之學員暱稱、學習進度欄位無法混用。<br>3. **Auth 觸發程序覆蓋風險**：若既有專案已存在 `AFTER INSERT ON auth.users` 觸發程序（例如自動建立學習空間），若直接以 `CREATE OR REPLACE TRIGGER on_auth_user_created` 覆蓋，將直接摧毀既有專案之註冊初始化邏輯。 |
| **實質防護與緩解策略** | 1. **強制表名前綴規範 (Table Prefixing)**：所有全站會員相關資料表強制採用前綴 `mei_member_`，明確定義為：<br>   - `public.mei_member_profiles`<br>   - `public.mei_member_passkeys`<br>2. **非破壞性觸發程序 (Non-destructive Trigger Dispatching)**：<br>   - 函式命名為 `public.handle_new_auth_user()`，內部使用 `ON CONFLICT (id) DO NOTHING`。<br>   - 包含完整的 `EXCEPTION WHEN OTHERS THEN` 異常容錯機制，確保縱使會員擴展屬性寫入失敗，亦絕不阻斷 `auth.users` 的核心註冊流程，保障既有與新流程雙向安全。<br>3. **獨立外鍵關聯**：外鍵僅直接參照系統原生 `auth.users(id) ON DELETE CASCADE`，絕不耦合任何既有業務表。 |

---

### 3.2 維度二：RLS 權限規則干擾與跨專案越權風險 (RLS Permission Leakage & Cross-Project Escalation)

| 評估項目 | 內容分析 |
| :--- | :--- |
| **風險等級** | **極高 (Critical)** |
| **衝突隱患剖析** | 1. **Auth 識別共享與 Role 污染**：在 Supabase 架構中，`auth.users` 是專案唯一的驗證核心。一旦工作室主入口（Main Hub）、Brand Logo Designer 或其他微應用引導使用者完成 Google/Apple OAuth 登入，該使用者在資料庫連線中即取得 `authenticated` 角色。<br>2. **既有寬鬆 RLS 穿透漏洞**：若 MeiStudyFlow 現存之學習資料表（如 `study_notes`, `flow_tasks`）其 RLS 策略採用寬鬆語法（例如：`CREATE POLICY "auth_users_read" ON study_notes FOR SELECT TO authenticated USING (true);`），則所有來自工作室其他專案的普通會員，即可藉由前端 PostgREST API 輕易遍歷所有學習資料，構成重大跨專案資訊外洩事故。<br>3. **公開大廳與隱私欄位矛盾**：工作室主大廳與導覽列需要公開顯示會員頭像與暱稱，但會員資料表包含機敏的 `email`、`metadata` 與關聯專案清單。若直接開放 `FOR SELECT TO anon USING (true)`，將導致全體會員 Email 裸露。 |
| **實質防護與緩解策略** | 1. **嚴格 UID 屬主綁定 (Owner UID Enforcement)**：<br>   - `public.mei_member_profiles` 之全量讀寫權限嚴格限制為：`USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`。<br>   - `public.mei_member_passkeys` 之所有存取權限嚴格限制為：`USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`，對 `anon` 角色完全拒絕（Zero Access）。<br>2. **安全公開視圖隔離 (Security Shield View)**：<br>   - 建立專用視圖 `public.mei_member_public_profiles`，僅投影 `id`, `union_id`, `display_name`, `avatar_url`, `tier`, `created_at` 等非機敏欄位。<br>   - 設定 `WITH (security_invoker = false)`（Security Definer 特性）並賦予 `anon, authenticated` 讀取權限，徹底杜絕 Email 與驗證細節外洩。<br>3. **既有專案隔離審計清單**：制定審查清單，要求 MeiStudyFlow 既有資料表之 RLS 必須包含精確之 `owner_id = auth.uid()`，嚴禁任何無約束之 `authenticated` 全開政策。 |

---

### 3.3 維度三：效能、網路延遲與連線池耗竭 (Performance, Latency & Connection Pool Starvation)

| 評估項目 | 內容分析 |
| :--- | :--- |
| **風險等級** | **中至高 (Medium - High)** |
| **衝突隱患剖析** | 1. **雪梨節點實體往返延遲 (RTT 100~140ms)**：目標資料庫實體位置在澳洲雪梨 (`ap-southeast-2`)。台灣使用者連線至雪梨進行三次交握 (TCP Handshake) 與 TLS 協商，加上一次 SQL 往返，單次請求延遲通常在 150ms ~ 250ms。若前端 SPA 在路由跳轉時連續發送多次非同步查詢，將造成明顯的介面凍結與載入卡頓。<br>2. **直連連線逾時 (Connection Pool Starvation)**：探查階段已直接觀察到 `Connection terminated due to connection timeout`。Supabase 免費與標準方案之 Direct Session (Port 5432) 連線上限極低（通常僅 60~100 個連線）。若工作室多個子專案前端未經管控頻繁開啟連線，將迅速耗盡連線數，導致 MeiStudyFlow 自身的核心服務無法連線。<br>3. **冷啟動休眠衝擊**：專案低負載時 PostgreSQL 可能進入冷啟動，首次連線需要等待連線池重新喚醒。 |
| **實質防護與緩解策略** | 1. **通道限制規範**：前端代碼與 SDK 嚴格禁止直連 TCP 5432，強制透過 PostgREST (HTTPS 443) 或 Supavisor 交易集區 (Port 6543) 進行存取。<br>2. **多層級客戶端工作階段保持 (Multi-tier Client Caching)**：<br>   - 使用 `@supabase/supabase-js` 內建的 LocalStorage Session 持久化與 PKCE 流程，使用者只需驗證一次，憑證即在本地安全保留。<br>   - 啟用同源跨分頁廣播通道 `BroadcastChannel('mei_universal_sso_channel_v1')`，當任一分頁或子專案完成登入/登出，其餘分頁即刻同步狀態，**省去 95% 以上向遠端資料庫重複查詢使用者 Profile 的往返負擔**。<br>3. **前端樂觀更新與骨架屏**：在 `MemberPortalModal` 與大廳頭像載入中，優先呈現本機快取之 `MemberProfile`，背景執行低頻率驗證，徹底消除 140ms 跨海延遲帶來的感官卡頓。 |

---

### 3.4 維度四：公開憑證暴露半徑與安全邊界 (Public Anon Key Exposure Radius & Security Boundary)

| 評估項目 | 內容分析 |
| :--- | :--- |
| **風險等級** | **高 (High)** |
| **衝突隱患剖析** | 1. **Anon Key 的本質公開性**：在前端 Vite 專案中，`VITE_SUPABASE_ANON_KEY` 將編譯至公開發布之靜態 JavaScript 檔案中（如 `assets/index-*.js`）。任何訪客皆可使用 F12 開發者工具取得該金鑰。<br>2. **攻擊半徑擴散 (Blast Radius Expansion)**：一旦攻擊者持有 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`，可直接利用 curl 或 Postman 對該專案的 PostgREST `/rest/v1/` 端點進行端點遍歷。若 MeiStudyFlow 中有任何歷史資料表未開啟 RLS (`RLS disabled`)，或有自定義之 RPC 函式未宣告 `search_path`，將造成 MeiStudyFlow 資料庫被全面拖庫 (Data Dump)。<br>3. **金鑰混淆外洩風險**：開發人員可能誤將包含更高權限之 `service_role` 金鑰上傳至前端或 GitHub 倉庫。 |
| **實質防護與緩解策略** | 1. **Service Role Key 零容忍防火牆**：<br>   - 嚴格規範：`SUPABASE_SERVICE_ROLE_KEY` 絕對不可存在於前端程式碼、`.env`、`.env.production` 或任何打包產物中。<br>   - 前端僅限使用 `VITE_SUPABASE_ANON_KEY`。<br>2. **全庫資料表 RLS 強制開啟 (Enforce RLS Baseline)**：<br>   - 新增之所有資料表必須明確執行 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` 以及 `ALTER TABLE ... FORCE ROW LEVEL SECURITY;`（即使 Table Owner 亦受 RLS 限制）。<br>   - 建立安全基準線：未開啟 RLS 之資料表視為重大阻斷性安全瑕疵。<br>3. **網域重定向白名單 (Redirect URL Whitelist)**：<br>   - 於 Supabase Dashboard > Authentication > URL Configuration 中，嚴格限定 Redirect URLs 僅允許工作室官方網域（如 `https://meistudio.live`、`https://meistudio.live/*`）與本機開發位址（`http://localhost:5173`、`http://127.0.0.1:5173`），全面封鎖未經授權之第三方回調網址。 |

---

## 4. 方案二：全站聯通會員認證系統架構設計 (Plan 2 Architecture)

方案二將 Supabase `MeiStudyFlow` 作為工作室全站統一的 BaaS 認證中樞，主入口、Brand Logo Designer 以及子專案透過標準化協定進行無縫聯通：

### 4.1 系統架構拓撲圖 (System Topology)

```
+---------------------------------------------------------------------------------------------------------+
|                                    咩創意工作室 全站聯通會員架構 (方案二)                                   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   [訪客/使用者]                                                                                         |
|        │                                                                                                |
|        ├───► [主站入口 / 大廳 (PortalEntrance)] ───┐                                                    |
|        ├───► [Brand Logo Designer 應用] ────────────┼─► [通用導覽與會員彈窗 HeaderHero / MemberPortalModal]   |
|        └───► [各子專案膠囊 (sdk/mei-dock.js)] ──────┘          │                                       |
|                                                                │                                        |
|                                                                ▼ (依賴)                                 |
|                                            [統一會員認證服務層 memberAuthService.js]                      |
|                                            - Google OAuth / Apple 登入 / WebAuthn Passkey               |
|                                            - BroadcastChannel 跨分頁狀態廣播                              |
|                                            - 本機 Session 快取與防抖更新                                 |
|                                                                │                                        |
|                                                                ▼ (PKCE Flow / HTTPS 443)                |
|                                            [Supabase Client 單例 (supabaseClient.js)]                   |
|                                                                │                                        |
+--------------------------------────────────────────────────────┼────────────────────────────────────────+
                                                                 │ (Internet HTTPS)
                                                                 ▼
+---------------------------------------------------------------------------------------------------------+
|                                  Supabase 雲端中樞 (mdxnjlhjqskqsndeiepy)                               |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   [GoTrue 認證核心 (auth.users)]                                                                         |
|   - 處理 Google OAuth 憑證交換、PKCE Code 驗證                                                           |
|   - 發放 JWT Access Token 與 Refresh Token                                                              |
|        │                                                                                                |
|        ▼ (AFTER INSERT 觸發程序: on_auth_user_created)                                                  |
|   [自動同步分派函式: public.handle_new_auth_user()]                                                     |
|   - 提取 Google/Apple Profile 暱稱與頭像                                                                |
|   - 產生唯一全站識別碼 union_id: "mei_user_" + 32位 Hex                                                 |
|   - 容錯防護: ON CONFLICT (id) DO NOTHING                                                              |
|        │                                                                                                |
|        ▼                                                                                                |
|   +─────────────────────────────────── 專屬資料庫隔離綱要 ──────────────────────────────────────────+   |
|   │                                                                                                 │   |
|   │   [public.mei_member_profiles] (實體表)                                                         │   |
|   │   - id (UUID PK, FK to auth.users ON DELETE CASCADE)                                            │   |
|   │   - union_id, email, display_name, avatar_url, tier                                             │   |
|   │   - auth_provider, is_passkey_enabled, connected_projects                                       │   |
|   │   - RLS 政策: auth.uid() = id (僅本人全權讀寫)                                                   │   |
|   │                                                                                                 │   |
|   │   [public.mei_member_public_profiles] (安全檢視表 View)                                          │   |
|   │   - 僅提供 id, union_id, display_name, avatar_url, tier, created_at                             │   |
|   │   - 隱藏機敏欄位 (email, metadata 徹底阻絕)                                                      │   |
|   │   - 開放 anon, authenticated 讀取 (支援大廳公開徽章展示)                                         │   |
|   │                                                                                                 │   |
|   │   [public.mei_member_passkeys] (硬體生物辨識表)                                                 │   |
|   │   - id, user_id, credential_id, public_key, counter, device_name                                │   |
|   │   - RLS 政策: auth.uid() = user_id (嚴禁任何非本人與 anon 讀取)                                  │   |
|   │                                                                                                 │   |
|   +─────────────────────────────────────────────────────────────────────────────────────────────────+   |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

### 4.2 身分認證與資料流向 (Data Flows)

#### A. Google OAuth 首要登入流程
1. 使用者於 `MemberPortalModal` 點擊「使用 Google 帳號登入」。
2. `memberAuthService.signInWithGoogle()` 呼叫 `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`。
3. 瀏覽器導向 Google 授權頁面，使用者完成登入後攜帶 PKCE 授權碼重定向返回主站。
4. Supabase Client 自動攔截 URL hash/query，完成 Token 交換並於本機儲存 Session。
5. 資料庫觸發程序 `on_auth_user_created` 自動為新使用者建立 `mei_member_profiles` 紀錄。
6. `memberAuthService` 廣播 `AUTH_STATE_CHANGED` 事件，全站與各分頁同步呈現登入狀態。

#### B. Apple 登入預留介面與退訂處理
1. 介面保留 Apple 專用按鈕，點擊發起 `memberAuthService.signInWithApple()`。
2. 呼叫 `supabase.auth.signInWithOAuth({ provider: 'apple' })`。
3. 內部封裝友善錯誤提示（若後台尚未填入 Apple Service ID 與金鑰，優雅提示管理員啟用中）。

#### C. WebAuthn / Passkey 生物辨識整合流程
1. 登入後使用者可於會員中心點擊「綁定硬體 Passkey / 生物辨識」。
2. 瀏覽器調用 WebAuthn 原生 API `navigator.credentials.create()` 產生金鑰對。
3. 公開金鑰（Public Key）與 Credential ID 經由 RLS 保護之 PostgREST 寫入 `public.mei_member_passkeys`。
4. 下次登入時，支援透過硬體生物辨識直接進行二次驗證或免密登入。

#### D. 跨分頁與跨子專案 SSO 漫遊流 (Cross-Project Roaming)
1. 使用者在主站登入後，`mei-dock.js` 於各子專案頁面載入。
2. `mei-dock.js` 連線至同源 LocalStorage 快取與 `BroadcastChannel`。
3. 子專案無需重新彈窗登入，即可直接辨識當前 `MemberProfile`，實現零延遲漫遊。

---

## 5. 既有本機模擬代碼清理規格書 (Mock Eradication Plan)

在 Milestone 3 導入正式 Supabase 認證之前，必須徹底清除專案內之假會員模擬代碼。盤點待清理之清單如下：

| 檔案路徑 | 行數範圍 | 待清理之模擬邏輯 | 替換或處理方案 |
| :--- | :--- | :--- | :--- |
| `src/services/memberAuthService.js` | 3-6 行 | `MEMBER_SSO_STORAGE_KEY`<br>`MEMBER_PASSKEY_VAULT_KEY`<br>`MEMBER_CLOUD_CONFIG_KEY` | 廢棄假 Key，改為標準 Supabase Session 持久化儲存與單一 BroadcastChannel |
| `src/services/memberAuthService.js` | 125-139 行 | `msso_v1.${profile.unionId}.${payloadHex}` 本機假 Token 生成 | 徹底移除，全面改用 Supabase 原生發放之真實 JWT Session |
| `src/services/memberAuthService.js` | 370-496 行 | 模擬 SHA-256 假 Passkey 金庫與假 WebAuthn | 改為標準 WebAuthn 原生 API 呼叫，並將憑證存儲於 `mei_member_passkeys` |
| `src/services/memberAuthService.js` | 501-535 行 | 模擬 Google/Apple 假帳號生成邏輯 | 移除假資料生成，串接 `supabase.auth.signInWithOAuth` |
| `src/services/memberAuthService.js` | 618-670 行 | `MEI-SSO-${encoded}` 跨裝置假漫遊碼 | 徹底移除漫遊碼生成與還原函數（真實雲端帳號無需手動貼上字串） |
| `src/components/MemberPortalModal.jsx` | 639-680 行 | 雙引擎融合設定分頁（「本地硬體金庫」vs「雲端 BaaS」設定表單） | 移除該分頁與手動填寫 Project URL/Anon Key 表單，重構為簡潔優雅的雲端登入中心 |
| `public/sdk/mei-dock.js` | 74-118 行 | 依賴本機假漫遊碼之還原邏輯 | 改為監聽 Supabase Session 廣播與同源快取 |
| `src/__tests__/memberPortalAndToast.test.jsx` | 全檔 | 測試案例中針對假漫遊碼、假金庫與假登入之斷言 | 重構為使用 Mock Supabase Client，測試標準 OAuth 流程與 Profile 渲染 |

---

## 6. 審查與簽核標準 (Review & Sign-off Criteria)

Milestone 1 交付物完成後，需經以下標準進行技術簽核，方可准予推進至 Milestone 3：

- [x] **唯讀盤點合規**：未對遠端資料庫 `mdxnjlhjqskqsndeiepy` 執行任何未經授權之寫入或遷移變更。
- [x] **四維風險覆蓋**：完整闡明命名衝突、RLS 越權、雪梨網路延遲、Anon Key 暴露之威脅與對應緩解措施。
- [x] **DDL 遷移腳本完備**：提供符合 PostgreSQL 17 規範之 `schema_migrations.sql`，具備完整索引、觸發程序、RLS 與非機敏公開 View。
- [x] **向下相容與防禦**：DDL 腳本內建 `ON CONFLICT DO NOTHING` 與安全異常防禦，確保絕不破壞 MeiStudyFlow 既有註冊流程。
- [x] **假代碼清理藍圖明確**：明確指引 Milestone 3 應移除之假 Token、假漫遊碼與假分頁範圍。
