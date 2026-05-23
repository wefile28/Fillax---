"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1.5 seconds delayed entrance for premium user experience feel
    const timer = setTimeout(() => {
      const consent = localStorage.getItem("fillax_cookie_consent");
      if (!consent) {
        setIsVisible(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("fillax_cookie_consent", "accepted_all");
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem("fillax_cookie_consent", "accepted_essential");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="glass p-6 rounded-[2rem] border border-primary/20 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-background/80">
        {/* Glow Accent */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Cookie className="text-primary w-5 h-5 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-black text-sm tracking-tight text-foreground flex items-center justify-between">
              นโยบายการใช้คุกกี้ (PDPA Cookie Consent)
              <button 
                onClick={handleAcceptEssential} 
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
              Fillax ใช้คุกกี้เพื่อเพิ่มประสิทธิภาพในการคำนวณภาษี บันทึกประวัติใบเสร็จ และมอบประสบการณ์ใช้งานที่ปลอดภัยตามกฎหมาย PDPA ของไทย คุณสามารถอ่านรายละเอียดเพิ่มเติมได้ที่{" "}
              <Link href="/privacy" className="text-primary hover:underline font-bold">
                นโยบายความเป็นส่วนตัว
              </Link>
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button 
            variant="outline" 
            onClick={handleAcceptEssential}
            className="flex-1 rounded-xl text-xs font-bold py-2 border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300"
          >
            เฉพาะที่จำเป็น
          </Button>
          <Button 
            onClick={handleAcceptAll}
            className="flex-1 rounded-xl text-xs font-black py-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02]"
          >
            ยอมรับทั้งหมด
          </Button>
        </div>
      </div>
    </div>
  );
}
