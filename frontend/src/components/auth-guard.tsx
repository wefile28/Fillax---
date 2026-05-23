"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { ShieldCheck, Database, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Automated 1-Click Database Migration (LocalStorage -> Supabase Cloud)
  const runDataMigration = useCallback(async (userId: string) => {
    const syncedFlag = localStorage.getItem("fillax_synced") === "true";
    if (syncedFlag) return;

    try {
      setIsSyncing(true);
      
      // Migrate Transactions
      const localTx = localStorage.getItem("fillax_transactions");
      if (localTx) {
        const txList = JSON.parse(localTx);
        if (txList.length > 0) {
          toast.loading("กำลังย้ายข้อมูลธุรกรรมของคุณขึ้นระบบ Cloud ปลอดภัย...", { id: "sync" });
          for (const tx of txList) {
            await supabase.from("transactions").insert({
              user_id: userId,
              date: tx.date || new Date().toISOString().split("T")[0],
              name: tx.description || "ธุรกรรมไม่มีชื่อ",
              amount: Number(tx.amount) || 0,
              type: tx.type || "expense",
              category: tx.category || "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ",
              channel: tx.channel || "other",
              note: tx.notes || ""
            });
          }
        }
      }

      // Migrate Allowances
      const localAllow = localStorage.getItem("fillax_allowances");
      if (localAllow) {
        const allowList = JSON.parse(localAllow);
        if (allowList.length > 0) {
          for (const allow of allowList) {
            await supabase.from("user_deductions").upsert({
              user_id: userId,
              tax_year: 2026,
              deduction_id: allow.id,
              amount: allow.amount || 0,
              is_applicable: allow.isSelected || false
            });
          }
        }
      }

      localStorage.setItem("fillax_synced", "true");
      toast.success("ย้ายข้อมูลขึ้นระบบ Cloud เรียบร้อย! ปลอดภัย 100% ✨", { id: "sync" });
    } catch (err) {
      console.error("Migration error:", err);
      toast.error("การเชื่อมต่อย้ายข้อมูลมีปัญหา แต่ข้อมูลของคุณยังคงอยู่บนเครื่องปลอดภัย", { id: "sync" });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);

      // 1. Check if Guest/Demo Mode is active
      const guestFlag = localStorage.getItem("fillax_guest_mode") === "true";
      if (guestFlag) {
        setIsAuthenticated(true);
        return;
      }

      // 2. Check active Supabase session
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
          // Trigger automated background migration if not synced
          await runDataMigration(session.user.id);
        } else {
          setIsAuthenticated(false);
        }
      };

      checkSession();
    }, 0);

    // 3. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsAuthenticated(true);
        localStorage.removeItem("fillax_guest_mode");
        await runDataMigration(session.user.id);
      } else if (!localStorage.getItem("fillax_guest_mode")) {
        setIsAuthenticated(false);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [runDataMigration]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      toast.error("เข้าสู่ระบบด้วย Google ไม่สำเร็จ: " + error.message);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem("fillax_guest_mode", "true");
    setIsAuthenticated(true);
    toast.success("ยินดีต้อนรับ! เข้าสู่โหมดทดสอบแบบออฟไลน์ (Guest Mode)");
  };

  // 1. SSR / Hydration guard (Ensures identical tree between server and client initially)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">กำลังเตรียมการเชื่อมต่อเข้าระบบ...</p>
        </div>
      </div>
    );
  }

  // 2. Client-side Auth checks pending
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">กำลังเตรียมการเชื่อมต่อเข้าระบบ...</p>
        </div>
      </div>
    );
  }

  // Intercept and display gorgeous glassmorphic login screen if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background px-4">
        {/* Modern purple-indigo radial backdrops */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Main glass box */}
          <div className="glass border-none rounded-3xl p-8 shadow-2xl shadow-primary/5 flex flex-col items-center text-center space-y-8">
            
            {/* Header Brand Icon */}
            <div className="w-24 h-24 relative flex items-center justify-center">
              <Image
                src="/fillax-mascot.png"
                alt="Fillax Logo"
                width={96}
                height={96}
                className="w-24 h-24 rounded-3xl object-contain border-2 border-primary/15 shadow-lg hover:scale-110 transition-transform duration-300 hover:border-primary/30"
              />
            </div>

            {/* Typography */}
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tight text-foreground">
                ยินดีต้อนรับสู่ <span className="text-primary italic">Fillax</span> 💜
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                ระบบจัดการบัญชีและลดหย่อนภาษีอัจฉริยะแม่ค้าออนไลน์ ป้องกันข้อมูลสูญหายด้วยคลาวด์ 100%
              </p>
            </div>

            {/* Feature Badges for Peace of Mind */}
            <div className="w-full bg-muted/40 rounded-2xl p-4 grid grid-cols-2 gap-3 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="text-primary w-4 h-4" />
                <span>ความปลอดภัยระดับสูง</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Database className="text-primary w-4 h-4" />
                <span>สำรองข้อมูลบน Cloud</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-4">
              {/* Google login */}
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-13 rounded-2xl text-md font-bold shadow-lg shadow-primary/10 hover:scale-102 transition-transform flex items-center justify-center gap-3"
              >
                {/* Pixel-Perfect Inline Google SVG G-Logo */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                เข้าสู่ระบบด้วย Google
              </Button>

              {/* Offline Demo mode */}
              <button
                onClick={handleGuestLogin}
                className="w-full h-12 rounded-2xl border border-border bg-background/50 hover:bg-accent text-sm font-semibold text-muted-foreground transition-all hover:scale-102 flex items-center justify-center gap-2 group"
              >
                ทดลองใช้งานแบบ Guest Mode (Offline)
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Bottom Disclaimer */}
            <p className="text-[10px] text-muted-foreground max-w-xs leading-relaxed">
              *การใช้งาน Guest Mode ข้อมูลจะถูกเก็บไว้บนเบราว์เซอร์นี้เท่านั้น หากเคลียร์ประวัติการเข้าชม ข้อมูลจะสูญหายทันที แนะนำให้เข้าสู่ระบบด้วย Google เพื่อความปลอดภัยสูงสุด
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active sync loader indicator
  return (
    <>
      {isSyncing && (
        <div className="fixed bottom-6 right-6 z-50 glass rounded-2xl px-4 py-3 border border-primary/20 flex items-center gap-3 shadow-lg shadow-primary/10 animate-bounce">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-primary">กำลังซิงก์ข้อมูลบัญชีของคุณ...</span>
        </div>
      )}
      {children}
    </>
  );
}
