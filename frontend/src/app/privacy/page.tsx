"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, ShieldCheck, Lock, Eye } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden pb-16">
      {/* Dynamic Aesthetic Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] -z-10 pointer-events-none" />

      {/* Premium Navbar Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="font-black text-xl tracking-tighter text-foreground uppercase">
              Fillax
            </span>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="rounded-xl flex items-center gap-2 font-bold text-sm">
              <ArrowLeft className="w-4 h-4" />
              กลับสู่หน้าหลัก
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-4xl mx-auto px-6 mt-12 space-y-12">
        {/* Hero Title Header */}
        <div className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            PDPA & GDPR COMPLIANT
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            นโยบายความเป็นส่วนตัว <br />
            <span className="text-primary font-black">Privacy Policy</span>
          </h1>
          <p className="text-muted-foreground text-sm font-semibold">
            ปรับปรุงล่าสุด ณ วันที่ 17 พฤษภาคม 2569
          </p>
        </div>

        {/* Content Body */}
        <div className="glass p-8 md:p-12 rounded-[2.5rem] border border-border/50 space-y-8 shadow-xl leading-relaxed text-sm font-medium text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              1. บทนำและการแสดงความยินยอม
            </h2>
            <p>
              แอปพลิเคชัน <strong>Fillax</strong> (&quot;บริษัทฯ&quot;, &quot;เรา&quot;) ตระหนักถึงความสำคัญในการปกป้องข้อมูลส่วนบุคคลของคุณ ในฐานะผู้ค้าออนไลน์หรือผู้เสียภาษีชาวไทย นโยบายความเป็นส่วนตัวฉบับนี้อธิบายถึงขั้นตอนการเก็บรวบรวม การใช้งาน การประมวลผล และการปกป้องข้อมูลที่คุณมอบให้เราผ่านการใช้งานแพลตฟอร์ม
            </p>
            <p>
              เมื่อคุณเริ่มสร้างบัญชีผู้ใช้ หรือกดเข้าสู่ระบบผ่าน Google Login เราถือว่าคุณได้อ่านและให้การยอมรับข้อตกลงและเงื่อนไขการใช้งานแพลตฟอร์มทั้งหมดอย่างชัดเจน
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              2. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม
            </h2>
            <p>
              เราอาจรวบรวมและบันทึกข้อมูลประเภทต่าง ๆ ดังต่อไปนี้เพื่อปรับปรุงประสิทธิภาพการคำนวณภาษี:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>ข้อมูลประวัติผู้ใช้:</strong> อีเมล, ชื่อบัญชีจริง, รูปโปรไฟล์ และข้อมูลที่ได้จากการล็อกอินผ่านระบบสิทธิการใช้งานของบุคคลภายนอก (Google OAuth)</li>
              <li><strong>ข้อมูลร้านค้าออนไลน์:</strong> ชื่อร้านค้า, เลขประจำตัวผู้เสียภาษีอากร 13 หลัก, ที่ตั้งสำนักงานใหญ่ หรือสถานประกอบการ เพื่อใช้ออกเอกสารใบแทนใบเสร็จ (มค.๑)</li>
              <li><strong>ข้อมูลธุรกรรมทางเงิน:</strong> รายการนำเข้าเงินได้, รายจ่าย, วันที่บันทึกรายการ และหมวดหมู่เงินได้ตามมาตรา 40(1) ถึง 40(8)</li>
              <li><strong>ไฟล์แนบเอกสาร:</strong> รูปภาพใบเสร็จ, ไฟล์ใบแจ้งหนี้ PDF ที่อัปโหลดเข้ามาเพื่อประมวลผลผ่านโมเดลสกัดอักขระ (AI OCR) และเก็บรวบรวมชั่วคราว</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              3. วัตถุประสงค์ในการนำข้อมูลไปใช้
            </h2>
            <p>
              เราจะนำข้อมูลส่วนบุคคลของคุณไปประมวลผลภายใต้จุดประสงค์ทางกฎหมายและการอำนวยความสะดวกดังต่อไปนี้:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>เพื่อทำการวิเคราะห์ สรุป และประเมินอัตราภาษีเงินได้ที่จำเป็นสำหรับแม่ค้าออนไลน์อย่างแม่นยำ</li>
              <li>เพื่อให้บริการระบบประมวลผลภาพอัตโนมัติ (AI OCR) สามารถแปลผลตัวหนังสือจากภาพใบเสร็จเป็นข้อมูลธุรกรรมในระบบบัญชี</li>
              <li>เพื่อเปิดใช้งานและอำนวยความสะดวกในการชำระเงินค่าสมัครสมาชิกรายเดือนระดับ PRO ผ่าน Stripe และ Omise Payment Secure Gateway</li>
              <li>เพื่อปกป้องและป้องกันภัยทุจริตทางคอมพิวเตอร์และการโจมตีระบบรักษาความปลอดภัย</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              4. การรักษาความปลอดภัยและความปลอดภัยของระบบคลาวด์
            </h2>
            <p>
              เราจัดเก็บข้อมูลการชำระเงินและข้อมูลธุรกรรมทั้งหมดไว้ในคลาวด์เซิร์ฟเวอร์ที่มีระบบการเข้าถึงที่รัดกุม ธุรกรรมผ่านบัตรเครดิตทั้งหมดจะได้รับการเข้ารหัสผ่าน <strong>Secure Socket Layer (SSL) 256-bit</strong> โดยตรงกับผู้ให้บริการที่ผ่านมาตรฐาน PCI-DSS (Stripe & Omise) บริษัทฯ จะไม่มีการจัดเก็บข้อมูลเลขหลังบัตรเครดิต (CVV) หรือรหัสผ่านทำธุรกรรมใด ๆ ไว้บนระบบเซิร์ฟเวอร์ของเราเองอย่างเด็ดขาด
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              5. สิทธิตามกฎหมาย PDPA ของไทย
            </h2>
            <p>
              ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) คุณมีสิทธิเต็มที่ในการขอเข้าถึง ขอรับสิทธิ์การคัดค้าน ขอแก้ไขข้อมูลให้ถูกต้อง รวมถึงยื่นขอให้ระบบดำเนินการ **ลบข้อมูลบัญชีและธุรกรรมทั้งหมดออกถาวร (Right to be Forgotten)** ได้ทุกเมื่อผ่านการส่งคำขอมายังทีมงานฝ่ายบริการช่วยเหลือของเรา
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              6. การติดต่อเรา
            </h2>
            <p>
              หากคุณมีข้อสงสัย ข้อเสนอแนะ หรือต้องการใช้สิทธิตามกฎหมาย PDPA เพิ่มเติม สามารถส่งความประสงค์ติดต่อเจ้าหน้าที่ควบคุมข้อมูลส่วนบุคคลได้ที่:
            </p>
            <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 space-y-1 font-bold text-foreground">
              <p>บริษัท ฟิลแลกซ์ เทคโนโลยี คอร์ปอเรชัน จำกัด (Fillax Co., Ltd.)</p>
              <p className="text-sm font-medium text-muted-foreground">อีเมล: wefile28@gmail.com</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
