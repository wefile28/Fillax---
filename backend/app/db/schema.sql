-- ====================================================================
-- FILLAX DATABASE SCHEMA (CORRECTED VERSION 🟢)
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางรันใน Supabase SQL Editor ได้ทันที
-- ====================================================================

-- 1. ตารางเก็บข้อมูลโปรไฟล์ผู้ใช้งาน (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID REFERENCES auth.users(id) PRIMARY KEY,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  shop_name       TEXT,
  shop_channels   TEXT[] DEFAULT '{}',    -- เช่น ['shopee', 'lazada', 'tiktok']
  seller_type     TEXT DEFAULT 'individual',
  plan            TEXT DEFAULT 'free',    -- 'free' | 'pro' | 'agency'
  plan_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ฟังก์ชันสร้างโปรไฟล์อัตโนมัติเมื่อมีการสมัครสมาชิกผ่าน Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ลบ Trigger เดิมหากมีอยู่ เพื่อป้องกันตารางชนกัน
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- สร้าง Trigger ผูกฟังก์ชันเข้ากับตาราง User ของ Supabase Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. ตารางเก็บบัญชีเงินเข้า-ออก (Transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  date             DATE NOT NULL,
  name             TEXT NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type             TEXT NOT NULL CHECK (type IN ('income','expense')),
  category         TEXT NOT NULL,
  is_tax_deductible BOOLEAN DEFAULT FALSE,
  channel          TEXT,               -- ช่องทาง 'shopee','tiktok','lazada','facebook','other'
  note             TEXT,
  status           VARCHAR(50) DEFAULT 'completed', -- 'completed' | 'pending_review'
  source           VARCHAR(50) DEFAULT 'web',       -- 'web' | 'line_bot'
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ดัชนี (Index) สำหรับการสืบค้นธุรกรรมรายเดือนที่รวดเร็ว
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);

-- 3. ตารางประวัติการตรวจสอบความเสี่ยงภาษี (Tax Checks)
CREATE TABLE IF NOT EXISTS public.tax_checks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  tax_year        INTEGER NOT NULL,
  annual_income   NUMERIC(15,2),
  status          TEXT,               -- 'must_file','no_need','uncertain'
  result_json     JSONB,              -- รายละเอียดผลลัพธ์
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ตารางข้อมูลสิทธิ์ลดหย่อนภาษีส่วนตัว (User Deductions)
CREATE TABLE IF NOT EXISTS public.user_deductions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  tax_year        INTEGER NOT NULL,
  deduction_id    TEXT NOT NULL,      -- คีย์สิทธิ์ลดหย่อน เช่น 'insurance_life','ssf','rmf'
  amount          NUMERIC(12,2),
  is_applicable   BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tax_year, deduction_id)
);

-- 5. ตารางเก็บบันทึกข้อมูลการสแกนใบเสร็จ (Receipts)
CREATE TABLE IF NOT EXISTS public.receipts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  file_name        TEXT NOT NULL,
  file_url         TEXT NOT NULL,
  file_size        INTEGER NOT NULL,
  mime_type        TEXT NOT NULL,
  vendor           TEXT,
  amount           NUMERIC(12,2),
  date             DATE,
  category         TEXT,
  description      TEXT,
  seller_tax_id    TEXT,
  is_dbd_verified  BOOLEAN DEFAULT FALSE,
  dbd_company_name TEXT,
  status           VARCHAR(50) DEFAULT 'completed', -- 'completed' | 'pending_review'
  source           VARCHAR(50) DEFAULT 'web',       -- 'web' | 'line_bot'
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ดัชนีสำหรับการสืบค้นใบเสร็จ
CREATE INDEX IF NOT EXISTS idx_receipts_user_created ON public.receipts(user_id, created_at);

-- ลบดัชนีเก่าที่มีผลกระทบต่อ OCR ข้ามผู้ใช้ (DROP INDEX Migration - P1 Production Hardening)
DROP INDEX IF EXISTS public.idx_receipts_file_url_hash;
DROP INDEX IF EXISTS public.idx_receipts_file_url_ref;


-- 6. ตารางเก็บข้อมูลโปรไฟล์และการเชื่อมบัญชี LINE Bot (Line Profiles)
CREATE TABLE IF NOT EXISTS public.line_profiles (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id       TEXT UNIQUE,
  display_name       TEXT,
  picture_url        TEXT,
  pairing_code       VARCHAR(6),
  pairing_expires_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ดัชนีสืบค้นรหัสจับคู่ LINE Bot
CREATE INDEX IF NOT EXISTS idx_line_profiles_line_user_id ON public.line_profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_profiles_pairing_code ON public.line_profiles(pairing_code);

-- 7. ตารางจองสิทธิ์และตรวจสอบความซ้ำซ้อนการชำระเงิน (Payment Claims - P1 Database Atomicity Guard)
CREATE TABLE IF NOT EXISTS public.payment_claims (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  ref_id          TEXT UNIQUE,
  file_hash       TEXT UNIQUE,
  charge_id       TEXT UNIQUE,           -- ผูกกับ Omise charge id
  plan            TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  status          TEXT DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded'
  receipt_id      UUID,                  -- ผูกกับตาราง receipts.id หากเปิดใช้งานสำเร็จ
  claim_source    TEXT DEFAULT 'slip',   -- 'slip' | 'omise'
  processed_at    TIMESTAMPTZ,           -- เวลาที่อัปเกรดสำเร็จ
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Migration สำหรับอัปเกรดฐานข้อมูลเดิมที่เคยติดตั้งไปแล้ว (Database Column Migration Guards)
ALTER TABLE public.payment_claims ADD COLUMN IF NOT EXISTS charge_id TEXT UNIQUE;
ALTER TABLE public.payment_claims ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.payment_claims ADD COLUMN IF NOT EXISTS receipt_id UUID;
ALTER TABLE public.payment_claims ADD COLUMN IF NOT EXISTS claim_source TEXT DEFAULT 'slip';
ALTER TABLE public.payment_claims ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) - ความปลอดภัยแยกการเห็นข้อมูลเฉพาะตัวบุคคล
-- ====================================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_checks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_claims ENABLE ROW LEVEL SECURITY;

-- นโยบาย RLS: เข้าถึงได้เฉพาะของตนเอง (auth.uid() = user_id)
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "transactions_own" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "tax_checks_own" ON public.tax_checks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "deductions_own" ON public.user_deductions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "receipts_own" ON public.receipts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "line_profiles_own" ON public.line_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "payment_claims_own" ON public.payment_claims
  FOR ALL USING (auth.uid() = user_id);