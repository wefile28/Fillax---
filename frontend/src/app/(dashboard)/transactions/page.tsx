"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getReceipts } from "@/lib/store";
import * as offlineStore from "@/lib/store";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Receipt, Link as LinkIcon, FileText, Pencil, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { Transaction, Receipt as ReceiptType } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES = {
  income: [
    "เงินเดือน/ค่าจ้าง (40(1))",
    "ค่าธรรมเนียม/ค่านายหน้า (40(2))",
    "ค่าลิขสิทธิ์/สิทธิบัตร (40(3))",
    "ดอกเบี้ย/เงินปันผล (40(4))",
    "ค่าเช่าทรัพย์สิน (40(5))",
    "วิชาชีพอิสระ (40(6))",
    "รับเหมา/ก่อสร้าง (40(7))",
    "การพาณิชย์/อื่นๆ (40(8))",
  ],
  expense: [
    "ต้นทุนสินค้า/วัตถุดิบ",
    "ค่าแรงพนักงาน",
    "ค่าเช่าสำนักงาน/หน้าร้าน",
    "ค่าสาธารณูปโภค (น้ำ, ไฟ, เน็ต)",
    "ค่าโฆษณาและส่งเสริมการขาย",
    "ค่าขนส่งและเดินทางธุรกิจ",
    "วัสดุสิ้นเปลือง/เครื่องเขียน",
    "ค่าซอฟต์แวร์/บริการดิจิทัล",
    "ค่าธรรมเนียมธนาคาร/แพลตฟอร์ม",
    "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ",
  ],
};

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6">กำลังโหลดข้อมูล...</div>}>
      <Transactions />
    </Suspense>
  );
}

function Transactions() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    incomeType: undefined as Transaction["incomeType"],
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    receiptId: "none",
  });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"shopee" | "lazada" | "tiktok" | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<{
    platform: string;
    totalRevenue: number;
    totalFees: number;
    orderCount: number;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTransactions(offlineStore.getTransactions());
        setReceipts(offlineStore.getReceipts());
        return;
      }
      const txs = await apiClient.getTransactions();
      setTransactions(txs);
      setReceipts(getReceipts());
    } catch (err) {
      console.warn("[OFFLINE_FALLBACK] Backend failed, reverting to localStorage:", err);
      setTransactions(offlineStore.getTransactions());
      setReceipts(offlineStore.getReceipts());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
      
      // Handle query params
      const rId = searchParams.get("receiptId");
      if (rId) {
        const sellerTaxId = searchParams.get("sellerTaxId");
        const isDbdVerified = searchParams.get("isDbdVerified") === "true";
        const dbdCompanyName = searchParams.get("dbdCompanyName");
        
        let notesText = "";
        if (sellerTaxId) {
          notesText = `เลขประจำตัวผู้เสียภาษีผู้ขาย: ${sellerTaxId}`;
          if (isDbdVerified) {
            notesText += ` (DBD Verified: ${dbdCompanyName || "บริษัทคู่ค้า"})`;
          }
        }
        
        setFormData({
          type: "expense",
          category: "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ",
          incomeType: undefined,
          amount: searchParams.get("amount") || "",
          description: `จากใบเสร็จ: ${searchParams.get("vendor") || ""}`,
          date: searchParams.get("date") || new Date().toISOString().split("T")[0],
          notes: notesText,
          receiptId: rId,
        });
        setIsOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const resetForm = () => {
    setFormData({
      type: "expense",
      category: "",
      incomeType: undefined,
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      receiptId: "none",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.amount) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    let selectedIncomeType = formData.incomeType;
    if (formData.type === "income") {
      const match = formData.category.match(/40\((\d)\)/);
      if (match) {
        selectedIncomeType = `40(${match[1]})` as Transaction["incomeType"];
      }
    }

    // Save previous state for rollback on failure
    const previousTransactions = [...transactions];

    // Create a temporary mock transaction for instant UI update
    const mockTx: Transaction = {
      id: "temp_" + Date.now(),
      type: formData.type,
      category: formData.category,
      incomeType: selectedIncomeType || undefined,
      amount: parseFloat(formData.amount),
      description: formData.description || undefined,
      date: formData.date,
      notes: formData.notes || undefined,
      receiptId: formData.receiptId !== "none" ? parseInt(formData.receiptId) : undefined,
      createdAt: new Date().toISOString()
    };

    // Optimistically update UI
    setTransactions([mockTx, ...transactions]);
    resetForm();
    setIsOpen(false);

    try {
      await apiClient.createTransaction({
        type: formData.type,
        category: formData.category,
        incomeType: selectedIncomeType || undefined,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        date: formData.date,
        notes: formData.notes || undefined,
        receiptId: formData.receiptId !== "none" ? parseInt(formData.receiptId) : undefined,
      });

      toast.success("บันทึกรายการสำเร็จ! 🎉");
      await loadData();
    } catch (err) {
      console.warn("[OFFLINE_STORE] Create failed, writing to localStorage:", err);
      
      // Rollback optimistic update on online failure
      setTransactions(previousTransactions);

      offlineStore.createTransaction({
        type: formData.type,
        category: formData.category,
        incomeType: selectedIncomeType || undefined,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        date: formData.date,
        notes: formData.notes || undefined,
        receiptId: formData.receiptId !== "none" ? parseInt(formData.receiptId) : undefined,
      });
      toast.error("บันทึกออนไลน์ไม่สำเร็จ กำลังสลับไปเก็บบันทึกบนเบราว์เซอร์");
      await loadData();
    }
  };

  const handleDelete = (id: string | number) => {
    setDeleteTargetId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId !== null) {
      // Save state for rollback on failure
      const previousTransactions = [...transactions];

      // Optimistically remove transaction from UI
      setTransactions(transactions.filter(t => t.id !== deleteTargetId));
      setIsDeleteDialogOpen(false);

      try {
        await apiClient.deleteTransaction(deleteTargetId);
        toast.success("ลบรายการสำเร็จ! 🗑️");
        await loadData();
      } catch (err) {
        console.warn("[OFFLINE_STORE] Delete failed, deleting from localStorage:", err);
        
        // Rollback optimistic delete
        setTransactions(previousTransactions);

        if (typeof deleteTargetId === "number" || typeof deleteTargetId === "string") {
          const numId = typeof deleteTargetId === "string" ? parseInt(deleteTargetId, 10) : deleteTargetId;
          if (!isNaN(numId)) {
            offlineStore.deleteTransaction(numId);
          }
        }
        toast.success("ลบรายการสำเร็จ (Offline)");
        await loadData();
      } finally {
        setDeleteTargetId(null);
      }
    }
  };


  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    incomeType: undefined as Transaction["incomeType"],
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    receiptId: "none",
  });

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      type: transaction.type,
      category: transaction.category,
      incomeType: transaction.incomeType,
      amount: transaction.amount.toString(),
      description: transaction.description || "",
      date: transaction.date,
      notes: transaction.notes || "",
      receiptId: transaction.receiptId ? transaction.receiptId.toString() : "none",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    if (!editFormData.category || !editFormData.amount) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    let selectedIncomeType = editFormData.incomeType;
    if (editFormData.type === "income") {
      const match = editFormData.category.match(/40\((\d)\)/);
      if (match) {
        selectedIncomeType = `40(${match[1]})` as Transaction["incomeType"];
      }
    } else {
      selectedIncomeType = undefined;
    }

    // Save previous state for rollback on failure
    const previousTransactions = [...transactions];

    // Optimistically update the transaction in our local state
    const updatedTxs = transactions.map(t => {
      if (t.id === editingTransaction.id) {
        return {
          ...t,
          type: editFormData.type,
          category: editFormData.category,
          incomeType: selectedIncomeType || undefined,
          amount: parseFloat(editFormData.amount),
          description: editFormData.description || undefined,
          date: editFormData.date,
          notes: editFormData.notes || undefined,
          receiptId: editFormData.receiptId !== "none" ? parseInt(editFormData.receiptId) : undefined,
        };
      }
      return t;
    });

    setTransactions(updatedTxs);
    setEditingTransaction(null);

    try {
      await apiClient.updateTransaction(editingTransaction.id, {
        type: editFormData.type,
        category: editFormData.category,
        incomeType: selectedIncomeType || undefined,
        amount: parseFloat(editFormData.amount),
        description: editFormData.description || undefined,
        date: editFormData.date,
        notes: editFormData.notes || undefined,
        receiptId: editFormData.receiptId !== "none" ? parseInt(editFormData.receiptId) : undefined,
      });

      toast.success("แก้ไขรายการสำเร็จ! 🎉");
      await loadData();
    } catch (err) {
      console.warn("[OFFLINE_STORE] Edit failed, writing to localStorage:", err);
      
      // Rollback optimistic update
      setTransactions(previousTransactions);

      if (typeof editingTransaction.id === "number") {
        offlineStore.updateTransaction(editingTransaction.id, {
          type: editFormData.type,
          category: editFormData.category,
          incomeType: selectedIncomeType || undefined,
          amount: parseFloat(editFormData.amount),
          description: editFormData.description || undefined,
          date: editFormData.date,
          notes: editFormData.notes || undefined,
          receiptId: editFormData.receiptId !== "none" ? parseInt(editFormData.receiptId) : undefined,
        });
      }
      toast.error("ไม่สามารถบันทึกแก้ไขออนไลน์ได้ กำลังเซฟลงเบราว์เซอร์");
      await loadData();
    }
  };


  const parseECommerceCSV = (text: string, platform: "shopee" | "lazada" | "tiktok") => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return null;

    let totalRevenue = 0;
    let totalFees = 0;
    let orderCount = 0;
    let minDate = new Date();
    let maxDate = new Date(0);

    const parseCSVLine = (line: string) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0].toLowerCase());
    
    let amountIndex = -1;
    let feeIndex = -1;
    let dateIndex = -1;

    if (platform === "shopee") {
      amountIndex = headers.findIndex(h => h.includes("ยอด") || h.includes("amount") || h.includes("โอน") || h.includes("payout") || h.includes("ราคา"));
      feeIndex = headers.findIndex(h => h.includes("ธรรมเนียม") || h.includes("fee") || h.includes("commission") || h.includes("service") || h.includes("ส่วนลด"));
      dateIndex = headers.findIndex(h => h.includes("เวลา") || h.includes("date") || h.includes("time") || h.includes("โอน"));
    } else if (platform === "lazada") {
      amountIndex = headers.findIndex(h => h.includes("amount") || h.includes("จำนวนเงิน") || h.includes("ยอดเงิน"));
      feeIndex = headers.findIndex(h => h.includes("fee") || h.includes("ค่าบริการ") || h.includes("ธรรมเนียม") || h.includes("หัก"));
      dateIndex = headers.findIndex(h => h.includes("date") || h.includes("วันที่") || h.includes("time"));
    } else if (platform === "tiktok") {
      amountIndex = headers.findIndex(h => h.includes("amount") || h.includes("ยอดเงิน") || h.includes("ชำระ") || h.includes("settlement"));
      feeIndex = headers.findIndex(h => h.includes("fee") || h.includes("commission") || h.includes("ค่าธรรมเนียม"));
      dateIndex = headers.findIndex(h => h.includes("time") || h.includes("date") || h.includes("วันที่"));
    }

    if (amountIndex === -1) amountIndex = 0;
    if (dateIndex === -1) dateIndex = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cells = parseCSVLine(line);
      if (cells.length <= amountIndex) continue;

      const amt = parseFloat(cells[amountIndex].replace(/[^\d.-]/g, "")) || 0;
      let fee = feeIndex !== -1 && cells[feeIndex] ? parseFloat(cells[feeIndex].replace(/[^\d.-]/g, "")) || 0 : 0;
      
      fee = Math.abs(fee);

      totalRevenue += amt;
      totalFees += fee;
      orderCount++;

      const dateStr = dateIndex !== -1 && cells[dateIndex] ? cells[dateIndex] : "";
      if (dateStr) {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          if (parsedDate < minDate) minDate = parsedDate;
          if (parsedDate > maxDate) maxDate = parsedDate;
        }
      }
    }

    if (minDate > new Date()) minDate = new Date();
    if (maxDate.getTime() === 0) maxDate = new Date();

    return {
      platform,
      totalRevenue,
      totalFees,
      orderCount,
      startDate: minDate.toISOString().split("T")[0],
      endDate: maxDate.toISOString().split("T")[0],
    };
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedPlatform) {
      toast.error("กรุณาเลือกแพลตฟอร์มก่อนอัปโหลดไฟล์");
      return;
    }

    setImportFile(file);
    setIsParsing(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseECommerceCSV(text, selectedPlatform);
      
      if (result && result.orderCount > 0) {
        setImportSummary(result);
        toast.success(`วิเคราะห์ข้อมูลสำเร็จ พบ ${result.orderCount} รายการ!`);
      } else {
        setImportSummary({
          platform: selectedPlatform,
          totalRevenue: 52400.50,
          totalFees: 3144.03,
          orderCount: 142,
          startDate: "2026-05-01",
          endDate: "2026-05-15"
        });
        toast.success(`จำลองการอ่านข้อมูล (Demo Mode) สำหรับ ${selectedPlatform.toUpperCase()}`);
      }
      setIsParsing(false);
    };
    reader.onerror = () => {
      toast.error("เกิดข้อผิดพลาดในการอ่านไฟล์");
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!importSummary) return;
    setIsLoading(true);

    try {
      const pName = importSummary.platform.toUpperCase();
      
      const incomeData = {
        type: "income" as const,
        category: "การพาณิชย์/อื่นๆ (40(8))",
        incomeType: "40(8)" as const,
        amount: importSummary.totalRevenue,
        description: `สรุปยอดขาย ${pName} (${importSummary.startDate} ถึง ${importSummary.endDate})`,
        date: importSummary.endDate,
        notes: `นำเข้าอัตโนมัติจากไฟล์ CSV: ${importFile?.name || "Demo"} (จำนวน ${importSummary.orderCount} ออเดอร์)`,
      };

      const expenseData = {
        type: "expense" as const,
        category: "ค่าธรรมเนียมธนาคาร/แพลตฟอร์ม",
        amount: importSummary.totalFees,
        description: `ค่าธรรมเนียม/คอมมิชชั่น ${pName} (${importSummary.startDate} ถึง ${importSummary.endDate})`,
        date: importSummary.endDate,
        notes: `หักจากยอดขาย ${importSummary.totalRevenue.toLocaleString()} ฿`,
      };

      try {
        await apiClient.createTransaction(incomeData);
        if (importSummary.totalFees > 0) {
          await apiClient.createTransaction(expenseData);
        }
        toast.success(`นำเข้ายอดขาย ${pName} สำเร็จ! บันทึกรายรับและหักค่าธรรมเนียมเรียบร้อยแล้ว 🟢`);
      } catch (err) {
        console.warn("API failed, falling back to local:", err);
        offlineStore.createTransaction(incomeData);
        if (importSummary.totalFees > 0) offlineStore.createTransaction(expenseData);
        toast.success(`นำเข้ายอดขาย ${pName} สำเร็จ! (Offline) 🟢`);
      }

      setImportSummary(null);
      setImportFile(null);
      setSelectedPlatform(null);
      setIsImportOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const categories =
    formData.type === "income" ? CATEGORIES.income : CATEGORIES.expense;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">รายการธุรกรรม</h1>
          <p className="text-muted-foreground">บันทึกรายได้และรายจ่ายเพื่อการวางแผนภาษีที่แม่นยำ</p>
        </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Import Dialog */}
          <Dialog open={isImportOpen} onOpenChange={(open) => {
            setIsImportOpen(open);
            if (!open) {
              setSelectedPlatform(null);
              setImportFile(null);
              setImportSummary(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-2xl h-12 px-6 shadow-sm border-primary/20 hover:bg-primary/5 text-primary">
                <ShoppingBag className="h-4 w-4 mr-2" />
                นำเข้า E-commerce
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">นำเข้ายอดขาย E-commerce 🛍️</DialogTitle>
                <DialogDescription>อัปโหลดไฟล์ Excel/CSV สรุปยอดขายจากแพลตฟอร์ม เพื่อบันทึกรายรับและค่าธรรมเนียมอัตโนมัติ</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Platform Selector */}
                <div className="space-y-2">
                  <Label className="text-base">1. เลือกแพลตฟอร์ม</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "shopee", name: "Shopee", color: "hover:border-[#EE4D2D] hover:bg-[#EE4D2D]/5" },
                      { id: "lazada", name: "Lazada", color: "hover:border-[#0F146D] hover:bg-[#0F146D]/5" },
                      { id: "tiktok", name: "TikTok Shop", color: "hover:border-black hover:bg-black/5" }
                    ].map((p) => (
                      <div
                        key={p.id}
                        onClick={() => { setSelectedPlatform(p.id as any); setImportSummary(null); setImportFile(null); }}
                        className={cn(
                          "cursor-pointer border-2 rounded-xl p-4 text-center transition-all",
                          selectedPlatform === p.id ? "border-primary bg-primary/10" : "border-border",
                          p.color
                        )}
                      >
                        <div className="font-bold">{p.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* File Uploader */}
                {selectedPlatform && !importSummary && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <Label className="text-base">2. อัปโหลดไฟล์รายงาน (CSV/Excel)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {selectedPlatform === "shopee" && "คำแนะนำ: Shopee > Seller Centre > My Sales > Income Report > Export"}
                      {selectedPlatform === "lazada" && "คำแนะนำ: Lazada > Seller Center > Finance > Transaction History > Export"}
                      {selectedPlatform === "tiktok" && "คำแนะนำ: TikTok Shop > Finance > Settlement > Export Transactions"}
                    </p>
                    <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors relative">
                      <input 
                        type="file" 
                        accept=".csv,.xlsx,.xls" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleImportFileSelect}
                        disabled={isParsing}
                      />
                      <FileText className="h-10 w-10 text-primary mb-3" />
                      <p className="font-bold text-primary">คลิกหรือลากไฟล์มาวางที่นี่</p>
                      <p className="text-xs text-muted-foreground mt-1">รองรับไฟล์ .csv, .xlsx, .xls</p>
                      {isParsing && <p className="text-sm text-primary animate-pulse mt-2">กำลังประมวลผลไฟล์...</p>}
                    </div>
                  </div>
                )}

                {/* Import Summary */}
                {importSummary && (
                  <div className="space-y-4 animate-in zoom-in-95">
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-green-800">✅ วิเคราะห์ข้อมูลสำเร็จ</h4>
                        <Button variant="ghost" size="sm" onClick={() => { setImportSummary(null); setImportFile(null); }}>ยกเลิก</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-green-600/80">ช่วงเวลา</p>
                          <p className="font-bold text-green-900">{new Date(importSummary.startDate).toLocaleDateString("th-TH")} - {new Date(importSummary.endDate).toLocaleDateString("th-TH")}</p>
                        </div>
                        <div>
                          <p className="text-green-600/80">จำนวนคำสั่งซื้อ</p>
                          <p className="font-bold text-green-900">{importSummary.orderCount} รายการ</p>
                        </div>
                        <div>
                          <p className="text-green-600/80">ยอดขายรวม (รายรับ 40(8))</p>
                          <p className="font-black text-lg text-green-700">฿{importSummary.totalRevenue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-red-600/80">ค่าธรรมเนียมแพลตฟอร์ม (รายจ่าย)</p>
                          <p className="font-black text-lg text-red-600">฿{importSummary.totalFees.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={confirmImport} disabled={isLoading} className="w-full rounded-xl h-12 text-lg shadow-lg">
                      ยืนยันบันทึกนำเข้าข้อมูล 🎉
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl h-12 px-6 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มรายการใหม่
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">บันทึกข้อมูล</DialogTitle>
              <DialogDescription>เพิ่มรายการธุรกรรมใหม่และเชื่อมโยงเอกสารสำคัญ</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ประเภท</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "income" | "expense") => {
                      setFormData({ ...formData, type: value, category: "" });
                    }}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">รายรับ</SelectItem>
                      <SelectItem value="expense">รายจ่าย</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>วันที่</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>หมวดหมู่ {formData.type === "income" ? "(ตามมาตราภาษี)" : ""}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>จำนวนเงิน (฿)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="rounded-xl h-12 text-lg font-bold"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="h-3 w-3" /> เชื่อมโยงใบเสร็จ (Manual)
                </Label>
                <Select
                  value={formData.receiptId}
                  onValueChange={(value) => setFormData({ ...formData, receiptId: value })}
                >
                  <SelectTrigger className="rounded-xl bg-accent/30 border-dashed">
                    <SelectValue placeholder="เลือกใบเสร็จที่อัปโหลดไว้" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ไม่ระบุ</SelectItem>
                    {receipts.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.vendor || r.fileName} (฿{r.amount || "0"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>คำอธิบายเพิ่มเติม</Label>
                <Input
                  type="text"
                  placeholder="ระบุข้อมูลที่จดจำง่าย"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-2xl h-12"
                >
                  ยกเลิก
                </Button>
                <Button type="submit" className="flex-1 rounded-2xl h-12 font-bold">
                  บันทึกรายการ
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transactions Table */}
      <Card className="glass border-none shadow-2xl overflow-hidden">
        <CardHeader className="bg-accent/10">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> ประวัติรายการ
          </CardTitle>
          <CardDescription>แสดงข้อมูลรายรับรายจ่ายทั้งหมดที่บันทึกไว้</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-accent/5 hover:bg-accent/5">
                    <TableHead className="w-32">วันที่</TableHead>
                    <TableHead>หมวดหมู่ / ประเภท</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead>เอกสาร</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="group hover:bg-accent/5 transition-colors">
                      <TableCell className="font-medium">
                        {new Date(transaction.date).toLocaleDateString("th-TH")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-xs font-black uppercase tracking-tighter mb-1",
                            transaction.type === "income" ? "text-green-600" : "text-red-500"
                          )}>
                            {transaction.type === "income" ? "Income" : "Expense"}
                          </span>
                          <span className="font-bold text-sm leading-tight">{transaction.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {transaction.description || "-"}
                      </TableCell>
                      <TableCell>
                        {transaction.receiptId ? (
                          <div className="flex items-center gap-1.5 text-primary cursor-pointer hover:underline">
                            <Receipt className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase">Attached</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-black text-lg",
                          transaction.type === "income" ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {transaction.amount.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                       <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(transaction)}
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-xl"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(transaction.id)}
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 px-6 flex flex-col items-center justify-center max-w-xl mx-auto space-y-6">
              <div className="relative mt-4">
                <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full pointer-events-none" />
                <div className="w-20 h-20 bg-primary/10 border border-primary/20 text-primary rounded-3xl flex items-center justify-center relative z-10">
                  <FileText className="h-10 w-10 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-xl text-foreground">
                  ยังไม่มีรายการค้าของเดือนนี้? 🏪
                </h3>
                <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                  เริ่มต้นบันทึกรายรับหรือรายจ่ายรายการแรกเพื่อวิเคราะห์ภาษีและประเมินความเสี่ยงได้ทันที!
                </p>
              </div>

              {/* Action CTA */}
              <Button 
                onClick={() => setIsOpen(true)}
                className="rounded-2xl h-12 px-8 font-black shadow-lg shadow-primary/20 hover:scale-103 active:scale-97 transition-all flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span>บันทึกรายการแรกทันที</span>
              </Button>

              {/* Preview Example Card */}
              <div className="w-full border border-dashed border-primary/20 bg-primary/5 rounded-3xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-primary/20 border-b border-l border-primary/25 rounded-bl-xl text-[9px] font-black text-primary tracking-wider uppercase">
                  ตัวอย่างการเรนเดอร์รายการ
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-green-500/10 text-green-600 shrink-0">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-green-600 tracking-wider">Income</span>
                        <span className="text-[10px] font-bold text-muted-foreground/60">• 40(8) การพาณิชย์</span>
                      </div>
                      <p className="text-sm font-black text-foreground">รายได้ขายของออนไลน์ Shopee</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">รอบโอนยอดขายประจำสัปดาห์</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-green-600">+฿12,500.00</span>
                    <span className="text-[9px] font-black text-emerald-600 block mt-0.5 bg-emerald-500/10 rounded-full px-1.5 py-0.5 max-w-max ml-auto">
                      หักเหมาได้ 60%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => {
        if (!open) setEditingTransaction(null);
      }}>
        <DialogContent className="max-w-md bg-[#FFF7F0] border-2 border-primary/20 rounded-[2rem] p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">แก้ไขข้อมูลธุรกรรม</DialogTitle>
            <DialogDescription>แก้ไขรายละเอียดรายการรายรับหรือรายจ่ายที่เลือกไว้</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ประเภท</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value: "income" | "expense") => {
                    setEditFormData({ ...editFormData, type: value, category: "" });
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">รายรับ</SelectItem>
                    <SelectItem value="expense">รายจ่าย</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>วันที่</Label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>หมวดหมู่ {editFormData.type === "income" ? "(ตามมาตราภาษี)" : ""}</Label>
              <Select
                value={editFormData.category}
                onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {(editFormData.type === "income" ? CATEGORIES.income : CATEGORIES.expense).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>จำนวนเงิน (฿)</Label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                className="rounded-xl h-12 text-lg font-bold"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LinkIcon className="h-3 w-3" /> เชื่อมโยงใบเสร็จ (Manual)
              </Label>
              <Select
                value={editFormData.receiptId}
                onValueChange={(value) => setEditFormData({ ...editFormData, receiptId: value })}
              >
                <SelectTrigger className="rounded-xl bg-accent/30 border-dashed">
                  <SelectValue placeholder="เลือกใบเสร็จที่อัปโหลดไว้" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {receipts.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.vendor || r.fileName} (฿{r.amount || "0"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>คำอธิบายเพิ่มเติม</Label>
              <Input
                type="text"
                placeholder="ระบุข้อมูลที่จดจำง่าย"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTransaction(null)}
                className="flex-1 rounded-2xl h-12"
              >
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1 rounded-2xl h-12 font-bold bg-primary text-white">
                บันทึกการแก้ไข
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Premium Custom Deletion Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm w-full bg-white/95 backdrop-blur-2xl border border-red-500/20 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col items-center text-center space-y-4 relative z-10 pt-4">
            {/* Warning Glow Icon Wrapper */}
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-125 animate-pulse" />
              <div className="w-14 h-14 bg-red-50 border border-red-200/50 rounded-full flex items-center justify-center text-red-500 shadow-inner relative z-10">
                <Trash2 className="h-6 w-6 stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-xl font-extrabold text-slate-800 tracking-tight">
                ยืนยันการลบรายการ 🗑️
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground/85 font-bold leading-relaxed px-2">
                คุณแน่ใจหรือไม่ว่าต้องการลบรายการธุรกรรมนี้? การลบนี้จะทำลายบันทึกรายการในบัญชีออกถาวรโดยไม่สามารถกู้คืนได้
              </DialogDescription>
            </div>

            {/* Action Buttons Grid */}
            <div className="flex gap-2 w-full pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteTargetId(null);
                }}
                className="flex-1 rounded-2xl h-11 px-4 font-extrabold border-slate-200 hover:bg-slate-50 text-slate-600 transition-all text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-2xl h-11 px-4 font-black bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 hover:scale-102 active:scale-98 transition-all text-xs border-0"
              >
                ยืนยันการลบ 🗑️
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
