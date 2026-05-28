"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, 
  Sparkles, 
  AlertTriangle,
  Building2,
  DollarSign,
  Briefcase,
  HelpCircle,
  FileCheck2,
  ListFilter
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import UpgradeDialog from "@/components/UpgradeDialog";

interface ProgressiveStep {
  bracket_range: string;
  rate: number;
  taxable_amount: number;
  tax_amount: number;
}

export default function TaxRiskAssessmentPage() {
  // Mode Selector
  const [sellerType, setSellerType] = useState<"individual" | "juristic">("individual");
  
  // Core financial states
  const [income, setIncome] = useState<string>("600000");
  const [expenses, setExpenses] = useState<string>("360000"); // 60% default

  // Allowances (PIT specific)
  const [personalAllowance, setPersonalAllowance] = useState<string>("60000");
  const [socialSecurity, setSocialSecurity] = useState<string>("9000");
  const [lifeInsurance, setLifeInsurance] = useState<string>("0");
  const [ssfRmf, setSsfRmf] = useState<string>("0");
  const [homeInterest, setHomeInterest] = useState<string>("0");
  const [easyEreceipt, setEasyEreceipt] = useState<string>("0");
  const [otherAllowances, setOtherAllowances] = useState<string>("0");

  // Output calculations
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResults, setCalcResults] = useState<any>(null);

  // Upgrade Modal dialog
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    // Fetch profile plan details on mount
    const checkPlan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (data) setPlan(data.plan || "free");
      }
    };
    checkPlan();
    
    // Initial run
    handleCalculateTax();
  }, [sellerType]);

  const applySixtyPercentExpense = () => {
    const incVal = parseFloat(income) || 0;
    setExpenses((incVal * 0.6).toFixed(0));
  };

  const handleCalculateTax = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCalculating(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    let fetchSuccess = false;
    let resData: any = null;

    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 1200));
      const { data: { session } } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiUrl}/api/v1/tax/calculate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          income: parseFloat(income) || 0,
          expenses: parseFloat(expenses) || 0,
          seller_type: sellerType,
          personal_allowance: parseFloat(personalAllowance) || 0,
          social_security: parseFloat(socialSecurity) || 0,
          life_insurance: parseFloat(lifeInsurance) || 0,
          ssf_rmf: parseFloat(ssfRmf) || 0,
          home_interest: parseFloat(homeInterest) || 0,
          easy_ereceipt: parseFloat(easyEreceipt) || 0,
          other_allowances: parseFloat(otherAllowances) || 0
        })
      });

      if (response.ok) {
        resData = await response.json();
        fetchSuccess = true;
      }
    } catch (err) {
      console.warn("Backend tax API call failed or timed out, executing high-fidelity client-side calculations:", err);
    }

    if (fetchSuccess && resData) {
      setCalcResults(resData);
      setIsCalculating(false);
      return;
    }

    // High-Fidelity client-side offline progressive calculator
    const grossIncome = parseFloat(income) || 0;
    const totalExpenses = parseFloat(expenses) || 0;
    const isVatRisk = grossIncome >= 1800000.0;
    
    let totalAllowances = 0;
    let taxableIncome = 0;
    let taxLiability = 0;
    let steps: ProgressiveStep[] = [];
    let riskLevel = "low";
    let riskAdvice = "";

    if (sellerType === "juristic") {
      totalAllowances = 0;
      taxableIncome = Math.max(grossIncome - totalExpenses, 0);
      
      // Juristic Brackets CIT
      // 0 - 300,000 (0%)
      const bracket1 = Math.min(taxableIncome, 300000);
      steps.push({
        bracket_range: "0 - 300,000 (ยกเว้น)",
        rate: 0,
        taxable_amount: bracket1,
        tax_amount: 0
      });

      // 300,001 - 3,000,000 (15%)
      let remaining = taxableIncome - bracket1;
      if (remaining > 0) {
        const bracket2 = Math.min(remaining, 2700000);
        const tax2 = bracket2 * 0.15;
        taxLiability += tax2;
        steps.push({
          bracket_range: "300,001 - 3,000,000",
          rate: 15,
          taxable_amount: bracket2,
          tax_amount: tax2
        });
        remaining -= bracket2;
      }

      // Over 3,000,000 (20%)
      if (remaining > 0) {
        const tax3 = remaining * 0.20;
        taxLiability += tax3;
        steps.push({
          bracket_range: "มากกว่า 3,000,000",
          rate: 20,
          taxable_amount: remaining,
          tax_amount: tax3
        });
      }

      // CIT Advice
      if (isVatRisk) {
        riskLevel = "high";
        riskAdvice = "⚠️ ยอดขายสะสมต่อปีเกิน 1.8 ล้านบาทแล้ว! ท่านมีหน้าที่ต้องจดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%) ภายใน 30 วันนับแต่วันที่ยอดขายเกินเกณฑ์ และยื่นแบบ ภ.พ.30 ทุกเดือนเพื่อป้องกันเบี้ยปรับย้อนหลังสูงสุด 2 เท่าค่ะ";
      } else {
        riskLevel = "low";
        riskAdvice = "🟢 ยอดรายรับอยู่ในเกณฑ์ปลอดภัยจากข้อผูกมัด VAT แต่อย่าลืมบันทึกทำบัญชีและยื่นงบการเงินและ ภ.พ.ด.50/51 ประจำปีนะคะ";
      }
    } else {
      // PIT Allowance summation
      totalAllowances = (
        (parseFloat(personalAllowance) || 0) +
        (parseFloat(socialSecurity) || 0) +
        (parseFloat(lifeInsurance) || 0) +
        (parseFloat(ssfRmf) || 0) +
        (parseFloat(homeInterest) || 0) +
        (parseFloat(easyEreceipt) || 0) +
        (parseFloat(otherAllowances) || 0)
      );

      taxableIncome = Math.max(grossIncome - totalExpenses - totalAllowances, 0);

      // PIT Progressive brackets
      const pitBrackets = [
        { limit: 150000, rate: 0.0, label: "0 - 150,000 (ยกเว้น)" },
        { limit: 150000, rate: 0.05, label: "150,001 - 300,000" },
        { limit: 200000, rate: 0.10, label: "300,001 - 500,000" },
        { limit: 250000, rate: 0.15, label: "500,001 - 750,000" },
        { limit: 250000, rate: 0.20, label: "750,001 - 1,000,000" },
        { limit: 1000000, rate: 0.25, label: "1,000,001 - 2,000,000" },
        { limit: 3000000, rate: 0.30, label: "2,000,001 - 5,000,000" },
        { limit: Infinity, rate: 0.35, label: "มากกว่า 5,000,000" }
      ];

      let remaining = taxableIncome;
      
      // Step 1 (0% rate)
      const firstBracket = Math.min(remaining, 150000);
      steps.push({
        bracket_range: pitBrackets[0].label,
        rate: 0,
        taxable_amount: firstBracket,
        tax_amount: 0
      });
      remaining -= firstBracket;

      for (let i = 1; i < pitBrackets.length; i++) {
        if (remaining <= 0) break;
        const b = pitBrackets[i];
        const taxableInBracket = b.limit === Infinity ? remaining : Math.min(remaining, b.limit);
        const taxInBracket = taxableInBracket * b.rate;
        taxLiability += taxInBracket;
        steps.push({
          bracket_range: b.label,
          rate: b.rate * 100,
          taxable_amount: taxableInBracket,
          tax_amount: taxInBracket
        });
        remaining -= taxableInBracket;
      }

      // PIT Advice
      if (isVatRisk) {
        riskLevel = "high";
        riskAdvice = "⚠️ ยอดขายบุคคลธรรมดาเกิน 1.8 ล้านบาทต่อปี! สรรพากรบังคับจดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%) ทันที และหากท่านมีกำไรสุทธิทางภาษีค่อนข้างสูง แนะนำให้วางแผนจดทะเบียนจัดตั้งบริษัท/ห้างหุ้นส่วนจำกัด เพื่อลดอัตราภาษีจากขั้นบันไดบุคคลธรรมดา (สูงสุด 35%) มาใช้อัตราภาษีนิติบุคคล SME (สูงสุดเพียง 20%) ค่ะ";
      } else if (taxableIncome > 1000000) {
        riskLevel = "medium";
        riskAdvice = "💡 เงินได้สุทธิหลังหักรายจ่ายของท่านเข้าเกณฑ์เสียภาษีอัตราก้าวหน้าสูง (25% ขึ้นไป) แนะนำให้จดทะเบียนเป็นนิติบุคคลและจัดระเบียบบันทึกบิลค่าใช้จ่ายธุรกิจแบบตามจริง เพื่อเสียภาษีในเรท SME 15% จะประหยัดกว่าค่ะ";
      } else {
        riskLevel = "low";
        riskAdvice = "🟢 อัตราภาษีอยู่ในเกณฑ์ที่บริหารจัดการได้ดี แนะนำให้ใช้สิทธิ์ลดหย่อนช้อปดีมีคืน ประกันสังคม และกองทุนสะสมต่างๆ ให้เต็มโควตาค่ะ";
      }
    }

    setCalcResults({
      gross_income: grossIncome,
      total_expenses: totalExpenses,
      total_allowances: totalAllowances,
      taxable_income: taxableIncome,
      tax_liability: taxLiability,
      seller_type: sellerType,
      steps: steps,
      risk_level: riskLevel,
      risk_advice: riskAdvice
    });

    setIsCalculating(false);
  };

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6 md:gap-8">
        
        {/* Header bar */}
        <header className="flex justify-between items-center border-b border-[#B08CFF]/15 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#5A4A68] flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#B08CFF]" />
              วิเคราะห์ความเสี่ยงภาษีรายปีอัตราก้าวหน้า 🔮
            </h1>
            <p className="text-xs text-[#5A4A68]/60 font-semibold mt-1">
              ประเมินภาระภาษีขั้นบันได วางแผนสิทธิ์ลดหย่อน และคำนวณความเสี่ยงเกณฑ์รายได้ VAT 1.8 ล้านบาท
            </p>
          </div>
        </header>

        {/* Seller Type Selector tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#5A4A68]/5 p-1.5 rounded-2xl border border-[#B08CFF]/10 max-w-md">
          <button 
            type="button"
            onClick={() => setSellerType("individual")}
            className={`h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              sellerType === "individual" 
                ? "bg-[#B08CFF] text-white shadow-md" 
                : "text-[#5A4A68]/80 hover:bg-[#E9DDFF]/20"
            }`}
          >
            <Briefcase className="w-4.5 h-4.5" />
            บุคคลธรรมดา (ภ.ง.ด.90/91)
          </button>
          <button 
            type="button"
            onClick={() => setSellerType("juristic")}
            className={`h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              sellerType === "juristic" 
                ? "bg-[#B08CFF] text-white shadow-md" 
                : "text-[#5A4A68]/80 hover:bg-[#E9DDFF]/20"
            }`}
          >
            <Building2 className="w-4.5 h-4.5" />
            นิติบุคคล / หจก. (SME CIT)
          </button>
        </div>

        {/* Dual-Pane calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Pane: Financial inputs form */}
          <form onSubmit={handleCalculateTax} className="glass rounded-3xl p-5 md:p-6 flex flex-col gap-5 border border-[#B08CFF]/15">
            <div className="border-b border-[#B08CFF]/10 pb-2 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-[#5A4A68]">
                  📝 กรอกข้อมูลทางบัญชีรายปี
                </h3>
                <p className="text-[9.5px] text-[#5A4A68]/50 font-semibold mt-0.5">
                  ระบุรายรับ รายจ่ายจริง และสิทธิ์ลดหย่อนภาษี
                </p>
              </div>
              <button 
                type="button" 
                onClick={applySixtyPercentExpense}
                className="text-[9.5px] bg-[#B08CFF]/10 text-[#B08CFF] border border-[#B08CFF]/20 px-2.5 py-1 rounded-lg font-black hover:bg-[#B08CFF]/20 transition-all cursor-pointer"
              >
                เหมาหักจ่าย 60%
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Gross Income */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-[#5A4A68] uppercase tracking-wide">รายรับรวมทั้งปี (฿) *</label>
                  <input 
                    type="number" 
                    required
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-black text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                    placeholder="600,000"
                  />
                </div>

                {/* Expenses */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-[#5A4A68] uppercase tracking-wide">ค่าใช้จ่ายสะสมทั้งปี (฿) *</label>
                  <input 
                    type="number" 
                    required
                    value={expenses}
                    onChange={(e) => setExpenses(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-black text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                    placeholder="360,000"
                  />
                </div>
              </div>

              {/* Allowances section (Personal specific) */}
              {sellerType === "individual" && (
                <div className="space-y-3.5 border-t border-[#B08CFF]/10 pt-3">
                  <h4 className="text-[10px] font-black text-[#B08CFF] uppercase tracking-wider">สิทธิ์ลดหย่อนบุคคลธรรมดาประจำปี (฿)</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-[#5A4A68]/85 uppercase">ลดหย่อนส่วนตัว (สูงสุด 60k)</label>
                      <input 
                        type="number" 
                        value={personalAllowance}
                        onChange={(e) => setPersonalAllowance(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-[#5A4A68]/85 uppercase">ประกันสังคม (สูงสุด 9k)</label>
                      <input 
                        type="number" 
                        value={socialSecurity}
                        onChange={(e) => setSocialSecurity(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-[#5A4A68]/85 uppercase">ประกันชีวิตทั่วไป (สูงสุด 100k)</label>
                      <input 
                        type="number" 
                        value={lifeInsurance}
                        onChange={(e) => setLifeInsurance(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-[#5A4A68]/85 uppercase">กองทุน SSF/RMF (สูงสุด 30% ของเงินได้)</label>
                      <input 
                        type="number" 
                        value={ssfRmf}
                        onChange={(e) => setSsfRmf(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-[#5A4A68]/85 uppercase">ดอกเบี้ยกู้ซื้อบ้าน (สูงสุด 100k)</label>
                      <input 
                        type="number" 
                        value={homeInterest}
                        onChange={(e) => setHomeInterest(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-[#5A4A68]/85 uppercase">Easy E-Receipt (สูงสุด 50k)</label>
                      <input 
                        type="number" 
                        value={easyEreceipt}
                        onChange={(e) => setEasyEreceipt(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={isCalculating}
                className="h-12 w-full rounded-2xl bg-[#B08CFF] text-white text-xs font-black shadow-md shadow-[#B08CFF]/25 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4.5 h-4.5 animate-spin-slow" />
                {isCalculating ? "กำลังวิเคราะห์คำนวณภาษี..." : "คำนวณสิทธิ์ลดหย่อนและพิกัดความเสี่ยงภาษี 🔮"}
              </button>
            </div>
          </form>

          {/* Right Pane: Dynamic tax assessment outputs & progressive steps */}
          <div className="flex flex-col gap-6">
            
            {calcResults && (
              <>
                {/* Risk Advice Banner alert */}
                <div className={`p-5 rounded-3xl border-2 flex gap-4 items-start shadow-sm ${
                  calcResults.risk_level === 'high'
                    ? 'bg-[#EF4444]/5 border-[#EF4444]/25 text-[#EF4444]'
                    : calcResults.risk_level === 'medium'
                    ? 'bg-[#F59E0B]/5 border-[#F59E0B]/25 text-[#F59E0B]'
                    : 'bg-[#10B981]/5 border-[#10B981]/25 text-[#10B981]'
                }`}>
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider">ดัชนีระดับประเมินความเสี่ยงภาษี</span>
                    <p className="text-xs font-bold leading-relaxed text-[#5A4A68]">
                      {calcResults.risk_advice}
                    </p>
                  </div>
                </div>

                {/* Ledger metrics overview */}
                <div className="glass rounded-3xl p-5 md:p-6 flex flex-col gap-4 border border-[#B08CFF]/15">
                  <div className="border-b border-[#B08CFF]/10 pb-2">
                    <h3 className="text-sm font-black text-[#5A4A68] flex items-center gap-1.5">
                      <FileCheck2 className="w-4.5 h-4.5 text-[#B08CFF]" />
                      สรุปผลการประเมินเงินได้สุทธิ
                    </h3>
                  </div>

                  <div className="space-y-3 font-bold text-xs text-[#5A4A68]">
                    <div className="flex justify-between">
                      <span>รายรับพึงประเมินสะสม:</span>
                      <span>฿{calcResults.gross_income.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#EF4444]">
                      <span>หักรายจ่าย/ค่าใช้จ่ายสะสม:</span>
                      <span>-฿{calcResults.total_expenses.toLocaleString()}</span>
                    </div>
                    {sellerType === "individual" && (
                      <div className="flex justify-between text-[#B08CFF]">
                        <span>หักสิทธิ์ลดหย่อนสะสม:</span>
                        <span>-฿{calcResults.total_allowances.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#B08CFF]/10 pt-2.5 text-sm font-black">
                      <span>เงินได้สุทธิประเมินภาษี:</span>
                      <span className="text-[#B08CFF]">฿{calcResults.taxable_income.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-base font-black border-t border-[#B08CFF]/10 pt-2.5">
                      <span>ภาระภาษีสะสมประจำปี:</span>
                      <span className="text-[#10B981]">฿{calcResults.tax_liability.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Progressive step breakdown steps table */}
                <div className="glass rounded-3xl p-5 md:p-6 flex flex-col gap-4 border border-[#B08CFF]/15">
                  <div className="border-b border-[#B08CFF]/10 pb-2">
                    <h3 className="text-sm font-black text-[#5A4A68] flex items-center gap-1.5">
                      <ListFilter className="w-4.5 h-4.5 text-[#B08CFF]" />
                      ตารางจำลองพิกัดภาษีอัตราก้าวหน้า
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] font-bold text-[#5A4A68]">
                      <thead>
                        <tr className="border-b border-[#B08CFF]/15 text-[#5A4A68]/60">
                          <th className="pb-2">ช่วงเงินได้สุทธิ</th>
                          <th className="pb-2 text-center">อัตราภาษี</th>
                          <th className="pb-2 text-right">เงินได้สุทธิในขั้น</th>
                          <th className="pb-2 text-right text-[#10B981]">ภาษีในขั้น</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calcResults.steps.map((step: any, idx: number) => (
                          <tr key={idx} className="border-b border-[#B08CFF]/5">
                            <td className="py-2.5">{step.bracket_range}</td>
                            <td className="py-2.5 text-center font-mono">{step.rate}%</td>
                            <td className="py-2.5 text-right font-mono">฿{step.taxable_amount.toLocaleString()}</td>
                            <td className="py-2.5 text-right font-mono text-[#10B981]">฿{step.tax_amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

          </div>

        </div>

        {/* Golden Legal Warning Box disclaimer */}
        <footer className="p-4 rounded-2xl border-2 border-[#FAF9F6]/20 bg-[#F59E0B]/5 flex gap-3.5 items-start shadow-sm mt-2 shrink-0">
          <AlertTriangle className="text-[#F59E0B] w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-[#5A4A68] uppercase tracking-wide">⚠️ ข้อแจ้งขอบเขตความคุ้มครองจำกัดความรับผิดชอบกฎหมายภาษี</h4>
            <p className="text-[9.5px] text-[#5A4A68]/70 leading-relaxed font-semibold">
              เครื่องคำนวณพิกัดความเสี่ยงภาษี Fillax เป็นเพียงแบบจำลองประเมินพิกัดเบื้องต้นอ้างอิงตามเกณฑ์อัตราก้าวหน้ากรมสรรพากรไทยปีล่าสุดเท่านั้น <strong>ไม่ได้มีหน้าที่ชี้ขาดกฎเกณฑ์หรือเป็นที่ปรึกษาบัญชีตัวแทนอย่างเป็นทางการ</strong> อัตราหักเหมาค่าใช้จ่าย 60% หรือค่าลดหย่อนกองทุนอาจมีการเปลี่ยนแปลงตามเกณฑ์ข้อกำหนดของรัฐมนตรีคลังปีนั้นๆ โปรดปรึกษาผู้เชี่ยวชาญบัญชีก่อนยื่นจริงทุกครั้งเพื่อผลประโยชน์สูงสุดของกิจการคุณค่ะ
            </p>
          </div>
        </footer>

        {/* Upgrade subscription dialog elevation portal */}
        <UpgradeDialog isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
      </div>
    </DashboardShell>
  );
}
