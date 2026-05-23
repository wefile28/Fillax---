"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Store, 
  ChevronRight, 
  TrendingUp, 
  ShoppingBag,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { shopName: string; channel: string; revenue: number }) => void;
}

export default function OnboardingModal({ isOpen, onClose, onSuccess }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [shopName, setShopName] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [revenueRange, setRevenueRange] = useState<number>(150000);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const channels = [
    { id: "shopee", name: "Shopee", icon: "🧡", color: "hover:border-orange-500 hover:bg-orange-500/5 text-orange-600" },
    { id: "lazada", name: "Lazada", icon: "💙", color: "hover:border-blue-500 hover:bg-blue-500/5 text-blue-600" },
    { id: "tiktok", name: "TikTok Shop", icon: "🖤", color: "hover:border-slate-800 hover:bg-slate-800/5 text-slate-900 dark:text-white" },
    { id: "facebook", name: "Facebook / IG", icon: "👥", color: "hover:border-sky-600 hover:bg-sky-600/5 text-sky-600" },
    { id: "line", name: "LINE Shopping", icon: "💚", color: "hover:border-emerald-500 hover:bg-emerald-500/5 text-emerald-600" },
    { id: "offline", name: "หน้าร้าน / ออฟไลน์", icon: "🏪", color: "hover:border-violet-500 hover:bg-violet-500/5 text-violet-600" }
  ];

  // Confetti Explosion Effect
  useEffect(() => {
    if (step === 4 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 450;

      const particles: Array<{
        x: number;
        y: number;
        size: number;
        color: string;
        speedX: number;
        speedY: number;
        rotation: number;
        rotationSpeed: number;
      }> = [];

      const colors = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B"];

      for (let i = 0; i < 120; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2 - 20,
          size: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: (Math.random() - 0.5) * 12,
          speedY: (Math.random() - 0.6) * 12 - 4,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5,
        });
      }

      let animationFrameId: number;
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let stillActive = false;
        particles.forEach((p) => {
          p.x += p.speedX;
          p.y += p.speedY;
          p.speedY += 0.2; // Gravity
          p.speedX *= 0.98; // Friction
          p.rotation += p.rotationSpeed;

          if (p.y < canvas.height && p.x > 0 && p.x < canvas.width) {
            stillActive = true;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });

        if (stillActive) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animate();
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [step]);

  const handleNext = () => {
    if (step === 1 && !shopName.trim()) {
      toast.error("โปรดระบุชื่อร้านค้าของคุณก่อนนะคะ 💜");
      return;
    }
    if (step === 2 && !selectedChannel) {
      toast.error("โปรดเลือกช่องทางหลักการขายอย่างน้อย 1 ช่องทางค่ะ");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFinish = async () => {
    try {
      // 1. Save data to localStorage immediately for instant personalization
      localStorage.setItem("fillax_onboarding_completed", "true");
      localStorage.setItem("fillax_shop_name", shopName);
      localStorage.setItem("fillax_sales_channel", selectedChannel);
      localStorage.setItem("fillax_estimated_revenue", revenueRange.toString());

      // 2. Safely sync to Supabase profile in background if signed in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from("profiles")
          .update({
            shop_name: shopName,
            shop_channels: [selectedChannel]
          })
          .eq("id", session.user.id);
      }

      // 3. Move to celebration screen
      setStep(4);
      
      // 4. Fire success callback after 2 seconds of celebration
      setTimeout(() => {
        onSuccess({ shopName, channel: selectedChannel, revenue: revenueRange });
        onClose();
      }, 2200);
      
    } catch (err) {
      console.error("[ONBOARDING_SYNC_ERROR]", err);
      // Fallback works fine
      setStep(4);
      setTimeout(() => {
        onSuccess({ shopName, channel: selectedChannel, revenue: revenueRange });
        onClose();
      }, 2200);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-background/60 backdrop-blur-2xl border border-primary/20 rounded-3xl shadow-2xl">
        <DialogTitle className="sr-only">ตั้งค่าร้านค้าของคุณ (Onboarding)</DialogTitle>
        <DialogDescription className="sr-only">กรอกข้อมูลร้านค้าของคุณเพื่อรับการวิเคราะห์ทางการเป็นอยู่และวางแผนภาษี</DialogDescription>
        <div className="relative p-8 flex flex-col items-center justify-between min-h-[460px]">
          {/* Confetti Canvas */}
          {step === 4 && (
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-50" />
          )}

          {/* Glowing Accents */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

          {/* Stepper Dots */}
          {step <= 3 && (
            <div className="flex gap-2.5 justify-center mb-6">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step 
                      ? "w-8 bg-primary" 
                      : s < step 
                        ? "w-2 bg-primary/45" 
                        : "w-2 bg-muted/60"
                  }`} 
                />
              ))}
            </div>
          )}

          {/* Frame Transitions */}
          <div className="flex-1 w-full flex flex-col justify-center py-4">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto shadow-md">
                    <Store className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-foreground">
                      ยินดีต้อนรับสู่ครอบครัว Fillax 💜
                    </h2>
                    <p className="text-sm text-muted-foreground font-semibold">
                      เพื่อปรับแดชบอร์ดภาษีอัจฉริยะให้เหมาะสมที่สุด มารู้จักธุรกิจของคุณกันหน่อยค่ะ
                    </p>
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <label className="text-xs font-black text-muted-foreground block text-left uppercase tracking-wider pl-1">
                      ชื่อร้านค้า / แบรนด์ของคุณ
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น แม่ส้ม ส้มตำออนไลน์, Fillax Studio"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full h-12 px-4 rounded-2xl border border-primary/20 bg-background/50 backdrop-blur-md text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all font-bold placeholder:text-muted-foreground/50 text-center"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mx-auto shadow-sm mb-2">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-foreground">
                      ช่องทางหลักในการขายสินค้า 🛍️
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold">
                      คุณรับยอดชำระเงินและขายของผ่านช่องทางไหนเป็นหลักคะ?
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto">
                    {channels.map((chan) => (
                      <button
                        key={chan.id}
                        onClick={() => setSelectedChannel(chan.id)}
                        className={`p-3.5 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1.5 font-bold ${
                          selectedChannel === chan.id
                            ? "border-primary bg-primary/15 text-primary shadow-md scale-102"
                            : "border-primary/10 bg-background/30 hover:scale-101 " + chan.color
                        }`}
                      >
                        <span className="text-2xl">{chan.icon}</span>
                        <span className="text-xs">{chan.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mx-auto shadow-sm">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-foreground">
                      ยอดขายหรือรายรับเฉลี่ยต่อเดือน 💸
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold">
                      ช่วยบอกประมาณการยอดขาย เพื่อให้ระบบตั้งเป้าหมายภาษีเบื้องต้นได้ทันทีค่ะ
                    </p>
                  </div>

                  <div className="max-w-md mx-auto space-y-6 pt-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                      <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground block">
                        ยอดขายรายเดือนจำลอง
                      </span>
                      <span className="text-3xl font-black text-primary block mt-1 tracking-tight">
                        ฿{revenueRange.toLocaleString()} บาท
                      </span>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="range"
                        min={15000}
                        max={1000000}
                        step={10000}
                        value={revenueRange}
                        onChange={(e) => setRevenueRange(Number(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                        <span>฿15K</span>
                        <span>฿500K</span>
                        <span>฿1M+</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="space-y-6 text-center py-6"
                >
                  <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                      ปรับแต่งบัญชีสำเร็จ! 🎉
                    </h2>
                    <p className="text-base text-muted-foreground font-bold max-w-sm mx-auto">
                      ยินดีต้อนรับเข้าสู่ระบบบัญชีและภาษีของ <span className="text-primary font-black">{shopName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground animate-pulse">
                      กำลังสลับเข้าสู่หน้าหลักของร้านค้าคุณ...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          {step <= 3 && (
            <div className="w-full flex justify-between items-center gap-4 mt-8 pt-4 border-t border-primary/10">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  step === 1 
                    ? "opacity-0 cursor-default" 
                    : "text-muted-foreground hover:bg-accent/40"
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
              </button>

              <button
                type="button"
                onClick={step === 3 ? handleFinish : handleNext}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-102 active:scale-98 transition-all flex items-center gap-1.5"
              >
                <span>{step === 3 ? "เริ่มต้นใช้งานจริง" : "ถัดไป"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
