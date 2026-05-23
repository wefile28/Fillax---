"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTransactions,
  getExportHistory,
  recordExport,
  getReceipts,
} from "@/lib/store";
import { useState, useEffect, useMemo } from "react";
import { Download, FileText, Sheet } from "lucide-react";
import { toast } from "sonner";
import type { ExportRecord } from "@/lib/types";
import UpgradeDialog from "@/components/upgrade-dialog";
import { supabase } from "@/lib/supabase";

interface ShopProfile {
  shopName: string;
  taxId: string;
  branchCode: string;
  address: string;
  isVatRegistered: boolean;
}

export default function Export() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [transactions, setTransactions] = useState<ReturnType<typeof getTransactions>>([]);

  // Dynamic Years calculation based on transaction history (Max 10 years)
  const availableYears = useMemo(() => {
    const txYears = transactions.map((t) => new Date(t.date).getFullYear());
    const yearsSet = new Set([currentYear, ...txYears]);
    return Array.from(yearsSet)
      .sort((a, b) => a - b) // Ascending order
      .slice(-10); // Show max last 10 years
  }, [transactions, currentYear]);
  
  // Calculate timezone-aware dynamic monthly exports count
  const exportsThisMonth = (() => {
    if (typeof window === "undefined") return 0;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return exportHistory.filter((item) => {
      if (!item.createdAt) return false;
      const itemDate = new Date(item.createdAt);
      const itemMonthStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      return itemMonthStr === currentMonthStr;
    }).length;
  })();
  
  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => {
    if (typeof window !== "undefined") {
      const savedShop = localStorage.getItem("fillax_shop_profile");
      if (savedShop) return JSON.parse(savedShop);
    }
    return {
      shopName: "ร้านค้าตัวอย่าง (ยังไม่ได้ตั้งค่า)",
      taxId: "0105562098741",
      branchCode: "00000",
      address: "123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
      isVatRegistered: false,
    };
  });

  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fillax_is_pro") === "true";
    }
    return false;
  });

  const loadHistory = () => {
    setExportHistory(getExportHistory());
    setIsLoading(false);
  };

  useEffect(() => {
    const checkSupabasePlan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          const isUserPro = profile.plan === "pro" || profile.plan === "agency";
          setIsPro(isUserPro);
          localStorage.setItem("fillax_is_pro", isUserPro ? "true" : "false");
          return;
        }
      }
      setIsPro(false);
      localStorage.setItem("fillax_is_pro", "false");
    };
    checkSupabasePlan();

    const timer = setTimeout(() => {
      loadHistory();
      setTransactions(getTransactions());
      if (typeof window !== "undefined") {
        const savedShop = localStorage.getItem("fillax_shop_profile");
        if (savedShop) setShopProfile(JSON.parse(savedShop));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleExport = () => {
    // Enforce 10-export limit per month on Free Plan
    if (!isPro && exportsThisMonth >= 10) {
      toast.error("คุณใช้งานสิทธิ์ส่งออกรายงาน Free Plan ครบ 10 ครั้งแล้วในเดือนนี้ กรุณาอัปเกรดเป็น PRO PLAN เพื่อส่งออกได้ไม่จำกัด ✦", {
        duration: 5000,
      });
      setIsUpgradeOpen(true);
      return;
    }

    const transactions = getTransactions();
    
    // Require active transactions to export
    if (!transactions.length) {
      toast.error("ไม่พบข้อมูลธุรกรรมในระบบ กรุณาเพิ่มรายการธุรกรรมในหน้าบัญชีรายรับ-รายจ่ายก่อนทำการส่งออกรายงานค่ะ 💜");
      return;
    }

    setIsExporting(true);
    try {
      const yearTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return date.getFullYear() === selectedYear;
      });

      if (yearTransactions.length === 0) {
        toast.error("ไม่พบข้อมูลธุรกรรมในปีที่เลือก");
        setIsExporting(false);
        return;
      }

      if (exportFormat === "pdf") {
        exportToPDF(yearTransactions);
      } else {
        exportToExcel(yearTransactions);
      }

      recordExport({
        exportType: exportFormat,
        fileName: `รายงานภาษี-${selectedYear + 543}.${exportFormat === "pdf" ? "pdf" : "xlsx"}`,
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
        recordCount: yearTransactions.length,
      });

      if (exportFormat === "pdf") {
        toast.success("ส่งออกสำเร็จ! กำลังเปิดหน้าต่างพิมพ์... กรุณาเลือก 'บันทึกเป็น PDF' เพื่อเซฟลงเครื่อง");
      } else {
        toast.success("ส่งออก Excel สำเร็จ! เริ่มดาวน์โหลดไฟล์เรียบร้อย");
      }
      loadHistory();
    } catch {
      toast.error("ไม่สามารถส่งออกข้อมูลได้");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = (
    data: ReturnType<typeof getTransactions>
  ) => {
    const html = generatePDFHTML(data);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Trigger print after font/style loads, with fallback timer
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    } else {
      toast.error("โปรดอนุญาตสิทธิ์ป๊อปอัป (Pop-ups) ในเบราว์เซอร์เพื่อพิมพ์รายงาน PDF");
    }
  };

  const exportToExcel = (
    data: ReturnType<typeof getTransactions>
  ) => {
    const totalIncome = data
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = data
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const summaryRows = [
      ["รายงานแสดงบัญชีรายรับ-รายจ่ายประจำปีภาษี (YTD) - Fillax e-Ledger"],
      [`ปีประเมินภาษี พ.ศ. ${selectedYear + 543} (ค.ศ. ${selectedYear})`],
      [`พิมพ์รายงาน ณ วันที่: ${new Date().toLocaleDateString("th-TH")}`],
      [""],
      ["ข้อมูลผู้เสียภาษี / สถานประกอบการ"],
      ["ชื่อสถานประกอบการ", shopProfile.shopName],
      ["เลขประจำตัวผู้เสียภาษีอากร", `="${shopProfile.taxId}"`],
      ["รหัสสาขา", `="${shopProfile.branchCode}"`],
      ["ที่อยู่สถานประกอบการ", shopProfile.address],
      ["สถานะภาษีมูลค่าเพิ่ม", shopProfile.isVatRegistered ? "จดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%)" : "ไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม"],
      [""],
      ["สรุปผลประกอบการทางการเงิน YTD"],
      ["รายรับรวมสะสม", totalIncome],
      ["รายจ่ายรวมสะสม", totalExpenses],
      ["กำไรสุทธิสะสม (P&L)", netIncome],
      ["สถานะความพร้อมเอกสาร", "ได้รับการตรวจสอบระบบดิจิทัล - AUDIT READY 🟢"],
      [""],
      ["รายละเอียดรายการธุรกรรมแสดงบัญชีรายรับ-รายจ่าย"],
    ];

    const headers = [
      "ลำดับ",
      "วัน/เดือน/ปี ทำรายการ",
      "ประเภทธุรกรรม",
      "หมวดหมู่รายการภาษี",
      "คำอธิบายและรายการดึงข้อมูล",
      "จำนวนเงิน (บาท)",
      "หมายเหตุ / เลขประจำตัวผู้เสียภาษีผู้ขาย (DBD Verified)",
    ];

    const receipts = getReceipts();
    const transactionRows = data.map((t, idx) => {
      const linkedReceipt = t.receiptId ? receipts.find((r) => r.id === t.receiptId) : undefined;
      const sellerTaxId = linkedReceipt?.sellerTaxId || "";
      const isDbdVerified = linkedReceipt?.isDbdVerified || false;
      return [
        idx + 1,
        new Date(t.date).toLocaleDateString("th-TH"),
        t.type === "income" ? "รายรับ" : "รายจ่าย",
        t.category,
        t.description || "",
        t.amount,
        t.notes || (sellerTaxId ? `ผู้ขาย TAX ID: ${sellerTaxId}${isDbdVerified ? " (DBD)" : ""}` : ""),
      ];
    });

    const csvContent = [
      ...summaryRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      headers.map((h) => `"${h}"`).join(","),
      ...transactionRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานภาษี_${shopProfile.shopName.replace(/\s+/g, "_")}_${selectedYear + 543}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePDFHTML = (
    data: ReturnType<typeof getTransactions>
  ) => {
    const totalIncome = data
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = data
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const rows = data
      .map(
        (t, idx) => `
      <tr class="ledger-row">
        <td class="cell text-center font-mono">${idx + 1}</td>
        <td class="cell text-center font-mono">${new Date(t.date).toLocaleDateString("th-TH")}</td>
        <td class="cell text-center">
          <span class="badge ${t.type === "income" ? "badge-income" : "badge-expense"}">
            ${t.type === "income" ? "รายรับ" : "รายจ่าย"}
          </span>
        </td>
        <td class="cell font-bold text-slate-800">${t.category}</td>
        <td class="cell text-slate-600">${t.description || "-"}</td>
        <td class="cell text-right font-mono font-bold text-slate-900">฿${t.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>รายงานสรุปรายได้และค่าใช้จ่าย - ปี พ.ศ. ${selectedYear + 543}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap');
          
          @media print {
            body { margin: 0; padding: 1.2cm; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
            .ledger-row { page-break-inside: avoid; }
          }
          
          body {
            font-family: 'Sarabun', 'Inter', sans-serif;
            color: #334155;
            background: #ffffff;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
          }
          
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #B08CFF;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          
          .brand-title {
            color: #B08CFF;
            font-family: 'Inter', sans-serif;
            font-size: 32px;
            font-weight: 900;
            margin: 0;
            letter-spacing: -1px;
          }
          
          .brand-subtitle {
            font-size: 10px;
            color: #64748B;
            font-weight: 850;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          
          .document-type {
            background: rgba(176, 140, 255, 0.08);
            border: 1px solid rgba(176, 140, 255, 0.2);
            padding: 10px 18px;
            border-radius: 16px;
            text-align: right;
          }
          
          .document-title {
            color: #1E293B;
            font-size: 16px;
            font-weight: 800;
            margin: 0;
          }
          
          .document-meta {
            font-size: 11px;
            color: #64748B;
            font-weight: 600;
            margin-top: 4px;
          }
          
          .profile-section {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 24px;
            padding: 24px;
            margin-bottom: 32px;
            display: flex;
            justify-content: space-between;
            gap: 24px;
          }
          
          .profile-col {
            flex: 1;
          }
          
          .profile-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748B;
            font-weight: 700;
            margin-bottom: 4px;
          }
          
          .profile-value {
            font-size: 13px;
            color: #1E293B;
            font-weight: 700;
          }
          
          .dashboard-grid {
            display: grid;
            grid-template-cols: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 36px;
          }
          
          .dash-card {
            border-radius: 20px;
            padding: 20px;
            border: 1px solid transparent;
          }
          
          .dash-income {
            background: #ECFDF5;
            border-color: #A7F3D0;
            color: #065F46;
          }
          
          .dash-expense {
            background: #FEF2F2;
            border-color: #FEE2E2;
            color: #991B1B;
          }
          
          .dash-net {
            background: #EEF2FF;
            border-color: #E0E7FF;
            color: #3730A3;
          }
          
          .dash-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
          }
          
          .dash-value {
            font-family: 'Inter', sans-serif;
            font-size: 24px;
            font-weight: 800;
            margin-top: 8px;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: 800;
            color: #1E293B;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          
          th {
            background: #1E293B;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 14px 16px;
            text-align: left;
            border: none;
          }
          
          th:first-child { border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
          th:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; text-align: right; }
          
          .cell {
            padding: 14px 16px;
            font-size: 12px;
            border-bottom: 1px solid #E2E8F0;
            vertical-align: middle;
          }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          
          .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 800;
          }
          
          .badge-income {
            background: #D1FAE5;
            color: #065F46;
          }
          
          .badge-expense {
            background: #FEE2E2;
            color: #991B1B;
          }
          
          .footer-certification {
            border-top: 1px dashed #E2E8F0;
            padding-top: 32px;
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 40px;
            page-break-inside: avoid;
          }
          
          .cert-text {
            font-size: 10px;
            color: #64748B;
            max-w-md;
            line-height: 1.6;
          }
          
          .signature-box {
            display: flex;
            gap: 50px;
          }
          
          .sig-col {
            text-align: center;
            min-width: 150px;
          }
          
          .sig-line {
            border-bottom: 1px solid #94A3B8;
            margin-bottom: 8px;
            height: 48px;
            width: 160px;
          }
          
          .sig-title {
            font-size: 10px;
            color: #64748B;
            font-weight: 700;
          }
          
          .stamp-container {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            border: 3px double #B08CFF;
            border-radius: 50%;
            color: #B08CFF;
            font-weight: 800;
            font-size: 8px;
            text-transform: uppercase;
            text-align: center;
            transform: rotate(-10deg);
            opacity: 0.85;
            font-family: 'Inter', sans-serif;
            letter-spacing: 0.5px;
            padding: 8px;
          }
          .stamp-inner {
            border: 1px dashed #B08CFF;
            border-radius: 50%;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-container">
          <div>
            <h1 class="brand-title">FILLAX</h1>
            <div class="brand-subtitle">Smart Tax & Financial Ledger</div>
          </div>
          <div class="document-type">
            <h2 class="document-title">รายงานแสดงบัญชีรายรับ-รายจ่ายสะสม (YTD)</h2>
            <div class="document-meta">ปีภาษี พ.ศ. ${selectedYear + 543} (ค.ศ. ${selectedYear})</div>
          </div>
        </div>
        
        <!-- Shop Profile -->
        <div class="profile-section">
          <div class="profile-col" style="flex: 1.5;">
            <div class="profile-label">ผู้เสียภาษี / สถานประกอบการ</div>
            <div class="profile-value">${shopProfile.shopName}</div>
            <div class="profile-label" style="margin-top: 10px;">ที่อยู่สถานประกอบการ</div>
            <div class="profile-value" style="font-size: 11px; font-weight: 500; color: #475569; max-w-sm;">${shopProfile.address}</div>
          </div>
          <div class="profile-col">
            <div class="profile-label">เลขประจำตัวผู้เสียภาษีอากร</div>
            <div class="profile-value" style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">${shopProfile.taxId}</div>
            <div class="profile-label" style="margin-top: 10px;">สถานะการจดทะเบียน VAT</div>
            <div class="profile-value" style="font-size: 11px; font-weight: bold; color: ${shopProfile.isVatRegistered ? '#059669' : '#475569'};">
              ${shopProfile.isVatRegistered ? '🟢 จดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%)' : '🔴 ไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม'}
            </div>
          </div>
          <div class="profile-col" style="text-align: right;">
            <div class="profile-label">วันที่พิมพ์รายงาน</div>
            <div class="profile-value">${new Date().toLocaleDateString("th-TH")}</div>
            <div class="profile-label" style="margin-top: 10px;">รหัสตรวจสอบความถูกต้อง</div>
            <div class="profile-value" style="font-family: 'Inter', sans-serif; font-size: 11px; color: #8C66FF; font-weight: bold;">FX-TAX-${selectedYear}-${new Date().getMonth() + 1}</div>
          </div>
        </div>
        
        <!-- Dashboard Summary -->
        <div class="dashboard-grid">
          <div class="dash-card dash-income">
            <div class="dash-label">รายรับสะสมรวมปีภาษี</div>
            <div class="dash-value">฿${totalIncome.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="dash-card dash-expense">
            <div class="dash-label">รายจ่ายสะสมรวมปีภาษี</div>
            <div class="dash-value">฿${totalExpenses.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="dash-card dash-net">
            <div class="dash-label">กำไรสะสมสุทธิ (YTD P&L)</div>
            <div class="dash-value" style="color: ${netIncome >= 0 ? "#1E3A8A" : "#7F1D1D"}; font-weight: 900;">
              ฿${netIncome.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        
        <!-- Ledger Table -->
        <div class="section-title">
          <span>รายละเอียดบัญชีรายรับ-รายจ่ายแสดงรายละเอียดธุรกรรม</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">ลำดับ</th>
              <th style="width: 15%; text-align: center;">วัน/เดือน/ปี</th>
              <th style="width: 12%; text-align: center;">ประเภท</th>
              <th style="width: 22%;">หมวดหมู่รายการภาษี</th>
              <th style="width: 31%;">คำอธิบายรายการ</th>
              <th style="width: 15%; text-align: right;">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <!-- Certification Stamp and Signatures -->
        <div class="footer-certification">
          <div style="display: flex; align-items: center; gap: 24px;">
            <div class="stamp-container">
              <div class="stamp-inner">
                <span style="font-size: 7px; font-weight: 900; margin-bottom: 2px;">FILLAX SECURE</span>
                <span style="font-size: 6px; font-weight: 500; opacity: 0.8;">AUDITED</span>
                <span style="font-size: 7px; font-weight: 900; margin-top: 2px;">TAX READY</span>
              </div>
            </div>
            <div class="cert-text">
              <strong>การรับรองระบบการจัดทำบัญชีอิเล็กทรอนิกส์ (Certified e-Ledger Audit)</strong><br />
              รายงานสรุปทางบัญชีและการเงินเล่มนี้ ถูกรวบรวมและตรวจสอบผ่านระบบปัญญาประดิษฐ์ Fillax Smart Auditor 
              ข้อมูลทุกรายการธุรกรรมได้รับการนำเข้าและอนุมัติความถูกต้องโดยอ้างอิงจากหลักฐานเอกสารใบเสร็จ 
              และระบบจัดหมวดหมู่ภาษีตามระเบียบของกรมสรรพากรแห่งประเทศไทยอย่างถูกต้องและปลอดภัย 100%
            </div>
          </div>
          <div class="signature-box">
            <div class="sig-col">
              <div class="sig-line"></div>
              <div class="sig-title">เจ้าของกิจการ / ผู้ยื่นภาษี</div>
            </div>
            <div class="sig-col">
              <div class="sig-line" style="display: flex; align-items: center; justify-content: center; color: #8C66FF; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; opacity: 0.7;">Fillax Smart Auditor</div>
              <div class="sig-title">ผู้สอบทานระบบบัญชีดิจิทัล</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">ส่งออกข้อมูล</h1>
        <p className="text-muted-foreground">
          ส่งออกข้อมูลทางการเงินของคุณเป็นรูปแบบ PDF หรือ Excel
        </p>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-xl font-bold">
            <span>ส่งออกรายงานการเงิน</span>
            {isPro ? (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold flex items-center gap-1">
                ✦ PRO PLAN
              </span>
            ) : (
              <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full font-bold">
                FREE PLAN
              </span>
            )}
          </CardTitle>
          <CardDescription>
            เลือกปีและรูปแบบที่ต้องการส่งออกข้อมูล
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Year Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">เลือกปี (พ.ศ.)</label>
            <div className="flex flex-wrap gap-2 bg-accent/30 p-1 rounded-2xl border border-border/50 backdrop-blur-sm w-fit">
              {availableYears.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "ghost"}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "rounded-xl px-6 h-10 transition-all font-bold",
                    selectedYear === year ? "shadow-lg shadow-primary/20" : ""
                  )}
                >
                  พ.ศ. {year + 543}
                </Button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">รูปแบบการส่งออก</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setExportFormat("pdf")}
                className={`p-4 border-2 rounded-lg transition-all text-center cursor-pointer ${
                  exportFormat === "pdf"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">PDF</p>
                <p className="text-xs text-muted-foreground">
                  รูปแบบเอกสารพร้อมพิมพ์
                </p>
              </button>
              <button
                onClick={() => setExportFormat("excel")}
                className={`p-4 border-2 rounded-lg transition-all text-center cursor-pointer ${
                  exportFormat === "excel"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Sheet className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Excel</p>
                <p className="text-xs text-muted-foreground">
                  รูปแบบตารางคำนวณ (CSV)
                </p>
              </button>
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting
              ? "กำลังส่งออก..."
              : `ส่งออกข้อมูลเป็น ${exportFormat.toUpperCase()}`}
          </Button>

          {/* Quota Counter Status */}
          <div className="text-center pt-2">
            {!isPro ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>โควตาส่งออก Free Plan (ในเดือนนี้)</span>
                  <span>{exportsThisMonth} / 10 ครั้ง</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min((exportsThisMonth / 10) * 100, 100)}%`,
                    }}
                  />
                </div>
                {exportsThisMonth >= 10 && (
                  <p className="text-[11px] font-bold text-destructive animate-pulse">
                    ⚠️ โควตาการส่งออกฟรีในเดือนนี้หมดแล้ว กรุณาอัปเกรดเพื่อปลดล็อก!
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-primary flex items-center justify-center gap-1">
                ✦ PRO PLAN — คุณได้รับสิทธิ์ส่งออกรายงานได้ไม่จำกัดจำนวนครั้ง
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการส่งออก</CardTitle>
          <CardDescription>รายการที่คุณเคยส่งออกไว้ก่อนหน้า</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : exportHistory && exportHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อไฟล์</TableHead>
                    <TableHead>รูปแบบ</TableHead>
                    <TableHead>จำนวนรายการ</TableHead>
                    <TableHead>วันที่ส่งออก</TableHead>
                    <TableHead>ช่วงเวลาข้อมูล</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">
                        {exp.fileName}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {exp.exportType.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{exp.recordCount || "-"}</TableCell>
                      <TableCell>
                        {new Date(exp.createdAt).toLocaleDateString(
                          "th-TH"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {exp.startDate && exp.endDate
                          ? `${new Date(exp.startDate).toLocaleDateString("th-TH")} - ${new Date(exp.endDate).toLocaleDateString("th-TH")}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>
                ยังไม่เคยมีการส่งออก เริ่มต้นส่งออกรายงานเพื่อดูข้อมูลย้อนหลัง
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            ข้อมูลที่จะรวมอยู่ในรายงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>✓ รายการธุรกรรมทั้งหมด (รายรับและรายจ่าย)</li>
            <li>✓ หมวดหมู่และคำอธิบายรายการ</li>
            <li>
              ✓ สรุปภาพรวมทางการเงิน (รายได้รวม, รายจ่ายรวม, กำไรสุทธิ)
            </li>
            <li>✓ วันที่และจำนวนเงิน</li>
            <li>✓ หมายเหตุและข้อมูลเพิ่มเติมอื่นๆ</li>
          </ul>
        </CardContent>
      </Card>

      {/* Central Premium Stripe & Omise Payment Gateway Upgrade Portal */}
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        onSuccess={() => setIsPro(true)}
      />
    </div>
  );
}
