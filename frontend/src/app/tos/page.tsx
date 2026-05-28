"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowLeft, 
  ShieldAlert, 
  Scale, 
  Lock, 
  HelpCircle, 
  AlertTriangle 
} from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen relative p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Background decoration blur */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-[#B08CFF]/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#E9DDFF]/10 blur-[100px] pointer-events-none" />

      {/* Header section */}
      <header className="flex items-center justify-between border-b border-[#B08CFF]/15 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="glass p-2.5 rounded-xl hover:bg-[#E9DDFF]/20 hover:scale-105 active:scale-95 transition-all text-[#5A4A68]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-[#5A4A68] flex items-center gap-2">
              <Scale className="w-5.5 h-5.5 text-[#B08CFF]" />
              ข้อกำหนดการใช้บริการและนโยบายความเป็นส่วนตัว 💜
            </h1>
            <p className="text-[10px] text-[#5A4A68]/60 font-semibold">
              ปรับปรุงล่าสุด: 28 พฤษภาคม 2569 | ร่างขึ้นตามกฎหมายไทยโดยผู้เชี่ยวชาญ (Legal Tech Compliant)
            </p>
          </div>
        </div>
        <Image 
          src="/fillax-mascot-v4.png" 
          alt="Fillax Logo" 
          width={40} 
          height={40} 
          className="w-10 h-10 object-contain hover:scale-105 transition-transform"
        />
      </header>

      {/* Main legal content */}
      <main className="glass rounded-3xl p-6 md:p-8 flex flex-col gap-8 shadow-sm">
        
        {/* Urgent Warning Disclaimer Alert Banner */}
        <div className="p-5 rounded-2xl border border-[#FAF9F6]/20 bg-[#F59E0B]/5 flex gap-4 items-start shadow-sm">
          <AlertTriangle className="text-[#F59E0B] w-6 h-6 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-[#5A4A68] uppercase tracking-wide">คำเตือนทางกฎหมายที่ผู้ใช้ต้องรับทราบโดยเร่งด่วน ⚠️</h4>
            <p className="text-[10px] text-[#5A4A68]/70 leading-relaxed font-semibold">
              บริการ **Fillax** เป็นเพียงโปรแกรมช่วยจัดระเบียบ ตรวจทาน และประเมินความเสี่ยงทางภาษีเบื้องต้นผ่านระบบ OCR AI เท่านั้น **ไม่ใช่ผู้สอบบัญชี สำนักงานบัญชี หรือที่ปรึกษาทางกฎหมายอย่างเป็นทางการ** การประมวลผลและการสแกนบิลไม่รับประกันความถูกต้องแม่นยำ 100% ผู้ใช้มีหน้าที่ตรวจสอบเอกสารทุกชิ้นและขอคำปรึกษาจากสำนักงานบัญชีวิชาชีพก่อนนำส่งข้อมูลต่อกรมสรรพากรจริงทุกครั้ง
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-sm font-black text-[#5A4A68] flex items-center gap-2 border-b border-[#B08CFF]/10 pb-1">
            <span className="bg-[#B08CFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
            ขอบเขตของบริการ (Scope of Service)
          </h2>
          <p className="text-xs text-[#5A4A68]/80 leading-relaxed font-semibold">
            ระบบ Fillax ให้บริการวิเคราะห์และจัดระเบียบเอกสารรายจ่ายผ่านระบบจำแนกรูปภาพอัจฉริยะ (OCR) ร่วมกับปัญญาประดิษฐ์ (Gemini 1.5 Flash API) โดยสกัดข้อมูล ยอดเงิน วันที่ และหมายเลขผู้เสียภาษีของร้านค้าคู่ค้าเพื่อนำไปประเมินความสมบูรณ์ในการหักลดหย่อนภาษี
          </p>
          <ul className="list-disc pl-5 text-[11px] text-[#5A4A68]/70 space-y-1 font-semibold">
            <li>ระบบใช้การคำนวณตรวจสอบรหัสจดทะเบียนคู่ค้า (Modulo-11 Checksum) เพื่อตรวจสอบโครงสร้างหมายเลขผู้เสียภาษี 13 หลัก</li>
            <li>ความมั่นใจการสแกน (Confidence Score) เป็นการประเมินเบื้องต้นจากความคมชัดของภาพบิลเท่านั้น ไม่เป็นการรับรองทางกฎหมาย</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-sm font-black text-[#5A4A68] flex items-center gap-2 border-b border-[#B08CFF]/10 pb-1">
            <span className="bg-[#B08CFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
            การจำกัดความรับผิดสูงสุด (Limitation of Liability)
          </h2>
          <p className="text-xs text-[#5A4A68]/80 leading-relaxed font-semibold">
            ผู้พัฒนาและระบบ Fillax **จะไม่รับผิดชอบต่อความสูญเสีย ความเสียหาย ค่าปรับภาษีย้อนหลัง ค่าคัดค้น หรือความรับผิดชอบใดๆ** ที่เกิดจากความผิดพลาดในการประมวลผลบิล, การคำนวณยอดเงินคลาดเคลื่อน, บิลประทับตราไม่สมบูรณ์ หรือความบกพร่องอื่นๆ ของโมเดล AI OCR
          </p>
          <div className="p-4 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/15 text-[10px] text-[#EF4444] leading-relaxed font-black">
            🔴 ข้อตกลงความปลอดภัยสูงสุด: ความรับผิดรวมสูงสุดของผู้พัฒนาและ Fillax ที่มีต่อผู้ใช้บริการจากข้อร้องเรียนทุกกรณี จะไม่เกินกว่าจำนวนเงินค่าธรรมเนียมที่ผู้ใช้บริการได้ชำระจริงให้แก่ Fillax ในระยะเวลา 1 เดือนก่อนหน้าเหตุการณ์ที่เกิดการร้องเรียน (หรือจำกัดไว้ที่ 0 บาท หากผู้ใช้งานอยู่ในโหมดฟรี)
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-sm font-black text-[#5A4A68] flex items-center gap-2 border-b border-[#B08CFF]/10 pb-1">
            <span className="bg-[#B08CFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">3</span>
            ความปลอดภัยและการประมวลผลข้อมูลส่วนบุคคล (PDPA & Security)
          </h2>
          <p className="text-xs text-[#5A4A68]/80 leading-relaxed font-semibold">
            เราให้ความสำคัญอย่างสูงสุดกับการคุ้มครองข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA):
          </p>
          <ul className="list-decimal pl-5 text-[11px] text-[#5A4A68]/70 space-y-1.5 font-semibold">
            <li>**การจัดเก็บข้อมูล**: ข้อมูลสแกนบิลและภาพถ่ายจะถูกอัปโหลดและจัดเก็บในพื้นที่คลาวด์ที่มีความปลอดภัยขั้นสูง (Supabase Cloud Storage) ซึ่งเปิดใช้งานระบบ Row Level Security (RLS) บังคับสิทธิ์เข้าถึงเฉพาะเจ้าของบัญชีเท่านั้น</li>
            <li>**การจำกัด PII**: ระบบมี WAF Security Shield และ Privacy Filter คัดกรองตัวเลขบัตรประชาชน, บัตรเครดิต, เบอร์โทรศัพท์ และอีเมลส่วนบุคคลออกจากเนื้อหาก่อนส่งไปยัง Gemini API เพื่อป้องกันความเป็นส่วนตัว 100%</li>
            <li>**สิทธิ์ของเจ้าของข้อมูล**: ท่านสามารถขอลบ ทำลาย หรือระงับการประมวลผลประวัติบิลรายจ่ายทั้งหมดของท่านผ่านหน้าจัดการบัญชีได้ตลอดเวลาโดยไม่มีค่าใช้จ่าย</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-sm font-black text-[#5A4A68] flex items-center gap-2 border-b border-[#B08CFF]/10 pb-1">
            <span className="bg-[#B08CFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">4</span>
            เงื่อนไขการสร้างใบแทนใบเสร็จ (มค.๑)
          </h2>
          <p className="text-xs text-[#5A4A68]/80 leading-relaxed font-semibold">
            บริการจัดพิมพ์ใบแทนใบเสร็จรับเงิน (มค.๑) และการสลักลายเซ็นแบบดิจิทัล เป็นเพียงเครื่องมือจัดเตรียมตามโครงสร้างของกรมสรรพากรเท่านั้น ผู้ใช้รับรองว่าธุรกรรมการจ่ายเงินสดที่ระบุเป็นรายจ่ายเพื่อธุรกิจจริง และผู้รับเงินได้ลงชื่อจริงในลายเซ็นอิเล็กทรอนิกส์ การกระทำใดๆ ที่เจตนาทุจริตบิดเบือนข้อมูลรายจ่าย หรือการปลอมลายเซ็นในระบบ ถือเป็นความรับผิดชอบทางอาญาและทางแพ่งของผู้ใช้บริการแต่เพียงผู้เดียว
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-sm font-black text-[#5A4A68] flex items-center gap-2 border-b border-[#B08CFF]/10 pb-1">
            <span className="bg-[#B08CFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">5</span>
            กฎหมายที่ใช้บังคับและการระงับข้อพิพาท (Governing Law)
          </h2>
          <p className="text-xs text-[#5A4A68]/80 leading-relaxed font-semibold">
            ข้อตกลงและเงื่อนไขการใช้บริการนี้ ตลอดจนข้อพิพาทใดๆ ที่เกิดขึ้นหรือเกี่ยวเนื่องกับการใช้บริการระบบ Fillax จะอยู่ภายใต้บังคับและตีความตามกฎหมายของราชอาณาจักรไทย และอยู่ภายใต้เขตอำนาจศาลแห่งราชอาณาจักรไทย
          </p>
        </section>

        {/* Closing Action */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-[#B08CFF]/15 pt-6 mt-2">
          <div className="flex items-center gap-2 text-[10px] text-[#5A4A68]/60 font-black">
            <Lock className="w-4 h-4 text-[#B08CFF]" />
            เอกสารได้รับการคุ้มครองสิทธิ์ความเป็นส่วนตัว
          </div>
          <Link 
            href="/"
            className="h-11 px-6 rounded-2xl bg-[#B08CFF] text-white text-xs font-black shadow-md shadow-[#B08CFF]/25 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            ตกลงและกลับสู่แดชบอร์ดหลัก 📈
          </Link>
        </div>

      </main>
      
      {/* Help links */}
      <div className="text-center text-[10px] text-[#5A4A68]/40 font-semibold italic flex items-center justify-center gap-1 mt-2">
        <HelpCircle className="w-3.5 h-3.5" />
        หากมีข้อสงสัยเพิ่มเติมเกี่ยวกับข้อตกลง หรือเงื่อนไขของ Thai Law, กรุณาติดต่อทีมกฎหมายผู้พัฒนา
      </div>
    </div>
  );
}
