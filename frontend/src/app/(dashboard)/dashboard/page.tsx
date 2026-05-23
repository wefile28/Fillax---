"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Receipt,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Utensils,
  ShoppingBag,
  Car,
  Home,
  Film,
  Zap,
  HeartPulse,
  CreditCard,
  Sparkles,
  AlertCircle,
  Printer,
  CheckCircle2,
  Circle,
  Play
} from "lucide-react";
import type { Transaction } from "@/lib/types";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import * as offlineStore from "@/lib/store";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import OnboardingModal from "@/components/onboarding-modal";
import { toast } from "sonner";

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

const COLORS = [
  "oklch(0.6 0.2 250)",
  "oklch(0.65 0.15 190)",
  "oklch(0.55 0.2 300)",
  "oklch(0.5 0.25 340)",
  "oklch(0.75 0.15 80)",
];

export default function Dashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Onboarding & Setup states
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [salesChannel, setSalesChannel] = useState("");
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);
  const [hasReceipts, setHasReceipts] = useState(false);
  const [hasAssessments, setHasAssessments] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setTransactions(offlineStore.getTransactions());
        } else {
          const txs = await apiClient.getTransactions();
          setTransactions(txs);
        }
      } catch (err) {
        console.warn("[DASHBOARD_OFFLINE] Fallback to localStorage:", err);
        setTransactions(offlineStore.getTransactions());
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // Check onboarding, receipts, and assessments on mount safely deferred
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const completed = localStorage.getItem("fillax_onboarding_completed") === "true";
        if (!completed) {
          setIsOnboardingOpen(true);
        } else {
          setShopName(localStorage.getItem("fillax_shop_name") || "");
          setSalesChannel(localStorage.getItem("fillax_sales_channel") || "");
          setEstimatedRevenue(Number(localStorage.getItem("fillax_estimated_revenue") || "0"));
        }

        setHasReceipts(offlineStore.getReceipts().length > 0);
        setHasAssessments(offlineStore.getTaxAssessments().length > 0);
      }, 50);
    }
  }, []);

  const handleOnboardingSuccess = (data: { shopName: string; channel: string; revenue: number }) => {
    setShopName(data.shopName);
    setSalesChannel(data.channel);
    setEstimatedRevenue(data.revenue);
    toast.success(`ตั้งค่าร้านค้า "${data.shopName}" สำเร็จเรียบร้อยแล้วค่ะ! ✨`);
  };

  // Dynamic Years calculation based on transaction history (Max 10 years)
  const availableYears = useMemo(() => {
    const txYears = transactions.map((t) => new Date(t.date).getFullYear());
    const yearsSet = new Set([currentYear, ...txYears]);
    return Array.from(yearsSet)
      .sort((a, b) => a - b) // Ascending order
      .slice(-10); // Show max last 10 years
  }, [transactions, currentYear]);

  const summary = useMemo(() => {
    const filtered = transactions.filter(
      (t) => new Date(t.date).getFullYear() === selectedYear
    );

    const income = filtered
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filtered
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(selectedYear, i).toLocaleString("en-US", {
        month: "short",
      });
      const monthTransactions = filtered.filter(
        (t) => new Date(t.date).getMonth() === i
      );
      const mIncome = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const mExpenses = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        month,
        income: mIncome,
        expenses: mExpenses,
        net: mIncome - mExpenses,
      };
    });

    const categories = filtered
      .filter((t) => t.type === "expense")
      .reduce(
        (acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        },
        {} as Record<string, number>
      );

    const categoryData = Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      income,
      expenses,
      netIncome: income - expenses,
      monthlyData,
      categoryData,
    };
  }, [transactions, selectedYear]);

  const healthStatus = useMemo(() => {
    const income = summary.income;
    const expenses = summary.expenses;
    if (income === 0 && expenses === 0) {
      return {
        label: "ยังไม่มีข้อมูลรายการธุรกรรมสำหรับปีนี้",
        desc: "บันทึกธุรกรรมแรกของคุณเพื่อประเมินสุขภาพทางการเงิน",
        bgColor: "bg-accent/10 dark:bg-accent/5",
        borderColor: "border-border/30",
        textColor: "text-muted-foreground",
        dotColor: "bg-muted-foreground",
      };
    }
    const ratio = expenses === 0 ? 100 : income / expenses;
    
    if (ratio >= 2.0) {
      return {
        label: "Excellent Surplus (เงินเหลือดีเยี่ยม)",
        desc: "คุณบริหารการเงินได้ยอดเยี่ยมมาก! มีกระแสเงินสดสำรองเหลือเฟือ เหมาะแก่การลงทุนเพื่อลดหย่อนภาษีเพิ่มเติมเพื่อประหยัดเงินได้สูงสุด",
        bgColor: "bg-emerald-500/10 dark:bg-emerald-500/5",
        borderColor: "border-emerald-500/20",
        textColor: "text-emerald-600 dark:text-emerald-400",
        dotColor: "bg-emerald-500",
      };
    } else if (ratio >= 1.2) {
      return {
        label: "Healthy Balanced (การเงินสมดุลดี)",
        desc: "สุขภาพการเงินอยู่ในเกณฑ์ดี มีรายได้มากกว่ารายจ่ายในระดับที่ปลอดภัย ควรเริ่มพิจารณาออมหรือลงทุนสิทธิ์ลดหย่อนพื้นฐานทางภาษี",
        bgColor: "bg-purple-500/10 dark:bg-purple-500/5",
        borderColor: "border-purple-500/20",
        textColor: "text-primary",
        dotColor: "bg-primary",
      };
    } else if (ratio >= 1.0) {
      return {
        label: "Tight Margin (ค่อนข้างตึง)",
        desc: "รายรับและรายจ่ายค่อนข้างใกล้เคียงกัน ควรระมัดระวังการใช้จ่ายที่ไม่จำเป็นเพื่อสร้างเงินออมสำรองและหลีกเลี่ยงกระแสเงินสดตึงตัว",
        bgColor: "bg-amber-500/10 dark:bg-amber-500/5",
        borderColor: "border-amber-500/20",
        textColor: "text-amber-600 dark:text-amber-400",
        dotColor: "bg-amber-500",
      };
    } else {
      return {
        label: "Deficit Alert (รายจ่ายเกินรายรับ)",
        desc: "รายจ่ายสะสมสูงกว่ารายรับ! ควรเข้าดูหมวดหมู่ที่รั่วไหลเพื่อตัดลดค่าใช้จ่ายฟุ่มเฟือยโดยด่วน และวางแผนการยื่นภาษีเพื่อขอคืนเงิน",
        bgColor: "bg-rose-500/10 dark:bg-rose-500/5",
        borderColor: "border-rose-500/20",
        textColor: "text-rose-600 dark:text-rose-400",
        dotColor: "bg-rose-500",
      };
    }
  }, [summary.income, summary.expenses]);

  const setupProgress = useMemo(() => {
    const tasks = [
      { id: "onboarding", label: "กรอก Onboarding ตั้งค่าข้อมูลร้าน", completed: true, points: 30, actionLabel: "สำเร็จ", href: "#" },
      { id: "transaction", label: "บันทึกธุรกรรม รายการค้าแรกของคุณ", completed: transactions.length > 0, points: 30, actionLabel: "บันทึกเลย", href: "/transactions" },
      { id: "receipt", label: "อัปโหลดบิล/ใบเสร็จ เพื่อสแกน AI", completed: hasReceipts, points: 20, actionLabel: "สแกนเลย", href: "/receipts" },
      { id: "assessment", label: "ประเมินวางแผนลดหย่อนภาษี", completed: hasAssessments, points: 20, actionLabel: "วางแผนเลย", href: "/tax-planning" }
    ];

    let currentScore = 30;
    if (transactions.length > 0) currentScore += 30;
    if (hasReceipts) currentScore += 20;
    if (hasAssessments) currentScore += 20;

    return {
      score: currentScore,
      tasks
    };
  }, [transactions, hasReceipts, hasAssessments]);

  const topExpenseLeaks = useMemo(() => {
    return [...summary.categoryData]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [summary.categoryData]);

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("อาหาร") || cat.includes("เครื่องดื่ม") || cat.includes("food") || cat.includes("drink")) {
      return <Utensils className="h-5 w-5" />;
    }
    if (cat.includes("ช้อป") || cat.includes("shopping") || cat.includes("ซื้อของ")) {
      return <ShoppingBag className="h-5 w-5" />;
    }
    if (cat.includes("เดินทาง") || cat.includes("รถ") || cat.includes("travel") || cat.includes("transport") || cat.includes("car")) {
      return <Car className="h-5 w-5" />;
    }
    if (cat.includes("บ้าน") || cat.includes("ที่พัก") || cat.includes("rent") || cat.includes("home") || cat.includes("stay")) {
      return <Home className="h-5 w-5" />;
    }
    if (cat.includes("บันเทิง") || cat.includes("เที่ยว") || cat.includes("entertainment") || cat.includes("movie") || cat.includes("play")) {
      return <Film className="h-5 w-5" />;
    }
    if (cat.includes("น้ำ") || cat.includes("ไฟ") || cat.includes("สาธารณู") || cat.includes("utilit") || cat.includes("bill") || cat.includes("zap")) {
      return <Zap className="h-5 w-5" />;
    }
    if (cat.includes("สุขภาพ") || cat.includes("ยา") || cat.includes("หมอ") || cat.includes("health") || cat.includes("medic")) {
      return <HeartPulse className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium animate-pulse">กำลังเตรียมข้อมูลแดชบอร์ด...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10 p-6"
    >
      {/* Header Section */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            ภาพรวมล่าสุด
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {shopName ? (
              <>
                Dashboard <span className="text-primary">ร้าน {shopName}</span> {salesChannel === "shopee" ? "🧡" : salesChannel === "lazada" ? "💙" : salesChannel === "tiktok" ? "🖤" : salesChannel === "facebook" ? "👥" : salesChannel === "line" ? "💚" : "🏪"}
              </>
            ) : (
              <>
                Dashboard <span className="text-primary">สรุปการเงิน</span>
              </>
            )}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {shopName ? (
              <>ยินดีต้อนรับกลับค่ะ! วิเคราะห์รายรับ รายจ่าย และสุขภาพทางการเงินของ {shopName} ในที่เดียว</>
            ) : (
              <>วิเคราะห์รายรับ รายจ่าย และสุขภาพทางการเงินของคุณในที่เดียว</>
            )}
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex bg-accent/30 p-1 rounded-2xl border border-border/50 backdrop-blur-sm">
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
      </motion.div>

      {/* Setup Progress Indicator Widget */}
      {setupProgress.score < 100 && (
        <motion.div variants={item} className="relative overflow-hidden p-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent backdrop-blur-xl shadow-xl space-y-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <h3 className="text-lg font-black text-foreground">
                  ความคืบหน้าการตั้งค่าบัญชีของ {shopName || "คุณ"} 🎉
                </h3>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                ตั้งค่าระบบให้ครบ 100% เพื่อการวางแผนภาษีที่สมบูรณ์แบบที่สุด
              </p>
            </div>
            <div className="shrink-0 flex items-baseline gap-1.5 bg-primary/20 border border-primary/30 rounded-2xl px-4 py-2">
              <span className="text-xs font-black text-primary">ความคืบหน้า</span>
              <span className="text-2xl font-black text-primary tracking-tight">{setupProgress.score}%</span>
            </div>
          </div>

          {/* Progress bar container */}
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden border border-border/30">
            <motion.div 
              className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${setupProgress.score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          {/* Setup checklist grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {setupProgress.tasks.map((task) => (
              <div 
                key={task.id}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-2.5",
                  task.completed 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-background/40 border-border hover:border-primary/30 hover:bg-background/60"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {task.completed ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <span className="text-xs font-bold leading-tight">{task.label}</span>
                </div>
                
                {!task.completed && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="self-end h-7 rounded-lg text-[10px] font-black text-primary hover:bg-primary/10 flex items-center gap-1 p-2"
                    onClick={() => router.push(task.href)}
                  >
                    <span>{task.actionLabel}</span>
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </Button>
                )}
                {task.completed && (
                  <span className="self-end text-[10px] font-black text-emerald-500 p-1 flex items-center gap-0.5">
                    สำเร็จแล้ว ✨
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Financial Health Badge Banner */}
      <motion.div variants={item}>
        <div className={cn(
          "relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 backdrop-blur-xl shadow-xl",
          healthStatus.bgColor,
          healthStatus.borderColor
        )}>
          {/* Subtle background glow element */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start md:items-center gap-4">
              <div className="relative flex h-4 w-4 mt-1 md:mt-0 shrink-0">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", healthStatus.dotColor)}></span>
                <span className={cn("relative inline-flex rounded-full h-4 w-4", healthStatus.dotColor)}></span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold uppercase tracking-wider", healthStatus.textColor)}>
                    สถานะสุขภาพการเงิน
                  </span>
                  <span className="text-xs text-muted-foreground/40">•</span>
                  <span className={cn("text-sm font-extrabold", healthStatus.textColor)}>
                    {healthStatus.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {healthStatus.desc}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-6">
              {summary.income > 0 && summary.expenses > 0 && (
                <div className="shrink-0 flex flex-col md:items-end gap-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">อัตราส่วนรายรับ/รายจ่าย</span>
                  <span className={cn("text-2xl font-black tracking-tight", healthStatus.textColor)}>
                    {(summary.income / (summary.expenses || 1)).toFixed(2)}x
                  </span>
                </div>
              )}
              {estimatedRevenue > 0 && (
                <div className="shrink-0 flex flex-col md:items-end gap-1 border-l border-primary/20 pl-6">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">เป้าหมายยอดขายรายเดือน</span>
                  <span className="text-xl font-black text-primary tracking-tight">
                    ฿{estimatedRevenue.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item} whileHover={{ scale: 1.02, y: -5 }} className="group">
          <Card className="glass overflow-hidden relative border-none shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                รายรับทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-4xl font-black text-green-600 tracking-tight">
                ฿{summary.income.toLocaleString("th-TH")}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} whileHover={{ scale: 1.02, y: -5 }} className="group">
          <Card className="glass overflow-hidden relative border-none shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-500/10">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                รายจ่ายทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-4xl font-black text-red-600 tracking-tight">
                ฿{summary.expenses.toLocaleString("th-TH")}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} whileHover={{ scale: 1.02, y: -5 }} className="group">
          <Card className="glass overflow-hidden relative border-none shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/50"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                กำไรสุทธิ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-4xl font-black text-primary tracking-tight">
                ฿{summary.netIncome.toLocaleString("th-TH")}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div variants={item}>
          <Card className="glass border-none shadow-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">แนวโน้มรายเดือน</CardTitle>
                <CardDescription>เปรียบเทียบรายรับและรายจ่ายในแต่ละเดือน</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={summary.monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `฿${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                       backgroundColor: "var(--card)",
                       backdropFilter: "blur(12px)",
                       border: "1px solid var(--border)",
                       borderRadius: "1rem",
                    }}
                    formatter={(value) => `฿${Number(value).toLocaleString("th-TH")}`}
                  />
                  <Bar dataKey="income" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={30} name="รายรับ" />
                  <Bar dataKey="expenses" fill="oklch(0.6 0.2 25 / 0.6)" radius={[6, 6, 0, 0]} maxBarSize={30} name="รายจ่าย" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass border-none shadow-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-bold">สัดส่วนรายจ่าย</CardTitle>
              <CardDescription>การกระจายตัวของค่าใช้จ่ายตามหมวดหมู่</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {summary.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={summary.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      cornerRadius={8}
                      dataKey="value"
                    >
                      {summary.categoryData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid var(--border)",
                        borderRadius: "1rem",
                      }}
                      formatter={(value) => `฿${Number(value).toLocaleString("th-TH")}`}
                    />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-muted-foreground italic">
                  <p>ไม่มีข้อมูลรายการธุรกรรมสำหรับปีนี้</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Row of Charts: Performance Progression & Top 3 Expense Leaks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div variants={item}>
          <Card className="glass border-none shadow-xl overflow-hidden h-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold">ความคืบหน้าของผลประกอบการ</CardTitle>
              <CardDescription>แนวโน้มกำไรสุทธิสะสมในแต่ละเดือน</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={summary.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `฿${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid var(--border)",
                      borderRadius: "1rem",
                    }}
                    formatter={(value) => `฿${Number(value).toLocaleString("th-TH")}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="net" 
                    stroke="var(--primary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorNet)" 
                    name="กำไรสุทธิ"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top 3 Expense Leaks Card */}
        <motion.div variants={item}>
          <Card className="glass border-none shadow-xl overflow-hidden h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                3 หมวดหมู่รายจ่ายสูงสุด
              </CardTitle>
              <CardDescription>วิเคราะห์หมวดหมู่รายจ่ายสะสมที่ควรควบคุมหรือหักภาษีเพิ่มเติม</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {topExpenseLeaks.length > 0 ? (
                <div className="space-y-6">
                  {topExpenseLeaks.map((leak, idx) => {
                    const percentage = summary.expenses > 0 ? (leak.value / summary.expenses) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-2 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shrink-0">
                              {getCategoryIcon(leak.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate max-w-[150px]">
                                {leak.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                คิดเป็น {percentage.toFixed(1)}% ของรายจ่ายทั้งหมด
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-extrabold text-foreground">
                              ฿{leak.value.toLocaleString("th-TH")}
                            </p>
                            {idx === 0 && (
                              <button 
                                onClick={() => router.push("/tax-risk-assessment")}
                                className="text-[10px] text-primary font-bold hover:underline inline-flex items-center gap-0.5 mt-0.5"
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                เช็กความเสี่ยงลดหย่อน
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-accent/30 h-2.5 rounded-full overflow-hidden">
                          <motion.div 
                            className="bg-primary h-full rounded-full" 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-2 italic">
                  <AlertCircle className="h-8 w-8 opacity-40 text-muted-foreground" />
                  <p>ยังไม่มีบันทึกข้อมูลรายจ่ายเพื่อนำมาวิเคราะห์</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions Footer */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Button
          variant="outline"
          className="h-24 glass hover:bg-primary hover:text-primary-foreground transition-all rounded-3xl text-lg font-bold border-none shadow-lg group"
          onClick={() => router.push("/transactions")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-white/20 transition-colors">
              <FileText className="h-6 w-6" />
            </div>
            จัดการรายการธุรกรรม
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-24 glass hover:bg-primary hover:text-primary-foreground transition-all rounded-3xl text-lg font-bold border-none shadow-lg group"
          onClick={() => router.push("/receipts")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-white/20 transition-colors">
              <Receipt className="h-6 w-6" />
            </div>
            สแกนใบเสร็จ
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-24 glass hover:bg-primary hover:text-primary-foreground transition-all rounded-3xl text-lg font-bold border-none shadow-lg group"
          onClick={() => router.push("/receipts/substitution")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-white/20 transition-colors">
              <Printer className="h-6 w-6" />
            </div>
            สร้างใบแทนใบเสร็จ
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-24 glass hover:bg-primary hover:text-primary-foreground transition-all rounded-3xl text-lg font-bold border-none shadow-lg group"
          onClick={() => router.push("/export")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-white/20 transition-colors">
              <Download className="h-6 w-6" />
            </div>
            ส่งออกรายงาน
          </div>
        </Button>
      </motion.div>

      {/* Legal Disclaimer */}
      <div className="text-center pt-8 pb-4">
        <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed max-w-3xl mx-auto">
          *การวิเคราะห์และการประเมินภาษีนี้จัดทำขึ้นบนข้อมูลเบื้องต้นเพื่ออำนวยความสะดวกเท่านั้น ไม่ถือเป็นคำปรึกษาทางกฎหมาย ข้อเสนอแนะ หรือการให้บริการทางวิชาชีพด้านบัญชีและภาษีอย่างเป็นทางการ โปรดตรวจสอบและยืนยันข้อมูลกับเจ้าหน้าที่สรรพากรหรือผู้เชี่ยวชาญก่อนดำเนินธุรกรรมใดๆ
        </p>
      </div>
      {/* Onboarding Dialog */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </motion.div>
  );
}
