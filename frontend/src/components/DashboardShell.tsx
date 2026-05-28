"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  TrendingUp, 
  Bot, 
  Settings, 
  Menu, 
  X, 
  Crown, 
  Sparkles, 
  AlertTriangle,
  ArrowRight,
  User
} from "lucide-react";
import UpgradeDialog from "./UpgradeDialog";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState<string>("free");
  const [ocrCount, setOcrCount] = useState<number>(0);
  const [aiCount, setAiCount] = useState<number>(0);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const menuItems = [
    { name: "แดชบอร์ดหลัก", path: "/", icon: LayoutDashboard },
    { name: "จัดการใบเสร็จ", path: "/receipts", icon: Receipt },
    { name: "สร้างใบแทนใบเสร็จ มค.๑", path: "/receipts/substitution", icon: FileText },
    { name: "วิเคราะห์ความเสี่ยงภาษี", path: "/tax-risk-assessment", icon: TrendingUp },
    { name: "ผู้ช่วยภาษี AI", path: "/assistant", icon: Bot },
    { name: "ตั้งค่าระบบ", path: "/settings", icon: Settings },
  ];

  // Fetch real Supabase profile data on mount & update listener
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        
        // Sync real profile data
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
          
        if (data) {
          setPlan(data.plan || "free");
          setOcrCount(data.ocr_count || 0);
          setAiCount(data.ai_count || 0);
        }
      } else {
        // Guest mode fallback metrics
        setUser(null);
        setPlan("free");
        
        // Load counts from local storage if available
        const localOcr = localStorage.getItem("fillax_ocr_count");
        const localAi = localStorage.getItem("fillax_ai_count");
        setOcrCount(localOcr ? parseInt(localOcr) : 0);
        setAiCount(localAi ? parseInt(localAi) : 0);
      }
    };

    fetchProfile();

    // Listen to local changes (e.g. after scanner/chat executes)
    const interval = setInterval(fetchProfile, 3000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex bg-[#FFF7F0] relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-[#B08CFF]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-[#E9DDFF]/10 blur-[150px] pointer-events-none" />

      {/* Desktop Sidebar (Cream-Purple Glassmorphic Shell) */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col justify-between p-6 border-r border-[#B08CFF]/15 glass relative z-20">
        <div className="flex flex-col gap-8">
          {/* Brand Logo & Mascot header */}
          <Link href="/" className="flex items-center gap-3 hover:scale-102 transition-transform duration-300">
            <Image 
              src="/fillax-mascot-v4.png" 
              alt="Fillax Mascot" 
              width={48} 
              height={48} 
              className="w-12 h-12 rounded-2xl object-contain shadow-md"
            />
            <div>
              <span className="text-xl font-black text-[#5A4A68] tracking-tight">
                Fillax <span className="text-[#B08CFF] italic">Pro</span> 💜
              </span>
              <p className="text-[9px] text-[#5A4A68]/50 font-black uppercase tracking-wider mt-0.5">
                Juristic Tax Engine
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`h-11 px-4 rounded-xl text-xs font-black flex items-center gap-3 transition-all duration-300 ${
                    isActive 
                      ? "bg-[#B08CFF] text-white shadow-md shadow-[#B08CFF]/20" 
                      : "text-[#5A4A68]/80 hover:bg-[#E9DDFF]/30 hover:text-[#5A4A68]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#B08CFF]"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Plan Quota Trackers */}
        <div className="flex flex-col gap-5 border-t border-[#B08CFF]/10 pt-5">
          {/* Active Plan Widget */}
          <div className="p-4 rounded-2xl bg-white/40 border border-[#B08CFF]/10 flex flex-col gap-3 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[#5A4A68]/60 font-black uppercase tracking-wider">บัญชีผู้ใช้งาน</span>
              {plan === "pro" ? (
                <span className="bg-[#B08CFF] text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                  <Crown className="w-3 h-3" />
                  PRO MEMBER
                </span>
              ) : (
                <span className="bg-[#5A4A68]/10 text-[#5A4A68] text-[8px] font-black px-2 py-0.5 rounded-full">
                  FREE PLAN
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E9DDFF] flex items-center justify-center text-xs font-black text-[#5A4A68] border border-[#B08CFF]/15">
                <User className="w-4 h-4 text-[#B08CFF]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[#5A4A68] truncate">
                  {user ? user.email.split("@")[0] : "ผู้ประกอบการทั่วไป"}
                </p>
                <p className="text-[9px] text-[#5A4A68]/50 font-semibold truncate">
                  {user ? user.email : "โหมดซิงก์ข้อมูลออฟไลน์"}
                </p>
              </div>
            </div>

            {/* If FREE, show Limit Progress Bars */}
            {plan !== "pro" ? (
              <div className="space-y-2 border-t border-[#B08CFF]/10 pt-2.5">
                {/* OCR Count */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-[#5A4A68]">
                    <span>สแกนสลิปอัจฉริยะ (OCR)</span>
                    <span className="font-mono">{ocrCount}/10</span>
                  </div>
                  <div className="w-full bg-[#B08CFF]/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${ocrCount >= 10 ? 'bg-[#EF4444]' : 'bg-[#B08CFF]'}`} 
                      style={{ width: `${Math.min((ocrCount / 10) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* AI Count */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-[#5A4A68]">
                    <span>คำปรึกษาผู้ช่วยภาษี AI</span>
                    <span className="font-mono">{aiCount}/5</span>
                  </div>
                  <div className="w-full bg-[#B08CFF]/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${aiCount >= 5 ? 'bg-[#EF4444]' : 'bg-[#B08CFF]'}`} 
                      style={{ width: `${Math.min((aiCount / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setIsUpgradeOpen(true)}
                  className="w-full h-9 rounded-xl bg-gradient-to-r from-[#B08CFF] to-[#D4C3FF] text-white text-[10px] font-black shadow-md hover:scale-102 transition-transform flex items-center justify-center gap-1 mt-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ยกระดับบัญชีแบบไร้ขีดจำกัด
                </button>
              </div>
            ) : (
              <div className="border-t border-[#B08CFF]/10 pt-2.5 flex items-center gap-1.5 text-[9px] text-[#10B981] font-bold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>เปิดสิทธิ์สแกนบิลและถาม AI ไร้ลิมิต 🟢</span>
              </div>
            )}
          </div>

          {/* Logout Action */}
          {user && (
            <button 
              onClick={handleLogout}
              className="text-[10px] font-bold text-[#EF4444] hover:underline text-left pl-2.5 flex items-center gap-1 w-fit"
            >
              ออกจากระบบคลาวด์
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Floating Drawer Header & menu */}
      <div className="flex lg:hidden flex-col w-full relative z-20">
        <header className="h-16 px-4 border-b border-[#B08CFF]/15 glass flex justify-between items-center sticky top-0 w-full z-20">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/fillax-mascot-v4.png" 
              alt="Fillax Mascot" 
              width={36} 
              height={36} 
              className="w-9 h-9 rounded-xl object-contain shadow"
            />
            <span className="text-sm font-black text-[#5A4A68]">
              Fillax <span className="text-[#B08CFF] italic">Pro</span>
            </span>
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 rounded-xl border border-[#B08CFF]/15 bg-white text-[#5A4A68] hover:bg-[#E9DDFF]/20"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </header>

        {/* Mobile slide drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-16 bg-[#5A4A68]/30 backdrop-blur-sm z-30 transition-all flex flex-col justify-between p-6 glass max-w-sm w-full animate-float">
            <div className="flex flex-col gap-6">
              <nav className="flex flex-col gap-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`h-11 px-4 rounded-xl text-xs font-black flex items-center gap-3 transition-all ${
                        isActive 
                          ? "bg-[#B08CFF] text-white shadow-md" 
                          : "text-[#5A4A68]/80 hover:bg-[#E9DDFF]/30"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#B08CFF]"}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile User Panel & Quotas */}
            <div className="flex flex-col gap-4 border-t border-[#B08CFF]/10 pt-4">
              <div className="p-4 rounded-xl bg-white/40 border border-[#B08CFF]/10 flex flex-col gap-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-[#5A4A68]/60 font-black">บัญชีผู้ใช้</span>
                  {plan === "pro" ? (
                    <span className="bg-[#B08CFF] text-white text-[7px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                      <Crown className="w-3 h-3" /> PRO
                    </span>
                  ) : (
                    <span className="bg-[#5A4A68]/10 text-[#5A4A68] text-[7px] font-black px-2 py-0.5 rounded-full">FREE</span>
                  )}
                </div>
                
                {plan !== "pro" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-bold text-[#5A4A68]">
                      <span>สแกนบิล OCR ({ocrCount}/10)</span>
                    </div>
                    <div className="w-full bg-[#B08CFF]/10 h-1 rounded-full overflow-hidden">
                      <div className="bg-[#B08CFF] h-full rounded-full" style={{ width: `${(ocrCount / 10) * 100}%` }} />
                    </div>
                    
                    <button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsUpgradeOpen(true);
                      }}
                      className="w-full h-8 rounded-lg bg-[#B08CFF] text-white text-[9px] font-black shadow flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> ยกระดับเป็น PRO
                    </button>
                  </div>
                )}
              </div>

              {user && (
                <button 
                  onClick={handleLogout}
                  className="text-[9px] font-black text-[#EF4444] hover:underline text-left pl-2.5"
                >
                  ออกจากระบบคลาวด์
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Workspace viewport */}
      <main className="flex-1 overflow-y-auto relative z-10 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
        {children}
      </main>

      {/* Central upgrade subscription checkout portal */}
      <UpgradeDialog isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
    </div>
  );
}
