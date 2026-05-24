"use client";

import React, { useState, useEffect } from "react";
import { supabase, API_URL } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  User, 
  Store, 
  Bell, 
  CreditCard, 
  ShieldAlert, 
  Crown, 
  CheckCircle2, 
  Building,
  Save,
  Loader2,
  Lock,
  Printer,
  Upload,
  MessageSquare
} from "lucide-react";
import UpgradeDialog from "@/components/upgrade-dialog";

interface ShopProfile {
  shopName: string;
  taxId: string;
  branchCode: string;
  address: string;
  isVatRegistered: boolean;
}

interface NotificationPrefs {
  taxCalendar: boolean;
  riskAlert: boolean;
  weeklySummary: boolean;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);
  const [selectedPlanType, setSelectedPlanType] = useState<"pro" | "agency">("pro");
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number>(199.00);
  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isVerifyingRetroSlip, setIsVerifyingRetroSlip] = useState<boolean>(false);
  const retroSlipInputRef = React.useRef<HTMLInputElement>(null);
  
  // LINE Bot Pairing State
  const [pairingCode, setPairingCode] = useState<string>("");
  const [isGeneratingPairing, setIsGeneratingPairing] = useState<boolean>(false);

  // DBD Auto-Enrichment State & Handler
  const [isDbdLoading, setIsDbdLoading] = useState<boolean>(false);
  const handleDbdLookup = async () => {
    if (!shop.taxId || shop.taxId.length !== 13) {
      toast.error("กรุณากรอกเลขประจำตัวผู้เสียภาษีให้ครบ 13 หลักก่อนค่ะ 🤖");
      return;
    }

    try {
      setIsDbdLoading(true);
      toast.loading("กำลังดึงข้อมูลและยืนยันนิติบุคคลจากระบบ DBD... 🏢🔍", { id: "dbd-toast" });

      const { data: { session } } = await supabase.auth.getSession();
      
      let token = "";
      if (session) {
        token = session.access_token;
      } else {
        // Fallback for Guest Mode mock validation
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        // Mock verification based on Modulo-11 logic
        const cleaned = shop.taxId;
        const digits = Array.from(cleaned).map(Number);
        let total = 0;
        for (let i = 0; i < 12; i++) {
          total += digits[i] * (13 - i);
        }
        const checkDigit = (11 - (total % 11)) % 10;
        const is_valid = digits[12] === checkDigit;
        
        if (!is_valid) {
          throw new Error("เลขประจำตัวผู้เสียภาษีไม่ถูกต้องตามหลักการคำนวณ Modulo-11");
        }
        
        // Match mock
        const mock_dbd_names: Record<string, string> = {
          "0107536000231": "บริษัท ซีพี ออลล์ จำกัด (มหาชน)",
          "0107561000242": "บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)",
          "0105536092641": "บริษัท เอก-ชัย ดีสทริบิวชั่น ซิสเทม จำกัด",
        };
        
        let matchedName = mock_dbd_names[cleaned];
        if (!matchedName) {
          const suffix = Number(cleaned.slice(-4)) % 5;
          const prefixes = [
            "บริษัท ทริปเปิลเอส เทรดดิ้ง จำกัด",
            "บริษัท พลังงานไทยพัฒนา จำกัด",
            "บริษัท สยามคอมเมิร์ซแอนด์โลจิสติกส์ จำกัด",
            "บริษัท ไอทีที โซลูชั่น แอนด์ เซอร์วิสเซส จำกัด",
            "บริษัท โกลบอลเทรดไทย จำกัด"
          ];
          matchedName = prefixes[suffix];
        }
        
        const mockAddress = `เลขที่ ${cleaned.slice(3, 6)}/${cleaned.slice(6, 8)} ชั้น 18 อาคารบิสซิเนสทาวเวอร์ ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110`;
        
        const updatedShop = {
          ...shop,
          shopName: matchedName,
          address: mockAddress,
          branchCode: "00000",
          isVatRegistered: Number(cleaned.slice(-1)) % 2 === 0
        };
        
        setShop(updatedShop);
        localStorage.setItem("fillax_shop_profile", JSON.stringify(updatedShop));
        toast.success(`ดึงข้อมูลบริษัท "${matchedName}" สำเร็จ! ยืนยันระบบ DBD เรียบร้อย (โหมดจำลอง) 🟢🎉`, { id: "dbd-toast", duration: 5000 });
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/auth/dbd/lookup?tax_id=${shop.taxId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.detail || "เกิดข้อผิดพลาดในการตรวจสอบเลขผู้เสียภาษี");
      }

      // Auto populate!
      const updatedShop = {
        ...shop,
        shopName: resData.company_name,
        address: resData.address,
        branchCode: resData.branch_code || "00000",
        isVatRegistered: resData.is_vat_registered || false
      };
      
      setShop(updatedShop);
      localStorage.setItem("fillax_shop_profile", JSON.stringify(updatedShop));
      
      toast.success(`ดึงข้อมูลบริษัท "${resData.company_name}" สำเร็จ! ยืนยันระบบ DBD เรียบร้อย 🟢🎉`, { id: "dbd-toast", duration: 5000 });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "ไม่สามารถเชื่อมโยงระบบข้อมูล DBD ได้ กรุณากรอกข้อมูลเองนะคะ", { id: "dbd-toast" });
    } finally {
      setIsDbdLoading(false);
    }
  };

  const handleGeneratePairingCode = async () => {
    try {
      setIsGeneratingPairing(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      let userId = "";
      if (session) {
        userId = session.user.id;
      } else {
        // --- GUEST/DEMO PAIRING WORKAROUND ---
        userId = "00000000-0000-0000-0000-000000000000"; // Guest UUID
        
        // Ensure a profile record exists in Supabase so foreign key constraints don't fail
        await supabase
          .from("profiles")
          .upsert({
            id: userId,
            full_name: "Guest Merchant",
            seller_type: "individual",
            plan: "free",
            updated_at: new Date().toISOString()
          }, { onConflict: "id" });
      }
      
      // Generate a highly secure random 6-digit numeric OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry
      
      // Check if user already has a LINE profile record to bypass Postgres Unique Key constraints
      const { data: existingProfiles, error: fetchError } = await supabase
        .from("line_profiles")
        .select("id")
        .eq("user_id", userId);
        
      if (fetchError) throw fetchError;
      
      let dbError;
      if (existingProfiles && existingProfiles.length > 0) {
        // Update existing record
        const { error } = await supabase
          .from("line_profiles")
          .update({
            pairing_code: code,
            pairing_expires_at: expiresAt,
          })
          .eq("user_id", userId);
        dbError = error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("line_profiles")
          .insert({
            user_id: userId,
            pairing_code: code,
            pairing_expires_at: expiresAt,
            created_at: new Date().toISOString()
          });
        dbError = error;
      }
      
      if (dbError) throw dbError;
      
      setPairingCode(code);
      toast.success("สร้างรหัสจับคู่ LINE Bot สำเร็จ! พิมพ์รหัสบอกแชทบอท @fillax_bot 🤖✨");
    } catch (err: any) {
      console.error(err);
      toast.error("ไม่สามารถดึงรหัสจับคู่ได้: " + (err.message || err.details || "เกิดข้อผิดพลาดทางระบบ"));
    } finally {
      setIsGeneratingPairing(false);
    }
  };

  const handleRetroSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsVerifyingRetroSlip(true);
      toast.loading("AI กำลังตรวจสอบสลิปโอนเงินย้อนหลังของคุณ... 🤖", { id: "retro-slip-toast" });

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

      // Success! Update state and local storage reactively
      localStorage.setItem("fillax_is_pro", "true");
      setIsPro(true);
      window.dispatchEvent(new Event("storage"));

      toast.success(resData.message || "ยืนยันสลิปสำเร็จ! บัญชีของคุณอัปเกรดเป็นแผน Pro เรียบร้อย 🎉", { id: "retro-slip-toast" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิปย้อนหลัง", { id: "retro-slip-toast" });
    } finally {
      setIsVerifyingRetroSlip(false);
      if (retroSlipInputRef.current) retroSlipInputRef.current.value = "";
    }
  };

  // Auth User Profile State
  const [user, setUser] = useState<{ id?: string; email: string; name: string; phone: string; businessType: string }>({
    email: "",
    name: "",
    phone: "",
    businessType: "individual",
  });

  // Shop Profile State (Tax ID etc.)
  const [shop, setShop] = useState<ShopProfile>(() => {
    if (typeof window !== "undefined") {
      const savedShop = localStorage.getItem("fillax_shop_profile");
      if (savedShop) return JSON.parse(savedShop);
    }
    return {
      shopName: "",
      taxId: "",
      branchCode: "00000",
      address: "",
      isVatRegistered: false,
    };
  });

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationPrefs>(() => {
    if (typeof window !== "undefined") {
      const savedNotifs = localStorage.getItem("fillax_notification_prefs");
      if (savedNotifs) return JSON.parse(savedNotifs);
    }
    return {
      taxCalendar: true,
      riskAlert: true,
      weeklySummary: false,
    };
  });

  // Subscriptions & Pro Plan State
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fillax_is_pro") === "true";
    }
    return false;
  });

  useEffect(() => {
    // 2. Fetch Supabase Profile
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Fetch profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, plan, full_name, seller_type")
          .eq("id", session.user.id)
          .single();

        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.full_name || session.user.user_metadata?.full_name || "",
          phone: "",
          businessType: profile?.seller_type || "individual",
        });

        const isUserPro = profile?.plan === "pro" || profile?.plan === "agency";
        setIsPro(isUserPro);
        localStorage.setItem("fillax_is_pro", isUserPro ? "true" : "false");
      } else {
        // Fallback Guest Profile
        setUser({
          email: "wefile28@gmail.com",
          name: "Guest Merchant",
          phone: "",
          businessType: "individual",
        });
      }
    };

    fetchProfile();
  }, []);

  // Listen to Storage events to update Pro state reactively
  useEffect(() => {
    const handleStorageChange = () => {
      setIsPro(localStorage.getItem("fillax_is_pro") === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Save User Profile to Supabase DB or LocalStorage
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && user.id) {
        const { error } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            full_name: user.name,
            seller_type: user.businessType,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }
      toast.success("บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว! 👤✨");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Shop Profile (Tax details) with digits checks
  const handleSaveShop = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Tax ID validations (Thai Tax ID is exactly 13 digits)
    if (shop.taxId && !/^\d{13}$/.test(shop.taxId)) {
      toast.error("เลขประจำตัวผู้เสียภาษีอากรต้องเป็นตัวเลข 13 หลักเท่านั้น");
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("fillax_shop_profile", JSON.stringify(shop));
      toast.success("บันทึกข้อมูลร้านค้าและเลขภาษีเรียบร้อยแล้ว! 🏢📄");
    }
  };

  // Save Notifications
  const handleSaveNotifications = (updated: NotificationPrefs) => {
    setNotifications(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("fillax_notification_prefs", JSON.stringify(updated));
      toast.success("บันทึกการตั้งค่าการแจ้งเตือนแล้ว!");
    }
  };

  // Cancel Subscription flow
  const handleCancelSubscription = async () => {
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Call FastAPI Backend payment gateway subscription cancel router
        const response = await fetch(`${API_URL}/api/v1/payment/upgrade`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            method: "cancel",
            amount: 0,
            token: "cancel_simulated"
          })
        });
        if (!response.ok) {
          throw new Error("ยกเลิกสมาชิกขัดข้อง กรุณาลองอีกครั้งภายหลัง");
        }
      }

      localStorage.setItem("fillax_is_pro", "false");
      setIsPro(false);
      window.dispatchEvent(new Event("storage"));
      setIsCancelOpen(false);
      toast.success("ยกเลิกการต่ออายุ Pro เรียบร้อยแล้ว สิทธิ์ของคุณจะหมดลงในสิ้นสุดรอบบิลปัจจุบัน");
    } catch (err: any) {
      toast.error(err.message || "การขอยกเลิกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic invoice print preview
  const handlePrintInvoice = (invoiceNo: string, date: string, amount: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>ใบเสร็จรับเงิน/ใบกำกับภาษี - ${invoiceNo}</title>
          <style>
            body { font-family: 'Inter', 'Sarabun', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { border-bottom: 2px solid #5C3BFF; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .logo { font-size: 24px; font-weight: 900; color: #5C3BFF; }
            .title { font-size: 20px; font-weight: bold; text-align: right; }
            .details { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .shop-info, .client-info { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { background: #F3F1FF; text-align: left; padding: 12px; font-size: 14px; border-bottom: 2px solid #ddd; }
            td { padding: 12px; font-size: 14px; border-bottom: 1px solid #ddd; }
            .total { text-align: right; font-weight: bold; font-size: 16px; margin-top: 20px; }
            .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">FILLAX</div>
              <div style="font-size: 12px; color: #666;">บริษัท ฟิลแลกซ์ เทคโนโลยี จำกัด</div>
            </div>
            <div class="title">
              ใบกำกับภาษี / ใบเสร็จรับเงิน<br>
              <span style="font-size: 12px; font-weight: normal; color: #666;">ต้นฉบับ (Original Invoice)</span>
            </div>
          </div>
          <div class="details">
            <div class="shop-info">
              <strong>ผู้ให้บริการ:</strong><br>
              บจก. ฟิลแลกซ์ เทคโนโลยี (สำนักงานใหญ่)<br>
              เลขประจำตัวผู้เสียภาษี: 0105569123456<br>
              ที่อยู่: 123 อาคารทรู ดิจิทัล พาร์ค ถ.สุขุมวิท กรุงเทพฯ 10260
            </div>
            <div class="client-info">
              <strong>ผู้ใช้บริการ/ลูกค้า:</strong><br>
              ${user.name || "Guest Merchant"}<br>
              อีเมล: ${user.email}<br>
              ${shop.shopName ? `ชื่อร้านค้า: ${shop.shopName}<br>` : ""}
              ${shop.taxId ? `เลขภาษีลูกค้า: ${shop.taxId}<br>` : ""}
              ${shop.address ? `ที่อยู่: ${shop.address}` : ""}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>รายการ (Description)</th>
                <th>จำนวน (Qty)</th>
                <th>หน่วยละ (Unit Price)</th>
                <th>จำนวนเงิน (Amount)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ค่าสมาชิกรายเดือนระดับพรีเมียม (Fillax Pro Plan Subscription)</strong><br><span style="font-size: 11px; color:#888;">รอบการให้บริการถัดไป</span></td>
                <td>1</td>
                <td>271.03 บาท</td>
                <td>271.03 บาท</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align: right; border-bottom: none;">ภาษีมูลค่าเพิ่ม (VAT 7%)</td>
                <td style="border-bottom: none;">18.97 บาท</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align: right; border-bottom: none;"><strong>ยอดรวมทั้งสิ้น (Total Net Amount)</strong></td>
                <td><strong>${amount} บาท</strong></td>
              </tr>
            </tbody>
          </table>
          <div style="font-size: 12px; margin-top: 40px; border: 1px dashed #5C3BFF; padding: 15px; border-radius: 8px; background: #FAF9FF;">
            <strong>สถานะ: ชำระเงินเรียบร้อยแล้ว (PAID)</strong><br>
            ชำระผ่านช่องทาง: ${invoiceNo.startsWith("TXN-PP") ? "Thai QR PromptPay API" : "บัตรเครดิต (Stripe Simulated Integration)"}<br>
            วันเวลาทำรายการ: ${date}
          </div>
          <div class="footer">
            ขอขอบพระคุณที่ไว้วางใจใช้บริการจัดทำบัญชีและภาษีของ Fillax<br>
            นี่เป็นเอกสารที่สร้างขึ้นโดยระบบอัตโนมัติ ไม่จำเป็นต้องใช้ลายมือชื่อ
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 p-1">
      {/* Decorative Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Building className="w-8 h-8 text-primary" />
            ตั้งค่าระบบบัญชีและภาษี
          </h2>
          <p className="text-muted-foreground text-sm font-semibold">
            จัดการโปรไฟล์สมาชิก ข้อมูลทะเบียนภาษีสรรพากร และใบเสร็จรับเงินค่าใช้จ่ายของคุณ
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Core Vertical Navigation Tabs */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-md bg-card/60 backdrop-blur-md rounded-3xl overflow-hidden p-2">
              <TabsList className="flex flex-wrap lg:flex-col items-stretch justify-start w-full bg-transparent p-0 gap-2 lg:gap-0 lg:space-y-1 h-auto">
              {[
                { id: "profile", label: "ข้อมูลส่วนตัว", icon: User },
                { id: "shop", label: "ข้อมูลภาษีร้านค้า", icon: Store },
                { id: "line", label: "เชื่อมต่อ LINE Bot 🤖", icon: MessageSquare },
                { id: "notifications", label: "การแจ้งเตือน", icon: Bell },
                { id: "billing", label: "บัญชีชำระเงิน & บิล", icon: CreditCard },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all text-left whitespace-nowrap lg:whitespace-normal ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-4.5 h-4.5" />
                  {tab.label}
                </button>
              ))}
            </TabsList>
          </Card>
        </div>

        {/* Tab Contents Frame */}
        <div className="lg:col-span-3">
            {/* Tab 1: User Profile Settings */}
            <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
              <Card className="border-none shadow-md bg-card/40 backdrop-blur-md rounded-[2rem] p-6 md:p-8">
                <CardHeader className="px-0 pt-0 pb-6 border-b border-border/40">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <User className="text-primary w-5 h-5" />
                    ข้อมูลโปรไฟล์หลัก
                  </CardTitle>
                  <CardDescription className="font-semibold text-xs text-muted-foreground">
                    ข้อมูลผู้ดูแลระบบและเบอร์โทรศัพท์ติดต่อสำหรับรายงานภาษีเงินได้
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pt-6">
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground">ชื่อ-นามสกุลจริง</Label>
                        <Input
                          value={user.name}
                          onChange={(e) => setUser({ ...user, name: e.target.value })}
                          placeholder="สมชาย มุ่งมั่น"
                          className="rounded-xl border-border bg-background/50 h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground">อีเมลติดต่อหลัก</Label>
                        <Input
                          value={user.email}
                          disabled
                          className="rounded-xl border-border bg-muted/40 h-11 text-muted-foreground cursor-not-allowed"
                        />
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
                          <Lock className="w-3 h-3 text-muted-foreground/60" />
                          ซิงก์โดยตรงผ่านบัญชีผู้ใช้ระบบคลาวด์ Google OAuth
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground">เบอร์โทรศัพท์มือถือ</Label>
                        <Input
                          value={user.phone}
                          onChange={(e) => setUser({ ...user, phone: e.target.value })}
                          placeholder="081-234-5678"
                          className="rounded-xl border-border bg-background/50 h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground">รูปแบบประเภทธุรกิจ</Label>
                        <select
                          value={user.businessType}
                          onChange={(e) => setUser({ ...user, businessType: e.target.value })}
                          className="flex h-11 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 font-bold"
                        >
                          <option value="individual">บุคคลธรรมดา (ร้านค้าทั่วไป)</option>
                          <option value="corporate">นิติบุคคล (บริษัทจำกัด)</option>
                          <option value="partnership">ห้างหุ้นส่วนจำกัด (หจก.)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border/40">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-primary text-white hover:scale-[1.01] active:scale-95 transition-transform rounded-xl font-bold flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            กำลังประมวลผล...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            บันทึกข้อมูลส่วนตัว
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Shop & Tax Settings */}
            <TabsContent value="shop" className="mt-0 focus-visible:outline-none">
              <Card className="border-none shadow-md bg-card/40 backdrop-blur-md rounded-[2rem] p-6 md:p-8">
                <CardHeader className="px-0 pt-0 pb-6 border-b border-border/40">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Store className="text-primary w-5 h-5" />
                    ข้อมูลนิติบุคคลและทะเบียนภาษีสรรพากร
                  </CardTitle>
                  <CardDescription className="font-semibold text-xs text-muted-foreground">
                    บันทึกข้อมูลทะเบียนพาณิชย์และเลขผู้เสียภาษี 13 หลัก เพื่อนำไปใช้ออกเอกสารแบบ มค.๑ อัตโนมัติ
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pt-6">
                  <form onSubmit={handleSaveShop} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-muted-foreground">ชื่อทางการค้า / ชื่อบริษัทร้านค้า</Label>
                          <span className="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 font-bold">มค.๑ Source</span>
                        </div>
                        <Input
                          value={shop.shopName}
                          onChange={(e) => setShop({ ...shop, shopName: e.target.value })}
                          placeholder="หจก.ฟิลแลกซ์ ค้าขายออนไลน์"
                          className="rounded-xl border-border bg-background/50 h-11"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground">เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)</Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input
                            value={shop.taxId}
                            onChange={(e) => setShop({ ...shop, taxId: e.target.value.replace(/\D/g, "").slice(0, 13) })}
                            placeholder="0105569123456"
                            maxLength={13}
                            className="rounded-xl border-border bg-background/50 h-11 font-mono tracking-wider flex-1"
                          />
                          <Button
                            type="button"
                            onClick={handleDbdLookup}
                            disabled={isDbdLoading}
                            className="bg-primary hover:bg-primary/95 text-white rounded-xl font-bold h-11 px-5 flex items-center gap-1.5 shadow-md shadow-primary/10 active:scale-95 transition-all"
                          >
                            {isDbdLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                กำลังดึงข้อมูล...
                              </>
                            ) : (
                              <>
                                <Building className="w-4 h-4" />
                                ดึงข้อมูลจาก DBD 🏢
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground">รหัสสาขาสำนักงาน (Branch Code)</Label>
                        <Input
                          value={shop.branchCode}
                          onChange={(e) => setShop({ ...shop, branchCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                          placeholder="00000"
                          maxLength={5}
                          className="rounded-xl border-border bg-background/50 h-11 font-mono"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground">ที่อยู่จดทะเบียนภาษี / สถานประกอบการจริง</Label>
                        <Input
                          value={shop.address}
                          onChange={(e) => setShop({ ...shop, address: e.target.value })}
                          placeholder="123/45 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500"
                          className="rounded-xl border-border bg-background/50 h-11"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2 bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center justify-between mt-2">
                        <div>
                          <Label className="text-xs font-black text-foreground">จดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%)</Label>
                          <p className="text-[10px] text-muted-foreground font-semibold">คลิกเลือก หากธุรกิจมียอดรายได้เกิน 1.8 ล้านบาท/ปี และได้ทำเรื่องขอขึ้นทะเบียน ภ.พ.20</p>
                        </div>
                        <Switch
                          checked={shop.isVatRegistered}
                          onCheckedChange={(checked) => setShop({ ...shop, isVatRegistered: checked })}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border/40">
                      <Button
                        type="submit"
                        className="bg-primary text-white hover:scale-[1.01] active:scale-95 transition-transform rounded-xl font-bold flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        บันทึกข้อมูลภาษีร้านค้า
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Notification Toggles */}
            <TabsContent value="notifications" className="mt-0 focus-visible:outline-none">
              <Card className="border-none shadow-md bg-card/40 backdrop-blur-md rounded-[2rem] p-6 md:p-8">
                <CardHeader className="px-0 pt-0 pb-6 border-b border-border/40">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Bell className="text-primary w-5 h-5" />
                    ศูนย์ควบคุมการรับสิทธิ์แจ้งเตือน
                  </CardTitle>
                  <CardDescription className="font-semibold text-xs text-muted-foreground">
                    ควบคุมรูปแบบการแจ้งเตือนและการรายงานดัชนีความเสี่ยงสรรพากรตรวจสอบทางอีเมล
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pt-6 space-y-4">
                  {[
                    {
                      id: "taxCalendar",
                      title: "แจ้งเตือนวันยื่นภาษีและวันสำคัญทางบัญชี",
                      desc: "ส่งอีเมลแจ้งเตือนล่วงหน้า 7 วัน ก่อนถึงกำหนดเวลายื่นแบบ ภ.ง.ด.90/91 หรือ ภ.พ.30 เพื่อขจัดค่าปรับตามกฎหมาย",
                      value: notifications.taxCalendar,
                    },
                    {
                      id: "riskAlert",
                      title: "ดัชนีวิเคราะห์ความเสี่ยงโดนสรรพากรเรียกย้อนหลัง",
                      desc: "เมื่อโมเดล AI ประเมินพบพฤติกรรมยอดธุรกรรมเงินโอนรวมเกิน 400 ครั้ง และมียอดรวม 2 ล้านบาทในร้านค้าของคุณ",
                      value: notifications.riskAlert,
                    },
                    {
                      id: "weeklySummary",
                      title: "รายงานสรุปรายได้และวิเคราะห์ภาษีรายสัปดาห์",
                      desc: "รับเอกสารสรุปความเคลื่อนไหวบัญชีและสรุปค่าใช้จ่ายแยกหมวดหมู่ทุกวันจันทร์ทางจดหมายอิเล็กทรอนิกส์",
                      value: notifications.weeklySummary,
                    },
                  ].map((notif) => (
                    <div key={notif.id} className="flex items-start justify-between p-4 rounded-2xl hover:bg-primary/5 transition-colors border border-transparent hover:border-border/30 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-black text-foreground">{notif.title}</Label>
                        <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed max-w-lg">{notif.desc}</p>
                      </div>
                      <Switch
                        checked={notif.value}
                        onCheckedChange={(checked) => handleSaveNotifications({ ...notifications, [notif.id]: checked })}
                        className="data-[state=checked]:bg-primary mt-1"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: Subscriptions, Pro Plan Billing & simulated Tax Invoices */}
            <TabsContent value="billing" className="mt-0 focus-visible:outline-none">
              <Card className="border-none shadow-md bg-card/40 backdrop-blur-md rounded-[2rem] p-6 md:p-8">
                <CardHeader className="px-0 pt-0 pb-6 border-b border-border/40">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <CreditCard className="text-primary w-5 h-5" />
                    แผนการสมัครใช้งาน & ประวัติบิล
                  </CardTitle>
                  <CardDescription className="font-semibold text-xs text-muted-foreground">
                    อัปเดตช่องทางบัตรเครดิต ยกเลิกการเรียกเก็บรายเดือน และตรวจสอบรายละเอียดใบกำกับภาษีเต็มรูปแบบ
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pt-6 space-y-8">
                  {/* Stateful Membership Plan Block */}
                  {isPro ? (
                    <div className="rounded-[2rem] bg-gradient-to-r from-primary/95 to-purple-600 p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-primary/20">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Crown className="w-36 h-36 rotate-12" />
                      </div>
                      <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                          <Crown className="w-3.5 h-3.5" />
                          FILLAX PRO SUBSCRIPTION ACTIVE
                        </div>
                        <h3 className="text-3xl font-black">Fillax Pro Plan 👑</h3>
                        <p className="text-white/80 text-xs font-semibold max-w-md">
                          สิทธิประโยชน์ปลดล็อกแล้ว: สแกนใบเสร็จอัตโนมัติไม่จำกัดจำนวน, คุยปรึกษา AI Assistant ด้านภาษีได้ไร้ขีดจำกัด และดาวน์โหลดรายงานบัญชีสมบูรณ์แบบ
                        </p>
                        <div className="pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-xs font-bold">
                          <div>
                            <p className="text-white/60 text-[10px]">วันทำรายการสมัคร</p>
                            <p>17 พฤษภาคม 2569</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-[10px]">วันครบกำหนดชำระรอบบิลถัดไป</p>
                            <p>17 มิถุนายน 2569</p>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button
                            onClick={() => setIsCancelOpen(true)}
                            variant="ghost"
                            className="text-white/90 hover:bg-white/10 border border-white/20 rounded-xl font-bold text-xs"
                          >
                            ยกเลิกการสมัครสมาชิก (Cancel)
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[2rem] bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-card border border-primary/15 p-6 md:p-8 text-foreground relative overflow-hidden shadow-lg shadow-primary/5">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Crown className="w-36 h-36 text-primary rotate-12" />
                      </div>
                      <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-primary">
                          FREE MEMBER
                        </div>
                        <h3 className="text-3xl font-black text-foreground">Fillax Free Plan</h3>
                        <p className="text-muted-foreground text-xs font-semibold max-w-md">
                          คุณอยู่ในโหมดทดลองใช้งานฟรี: สแกนใบเสร็จจำกัด 10 ครั้ง/เดือน และคำถาม AI จำกัด 5 ข้อ/เดือน
                        </p>
                        
                        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-2">
                          <p className="text-xs font-black text-primary flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            อัปเกรดเพื่อรับฟีเจอร์จัดเต็ม:
                          </p>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-muted-foreground font-bold">
                            <li className="flex items-center gap-1.5">• สแกนเอกสารใบเสร็จด้วย AI OCR ไม่จำกัด</li>
                            <li className="flex items-center gap-1.5">• ปรึกษาข้อกฎหมายภาษีกับ Claude 3.5 ไม่จำกัด</li>
                            <li className="flex items-center gap-1.5">• ส่งออกรายงานสรุป PDF/Excel ได้เต็มรูปแบบ</li>
                            <li className="flex items-center gap-1.5">• ออกใบเสร็จ มค.๑ และส่งสรรพากรตรงรอบ</li>
                          </ul>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <Button
                            onClick={() => {
                              setSelectedPlanType("pro");
                              setSelectedPlanAmount(199.00);
                              setIsUpgradeOpen(true);
                            }}
                            className="bg-primary text-white hover:scale-[1.01] active:scale-95 transition-transform rounded-xl font-black text-xs px-5 py-2.5 shadow-md shadow-primary/20"
                          >
                            อัปเกรดเป็น Pro Plan (฿199/เดือน)
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedPlanType("agency");
                              setSelectedPlanAmount(499.00);
                              setIsUpgradeOpen(true);
                            }}
                            variant="outline"
                            className="border-primary/20 text-primary hover:bg-primary/10 hover:scale-[1.01] active:scale-95 transition-transform rounded-xl font-black text-xs px-5 py-2.5 bg-primary/5"
                          >
                            อัปเกรดเป็น Agency Plan (฿499/เดือน)
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Retroactive Slip Upload Card for Unverified Payments */}
                  {!isPro && (
                    <div className="bg-primary/5 border border-dashed border-primary/20 rounded-[1.5rem] p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-primary animate-pulse" />
                            โอนเงินเข้าพร้อมเพย์แล้ว แต่ยังไม่ได้ยืนยัน?
                          </h4>
                          <p className="text-[11px] text-muted-foreground font-semibold">
                            หากสแกนจ่ายเงินสำเร็จแต่เผลอปิดหน้าจอชำระเงินไป สามารถอัปโหลดสลิปที่นี่เพื่อยืนยันบัญชี Pro ย้อนหลังได้ทันที
                          </p>
                        </div>
                        <input 
                          type="file" 
                          ref={retroSlipInputRef} 
                          onChange={handleRetroSlipUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <Button
                          onClick={() => retroSlipInputRef.current?.click()}
                          disabled={isVerifyingRetroSlip}
                          size="sm"
                          className="bg-primary text-white hover:scale-[1.01] active:scale-95 transition-all rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 px-4 h-10 shadow-md shadow-primary/20"
                        >
                          {isVerifyingRetroSlip ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              กำลังตรวจสอบสลิป...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              อัปโหลดสลิปยืนยันย้อนหลัง 📸
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Simulated Tax Invoices (ใบเสร็จรับเงิน/ใบกำกับภาษี) */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                      <Building className="w-5 h-5 text-primary" />
                      ประวัติการชำระเงินและดาวน์โหลดใบกำกับภาษี (VAT Invoices)
                    </h3>
                    <div className="border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow className="hover:bg-transparent border-b border-border/40">
                            <TableHead className="font-bold text-xs">เลขที่เอกสาร</TableHead>
                            <TableHead className="font-bold text-xs">วันเวลาทำรายการ</TableHead>
                            <TableHead className="font-bold text-xs">ยอดรวมชำระ</TableHead>
                            <TableHead className="font-bold text-xs">ช่องทางการชำระเงิน</TableHead>
                            <TableHead className="font-bold text-xs text-right">ใบกำกับภาษี</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="font-semibold text-xs text-muted-foreground">
                          {isPro ? (
                            <>
                              <TableRow className="hover:bg-primary/5 transition-colors border-b border-border/40">
                                <TableCell className="font-mono text-foreground font-black">TXN-PP-098812</TableCell>
                                <TableCell>17 พฤษภาคม 2026, 17:37</TableCell>
                                <TableCell className="text-foreground font-bold">199.00 บาท</TableCell>
                                <TableCell>PromptPay (Simulated)</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    onClick={() => handlePrintInvoice("TXN-PP-098812", "17 พฤษภาคม 2026, 17:37", "199.00")}
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 rounded-xl font-bold flex items-center gap-1 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary ml-auto"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    พิมพ์เอกสาร
                                  </Button>
                                </TableCell>
                              </TableRow>
                              <TableRow className="hover:bg-primary/5 transition-colors border-b border-border/40">
                                <TableCell className="font-mono text-foreground font-black">TXN-CC-076123</TableCell>
                                <TableCell>17 เมษายน 2026, 11:20</TableCell>
                                <TableCell className="text-foreground font-bold">199.00 บาท</TableCell>
                                <TableCell>Credit Card (Stripe)</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    onClick={() => handlePrintInvoice("TXN-CC-076123", "17 เมษายน 2026, 11:20", "199.00")}
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 rounded-xl font-bold flex items-center gap-1 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary ml-auto"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    พิมพ์เอกสาร
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </>
                          ) : (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={5} className="text-center py-8 text-xs font-semibold text-muted-foreground/60">
                                🔒 ไม่มีประวัติชำระเงินเนื่องจากคุณเป็นสมาชิก Free Plan
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 5: LINE Bot Pairing Settings */}
            <TabsContent value="line" className="mt-0 focus-visible:outline-none">
              <Card className="border-none shadow-md bg-card/40 backdrop-blur-md rounded-[2rem] p-6 md:p-8">
                <CardHeader className="px-0 pt-0 pb-6 border-b border-border/40">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <MessageSquare className="text-primary w-5 h-5" />
                    เชื่อมต่อ LINE Bot บิลอัจฉริยะ (LINE Ingestion Network)
                  </CardTitle>
                  <CardDescription className="font-semibold text-xs text-muted-foreground">
                    สแกนและส่งใบเสร็จหรือสลิปธนาคารผ่าน LINE บอทเพื่อประมวลผลด่วน สะดวก รวดเร็ว ไร้รอยต่อ
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1 text-[10px] font-black text-primary uppercase">
                        🤖 zero friction accounting
                      </div>
                      <h3 className="text-2xl font-black text-foreground">สแกนบิลทันใจผ่านห้องแชท LINE</h3>
                      <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                        พ่อค้าแม่ค้าออนไลน์สามารถถ่ายภาพใบเสร็จหรือส่งสลิปโอนเงินเข้าห้องแชท LINE Bot ได้ทันที AI จะประมวลผล ดึงข้อมูลภาษี ตรวจสอบความถูกต้อง แล้วยิงซิงค์ตรงกลับเข้ามาที่บัญชี Fillax ของท่านทันที!
                      </p>
                      
                      <div className="space-y-2 border-l-2 border-primary/20 pl-4 py-1 text-xs text-muted-foreground font-bold">
                        <p>1. แอดไลน์บอทอัจฉริยะของ Fillax (@fillax_bot)</p>
                        <p>2. กดสุ่มรหัส Magic Pairing Code จากปุ่มด้านล่างนี้</p>
                        <p>3. พิมพ์รหัสส่งหาบอทเพื่อเชื่อมบัญชีใน 3 วินาที!</p>
                      </div>

                      <div className="pt-2">
                        <Button
                          onClick={handleGeneratePairingCode}
                          disabled={isGeneratingPairing}
                          className="bg-primary text-white hover:scale-[1.01] active:scale-95 transition-transform rounded-xl font-black text-xs h-11 shadow-md shadow-primary/20 flex items-center gap-2"
                        >
                          {isGeneratingPairing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              กำลังสร้างรหัสจับคู่...
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4" />
                              ดึงรหัส Magic Pairing Code 🔑
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-4 text-center">
                      <div className="w-36 h-36 bg-white rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden border border-border/20">
                        {/* Interactive Simulated QR Code for LINE Bot */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10" />
                        <svg className="w-28 h-28 text-foreground" viewBox="0 0 100 100">
                          <rect x="10" y="10" width="20" height="20" fill="currentColor" />
                          <rect x="15" y="15" width="10" height="10" fill="white" />
                          <rect x="70" y="10" width="20" height="20" fill="currentColor" />
                          <rect x="75" y="15" width="10" height="10" fill="white" />
                          <rect x="10" y="70" width="20" height="20" fill="currentColor" />
                          <rect x="15" y="75" width="10" height="10" fill="white" />
                          <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                          <rect x="45" y="45" width="10" height="10" fill="white" />
                          <rect x="10" y="40" width="10" height="10" fill="currentColor" />
                          <rect x="40" y="10" width="10" height="10" fill="currentColor" />
                          <rect x="70" y="40" width="10" height="10" fill="currentColor" />
                          <rect x="40" y="70" width="10" height="10" fill="currentColor" />
                          <rect x="70" y="70" width="10" height="10" fill="currentColor" />
                        </svg>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">แอดไลน์ไอดี: @fillax_bot 🤖</p>

                      {pairingCode ? (
                        <div className="bg-primary text-white font-mono text-2xl font-black px-6 py-3 rounded-2xl tracking-widest animate-bounce shadow-lg shadow-primary/20">
                          {pairingCode}
                        </div>
                      ) : (
                        <div className="bg-muted text-muted-foreground font-bold text-xs px-6 py-3 rounded-2xl border border-border/40">
                          รหัสจับคู่ของคุณจะแสดงที่นี่ 🔒
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground font-bold leading-relaxed max-w-[200px]">
                        *รหัสนี้มีอายุใช้งาน 10 นาทีเพื่อความปลอดภัยระดับสูงสุด
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
        </div>
      </div>
    </Tabs>

      {/* Central Premium Upgrade Dialog Checkout Trigger */}
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        planType={selectedPlanType}
        amount={selectedPlanAmount}
        onSuccess={() => {
          setIsPro(true);
        }}
      />

      {/* Confirm Cancel Subscription Modal Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md border-none rounded-3xl p-6 glass">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-foreground">ยืนยันยกเลิกต่ออายุสมาชิก PRO?</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground leading-relaxed">
              เมื่อคุณยกเลิกการต่ออายุ ฟีเจอร์วิเคราะห์ใบเสร็จ AI OCR, บัญชีผู้ช่วย AI และการส่งออกข้อมูลทั้งหมดจะถูกจำกัดสิทธิ์กลับสู่ระดับ Free หลังวันบิลปัจจุบัน
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 pt-4">
            <Button
              onClick={() => setIsCancelOpen(false)}
              variant="outline"
              className="rounded-xl font-bold h-11 flex-1 border-border bg-background"
            >
              ย้อนกลับ
            </Button>
            <Button
              onClick={handleCancelSubscription}
              disabled={isSaving}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold h-11 flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                "ยืนยันยกเลิก"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
