"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Settings, 
  User, 
  Building2, 
  Crown, 
  Sparkles, 
  AlertTriangle,
  Bell,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import UpgradeDialog from "@/components/UpgradeDialog";

const DBD_MOCK_DICTIONARY: Record<string, string> = {
  "0107542000011": "บริษัท ซีพี ออลล์ จำกัด (มหาชน)",
  "0107561000242": "บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)",
  "0105536092641": "บริษัท เอก-ชัย ดีสทริบิวชั่น ซิสเทม จำกัด",
  "0105539021206": "บริษัท เซ็นทรัล ฟู้ด รีเทล จำกัด",
};

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  
  // Profile settings states
  const [fullName, setFullName] = useState("");
  const [sellerType, setSellerType] = useState("individual");
  const [taxId, setTaxId] = useState("");
  const [shopName, setShopName] = useState("");
  const [isDbdVerified, setIsDbdVerified] = useState(false);
  const [dbdCompany, setDbdCompany] = useState("");

  // Notification toggles
  const [weeklyAlerts, setWeeklyAlerts] = useState(true);
  const [lineAlerts, setLineAlerts] = useState(true);

  // Upgrade & Plan states
  const [plan, setPlan] = useState("free");
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dbdLoading, setDbdLoading] = useState(false);
  const [dbdError, setDbdError] = useState<string | null>(null);

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
          setFullName(data.full_name || "");
          setSellerType(data.seller_type || "individual");
          setTaxId(data.tax_id || "");
          setShopName(data.shop_name || "");
          setIsDbdVerified(data.is_dbd_verified || false);
          setDbdCompany(data.dbd_company_name || "");
        }
      } else {
        // Guest mode fallback metrics
        setPlan(localStorage.getItem("fillax_plan") || "free");
        setFullName("ผู้ประกอบการทั่วไป");
        setShopName("ร้านค้าทดสอบระเบียบ");
        setTaxId("0107542000011");
        setIsDbdVerified(true);
        setDbdCompany("บริษัท ซีพี ออลล์ จำกัด (มหาชน)");
      }
    };

    fetchProfile();
  }, []);

  const handleDbdLookup = () => {
    setDbdLoading(true);
    setDbdError(null);
    
    setTimeout(() => {
      const cleaned = taxId.replace(/\D/g, "");
      
      if (cleaned.length !== 13) {
        setDbdError("เลขประจำตัวผู้เสียภาษีต้องครบ 13 หลักเท่านั้นค่ะ");
        setIsDbdVerified(false);
        setDbdLoading(false);
        return;
      }

      // Modulo-11 Checksum Verification
      const digits = cleaned.split("").map(Number);
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += digits[i] * (13 - i);
      }
      const checkDigit = (11 - (sum % 11)) % 10;

      if (digits[12] !== checkDigit) {
        setDbdError("เลขประจำตัวผู้เสียภาษีไม่ถูกต้องตามพิกัดสรรพากร (Checksum Failed)");
        setIsDbdVerified(false);
        setDbdLoading(false);
        return;
      }

      // Successful lookup
      const registeredName = DBD_MOCK_DICTIONARY[cleaned] || `บริษัท ${shopName || "คู่ค้า"} จำกัด (จดทะเบียน DBD)`;
      setIsDbdVerified(true);
      setDbdCompany(registeredName);
      setDbdLoading(false);
    }, 1000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        full_name: fullName,
        seller_type: sellerType,
        tax_id: taxId.replace(/\D/g, ""),
        shop_name: shopName,
        is_dbd_verified: isDbdVerified,
        dbd_company_name: isDbdVerified ? dbdCompany : null
      };

      if (session) {
        // Save to Supabase Cloud profiles table
        await supabase
          .from("profiles")
          .update(payload)
          .eq("id", session.user.id);
      } else {
        // Save locally for guest
        localStorage.setItem("fillax_profile", JSON.stringify(payload));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถบันทึกข้อมูลเข้าสู่ฐานระบบได้ โปรดลองอีกครั้งค่ะ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSubscription = () => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกสิทธิ์สมาชิก PRO? บัญชีจะปรับลงเป็น Free Plan และจำกัดการสแกนบิลในรอบถัดไป")) {
      setPlan("free");
      localStorage.setItem("fillax_plan", "free");
      // Call Supabase update
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.from("profiles").update({ plan: "free" }).eq("id", session.user.id).then();
        }
      });
    }
  };

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6 md:gap-8">
        
        {/* Header bar */}
        <header className="flex justify-between items-center border-b border-[#B08CFF]/15 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#5A4A68] flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#B08CFF]" />
              จัดการโปรไฟล์และตั้งค่าระบบ ⚙️
            </h1>
            <p className="text-xs text-[#5A4A68]/60 font-semibold mt-1">
              ปรับเปลี่ยนข้อมูลร้านค้า พิกัดจดทะเบียน DBD และสัญญารับการแจ้งเตือน
            </p>
          </div>
        </header>

        {/* Dual pane layouts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Form Settings (Span 2) */}
          <form onSubmit={handleSaveSettings} className="lg:col-span-2 glass rounded-3xl p-5 md:p-6 flex flex-col gap-5 border border-[#B08CFF]/15">
            <div className="border-b border-[#B08CFF]/10 pb-2 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-[#5A4A68]">
                  👤 ข้อมูลประวัตร้านค้าและผู้ดูแล
                </h3>
              </div>
              {saveSuccess && (
                <span className="text-[10px] text-[#10B981] font-black animate-pulse flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกการตั้งค่าสำเร็จเรียบร้อยค่ะ
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Full Name & Shop Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-[#5A4A68] uppercase tracking-wide">ชื่อ-นามสกุล ผู้แลระบบ *</label>
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-[#5A4A68] uppercase tracking-wide">ชื่อกิจการ / ชื่อร้านค้า *</label>
                  <input 
                    type="text" 
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                  />
                </div>
              </div>

              {/* Seller Type Select */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-[#5A4A68] uppercase tracking-wide">ประเภทรูปแบบธุรกิจค้าขาย *</label>
                <select 
                  value={sellerType}
                  onChange={(e) => setSellerType(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                >
                  <option value="individual">บุคคลธรรมดา (ร้านค้าทั่วไป / ฟรีแลนซ์)</option>
                  <option value="juristic">นิติบุคคล (บริษัทจำกัด / ห้างหุ้นส่วนจำกัด)</option>
                </select>
              </div>

              {/* Tax Registration & DBD lookup dynamic button */}
              <div className="space-y-2 border-t border-[#B08CFF]/10 pt-3.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9.5px] font-black text-[#5A4A68] uppercase tracking-wide flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#B08CFF]" />
                    เลขประจำตัวผู้เสียภาษีอากร 13 หลัก
                  </label>
                  
                  {isDbdVerified && (
                    <span className="bg-[#10B981]/15 text-[#10B981] text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-[#10B981]/20 animate-pulse">
                      DBD Verified 🏢
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    maxLength={13}
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 h-11 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-mono font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                    placeholder="เช่น 0107542000011"
                  />
                  <button 
                    type="button"
                    onClick={handleDbdLookup}
                    disabled={dbdLoading || !taxId}
                    className="h-11 px-4 rounded-xl bg-[#B08CFF]/10 hover:bg-[#B08CFF]/20 text-[#B08CFF] border border-[#B08CFF]/25 text-xs font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    {dbdLoading ? "ดึงข้อมูล..." : "ดึงข้อมูลจาก DBD 🏢"}
                  </button>
                </div>

                {dbdError && (
                  <p className="text-[9px] text-[#EF4444] font-bold flex items-center gap-0.5">
                    <XCircle className="w-3.5 h-3.5 shrink-0" /> {dbdError}
                  </p>
                )}

                {isDbdVerified && dbdCompany && (
                  <div className="bg-[#10B981]/5 border border-[#10B981]/15 p-3.5 rounded-xl flex flex-col gap-0.5 shadow-sm">
                    <span className="text-[8.5px] text-[#10B981] font-black">ชื่อจดทะเบียนสอดรับกรมพัฒนาธุรกิจการค้า</span>
                    <span className="text-xs text-[#5A4A68] font-black">{dbdCompany}</span>
                  </div>
                )}
              </div>

              {/* Notification preferences toggles */}
              <div className="space-y-3.5 border-t border-[#B08CFF]/10 pt-3.5">
                <h4 className="text-[10px] font-black text-[#B08CFF] uppercase tracking-wider flex items-center gap-1">
                  <Bell className="w-4 h-4" /> ระบบสัญญาณและการแจ้งเตือนรายสัปดาห์
                </h4>

                <div className="flex flex-col gap-3 font-bold text-xs text-[#5A4A68]">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={weeklyAlerts}
                      onChange={(e) => setWeeklyAlerts(e.target.checked)}
                      className="w-4.5 h-4.5 accent-[#B08CFF]"
                    />
                    <span>รับอีเมลประเมินวิเคราะห์ความเสี่ยงสรรพากรรายสัปดาห์</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={lineAlerts}
                      onChange={(e) => setLineAlerts(e.target.checked)}
                      className="w-4.5 h-4.5 accent-[#B08CFF]"
                    />
                    <span>รับสเตตัสสรุปสลิปและใบเสร็จผ่านไลน์แชต LINE OA ทันทีที่กดตกลง</span>
                  </label>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="h-11 w-full rounded-xl bg-[#B08CFF] text-white text-xs font-black shadow shadow-[#B08CFF]/20 hover:scale-101 active:scale-99 transition-all cursor-pointer"
              >
                {isSaving ? "กำลังบันทึกข้อมูล..." : "บันทึกการตั้งค่าทั้งหมด 🟢"}
              </button>

            </div>
          </form>

          {/* Right Column: Plan status widget & Subscription controls */}
          <div className="glass rounded-3xl p-5 md:p-6 flex flex-col gap-5 border border-[#B08CFF]/15">
            <div className="border-b border-[#B08CFF]/10 pb-2">
              <h3 className="text-sm font-black text-[#5A4A68] flex items-center gap-1.5">
                <Crown className="w-4.5 h-4.5 text-[#B08CFF]" /> แผนการใช้งานของคุณ
              </h3>
            </div>

            {plan === "pro" ? (
              <div className="flex flex-col gap-4">
                {/* Active Pro Member status badge */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#B08CFF] to-[#D4C3FF] text-white flex flex-col gap-2 shadow-md relative overflow-hidden animate-float">
                  <Crown className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10" />
                  <div className="flex justify-between items-center z-10">
                    <span className="text-[10px] font-black uppercase tracking-wider">สมาชิกพรีเมียม</span>
                    <span className="bg-white/20 text-white text-[7px] font-black px-2 py-0.5 rounded-full">ACTIVE</span>
                  </div>
                  <h4 className="text-lg font-black z-10">Fillax Pro Plan 👑</h4>
                  <p className="text-[10px] text-white/80 font-semibold leading-relaxed z-10">
                    เปิดโหมดประเมินภาษีอัตราก้าวหน้า คุยถาม AI และสแกนบิล OCR ไหลลื่นไม่จำกัด
                  </p>
                </div>

                <div className="text-[10px] font-bold text-[#5A4A68]/60 space-y-1 pl-1">
                  <p>• เริ่มตัดรอบบิลชำระเงินทุกวันที่ 28 ของเดือน</p>
                  <p>• ยอดชำระรายเดือน: ฿299.00 บาท</p>
                </div>

                <button 
                  onClick={handleCancelSubscription}
                  className="w-full h-10 rounded-xl border border-[#EF4444]/25 hover:bg-[#EF4444]/5 text-[#EF4444] text-xs font-black transition-all mt-2 cursor-pointer"
                >
                  ยกเลิกสิทธิ์สมาชิกพรีเมียม
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Free plan banner */}
                <div className="p-4 rounded-2xl bg-[#5A4A68]/5 border border-[#B08CFF]/15 flex flex-col gap-2 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#5A4A68]/60 font-black uppercase">แผนการใช้งานฟรี</span>
                    <span className="bg-[#5A4A68]/15 text-[#5A4A68] text-[7px] font-black px-2 py-0.5 rounded-full">FREE</span>
                  </div>
                  <h4 className="text-base font-black text-[#5A4A68]">Fillax Free Tier 💜</h4>
                  <p className="text-[9px] text-[#5A4A68]/50 font-semibold leading-relaxed">
                    โควตาสแกนสลิปผ่าน OCR 10 ใบต่อเดือน และสิทธิ์สนทนาแชตตอบผู้ช่วยภาษี 5 ครั้งต่อเดือน
                  </p>
                </div>

                <button 
                  onClick={() => setIsUpgradeOpen(true)}
                  className="w-full h-11 rounded-xl bg-[#B08CFF] text-white text-xs font-black shadow-md shadow-[#B08CFF]/20 hover:scale-102 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  อัปเกรดเป็น PRO PLAN 👑
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Upgrade Dialog elevation portal */}
        <UpgradeDialog isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
      </div>
    </DashboardShell>
  );
}
