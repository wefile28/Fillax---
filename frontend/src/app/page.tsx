"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  FolderOpen,
  PlusCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  Receipt
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";

interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  is_tax_deductible: boolean;
  note?: string;
  status: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTOSAgreed, setIsTOSAgreed] = useState(true);
  const [showTOSModal, setShowTOSModal] = useState(false);

  // Authentication & session check on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        // Verify TOS agreement
        const agreed = localStorage.getItem(`fillax_tos_agreed_${session.user.id}`) === "true";
        setIsTOSAgreed(agreed);
        if (!agreed) {
          setShowTOSModal(true);
        }
        await fetchTransactions(session.user.id);
      } else {
        setUser(null);
        const guestAgreed = localStorage.getItem("fillax_tos_agreed_guest") === "true";
        setIsTOSAgreed(guestAgreed);
        if (!guestAgreed) {
          setShowTOSModal(true);
        }
        loadLocalTransactions();
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const fetchTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (e) {
      console.error("Error fetching transactions:", e);
      loadLocalTransactions(); // Fallback to local
    }
  };

  const loadLocalTransactions = () => {
    const localString = localStorage.getItem("fillax_mock_transactions");
    if (localString) {
      try {
        setTransactions(JSON.parse(localString));
      } catch (err) {
        console.error("Error parsing local transactions:", err);
        setTransactions([]);
      }
    } else {
      setTransactions([]);
    }
  };

  const handleAgreeTOS = () => {
    const userId = user ? user.id : "guest";
    localStorage.setItem(`fillax_tos_agreed_${userId}`, "true");
    setIsTOSAgreed(true);
    setShowTOSModal(false);
  };

  // Financial calculations
  const totalIncome = transactions
    .filter(t => t.type === "income" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === "expense" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;

  // Group expenses by category
  const categoriesMap = transactions
    .filter(t => t.type === "expense" && t.status === "completed")
    .reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const sortedCategories = Object.keys(categoriesMap).map(cat => ({
    name: cat,
    value: categoriesMap[cat]
  })).sort((a, b) => b.value - a.value);

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6 md:gap-8">
        
        {/* Header section (Restructured to fit inside DashboardShell sidebar) */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#B08CFF]/15 pb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#5A4A68]">
              ศูนย์กลางจัดการบัญชีรายจ่าย 💜
            </h1>
            <p className="text-xs text-[#5A4A68]/60 font-semibold mt-1">
              ข้อมูลวิเคราะห์ภาษีธุรกิจของคุณซิงก์เข้าระบบคลาวด์เรียบร้อยแล้วค่ะ
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/receipts" 
              className="glass h-10 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 text-[#5A4A68] hover:bg-[#E9DDFF]/20 transition-all hover:scale-102"
            >
              <PlusCircle className="w-4 h-4 text-[#B08CFF]" />
              สแกนบิลรายจ่ายใหม่
            </Link>
          </div>
        </header>

        {/* Financial stats capsules */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Income */}
          <div className="glass rounded-2xl p-5 flex flex-col justify-between min-h-28 hover:-translate-y-0.5 transition-all">
            <div className="flex justify-between items-center text-[#5A4A68]/60 text-[10px] font-black uppercase tracking-wider">
              <span>รายรับธุรกิจสะสม</span>
              <TrendingUp className="text-[#10B981] w-4.5 h-4.5" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-[#10B981]">฿{totalIncome.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
              <p className="text-[9px] text-[#5A4A68]/40 mt-1 font-semibold">อัปเดตอัตโนมัติจากใบวางบิลและสลิปเงินเข้า</p>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="glass rounded-2xl p-5 flex flex-col justify-between min-h-28 hover:-translate-y-0.5 transition-all">
            <div className="flex justify-between items-center text-[#5A4A68]/60 text-[10px] font-black uppercase tracking-wider">
              <span>รายจ่ายจริงสะสม</span>
              <TrendingDown className="text-[#EF4444] w-4.5 h-4.5" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-[#EF4444]">฿{totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
              <p className="text-[9px] text-[#5A4A68]/40 mt-1 font-semibold">ดึงข้อมูลสแกนบิลจาก LINE OA & Web Upload</p>
            </div>
          </div>

          {/* Net Profit */}
          <div className="glass rounded-2xl p-5 flex flex-col justify-between min-h-28 hover:-translate-y-0.5 transition-all">
            <div className="flex justify-between items-center text-[#5A4A68]/60 text-[10px] font-black uppercase tracking-wider">
              <span>กำไรสุทธิประเมินภาษี</span>
              <DollarSign className="text-[#B08CFF] w-4.5 h-4.5" />
            </div>
            <div className="mt-4">
              <span className={`text-2xl font-black ${netProfit >= 0 ? 'text-[#5A4A68]' : 'text-[#EF4444]'}`}>
                ฿{netProfit.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[9px] text-[#5A4A68]/40 mt-1 font-semibold">ยอดคงเหลือสุทธิเพื่อนำไปคำนวณขั้นบันไดภาษี</p>
            </div>
          </div>
        </section>

        {/* Main dashboard content columns */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          
          {/* Left Column: Transaction Ledger list */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-5">
            <div className="border-b border-[#B08CFF]/10 pb-2">
              <h2 className="text-sm font-black text-[#5A4A68] flex items-center gap-2">
                <FolderOpen className="w-4.5 h-4.5 text-[#B08CFF]" />
                สมุดบันทึกธุรกรรมรายจ่ายล่าสุด
              </h2>
              <p className="text-[10px] text-[#5A4A68]/50 font-semibold mt-0.5">
                รายการโอนออกโอนเข้าที่ได้รับการยืนยันเสร็จสิ้น
              </p>
            </div>

            <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-[#5A4A68]/40 border border-dashed border-[#B08CFF]/20 rounded-2xl">
                  <Receipt className="w-8 h-8 mb-2 text-[#B08CFF]/30" />
                  <p className="text-xs font-bold">ยังไม่พบบันทึกธุรกรรมสะสม</p>
                  <p className="text-[9px] mt-1 font-semibold leading-relaxed">
                    คุณสามารถสแกนบิลรายจ่ายผ่าน LINE OA หรือหน้าเว็บ<br />เพื่อระบบจัดเก็บลงบัญชีโดยอัตโนมัติค่ะ
                  </p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 rounded-xl bg-white/40 border border-[#B08CFF]/10 flex justify-between items-center gap-3 hover:bg-white/60 transition-colors">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-bold text-[#5A4A68] truncate">{tx.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] bg-[#B08CFF]/10 text-[#B08CFF] px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">{tx.category}</span>
                        {tx.is_tax_deductible && (
                          <span className="text-[8px] bg-[#10B981]/10 text-[#10B981] px-1.5 py-0.5 rounded font-black shrink-0">DBD Verified</span>
                        )}
                      </div>
                      {tx.note && <span className="text-[8px] text-[#5A4A68]/45 font-semibold truncate">{tx.note}</span>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-black ${tx.type === 'income' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </span>
                      <p className="text-[8px] text-[#5A4A68]/40 font-semibold mt-0.5">{tx.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Category Expense Leaks */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-5">
            <div className="border-b border-[#B08CFF]/10 pb-2">
              <h2 className="text-sm font-black text-[#5A4A68] flex items-center gap-2">
                <TrendingDown className="w-4.5 h-4.5 text-[#EF4444]" />
                สัดส่วนและหมวดหมู่ค่าใช้จ่ายสะสม
              </h2>
              <p className="text-[10px] text-[#5A4A68]/50 font-semibold mt-0.5">
                ประเมินรายจ่ายสะสมตามสัดส่วนเพื่อนำไปประมวลลดหย่อนภาษี
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {sortedCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-[#5A4A68]/40 border border-dashed border-[#B08CFF]/20 rounded-2xl">
                  <TrendingDown className="w-8 h-8 mb-2 text-[#B08CFF]/30" />
                  <p className="text-xs font-bold">ยังไม่มีข้อมูลวิเคราะห์รายจ่ายรายหมวด</p>
                </div>
              ) : (
                sortedCategories.slice(0, 4).map((cat, idx) => {
                  const percentage = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-[#5A4A68]">
                        <span className="truncate max-w-[200px]">{cat.name}</span>
                        <span>฿{cat.value.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-[#B08CFF]/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#B08CFF] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>

        {/* Golden Legal Disclaimer box */}
        <footer className="p-4 rounded-2xl border-2 border-[#FAF9F6]/20 bg-[#F59E0B]/5 flex gap-3.5 items-start shadow-sm mt-2">
          <AlertTriangle className="text-[#F59E0B] w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-[#5A4A68] uppercase tracking-wide">⚠️ ข้อสงวนสิทธิ์ขอบเขตความคุ้มครองทางกฎหมาย (Legal Disclaimer)</h4>
            <p className="text-[9.5px] text-[#5A4A68]/70 leading-relaxed font-semibold">
              แอปพลิเคชัน Fillax เป็นแพลตฟอร์มผู้ช่วยอำนวยความสะดวกในการจัดหมวดหมู่หลักฐานรายจ่ายและประเมินพิกัดภาษีอัตราก้าวหน้าเบื้องต้นเท่านั้น <strong>ไม่ใช่บริษัททำบัญชีหรือสำนักงานผู้สอบบัญชีวิชาชีพ</strong> การคำนวณและข้อมูล Modulo-11 DBD ไม่ใช่ข้อยืนยันทางภาษี 100% สรรพากรไทยยังกำหนดให้ท่านเก็บรักษาใบเสร็จหลักฐานตัวจริงครบถ้วนเป็นเวลา 5 ปีเพื่อการรับประเมินตรวจสอบเสมอ
            </p>
          </div>
        </footer>

        {/* Stateful Legal TOS Dialog overlay modal */}
        {showTOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#5A4A68]/45 backdrop-blur-sm p-4">
            <div className="glass rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col gap-6 text-center animate-float">
              <div className="w-16 h-16 relative mx-auto flex items-center justify-center">
                <Image 
                  src="/fillax-mascot-v4.png" 
                  alt="Fillax Logo" 
                  width={64} 
                  height={64} 
                  className="w-16 h-16 rounded-2xl object-contain border border-[#B08CFF]/20"
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-[#5A4A68]">
                  ยินดีต้อนรับสู่ <span className="text-[#B08CFF] italic">Fillax Pro</span> 💜
                </h3>
                <p className="text-xs text-[#5A4A68]/70 font-semibold leading-relaxed">
                  กรุณาตรวจสอบข้อกำหนดและเงื่อนไขการใช้บริการเพื่อเริ่มระบบความปลอดภัยภาษีอัจฉริยะแม่ค้าออนไลน์อย่างปลอดภัย
                </p>
              </div>

              <div className="bg-[#B08CFF]/5 border border-[#B08CFF]/15 p-4 rounded-xl text-left max-h-32 overflow-y-auto text-[9.5px] text-[#5A4A68]/80 leading-relaxed font-semibold">
                <strong>ข้อตกลงการใช้บริการระบบ Fillax</strong><br />
                1. ระบบทำหน้าที่ช่วยจัดวิเคราะห์บิล OCR และประเมินภาษีอัตราก้าวหน้า ไม่รับผิดชอบความคลาดเคลื่อนทางตัวเลขย้อนหลังกับหน่วยงานสรรพากร<br />
                2. ข้อมูลสลิปและใบเสร็จจะถูกเข้ารหัสเก็บรักษาบนฐานคลาวด์ที่ผ่านการรับรอง PDPA คุ้มครองความปลอดภัยสูงสุด<br />
                3. สิทธิ์การสแกนฟรี 10 ครั้งต่อเดือน และแชตผู้ช่วยภาษี 5 ครั้งต่อเดือนจะถูกรีเซ็ตทุกรอบเดือน สามารถอัปเกรดเป็น PRO เพื่อใช้บริการอย่างไร้ขีดจำกัด
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleAgreeTOS}
                  className="h-11 w-full rounded-xl bg-[#B08CFF] text-white text-xs font-black shadow-md shadow-[#B08CFF]/20 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  ยอมรับเงื่อนไขและข้อตกลงสำเร็จ 🟢
                </button>
                <Link href="/tos" className="text-[10px] text-[#B08CFF] font-bold hover:underline">
                  อ่านข้อตกลงกฎหมายคุ้มครองฉบับเต็ม
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
