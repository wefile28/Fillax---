"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Receipt, 
  PieChart, 
  Sparkles,
  Crown,
  ArrowUpRight,
  FileSpreadsheet,
  LockKeyhole,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8 },
  },
};



export default function LandingPage() {
  const [billingCycle, setBillingCycle] = React.useState<"annual" | "monthly">("annual");

  const plans = [
    {
      name: "Free Plan",
      desc: "เหมาะสำหรับพ่อค้าแม่ค้าออนไลน์เริ่มต้น ฟรีแลนซ์ และผู้ที่เริ่มต้นจัดระเบียบบัญชีภาษี",
      monthlyPrice: 0,
      annualPrice: 0,
      annualTotal: 0,
      originalMonthly: 0,
      features: [
        "สแกนใบเสร็จด้วย AI OCR สูงสุด 10 ใบต่อเดือน",
        "ปรึกษาผู้ช่วย AI อัจฉริยะ จำกัด 5 คำถามต่อเดือน",
        "ส่งออกรายงานบัญชี (Excel/PDF) ได้สูงสุด 10 ครั้ง",
        "บันทึกรายรับ-รายจ่าย (ด้วยตนเอง) ไม่จำกัดจำนวน",
        "สร้างใบแทนใบเสร็จรับเงิน (มค.๑) พร้อมเซ็นสดดิจิทัล",
        "จำกัดการดูแล 1 ร้านค้า/สถานประกอบการ (Tax ID)",
      ],
      buttonText: "เริ่มต้นใช้งานฟรีทันที",
      variant: "outline" as const,
    },
    {
      name: "Pro Plan",
      desc: "ยกระดับการจัดการธุรกิจ ประหยัดภาษีได้สูงสุด พร้อมระบบวางแผนและผู้ช่วย AI อัจฉริยะส่วนตัวแบบไม่จำกัด",
      monthlyPrice: 199,
      annualPrice: 159.17,
      annualTotal: 1910,
      originalMonthly: 199,
      features: [
        "สแกนใบเสร็จด้วย AI OCR สูงสุด 150 ใบต่อเดือน",
        "ปลดล็อกผู้ช่วย AI (Claude) ปรึกษาภาษีได้ไม่จำกัด",
        "ส่งออกรายงานบัญชี (Excel/PDF) ฟรีไม่จำกัดจำนวนครั้ง",
        "บันทึกรายรับ-รายจ่าย ได้ไม่จำกัดจำนวนรายการ",
        "สร้างใบแทนใบเสร็จรับเงิน (มค.๑) พร้อมเซ็นสดดิจิทัล",
        "ดูแลและจัดการได้สูงสุด 1 ร้านค้า (พร้อมสำรอง Cloud)",
        "อิมพอร์ตเชื่อมยอดขาย Shopee / TikTok / Lazada",
        "ระบบเรดาร์ประเมินความเสี่ยงสรรพากร (Tax Risk Radar)",
      ],
      buttonText: "อัปเกรดเป็นโปรอัจฉริยะ",
      variant: "default" as const,
      isPopular: true,
    },
    {
      name: "Agency Plan",
      desc: "ที่สุดของการดูแลบัญชีและภาษีระดับองค์กร สำหรับสำนักงานบัญชีหรือผู้ดูแลหลายร้านค้าในเครือข่ายเดียว",
      monthlyPrice: 499,
      annualPrice: 399.17,
      annualTotal: 4790,
      originalMonthly: 499,
      features: [
        "สแกนใบเสร็จด้วย AI OCR สูงสุด 1,500 ใบต่อเดือน",
        "ปลดล็อกผู้ช่วย AI (Claude) ไม่จำกัด + Advanced Audit",
        "ส่งออกรายงานบัญชี (Excel/PDF) ฟรีไม่จำกัดจำนวนครั้ง",
        "บันทึกรายรับ-รายจ่าย ได้ไม่จำกัดจำนวนรายการ",
        "สร้างใบแทนใบเสร็จรับเงิน (มค.๑) พร้อมเซ็นสดดิจิทัล",
        "ดูแลและจัดการแยกบัญชีได้สูงสุด 10 ร้านค้า (Tax IDs)",
        "อิมพอร์ตเชื่อมยอดขาย Shopee / TikTok / Lazada",
        "ระบบเรดาร์ประเมินความเสี่ยงพร้อมระบบแชร์ผู้สอบบัญชี",
      ],
      buttonText: "อัปเกรดเป็นตัวแทนองค์กร",
      variant: "default" as const,
    }
  ];

  const steps = [
    {
      step: "01",
      title: "1. ส่งใบเสร็จให้ Fillax",
      desc: "ถ่ายรูป อัปโหลดภาพ หรืออัปโหลดไฟล์ PDF ได้อย่างรวดเร็วและปลอดภัย",
      orderClass: "md:order-1",
      preview: (
        <div className="w-full flex flex-col justify-center items-center gap-3">
          <div className="relative w-full h-[85px] flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md" />
            <div className="absolute inset-2 border-2 border-dashed border-primary/20 rounded-xl flex items-center justify-center" />
            
            <div className="absolute left-[24%] top-4 transform -rotate-12 bg-white border border-[#E9EEF5] px-2 py-1.5 rounded-lg shadow-sm w-12 h-14 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1">
              <Receipt className="w-3.5 h-3.5 text-slate-300" />
              <div className="space-y-0.5">
                <div className="w-6 h-0.5 bg-slate-100 rounded" />
                <div className="w-4 h-0.5 bg-slate-100 rounded" />
              </div>
            </div>
            
            <div className="absolute right-[24%] top-5 transform rotate-12 bg-white border border-[#E9EEF5] px-2 py-1.5 rounded-lg shadow-sm w-12 h-14 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1">
              <Receipt className="w-3.5 h-3.5 text-slate-300" />
              <div className="space-y-0.5">
                <div className="w-6 h-0.5 bg-slate-100 rounded" />
                <div className="w-4 h-0.5 bg-slate-100 rounded" />
              </div>
            </div>
            
            <div className="absolute bg-white/95 border border-primary/25 backdrop-blur-sm px-2.5 py-2 rounded-xl shadow-lg w-[95px] h-[70px] flex flex-col justify-between z-10 transition-transform duration-300 group-hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5 text-primary animate-bounce" />
                </div>
                <span className="text-[8px] font-black text-primary font-mono tracking-tight">100%</span>
              </div>
              <div className="space-y-1">
                <div className="text-[8px] font-bold text-foreground truncate">receipt.pdf</div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-primary rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 justify-center">
            <span className="text-[8px] bg-primary/10 text-primary font-black px-2 py-0.5 rounded-full border border-primary/25 select-none">JPG / PNG</span>
            <span className="text-[8px] bg-amber-500/10 text-amber-600 font-black px-2 py-0.5 rounded-full border border-amber-500/25 select-none">PDF</span>
            <span className="text-[8px] bg-emerald-500/10 text-emerald-600 font-black px-2 py-0.5 rounded-full border border-emerald-500/25 select-none">LINE</span>
          </div>
        </div>
      )
    },
    {
      step: "02",
      title: "2. AI อ่านและจัดหมวด",
      desc: "AI อัจฉริยะวิเคราะห์ ถอดตัวเลขยอดเงิน และจัดเข้าหมวดหมู่ภาษีรายจ่ายอัตโนมัติ",
      orderClass: "md:order-2",
      preview: (
        <div className="w-full flex flex-col justify-center items-center gap-3">
          <div className="relative w-full h-[85px] flex items-center justify-center overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes laserScan {
                0%, 100% { transform: translateY(-30px); opacity: 0.3; }
                50% { transform: translateY(30px); opacity: 1; }
              }
              .animate-laser {
                animation: laserScan 2.5s infinite ease-in-out;
              }
            `}} />
            
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[50px] bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5 rounded-lg blur-md" />
            
            <div className="bg-white border border-[#E9EEF5] px-3 py-2.5 rounded-xl shadow-md w-[120px] h-[75px] flex flex-col justify-between relative overflow-hidden transition-transform duration-300 group-hover:scale-102">
              <div className="absolute inset-x-0 h-[2px] bg-primary shadow-[0_0_8px_rgba(176,140,255,0.8)] animate-laser" />
              
              <div className="space-y-1">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <div className="w-8 h-1 bg-slate-200 rounded" />
                  <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                </div>
                <div className="space-y-0.5 pt-1">
                  <div className="w-full h-1 bg-slate-100 rounded" />
                  <div className="w-4/5 h-1 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div className="w-10 h-2 bg-emerald-500/10 border border-emerald-500/25 rounded-md flex items-center justify-center text-[6px] font-black text-emerald-600">
                  VAT 7%
                </div>
                <span className="text-[8px] font-mono font-black text-primary">฿2,450.00</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-1 justify-center">
            <span className="text-[8px] bg-blue-500 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow-sm select-none">ใบกำกับภาษี</span>
            <span className="text-[8px] bg-emerald-500 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow-sm select-none">ค่าซอฟต์แวร์</span>
          </div>
        </div>
      )
    },
    {
      step: "03",
      title: "3. เช็คบริษัทฐานข้อมูลไทย",
      desc: "ตรวจสอบและยืนยันข้อมูลนิติบุคคลผู้ขายกับฐานข้อมูลกรมพัฒนาธุรกิจการค้าทันที",
      orderClass: "md:order-3",
      preview: (
        <div className="w-full flex flex-col justify-center items-center gap-3">
          <div className="relative w-full h-[85px] flex items-center justify-center gap-3">
            <div className="w-12 h-[70px] bg-gradient-to-b from-[#4F46E5]/10 to-[#312E81]/5 border border-primary/20 rounded-xl flex flex-col justify-between py-2 px-1 shadow-inner shrink-0 relative overflow-hidden group-hover:border-primary/40 transition-all duration-300">
              <div className="absolute inset-0 bg-primary/[0.02] animate-pulse" />
              <div className="w-full h-2.5 border-b border-primary/20 rounded-full bg-primary/20 flex items-center justify-end px-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" /></div>
              <div className="w-full h-2.5 border-b border-primary/20 rounded-full bg-primary/10 flex items-center justify-end px-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500" /></div>
              <div className="w-full h-2.5 rounded-full bg-primary/15 flex items-center justify-end px-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500" /></div>
            </div>
            
            <div className="bg-white border border-[#E9EEF5] p-2.5 rounded-xl shadow-md text-left leading-tight w-[130px] shrink-0 space-y-1 relative hover:border-emerald-500/30 transition-all duration-300 group-hover:scale-102">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <span className="text-[7px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-black border border-emerald-500/20">ดบธ. VERIFIED</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="space-y-0.5 pt-0.5">
                <p className="text-[8px] font-black text-foreground truncate">บริษัท คลาวด์ เทคโนโลยี จำกัด</p>
                <p className="text-[7px] font-mono text-muted-foreground tracking-tight">Tax ID: 0105562098741</p>
                <div className="flex items-center gap-1 text-[6px] text-emerald-600 font-extrabold">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                  สถานะนิติบุคคล: ดำเนินกิจการอยู่
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full h-1" />
        </div>
      )
    },
    {
      step: "04",
      title: "4. สร้างเอกสารบัญชี",
      desc: "สรุปยอดพิมพ์แบบเอกสาร มค.๑ และใบสำคัญรับเงินที่ได้มาตรฐานสรรพากรครบถ้วน",
      orderClass: "md:order-6",
      preview: (
        <div className="w-full flex flex-col justify-center items-center gap-3">
          <div className="relative w-full h-[85px] flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md" />
            
            <div className="bg-white border border-[#E9EEF5] p-2.5 rounded-xl shadow-md w-[140px] h-[75px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 group-hover:scale-102">
              <div className="border-b border-slate-100 pb-1.5">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[8px] font-black text-foreground">ใบแทนใบเสร็จรับเงิน (มค.๑)</p>
                  <span className="text-[6px] bg-primary/10 text-primary font-black px-1.5 py-0.5 rounded border border-primary/20 animate-pulse">AUDIT READY</span>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-1 bg-slate-100 rounded" />
                    <div className="w-6 h-1 bg-slate-100 rounded" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="w-14 h-1 bg-slate-100 rounded" />
                    <div className="w-5 h-1 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="text-[6px] text-muted-foreground font-bold">
                  ผู้รับเงิน: สมชาย ยินดี
                </div>
                <div className="relative">
                  <svg width="40" height="15" viewBox="0 0 40 15" className="text-primary/80 animate-pulse">
                    <path d="M2 12 C 10 5, 15 2, 22 13 C 28 8, 32 3, 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </svg>
                  <div className="text-[4px] scale-50 origin-bottom-right text-muted-foreground font-mono">DIGITAL SIGNATURE</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full h-1" />
        </div>
      )
    },
    {
      step: "05",
      title: "5. ซิงก์เข้า Drive & Sheets",
      desc: "สำรองและซิงก์ข้อมูลบัญชีร้านค้าไปยัง Google Drive และ Google Sheets เรียลไทม์",
      orderClass: "md:order-5",
      preview: (
        <div className="w-full flex flex-col justify-center items-center gap-3">
          <div className="relative w-full h-[85px] flex items-center justify-center">
            <div className="absolute w-24 h-24 border border-dashed border-primary/20 rounded-full animate-spin [animation-duration:12s]" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-12 bg-[#38BDF8] rounded-xl shadow-[0_6px_16px_rgba(56,189,248,0.25)] border border-[#0EA5E9]/30 relative flex flex-col items-center justify-end pb-2 border-t-[6px] border-[#0EA5E9] transition-transform duration-300 group-hover:scale-105">
                <div className="flex gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-sm" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-sm" />
                </div>
                <span className="text-[7px] text-white font-extrabold tracking-widest uppercase font-mono">SYNCING</span>
              </div>
              
              <div className="flex flex-col gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-white border border-[#E9EEF5] shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-center hover:scale-110 transition-transform duration-300 relative group/icon">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M19 13L12 2L5 13H19Z" fill="#FFC107" />
                    <path d="M12 2L5 13L9 20H16L12 2Z" fill="#4CAF50" />
                    <path d="M12 2L16 9L19 13H5L12 2Z" fill="#2196F3" />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[5px] text-white font-black animate-pulse">✓</span>
                </div>
                <div className="w-7 h-7 rounded-xl bg-white border border-[#E9EEF5] shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-center hover:scale-110 transition-transform duration-300 relative group/icon">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" fill="#0F9D58" />
                    <rect x="7" y="7" width="10" height="10" fill="white" />
                    <line x1="7" y1="12" x2="17" y2="12" stroke="#0F9D58" strokeWidth="1.5" />
                    <line x1="12" y1="7" x2="12" y2="17" stroke="#0F9D58" strokeWidth="1.5" />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[5px] text-white font-black animate-pulse">✓</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full h-1" />
        </div>
      )
    },
    {
      step: "06",
      title: "6. พร้อมส่งให้บัญชี",
      desc: "ส่งออกไฟล์ Excel/PDF แยกหมวดรายรับรายจ่าย พร้อมยื่นแบบภาษีออนไลน์ได้ทันที",
      orderClass: "md:order-4",
      preview: (
        <div className="w-full flex flex-col justify-center items-center gap-3">
          <div className="relative w-full h-[85px] flex items-center justify-center gap-3.5">
            <div className="absolute inset-0 bg-emerald-500/[0.03] rounded-2xl blur-md" />
            
            <div className="w-14 h-11 bg-amber-400 rounded-xl shadow-[0_6px_16px_rgba(245,158,11,0.2)] relative flex items-end p-2 border-t-[6px] border-amber-500 transition-transform duration-300 group-hover:scale-105 shrink-0">
              <div className="w-full h-1 bg-white/40 rounded mb-0.5" />
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black absolute -bottom-1.5 -right-1.5 shadow-md border-2 border-white animate-bounce">✓</span>
            </div>
            
            <div className="w-[85px] h-[70px] bg-white border border-emerald-100 p-2 rounded-xl shadow-lg flex flex-col justify-between relative overflow-hidden transition-all duration-300 group-hover:scale-105">
              <div className="flex items-center gap-1 border-b border-emerald-50 pb-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[7px] font-black text-emerald-700 tracking-tight font-mono truncate">TAX_REPORT.xlsx</span>
              </div>
              <div className="space-y-0.5">
                <div className="w-full h-1 bg-slate-50 rounded" />
                <div className="flex justify-between items-center">
                  <div className="w-8 h-1 bg-emerald-100 rounded" />
                  <div className="w-4 h-1 bg-emerald-500 rounded" />
                </div>
                <div className="w-full h-1 bg-slate-50 rounded" />
              </div>
              <div className="flex items-center justify-between text-[5px] text-slate-400 font-mono">
                <span>EXPORT OK</span>
                <span className="text-[6px] text-emerald-600 font-bold">120 KB</span>
              </div>
            </div>
          </div>
          
          <div className="w-full h-1" />
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between glass border-none rounded-3xl px-6 py-3 shadow-2xl shadow-primary/5">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity focus:outline-none bg-transparent border-none p-0"
          >
            <Image
              src="/fillax-mascot.png"
              alt="Fillax Logo"
              width={48}
              height={48}
              className="w-12 h-12 rounded-2xl object-contain border-2 border-primary/15 shadow-md hover:scale-110 transition-transform duration-300 hover:border-primary/30"
            />
            <span className="font-black text-xl tracking-tighter text-foreground uppercase">
              Fillax
            </span>
          </button>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground">
            <Link href="#features" className="hover:text-primary transition-colors">ฟีเจอร์เด่น</Link>
            <Link href="#how-it-works" className="hover:text-primary transition-colors">วิธีการทำงาน</Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">ราคาแพ็กเกจ</Link>
          </div>

          <Link href="/dashboard">
            <Button className="rounded-2xl px-6 font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
              เริ่มต้นใช้งาน
            </Button>
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-40 pb-40 px-6 overflow-hidden min-h-[90vh] flex items-center">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
              className="space-y-8"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                อนาคตของการจัดการภาษีร้านค้า
              </motion.div>
              
              <motion.h1 variants={itemVariants} className="text-6xl md:text-7xl font-black tracking-tight leading-[1.1] text-foreground">
                จัดการภาษี <br />
                <span className="text-primary italic">ให้เป็นเรื่องสนุก</span>
              </motion.h1>
              
              <motion.p variants={itemVariants} className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                ระบบผู้ช่วยบัญชีและภาษีอัจฉริยะที่ช่วยให้คุณสแกนใบเสร็จ วางแผนลดหย่อน 
                และสรุปรายงานทางการเงินได้ในพริบตา
              </motion.p>
              
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-14 px-8 rounded-2xl text-lg font-black shadow-2xl shadow-primary/30 group">
                    เริ่มต้นใช้งานฟรี
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              whileInView={{ opacity: 1, scale: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2 }}
              className="relative flex items-center justify-center"
            >
              <div className="relative z-10 w-full max-w-[500px] aspect-square rounded-[3rem] overflow-hidden drop-shadow-2xl transition-transform duration-700 hover:scale-105">
                <Image 
                  src="/fillax-hero-mascot.png" 
                  alt="Fillax Mascot" 
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 bg-primary/5">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">ฟีเจอร์ที่ช่วยให้คุณ<span className="text-primary italic">โตไวกว่า</span></h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                เราคัดสรรเครื่องมือที่จำเป็นที่สุดสำหรับพ่อค้าแม่ค้าออนไลน์ยุคใหม่มาไว้ในที่เดียว
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  title: "สแกนใบเสร็จอัตโนมัติ", 
                  desc: "ไม่ต้องพิมพ์เองให้เสียเวลา แค่ถ่ายรูป ระบบ AI จะแยกยอดและหมวดหมู่ให้ทันที",
                  icon: Receipt,
                  color: "bg-blue-500"
                },
                { 
                  title: "สรุปงบการเงินเรียลไทม์", 
                  desc: "ดูรายรับ รายจ่าย และกำไรสุทธิผ่าน Dashboard ที่เข้าใจง่ายที่สุด",
                  icon: PieChart,
                  color: "bg-purple-500"
                },
                { 
                  title: "ประเมินความเสี่ยงภาษี", 
                  desc: "ระบบช่วยเช็คว่าคุณมีความเสี่ยงที่จะโดนเรียกตรวจไหม พร้อมคำแนะนำการลดหย่อน",
                  icon: ShieldCheck,
                  color: "bg-green-500"
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="glass p-8 rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${feature.color}/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-7 h-7 text-foreground`} />
                  </div>
                  <h3 className="text-2xl font-black mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Flagship Feature Spotlight: มค.๑ Substitution Receipt */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-primary/10 via-primary/5 to-amber-500/10 p-8 md:p-12 border-2 border-primary/20 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-10 group hover:border-primary/40 transition-all"
            >
              <div className="space-y-6 max-w-2xl text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-700 text-xs font-black uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  ฟีเจอร์เด่นชูโรง (Flagship Feature)
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                  หมดปัญหาจ่ายเงินแล้วไม่มีใบเสร็จด้วย <br />
                  <span className="text-primary italic">&quot;ใบแทนใบเสร็จรับเงิน (มค.๑) ดิจิทัล&quot;</span> 📝
                </h3>
                <p className="text-muted-foreground text-sm font-semibold leading-relaxed">
                  แม่ค้าออนไลน์และร้านค้ายุคใหม่มักประสบปัญหาการจ่ายเงินค่าวินมอเตอร์ไซค์, ค่าจ้างขนของทั่วไป หรือผู้รับจ้างอิสระรายย่อยที่ไม่มีใบเสร็จให้ ทำให้ลงบันทึกรายจ่ายภาษีไม่ได้ 
                  <br />
                  <strong className="text-foreground">Fillax แก้ไขจุดนี้ได้อย่างสมบูรณ์แบบ!</strong> ด้วยระบบสร้างแบบฟอร์ม มค.๑ สำเร็จรูป ถูกต้องตามหลักสรรพากร 100% พร้อมลายเซ็นดิจิทัลสดที่ให้ผู้รับเงินเซ็นชื่อสดบนหน้าจอได้ทันที ฟรีไม่มีจำกัด!
                </p>
                <div className="flex gap-4">
                  <Link href="/dashboard">
                    <Button className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform bg-primary text-white">
                      สร้างใบแทนใบเสร็จ มค.๑ ฟรี ⚡
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative w-full max-w-[320px] aspect-video bg-background border border-border/60 rounded-2xl shadow-inner flex items-center justify-center p-6 shrink-0 group-hover:scale-102 transition-transform">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-foreground">ใบแทนใบเสร็จรับเงิน มค.๑</p>
                    <p className="text-[10px] text-muted-foreground">พร้อมลายเซ็นอิเล็กทรอนิกส์สดบนหน้าจอ</p>
                  </div>
                  <div className="h-10 w-40 border border-dashed border-primary/40 rounded-lg bg-primary/5 flex items-center justify-center text-[10px] text-primary italic font-bold">
                    [ พื้นที่เซ็นชื่อสดบนหน้าจอ ]
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24 px-6 relative overflow-hidden bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent">
          <div className="absolute inset-0 bg-primary/[0.01] -z-10" />
          
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                ระบบการทำงานอัจฉริยะ (Smart Workflow)
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                จากใบเสร็จใบเดียว สู่ <span className="text-primary italic">คลังเอกสารพร้อมส่งบัญชี</span> ⚡
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                ระบบนิเวศน์ทางภาษีของ Fillax ที่รวบรวมเทคโนโลยีสแกน คัดแยก และวิเคราะห์ข้อมูลไว้ในกระบวนการทำงานเดียว
              </p>
            </div>

            {/* Custom keyframe styles for laser flows */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes laserRight {
                0% { stroke-dashoffset: 80; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes laserLeft {
                0% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: 80; }
              }
              @keyframes laserDown {
                0% { stroke-dashoffset: 120; }
                100% { stroke-dashoffset: 0; }
              }
            `}} />

            <div className="relative max-w-6xl mx-auto pt-8">
              {/* Global Shared SVG Defs for Neon Gradients & Glow Filters */}
              <svg width="0" height="0" className="absolute pointer-events-none">
                <defs>
                  <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8C66FF" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
              </svg>


              {/* Desktop Grid Layout: 5 Columns (Card, Arrow, Card, Arrow, Card) */}
              <div className="hidden lg:grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-y-24 items-center w-full relative">
                
                {/* --- ROW 1: Steps 1 -> 2 -> 3 --- */}
                
                {/* Step 1 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center col-span-1 w-full"
                >
                  <div className="relative p-[2px] rounded-[2.2rem] bg-gradient-to-br from-primary/15 via-slate-100 to-emerald-500/15 hover:from-primary/50 hover:to-emerald-500/50 hover:shadow-[0_20px_50px_rgba(140,102,255,0.12)] transition-all duration-700 group hover:-translate-y-1 w-full">
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-primary to-primary/80 text-white font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md z-20 select-none">
                      STEP {steps[0].step}
                    </div>
                    <div className="bg-white rounded-[2.1rem] p-6 flex flex-col justify-between min-h-[350px] relative overflow-hidden">
                      <div className="w-full h-[185px] bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center justify-center p-4 overflow-hidden relative shadow-inner mb-5 group-hover:bg-white transition-all duration-500">
                        {steps[0].preview}
                      </div>
                      <div className="text-left space-y-1.5">
                        <h4 className="text-[15px] font-black text-slate-800 group-hover:text-primary transition-colors tracking-tight">
                          {steps[0].title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                          {steps[0].desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Horizontal Connector Right 1 -> 2 */}
                <div className="hidden lg:flex items-center justify-center w-full h-full relative pointer-events-none min-w-[50px] max-w-[80px] self-center">
                  <svg width="100%" height="20" viewBox="0 0 80 20" preserveAspectRatio="none" className="w-full text-primary/70">
                    <line x1="0" y1="10" x2="80" y2="10" stroke="url(#neonGrad)" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
                    <line
                      x1="0"
                      y1="10"
                      x2="80"
                      y2="10"
                      stroke="#8C66FF"
                      strokeWidth="3.5"
                      strokeDasharray="12 68"
                      strokeLinecap="round"
                      filter="url(#laserGlow)"
                      className="animate-[laserRight_3s_linear_infinite]"
                    />
                  </svg>
                </div>

                {/* Step 2 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center col-span-1 w-full"
                >
                  <div className="relative p-[2px] rounded-[2.2rem] bg-gradient-to-br from-primary/15 via-slate-100 to-emerald-500/15 hover:from-primary/50 hover:to-emerald-500/50 hover:shadow-[0_20px_50px_rgba(140,102,255,0.12)] transition-all duration-700 group hover:-translate-y-1 w-full">
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-primary to-primary/80 text-white font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md z-20 select-none">
                      STEP {steps[1].step}
                    </div>
                    <div className="bg-white rounded-[2.1rem] p-6 flex flex-col justify-between min-h-[350px] relative overflow-hidden">
                      <div className="w-full h-[185px] bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center justify-center p-4 overflow-hidden relative shadow-inner mb-5 group-hover:bg-white transition-all duration-500">
                        {steps[1].preview}
                      </div>
                      <div className="text-left space-y-1.5">
                        <h4 className="text-[15px] font-black text-slate-800 group-hover:text-primary transition-colors tracking-tight">
                          {steps[1].title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                          {steps[1].desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Horizontal Connector Right 2 -> 3 */}
                <div className="hidden lg:flex items-center justify-center w-full h-full relative pointer-events-none min-w-[50px] max-w-[80px] self-center">
                  <svg width="100%" height="20" viewBox="0 0 80 20" preserveAspectRatio="none" className="w-full text-primary/70">
                    <line x1="0" y1="10" x2="80" y2="10" stroke="url(#neonGrad)" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
                    <line
                      x1="0"
                      y1="10"
                      x2="80"
                      y2="10"
                      stroke="#8C66FF"
                      strokeWidth="3.5"
                      strokeDasharray="12 68"
                      strokeLinecap="round"
                      filter="url(#laserGlow)"
                      className="animate-[laserRight_3s_linear_infinite]"
                    />
                  </svg>
                </div>

                {/* Step 3 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center col-span-1 w-full relative"
                >
                  <div className="relative p-[2px] rounded-[2.2rem] bg-gradient-to-br from-primary/15 via-slate-100 to-emerald-500/15 hover:from-primary/50 hover:to-emerald-500/50 hover:shadow-[0_20px_50px_rgba(140,102,255,0.12)] transition-all duration-700 group hover:-translate-y-1 w-full">
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-primary to-primary/80 text-white font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md z-20 select-none">
                      STEP {steps[2].step}
                    </div>
                    <div className="bg-white rounded-[2.1rem] p-6 flex flex-col justify-between min-h-[350px] relative overflow-hidden">
                      <div className="w-full h-[185px] bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center justify-center p-4 overflow-hidden relative shadow-inner mb-5 group-hover:bg-white transition-all duration-500">
                        {steps[2].preview}
                      </div>
                      <div className="text-left space-y-1.5">
                        <h4 className="text-[15px] font-black text-slate-800 group-hover:text-primary transition-colors tracking-tight">
                          {steps[2].title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                          {steps[2].desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sinuous Vertical Arc Connector (Perfect relative positioning between Step 3 and Step 4) */}
                  <div className="hidden lg:flex absolute left-1/2 bottom-[-96px] -translate-x-1/2 z-30 flex-col items-center justify-center w-12 h-[96px] pointer-events-none">
                    <svg width="48" height="96" viewBox="0 0 48 96" fill="none" className="text-primary/70">
                      <path
                        d="M 24 0 C 44 24, 44 72, 24 96"
                        stroke="url(#neonGrad)"
                        strokeWidth="2.5"
                        strokeDasharray="4 6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 24 0 C 44 24, 44 72, 24 96"
                        stroke="#8C66FF"
                        strokeWidth="3.5"
                        strokeDasharray="15 81"
                        strokeLinecap="round"
                        filter="url(#laserGlow)"
                        className="animate-[laserDown_3.5s_linear_infinite]"
                      />
                    </svg>
                  </div>
                </motion.div>


                {/* --- ROW 2: Steps 6 <- 5 <- 4 (Right to Left flow) --- */}

                {/* Step 6 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col items-center col-span-1 w-full animate-delay-200"
                >
                  <div className="relative p-[2px] rounded-[2.2rem] bg-gradient-to-br from-emerald-500/10 via-slate-100 to-primary/10 hover:from-emerald-500/50 hover:to-primary/50 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] transition-all duration-700 group hover:-translate-y-1 w-full">
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md z-20 select-none">
                      STEP {steps[5].step}
                    </div>
                    <div className="bg-white rounded-[2.1rem] p-6 flex flex-col justify-between min-h-[350px] relative overflow-hidden">
                      <div className="w-full h-[185px] bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center justify-center p-4 overflow-hidden relative shadow-inner mb-5 group-hover:bg-white transition-all duration-500">
                        {steps[5].preview}
                      </div>
                      <div className="text-left space-y-1.5">
                        <h4 className="text-[15px] font-black text-slate-800 group-hover:text-emerald-600 transition-colors tracking-tight">
                          {steps[5].title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                          {steps[5].desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Horizontal Connector Left 5 -> 6 (Direction: Left) */}
                <div className="hidden lg:flex items-center justify-center w-full h-full relative pointer-events-none min-w-[50px] max-w-[80px] self-center">
                  <svg width="100%" height="20" viewBox="0 0 80 20" preserveAspectRatio="none" className="w-full text-emerald-500">
                    <line x1="0" y1="10" x2="80" y2="10" stroke="url(#neonGrad)" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
                    <line
                      x1="0"
                      y1="10"
                      x2="80"
                      y2="10"
                      stroke="#10B981"
                      strokeWidth="3.5"
                      strokeDasharray="12 68"
                      strokeLinecap="round"
                      filter="url(#laserGlow)"
                      className="animate-[laserLeft_3s_linear_infinite]"
                    />
                  </svg>
                </div>

                {/* Step 5 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col items-center col-span-1 w-full"
                >
                  <div className="relative p-[2px] rounded-[2.2rem] bg-gradient-to-br from-primary/15 via-slate-100 to-emerald-500/15 hover:from-primary/50 hover:to-emerald-500/50 hover:shadow-[0_20px_50px_rgba(140,102,255,0.12)] transition-all duration-700 group hover:-translate-y-1 w-full">
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-primary to-primary/80 text-white font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md z-20 select-none">
                      STEP {steps[4].step}
                    </div>
                    <div className="bg-white rounded-[2.1rem] p-6 flex flex-col justify-between min-h-[350px] relative overflow-hidden">
                      <div className="w-full h-[185px] bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center justify-center p-4 overflow-hidden relative shadow-inner mb-5 group-hover:bg-white transition-all duration-500">
                        {steps[4].preview}
                      </div>
                      <div className="text-left space-y-1.5">
                        <h4 className="text-[15px] font-black text-slate-800 group-hover:text-primary transition-colors tracking-tight">
                          {steps[4].title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                          {steps[4].desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Horizontal Connector Left 4 -> 5 (Direction: Left) */}
                <div className="hidden lg:flex items-center justify-center w-full h-full relative pointer-events-none min-w-[50px] max-w-[80px] self-center">
                  <svg width="100%" height="20" viewBox="0 0 80 20" preserveAspectRatio="none" className="w-full text-emerald-500">
                    <line x1="0" y1="10" x2="80" y2="10" stroke="url(#neonGrad)" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
                    <line
                      x1="0"
                      y1="10"
                      x2="80"
                      y2="10"
                      stroke="#10B981"
                      strokeWidth="3.5"
                      strokeDasharray="12 68"
                      strokeLinecap="round"
                      filter="url(#laserGlow)"
                      className="animate-[laserLeft_3s_linear_infinite]"
                    />
                  </svg>
                </div>

                {/* Step 4 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col items-center col-span-1 w-full"
                >
                  <div className="relative p-[2px] rounded-[2.2rem] bg-gradient-to-br from-primary/15 via-slate-100 to-emerald-500/15 hover:from-primary/50 hover:to-emerald-500/50 hover:shadow-[0_20px_50px_rgba(140,102,255,0.12)] transition-all duration-700 group hover:-translate-y-1 w-full">
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-primary to-primary/80 text-white font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md z-20 select-none">
                      STEP {steps[3].step}
                    </div>
                    <div className="bg-white rounded-[2.1rem] p-6 flex flex-col justify-between min-h-[350px] relative overflow-hidden">
                      <div className="w-full h-[185px] bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center justify-center p-4 overflow-hidden relative shadow-inner mb-5 group-hover:bg-white transition-all duration-500">
                        {steps[3].preview}
                      </div>
                      <div className="text-left space-y-1.5">
                        <h4 className="text-[15px] font-black text-slate-800 group-hover:text-primary transition-colors tracking-tight">
                          {steps[3].title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                          {steps[3].desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>

              {/* Mobile / Tablet Responsive Layout: Vertical Sinuous Flow */}
              <div className="lg:hidden flex flex-col gap-6 max-w-sm mx-auto">
                {steps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex flex-col items-center w-full"
                    >
                      <div className={`relative p-[2px] rounded-[2.2rem] bg-gradient-to-br w-full transition-all duration-500 ${idx === 5 ? "from-emerald-500/15 via-slate-100 to-primary/15 hover:from-emerald-500/50 hover:to-primary/50" : "from-primary/15 via-slate-100 to-emerald-500/15 hover:from-primary/50 hover:to-emerald-500/50"}`}>
                        <div className={`absolute -top-3 left-6 text-white font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md z-20 select-none bg-gradient-to-r ${idx === 5 ? "from-emerald-500 to-emerald-400" : "from-primary to-primary/80"}`}>
                          STEP {step.step}
                        </div>
                        <div className="bg-white rounded-[2.1rem] p-6 flex flex-col justify-between min-h-[330px] relative overflow-hidden">
                          <div className="w-full h-[175px] bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center justify-center p-4 overflow-hidden relative shadow-inner mb-4">
                            {step.preview}
                          </div>
                          <div className="text-left space-y-1.5">
                            <h4 className={`text-[14px] font-black tracking-tight transition-colors ${idx === 5 ? "text-slate-800 hover:text-emerald-600" : "text-slate-800 hover:text-primary"}`}>
                              {step.title}
                            </h4>
                            <p className="text-[10.5px] text-muted-foreground font-semibold leading-relaxed">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    
                    {idx < 5 && (
                      <div className="flex items-center justify-center py-2 text-primary/60">
                        <svg width="20" height="40" viewBox="0 0 20 40" fill="none" className="text-primary/70">
                          <line x1="10" y1="0" x2="10" y2="40" stroke="url(#neonGrad)" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
                          <line
                            x1="10"
                            y1="0"
                            x2="10"
                            y2="40"
                            stroke="#8C66FF"
                            strokeWidth="3.5"
                            strokeDasharray="10 30"
                            strokeLinecap="round"
                            filter="url(#glowFilter)"
                            className="animate-[laserDown_2s_linear_infinite]"
                          />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-6 bg-gradient-to-b from-transparent to-[#FFF7F0]/30 relative overflow-hidden">
          <div className="max-w-7xl mx-auto space-y-16">
            
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
                <Crown className="w-3.5 h-3.5" />
                คุ้มค่าและโปร่งใสที่สุด
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">เลือกแพลนที่เหมาะกับ<span className="text-primary italic">ธุรกิจคุณ</span></h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                เริ่มต้นบันทึกบัญชีและลดหย่อนภาษีได้ทันทีฟรีตลอดชีพ หรือยกระดับสู่มืออาชีพด้วยสิทธิพิเศษแบบไร้ขีดจำกัด
              </p>
            </div>

            {/* Mascot Showcase */}
            <div className="flex justify-center -mb-8 relative z-20">
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative group flex flex-col items-center"
              >
                {/* Glowing Purple/Orange Background Halo */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-purple-500/20 blur-2xl rounded-full scale-75 group-hover:scale-95 transition-transform duration-700" />
                
                {/* Mascot image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/fillax-mascot.png"
                  alt="Fillax Mascot"
                  width={140}
                  height={140}
                  className="w-28 h-28 md:w-32 md:h-32 object-contain relative z-10 transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Cute Presentation Speech Bubble */}
                <div className="absolute -top-8 -right-24 md:-right-28 bg-white dark:bg-slate-900 border border-primary/20 rounded-2xl px-3 py-1.5 shadow-lg relative z-10 text-[10px] font-black text-primary whitespace-nowrap tracking-wide flex items-center gap-1">
                  <span>เลือกแพลนที่คุ้มที่สุด</span>
                  <div className="absolute bottom-0 left-6 translate-y-1/2 rotate-45 w-2 h-2 bg-white dark:bg-slate-900 border-r border-b border-primary/20" />
                </div>
              </motion.div>
            </div>

            {/* Custom Sliding Billing Toggle */}
            <div className="flex justify-center mb-10 relative z-30">
              <div className="inline-flex items-center p-1 bg-[#F1F3F5] dark:bg-slate-800/80 rounded-full select-none shadow-inner border border-slate-200/20">
                {/* Annual Selector */}
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`relative px-4 py-2 rounded-full text-xs font-black transition-all duration-300 flex items-center gap-2 ${
                    billingCycle === "annual"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span>รายปี</span>
                  <span className="bg-[#65C466] text-white px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide">
                    ประหยัดสูงสุด 20%
                  </span>
                </button>

                {/* Monthly Selector */}
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`relative px-5 py-2 rounded-full text-xs font-black transition-all duration-300 ${
                    billingCycle === "monthly"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  รายเดือน
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
              {plans.map((plan, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className={`glass bg-[#FFF7F0]/80 backdrop-blur-xl border rounded-3xl p-6 md:p-8 relative flex flex-col justify-between shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 ${
                    plan.isPopular ? "border-primary/45 ring-1 ring-primary/20 shadow-primary/5" : "border-primary/15"
                  }`}
                >
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                        {plan.isPopular && (
                          <span className="text-[9px] bg-primary text-white font-black px-2 py-0.5 rounded-full shadow-sm uppercase">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs font-semibold leading-relaxed">
                        {plan.desc}
                      </p>
                    </div>

                    {plan.monthlyPrice === 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-black text-foreground">0 บาท</span>
                        </div>
                        <p className="text-muted-foreground text-xs font-semibold">ต่อเดือน</p>
                      </div>
                    ) : billingCycle === "annual" ? (
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-muted-foreground line-through block">
                          {plan.originalMonthly} บาท
                        </span>
                        <div className="flex items-baseline gap-1.5 -mt-1">
                          <span className="text-4xl font-black text-foreground">
                            {plan.annualPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs font-semibold">
                          ต่อเดือน • {plan.annualTotal.toLocaleString()} บาท/ปี
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Empty spacer block to keep height identical to annual struck-out block */}
                        <span className="text-sm font-semibold text-transparent block select-none">
                          {plan.originalMonthly} บาท
                        </span>
                        <div className="flex items-baseline gap-1.5 -mt-1">
                          <span className="text-4xl font-black text-foreground">
                            {plan.monthlyPrice} บาท
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs font-semibold">
                          ต่อเดือน
                        </p>
                      </div>
                    )}

                    <hr className="border-primary/10" />

                    <ul className="space-y-2.5 text-xs font-semibold text-foreground/80">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <Link href="/dashboard" className="w-full">
                      <Button
                        variant={plan.variant}
                        className={`w-full h-12 rounded-xl text-sm font-black shadow-md transition-all ${
                          plan.variant === "outline"
                            ? "border-primary/25 hover:bg-primary/5 text-primary"
                            : "bg-primary text-white hover:scale-[1.01]"
                        }`}
                      >
                        {plan.buttonText}
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trust Badges & Tax Invoice Selling Point */}
            <div className="pt-12 mt-8 border-t border-primary/10 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 flex-wrap max-w-5xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-foreground">ข้อมูลเข้ารหัส SSL</p>
                  <p className="text-xs text-muted-foreground">ปลอดภัยระดับเดียวกับธนาคาร</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 shadow-sm border border-blue-200">
                  <LockKeyhole className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-foreground">ความลับของคุณปลอดภัย</p>
                  <p className="text-xs text-muted-foreground">ไม่ขายข้อมูลให้บุคคลที่สามเด็ดขาด</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0 shadow-sm border border-rose-200">
                  <Ban className="w-6 h-6 text-rose-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-foreground">ยกเลิกได้ตลอดเวลา</p>
                  <p className="text-xs text-muted-foreground">ไม่มีข้อผูกมัดหรือค่าธรรมเนียมแอบแฝง</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0 shadow-sm border border-purple-200">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-foreground">ขอใบกำกับภาษีได้ 100%</p>
                  <p className="text-xs text-muted-foreground">นำค่าสมาชิกไปหักเป็นค่าใช้จ่ายบริษัทได้</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Supplementary Credits Section */}
        <section className="pb-24 pt-8 px-6 bg-gradient-to-b from-[#FFF7F0]/30 to-transparent relative overflow-hidden">
          {/* Subtle glowing backgrounds */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10" />

          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-700 text-xs font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                โควตาหมด? ไม่ต้องกังวล
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                เครดิตเสริมสแกนใบเสร็จ <span className="text-primary italic">ใช้ได้ทุกแพ็กเกจ</span> ⚡
              </h2>
              <p className="text-muted-foreground text-base font-semibold max-w-2xl mx-auto">
                ซื้อเครดิตสะสมเสริมเป็นรายครั้งสำหรับสแกนใบเสร็จอัตโนมัติด้วย AI
                <br />
                <span className="text-foreground">ใช้ได้เรื่อยๆ ไม่มีวันหมดอายุ</span> สะดวก ยืดหยุ่น และควบคุมงบประมาณได้ตามใจคุณ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {[
                {
                  credits: 50,
                  price: 219,
                  averagePrice: "4.38",
                  description: "เหมาะสำหรับทดลองใช้สแกนใบเสร็จทั่วไป",
                  isPopular: false,
                },
                {
                  credits: 150,
                  price: 499,
                  averagePrice: "3.33",
                  description: "โควตาจุใจสำหรับร้านค้าออนไลน์ขนาดย่อม",
                  isPopular: false,
                },
                {
                  credits: 500,
                  price: 1290,
                  averagePrice: "2.58",
                  description: "คุ้มค่าเพิ่มขึ้นสำหรับแคมเปญและการเติบโต",
                  isPopular: false,
                },
                {
                  credits: 1200,
                  price: 2490,
                  averagePrice: "2.07",
                  description: "เรทประหยัดที่สุดสำหรับนิติบุคคลและองค์กร",
                  isPopular: false,
                },
              ].map((tier, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="glass bg-[#FFF7F0]/40 backdrop-blur-xl border border-primary/10 rounded-3xl p-6 relative flex flex-col justify-between shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-foreground tracking-tight">
                          {tier.credits.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-xs font-bold">เครดิต</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold">
                        1 เครดิต = สแกนอัตโนมัติเพิ่ม 1 ใบเสร็จ
                      </p>
                    </div>

                    <hr className="border-primary/10" />

                    <div className="space-y-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-foreground">฿{tier.price.toLocaleString()}</span>
                        <span className="text-muted-foreground text-[10px] font-bold">จ่ายครั้งเดียว</span>
                      </div>
                      <div className="inline-block bg-[#F1F3F5] dark:bg-slate-800 px-2 py-0.5 rounded-lg text-[9px] font-black text-primary tracking-wide">
                        เฉลี่ยเพียง ฿{tier.averagePrice} / ใบเสร็จ
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed pt-1">
                        {tier.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Link href="/dashboard" className="w-full">
                      <Button className="w-full h-10 rounded-xl text-xs font-black shadow-sm transition-all bg-primary hover:bg-primary/90 text-white">
                        เลือกแพ็กเกจนี้
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>


          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 px-6 bg-white relative">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
                คำถามที่พบบ่อย (FAQ)
              </h2>
              <p className="text-muted-foreground text-base font-medium max-w-2xl mx-auto">
                คลายทุกข้อสงสัยก่อนตัดสินใจใช้งาน Fillax
              </p>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-primary/10 py-2">
                <AccordionTrigger className="text-left text-lg font-bold hover:text-primary transition-colors">
                  1. ข้อมูลของฉันปลอดภัยไหม?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  ปลอดภัย 100% ครับ เราใช้ระบบรักษาความปลอดภัยและการเข้ารหัสข้อมูลระดับสากล (Bank-grade Encryption) ข้อมูลทั้งหมดจะถูกเก็บในเซิร์ฟเวอร์คลาวด์ที่มีมาตรฐานสูงสุด (Supabase & AWS) และจะไม่มีการนำข้อมูลบัญชีและตัวเลขของคุณไปขายต่อหรือแชร์ให้บุคคลที่สามเด็ดขาด
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-primary/10 py-2">
                <AccordionTrigger className="text-left text-lg font-bold hover:text-primary transition-colors">
                  2. ถ้าเลิกใช้ข้อมูลจะเกิดอะไรขึ้น?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  หากคุณยกเลิกการใช้งาน ข้อมูลทั้งหมดของคุณยังคงเป็นของคุณอย่างสมบูรณ์ครับ คุณสามารถใช้ฟังก์ชันส่งออก (Export) เพื่อดึงข้อมูลบัญชีและธุรกรรมทั้งหมดออกมาเป็นไฟล์ Excel หรือ PDF ได้ตลอดเวลา และหากคุณกดยกเลิกบัญชี ข้อมูลทั้งหมดจะถูกลบออกจากระบบอย่างถาวรตามกฎหมาย PDPA ครับ
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-b border-primary/10 py-2">
                <AccordionTrigger className="text-left text-lg font-bold hover:text-primary transition-colors">
                  3. คำนวณภาษีถูกต้องและแม่นยำแค่ไหน?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  ถูกต้องและแม่นยำตามเกณฑ์ของกรมสรรพากร 100% ครับ! ระบบ AI ของเราได้รับการพัฒนาและอัปเดตตามกฎหมายภาษีล่าสุด (ภ.ง.ด. 90/94) ช่วยประเมินค่าลดหย่อน แยกหมวดหมู่รายรับ-รายจ่าย (มาตรา 40(1)-(8)) อัตโนมัติ เพื่อให้คุณประหยัดภาษีได้อย่างปลอดภัยและถูกกฎหมายครับ
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-b border-primary/10 py-2">
                <AccordionTrigger className="text-left text-lg font-bold hover:text-primary transition-colors">
                  4. สามารถยกเลิกแพ็กเกจได้ตลอดเวลาไหม?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  แน่นอนครับ! คุณสามารถยกเลิกแพ็กเกจแบบรายเดือนหรือรายปีได้ตลอดเวลาโดยไม่มีข้อผูกมัดหรือค่าธรรมเนียมซ่อนเร้นใดๆ ระบบจะยังคงให้สิทธิ์การใช้งานแบบ PRO แก่คุณจนกว่าจะครบรอบบิลที่คุณได้ชำระเงินไว้ครับ
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-border/40 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-border/20">
          
          {/* Column 1: Brand Info (4 columns wide) */}
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <Image
                src="/fillax-mascot.png"
                alt="Fillax Logo"
                width={40}
                height={40}
                className="w-10 h-10 object-contain rounded-xl border border-primary/20 shadow-sm"
              />
              <span className="font-black text-2xl tracking-tighter text-foreground uppercase">
                Fillax
              </span>
            </div>
            <p className="text-muted-foreground text-sm font-semibold leading-relaxed max-w-sm">
              ระบบผู้ช่วยบัญชีและวางแผนภาษีอัจฉริยะด้วย AI สำหรับแม่ค้าออนไลน์และฟรีแลนซ์ 
              ช่วยสแกนใบเสร็จ คัดแยกรายจ่าย และประเมินความเสี่ยงสรรพากรย้อนหลังได้อย่างแม่นยำ 100% 🤖💜
            </p>
          </div>

          {/* Column 2: ฟีเจอร์เด่น (2 columns wide, starts at col 6 to create space) */}
          <div className="md:col-span-2 md:col-start-6 space-y-4 text-left">
            <h5 className="font-black text-foreground text-sm">ฟีเจอร์เด่น</h5>
            <ul className="space-y-3 text-sm font-bold text-muted-foreground">
              <li className="hover:text-primary transition-colors">
                <Link href="/receipts">สแกนใบเสร็จ AI OCR</Link>
              </li>
              <li className="hover:text-primary transition-colors">
                <Link href="/tax-assistant">ปรึกษาบ็อท AI TaxMate</Link>
              </li>
              <li className="hover:text-primary transition-colors">
                <Link href="/tax-risk-assessment">ประเมินความเสี่ยงภาษี</Link>
              </li>
              <li className="hover:text-primary transition-colors">
                <Link href="/receipts/substitution">ใบแทนใบเสร็จ มค.๑</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: ช่วยเหลือ & นโยบาย (2 columns wide, starts at col 8) */}
          <div className="md:col-span-2 md:col-start-8 space-y-4 text-left">
            <h5 className="font-black text-foreground text-sm">ช่วยเหลือ & นโยบาย</h5>
            <ul className="space-y-3 text-sm font-bold text-muted-foreground">
              <li className="hover:text-primary transition-colors">
                <Link href="#how-it-works">วิธีการใช้งานระบบ</Link>
              </li>
              <li className="hover:text-primary transition-colors">
                <Link href="#faq">คำถามที่พบบ่อย (FAQ)</Link>
              </li>
              <li className="hover:text-primary transition-colors">
                <Link href="/terms">ข้อตกลงการใช้บริการ</Link>
              </li>
              <li className="hover:text-primary transition-colors">
                <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: ติดต่อเรา (2 columns wide, pushed all the way to col 11/12 and right-aligned) */}
          <div className="md:col-span-2 md:col-start-11 space-y-4 text-right flex flex-col items-end">
            <h5 className="font-black text-foreground text-sm w-full text-right">ติดต่อฝ่ายสนับสนุน</h5>
            <div className="space-y-4 flex flex-col items-end w-full">
              <div className="relative w-36 h-36 border border-[#10B981]/25 rounded-2xl p-1.5 bg-white shadow-sm flex items-center justify-center overflow-hidden hover:scale-105 transition-transform duration-300">
                <Image
                  src="/fillax-line-qr.png"
                  alt="LINE QR Code"
                  width={144}
                  height={144}
                  className="object-contain"
                />
              </div>
              <div className="space-y-1 text-xs font-bold text-right w-full">
                <p className="text-foreground">แอดไลน์ติดต่อเจ้าหน้าที่</p>
                <p className="text-primary font-black hover:underline cursor-pointer">@fillax_support</p>
                <p className="text-muted-foreground pt-1.5 font-medium">หรือสอบถามทางอีเมล</p>
                <a 
                  href="mailto:wefile28@gmail.com" 
                  className="text-foreground font-black hover:text-primary transition-colors block w-full"
                >
                  wefile28@gmail.com
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright & legal row */}
        <div className="max-w-7xl mx-auto mt-8 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
          <div className="text-center md:text-left">
            Copyright © 2026 Fillax. All rights reserved. พัฒนาขึ้นด้วย 💜 เพื่อเป็นกำลังใจให้ร้านค้าออนไลน์และฟรีแลนซ์ไทย
          </div>
          <div className="flex items-center gap-6 justify-center md:justify-end">
            <Link href="/terms" className="hover:text-primary transition-colors">
              เงื่อนไขการใช้งาน
            </Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              นโยบายความเป็นส่วนตัว
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("fillax_cookie_consent");
                window.location.reload();
              }}
              className="hover:text-primary transition-colors font-semibold"
            >
              ตั้งค่าคุกกี้ (PDPA)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
