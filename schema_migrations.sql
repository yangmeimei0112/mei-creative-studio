-- =====================================================================================
-- 咩創意工作室全站聯通雲端會員認證系統 (方案二) - 資料庫 DDL 遷移腳本
-- =====================================================================================
-- 專案識別：MeiStudyFlow (mdxnjlhjqskqsndeiepy)
-- 資料庫引擎：PostgreSQL 17.6.1 (Supabase BaaS)
-- 目的：建立全站共用會員資料表、Passkey 憑證管理、RLS 隔離政策與自動同步觸發程序
-- 安全原則：
--   1. 嚴格表名前綴隔離 (mei_member_*)，零污染 MeiStudyFlow 既有業務綱要。
--   2. 強制開啟 ROW LEVEL SECURITY (RLS)，完全鎖定 auth.uid() 屬主存取。
--   3. 機敏欄位 (Email, Metadata, Passkey Keys) 絕對防護，對外僅開放非機敏安全視圖。
--   4. 觸發程序包含異常保護，保證 auth.users 核心認證流程不受任何非預期錯誤中斷。
-- 警告：本檔案為架構規劃與審定產物，在 Milestone 1 審核通過前「嚴禁直接對遠端庫執行」！
-- =====================================================================================

BEGIN;

-- -------------------------------------------------------------------------------------
-- 1. 啟用必要擴充套件 (Extensions)
-- -------------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------------------
-- 2. 建立通用 updated_at 自動時間戳觸發函式
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at() IS '自動更新 updated_at 欄位為當前伺服器時間戳';

-- -------------------------------------------------------------------------------------
-- 3. 建立全站會員資料表：public.mei_member_profiles
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mei_member_profiles (
  -- 關聯至 Supabase 原生驗證帳號
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 咩創意工作室全站唯一會員識別代碼 (格式如: mei_user_32位hex)
  union_id VARCHAR(64) UNIQUE NOT NULL,
  
  -- 電子郵件 (僅限本人與系統檢視)
  email VARCHAR(255) NOT NULL,
  
  -- 公開顯示名稱 / 暱稱
  display_name VARCHAR(100) NOT NULL DEFAULT '咩創探索者',
  
  -- 頭像 URL (支援 Google/Apple OAuth 原生圖片或自定義 URL)
  avatar_url TEXT DEFAULT '',
  
  -- 會員等級：探索者 (explorer)、創作者 (creator)、架構師 (architect)
  tier VARCHAR(20) NOT NULL DEFAULT 'explorer' 
    CHECK (tier IN ('explorer', 'creator', 'architect')),
  
  -- 驗證管道：'google', 'apple', 'email', 'passkey'
  auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
  
  -- 是否已綁定硬體 Passkey / 生物辨識
  is_passkey_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- 允許/已授權之工作室子專案清單 (如: 'hub', 'logo-designer', 'fittrack')
  connected_projects TEXT[] DEFAULT ARRAY['hub']::TEXT[],
  
  -- 擴展元數據 (個人偏好設定、主題色、標籤等)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- 最後登入時間
  last_sign_in_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  
  -- 建立與更新時間
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE public.mei_member_profiles IS '咩創意工作室全站共用會員檔案表 (方案二統一 SSO 核心)';
COMMENT ON COLUMN public.mei_member_profiles.id IS '關聯 auth.users.id，級聯刪除';
COMMENT ON COLUMN public.mei_member_profiles.union_id IS '工作室全站唯一識別代碼 (mei_user_*)';
COMMENT ON COLUMN public.mei_member_profiles.tier IS '會員身份等級：explorer, creator, architect';
COMMENT ON COLUMN public.mei_member_profiles.connected_projects IS '跨專案授權清單';

-- -------------------------------------------------------------------------------------
-- 4. 建立會員 Passkey / WebAuthn 硬體金庫表：public.mei_member_passkeys
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mei_member_passkeys (
  -- 憑證記錄唯一識別碼
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關聯之會員使用者 ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- WebAuthn 憑證 ID (Base64URL 編碼之 Credential ID)
  credential_id TEXT UNIQUE NOT NULL,
  
  -- 憑證公開金鑰 (COSE 格式或 PEM 編碼之 Public Key，絕對無私鑰)
  public_key TEXT NOT NULL,
  
  -- 簽名計數器 (防範重送攻擊 Replay Attack)
  counter BIGINT NOT NULL DEFAULT 0,
  
  -- 綁定裝置友好名稱 (例如: "MacBook Pro Touch ID", "iPhone FaceID")
  device_name VARCHAR(100) NOT NULL DEFAULT 'Unknown Authenticator',
  
  -- WebAuthn 傳輸管道 (例如: ['internal', 'hybrid', 'usb', 'nfc', 'ble'])
  transports TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- 認證器證明 GUID (AAGUID)
  aaguid VARCHAR(36) DEFAULT NULL,
  
  -- 最後使用此 Passkey 驗證時間
  last_used_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  
  -- 建立與更新時間
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE public.mei_member_passkeys IS '咩創意工作室會員 WebAuthn / Passkey 硬體憑證儲存庫';
COMMENT ON COLUMN public.mei_member_passkeys.credential_id IS 'WebAuthn 唯一憑證標識符 (Base64URL)';
COMMENT ON COLUMN public.mei_member_passkeys.public_key IS 'FIDO2 / WebAuthn 公開金鑰資料';
COMMENT ON COLUMN public.mei_member_passkeys.counter IS '簽名次數計數器，用於防偽與防重送攻擊';

-- -------------------------------------------------------------------------------------
-- 5. 建立高效查詢索引 (Indexes)
-- -------------------------------------------------------------------------------------
-- Profiles 索引
CREATE INDEX IF NOT EXISTS idx_mei_member_profiles_union_id 
  ON public.mei_member_profiles(union_id);

CREATE INDEX IF NOT EXISTS idx_mei_member_profiles_email 
  ON public.mei_member_profiles(email);

CREATE INDEX IF NOT EXISTS idx_mei_member_profiles_tier 
  ON public.mei_member_profiles(tier);

CREATE INDEX IF NOT EXISTS idx_mei_member_profiles_last_sign_in 
  ON public.mei_member_profiles(last_sign_in_at DESC);

-- Passkeys 索引
CREATE INDEX IF NOT EXISTS idx_mei_member_passkeys_user_id 
  ON public.mei_member_passkeys(user_id);

CREATE INDEX IF NOT EXISTS idx_mei_member_passkeys_cred_id 
  ON public.mei_member_passkeys(credential_id);

CREATE INDEX IF NOT EXISTS idx_mei_member_passkeys_last_used 
  ON public.mei_member_passkeys(last_used_at DESC);

-- -------------------------------------------------------------------------------------
-- 6. 綁定 updated_at 自動更新觸發器
-- -------------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_mei_member_profiles_updated_at ON public.mei_member_profiles;
CREATE TRIGGER trigger_mei_member_profiles_updated_at
  BEFORE UPDATE ON public.mei_member_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_mei_member_passkeys_updated_at ON public.mei_member_passkeys;
CREATE TRIGGER trigger_mei_member_passkeys_updated_at
  BEFORE UPDATE ON public.mei_member_passkeys
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------------------
-- 7. 建立 auth.users 註冊後自動同步建立 Profiles 觸發函式 (安全防禦版)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_display_name VARCHAR(100);
  v_avatar_url TEXT;
  v_provider VARCHAR(50);
  v_union_id VARCHAR(64);
BEGIN
  -- 1. 解析 OAuth / Auth Metadata 中之使用者名稱 (依優先序回退)
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'user_name',
    SPLIT_PART(NEW.email, '@', 1),
    '咩創探索者'
  );

  -- 2. 解析頭像 URL (相容 Google picture 與標準 avatar_url)
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    ''
  );

  -- 3. 解析主要驗證 Provider
  v_provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );

  -- 4. 產生標準 32 位緊湊型全站 Union ID (例如: mei_user_550e8400e29b41d4a716446655440000)
  v_union_id := 'mei_user_' || REPLACE(NEW.id::TEXT, '-', '');

  -- 5. 寫入 Profiles 表 (具備衝突防禦，既有資料不覆蓋)
  INSERT INTO public.mei_member_profiles (
    id,
    union_id,
    email,
    display_name,
    avatar_url,
    tier,
    auth_provider,
    is_passkey_enabled,
    connected_projects,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_union_id,
    COALESCE(NEW.email, ''),
    v_display_name,
    v_avatar_url,
    'explorer',
    v_provider,
    false,
    ARRAY['hub']::TEXT[],
    clock_timestamp(),
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_sign_in_at = clock_timestamp(),
    -- 若既有頭像或暱稱有來自 OAuth 更新則優雅同步
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.mei_member_profiles.avatar_url END,
    updated_at = clock_timestamp();

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- 安全屏障：捕捉所有非預期例外並記錄警告，絕對不阻斷 auth.users 原生登入與註冊流程！
    RAISE WARNING 'handle_new_auth_user encountered error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_new_auth_user() IS '新使用者註冊時自動同步建立 mei_member_profiles，具備例外保護與防覆蓋特性';

-- 綁定觸發程序至 auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- -------------------------------------------------------------------------------------
-- 8. 配置嚴格 Row Level Security (RLS) 權限防火牆
-- -------------------------------------------------------------------------------------

-- 強制啟用並鎖定 RLS
ALTER TABLE public.mei_member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mei_member_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.mei_member_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mei_member_passkeys FORCE ROW LEVEL SECURITY;

-- 移除既有同名 Policies (冪等設計)
DROP POLICY IF EXISTS "mei_member_profiles_select_own" ON public.mei_member_profiles;
DROP POLICY IF EXISTS "mei_member_profiles_update_own" ON public.mei_member_profiles;
DROP POLICY IF EXISTS "mei_member_profiles_insert_own" ON public.mei_member_profiles;

DROP POLICY IF EXISTS "mei_member_passkeys_select_own" ON public.mei_member_passkeys;
DROP POLICY IF EXISTS "mei_member_passkeys_insert_own" ON public.mei_member_passkeys;
DROP POLICY IF EXISTS "mei_member_passkeys_update_own" ON public.mei_member_passkeys;
DROP POLICY IF EXISTS "mei_member_passkeys_delete_own" ON public.mei_member_passkeys;

-- 8.1 mei_member_profiles RLS 政策 (僅限本人存取本人私有檔案)
CREATE POLICY "mei_member_profiles_select_own"
  ON public.mei_member_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "mei_member_profiles_update_own"
  ON public.mei_member_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "mei_member_profiles_insert_own"
  ON public.mei_member_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 8.2 mei_member_passkeys RLS 政策 (嚴密隔離，僅限本人存取與操作硬體金鑰)
CREATE POLICY "mei_member_passkeys_select_own"
  ON public.mei_member_passkeys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "mei_member_passkeys_insert_own"
  ON public.mei_member_passkeys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mei_member_passkeys_update_own"
  ON public.mei_member_passkeys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mei_member_passkeys_delete_own"
  ON public.mei_member_passkeys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------------------------------------------------------------------
-- 9. 建立公開非機敏資訊安全檢視表 (Security Safe View)
-- -------------------------------------------------------------------------------------
-- 目的：大廳與公開導覽列需要查詢使用者的顯示名稱、頭像與徽章，但不得洩漏 Email 與 Metadata
CREATE OR REPLACE VIEW public.mei_member_public_profiles
WITH (security_invoker = false) -- 以 View Owner 權限安全投影白名單欄位
AS
SELECT
  id,
  union_id,
  display_name,
  avatar_url,
  tier,
  is_passkey_enabled,
  created_at
FROM public.mei_member_profiles;

COMMENT ON VIEW public.mei_member_public_profiles IS '公開受限檢視表：僅投影暱稱、頭像與會員等級，徹底杜絕 Email 與機敏資料外洩';

-- 授予 API 查詢權限
GRANT SELECT ON public.mei_member_public_profiles TO anon, authenticated;

-- 撤銷實體表對 anon 的所有直接存取權
REVOKE ALL ON public.mei_member_profiles FROM anon;
REVOKE ALL ON public.mei_member_passkeys FROM anon;

COMMIT;

-- =====================================================================================
-- 遷移驗證與回滾指南 (Verification & Rollback Instructions)
-- =====================================================================================
/*
【驗證腳本 (Verification SQL)】：
在完成授權部署後，可執行以下唯讀指令驗證架構完整性：

1. 檢查資料表是否成功建立且欄位完整：
   SELECT table_name, column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'public' 
     AND table_name IN ('mei_member_profiles', 'mei_member_passkeys')
   ORDER BY table_name, ordinal_position;

2. 檢查 RLS 是否強制開啟：
   SELECT relname, relrowsecurity, relforcerowsecurity 
   FROM pg_class 
   WHERE relname IN ('mei_member_profiles', 'mei_member_passkeys');
   -- 預期：relrowsecurity = true, relforcerowsecurity = true

3. 檢查 RLS 政策清單：
   SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
   FROM pg_policies
   WHERE tablename IN ('mei_member_profiles', 'mei_member_passkeys');

4. 檢查觸發器是否成功掛載至 auth.users：
   SELECT trigger_name, event_manipulation, event_object_table, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'users' AND trigger_name = 'on_auth_user_created';

5. 檢查安全公開 View 是否可用且無機敏欄位：
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'mei_member_public_profiles';
   -- 預期包含：id, union_id, display_name, avatar_url, tier, is_passkey_enabled, created_at
   -- 絕不包含：email, metadata, connected_projects, auth_provider

----------------------------------------------------------------------------------------
【回滾腳本 (Rollback / Down Migration)】：
若需復原此腳本所建立之所有物件，請在確認後執行以下命令：

BEGIN;
  -- 移除 View
  DROP VIEW IF EXISTS public.mei_member_public_profiles;

  -- 移除觸發器與觸發函式
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS public.handle_new_auth_user();

  DROP TRIGGER IF EXISTS trigger_mei_member_passkeys_updated_at ON public.mei_member_passkeys;
  DROP TRIGGER IF EXISTS trigger_mei_member_profiles_updated_at ON public.mei_member_profiles;
  DROP FUNCTION IF EXISTS public.handle_updated_at();

  -- 移除資料表 (CASCADE 自動移除關聯之索引與政策)
  DROP TABLE IF EXISTS public.mei_member_passkeys CASCADE;
  DROP TABLE IF EXISTS public.mei_member_profiles CASCADE;
COMMIT;
*/
