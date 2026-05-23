"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Calculator, 
  TrendingDown, 
  TrendingUp, 
  Coins, 
  ShieldCheck, 
  HelpCircle,
  PiggyBank,
  CheckCircle,
  FileCheck,
  Award
} from "lucide-react";
import { toast } from "sonner";

// Thai Personal Income Tax Brackets (PND 90/91)
const TAX_BRACKETS = [
  { limit: 150000, rate: 0.00, cumulative: 0 },
  { limit: 300000, rate: 0.05, cumulative: 7500 },
  { limit: 500000, rate: 0.10, cumulative: 20000 },
  { limit: 750000, rate: 0.15, cumulative: 37500 },
  { limit: 1000000, rate: 0.20, cumulative: 50000 },
  { limit: 2000000, rate: 0.25, cumulative: 250000 },
  { limit: 5000000, rate: 0.30, cumulative: 900000 },
  { limit: Infinity, rate: 0.35, cumulative: Infinity }
];

// Helper to calculate progressive tax based on net taxable income
function calculateThaiTax(netIncome: number): number {
  if (netIncome <= 150000) return 0;
  
  let remaining = netIncome;
  let tax = 0;
  let previousLimit = 0;

  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const bracket = TAX_BRACKETS[i];
    const range = bracket.limit - previousLimit;
    
    if (remaining <= range) {
      tax += remaining * bracket.rate;
      break;
    } else {
      tax += range * bracket.rate;
      remaining -= range;
      previousLimit = bracket.limit;
    }
  }
  return Math.round(tax);
}

export default function TaxPlanningPage() {
  // Input states
  const [annualIncome, setAnnualIncome] = useState<number>(850000);
  const [expenseMethod, setExpenseMethod] = useState<"standard" | "actual">("standard");
  const [actualExpenses, setActualExpenses] = useState<number>(350000);
  
  // Deductions states
  const [personalDeduction] = useState<number>(60000);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [ssfRmfFunds, setSsfRmfFunds] = useState<number>(50000);
  const [insurance, setInsurance] = useState<number>(30000);
  const [donations, setDonations] = useState<number>(10000);

  // Derived computations
  const computedValues = useMemo(() => {
    // 1. Calculate expense deduction
    const expenseDeduction = expenseMethod === "standard" 
      ? Math.min(annualIncome * 0.60, 100000) // Standard 60% deduction capped at 100,000 Baht for 40(8) online commerce
      : actualExpenses;

    // 2. Child deduction (30,000 Baht per child)
    const childDeduction = childrenCount * 30000;

    // 3. Cap SSF/RMF/ThaiESG at 500,000 Baht or 30% of income
    const maxFundsLimit = Math.min(ssfRmfFunds, Math.min(annualIncome * 0.30, 500000));

    // 4. Cap Insurance at 100,000 Baht (Health capped at 25,000 within that)
    const maxInsuranceLimit = Math.min(insurance, 100000);

    // 5. Total deductions BEFORE donations
    const baseDeductions = personalDeduction + childDeduction + maxFundsLimit + maxInsuranceLimit;
    
    // 6. Net income before donations
    const netBeforeDonations = Math.max(0, annualIncome - expenseDeduction - baseDeductions);

    // 7. Donations (capped at 10% of net before donations)
    const maxDonationsLimit = Math.min(donations, netBeforeDonations * 0.10);

    // 8. Final Net Taxable Income
    const netTaxableIncome = Math.max(0, netBeforeDonations - maxDonationsLimit);

    // 9. Base Baseline Tax (with only standard expense and personal deduction of 60,000)
    const baselineExpense = expenseMethod === "standard" ? Math.min(annualIncome * 0.60, 100000) : actualExpenses;
    const baselineNet = Math.max(0, annualIncome - baselineExpense - personalDeduction);
    const baselineTax = calculateThaiTax(baselineNet);

    // 10. Actual Planned Tax
    const plannedTax = calculateThaiTax(netTaxableIncome);

    // 11. Tax saved
    const taxSaved = Math.max(0, baselineTax - plannedTax);

    return {
      expenseDeduction,
      childDeduction,
      fundsLimitUsed: maxFundsLimit,
      insuranceLimitUsed: maxInsuranceLimit,
      donationsLimitUsed: maxDonationsLimit,
      totalDeductions: baseDeductions + maxDonationsLimit,
      netTaxableIncome,
      baselineTax,
      plannedTax,
      taxSaved,
      taxBracketRate: TAX_BRACKETS.find(b => netTaxableIncome <= b.limit)?.rate ?? 0.35
    };
  }, [annualIncome, expenseMethod, actualExpenses, childrenCount, ssfRmfFunds, insurance, donations, personalDeduction]);

  const handleSavePlan = () => {
    toast.success("บันทึกแผนลดหย่อนภาษีสำเร็จ! แผนนี้ได้รับการจดจำลงในคลังบัญชีของคุณเรียบร้อยแล้ว 💜");
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Premium Gradient Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600/20 via-purple-600/10 to-transparent border border-primary/10 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" /> Premium Planning Tool
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              ระบบวางแผนลดหย่อนภาษีอัจฉริยะ 📝
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm md:text-base leading-relaxed">
              จำลองรายได้และปรับสไลเดอร์ลดหย่อนเพื่อประหยัดภาษีได้สูงสุดคำนวณตามขั้นบันไดสรรพากรปัจจุบัน (ภ.ง.ด. 90) ทันทีบนเบราว์เซอร์
            </p>
          </div>
          <button 
            onClick={handleSavePlan}
            className="self-start md:self-center px-6 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-102 transition-transform duration-200 flex items-center gap-2 group"
          >
            <span>บันทึกโมเดลภาษี</span>
            <FileCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main interactive grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Interactive Form: Inputs (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass rounded-3xl p-6 border-none space-y-6 shadow-xl">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Coins className="text-primary w-5 h-5" /> 1. รายได้และประเภทค่าใช้จ่าย
            </h2>
            
            {/* Annual Income Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <label className="text-muted-foreground">รายได้รวมจากการขายของออนไลน์ (ต่อปี)</label>
                <span className="text-primary text-base font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                  ฿{annualIncome.toLocaleString()}
                </span>
              </div>
              <input 
                type="range" 
                min={100000} 
                max={5000000} 
                step={20000}
                value={annualIncome}
                onChange={(e) => setAnnualIncome(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-semibold px-1">
                <span>฿100K</span>
                <span>฿1M</span>
                <span>฿2.5M</span>
                <span>฿5M</span>
              </div>
            </div>

            {/* Expense Type Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground block">ประเภทการหักค่าใช้จ่ายของแม่ค้าออนไลน์</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExpenseMethod("standard")}
                  className={`p-4 rounded-2xl border text-center transition-all duration-200 ${
                    expenseMethod === "standard"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-md"
                      : "border-border hover:bg-accent/40 text-muted-foreground"
                  }`}
                >
                  <span className="block text-sm">หักแบบเหมา (60%)</span>
                  <span className="text-[10px] opacity-80 block mt-0.5">สูงสุดไม่เกิน 100,000 บาท</span>
                </button>
                <button
                  onClick={() => setExpenseMethod("actual")}
                  className={`p-4 rounded-2xl border text-center transition-all duration-200 ${
                    expenseMethod === "actual"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-md"
                      : "border-border hover:bg-accent/40 text-muted-foreground"
                  }`}
                >
                  <span className="block text-sm">หักตามจริง (มีหลักฐาน)</span>
                  <span className="text-[10px] opacity-80 block mt-0.5">ต้องเก็บเอกสาร/บิล/ใบเสร็จครบ</span>
                </button>
              </div>
            </div>

            {/* Conditional Actual Expenses Input */}
            {expenseMethod === "actual" && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 bg-muted/40 p-4 rounded-2xl border border-border"
              >
                <div className="flex justify-between items-center text-sm font-semibold">
                  <label className="text-muted-foreground">บันทึกรายจ่ายจริงทั้งหมด (ต่อปี)</label>
                  <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    ฿{actualExpenses.toLocaleString()}
                  </span>
                </div>
                <input 
                  type="range" 
                  min={50000} 
                  max={Math.min(annualIncome * 0.90, 4000000)} 
                  step={10000}
                  value={actualExpenses}
                  onChange={(e) => setActualExpenses(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </motion.div>
            )}
          </div>

          <div className="glass rounded-3xl p-6 border-none space-y-6 shadow-xl">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <PiggyBank className="text-primary w-5 h-5" /> 2. ปรับแผนสไลเดอร์ลดหย่อน (Deductions)
            </h2>

            {/* Slider 1: SSF / RMF / ThaiESG */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center gap-1.5">
                  <label className="text-muted-foreground">กองทุนรวมเพื่อการออม (SSF/RMF/ThaiESG)</label>
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg bg-popover border text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
                      สิทธิ์หักลดหย่อนซื้อกองทุนเพื่อเกษียณและประคองสิ่งแวดล้อมรวมไม่เกิน 500,000 บาท
                    </span>
                  </div>
                </div>
                <span className="text-primary text-sm font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                  ฿{ssfRmfFunds.toLocaleString()}
                </span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={Math.min(500000, annualIncome * 0.30)} 
                step={5000}
                value={ssfRmfFunds}
                onChange={(e) => setSsfRmfFunds(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Slider 2: Life & Health Insurance */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center gap-1.5">
                  <label className="text-muted-foreground">เบี้ยประกันชีวิตและสุขภาพ (ประกันส่วนตัว)</label>
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg bg-popover border text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
                      ลดหย่อนประกันชีวิตได้สูงสุด 100,000 บาท และประกันสุขภาพตนเองไม่เกิน 25,000 บาท
                    </span>
                  </div>
                </div>
                <span className="text-primary text-sm font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                  ฿{insurance.toLocaleString()}
                </span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={100000} 
                step={2000}
                value={insurance}
                onChange={(e) => setInsurance(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Slider 3: Donations */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center gap-1.5">
                  <label className="text-muted-foreground">เงินบริจาคสนับสนุนการศึกษา / ทั่วไป</label>
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg bg-popover border text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
                      ลดหย่อนเงินบริจาคได้สูงสุด 10% ของเงินได้หลังหักค่าใช้จ่ายและค่าลดหย่อนพื้นฐาน
                    </span>
                  </div>
                </div>
                <span className="text-primary text-sm font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                  ฿{donations.toLocaleString()}
                </span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={50000} 
                step={1000}
                value={donations}
                onChange={(e) => setDonations(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Sub-group Inputs: Family / Children */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-foreground block">ลดหย่อนบุตร (คนละ 30,000 บาท)</span>
                <span className="text-[10px] text-muted-foreground">ผู้มีสิทธิ์ลดหย่อนต้องเป็นบุตรตามกฎหมาย</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setChildrenCount(prev => Math.max(0, prev - 1))}
                  className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center font-bold text-muted-foreground hover:bg-accent transition-colors"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-black text-foreground">{childrenCount}</span>
                <button
                  type="button"
                  onClick={() => setChildrenCount(prev => Math.min(5, prev + 1))}
                  className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center font-bold text-muted-foreground hover:bg-accent transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output Dashboard: Metrics & Recommendations (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Giant Saving Neon Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-purple-700 to-indigo-900 text-white p-6 shadow-2xl shadow-primary/20 border border-primary/20">
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 blur-[40px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/20 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-sm font-bold opacity-80 uppercase tracking-widest flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" /> Tax Planning Results
                </span>
                <span className="bg-white/15 px-2 py-0.5 rounded-md text-xs font-black">
                  ฐานภาษี: {(computedValues.taxBracketRate * 100)}%
                </span>
              </div>

              {/* Tax Saved Metric */}
              <div className="space-y-1">
                <span className="text-xs font-bold opacity-80 block uppercase tracking-wider">เงินประหยัดภาษีไปได้ทั้งปี 🎉</span>
                <span className="text-4xl md:text-5xl font-black block tracking-tight animate-pulse text-yellow-300 drop-shadow-[0_4px_12px_rgba(253,224,71,0.2)]">
                  ฿{computedValues.taxSaved.toLocaleString()}
                </span>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <span className="block opacity-70">ภาษีปกติ (ไม่มีแผน)</span>
                  <span className="block text-md font-bold mt-0.5">฿{computedValues.baselineTax.toLocaleString()}</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <span className="block opacity-90 text-yellow-200">ภาษีหลังวางแผน</span>
                  <span className="block text-md font-black mt-0.5 text-yellow-200">฿{computedValues.plannedTax.toLocaleString()}</span>
                </div>
              </div>

              {/* Final net taxable income check */}
              <div className="text-[11px] opacity-80 leading-relaxed pt-2 flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-yellow-300 mt-0.5" />
                <span>คำนวณจากรายได้สุทธิหลังหักลบและหักค่าใช้จ่าย <strong>฿{computedValues.netTaxableIncome.toLocaleString()} บาท</strong></span>
              </div>
            </div>
          </div>

          {/* Premium Strategies List */}
          <div className="glass rounded-3xl p-6 border-none space-y-4 shadow-xl">
            <h3 className="text-md font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingDown className="text-primary w-4 h-4" /> แนะนำกลยุทธ์การประหยัดภาษี (Pro Advice)
            </h3>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              
              {/* Suggestion 1: SSF/RMF/ThaiESG */}
              <div className="bg-muted/40 p-4 rounded-2xl border border-border space-y-2 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <PiggyBank className="w-4.5 h-4.5 text-primary" />
                  <span>ลงทุนกองทุน ThaiESG / SSF เพื่อปั้นผลตอบแทน</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  คุณได้หักลดหย่อนซื้อกองทุนไป <strong>฿{computedValues.fundsLimitUsed.toLocaleString()}</strong> ซึ่งยังขยายสิทธิ์เพิ่มได้อีกเพื่อให้ได้รับเงินปันผลและประหยัดภาษีได้สูงขึ้นตามฐานภาษีสูงสุดของคุณ
                </p>
              </div>

              {/* Suggestion 2: Insurance */}
              <div className="bg-muted/40 p-4 rounded-2xl border border-border space-y-2 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ShieldCheck className="w-4.5 h-4.5 text-primary" />
                  <span>เพิ่มสิทธิ์ความคุ้มครองชีวิตและสุขภาพ</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  สิทธิ์ลดหย่อนค่าเบี้ยประกันของคุณอยู่ที่ <strong>฿{computedValues.insuranceLimitUsed.toLocaleString()}</strong> การทำประกันนอกจากจะช่วยสร้างความอุ่นใจในการเงินแล้ว ยังเป็นเครื่องมือคุ้มครองทุนทรัพย์ที่ดึงเงินคืนภาษีได้ดีที่สุดชนิดหนึ่ง
                </p>
              </div>

              {/* Suggestion 3: Actual cost warning for online merchants */}
              {expenseMethod === "standard" && (
                <div className="bg-muted/40 p-4 rounded-2xl border border-border space-y-2 hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <TrendingUp className="w-4.5 h-4.5 text-amber-500" />
                    <span className="text-amber-500">ต้นทุนขายของคุณเกิน 60% หรือไม่?</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    แม่ค้าออนไลน์ส่วนใหญ่มีต้นทุนจัดซื้อสินค้าและค่าโฆษณาสูงกว่า 60% ของยอดขาย หากสลับมาจดเก็บบิลและบิลค่าขนส่ง/ค่าน้ำมัน เพื่อยื่นหักลดหย่อนตามจริง จะสามารถลดฐานเงินได้สุทธิได้มากกว่าการหักเหมาอย่างมาก!
                  </p>
                </div>
              )}

              {/* Suggestion 4: VAT limits check */}
              {annualIncome >= 1500000 && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <Award className="w-4.5 h-4.5" />
                    <span>แจ้งเตือนเพดานรายได้ยื่นจดทะเบียน VAT</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    รายได้คุณเข้าใกล้เกณฑ์ 1.8 ล้านบาทต่อปี แนะนำเตรียมวางแผนจดทะเบียนภาษีมูลค่าเพิ่ม (VAT) ล่วงหน้า หรือใช้วิธีจัดโครงสร้างรายได้บุคคลธรรมดากระจายไปยังคณะบุคคล/หุ้นส่วน เพื่อคงฐานเสียภาษีต่ำสุด
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Legal Disclaimer */}
      <div className="text-center pt-8 pb-4">
        <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed max-w-3xl mx-auto">
          *การวิเคราะห์และการประเมินภาษีนี้จัดทำขึ้นบนข้อมูลเบื้องต้นเพื่ออำนวยความสะดวกเท่านั้น ไม่ถือเป็นคำปรึกษาทางกฎหมาย ข้อเสนอแนะ หรือการให้บริการทางวิชาชีพด้านบัญชีและภาษีอย่างเป็นทางการ โปรดตรวจสอบและยืนยันข้อมูลกับเจ้าหน้าที่สรรพากรหรือผู้เชี่ยวชาญก่อนดำเนินธุรกรรมใดๆ
        </p>
      </div>
    </div>
  );
}
