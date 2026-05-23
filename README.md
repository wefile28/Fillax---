# Fillax 🧾 (Formerly TaxMate)

> **เครื่องมือช่วยแม่ค้าออนไลน์ไทยจัดการภาษีและบัญชีอัจฉริยะด้วยขุมพลัง AI — วางแผนประหยัดภาษีครบวงจร**
> 
> Fillax ช่วยให้พ่อค้าแม่ค้าออนไลน์และฟรีแลนซ์ไทย สามารถจัดการบัญชีรายรับ-รายจ่าย สแกนใบเสร็จด้วย AI OCR อิมพอร์ตร้านค้าอีคอมเมิร์ซ และปรึกษาภาษีได้ 24 ชั่วโมง โดยไม่ต้องมีความรู้ด้านการบัญชีมาก่อน

---

## 📂 แผนผังโครงสร้างสถาปัตยกรรมโปรเจค (Interactive Directory Map)

เพื่อช่วยให้คุณค้นหาไฟล์โค้ด อ่านโครงสร้าง และพัฒนาส่วนขยายต่อได้ง่ายดายที่สุด ระบบได้รับการจัดแบ่งโฟลเดอร์อย่างเป็นสัดส่วนตามหลัก **Clean Architecture & Domain-Driven Design (DDD)** ดังนี้:

```text
Fillax/
│
├── 📂 backend/                    # 🐍 ระบบหลังบ้าน (FastAPI Python Tax Engine)
│   ├── 📂 app/                    # ซอร์สโค้ดแอปพลิเคชันหลัก
│   │   ├── 📂 api/                # ตัวจัดการ Web API (REST API Endpoints)
│   │   │   └── 📂 v1/             # API Version 1
│   │   │       ├── 📂 endpoints/  # คอนโทรลเลอร์ย่อยแยกตามโดเมนงาน
│   │   │       │   ├── 📄 ai.py   # AI Assistant (Claude integration API)
│   │   │       │   ├── 📄 tax.py  # ระบบคำนวณและประเมินความเสี่ยงภาษี
│   │   │       │   └── ...        # (payment.py, auth.py, receipts.py)
│   │   │       └── 📄 api.py      # ตัวรวบรวม API Routes ทุกประเภท
│   │   ├── 📂 core/               # การตั้งค่าระบบหลัก (Security, config, logger)
│   │   ├── 📂 db/                 # การเชื่อมต่อฐานข้อมูล (Database Sessions)
│   │   ├── 📂 models/             # คลาสจำลองโครงสร้างตาราง (SQLAlchemy Models)
│   │   ├── 📂 schemas/            # คลาสตรวจสอบข้อมูลขาเข้า-ขาออก (Pydantic)
│   │   ├── 📂 services/           # โลจิกทางธุรกิจหลัก (Business Logic, OCR Engines)
│   │   └── 📄 main.py             # จุดเริ่มต้นระบบรันหลังบ้าน (FastAPI Entry Point)
│   ├── 📂 tests/                  # สคริปต์ตรวจสอบความถูกต้องของระบบ (PyTest)
│   └── 📄 requirements.txt        # ไฟล์ระบุ Library และ Dependencies ฝั่ง Python
│
├── 📂 frontend/                   # ⚛️ ระบบหน้าบ้าน (Next.js 15 + React 19 + TypeScript)
│   ├── 📂 prisma/                 # ระบบจัดการฐานข้อมูลและการ Seed ข้อมูล (Prisma ORM)
│   │   ├── 📄 schema.prisma       # โครงสร้างฐานข้อมูล SQLite / Postgres
│   │   └── 📄 seed.ts             # สคริปต์สร้างข้อมูลจำลองเพื่อการทดสอบ
│   ├── 📂 src/                    # ซอร์สโค้ดฝั่งหน้าบ้าน
│   │   ├── 📂 app/                # Next.js App Router (ระบบสลับหน้าเว็บย่อย)
│   │   │   ├── 📂 (dashboard)/    # กลุ่มหน้าจอการจัดการร้านค้าหลังบ้าน (Dashboard group)
│   │   │   │   ├── 📂 dashboard/  # หน้าวิเคราะห์ภาพรวม (Financial analytics dashboard)
│   │   │   │   ├── 📂 receipts/   # ระบบอัปโหลดและสแกนใบเสร็จด้วย AI OCR
│   │   │   │   ├── 📂 transactions/# สมุดจดบันทึกรายรับ-รายจ่ายหลัก (e-Ledger)
│   │   │   │   ├── 📂 tax-planning/# ระบบคำนวณวงเงินลดหย่อนภาษีอัจฉริยะ
│   │   │   │   ├── 📂 tax-risk-assessment/ # แถบวัดความเสี่ยงสรรพากร (Tax Risk Radar)
│   │   │   │   ├── 📂 export/     # ศูนย์ส่งออกรายงานภาษีจำกัดโควตา (PDF / Excel Center)
│   │   │   │   └── ...            # (settings, calendar)
│   │   │   ├── 📄 page.tsx        # หน้าแสดงผลิตภัณฑ์หลักและใบเปรียบเทียบราคา (Landing Page)
│   │   │   └── ...                # (globals.css, layout.tsx, privacy, terms)
│   │   ├── 📂 components/         # คอมโพเนนต์ React ส่วนกลางที่นำกลับมาใช้ซ้ำได้
│   │   │   ├── 📂 ui/             # คอมโพเนนต์ UI พื้นฐาน (Button, Dialog, Card - shadcn)
│   │   │   ├── 📄 auth-guard.tsx  # ระบบล็อกความปลอดภัยและตรวจสอบสิทธิ์เข้าใช้งาน
│   │   │   └── 📄 upgrade-dialog.tsx # หน้าชำระเงินอัปเกรด PRO (PromptPay / Stripe)
│   │   ├── 📂 hooks/              # Custom React Hooks สำหรับเพิ่มความสามารถสเตต
│   │   └── 📂 lib/                # ไฟล์ยูทิลิตี้และระบบจัดเก็บข้อมูล (Store, Supabase CLIENT)
│   │       ├── 📄 store.ts        # สมองกล่องเก็บข้อมูลบราวเซอร์ (Persistent LocalStorage Store)
│   │       ├── 📄 types.ts        # โครงสร้างไทป์กลางของออบเจกต์ (TypeScript Typings)
│   │       └── 📄 utils.ts        # ฟังก์ชันยูทิลิตี้จัดแต่ง Class CSS (Tailwind Merge)
│   ├── 📄 package.json            # ไฟล์ระบุ Dependencies และ Scripts สั่งรันฝั่งหน้าบ้าน
│   ├── 📄 tsconfig.json           # การตั้งค่าระบบภาษา TypeScript
│   └── ...                        # (next.config.ts, postcss.config.mjs)
│
├── 📄 README.md                   # 📄 เอกสารแนะนำโครงสร้างโปรเจคฉบับปรับปรุงใหม่นี้
├── 📄 MEMORY.md                   # บันทึกบริบทโปรเจคและเป้าหมายการวิจัยของนักพัฒนา
└── 📄 log.md                      # บันทึกประวัติและขั้นตอนการปรับปรุงแก้ไขระบบย้อนหลัง
```

---

## ⚡ วิธีการติดตั้งและเริ่มใช้งานด่วน (Quick Start Guide)

โปรเจคได้รับการติดตั้งแบบแบ่งส่วน **Decoupled Architecture** เพื่อให้บำรุงรักษาง่าย โดยแยกฝั่ง Client และ Server ออกจากกันอย่างเด็ดขาด:

### 1. ฝั่งหน้าบ้าน (Next.js Frontend)
```bash
# 1. ย้ายเข้าไปที่โฟลเดอร์หน้าบ้าน
cd frontend

# 2. ติดตั้ง Dependencies และตัวประมวลผล
npm install

# 3. เตรียมฐานข้อมูลตัวอย่าง (Prisma Migrate & Seed)
npx prisma db push
npx prisma db seed

# 4. เปิดใช้งานหน้าเว็บด้วยโหมดนักพัฒนาคู่ความเร็วสูง (Turbopack)
npm run dev
```
* หน้าบ้านจะพร้อมเข้าใช้งานผ่านลิงก์: [http://localhost:3000](http://localhost:3000) 🌐

---

### 2. ฝั่งหลังบ้าน (FastAPI Backend)
```bash
# 1. ย้ายเข้าไปที่โฟลเดอร์หลังบ้าน
cd backend

# 2. สร้าง Virtual Environment (แนะนำ)
python -m venv venv
# สำหรับ Windows:
.\venv\Scripts\activate

# 3. ติดตั้งโปรแกรมและ Dependencies ขาเข้า
pip install -r requirements.txt

# 4. รันเซิร์ฟเวอร์หลังบ้านในโหมด Hot-Reload
uvicorn app.main:app --reload
```
* หลังบ้านจะรันสำเร็จที่พอร์ต: [http://localhost:8000](http://localhost:8000) 🐍
* หน้าเว็บบันทึก API เอกสาร (Interactive Docs) พร้อมให้ทดลองเล่นที่: [http://localhost:8000/docs](http://localhost:8000/docs) 🚀

---

## 🛠️ มาตรฐานทางวิศวกรรมและความปลอดภัย (Engineering & Clean Code Standards)

1. **Security-First Development**:
   * การตรวจสอบความถูกต้องของสิทธิ์การเข้าใช้งานผ่าน [auth-guard.tsx](file:///d:/Fillax-/frontend/src/components/auth-guard.tsx) ด้วยกระบวนการเช็ค **Mounted Guard** เพื่อขจัดปัญหาการขัดแย้งของ Hydration และตรวจสอบเซสชันผ่าน Supabase Auth เสมอ
2. **Type Safety & Complete Consistency**:
   * มีการจัดเก็บสเตตกลางของไทป์ต่างๆ ไว้ที่ [types.ts](file:///d:/Fillax-/frontend/src/lib/types.ts) ใช้งานร่วมกันทั้งระบบ ทำให้เวลาปรับปรุงคุณสมบัติโปรดักต์ ไทป์จะสอดคล้องกันทันทีโดยไม่มี Compile Error
3. **Usage-Based Limit & Monetization Engine**:
   * ควบคุมการเข้าถึงด้วยระบบจำกัดสิทธิ์ผู้ใช้ฟรี (Free Plan) ที่ตรงตามกฎความพึงพอใจของเป้าหมายการตลาด (สแกนใบเสร็จ 10 ใบ/เดือน, แชท AI 5 ครั้ง, ส่งออกรายงานจำกัด 10 ครั้งพร้อมหลอด Progress Bar วัดความถี่ใช้งานจริง) และซิงก์ระบบชำระเงินราคาประหยัด ฿199 สอดคล้องในทุกจุด!
