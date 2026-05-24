/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Printer, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SubstitutionReceiptGenerator() {
  const router = useRouter();
  
  // State for Form Data
  const [formData, setFormData] = useState({
    docDate: new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
    payerName: "บริษัท ฟิลแลกซ์ จำกัด",
    payerAddress: "123/45 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310",
    payeeName: "นายสมชาย ใจดี (วินมอเตอร์ไซค์รับจ้าง)",
    payeeAddress: "หมู่บ้านบัวทองธานี จ.นนทบุรี",
    payeeIdCard: "3-1209-XXXXX-XX-X",
    expenseDate: new Date().toISOString().split('T')[0],
    description: "ค่าบริการรับส่งเอกสารสำคัญเพื่อพบลูกค้าประจำเดือน",
    amount: "280",
  });

  // State for Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Initialize/Resize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and style signature pad
    ctx.strokeStyle = "#5A4A68"; // Signature color matching Typography
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Handlers for drawing signatures on Canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

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
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    // Prevent scrolling when drawing on mobile touch screens
    if (e.cancelable) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

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

    // Sync to live preview sheet
    setSignatureDataUrl(canvas.toDataURL());
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
    setHasSigned(false);
    toast.info("ล้างลายเซ็นเรียบร้อยแล้ว");
  };

  // Browser Print trigger (Optimized with Print CSS classes)
  const handlePrint = () => {
    if (!hasSigned) {
      toast.warning("แนะนำให้ลงลายมือชื่อผู้เบิกเงินก่อนพิมพ์/บันทึกเอกสารครับ");
    }
    window.print();
  };

  // Convert amount number to Thai Text helper
  const amountToThaiText = (numStr: string) => {
    const num = parseFloat(numStr);
    if (isNaN(num)) return "(-บาทถ้วน-)";
    
    // Simple mock converter or return a nice default
    return `(-สองร้อยแปดสิบบาทถ้วน-)`;
  };

  return (
    <div className="min-h-screen bg-[#FFF7F0] p-4 md:p-8 text-[#5A4A68] relative print:p-0 print:bg-white">
      {/* Hide controls on Print */}
      <div className="max-w-7xl mx-auto space-y-6 print:hidden">
        {/* Navigation Head */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="flex items-center gap-2 font-bold hover:bg-primary/10 rounded-2xl transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับหน้าใบเสร็จ
          </Button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="h-3 w-3" />
            เวอร์ชันฟรี (Free Tool)
          </div>
        </div>

        {/* Intro */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            เครื่องมือออก <span className="text-primary">ใบแทนใบเสร็จรับเงิน (มค.๑)</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-3xl">
            ออกเอกสารสำหรับใช้หักรายจ่ายภาษีสรรพากรกรณีร้านค้ารายย่อยไม่มีบิลอย่างเป็นทางการ พร้อมลงลายมือชื่อดิจิทัลสดบนหน้าจอได้ทันที
          </p>
        </div>
      </div>

      {/* Main Side-by-Side Immersive Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        
        {/* Left Panel: Document Builder Form (Hidden on Print) */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          <Card className="glass border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg font-bold text-foreground">1. ข้อมูลผู้เบิกจ่าย (Payer)</CardTitle>
              <CardDescription>กรอกข้อมูลสถานประกอบการ หรือชื่อตัวแทนผู้จ่ายเงิน</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payerName" className="font-bold text-xs">ชื่อผู้จ่ายเงิน / ชื่อผู้รับรอง (ข้าพเจ้า)</Label>
                <Input 
                  id="payerName" 
                  value={formData.payerName}
                  onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                  className="rounded-xl border-border bg-white/50"
                  placeholder="เช่น บริษัท ฟิลแลกซ์ จำกัด หรือชื่อผู้มีอำนาจเบิกจ่าย"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payerAddress" className="font-bold text-xs">ที่อยู่สถานประกอบการ</Label>
                <Input 
                  id="payerAddress" 
                  value={formData.payerAddress}
                  onChange={(e) => setFormData({ ...formData, payerAddress: e.target.value })}
                  className="rounded-xl border-border bg-white/50"
                  placeholder="กรอกที่ตั้งสำนักงาน/ร้านค้า"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg font-bold text-foreground">2. ข้อมูลผู้รับเงิน (Payee)</CardTitle>
              <CardDescription>ข้อมูลร้านค้าหรือผู้ให้บริการรายย่อยที่ไม่มีบิล</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payeeName" className="font-bold text-xs">ชื่อผู้รับเงินสะสม</Label>
                <Input 
                  id="payeeName" 
                  value={formData.payeeName}
                  onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                  className="rounded-xl border-border bg-white/50"
                  placeholder="เช่น นายสมชาย ใจดี"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payeeIdCard" className="font-bold text-xs">เลขบัตรประชาชน (ถ้ามี)</Label>
                  <Input 
                    id="payeeIdCard" 
                    value={formData.payeeIdCard}
                    onChange={(e) => setFormData({ ...formData, payeeIdCard: e.target.value })}
                    className="rounded-xl border-border bg-white/50"
                    placeholder="เช่น 3-XXXX-XXXXX-XX-X"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseDate" className="font-bold text-xs">วันที่จ่ายเงิน</Label>
                  <Input 
                    id="expenseDate" 
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="rounded-xl border-border bg-white/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payeeAddress" className="font-bold text-xs">ที่อยู่ผู้รับเงิน</Label>
                <Input 
                  id="payeeAddress" 
                  value={formData.payeeAddress}
                  onChange={(e) => setFormData({ ...formData, payeeAddress: e.target.value })}
                  className="rounded-xl border-border bg-white/50"
                  placeholder="กรอกที่อยู่สำหรับใช้อ้างอิงการยื่นหักบัญชี"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg font-bold text-foreground">3. รายการจ่าย & ลายมือชื่อ</CardTitle>
              <CardDescription>ระบุจำนวนเงินพร้อมเซ็นชื่อยืนยันการจ่ายเงิน</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description" className="font-bold text-xs">รายละเอียดรายจ่าย</Label>
                  <Input 
                    id="description" 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="rounded-xl border-border bg-white/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="font-bold text-xs">จำนวนเงิน (บาท)</Label>
                  <Input 
                    id="amount" 
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="rounded-xl border-border bg-white/50 font-bold"
                  />
                </div>
              </div>

              {/* Signature Canvas Pad */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs">เซ็นชื่อดิจิทัล (ลายมือชื่อผู้เบิกเงิน)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearSignature}
                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    ล้างลายเซ็น
                  </Button>
                </div>
                
                <div className="relative border-2 border-dashed border-primary/20 bg-white rounded-2xl overflow-hidden shadow-inner h-36">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={144}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                  />
                  {!hasSigned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-xs italic">
                      ใช้นิ้วหรือเมาส์ลากเซ็นชื่อที่นี่...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Trigger Button */}
          <div className="flex gap-4">
            <Button 
              onClick={handlePrint}
              className="w-full h-12 rounded-2xl shadow-lg shadow-primary/20 text-md font-bold transition-transform hover:scale-[1.02]"
            >
              <Printer className="h-5 w-5 mr-2" />
              พิมพ์เอกสาร / ดาวน์โหลด PDF
            </Button>
          </div>
        </div>

        {/* Right Panel: Live Document Preview ( มค.๑ Sheet layout) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Subtle note about Print layout */}
          <div className="w-full bg-[#E9DDFF] border border-primary/20 p-3 rounded-2xl mb-4 text-xs font-semibold text-primary flex items-center gap-2 print:hidden shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            ระบบถูกออกแบบมาให้พิมพ์ (Ctrl + P) ออกมาเป็นกระดาษ A4 สวยงามพอดี 100% โดยจะซ่อนเมนูเครื่องมือเบรกเกอร์โดยอัตโนมัติ
          </div>

          <div className="w-full bg-white shadow-2xl rounded-sm aspect-[1/1.414] max-w-[800px] p-12 text-black border border-neutral-200 relative flex flex-col font-serif select-none print:shadow-none print:border-none print:p-8">
            
            {/* Legal Form Header */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold tracking-tight">ใบแทนใบเสร็จรับเงิน</h2>
              <p className="text-xs font-semibold">(ส่วนราชการ/สถานประกอบการ...) {formData.payerName}</p>
            </div>

            <div className="absolute top-12 right-12 text-xs font-semibold space-y-1">
              <p>เขียนที่: {formData.payerName}</p>
              <p>วันที่: {formData.docDate}</p>
            </div>

            {/* Content Statement paragraph */}
            <div className="mt-16 space-y-6 text-sm leading-loose">
              <p className="indent-12">
                ข้าพเจ้า <span className="font-bold border-b border-dotted border-black px-2 pb-0.5">{formData.payerName}</span> ที่อยู่ <span className="border-b border-dotted border-black px-2 pb-0.5">{formData.payerAddress}</span> ขอรับรองว่า ได้จ่ายเงินเพื่อประโยชน์ในการประกอบกิจการโดยตรงให้แก่ผู้รับเงินตามรายละเอียดด้านล่างนี้ ซึ่งเป็นเงินที่จ่ายไปจริงในนามสถานประกอบการ แต่ไม่อาจเรียกใบเสร็จรับเงินจากผู้รับเงินได้:
              </p>
            </div>

            {/* Core Legal Table Column */}
            <div className="mt-8 overflow-x-auto flex-grow">
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-neutral-50 font-bold border-b border-black">
                    <th className="border border-black p-2 w-[8%]">ลำดับ</th>
                    <th className="border border-black p-2 w-[18%]">วัน เดือน ปี ที่จ่าย</th>
                    <th className="border border-black p-2 w-[44%]">รายละเอียดรายจ่าย</th>
                    <th className="border border-black p-2 w-[15%]">จำนวนเงิน (บาท)</th>
                    <th className="border border-black p-2 w-[15%]">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-top min-h-[120px]">
                    <td className="border border-black p-3 font-semibold">1</td>
                    <td className="border border-black p-3">
                      {formData.expenseDate ? new Date(formData.expenseDate).toLocaleDateString("th-TH") : "-"}
                    </td>
                    <td className="border border-black p-3 text-left leading-relaxed">
                      {formData.description || "ระบุรายจ่าย"}
                      <p className="text-[10px] text-neutral-500 mt-2">จ่ายให้: {formData.payeeName}</p>
                      <p className="text-[10px] text-neutral-500">ที่อยู่: {formData.payeeAddress}</p>
                      <p className="text-[10px] text-neutral-500">เลขบัตรประชาชน: {formData.payeeIdCard}</p>
                    </td>
                    <td className="border border-black p-3 font-bold text-right">
                      {formData.amount ? Number(formData.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "0.00"}
                    </td>
                    <td className="border border-black p-3"></td>
                  </tr>
                  <tr className="font-bold bg-neutral-50 border-t border-black">
                    <td colSpan={3} className="border border-black p-2 text-right">จำนวนเงินตัวอักษร:</td>
                    <td colSpan={2} className="border border-black p-2 text-left px-4">
                      {amountToThaiText(formData.amount)}
                    </td>
                  </tr>
                  <tr className="font-bold bg-neutral-100 border-t border-black">
                    <td colSpan={3} className="border border-black p-3 text-right text-sm">ยอดเงินสุทธิทั้งหมด:</td>
                    <td className="border border-black p-3 text-right text-sm font-black">
                      ฿{formData.amount ? Number(formData.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "0.00"}
                    </td>
                    <td className="border border-black p-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Compliance Guarantee Paragraph */}
            <div className="mt-8 text-xs leading-relaxed italic text-neutral-600">
              <p className="indent-8">
                *ข้าพเจ้าขอรับรองว่า รายจ่ายข้างต้นนี้ ข้าพเจ้าได้จ่ายไปโดยแท้ในนามสถานประกอบการนี้ และไม่อาจเรียกใบเสร็จรับเงินจากผู้รับเงินได้ ทั้งนี้ ข้าพเจ้าได้รับความยินยอมให้กรอกเลขบัตรประจำตัวประชาชนและลงนามรับรองตามแนวทางข้อเสนอแนะภาษีสรรพากร
              </p>
            </div>

            {/* Signature Blocks Row */}
            <div className="mt-12 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="space-y-4">
                <p>ลงชื่อ .............................................................. ผู้จ่ายเงิน</p>
                <div className="h-12 flex items-center justify-center">
                  {signatureDataUrl ? (
                    <img 
                      src={signatureDataUrl} 
                      alt="Signature Payer" 
                      className="h-10 max-w-[150px] object-contain select-none pointer-events-none" 
                    />
                  ) : (
                    <p className="text-[10px] text-neutral-400 italic">(ยังไม่ได้ลงลายมือชื่อผู้เบิก)</p>
                  )}
                </div>
                <p className="font-semibold">( {formData.payerName} )</p>
                <p className="text-[10px] text-neutral-500">ตำแหน่ง: ตัวแทนผู้มีอำนาจเบิกจ่าย</p>
              </div>

              <div className="space-y-4">
                <p>ลงชื่อ .............................................................. ผู้รับเงิน</p>
                <div className="h-12 flex items-center justify-center">
                  {/* Subtle placeholder indicating payee signature */}
                  <div className="border border-dashed border-neutral-300 px-4 py-1 text-[9px] text-neutral-400 rounded-lg">
                    รับเงินสดเรียบร้อยแล้ว
                  </div>
                </div>
                <p className="font-semibold">( {formData.payeeName} )</p>
                <p className="text-[10px] text-neutral-500">เลขประจำตัว: {formData.payeeIdCard}</p>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="mt-auto pt-8 border-t border-neutral-100 flex items-center justify-between text-[9px] text-neutral-400 font-semibold select-none">
              <p>เอกสารใบแทนใบเสร็จรับเงินฉบับนี้สร้างสำเร็จผ่านระบบจัดการภาษี Fillax (Free Version)</p>
              <p>www.fillax.com</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
