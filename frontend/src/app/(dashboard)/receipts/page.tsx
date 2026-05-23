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
import { getReceipts, createReceipt, deleteReceipt, updateReceipt } from "@/lib/store";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Image as ImageIcon, Folder, Scan, Crown, AlertCircle, Pencil, FileText, Crop } from "lucide-react";
import { toast } from "sonner";
import type { Receipt } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import UpgradeDialog from "@/components/upgrade-dialog";
import { supabase, API_URL } from "@/lib/supabase";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

export default function Receipts() {
  const currentYear = new Date().getFullYear();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // OCR Quota State (Dynamic with Calendar Month Check & Reset)
  const [ocrQuota, setOcrQuota] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // e.g., "2026-05" (local time)
      const savedMonth = localStorage.getItem("fillax_ocr_quota_month");
      if (savedMonth !== currentMonth) {
        localStorage.setItem("fillax_ocr_quota_month", currentMonth);
        localStorage.setItem("fillax_ocr_quota", "0");
        return 0;
      }
      const savedQuota = localStorage.getItem("fillax_ocr_quota");
      return savedQuota ? parseInt(savedQuota) : 0;
    }
    return 0;
  }); 
  const MAX_QUOTA = 10;
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fillax_is_pro") === "true";
    }
    return false;
  });

  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    description: "",
    vendor: "",
    amount: "",
    sellerTaxId: "",
    isDbdVerified: false,
    dbdCompanyName: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Cropper State
  const [cropper, setCropper] = useState<any>();
  const [fileToCrop, setFileToCrop] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("");
  const [originalFileType, setOriginalFileType] = useState<string>("");
  const loadReceipts = () => {
    setReceipts(getReceipts());
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
      loadReceipts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      description: "",
      vendor: "",
      amount: "",
      sellerTaxId: "",
      isDbdVerified: false,
      dbdCompanyName: "",
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // URL-Based LINE Review Ingest hook
  useEffect(() => {
    const handleReviewQuery = async () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const reviewId = params.get("review");
      if (!reviewId) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch specifically the line bot receipt
        const { data: reviewItem, error } = await supabase
          .from("receipts")
          .select("*")
          .eq("id", reviewId)
          .single();

        if (error || !reviewItem) {
          console.error("Failed to fetch review item:", error);
          return;
        }

        // Map database fields to front-end Receipt object
        const parsedDate = reviewItem.date ? new Date(reviewItem.date) : new Date();
        const mappedReceipt = {
          id: reviewItem.id as any,
          fileName: reviewItem.file_name,
          fileUrl: reviewItem.file_url,
          fileKey: reviewItem.file_url,
          mimeType: reviewItem.mime_type,
          fileSize: reviewItem.file_size,
          uploadDate: reviewItem.created_at,
          year: parsedDate.getFullYear(),
          month: parsedDate.getMonth() + 1,
          day: parsedDate.getDate(),
          description: reviewItem.description || "",
          amount: reviewItem.amount ? reviewItem.amount.toString() : "",
          vendor: reviewItem.vendor || "",
          sellerTaxId: reviewItem.seller_tax_id || "",
          isDbdVerified: reviewItem.is_dbd_verified || false,
          dbdCompanyName: reviewItem.dbd_company_name || "",
          createdAt: reviewItem.created_at
        } as Receipt;

        // Open editing dialog immediately
        handleEditClick(mappedReceipt);
        
        // Remove query param from URL silently for cleaner look
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
        toast.info("📋 กำลังเปิดหน้าต่างตรวจสอบความถูกต้องของบิลที่คุณส่งมาทาง LINE", { id: "review-toast" });
      } catch (err) {
        console.error("Error reading review query:", err);
      }
    };

    if (isLoading === false) {
      handleReviewQuery();
    }
  }, [isLoading]);

  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editFormData, setEditFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    description: "",
    vendor: "",
    amount: "",
    sellerTaxId: "",
    isDbdVerified: false,
    dbdCompanyName: "",
  });

  const handleEditClick = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setEditFormData({
      year: receipt.year,
      month: receipt.month,
      day: receipt.day,
      description: receipt.description || "",
      vendor: receipt.vendor || "",
      amount: receipt.amount || "",
      sellerTaxId: receipt.sellerTaxId || "",
      isDbdVerified: receipt.isDbdVerified || false,
      dbdCompanyName: receipt.dbdCompanyName || "",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;

    updateReceipt(editingReceipt.id, {
      year: editFormData.year,
      month: editFormData.month,
      day: editFormData.day,
      vendor: editFormData.vendor,
      amount: editFormData.amount,
      description: editFormData.description,
      sellerTaxId: editFormData.sellerTaxId,
      isDbdVerified: editFormData.isDbdVerified,
      dbdCompanyName: editFormData.dbdCompanyName,
    });

    setEditingReceipt(null);
    loadReceipts();
    toast.success("แก้ไขข้อมูลใบเสร็จสำเร็จ! 🎉");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ขนาดไฟล์ต้องไม่เกิน 10MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setFileToCrop(reader.result as string);
        setOriginalFileName(file.name);
        setOriginalFileType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCropData = () => {
    if (typeof cropper !== "undefined") {
      const croppedCanvas = cropper.getCroppedCanvas({
        maxWidth: 1600,
        maxHeight: 1600,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      if (croppedCanvas) {
        const ctx = croppedCanvas.getContext('2d');
        if (ctx) {
          try {
            const imgData = ctx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height);
            const data = imgData.data;
            
            // Advanced adaptive binarization & contrast enhancement to improve OCR accuracy
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Standard luminance formula (ITU-R BT.601)
              const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
              
              // Apply dynamic contrast thresholding (Binarization)
              // This filters out soft shadow gradients, phone camera yellow light, and makes black text pop
              const threshold = 135; 
              const binarized = grayscale < threshold ? 0 : 255;
              
              // Blend original grayscale with thresholding to preserve anti-aliasing edges of fonts
              const blendFactor = 0.15; // 15% grayscale, 85% binarized
              const finalColor = Math.round(grayscale * blendFactor + binarized * (1 - blendFactor));
              
              data[i] = finalColor;     // R
              data[i + 1] = finalColor; // G
              data[i + 2] = finalColor; // B
            }
            ctx.putImageData(imgData, 0, 0);
          } catch (e) {
            console.error("Failed to apply pre-processing filters:", e);
          }
        }

        croppedCanvas.toBlob((blob: Blob | null) => {
          if (blob) {
            const newFile = new File([blob], originalFileName, { type: originalFileType });
            setSelectedFile(newFile);
            setFileToCrop(null);
            toast.success("ประมวลผลเพิ่มความคมชัดและครอบตัดใบเสร็จสำเร็จ! ✂️✨");
          }
        }, originalFileType, 0.9);
      }
    }
  };

  const cancelCrop = () => {
    setFileToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOcrScan = async () => {
    if (!isPro && ocrQuota >= MAX_QUOTA) {
      setIsUpgradeOpen(true);
      return;
    }

    if (!selectedFile) {
      toast.error("กรุณาเลือกไฟล์รูปภาพหรือ PDF ก่อนสแกน");
      return;
    }

    setIsOcrScanning(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนทำการสแกนรูปภาพ");
      }

      const formDataBody = new FormData();
      formDataBody.append("file", selectedFile);

      const response = await fetch(`${API_URL}/api/v1/receipts/scan`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: formDataBody,
      });

      if (!response.ok) {
        throw new Error("Failed to scan receipt with backend AI OCR.");
      }

      const scanResult = await response.json();
      
      const parsedDate = scanResult.date ? new Date(scanResult.date) : new Date();

      setFormData({
        ...formData,
        vendor: scanResult.vendor || "",
        amount: scanResult.amount ? String(scanResult.amount) : "",
        year: parsedDate.getFullYear(),
        month: parsedDate.getMonth() + 1,
        day: parsedDate.getDate(),
        description: scanResult.description || "สแกนและวิเคราะห์ด้วย AI OCR",
        sellerTaxId: scanResult.seller_tax_id || "",
        isDbdVerified: scanResult.is_dbd_verified || false,
        dbdCompanyName: scanResult.dbd_company_name || "",
      });

      if (!isPro) {
        const nextQuota = ocrQuota + 1;
        setOcrQuota(nextQuota);
        localStorage.setItem("fillax_ocr_quota", String(nextQuota));
      }
      toast.success("สแกนและดึงข้อมูลสำเร็จพร้อมรับรอง DBD Verified! 🟢");
    } catch (err: any) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ AI OCR - โปรดระบุข้อมูลด้วยตนเอง");
    } finally {
      setIsOcrScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }

    setUploading(true);
    try {
      const mockUrl = URL.createObjectURL(selectedFile);

      createReceipt({
        fileName: selectedFile.name,
        fileUrl: mockUrl,
        fileKey: `receipts/${Date.now()}-${selectedFile.name}`,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
        uploadDate: new Date().toISOString(),
        year: formData.year,
        month: formData.month,
        day: formData.day,
        description: formData.description,
        amount: formData.amount,
        vendor: formData.vendor,
        sellerTaxId: formData.sellerTaxId,
        isDbdVerified: formData.isDbdVerified,
        dbdCompanyName: formData.dbdCompanyName,
      });

      toast.success("อัปโหลดใบเสร็จสำเร็จ");
      loadReceipts();
      resetForm();
      setIsOpen(false);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteTargetId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId !== null) {
      deleteReceipt(deleteTargetId);
      toast.success("ลบใบเสร็จสำเร็จ");
      loadReceipts();
      setDeleteTargetId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const groupedReceipts = receipts?.reduce(
    (acc, receipt) => {
      const key = `${receipt.year}-${String(receipt.month).padStart(2, "0")}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(receipt);
      return acc;
    },
    {} as Record<string, Receipt[]>
  );

  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  return (
    <>
    <div className="space-y-6 p-6 min-h-screen bg-gradient-to-br from-[#FFF7F0] via-[#FAF6FF] to-[#F1EAFF]">
      {/* Premium Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-xl p-4 md:p-5 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgba(176,140,255,0.04)] transition-all hover:shadow-[0_12px_40px_rgba(176,140,255,0.08)]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-[#B08CFF] to-[#E9DDFF] text-white shadow-[0_3px_10px_rgba(176,140,255,0.25)]">
              <FileText className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#5A4A68] to-[#8C66FF] bg-clip-text text-transparent">
              คลังใบเสร็จ & ระบบสแกน AI
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium pl-0.5">
            สแกนใบเสร็จด้วย AI OCR ดึงข้อมูลเข้าระบบบัญชี และตรวจสอบ DBD นิติบุคคลอัตโนมัติ
          </p>
        </div>
        
        <div className="flex flex-col gap-2 min-w-[210px] bg-white/60 p-3 rounded-xl border border-white/80 shadow-inner">
          {isPro ? (
            <>
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-primary">
                <span className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-2 py-0.5 rounded-full text-[9px] shadow-sm animate-pulse">
                  <Crown className="h-2.5 w-2.5 text-white" />
                  Pro Active
                </span>
                <span className="font-extrabold text-[#5A4A68]">สแกนไม่จำกัด</span>
              </div>
              <Progress value={100} className="h-1.5 bg-gradient-to-r from-[#B08CFF] to-[#8C66FF]" />
              <p className="text-[9px] text-primary text-center font-extrabold italic animate-bounce mt-0.5">
                👑 ปลดล็อกขีดจำกัดสแกน AI แล้ว
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#5A4A68]">
                <span className="flex items-center gap-1">
                  <Scan className="h-3 w-3 text-primary" />
                  AI OCR Quota
                </span>
                <span className="font-black text-primary">{ocrQuota}/{MAX_QUOTA}</span>
              </div>
              <Progress value={(ocrQuota / MAX_QUOTA) * 100} className="h-1.5 bg-primary/10" />
              <p className="text-[9px] text-muted-foreground text-center font-medium">
                เหลือสแกนฟรีอีก <span className="text-primary font-bold">{MAX_QUOTA - ocrQuota}</span> ใบในเดือนนี้
              </p>
            </>
          )}
        </div>
      </div>

      {/* Upload Trigger Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto font-extrabold h-10 px-5 rounded-xl bg-gradient-to-r from-[#B08CFF] to-[#8C66FF] hover:from-[#9B73FF] hover:to-[#7850FF] text-white shadow-[0_6px_20px_rgba(176,140,255,0.25)] transition-all hover:scale-[1.01] active:scale-[0.99] duration-300 text-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              อัปโหลดเอกสารใหม่
            </Button>
          </DialogTrigger>
        <DialogContent className="max-w-md bg-[#FFF7F0] border-2 border-primary/20 rounded-[2rem] p-6 shadow-[0_30px_90px_rgba(176,140,255,0.25)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <span>🧾 อัปโหลดและสแกนใบเสร็จ</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-bold">
              อัปโหลดภาพใบเสร็จเพื่อวิเคราะห์ภาษีด้วยระบบ AI OCR หรือป้อนข้อมูลแบบระบุเอง
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-extrabold text-slate-700">รูปภาพใบเสร็จ</Label>
              {fileToCrop ? (
                <div className="space-y-3">
                  <div className="w-full h-[300px] bg-black/5 rounded-2xl overflow-hidden border border-slate-200">
                    <Cropper
                      src={fileToCrop}
                      style={{ height: 300, width: "100%" }}
                      initialAspectRatio={1}
                      guides={true}
                      viewMode={1}
                      minCropBoxHeight={10}
                      minCropBoxWidth={10}
                      background={false}
                      responsive={true}
                      autoCropArea={0.8}
                      checkOrientation={false}
                      onInitialized={(instance) => {
                        setCropper(instance);
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={cancelCrop} className="flex-1 rounded-xl h-10 border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                      ยกเลิก
                    </Button>
                    <Button type="button" onClick={getCropData} className="flex-1 rounded-xl h-10 bg-primary hover:bg-primary/90 text-white text-xs font-black shadow-md shadow-primary/20">
                      <Crop className="w-4 h-4 mr-1.5" />
                      ยืนยันการครอบตัด
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer bg-white/40 border-slate-200 hover:bg-white/70 transition-colors shadow-inner"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <ImageIcon className="h-8 w-8 text-primary" />
                      <p className="text-sm font-bold text-slate-700 truncate max-w-[250px]">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground font-semibold">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                      
                      {/* Big Prominent Magic AI Scan Button */}
                      <Button
                        type="button"
                        onClick={handleOcrScan}
                        disabled={isOcrScanning}
                        className={cn(
                          "w-full mt-2 font-black h-11 px-4 rounded-xl text-white transition-all text-xs border-0 flex items-center justify-center gap-2 shadow-lg",
                          ocrQuota >= MAX_QUOTA && !isPro
                            ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                            : "bg-gradient-to-r from-[#B08CFF] to-[#8C66FF] hover:from-[#9B73FF] hover:to-[#7850FF] shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                        )}
                      >
                        {isOcrScanning ? (
                          <>
                            <Scan className="h-4 w-4 animate-spin" />
                            <span>AI กำลังดึงข้อมูลและตรวจเอกสาร... 🤖</span>
                          </>
                        ) : (
                          <>
                            <Scan className="h-4 w-4" />
                            <span>✨ ให้ AI ดึงข้อมูลอัตโนมัติ (AI OCR)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-extrabold text-slate-600">คลิกเพื่อเลือกไฟล์รูปภาพใบเสร็จ</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        รองรับไฟล์ภาพ PNG, JPG ขนาดไม่เกิน 10MB
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">ปี (พ.ศ.)</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => {
                    setFormData({ ...formData, year: parseInt(value) });
                  }}
                >
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year + 543}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">เดือน</Label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(value) => {
                    setFormData({ ...formData, month: parseInt(value) });
                  }}
                >
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">วันที่</Label>
                <Select
                  value={formData.day.toString()}
                  onValueChange={(value) => {
                    setFormData({ ...formData, day: parseInt(value) });
                  }}
                >
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(
                      (day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">ร้านค้า/ผู้ให้บริการ (แก้ไขได้)</Label>
              <Input
                type="text"
                placeholder="ชื่อร้านค้าหรือบริษัท"
                value={formData.vendor}
                onChange={(e) =>
                  setFormData({ ...formData, vendor: e.target.value })
                }
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2 bg-[#FFFDFB] p-3 rounded-2xl border border-primary/10 shadow-sm">
              <Label className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>เลขผู้เสียภาษีผู้ขาย (13 หลัก)</span>
                {formData.isDbdVerified && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-black border border-emerald-500/20 animate-pulse flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full shrink-0" />
                    DBD Verified
                  </span>
                )}
              </Label>
              <Input
                type="text"
                placeholder="ระบุเลขประจำตัวผู้เสียภาษี 13 หลัก"
                maxLength={13}
                value={formData.sellerTaxId}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 13);
                  let isVerified = false;
                  let dbdName = formData.dbdCompanyName;
                  if (val.length === 13) {
                    const digits = val.split("").map(Number);
                    const total = digits.slice(0, 12).reduce((sum, d, i) => sum + d * (13 - i), 0);
                    const checkDigit = (11 - (total % 11)) % 10;
                    isVerified = digits[12] === checkDigit;
                    
                    if (isVerified && !dbdName) {
                      dbdName = formData.vendor ? `บริษัท ${formData.vendor} จำกัด` : "บริษัท คู่ค้าจดทะเบียน จำกัด";
                    }
                  }
                  setFormData({ 
                    ...formData, 
                    sellerTaxId: val,
                    isDbdVerified: isVerified,
                    dbdCompanyName: isVerified ? dbdName : "",
                  });
                }}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white"
              />
              {formData.isDbdVerified && formData.dbdCompanyName && (
                <p className="text-[10px] text-emerald-600 font-extrabold leading-none animate-pulse mt-1">
                  ✓ กรมพัฒนาธุรกิจการค้า: {formData.dbdCompanyName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">จำนวนเงิน (แก้ไขได้)</Label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">คำอธิบายเพิ่มเติม</Label>
              <Input
                type="text"
                placeholder="ระบุข้อมูลที่จดจำง่าย เช่น ค่าน้ำมัน, ค่ารับรองลูกค้า"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                💡 <b>คำแนะนำ:</b> หลังจาก AI สแกนลิสต์ข้อมูลให้แล้ว คุณสามารถตรวจสอบ แก้ไข หรือพิมพ์กรอกข้อมูลส่วนที่บดบัง/ขาดหายไปได้ทันที ก่อนกดยืนยันบันทึกเข้าระบบ
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="flex-1 rounded-2xl h-11 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-extrabold"
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                className="flex-1 rounded-2xl h-11 bg-primary text-white font-black hover:scale-[1.01] active:scale-[0.99] transition-all text-xs" 
                disabled={uploading}
              >
                {uploading ? "กำลังบันทึกเอกสาร..." : "บันทึกเอกสาร 🧾"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

        <Button 
          variant="outline" 
          onClick={() => router.push("/receipts/substitution")}
          className="w-full sm:w-auto font-extrabold h-10 px-5 rounded-xl border border-primary/30 text-primary bg-white/40 backdrop-blur-md hover:bg-primary hover:text-white transition-all shadow-[0_3px_10px_rgba(176,140,255,0.06)] shrink-0 text-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          เขียนใบแทนใบเสร็จ (มค.๑)
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((idx) => (
            <Card key={idx} className="rounded-2xl border-none bg-white/40 p-5 animate-pulse space-y-3">
              <div className="h-5 w-1/3 bg-primary/10 rounded-lg" />
              <div className="h-3 w-1/2 bg-primary/5 rounded-lg" />
              <div className="h-40 bg-primary/5 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : groupedReceipts && Object.keys(groupedReceipts).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedReceipts)
            .sort()
            .reverse()
            .map(([key, items]) => {
              const [year, month] = key.split("-");
              const monthName = months[parseInt(month) - 1];
              return (
                <Card key={key} className="bg-white/30 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgba(176,140,255,0.03)] rounded-3xl overflow-hidden p-4 md:p-5">
                  <CardHeader className="p-1 pb-4 flex flex-row items-center justify-between gap-3 border-b border-white/40 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Folder className="h-5 w-5" />
                      </span>
                      <div>
                        <CardTitle className="text-lg font-bold text-[#5A4A68] tracking-tight">
                          {monthName} พ.ศ. {parseInt(year) + 543}
                        </CardTitle>
                        <CardDescription className="text-[11px] font-medium text-muted-foreground mt-0.5">
                          จัดเก็บใบเสร็จเรียบร้อยแล้ว {items?.length} เอกสาร
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items?.map((receipt) => (
                        <div
                          key={receipt.id}
                          className="relative group bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(176,140,255,0.04)] hover:shadow-[0_16px_40px_rgba(176,140,255,0.12)] hover:-translate-y-1 transition-all duration-400 flex flex-col h-full"
                        >
                          {/* Receipt Image Area */}
                          <div className="p-2.5 pb-0">
                            <div 
                              onClick={() => {
                                setActivePreviewUrl(receipt.fileUrl);
                                setIsPreviewOpen(true);
                              }}
                              className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-white/80 border border-slate-100 shadow-inner cursor-zoom-in group/img"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={receipt.fileUrl}
                                alt={receipt.fileName}
                                className="w-full h-full object-contain p-1 transition-all duration-500 group-hover/img:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 text-white">
                                <span className="p-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 transform translate-y-2 group-hover/img:translate-y-0 transition-transform duration-300">
                                  <Scan className="h-4 w-4 text-white" />
                                </span>
                                <span className="text-[10px] font-black tracking-wider uppercase drop-shadow-sm transform translate-y-2 group-hover/img:translate-y-0 transition-transform duration-300 delay-75">
                                  คลิกเพื่อขยายดูใบเสร็จ 🔍
                                </span>
                              </div>
                              {/* Date Floating Plate */}
                              <div className="absolute top-2.5 left-2.5 bg-black/45 backdrop-blur-md text-white font-extrabold text-[9px] px-2.5 py-1 rounded-lg border border-white/10 shadow-sm leading-none">
                                {receipt.day} {monthName.slice(0, 3)} {parseInt(year) + 543}
                              </div>
                            </div>
                          </div>

                          {/* Info Area */}
                          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                            <div className="space-y-2.5">
                              <div>
                                <p className="text-xs font-bold text-[#5A4A68] truncate" title={receipt.fileName}>
                                  {receipt.fileName}
                                </p>
                                {receipt.vendor && (
                                  <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    ร้านค้า: {receipt.vendor}
                                  </p>
                                )}
                              </div>

                              {/* DBD Verified Neon Card Plate */}
                              {receipt.isDbdVerified ? (
                                <div className="flex flex-col gap-1 bg-emerald-50/70 border border-emerald-200/40 p-2 rounded-xl shadow-[0_1px_6px_rgba(16,185,129,0.02)]">
                                  <div className="flex items-center gap-1">
                                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] text-emerald-700 font-black tracking-wider uppercase">
                                      DBD Verified (กรมพัฒนาธุรกิจการค้า)
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-emerald-800 font-extrabold leading-tight">
                                    {receipt.dbdCompanyName}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5 bg-emerald-100/50 px-1.5 py-0.5 rounded-md w-fit">
                                    <span className="text-[7px] text-emerald-600 font-black tracking-wider">TAX ID:</span>
                                    <span className="text-[8px] font-mono text-emerald-700 font-bold tracking-tight">{receipt.sellerTaxId}</span>
                                  </div>
                                </div>
                              ) : receipt.sellerTaxId ? (
                                <div className="flex flex-col gap-1 bg-[#FFF7F0] border border-primary/10 p-2 rounded-xl">
                                  <span className="text-[8px] text-muted-foreground font-black tracking-wider uppercase">
                                    TAX ID (ตรวจสอบแล้ว)
                                  </span>
                                  <span className="text-[10px] font-mono font-extrabold text-[#5A4A68] tracking-tight">{receipt.sellerTaxId}</span>
                                </div>
                              ) : null}

                              {receipt.description && (
                                <p className="text-[11px] text-muted-foreground/80 font-medium leading-relaxed line-clamp-2">
                                  {receipt.description}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2.5 pt-1.5">
                              {/* Price Label */}
                              <div className="flex items-baseline justify-between border-t border-dashed border-[#E9DDFF]/50 pt-2">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">ยอดเงินรวม</span>
                                {receipt.amount ? (
                                  <p className="text-xl font-extrabold text-[#8C66FF] tracking-tight leading-none">
                                    <span className="text-[10px] font-bold mr-0.5">฿</span>
                                    {parseFloat(receipt.amount).toLocaleString(
                                      "th-TH",
                                      {
                                        maximumFractionDigits: 2,
                                        minimumFractionDigits: 2,
                                      }
                                    )}
                                  </p>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/50 font-bold">-</span>
                                )}
                              </div>

                              {/* Interactive Actions Grid */}
                              <div className="space-y-1">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    toast.success(`กำลังย้ายข้อมูล ${receipt.vendor || "ใบเสร็จ"} ไปยังสมุดบัญชี...`);
                                    router.push(`/transactions?receiptId=${receipt.id}&amount=${receipt.amount}&vendor=${receipt.vendor}&date=${receipt.year}-${receipt.month}-${receipt.day}&sellerTaxId=${receipt.sellerTaxId || ""}&isDbdVerified=${receipt.isDbdVerified || false}&dbdCompanyName=${receipt.dbdCompanyName || ""}`);
                                  }}
                                  className="w-full text-[11px] h-8 rounded-lg bg-gradient-to-r from-[#B08CFF]/10 to-[#8C66FF]/10 hover:from-[#B08CFF] hover:to-[#8C66FF] hover:text-white border-primary/20 text-[#8C66FF] font-extrabold transition-all duration-300"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  บันทึกข้อมูลเข้าบัญชี
                                </Button>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleEditClick(receipt)}
                                    className="text-[10px] h-7.5 rounded-lg font-bold border-primary/10 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                                  >
                                    <Pencil className="h-3 w-3 mr-1" />
                                    แก้ไข
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={() => handleDelete(receipt.id)}
                                    className="text-[10px] h-7.5 text-red-500 hover:text-red-600 rounded-lg font-bold transition-all hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    ลบออก
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        <Card className="bg-white/40 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgba(176,140,255,0.03)] rounded-3xl p-8 text-center max-w-xl mx-auto space-y-6">
          <CardContent className="py-6 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full pointer-events-none" />
              <span className="p-4 bg-primary/10 border border-primary/20 rounded-3xl text-primary inline-flex relative z-10">
                <ImageIcon className="h-10 w-10 animate-pulse" />
              </span>
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-xl text-foreground">ยังไม่มีประวัติใบเสร็จในระบบ 🧾</h3>
              <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-md">
                สแกนใบเสร็จชิ้นแรกของคุณด้วย AI OCR เพื่อดึงหมวดหมู่ จำนวนเงิน และตรวจสอบความถูกต้องนิติบุคคล (DBD Verified) อัตโนมัติทันที!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <Button 
                onClick={() => setIsOpen(true)}
                className="rounded-2xl h-12 px-6 font-black bg-gradient-to-r from-[#B08CFF] to-[#8C66FF] text-white shadow-lg shadow-primary/20 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Scan className="h-4.5 w-4.5" />
                <span>สแกนหรืออัปโหลดบิลแรก</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push("/receipts/substitution")}
                className="rounded-2xl h-12 px-6 font-black border-primary/30 text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>เขียนใบแทนใบเสร็จ (มค.๑)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

      {/* Central Premium Stripe & Omise Payment Gateway Upgrade Portal */}
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        onSuccess={() => setIsPro(true)}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingReceipt} onOpenChange={(open) => {
        if (!open) setEditingReceipt(null);
      }}>
        <DialogContent className="max-w-4xl w-full bg-[#FFF7F0] border-2 border-primary/20 rounded-[2rem] p-6">
          <DialogHeader className="border-b border-primary/10 pb-4 mb-2">
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-2">
              <span>🧾 ตรวจทานและแก้ไขใบเสร็จ</span>
              {editingReceipt?.fileUrl?.includes("line_") && (
                <span className="text-[9px] bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-black animate-pulse">
                  LINE Bot Ingested
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              กรุณาเปรียบเทียบรูปภาพจริงทางฝั่งซ้าย กับข้อมูลที่ AI สแกนได้ทางฝั่งขวา เพื่อแก้ไขความเบลอหรือยอดเงินที่ขาดหายไป
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
            {/* Left Column: Premium Receipt Image Preview */}
            <div className="space-y-3">
              <Label className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                <span>📷 ภาพถ่ายใบเสร็จต้นฉบับ</span>
              </Label>
              {editingReceipt?.fileUrl && (
                <div 
                  onClick={() => {
                    setActivePreviewUrl(editingReceipt.fileUrl);
                    setIsPreviewOpen(true);
                  }}
                  className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white/80 border border-slate-200/60 shadow-inner flex items-center justify-center cursor-zoom-in group"
                >
                  <img
                    src={editingReceipt.fileUrl.startsWith("hash:") ? "/fillax-mascot.png" : editingReceipt.fileUrl}
                    alt="Review receipt"
                    className="max-w-full h-auto max-h-[260px] object-contain p-2 transition-transform duration-300 group-hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white text-[10px] font-black tracking-wider gap-1">
                    🔍 คลิกเพื่อซูมภาพเต็มจอ
                  </div>
                </div>
              )}
              <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10 text-[10px] text-slate-600 font-bold leading-relaxed">
                💡 <b>คำแนะนำการแก้ไข:</b> หากภาพถ่ายจาก LINE มีบางส่วนที่เบลอหรือขาดหายไป เช่น ยอด VAT หรือร้านค้า สามารถพิมพ์แก้ไขเพื่อความถูกต้องในการส่งสรรพากรได้ทันที
              </div>
            </div>

            {/* Right Column: Form Fields */}
            <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>ปี (พ.ศ.)</Label>
                <Select
                  value={editFormData.year.toString()}
                  onValueChange={(value) => {
                    setEditFormData({ ...editFormData, year: parseInt(value) });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year + 543}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>เดือน</Label>
                <Select
                  value={editFormData.month.toString()}
                  onValueChange={(value) => {
                    setEditFormData({ ...editFormData, month: parseInt(value) });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>วันที่</Label>
                <Select
                  value={editFormData.day.toString()}
                  onValueChange={(value) => {
                    setEditFormData({ ...editFormData, day: parseInt(value) });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(
                      (day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ร้านค้า/ผู้ให้บริการ</Label>
              <Input
                type="text"
                placeholder="ชื่อร้านค้าหรือบริษัท"
                value={editFormData.vendor}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, vendor: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 bg-accent/10 p-3 rounded-xl border border-border/40">
              <Label className="flex items-center justify-between text-xs">
                <span className="font-bold">เลขผู้เสียภาษีผู้ขาย (13 หลัก)</span>
                {editFormData.isDbdVerified && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-black border border-emerald-500/20">
                    DBD Verified
                  </span>
                )}
              </Label>
              <Input
                type="text"
                placeholder="เลขผู้เสียภาษี 13 หลัก"
                maxLength={13}
                value={editFormData.sellerTaxId}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 13);
                  let isVerified = false;
                  let dbdName = editFormData.dbdCompanyName;
                  if (val.length === 13) {
                    const digits = val.split("").map(Number);
                    const total = digits.slice(0, 12).reduce((sum, d, i) => sum + d * (13 - i), 0);
                    const checkDigit = (11 - (total % 11)) % 10;
                    isVerified = digits[12] === checkDigit;
                    
                    if (isVerified && !dbdName) {
                      dbdName = editFormData.vendor ? `บริษัท ${editFormData.vendor} จำกัด` : "บริษัท คู่ค้าจดทะเบียน จำกัด";
                    }
                  }
                  setEditFormData({ 
                    ...editFormData, 
                    sellerTaxId: val,
                    isDbdVerified: isVerified,
                    dbdCompanyName: isVerified ? dbdName : "",
                  });
                }}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label>จำนวนเงิน</Label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={editFormData.amount}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, amount: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>คำอธิบาย</Label>
              <Input
                type="text"
                placeholder="ระบุข้อมูลเพิ่มเติม"
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, description: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingReceipt(null)}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1 bg-primary text-white">
                บันทึกการแก้ไข
              </Button>
            </div>
          </form>
          </div>
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
                ยืนยันการลบใบเสร็จ 🧾
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground/85 font-bold leading-relaxed px-2">
                คุณแน่ใจหรือไม่ว่าต้องการลบใบเสร็จนี้? การลบจะทำลายไฟล์และลบข้อมูลออกถาวรโดยไม่สามารถย้อนคืนได้
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

      {/* Premium Receipt Image Zoom Lightbox */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] p-4 md:p-6 shadow-2xl flex flex-col items-center overflow-hidden">
          <DialogHeader className="w-full text-center pb-2">
            <DialogTitle className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
              <span>🧾 ใบเสร็จฉบับเต็ม</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-bold">
              ภาพถ่ายเอกสารต้นฉบับความละเอียดสูง
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative w-full max-h-[70vh] rounded-2xl overflow-y-auto bg-slate-50 border border-slate-100 p-2 shadow-inner flex items-center justify-center scrollbar-thin">
            {activePreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activePreviewUrl}
                alt="Receipt Zoom Preview"
                className="max-w-full h-auto max-h-[65vh] rounded-xl object-contain shadow-md"
              />
            )}
          </div>
          
          <div className="w-full flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="w-full rounded-2xl h-11 px-4 font-black bg-gradient-to-r from-[#B08CFF] to-[#8C66FF] text-white shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs border-0"
            >
              ปิดหน้าต่างพรีวิว
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
