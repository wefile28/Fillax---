"use client";

import React, { useState, useEffect } from "react";
import { supabase, API_URL } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Crown, CheckCircle2, Timer, RefreshCw, Upload, Loader2 } from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  planType?: "pro" | "agency";
  amount?: number;
}

export default function UpgradeDialog({ open, onOpenChange, onSuccess, planType = "pro", amount = 199.00 }: UpgradeDialogProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  
  const [isVerifyingSlip, setIsVerifyingSlip] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const payAmount = amount;
  const plan = planType;

  // Timer for PromptPay QR Code
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 mins

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setTimeLeft(300);
      setIsSuccess(false);
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || timeLeft <= 0 || isSuccess) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [open, timeLeft, isSuccess]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsVerifyingSlip(true);
      toast.loading("AI กำลังตรวจสอบความถูกต้องของสลิปโอนเงิน... 🤖", { id: "verify-slip-toast" });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนทำการตรวจสอบสลิป");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/v1/payment/verify-slip`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        },
        body: formData
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.detail || "ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่อีกครั้ง");
      }

      // Success! Update local states instantly
      localStorage.setItem("fillax_is_pro", "true");
      window.dispatchEvent(new Event("storage"));

      toast.success(resData.message || "ยืนยันสลิปชำระเงินสำเร็จ! บัญชีได้รับการอัปเกรดเรียบร้อย 🎉", { id: "verify-slip-toast" });
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป", { id: "verify-slip-toast" });
    } finally {
      setIsVerifyingSlip(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processPayment = async (method: "promptpay" | "credit_card") => {
    try {
      setIsProcessing(true);
      
      // Simulate real-world gateway delay (Stripe/Omise API handshake)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Authenticated flow: update FastAPI backend database
        let token = "tok_omise_pp_simulated";
        const isProduction = process.env.NODE_ENV === "production";
        
        // If Omise public key is configured, create a real PromptPay source token on client side
        const omisePublicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
        if (omisePublicKey) {
          try {
            const omiseRes = await fetch("https://api.omise.co/sources", {
              method: "POST",
              headers: {
                "Authorization": "Basic " + btoa(omisePublicKey + ":"),
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                type: "promptpay",
                amount: Math.round(payAmount * 100),
                currency: "THB"
              })
            });
            if (omiseRes.ok) {
              const sourceData = await omiseRes.json();
              if (sourceData && sourceData.id) {
                token = sourceData.id;
              }
            } else {
              if (isProduction) {
                throw new Error("ไม่สามารถเชื่อมต่อเกตเวย์รับชำระเงินจริงได้ในขณะนี้ กรุณาอัปโหลดรูปภาพสลิปโอนเงินธนาคารแทน");
              }
              console.warn("Failed to create real Omise source, using fallback in development.");
            }
          } catch (omiseErr: any) {
            if (isProduction) {
              throw new Error(omiseErr.message || "ระบบเข้ารหัสชำระเงินมีความขัดข้อง กรุณาโอนเงินพร้อมอัปโหลดรูปสลิปแทน");
            }
            console.error("Omise source tokenization failed:", omiseErr);
          }
        } else if (isProduction) {
          throw new Error("เกตเวย์การชำระเงินอัตโนมัติยังไม่ได้ตั้งค่าอย่างสมบูรณ์บนเซิร์ฟเวอร์จริง กรุณาโอนเงินและอัปโหลดสลิปเพื่อเปิดใช้งานระบบอัตโนมัติ 📸");
        }

        const response = await fetch(`${API_URL}/api/v1/payment/upgrade`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            method: method,
            plan: plan,
            amount: payAmount,
            token: token
          })
        });

        if (!response.ok) {
          throw new Error("ระบบเซิร์ฟเวอร์ชำระเงินขัดข้อง กรุณาลองใหม่อีกครั้ง");
        }

        const resData = await response.json();
        
        // Handle asynchronous PromptPay pending QR flow (P2 Frontend Pending PromptPay)
        if (resData && resData.status === "pending") {
          toast.info(resData.message || "สร้างรายการพร้อมเพย์สำเร็จ! กรุณาสแกนคิวอาร์โค้ดชำระเงินเพื่อเปิดใช้งานแผนอัตโนมัติ ⏳", { duration: 10000 });
          setIsProcessing(false);
          onOpenChange(false);
          return;
        }

        if (resData && resData.status === "success") {
          // Universal Local Storage fallback to sync state instantly (Only on Direct Success)
          localStorage.setItem("fillax_is_pro", "true");
          window.dispatchEvent(new Event("storage"));
          
          setIsSuccess(true);
          toast.success(`อัปเกรดเป็นระดับ ${plan === "agency" ? "AGENCY" : "PRO"} สำเร็จแล้ว! 🎉✨`);
          if (onSuccess) onSuccess();
        } else {
          throw new Error(resData.message || "การอัปเกรดไม่สำเร็จ กรุณาตรวจสอบข้อมูลการชำระเงิน");
        }
      } else {
        throw new Error("เซสชันผู้ใช้หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "การชำระเงินไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-none p-0 overflow-hidden rounded-3xl shadow-2xl glass">
        {isSuccess ? (
          <div className="p-8 text-center space-y-6 bg-card flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground">ยินดีต้อนรับสู่ FILLAX {plan === "agency" ? "AGENCY" : "PRO"}! 🎉</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                บัญชีของคุณได้รับการอัปเกรดเรียบร้อยแล้ว ปลดล็อกฟีเจอร์จัดการบัญชีอัจฉริยะแบบไม่มีขีดจำกัด สแกนใบเสร็จ OCR ขั้นสูง และประเมินความเสี่ยงอย่างสมบูรณ์แบบ!
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-12 rounded-2xl font-bold bg-primary text-white"
            >
              เริ่มต้นใช้งานทันที
            </Button>
          </div>
        ) : (
          <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-primary via-primary/95 to-purple-600 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Crown className="h-28 w-28 rotate-12" />
              </div>
              <div className="relative z-10 space-y-2">
                <Crown className="h-8 w-8 text-white mx-auto mb-2 animate-pulse" />
                <DialogTitle className="text-2xl font-black">อัปเกรดบัญชีของคุณ</DialogTitle>
                <DialogDescription className="text-white/80 text-xs">
                  ฿{payAmount}/รอบบิล • จัดการภาษีแบบมืออาชีพอย่างปลอดภัยและไร้ขีดจำกัด
                </DialogDescription>
              </div>
            </div>

            {/* PromptPay Checkout Form */}
            <div className="p-6 bg-card space-y-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-3xl border shadow-sm relative flex flex-col items-center">
                {/* Simulated PromptPay Logo Banner */}
                <div className="w-44 h-8 bg-[#003d6d] rounded-lg mb-3 flex items-center justify-center text-white font-extrabold text-[11px] tracking-widest uppercase">
                  THAI QR PAYMENT
                </div>
                {/* Real Scannable PromptPay QR Code (Uses User's Real Phone number as fallback!) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`https://promptpay.io/${process.env.NEXT_PUBLIC_PROMPTPAY_ID || "0638497065"}/${payAmount}.png`} 
                  alt="PromptPay QR Code" 
                  className="w-44 h-44 object-contain"
                />
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">สแกนชำระเงินด่วนเพื่อความรวดเร็วและปลอดภัย</p>
                <p className="text-xs font-bold text-foreground">ยอดเงินชำระ: <span className="text-primary text-sm font-black">{payAmount.toFixed(2)} บาท</span></p>
              </div>

              <div className="w-full flex items-center justify-center gap-2 bg-muted/40 rounded-2xl py-2 px-4 text-xs font-bold text-muted-foreground">
                <Timer className="w-4 h-4 text-primary" />
                <span>คิวอาร์โค้ดหมดอายุใน {formatTime(timeLeft)}</span>
              </div>

              <div className="w-full border-t border-dashed my-1" />

              {/* Bank Transfer Slip Upload Field */}
              <div className="w-full space-y-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleSlipUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing || isVerifyingSlip}
                  variant="outline"
                  className="w-full h-11 rounded-2xl font-bold border-dashed border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2"
                >
                  {isVerifyingSlip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      กำลังตรวจสอบสลิปด้วย AI...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-primary animate-pulse" />
                      อัปโหลดสลิปเพื่อยืนยันทันที 📸
                    </>
                  )}
                </Button>
                <p className="text-[9px] text-center text-muted-foreground leading-normal">
                  *โอนเงินเข้า PromptPay แล้ว อัปโหลดสลิปที่นี่เพื่อเปิดใช้แผนบริการ Pro อัตโนมัติทันที
                </p>
              </div>

              <div className="w-full border-t border-dashed my-1" />

              {process.env.NODE_ENV !== "production" && (
                <Button
                  onClick={() => processPayment("promptpay")}
                  disabled={isProcessing || isVerifyingSlip}
                  className="w-full h-12 rounded-2xl font-bold bg-primary text-white flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังยืนยันการชำระเงิน...
                    </>
                  ) : (
                    "ยืนยันชำระเงินแบบจำลอง (Sandbox)"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
