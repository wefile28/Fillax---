"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Bell, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface TaxEvent {
  id: string;
  title: string;
  date: string;
  type: "personal" | "corporate" | "vat";
  description: string;
  priority: "high" | "medium" | "low";
  deadline: string;
}

const TAX_EVENTS: TaxEvent[] = [
  {
    id: "1",
    title: "ยื่นภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด. 90/91)",
    date: "1 ม.ค. - 31 มี.ค.",
    type: "personal",
    description: "การยื่นแบบแสดงรายการภาษีเงินได้บุคคลธรรมดาสิ้นปี สำหรับรายได้ของปีที่ผ่านมา",
    priority: "high",
    deadline: "2026-03-31",
  },
  {
    id: "2",
    title: "ยื่นภาษีเงินได้บุคคลธรรมดาครึ่งปี (ภ.ง.ด. 94)",
    date: "1 ก.ค. - 30 ก.ย.",
    type: "personal",
    description: "สำหรับผู้มีเงินได้ตามมาตรา 40(5)-(8) ต้องยื่นสรุปรายได้ช่วงครึ่งปีแรก",
    priority: "high",
    deadline: "2026-09-30",
  },
  {
    id: "3",
    title: "ยื่นภาษีมูลค่าเพิ่ม (ภ.พ. 30)",
    date: "ทุกวันที่ 15 ของเดือน",
    type: "vat",
    description: "สำหรับผู้ประกอบการจดทะเบียน VAT ต้องยื่นแบบและชำระภาษีทุกเดือน",
    priority: "medium",
    deadline: "Every 15th",
  },
  {
    id: "4",
    title: "ยื่นภาษีเงินได้นิติบุคคลครึ่งปี (ภ.ง.ด. 51)",
    date: "ภายใน 2 เดือนนับจากวันสุดท้ายของ 6 เดือนแรก",
    type: "corporate",
    description: "การประมาณการกำไรสุทธิและเสียภาษีครึ่งปีสำหรับบริษัทหรือห้างหุ้นส่วน",
    priority: "medium",
    deadline: "Aug/Sep",
  },
  {
    id: "5",
    title: "ยื่นภาษีเงินได้นิติบุคคลประจำปี (ภ.ง.ด. 50)",
    date: "ภายใน 150 วันนับแต่วันสุดท้ายของรอบระยะเวลาบัญชี",
    type: "corporate",
    description: "การยื่นแบบแสดงรายการและเสียภาษีเงินได้นิติบุคคลจากกำไรสุทธิประจำปี",
    priority: "high",
    deadline: "May",
  },
];

export default function TaxCalendar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">ปฏิทินภาษี</h1>
          <p className="text-muted-foreground text-lg">
            ติดตามวันสำคัญและกำหนดการยื่นภาษี เพื่อป้องกันค่าปรับและสิทธิประโยชน์ของคุณ
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
          <Bell className="h-5 w-5 animate-bounce" />
          <span className="font-bold">เปิดแจ้งเตือนแล้ว</span>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-6"
      >
        {/* Timeline View */}
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {TAX_EVENTS.map((event) => (
            <motion.div 
              key={event.id}
              variants={item}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
            >
              {/* Dot */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <CalendarIcon className={cn(
                  "h-5 w-5",
                  event.priority === "high" ? "text-red-500" : "text-primary"
                )} />
              </div>

              {/* Content Card */}
              <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass border-none shadow-xl hover:shadow-primary/5 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={event.type === "personal" ? "default" : event.type === "corporate" ? "secondary" : "outline"}>
                      {event.type === "personal" ? "บุคคลธรรมดา" : event.type === "corporate" ? "นิติบุคคล" : "VAT"}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {event.date}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                    {event.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                  <div className={cn(
                    "p-3 rounded-xl flex items-center gap-3 text-sm font-medium",
                    event.priority === "high" ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"
                  )}>
                    {event.priority === "high" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span>ครบกำหนด: {event.deadline}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Action Card */}
        <motion.div variants={item}>
          <Card className="bg-primary text-primary-foreground border-none shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Bell className="h-32 w-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-2xl font-black">ไม่พลาดทุกกำหนดการสำคัญ</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                ตั้งค่าระบบแจ้งเตือนผ่าน Email หรือ LINE เพื่อให้คุณเตรียมตัวได้ทันเวลา
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 bg-white text-primary font-bold rounded-2xl hover:shadow-lg transition-all active:scale-95">
                  เชื่อมต่อ LINE Notify
                </button>
                <button className="px-6 py-3 bg-white/20 text-white font-bold rounded-2xl hover:bg-white/30 transition-all active:scale-95 border border-white/30">
                  ตั้งค่าอีเมลแจ้งเตือน
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
