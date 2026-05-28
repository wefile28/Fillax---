"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  FileText, 
  Printer, 
  RotateCcw, 
  PenTool, 
  AlertTriangle,
  Info,
  CheckCircle2,
  Building2,
  ArrowLeft
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";

interface LineItem {
  description: string;
  amount: number;
}

export default function SubstitutionPage() {
  // Form states
  const [sellerName, setSellerName] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [buyerName, setBuyerName] = useState("ห้างหุ้นส่วน/บริษัท ของฉัน");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  // List of line items
  const [items, setItems] = useState<LineItem[]>([
    { description: "ค่าแรงจัดเตรียมวัตถุดิบและแพ็คสินค้าลงกล่องพัสดุ", amount: 1200.00 }
  ]);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");

  // Signature canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Initialize canvas stroke styles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1E293B"; // Dark Slate stroke
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, []);

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
    
    // Save image to state dynamically
    setSignatureData(canvas.toDataURL());
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
        setSignatureData(null);
      }
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc || !newItemAmount) return;
    
    setItems([...items, {
      description: newItemDesc,
      amount: parseFloat(newItemAmount)
    }]);
    setNewItemDesc("");
    setNewItemAmount("");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  // Helper to format Thai Baht Text
  const formatBahtText = (num: number): string => {
    if (num === 0) return "ศูนย์บาทถ้วน";
    const THAI_NUMBER = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const THAI_UNIT = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    
    // Decimal separation
    const split = num.toFixed(2).split(".");
    let integerPart = parseInt(split[0]);
    let decimalPart = parseInt(split[1]);
    
    let text = "";
    
    if (integerPart > 0) {
      const digits = integerPart.toString().split("").map(Number);
      const len = digits.length;
      for (let i = 0; i < len; i++) {
        const d = digits[i];
        const unitIndex = len - 1 - i;
        if (d !== 0) {
          if (unitIndex === 1 && d === 1) {
            text += "สิบ";
          } else if (unitIndex === 1 && d === 2) {
            text += "ยี่สิบ";
          } else if (unitIndex === 0 && d === 1 && len > 1) {
            text += "เอ็ด";
          } else {
            text += THAI_NUMBER[d] + THAI_UNIT[unitIndex];
          }
        }
      }
      text += "บาท";
    }

    if (decimalPart === 0) {
      text += "ถ้วน";
    } else {
      const digits = decimalPart.toString().split("").map(Number);
      if (digits[0] === 1) text += "สิบ";
      else if (digits[0] === 2) text += "ยี่สิบ";
      else if (digits[0] !== 0) text += THAI_NUMBER[digits[0]] + "สิบ";
      
      if (digits[1] === 1 && digits[0] !== 0) text += "เอ็ดสตางค์";
      else if (digits[1] !== 0) text += THAI_NUMBER[digits[1]] + "สตางค์";
      else text += "สตางค์";
    }
    
    return text;
  };

  return (
    <DashboardShell>
      {/* Dynamic Style Override for Print Media query */}
      <style jsx global>{`
        @media print {
          /* Hide all UI layout shells and containers completely */
          aside, header, footer, form, button, nav, .glass, .absolute {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-container {
            display: block !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 15mm 20mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          /* Override dashboard container padding */
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="flex flex-col gap-6 md:gap-8 no-print">
        
        {/* Header navigation bar */}
        <header className="flex justify-between items-center border-b border-[#B08CFF]/15 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/receipts" className="glass p-2.5 rounded-xl hover:bg-[#E9DDFF]/20 text-[#5A4A68]">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#5A4A68] flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#B08CFF]" />
                ระบบสร้างใบแทนใบเสร็จรับเงิน (มค.๑) ✍️
              </h1>
              <p className="text-xs text-[#5A4A68]/60 font-semibold mt-1">
                สร้างเอกสารการรับจ่ายเงินสดที่ถูกต้องตามกฎหมายและพิมพ์ออกเป็น PDF ทันที
              </p>
            </div>
          </div>
          <button 
            onClick={handlePrint}
            className="h-10 px-4 rounded-xl bg-[#B08CFF] text-white text-xs font-black shadow hover:scale-102 transition-transform flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์หรือเซฟ PDF
          </button>
        </header>

        {/* Workspace Dual Pane split */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          
          {/* Left Pane: Interactive Step Form editor */}
          <form onSubmit={handleAddItem} className="glass rounded-3xl p-5 md:p-6 flex flex-col gap-5 border border-[#B08CFF]/15">
            <div className="border-b border-[#B08CFF]/10 pb-2">
              <h3 className="text-sm font-black text-[#5A4A68]">
                📝 กรอกข้อมูลเพื่อออกใบแทนใบเสร็จ
              </h3>
              <p className="text-[9px] text-[#5A4A68]/50 font-semibold mt-0.5">
                ป้อนข้อมูลคู่ค้าระดับบุคคล/ฟรีแลนซ์ที่ไม่มีเอกสารใบเสร็จอย่างเป็นทางการให้ครบถ้วน
              </p>
            </div>

            <div className="space-y-4">
              
              {/* Seller details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#B08CFF] uppercase tracking-wider border-b border-[#B08CFF]/5 pb-1">รายละเอียดผู้รับเงิน (ผู้ขายสินค้า/บริการ)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">ชื่อ-นามสกุล ผู้ขาย *</label>
                    <input 
                      type="text" 
                      required
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="เช่น นายมานะ รักเรียน"
                      className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">เลขประจำตัวประชาชน (13 หลัก) *</label>
                    <input 
                      type="text" 
                      required
                      maxLength={13}
                      value={sellerId}
                      onChange={(e) => setSellerId(e.target.value.replace(/\D/g, ""))}
                      placeholder="เช่น 1234567890123"
                      className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-mono font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">ที่อยู่ตามบัตรประชาชน *</label>
                  <input 
                    type="text" 
                    required
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    placeholder="เช่น 99/9 หมู่ 9 ต.บางพลี อ.บางพลี จ.สมุทรปราการ"
                    className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                  />
                </div>
              </div>

              {/* Buyer details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#B08CFF] uppercase tracking-wider border-b border-[#B08CFF]/5 pb-1">รายละเอียดผู้จ่ายเงิน (ร้านค้า/บริษัทของคุณ)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">ชื่อบริษัท/ร้านค้าผู้จ่ายเงิน *</label>
                    <input 
                      type="text" 
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide">วันที่ทำเอกสาร *</label>
                    <input 
                      type="date" 
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/60 border border-[#B08CFF]/20 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
                    />
                  </div>
                </div>
              </div>

              {/* Line items manager */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#B08CFF] uppercase tracking-wider border-b border-[#B08CFF]/5 pb-1">รายการสินค้า / ค่าบริการสะสม</h4>
                
                <div className="flex flex-col gap-2 bg-[#B08CFF]/5 p-3 rounded-xl border border-[#B08CFF]/10">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      placeholder="ป้อนรายการ เช่น ค่าส่งของด้วยมอเตอร์ไซค์"
                      className="flex-1 h-9 px-2.5 rounded-lg bg-white border border-[#B08CFF]/15 text-xs font-bold text-[#5A4A68]"
                    />
                    <input 
                      type="number" 
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      placeholder="ยอดเงิน (฿)"
                      className="w-24 h-9 px-2.5 rounded-lg bg-white border border-[#B08CFF]/15 text-xs font-black text-[#5A4A68]"
                    />
                    <button 
                      type="submit"
                      className="h-9 px-3.5 bg-[#B08CFF] text-white text-xs font-black rounded-lg hover:scale-102 shadow transition-transform cursor-pointer"
                    >
                      เพิ่ม
                    </button>
                  </div>
                  
                  {/* Items List */}
                  <div className="space-y-1.5 max-h-32 overflow-y-auto mt-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs font-bold text-[#5A4A68] bg-white/50 p-2 rounded-lg border border-[#B08CFF]/5">
                        <span className="truncate max-w-[200px]">{idx + 1}. {item.description}</span>
                        <div className="flex items-center gap-2">
                          <span>฿{item.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItem(idx)}
                            className="text-[#EF4444] text-[10px] hover:underline"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Electronic Signature touch canvas */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-[#5A4A68] uppercase tracking-wide flex items-center gap-1">
                    <PenTool className="w-3.5 h-3.5 text-[#B08CFF]" />
                    ลายเซ็นดิจิทัลของผู้รับเงิน (ผู้ขายสินค้า)*
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

                <div className="relative border-2 border-dashed border-[#B08CFF]/30 rounded-2xl overflow-hidden bg-white h-24 flex items-center justify-center shadow-inner cursor-crosshair">
                  <canvas 
                    ref={canvasRef}
                    width={500}
                    height={96}
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
                    <div className="pointer-events-none text-center text-[#5A4A68]/40">
                      <p className="text-[10px] font-bold">วาดลายเซ็นดิจิทัลของคู่ค้าตรงนี้ด้วยนิ้วหรือเมาส์</p>
                      <p className="text-[8px] font-semibold italic mt-0.5">ลบลายเซ็นเพื่อเซ็นกำกับใหม่ได้ตลอดเวลา</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </form>

          {/* Right Pane: Pixel-perfect real-time vector preview of official Thai มค.๑ sheet */}
          <div className="glass rounded-3xl p-6 border border-[#B08CFF]/15 bg-white shadow-lg overflow-x-auto">
            
            {/* Printable Container A4 page */}
            <div className="print-container bg-white text-black font-sans p-8 min-h-[750px] w-full max-w-full text-xs flex flex-col gap-6 select-none leading-relaxed border-2 border-double border-gray-400 rounded-xl relative shadow-md">
              
              {/* Document title */}
              <div className="text-center space-y-1.5 pb-4 border-b-2 border-black">
                <h2 className="text-base md:text-lg font-black tracking-wide text-black uppercase">ใบรับรองแทนใบเสร็จรับเงิน</h2>
                <h3 className="text-xs md:text-sm font-bold tracking-widest text-black">ตามประมวลรัษฎากร (มค.๑)</h3>
                
                <div className="flex justify-between items-end text-[10px] mt-4 font-semibold">
                  <div className="flex items-end gap-1">
                    <span>วันที่เขียนใบแทน:</span>
                    <span className="border-b border-dotted border-gray-600 font-bold px-2 min-w-[100px] text-center text-black">
                      {date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : "\u00a0"}
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <span>ส่วนราชการ / สถานประกอบการ:</span>
                    <span className="border-b border-dotted border-gray-600 font-black px-2 min-w-[180px] text-center text-black">
                      {buyerName || "\u00a0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date & Context details */}
              <div className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-end gap-1.5 flex-1 min-w-0">
                    <span className="shrink-0 text-black">ข้าพเจ้า</span>
                    <span className="flex-1 border-b border-dotted border-gray-600 text-center font-bold px-2 truncate min-h-[1.5rem] text-black">
                      {sellerName || "\u00a0"}
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5 flex-1 min-w-0">
                    <span className="shrink-0 text-black">เลขประจำตัวประชาชน</span>
                    <span className="flex-1 border-b border-dotted border-gray-600 text-center font-mono font-bold px-2 truncate min-h-[1.5rem] tracking-wider text-black">
                      {sellerId ? sellerId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, "$1-$2-$3-$4-$5") : "\u00a0"}
                    </span>
                  </div>
                </div>

                <div className="flex items-end gap-1.5 w-full min-w-0">
                  <span className="shrink-0 text-black">อยู่บ้านเลขที่</span>
                  <span className="flex-1 border-b border-dotted border-gray-600 text-left font-bold px-2 truncate min-h-[1.5rem] text-black">
                    {sellerAddress || "\u00a0"}
                  </span>
                </div>

                <div className="flex items-end gap-1.5 w-full min-w-0">
                  <span className="shrink-0 text-black">ได้รับเงินจาก</span>
                  <span className="flex-1 border-b border-dotted border-gray-600 text-center font-bold px-2 truncate min-h-[1.5rem] text-black">
                    {buyerName || "\u00a0"}
                  </span>
                  <span className="shrink-0 text-black">ดังรายการต่อไปนี้:</span>
                </div>
              </div>

              {/* Dynamic Items Table */}
              <div className="border border-black rounded-lg overflow-hidden mt-2">
                <table className="w-full border-collapse text-center text-[10px] leading-relaxed">
                  <thead>
                    <tr className="bg-gray-100 border-b border-black font-bold text-black">
                      <th className="border-r border-black p-2.5 w-12 font-bold">ลำดับที่</th>
                      <th className="border-r border-black p-2.5 font-bold text-left">รายการจ่าย</th>
                      <th className="border-r border-black p-2.5 w-32 font-bold">จำนวนเงิน (บาท)</th>
                      <th className="p-2.5 w-20 font-bold">สตางค์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr className="border-b border-black">
                        <td className="p-4 text-center text-gray-400 font-bold" colSpan={4}>ยังไม่มีรายการสินค้าพึงบันทึก</td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const split = item.amount.toFixed(2).split(".");
                        return (
                          <tr key={idx} className="border-b border-black font-medium text-black">
                            <td className="border-r border-black p-2.5 font-semibold">{idx + 1}</td>
                            <td className="border-r border-black p-2.5 text-left font-semibold">{item.description}</td>
                            <td className="border-r border-black p-2.5 text-right font-mono font-bold">{parseInt(split[0]).toLocaleString()}</td>
                            <td className="p-2.5 font-mono font-bold">{split[1]}</td>
                          </tr>
                        );
                      })
                    )}
                    {/* Totals row */}
                    <tr className="bg-gray-50 font-bold text-black">
                      <td className="border-r border-black p-2.5 font-bold text-left" colSpan={2}>
                        รวมทั้งสิ้น ({formatBahtText(totalAmount)})
                      </td>
                      <td className="border-r border-black p-2.5 text-right font-mono font-bold">
                        {parseInt(totalAmount.toFixed(2).split(".")[0]).toLocaleString()}
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        {totalAmount.toFixed(2).split(".")[1]}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Declarations and signature section */}
              <div className="flex flex-col gap-5 mt-4 pt-2">
                <div className="flex items-end gap-1.5 w-full min-w-0">
                  <span className="shrink-0 leading-relaxed text-black">ข้าพเจ้าขอรับรองว่ารายจ่ายข้างต้นนี้ เป็นการจ่ายจริงเพื่อวัตถุประสงค์ในการดำเนินกิจการค้าของ</span>
                  <span className="flex-1 border-b border-dotted border-gray-600 text-center font-bold px-2 truncate min-h-[1.5rem] text-black">
                    {buyerName || "\u00a0"}
                  </span>
                </div>
                <p className="leading-relaxed text-black">
                  โดยตรง และข้าพเจ้าไม่สามารถเรียกเอาใบเสร็จรับเงินอย่างเป็นทางการตามข้อกำหนดกฎหมายของประมวลรัษฎากรจากผู้รับเงินได้จริง
                </p>

                {/* Signature Panel */}
                <div className="grid grid-cols-2 gap-12 mt-8 text-center text-xs text-black">
                  {/* Left Signature Column (Payer) */}
                  <div className="flex flex-col items-center justify-end gap-2">
                    <div className="w-48 h-10 border-b border-solid border-gray-400 flex items-center justify-center relative">
                      <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-black tracking-wider shadow-sm uppercase animate-pulse">
                        อนุมัติดิจิทัลเรียบร้อย
                      </span>
                    </div>
                    <div className="text-[10px] font-bold mt-1">
                      ลงชื่อ ................................................................ ผู้จ่ายเงิน
                    </div>
                    <div className="text-[9.5px] text-gray-500 font-semibold">
                      ( {buyerName || "\u00a0"} )
                    </div>
                  </div>
                  
                  {/* Right Signature Column (Payee) */}
                  <div className="flex flex-col items-center justify-end gap-2">
                    <div className="w-48 h-10 border-b border-solid border-gray-400 flex items-center justify-center relative">
                      {signatureData ? (
                        <img 
                          src={signatureData} 
                          alt="Signature Preview" 
                          className="max-h-8 object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-300 italic font-normal">รอลายมือชื่อคู่ค้า</span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold mt-1">
                      ลงชื่อ ................................................................ ผู้รับเงิน
                    </div>
                    <div className="text-[9.5px] text-gray-500 font-semibold">
                      ( {sellerName || "\u00a0"} )
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Golden disclaimer */}
        <footer className="p-4 rounded-2xl border-2 border-[#FAF9F6]/20 bg-[#F59E0B]/5 flex gap-3.5 items-start shadow-sm mt-2 shrink-0">
          <AlertTriangle className="text-[#F59E0B] w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-[#5A4A68] uppercase tracking-wide">⚠️ ข้อควรทราบทางภาษีและกฎหมายในการใช้แบบฟอร์ม มค.๑</h4>
            <p className="text-[9.5px] text-[#5A4A68]/70 leading-relaxed font-semibold">
              ใบแทนใบเสร็จรับเงิน (มค.๑) เป็นเอกสารลดหย่อนรายจ่ายตามเกณฑ์กฎกระทรวงสรรพากรไทย <strong>อนุโลมให้ใช้ได้เฉพาะกรณีจ่ายเงินให้แก่บุคคลธรรมดาที่ไม่มีหน้าที่จดทะเบียนการค้า</strong> และไม่สามารถออกใบเสร็จรับเงินให้ได้ (เช่น ค่าขนส่งชั่วคราว, ค่าแรงรับจ้างแบกหาม) การนำไปใช้บันทึกรายจ่ายจำแลงที่ไม่มีธุรกรรมชำระเงินจริงถือเป็นความผิดอาญาแผ่นดินฐานทุจริตแบบฟอร์มเอกสารภาษีสรรพากรย้อนหลังค่ะ
            </p>
          </div>
        </footer>

      </div>
    </DashboardShell>
  );
}
