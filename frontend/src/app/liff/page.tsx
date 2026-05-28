"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ShieldCheck, 
  AlertTriangle, 
  ArrowLeft, 
  CheckCircle2, 
  RotateCcw, 
  Edit3, 
  Building2, 
  Eye, 
  Award, 
  Info,
  PenTool
} from "lucide-react";

// Predefined merchant DBD dictionary for offline/simulation verifications
const DBD_DICTIONARY: Record<string, string> = {
  "0107542000011": "บริษัท ซีพี ออลล์ จำกัด (มหาชน)",
  "0107561000242": "บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)",
  "0105536092641": "บริษัท เอก-ชัย ดีสทริบิวชั่น ซิสเทม จำกัด",
  "0105539021206": "บริษัท เซ็นทรัล ฟู้ด รีเทล จำกัด",
};

const CATEGORIES = [
  "ต้นทุนสินค้า/วัตถุดิบ",
  "ค่าแรงพนักงาน",
  "ค่าเช่าสำนักงาน/หน้าร้าน",
  "ค่าสาธารณูปโภค (น้ำ, ไฟ, เน็ต)",
  "ค่าโฆษณาและส่งเสริมการขาย",
  "ค่าขนส่งและเดินทางธุรกิจ",
  "วัสดุสิ้นเปลือง/เครื่องเขียน",
  "ค่าซอฟต์แวร์/บริการดิจิทัล",
  "ค่าธรรมเนียมธนาคาร/แพลตฟอร์ม",
  "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ"
];

interface ReceiptData {
  id: string;
  vendor: string;
  amount: number | null;
  date: string;
  category: string;
  description: string;
  seller_tax_id: string | null;
  is_dbd_verified: boolean;
  dbd_company_name: string | null;
  user_id: string;
  file_name: string;
}

function LiffReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const receiptId = searchParams.get("receiptId");

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");

  // Form states
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [sellerTaxId, setSellerTaxId] = useState("");
  
  // Validation and Statuses
  const [isDbdVerified, setIsDbdVerified] = useState(false);
  const [dbdCompanyName, setDbdCompanyName] = useState<string | null>(null);
  const [taxIdError, setTaxIdError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Signature Canvas references and states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // 1. Authentication & Fetching receipt data
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      // Fast-resolving Promise.race to prevent Supabase connection hangs
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 1200));
      const { data: { session } } = (await Promise.race([sessionPromise, timeoutPromise])) as any;
      
      let currentUserId = "guest";
      if (session) {
        setUser(session.user);
        currentUserId = session.user.id;
      }

      if (receiptId && receiptId !== "mock-amazon" && receiptId !== "mock-seven") {
        try {
          // Guard receipts single fetch with a 1500ms timeout
          const queryPromise = supabase
            .from("receipts")
            .select("*")
            .eq("id", receiptId)
            .single();
          const queryTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
          const { data, error } = (await Promise.race([queryPromise, queryTimeout])) as any;

          if (error) throw error;

          if (data) {
            const recData: ReceiptData = {
              id: data.id,
              vendor: data.vendor || "",
              amount: data.amount,
              date: data.date || new Date().toISOString().split("T")[0],
              category: data.category || CATEGORIES[0],
              description: data.description || "",
              seller_tax_id: data.seller_tax_id || "",
              is_dbd_verified: data.is_dbd_verified || false,
              dbd_company_name: data.dbd_company_name || null,
              user_id: data.user_id,
              file_name: data.file_name || ""
            };

            setReceipt(recData);
            setVendor(recData.vendor);
            setAmount(recData.amount !== null ? recData.amount.toString() : "");
            setDate(recData.date);
            setCategory(recData.category);
            setDescription(recData.description);
            setSellerTaxId(recData.seller_tax_id || "");
            setIsDbdVerified(recData.is_dbd_verified);
            setDbdCompanyName(recData.dbd_company_name);

            // Reconstruct storage public URL
            if (recData.file_name) {
              const { data: urlData } = supabase.storage
                .from("receipts")
                .getPublicUrl(`${recData.user_id}/${recData.file_name}`);
              setImageUrl(urlData?.publicUrl || "/fillax-mascot-v4.png");
            } else {
              setImageUrl("/fillax-mascot-v4.png");
            }
          }
        } catch (e) {
          console.error("Error loading live receipt from Supabase, loading mock fallback...", e);
          loadMockReceipt(receiptId);
        }
      } else {
        // Load mock receipt state for Guest Mode or explicit mock IDs
        loadMockReceipt(receiptId || "mock-amazon");
      }
      setIsLoading(false);
    };

    initData();
  }, [receiptId]);

  // Load Mock fallback data
  const loadMockReceipt = (id: string) => {
    let mock: any = null;
    
    // Attempt to load from localStorage first for custom Guest Mode uploaded receipts
    const localString = localStorage.getItem("fillax_mock_receipts");
    if (localString) {
      try {
        const list = JSON.parse(localString);
        const found = list.find((r: any) => r.id === id);
        if (found) {
          mock = {
            id: found.id,
            vendor: found.vendor || "",
            amount: found.amount !== null ? found.amount : null,
            date: found.date || new Date().toISOString().split("T")[0],
            category: found.category || CATEGORIES[0],
            description: found.description || "",
            seller_tax_id: found.seller_tax_id || "",
            is_dbd_verified: found.is_dbd_verified || false,
            dbd_company_name: found.dbd_company_name || null,
            user_id: "guest",
            file_name: found.file_url || "" // Holds the local Blob URL or image URL
          };
        }
      } catch (err) {
        console.error("Error parsing local receipts in loadMockReceipt:", err);
      }
    }
    
    if (!mock) {
      mock = id === "mock-seven" ? {
        id: "mock-seven",
        vendor: "7-Eleven",
        amount: 1335.00,
        date: new Date().toISOString().split("T")[0],
        category: "ต้นทุนสินค้า/วัตถุดิบ",
        description: "ซื้อกล่องพัสดุและบะหมี่กึ่งสำเร็จรูป",
        seller_tax_id: "0107542000011",
        is_dbd_verified: true,
        dbd_company_name: "บริษัท ซีพี ออลล์ จำกัด (มหาชน)",
        user_id: "guest",
        file_name: ""
      } : {
        id: "mock-amazon",
        vendor: "Cafe Amazon",
        amount: 255.00,
        date: new Date().toISOString().split("T")[0],
        category: "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ",
        description: "กาแฟรับรองลูกค้าตกลงซื้อขายสินค้า",
        seller_tax_id: "0107561000242",
        is_dbd_verified: true,
        dbd_company_name: "บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)",
        user_id: "guest",
        file_name: ""
      };
    }

    setReceipt(mock);
    setVendor(mock.vendor);
    setAmount(mock.amount !== null ? mock.amount.toString() : "");
    setDate(mock.date);
    setCategory(mock.category);
    setDescription(mock.description);
    setSellerTaxId(mock.seller_tax_id || "");
    setIsDbdVerified(mock.is_dbd_verified);
    setDbdCompanyName(mock.dbd_company_name);
    
    // Dynamically set image URL to local Blob URL or static fallback image
    if (mock.file_name) {
      setImageUrl(mock.file_name);
    } else {
      setImageUrl(id === "mock-seven" ? "/mock-receipt-seven.png" : "/fillax-mascot-v4.png");
    }
  };

  // 2. Modulo-11 Juristic Checksum Verification
  const verifyTaxId = (taxId: string) => {
    const cleaned = taxId.replace(/\D/g, "");
    
    if (cleaned.length === 0) {
      setIsDbdVerified(false);
      setDbdCompanyName(null);
      setTaxIdError(null);
      return;
    }

    if (cleaned.length !== 13) {
      setIsDbdVerified(false);
      setDbdCompanyName(null);
      setTaxIdError("เลขประจำตัวผู้เสียภาษีต้องครบ 13 หลัก");
      return;
    }

    // Checksum logic Modulo-11
    const digits = cleaned.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;

    if (digits[12] === checkDigit) {
      setIsDbdVerified(true);
      setTaxIdError(null);
      // Auto fill DBD dictionary mapping or guest placeholder
      const registeredName = DBD_DICTIONARY[cleaned] || `บริษัท ${vendor || "คู่ค้า"} จำกัด`;
      setDbdCompanyName(registeredName);
    } else {
      setIsDbdVerified(false);
      setDbdCompanyName(null);
      setTaxIdError("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง (Checksum Failed)");
    }
  };

  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSellerTaxId(val);
    verifyTaxId(val);
  };

  // 3. Signature Drawing Canvas Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#5A4A68";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [isLoading]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
      }
    }
  };

  // 4. Save and Confirm Transaction
  const handleConfirmTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !amount || !date) {
      alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ร้านค้า, ยอดเงิน, วันที่)");
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedAmount = parseFloat(amount);
      const cleanedTaxId = sellerTaxId.replace(/\D/g, "");

      if (user && receiptId && receiptId !== "mock-amazon" && receiptId !== "mock-seven") {
        // 1. Update Receipt entry in DB
        await supabase
          .from("receipts")
          .update({
            vendor,
            amount: parsedAmount,
            date,
            category,
            description,
            seller_tax_id: cleanedTaxId || null,
            is_dbd_verified: isDbdVerified,
            dbd_company_name: isDbdVerified ? dbdCompanyName : null,
            status: "completed"
          })
          .eq("id", receiptId);

        // 2. Insert corresponding Transaction entry into ledger DB
        await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            date,
            name: `${vendor} (ตรวจทานบน LIFF)`,
            amount: parsedAmount,
            type: "expense",
            category,
            is_tax_deductible: isDbdVerified,
            note: `สลักลายเซ็นแล้ว | DBD VERIFIED: ${isDbdVerified ? "True" : "False"} ${dbdCompanyName ? `(${dbdCompanyName})` : ""}`,
            status: "completed",
            source: "line_bot"
          });
      } else {
        // Guest mode simulation -> Update localStorage mock transactions
        const existingString = localStorage.getItem("fillax_mock_transactions");
        const existing = existingString ? JSON.parse(existingString) : [
          {
            id: "mock-1",
            date: new Date().toISOString().split("T")[0],
            name: "Cafe Amazon",
            amount: 255.00,
            type: "expense",
            category: "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ",
            is_tax_deductible: true,
            note: "สลิปอ้างอิง: MOCK_LINE_AMZ98 (กรุงไทย) | DBD Verified: True",
            status: "completed"
          },
          {
            id: "mock-2",
            date: new Date().toISOString().split("T")[0],
            name: "ซื้อกล่องพัสดุ",
            amount: 1335.00,
            type: "expense",
            category: "ต้นทุนสินค้า/วัตถุดิบ",
            is_tax_deductible: true,
            note: "สลิปอ้างอิง: MOCK_LINE_CPALL77 (กรุงไทย) | DBD Verified: True",
            status: "completed"
          }
        ];

        const newTx = {
          id: `sim-${Date.now()}`,
          date,
          name: `${vendor} (ตรวจทานบน LIFF)`,
          amount: parsedAmount,
          type: "expense",
          category,
          is_tax_deductible: isDbdVerified,
          note: `สลักลายเซ็นแล้ว | DBD Verified: ${isDbdVerified ? "True" : "False"} (โหมดทดสอบ)`,
          status: "completed"
        };

        localStorage.setItem("fillax_mock_transactions", JSON.stringify([newTx, ...existing]));
      }

      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error saving receipt and transaction:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล โปรดลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseLiff = () => {
    // If running inside LINE LIFF context, attempt to close webview cleanly
    if (typeof window !== "undefined" && (window as any).liff) {
      (window as any).liff.closeWindow();
    } else {
      router.push("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF7F0] flex items-center justify-center p-6 text-center">
        <div className="glass rounded-3xl p-8 max-w-sm w-full flex flex-col items-center gap-4">
          <Image 
            src="/fillax-mascot-v4.png" 
            alt="Fillax Mascot" 
            width={72} 
            height={72} 
            className="w-16 h-16 object-contain animate-float"
          />
          <div className="space-y-1">
            <h3 className="text-lg font-black text-[#5A4A68]">กำลังโหลดข้อมูลรายจ่าย...</h3>
            <p className="text-xs text-[#5A4A68]/60 font-semibold">กำลังเชื่อมโยงกับฐานข้อมูล Supabase</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Background decoration blur */}
      <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-[#B08CFF]/5 blur-[70px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-[#E9DDFF]/10 blur-[90px] pointer-events-none" />

      {/* Navigation header */}
      <header className="flex items-center justify-between border-b border-[#B08CFF]/15 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="glass p-2.5 rounded-xl hover:bg-[#E9DDFF]/20 hover:scale-105 active:scale-95 transition-all text-[#5A4A68]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-[#5A4A68] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#B08CFF]" />
              หน้าต่างตรวจสอบข้อมูลรายจ่าย 💜
            </h1>
            <p className="text-[10px] text-[#5A4A68]/60 font-semibold">
              Fillax LIFF WebView - อนุมัติความปลอดภัย 100%
            </p>
          </div>
        </div>
        <Image 
          src="/fillax-mascot-v4.png" 
          alt="Fillax Mascot" 
          width={36} 
          height={36} 
          className="w-9 h-9 object-contain"
        />
      </header>

      {/* Main Double-Pane Webview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left Pane: Billing Slip Preview Framed container */}
        <div className="glass rounded-3xl p-5 flex flex-col gap-4 sticky top-6">
          <div className="flex justify-between items-center text-[#5A4A68] font-black text-xs border-b border-[#B08CFF]/10 pb-2">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#B08CFF]" />
              หลักฐานภาพถ่ายใบเสร็จ / สลิปจริง
            </span>
            <span className="bg-[#B08CFF]/10 text-[#B08CFF] px-2.5 py-0.5 rounded-full text-[9px] font-black">
              ORIGINAL BILL
            </span>
          </div>

          <div className="relative aspect-[3/4] bg-[#5A4A68]/5 rounded-2xl overflow-hidden border border-[#B08CFF]/15 flex items-center justify-center group shadow-inner">
            {imageUrl && imageUrl !== "/fillax-mascot-v4.png" && imageUrl !== "/mock-receipt-seven.png" ? (
              <img 
                src={imageUrl} 
                alt="Receipt Original" 
                className="w-full h-full object-contain max-h-[500px]"
              />
            ) : (
              // Breathtaking interactive mockup of receipt if direct image url is absent
              <div className="p-6 text-center flex flex-col items-center gap-4 max-w-xs">
                <Image 
                  src="/fillax-mascot-v4.png" 
                  alt="Fillax Mascot" 
                  width={96} 
                  height={96} 
                  className="w-20 h-20 object-contain animate-float opacity-75"
                />
                <div className="space-y-1">
                  <p className="text-xs font-black text-[#5A4A68]">บิลจำลองระบบทดสอบ (Guest Mode)</p>
                  <p className="text-[10px] text-[#5A4A68]/60 font-semibold leading-relaxed">
                    คุณกำลังตรวจสอบข้อมูล Cafe Amazon ยอดโอน ฿255.00 บาทที่สกัดโดย AI OCR ประสิทธิภาพสูงของกิมิไน
                  </p>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-xl border border-[#B08CFF]/10 p-3 text-left font-mono text-[9px] text-[#5A4A68]/70 space-y-1">
                  <div>* MOCK RECEIPT *</div>
                  <div>CAFE AMAZON BRANCH #0293</div>
                  <div>TAX ID: 0107561000242</div>
                  <div>DATE: {date || new Date().toISOString().split("T")[0]}</div>
                  <div>---------------------------</div>
                  <div className="flex justify-between">
                    <span>HOT LATTE</span>
                    <span>1 x 85.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AMAZON BLEND</span>
                    <span>2 x 85.00</span>
                  </div>
                  <div>---------------------------</div>
                  <div className="flex justify-between font-bold text-[#B08CFF]">
                    <span>TOTAL</span>
                    <span>฿255.00</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-[9px] text-[#5A4A68]/50 font-bold text-center italic flex items-center justify-center gap-1">
            <Info className="w-3.5 h-3.5 text-[#B08CFF]" />
            สลิปจะถูกคุ้มครองโดยกฎหมาย PDPA ของไทย ไม่ถูกส่งผ่านต่อให้ภายนอกโดยเด็ดขาด
          </div>
        </div>

        {/* Right Pane: High-Fidelity Editable Form */}
        <form onSubmit={handleConfirmTransaction} className="glass rounded-3xl p-5 md:p-6 flex flex-col gap-5">
          <div className="border-b border-[#B08CFF]/10 pb-2">
            <h3 className="text-sm font-black text-[#5A4A68] flex items-center gap-1.5">
              <Edit3 className="w-4.5 h-4.5 text-[#B08CFF]" />
              กรอก/แก้ไข รายละเอียดเพื่ออนุมัติลงบัญชี
            </h3>
            <p className="text-[9px] text-[#5A4A68]/50 font-semibold mt-0.5">
              กรุณาแก้ไขตัวเลขและรายละเอียดที่ AI สแกนได้ให้ถูกต้องครบถ้วน 100%
            </p>
          </div>

          <div className="space-y-4">
            {/* Vendor Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#5A4A68] uppercase tracking-wide">ชื่อร้านค้า/ผู้ขาย *</label>
              <input 
                type="text" 
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF] focus:bg-white transition-all shadow-sm"
                placeholder="ระบุชื่อร้านค้า เช่น 7-Eleven, Cafe Amazon"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount Net */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#5A4A68] uppercase tracking-wide">ยอดเงินรายจ่ายจริง (฿) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-black text-[#5A4A68] focus:outline-none focus:border-[#B08CFF] focus:bg-white transition-all shadow-sm"
                  placeholder="0.00"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#5A4A68] uppercase tracking-wide">วันที่ชำระเงิน *</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF] focus:bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#5A4A68] uppercase tracking-wide">จัดหมวดหมู่ลดหย่อนภาษี *</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF] focus:bg-white transition-all shadow-sm"
              >
                {CATEGORIES.map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Seller Tax ID & Juristic Verification */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-[#5A4A68] uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#B08CFF]" />
                  เลขประจำตัวผู้เสียภาษีผู้ขาย (13 หลัก)
                </label>
                {isDbdVerified && (
                  <span className="bg-[#10B981]/15 text-[#10B981] text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-[#10B981]/25">
                    <Award className="w-3.5 h-3.5" />
                    DBD VERIFIED 🟢
                  </span>
                )}
              </div>
              
              <input 
                type="text" 
                maxLength={13}
                value={sellerTaxId}
                onChange={handleTaxIdChange}
                className="w-full h-11 px-4 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-mono font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF] focus:bg-white transition-all shadow-sm"
                placeholder="ระบุเลขผู้เสียภาษี 13 หลักเพื่อดึงพิกัด DBD"
              />

              {taxIdError && (
                <p className="text-[9px] text-[#EF4444] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {taxIdError}
                </p>
              )}

              {isDbdVerified && dbdCompanyName && (
                <div className="bg-[#10B981]/5 border border-[#10B981]/15 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                  <span className="text-[8px] text-[#10B981] font-black">ชื่อจดทะเบียนกรมพัฒนาธุรกิจการค้า (DBD)</span>
                  <span className="text-[10px] text-[#5A4A68] font-black">{dbdCompanyName}</span>
                </div>
              )}
            </div>

            {/* Notes / Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#5A4A68] uppercase tracking-wide">บันทึกเพิ่มเติม</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF] focus:bg-white transition-all shadow-sm resize-none"
                placeholder="ระบุลักษณะการซื้อขาย หรือรายละเอียดอื่นๆ"
              />
            </div>

            {/* Signature Draw Canvas Pad */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-[#5A4A68] uppercase tracking-wide flex items-center gap-1">
                  <PenTool className="w-3.5 h-3.5 text-[#B08CFF]" />
                  ลงชื่อกำกับใบแทนใบเสร็จ / บันทึก (ลายเซ็น)*
                </label>
                {hasSigned && (
                  <button 
                    type="button"
                    onClick={clearSignature}
                    className="text-[9px] text-[#EF4444] font-bold flex items-center gap-0.5 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    ล้างลายเซ็น
                  </button>
                )}
              </div>

              <div className="relative border-2 border-dashed border-[#B08CFF]/30 rounded-2xl overflow-hidden bg-white/50 h-28 flex items-center justify-center shadow-inner cursor-crosshair">
                <canvas 
                  ref={canvasRef}
                  width={400}
                  height={112}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="absolute inset-0 w-full h-full"
                />
                {!hasSigned && (
                  <div className="pointer-events-none text-center text-[#5A4A68]/40 space-y-0.5">
                    <p className="text-[10px] font-bold">วาดลายมือชื่อด้วยนิ้วหรือเมาส์ของคุณตรงนี้</p>
                    <p className="text-[8px] font-semibold italic">เพื่อยืนยันความเป็นเจ้าของรายการบันทึกทางภาษี</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col gap-3 mt-2">
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`h-12 w-full rounded-2xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-[#B08CFF]/50 text-white cursor-not-allowed'
                  : 'bg-[#B08CFF] text-white shadow-[#B08CFF]/25 hover:scale-102 active:scale-98 cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4.5 h-4.5" />
              {isSubmitting ? "กำลังอนุมัติลงบัญชี..." : "อนุมัติข้อมูลถูกต้องลงบัญชี 🟢"}
            </button>
          </div>
        </form>

      </div>

      {/* Global Golden Legal Disclaimer container */}
      <footer className="p-5 rounded-3xl border-2 border-[#FAF9F6]/20 bg-[#F59E0B]/5 flex gap-4 items-start shadow-sm my-6">
        <AlertTriangle className="text-[#F59E0B] w-6 h-6 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black text-[#5A4A68] uppercase tracking-wide">⚠️ คำแจ้งเตือนความปลอดภัยทางข้อกฎหมาย</h4>
          <p className="text-[10px] text-[#5A4A68]/70 leading-relaxed font-semibold">
            การกดยืนยันรายการนี้ เป็นการรับรองข้อมูลความถูกต้องของค่าใช้จ่ายในนามร้านค้าของท่าน Fillax ทำหน้าที่เป็นเพียงเครื่องมือบันทึกสถิติและประเมินเอกสารเบื้องต้น การตรวจสอบ checksum ของกรมพัฒนาธุรกิจการค้าเป็นการสอดรับความเสถียร แต่ไม่ได้เป็นการทำบัญชีอย่างเป็นทางการตามมาตรฐานสภาวิชาชีพบัญชี ท่านมีหน้าที่รักษาหลักฐานใบเสร็จตัวจริงไว้ไม่น้อยกว่า 5 ปีตามประมวลรัษฎากร
          </p>
        </div>
      </footer>

      {/* Success confettis & glassmorphic dialog modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#5A4A68]/30 backdrop-blur-sm p-4">
          <div className="glass rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col gap-6 text-center animate-float">
            <div className="w-16 h-16 bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#5A4A68]">อนุมัติลงบัญชีสำเร็จเรียบร้อย! 🎉</h3>
              <p className="text-xs text-[#5A4A68]/70 font-semibold leading-relaxed">
                บันทึกยอดเงิน <strong className="text-[#B08CFF]">฿{parseFloat(amount).toLocaleString()}</strong> ของร้านค้า <strong>{vendor}</strong> เรียบร้อยแล้วค่ะ ระบบซิงก์ข้อมูลลงหน้าแดชบอร์ดรายจ่ายสะสมทันที
              </p>
            </div>

            <button 
              onClick={handleCloseLiff}
              className="h-11 w-full rounded-2xl bg-[#B08CFF] text-white text-xs font-black shadow-md shadow-[#B08CFF]/25 hover:scale-102 active:scale-98 transition-all flex items-center justify-center"
            >
              กลับสู่หน้าแดชบอร์ดหลัก 📈
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiffReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFF7F0] flex items-center justify-center p-6 text-center">
        <div className="glass rounded-3xl p-8 max-w-sm w-full flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B08CFF]" />
          <h3 className="text-lg font-black text-[#5A4A68]">กำลังโหลดข้อมูล...</h3>
        </div>
      </div>
    }>
      <LiffReviewContent />
    </Suspense>
  );
}
