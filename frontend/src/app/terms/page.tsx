"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, ShieldCheck, FileText, HelpCircle } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden pb-16">
      {/* Dynamic Aesthetic Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] -z-10 pointer-events-none" />

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
            TERMS & CONDITIONS
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            ข้อตกลงและเงื่อนไขการใช้บริการ <br />
            <span className="text-primary font-black">Terms of Service</span>
          </h1>
          <p className="text-muted-foreground text-sm font-semibold">
            ปรับปรุงล่าสุด ณ วันที่ 17 พฤษภาคม 2569
          </p>
        </div>

        {/* Content Body */}
        <div className="glass p-8 md:p-12 rounded-[2.5rem] border border-border/50 space-y-8 shadow-xl leading-relaxed text-sm font-medium text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              1. การเปิดรับข้อตกลงการใช้บริการ
            </h2>
            <p>
              ยินดีต้อนรับสู่แอปพลิเคชัน <strong>Fillax</strong> การใช้งานแพลตฟอร์มนี้ถือว่าคุณเข้าใจและตกลงที่จะปฏิบัติตามกฎกติกา เงื่อนไข และระเบียบข้อบังคับที่ระบุไว้ในข้อตกลงฉบับนี้อย่างไม่มีข้อยกเว้น หากคุณไม่เห็นด้วยกับเงื่อนไขใด ๆ กรุณาหยุดใช้บริการแพลตฟอร์มนี้โดยทันที
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              2. บัญชีผู้ใช้งานและความถูกต้องของข้อมูล
            </h2>
            <p>
              ในการสร้างบัญชีเพื่อเข้าใช้บริการผ่าน Google Login คุณตกลงที่จะ:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>ให้ข้อมูลส่วนบุคคลและข้อมูลรายละเอียดร้านค้าค้าขายออนไลน์ที่เป็นความจริง ทันสมัย และสมบูรณ์ครบถ้วน</li>
              <li>เป็นผู้รับผิดชอบแต่เพียงผู้เดียวต่อทุกธุรกรรมและกิจกรรมใด ๆ ที่เกิดขึ้นภายใต้บัญชีเข้าใช้งานของคุณ</li>
              <li>รักษาความปลอดภัยของอุปกรณ์เชื่อมต่อและไม่อนุญาตให้บุคคลที่สามสวมสิทธิ์การทำรายการธุรกรรมแทนท่าน</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              3. นโยบายการเรียกเก็บเงินและแผนพรีเมียม (Premium Subscription & Billing)
            </h2>
            <p>
              Fillax มีการเสนอรูปแบบบริการทั้ง <strong>Free Plan (ใช้งานจำกัด)</strong> และ <strong>Pro Plan (ไม่จำกัดขอบเขต)</strong> ภายใต้ระเบียบการเงินดังนี้:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>ยอดค่าบริการรายเดือน:</strong> อัตราค่าบริการระดับ PRO อยู่ที่ 199 บาทต่อเดือน (รวมภาษีมูลค่าเพิ่มแล้ว หากมี) โดยจะทำการเรียกเก็บล่วงหน้าทุก ๆ รอบ 30 วัน</li>
              <li><strong>ระบบตัดบัตรเครดิตอัตโนมัติ:</strong> คุณตกลงให้ผู้ประมวลผลระบบชำระเงินที่ปลอดภัย (Stripe & Omise Gateway) มีสิทธิ์เรียกเก็บและตัดยอดค่าใช้บริการโดยอัตโนมัติในทุก ๆ วันครบรอบรอบบิล</li>
              <li><strong>การขอยกเลิกสิทธิ์ (Cancellation):</strong> ผู้ใช้มีสิทธิ์สามารถกดยกเลิกการสมัครสมาชิก (Cancel Subscription) ได้ตลอดเวลาผ่านหน้าเมนูการตั้งค่า การยกเลิกจะมีผลหลังสิ้นสุดวันใช้งานรอบบิลปัจจุบัน</li>
              <li><strong>นโยบายการขอคืนเงิน (Refund Policy):</strong> บริษัทฯ ขอสงวนสิทธิ์ไม่คืนเงินค่าบริการรายเดือนที่ชำระเข้ามาแล้วในทุกกรณี ยกเว้นเกิดจากปัญหาขัดข้องทางเทคนิคของระบบประมวลผลซ้ำซ้อนหลังบ้าน</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              4. ข้อจำกัดความรับผิดทางกฎหมายเรื่องภาษี (Tax Liability Exclusions)
            </h2>
            <p>
              แอปพลิเคชัน <strong>Fillax</strong> เป็นเพียงผู้ช่วยวิเคราะห์และสรุปรายการบัญชีร้านค้าและภาษีผ่านพลังสมองกลปัญญาประดิษฐ์และสูตรคำนวณขั้นพื้นฐานของกรมสรรพากรแห่งประเทศไทยเท่านั้น
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-5 rounded-2xl font-bold text-xs space-y-2">
              <p>⚠️ ข้อกำหนดสำคัญที่ผู้เสียภาษีต้องรับทราบ:</p>
              <p className="font-medium text-muted-foreground leading-relaxed">
                การแปลผลของ AI Assistant, ตัวเลขการประมาณการอัตราภาษี หรือดัชนีความเสี่ยงสรรพากรตรวจสอบย้อนหลังที่แสดงในแดชบอร์ด ไม่ใช่คำแนะนำทางกฎหมายจากผู้เชี่ยวชาญด้านบัญชีอย่างเป็นทางการ ผู้ใช้บริการต้องเป็นผู้ตรวจสอบ ยื่นเอกสารแบบแสดงรายการภาษี และชำระเงินภาษีที่ค้างจ่ายจริงต่อกรมสรรพากรด้วยความรับผิดชอบของตนเอง บริษัทฯ จะไม่รับผิดชอบต่อเบี้ยปรับ เงินเพิ่ม ความล่าช้า หรือข้อผิดพลาดใด ๆ ที่เกิดจากการยื่นแบบภาษีทั้งสิ้น
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              5. ทรัพย์สินทางปัญญาและการใช้งานที่ชอบด้วยกฎหมาย
            </h2>
            <p>
              เนื้อหา โครงสร้างรหัสโปรแกรม ซอฟต์แวร์ รูปภาพ และโลโก้สัญลักษณ์ทั้งหมดของ Fillax เป็นทรัพย์สินทางปัญญาที่ได้รับการคุ้มครองตามกฎหมายของบริษัทฯ ห้ามมิให้ผู้ใดทำการคัดลอก ดัดแปลง แจกจ่าย หรือทำวิศวกรรมย้อนกลับ (Reverse Engineering) ต่อระบบใด ๆ โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              6. การแก้ไขเปลี่ยนแปลงเงื่อนไข
            </h2>
            <p>
              เราขอสงวนสิทธิ์ในการแก้ไขหรือเปลี่ยนแปลงเงื่อนไขการให้บริการฉบับนี้ได้ทุกเมื่อ การเปลี่ยนแปลงจะมีผลใช้บังคับทันทีที่มีการเผยแพร่บนหน้าเว็บไซต์นี้ โดยจะมีการแจ้งเตือนอัปเดตผ่านอีเมลหรือหน้าแดชบอร์ดหลักสำหรับข้อมูลสำคัญ
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
