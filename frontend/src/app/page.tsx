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
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  FileText
} from "lucide-react";

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
        // Fallback mock simulation for testing/Guest
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
      setTransactions([]);
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
    <div className="min-h-screen relative p-6 md:p-8 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Background neon glows */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-[#B08CFF]/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#E9DDFF]/10 blur-[100px] pointer-events-none" />

      {/* Header section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#B08CFF]/15 pb-6">
        <div className="flex items-center gap-3">
          <Image 
            src="/fillax-mascot-v4.png" 
            alt="Fillax Logo" 
            width={48} 
            height={48} 
            className="w-12 h-12 rounded-2xl object-contain shadow-md hover:scale-105 transition-all duration-300"
          />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#5A4A68]">
              แดชบอร์ดรายจ่าย <span className="text-[#B08CFF] italic">Fillax</span> 💜
            </h1>
            <p className="text-xs text-[#5A4A68]/60 font-semibold">
              {user ? `ยินดีต้อนรับคุณ ${user.email.split("@")[0]} | สมาชิกคลาวด์` : "โหมดทดสอบออฟไลน์ (Guest Mode)"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/liff" className="glass h-11 px-5 rounded-2xl text-xs font-black flex items-center gap-2 text-[#5A4A68] hover:bg-[#E9DDFF]/20 transition-all hover:scale-102">
            <PlusCircle className="w-4 h-4 text-[#B08CFF]" />
            สแกนหรือตรวจทานบิลรายจ่าย
          </Link>
          <Link href="/tos" className="glass h-11 px-5 rounded-2xl text-xs font-black flex items-center gap-2 text-[#5A4A68] hover:bg-[#E9DDFF]/20 transition-all hover:scale-102">
            <FileText className="w-4 h-4 text-[#B08CFF]" />
            ดูข้อตกลงกฎหมาย (TOS)
          </Link>
        </div>
      </header>

      {/* Financial stats capsules */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Income */}
        <div className="glass rounded-3xl p-6 flex flex-col justify-between min-h-32 hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-center text-[#5A4A68]/60 text-xs font-bold">
            <span>รายรับทั้งหมดสะสม</span>
            <TrendingUp className="text-[#10B981] w-5 h-5" />
          </div>
          <div>
            <span className="text-3xl font-black text-[#10B981]">฿{totalIncome.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
            <p className="text-[10px] text-[#5A4A68]/40 mt-1 font-semibold">คำนวณจากสลิปเงินเข้าในฐานข้อมูล</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="glass rounded-3xl p-6 flex flex-col justify-between min-h-32 hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-center text-[#5A4A68]/60 text-xs font-bold">
            <span>รายจ่ายจริงสะสม</span>
            <TrendingDown className="text-[#EF4444] w-5 h-5" />
          </div>
          <div>
            <span className="text-3xl font-black text-[#EF4444]">฿{totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
            <p className="text-[10px] text-[#5A4A68]/40 mt-1 font-semibold">อัปเดตอัตโนมัติจากการกดยืนยันผ่าน LINE</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="glass rounded-3xl p-6 flex flex-col justify-between min-h-32 hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-center text-[#5A4A68]/60 text-xs font-bold">
            <span>กำไรสุทธิทางบัญชี</span>
            <DollarSign className="text-[#B08CFF] w-5 h-5" />
          </div>
          <div>
            <span className={`text-3xl font-black ${netProfit >= 0 ? 'text-[#5A4A68]' : 'text-[#EF4444]'}`}>
              ฿{netProfit.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-[#5A4A68]/40 mt-1 font-semibold">กำไรที่นำไปประเมินความเสี่ยงภาษีจริง</p>
          </div>
        </div>
      </section>

      {/* Main dashboard content columns */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Transaction Ledger list */}
        <div className="glass rounded-3xl p-6 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-black text-[#5A4A68] flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#B08CFF]" />
              ประวัติรายการรายจ่ายรายวัน
            </h2>
            <p className="text-xs text-[#5A4A68]/50 font-semibold mt-1">
              แสดงผลรายการโอนออกที่กดยืนยันผ่านบอท LINE ล่าสุด
            </p>
          </div>

          <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-[#5A4A68]/40 border-2 border-dashed border-[#B08CFF]/15 rounded-2xl">
                <AlertTriangle className="w-8 h-8 mb-2" />
                <p className="text-sm font-bold">ยังไม่มีข้อมูลรายการธุรกรรมสะสม</p>
                <p className="text-[10px] mt-1 font-semibold">โปรดลองถ่ายรูปภาพสลิปส่งเข้ามาใน LINE OA เพื่อเริ่มบันทึกค่ะ</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-4 rounded-2xl bg-white/40 border border-[#B08CFF]/10 flex justify-between items-center gap-4 hover:bg-white/60 transition-colors">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-xs font-bold text-[#5A4A68] truncate">{tx.name}</span>
                    <span className="text-[9px] text-[#5A4A68]/50 font-black uppercase">{tx.category}</span>
                    {tx.note && <span className="text-[8px] text-[#B08CFF] font-semibold truncate">{tx.note}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-black ${tx.type === 'income' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[8px] text-[#5A4A68]/40 font-semibold mt-0.5">{tx.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Category Expense Leaks & DBD summary */}
        <div className="glass rounded-3xl p-6 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-black text-[#5A4A68] flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#EF4444]" />
              สัดส่วนและจุดรั่วไหลของรายจ่าย
            </h2>
            <p className="text-xs text-[#5A4A68]/50 font-semibold mt-1">
              หมวดหมู่ค่าใช้จ่ายสะสมเพื่อนำไปประเมินลดหย่อนภาษีตามจริง
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {sortedCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-[#5A4A68]/40 border-2 border-dashed border-[#B08CFF]/15 rounded-2xl">
                <TrendingDown className="w-8 h-8 mb-2" />
                <p className="text-sm font-bold">ยังไม่มีการจัดหมวดหมู่อย่างเป็นระบบ</p>
              </div>
            ) : (
              sortedCategories.slice(0, 4).map((cat, idx) => {
                const percentage = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-[#5A4A68]">
                      <span className="truncate max-w-[250px]">{cat.name}</span>
                      <span>฿{cat.value.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-[#B08CFF]/10 h-2.5 rounded-full overflow-hidden">
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

      {/* Golden Disclaimer warning box */}
      <footer className="p-5 rounded-3xl border-2 border-[#FAF9F6]/20 bg-[#F59E0B]/5 flex gap-4 items-start shadow-sm mt-6">
        <AlertTriangle className="text-[#F59E0B] w-6 h-6 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black text-[#5A4A68] uppercase tracking-wide">⚠️ ข้อสงวนสิทธิ์ทางกฎหมายที่ผู้ใช้งานต้องยอมรับ (Disclaimer)</h4>
          <p className="text-[10px] text-[#5A4A68]/70 leading-relaxed font-semibold">
            ระบบ Fillax เป็นเพียงตัวช่วยอำนวยความสะดวกในการจัดหมวดหมู่เอกสารและประเมินความเสี่ยงภาษีเบื้องต้นสำหรับผู้ประกอบการรายย่อยเท่านั้น <strong>ไม่ใช่สำนักงานบัญชีหรือที่ปรึกษาทางกฎหมายอย่างเป็นทางการ</strong> การคำนวณภาษีและการสกัดวิเคราะห์บิลไม่ได้เป็นการรับประกันความถูกต้องแม่นยำ 100% ผู้ใช้งานมีหน้าที่รับผิดชอบตรวจสอบเอกสารและควรปรึกษากับที่ปรึกษาบัญชีหรือผู้สอบบัญชีวิชาชีพอีกครั้งเพื่อความเสถียรและถูกต้อง 100% ก่อนยื่นสรรพากรจริงทุกครั้ง
          </p>
        </div>
      </footer>

      {/* Stateful Legal TOS Dialog overlay modal */}
      {showTOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#5A4A68]/30 backdrop-blur-sm p-4">
          <div className="glass rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col gap-6 text-center animate-float">
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
              <h3 className="text-xl font-black text-[#5A4A68]">
                ยินดีต้อนรับสู่ <span className="text-[#B08CFF] italic">Fillax</span> 💜
              </h3>
              <p className="text-xs text-[#5A4A68]/70 font-semibold leading-relaxed">
                กรุณาอ่านและกดยอมรับข้อกำหนดในการใช้งาน (TOS) และนโยบายส่วนบุคคลฉบับคุ้มครองความรับผิดชอบ เพื่อเริ่มระบบดูแลบัญชีและภาษีของท่านอย่างถูกต้องและปลอดภัยสูงสุด
              </p>
            </div>

            <div className="bg-[#B08CFF]/5 border border-[#B08CFF]/15 p-4 rounded-2xl text-left max-h-32 overflow-y-auto text-[10px] text-[#5A4A68]/80 leading-relaxed font-semibold">
              <strong>ข้อตกลงและเงื่อนไขการใช้บริการ Fillax (TOS)</strong><br />
              1. ระบบเป็นเพียงโปรแกรม OCR อ่านประเมินรายจ่ายเท่านั้น ไม่ใช่บริษัทบัญชีหรือผู้ยื่นภาษีแทนท่านตามกฎหมาย<br />
              2. เราจำกัดความรับผิดชอบสูงสุดจากผลลัพธ์การสแกนบิลที่คลาดเคลื่อน ผู้ใช้ต้องตรวจทานและยอมรับความถูกต้องด้วยตนเองก่อนบันทึกเข้าระบบสรรพากร<br />
              3. ข้อมูลของท่านจะถูกจัดเก็บใน Suppabase Cloud ที่ได้รับการรับรองความปลอดภัยทางดิจิทัลขั้นสูงตามข้อกำหนด PDPA ของไทย
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleAgreeTOS}
                className="h-12 w-full rounded-2xl bg-[#B08CFF] text-white text-xs font-black shadow-md shadow-[#B08CFF]/25 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                อ่านและยอมรับเงื่อนไขบริการสำเร็จ 🟢
              </button>
              <Link href="/tos" className="text-[10px] text-[#B08CFF] font-bold hover:underline">
                อ่านข้อตกลงกฎหมายฉบับเต็มโดยนักกฎหมายไทย
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
