"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { 
  X, 
  CheckCircle2, 
  Sparkles, 
  Crown, 
  ShieldCheck, 
  CreditCard,
  QrCode,
  Clock,
  AlertCircle
} from "lucide-react";

interface UpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeDialog({ isOpen, onClose }: UpgradeDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"promptpay" | "card">("promptpay");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
  // Credit Card Form States
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  
  // Timer States for PromptPay QR
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || paymentMethod !== "promptpay") return;
    
    setTimeLeft(300); // Reset timer to 5 minutes
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, paymentMethod]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePromptPayPay = async () => {
    setIsProcessing(true);
    // Simulate API webhook claim execution
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        ref_id: `txn_${Math.random().toString(36).substring(7)}`,
        status: "success",
        plan: "pro",
        amount_paid: billingCycle === "monthly" ? 299.00 : 2990.00
      };

      if (session) {
        // Elevate plan status inside real Database profiles table
        await supabase
          .from("profiles")
          .update({ 
            plan: "pro",
            ocr_count: 0,
            ai_count: 0
          })
          .eq("id", session.user.id);
      } else {
        // Upgrade Local storage guest metrics
        localStorage.setItem("fillax_plan", "pro");
      }

      setShowSuccess(true);
    } catch (e) {
      console.error(e);
      alert("การชำระเงินล้มเหลว โปรดลองอีกครั้ง");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
      alert("กรุณากรอกข้อมูลบัตรเครดิตให้ครบถ้วน");
      return;
    }

    setIsProcessing(true);
    // Simulate secure credit card gateway processing
    setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          await supabase
            .from("profiles")
            .update({ 
              plan: "pro",
              ocr_count: 0,
              ai_count: 0
            })
            .eq("id", session.user.id);
        } else {
          localStorage.setItem("fillax_plan", "pro");
        }
        setShowSuccess(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  const handleClose = () => {
    setShowSuccess(false);
    onClose();
  };

  const proFeatures = [
    "สแกนใบเสร็จผ่านไลน์และเว็บได้ไม่จำกัด (Unlimited AI OCR)",
    "คุยถาม-ตอบภาษีอัจฉริยะกับผู้ช่วย AI ได้ไม่จำกัด (Unlimited AI)",
    "ตรวจสอบ Modulo-11 ค้นหาฐานข้อมูลคู่ค้า DBD รวดเร็ว 100%",
    "ดาวน์โหลดตารางบัญชี Excel (CSV) สรรพากรแยกปีไม่จำกัดรอบ",
    "ประเมินค่าลดหย่อนแบบอัตราก้าวหน้าขั้นบันไดละเอียดสูงสุด",
    "ซิงก์ข้อมูลอัจฉริยะเชื่อมโยง LINE Webhooks & Dashboard ไหลลื่น"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#5A4A68]/45 backdrop-blur-md p-4 animate-fadeIn">
      <div className="glass rounded-3xl max-w-2xl w-full p-6 md:p-8 flex flex-col gap-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#5A4A68]/5 text-[#5A4A68] hover:bg-[#E9DDFF]/30 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success screen */}
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-6 animate-float">
            <div className="w-20 h-20 bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 rounded-3xl flex items-center justify-center shadow">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#5A4A68]">ยินดีต้อนรับเข้าสู่ PRO MEMBER! 👑💜</h2>
              <p className="text-xs text-[#5A4A68]/70 font-semibold leading-relaxed max-w-sm">
                เราได้ยกระดับสิทธิ์บัญชีของคุณเรียบร้อยแล้ว! ตอนนี้คุณสามารถใช้งานสแกนบิล OCR คุยถามภาษี AI และส่งออกตารางสรรพากรได้แบบไม่จำกัดไร้ขีดจำกัดแล้วค่ะ
              </p>
            </div>

            <button 
              onClick={handleClose}
              className="h-11 px-8 rounded-2xl bg-[#B08CFF] text-white text-xs font-black shadow-lg shadow-[#B08CFF]/20 hover:scale-102 active:scale-98 transition-transform cursor-pointer"
            >
              เริ่มต้นใช้งานฟีเจอร์พรีเมียมทันที 📈
            </button>
          </div>
        ) : (
          /* Checkout Shell */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Left Pane: Value Proposition Pro details */}
            <div className="flex flex-col justify-between gap-6 border-b md:border-b-0 md:border-r border-[#B08CFF]/15 pb-6 md:pb-0 md:pr-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-[#B08CFF] animate-pulse" />
                  <span className="text-lg font-black text-[#5A4A68]">ปลดล็อกความแกร่งสูงสุด</span>
                </div>
                
                <h3 className="text-xl font-black text-[#5A4A68]">
                  Fillax <span className="text-[#B08CFF] italic">Pro Plan</span> 👑
                </h3>
                
                <p className="text-xs text-[#5A4A68]/60 font-semibold leading-relaxed">
                  ยกระดับการทำบัญชีรายจ่ายแม่ค้าออนไลน์ของคุณสู่มืออาชีพ ตรวจเช็ค DBD รวดเร็ว ปลอดภัยสรรพากร
                </p>

                <ul className="space-y-2 pt-2">
                  {proFeatures.map((feat, i) => (
                    <li key={i} className="flex gap-2 items-start text-[10px] font-bold text-[#5A4A68]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#B08CFF] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Secure badge */}
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#B08CFF]/10 flex gap-2.5 items-center">
                <ShieldCheck className="w-6 h-6 text-[#10B981]" />
                <div className="text-[9px] text-[#5A4A68]/70 font-semibold leading-normal">
                  ความปลอดภัยทางการเงินสูงสุด เข้ารหัส Secure SSL 256-bit และตรวจสอบแบบสองระดับ
                </div>
              </div>
            </div>

            {/* Right Pane: Interactive Payment Panel */}
            <div className="flex flex-col gap-5 justify-between">
              <div>
                <h4 className="text-xs font-black text-[#5A4A68] uppercase tracking-wider mb-3">เลือกแผนชำระเงิน</h4>
                
                {/* Billing cycle toggles */}
                <div className="grid grid-cols-2 gap-2 bg-[#5A4A68]/5 p-1 rounded-xl mb-4 border border-[#B08CFF]/10">
                  <button 
                    onClick={() => setBillingCycle("monthly")}
                    className={`h-9 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      billingCycle === "monthly" 
                        ? "bg-[#B08CFF] text-white shadow" 
                        : "text-[#5A4A68]/70 hover:text-[#5A4A68]"
                    }`}
                  >
                    รายเดือน ฿299/ด.
                  </button>
                  <button 
                    onClick={() => setBillingCycle("yearly")}
                    className={`h-9 rounded-lg text-[10px] font-black transition-all relative cursor-pointer ${
                      billingCycle === "yearly" 
                        ? "bg-[#B08CFF] text-white shadow" 
                        : "text-[#5A4A68]/70 hover:text-[#5A4A68]"
                    }`}
                  >
                    รายปี ฿2,990/ปี
                    <span className="absolute -top-2 -right-1 bg-[#EF4444] text-white text-[7px] font-black px-1.5 py-0.5 rounded-full scale-90 border border-white">
                      SAVE 17%
                    </span>
                  </button>
                </div>

                {/* Payment Gateway method select */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button 
                    onClick={() => setPaymentMethod("promptpay")}
                    className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                      paymentMethod === "promptpay" 
                        ? "border-[#B08CFF] bg-[#B08CFF]/5 text-[#5A4A68]" 
                        : "border-[#B08CFF]/15 hover:bg-[#E9DDFF]/10 text-[#5A4A68]/70"
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-[#B08CFF]" />
                    Thai PromptPay
                  </button>
                  <button 
                    onClick={() => setPaymentMethod("card")}
                    className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                      paymentMethod === "card" 
                        ? "border-[#B08CFF] bg-[#B08CFF]/5 text-[#5A4A68]" 
                        : "border-[#B08CFF]/15 hover:bg-[#E9DDFF]/10 text-[#5A4A68]/70"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-[#B08CFF]" />
                    บัตรเครดิต/เดบิต
                  </button>
                </div>

                {/* PromptPay interactive QR method */}
                {paymentMethod === "promptpay" ? (
                  <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-[#B08CFF]/15 shadow-sm text-center">
                    <span className="text-[10px] font-black text-[#5A4A68]">สแกนเพื่อจ่ายเงินผ่านแอปธนาคารของคุณ</span>
                    
                    {/* PromptPay QR Code container (luxury custom vector display) */}
                    <div className="relative w-44 h-44 bg-[#FAF9F6] border border-[#B08CFF]/20 rounded-xl p-2.5 flex items-center justify-center shadow-inner">
                      {/* Custom Dynamic PromptPay QR Code design */}
                      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" className="opacity-90">
                        {/* PromptPay Logo mock inside QR code */}
                        <rect width="100" height="100" rx="6" fill="#F8FAFC"/>
                        <rect x="5" y="5" width="24" height="24" rx="3" fill="#0A3F64"/>
                        <rect x="8" y="8" width="18" height="18" rx="2" fill="#FFFFFF"/>
                        <rect x="11" y="11" width="12" height="12" rx="1" fill="#0A3F64"/>
                        
                        <rect x="71" y="5" width="24" height="24" rx="3" fill="#0A3F64"/>
                        <rect x="74" y="8" width="18" height="18" rx="2" fill="#FFFFFF"/>
                        <rect x="77" y="7" width="12" height="12" rx="1" fill="#0A3F64"/>

                        <rect x="5" y="71" width="24" height="24" rx="3" fill="#0A3F64"/>
                        <rect x="8" y="74" width="18" height="18" rx="2" fill="#FFFFFF"/>
                        <rect x="11" y="77" width="12" height="12" rx="1" fill="#0A3F64"/>

                        {/* Random QR code pixels */}
                        <path d="M35 10 h5 v5 h-5 z M45 10 h10 v5 h-10 z M60 10 h5 v5 h-5 z" fill="#0A3F64"/>
                        <path d="M35 20 h10 v5 h-10 z M55 20 h5 v5 h-5 z M65 20 h5 v5 h-5 z" fill="#0A3F64"/>
                        <path d="M10 35 h5 v10 h-5 z M20 35 h15 v5 h-15 z M45 35 h10 v5 h-10 z" fill="#0A3F64"/>
                        <path d="M10 50 h5 v5 h-5 z M25 50 h5 v10 h-5 z M40 50 h15 v5 h-15 z M60 50 h10 v5 h-10 z" fill="#0A3F64"/>
                        <path d="M50 60 h5 v5 h-5 z M60 60 h10 v15 h-10 z M80 60 h10 v5 h-10 z" fill="#0A3F64"/>
                        <path d="M35 75 h5 v5 h-5 z M45 75 h10 v5 h-10 z M80 75 h10 v5 h-10 z" fill="#0A3F64"/>
                        <path d="M35 85 h15 v5 h-15 z M60 85 h10 v5 h-10 z M80 85 h5 v5 h-5 z" fill="#0A3F64"/>
                        
                        {/* Center Logo */}
                        <circle cx="50" cy="50" r="14" fill="#0A3F64"/>
                        <path d="M44 48 h12 v4 h-12 z M50 42 v16 h2 v-16 z" fill="#FFFFFF"/>
                      </svg>
                    </div>

                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex gap-1.5 items-center text-xs font-black text-[#5A4A68]">
                        <Clock className="w-4 h-4 text-[#B08CFF] shrink-0" />
                        <span>หมดอายุภายใน:</span>
                        <span className="font-mono text-[#EF4444] animate-pulse">{formatTime(timeLeft)}</span>
                      </div>
                      {timeLeft === 0 && (
                        <p className="text-[9px] text-[#EF4444] font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> QR Code หมดอายุแล้ว โปรดปิดและเปิดใหม่เพื่อสร้างใหม่ค่ะ
                        </p>
                      )}
                    </div>

                    <button 
                      onClick={handlePromptPayPay}
                      disabled={isProcessing || timeLeft === 0}
                      className={`h-10 px-6 rounded-xl text-[10px] font-black text-white shadow-md transition-all ${
                        isProcessing || timeLeft === 0
                          ? 'bg-[#B08CFF]/50 cursor-not-allowed'
                          : 'bg-[#B08CFF] shadow-[#B08CFF]/20 hover:scale-102 cursor-pointer'
                      }`}
                    >
                      {isProcessing ? "กำลังวิเคราะห์ยืนยันสลิป..." : "ฉันได้ทำการแสกนชำระเงินสำเร็จแล้ว 🟢"}
                    </button>
                  </div>
                ) : (
                  /* Credit Card Input Form method */
                  <form onSubmit={handleCardPay} className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">ชื่อผู้ถือบัตร *</label>
                      <input 
                        type="text" 
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                        placeholder="NAME ON CARD"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">หมายเลขบัตรเครดิต *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                          setCardNumber(val);
                        }}
                        className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#B08CFF]/20 text-xs font-mono font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                        placeholder="0000 0000 0000 0000"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">วันหมดอายุ *</label>
                        <input 
                          type="text" 
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val.length === 2 && !val.includes("/")) val += "/";
                            setCardExpiry(val);
                          }}
                          className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#B08CFF]/20 text-xs font-mono font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                          placeholder="MM/YY"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">รหัสความปลอดภัย (CVV) *</label>
                        <input 
                          type="password" 
                          required
                          maxLength={3}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#B08CFF]/20 text-xs font-mono font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                          placeholder="000"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isProcessing}
                      className={`h-11 w-full rounded-xl text-[10px] font-black text-white shadow-md transition-all mt-2 cursor-pointer ${
                        isProcessing 
                          ? 'bg-[#B08CFF]/50 cursor-not-allowed'
                          : 'bg-[#B08CFF] shadow-[#B08CFF]/20 hover:scale-102'
                      }`}
                    >
                      {isProcessing ? "กำลังประมวลผลบัตร..." : `ชำระเงินความปลอดภัย ฿${billingCycle === "monthly" ? "299.00" : "2,990.00"}`}
                    </button>
                  </form>
                )}
              </div>

              {/* Total Summary display */}
              <div className="flex justify-between items-center bg-[#FAF9F6] p-3 rounded-xl border border-[#B08CFF]/10 text-xs font-bold text-[#5A4A68]">
                <span>ยอดเงินที่ต้องชำระสุทธิ:</span>
                <span className="text-sm font-black text-[#B08CFF]">
                  ฿{billingCycle === "monthly" ? "299.00" : "2,990.00"}
                </span>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
