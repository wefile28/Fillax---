"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTransactions,
  getTaxAssessments,
  createTaxAssessment,
} from "@/lib/store";
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaxAssessment } from "@/lib/types";

export default function TaxRiskAssessment() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [assessments, setAssessments] = useState<TaxAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = () => {
    setAssessments(getTaxAssessments());
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const currentAssessment = assessments?.find((a) => a.year === selectedYear);

  const handleGenerateAssessment = () => {
    setIsGenerating(true);
    try {
      const transactions = getTransactions();
      if (!transactions.length) {
        toast.error("ไม่พบข้อมูลรายการธุรกรรม");
        setIsGenerating(false);
        return;
      }

      const yearTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return date.getFullYear() === selectedYear;
      });

      const totalIncome = yearTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = yearTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const netIncome = totalIncome - totalExpenses;

      const riskFactors: TaxAssessment["riskFactors"] = [];
      const recommendations: TaxAssessment["recommendations"] = [];

      const expenseRatio =
        totalIncome > 0 ? totalExpenses / totalIncome : 0;
      if (expenseRatio > 0.8) {
        riskFactors.push({
          factor: "อัตราส่วนค่าใช้จ่ายสูงเกินปกติ",
          severity: "high",
          description: `ค่าใช้จ่ายของคุณคิดเป็น ${(expenseRatio * 100).toFixed(0)}% ของรายได้ ซึ่งถือว่าสูงกว่าเกณฑ์ปกติมากอาจถูกตรวจสอบได้`,
        });
        recommendations.push({
          id: "rec-1",
          title: "ตรวจสอบหมวดหมู่ค่าใช้จ่าย",
          description:
            "ตรวจสอบรายละเอียดค่าใช้จ่ายเพื่อแยกแยะรายการที่ไม่สามารถนำมาหักภาษีได้ออก",
          priority: "high",
          action:
            "คัดแยกค่าใช้จ่ายที่เกี่ยวข้องกับธุรกิจและค่าใช้จ่ายส่วนตัวให้ชัดเจน",
        });
      }

      const monthlyIncomes = new Map<number, number>();
      yearTransactions
        .filter((t) => t.type === "income")
        .forEach((t) => {
          const month = new Date(t.date).getMonth();
          monthlyIncomes.set(
            month,
            (monthlyIncomes.get(month) || 0) + t.amount
          );
        });

      const incomeValues = Array.from(monthlyIncomes.values());
      if (incomeValues.length > 0) {
        const avgIncome =
          incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length;
        const maxDeviation = Math.max(
          ...incomeValues.map((v) => Math.abs(v - avgIncome))
        );
        if (maxDeviation > avgIncome * 0.5) {
          riskFactors.push({
            factor: "รูปแบบรายได้ไม่สม่ำเสมอ",
            severity: "medium",
            description:
              "รายได้รายเดือนของคุณมีความผันผวนสูง ซึ่งอาจต้องเตรียมหลักฐานที่มาของรายได้ให้ชัดเจน",
          });
          recommendations.push({
            id: "rec-2",
            title: "จัดทำเอกสารที่มาของรายได้",
            description:
              "ตรวจสอบให้แน่ใจว่ารายได้ทุกแหล่งมีการออกใบกำกับภาษีหรือหลักฐานการรับเงินที่ถูกต้อง",
            priority: "medium",
            action:
              "รวบรวมสัญญาจ้าง หรือใบแจ้งหนี้ให้ครบถ้วนตามรายการที่บันทึก",
          });
        }
      }

      if (totalIncome < 150000) {
        riskFactors.push({
          factor: "รายได้ต่ำกว่าเกณฑ์ต้องเสียภาษี",
          severity: "low",
          description:
            "รายได้สุทธิของคุณยังไม่ถึงเกณฑ์ที่ต้องเสียภาษีเงินได้บุคคลธรรมดา แต่ยังคงมีหน้าที่ต้องยื่นแบบ",
        });
        recommendations.push({
          id: "rec-4",
          title: "ตรวจสอบหน้าที่การยื่นแบบ",
          description:
            "แม้ไม่ต้องเสียภาษี แต่หากรายได้ถึงเกณฑ์ขั้นต่ำตามกฎหมายยังคงต้องยื่นแบบแสดงรายการ",
          priority: "low",
          action:
            "ตรวจสอบเกณฑ์รายได้ขั้นต่ำสำหรับการยื่นแบบ ภ.ง.ด. 90/91",
        });
      }

      let riskLevel: "low" | "medium" | "high" = "low";
      const highRisks = riskFactors.filter(
        (r) => r.severity === "high"
      ).length;
      const mediumRisks = riskFactors.filter(
        (r) => r.severity === "medium"
      ).length;
      if (highRisks > 0) riskLevel = "high";
      else if (mediumRisks > 0) riskLevel = "medium";

      const complianceChecklist = [
        {
          item: "จัดทำเอกสารรายได้ครบถ้วนทุกแหล่ง",
          completed: totalIncome > 0,
        },
        { item: "รวบรวมใบเสร็จค่าใช้จ่าย", completed: true },
        {
          item: "แยกแยะหมวดหมู่ภาษีถูกต้อง",
          completed: true,
        },
        {
          item: "ตรวจสอบสิทธิลดหย่อนภาษี",
          completed: totalExpenses > 0,
        },
        { item: "จัดเก็บเอกสารอย่างเป็นระเบียบ", completed: true },
      ];

      createTaxAssessment({
        year: selectedYear,
        riskLevel,
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        netIncome: netIncome.toString(),
        riskFactors,
        recommendations,
        complianceChecklist,
        notes: `ประเมินความเสี่ยงภาษีสำหรับปี พ.ศ. ${selectedYear + 543}`,
      });

      toast.success("สร้างรายงานประเมินความเสี่ยงสำเร็จ");
      loadData();
    } catch {
      toast.error("ไม่สามารถสร้างรายงานประเมินได้");
    } finally {
      setIsGenerating(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "low":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "medium":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const riskLevelLabels = {
    low: "ความเสี่ยงต่ำ",
    medium: "ความเสี่ยงปานกลาง",
    high: "ความเสี่ยงสูง",
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          ประเมินความเสี่ยงภาษี
        </h1>
        <p className="text-muted-foreground">
          วิเคราะห์ความถูกต้องของการจัดการภาษีและระบุความเสี่ยงที่อาจเกิดขึ้น
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex bg-accent/30 p-1 rounded-2xl border border-border/50 backdrop-blur-sm">
          {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
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
        <Button
          onClick={handleGenerateAssessment}
          disabled={isGenerating}
          className="md:ml-auto"
        >
          {isGenerating ? "กำลังประเมิน..." : "เริ่มการประเมินภาษี"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : currentAssessment ? (
        <div className="space-y-6">
          <Card
            className={`border-2 ${getRiskColor(currentAssessment.riskLevel)}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getRiskIcon(currentAssessment.riskLevel)}
                  ระดับความเสี่ยงโดยรวม
                </CardTitle>
                <Badge
                  className={`text-lg px-4 py-1 ${getRiskColor(currentAssessment.riskLevel)}`}
                >
                  {riskLevelLabels[currentAssessment.riskLevel as keyof typeof riskLevelLabels]}
                </Badge>
              </div>
              <CardDescription>
                วันที่ประเมินล่าสุด:{" "}
                {new Date(
                  currentAssessment.assessmentDate
                ).toLocaleDateString("th-TH")}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  รายรับทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ฿
                  {parseFloat(
                    currentAssessment.totalIncome
                  ).toLocaleString("th-TH", {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  รายจ่ายทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ฿
                  {parseFloat(
                    currentAssessment.totalExpenses
                  ).toLocaleString("th-TH", {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  กำไรสุทธิ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${parseFloat(currentAssessment.netIncome) >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  ฿
                  {parseFloat(
                    currentAssessment.netIncome
                  ).toLocaleString("th-TH", {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {currentAssessment.riskFactors &&
            currentAssessment.riskFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>ปัจจัยเสี่ยงที่ตรวจพบ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentAssessment.riskFactors.map((factor, idx) => (
                    <Alert
                      key={idx}
                      className={`border-l-4 ${
                        factor.severity === "high"
                          ? "border-l-red-500 bg-red-50"
                          : factor.severity === "medium"
                            ? "border-l-yellow-500 bg-yellow-50"
                            : "border-l-green-500 bg-green-50"
                      }`}
                    >
                      <AlertTitle className="flex items-center gap-2">
                        {factor.severity === "high" ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : factor.severity === "medium" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        {factor.factor}
                      </AlertTitle>
                      <AlertDescription>
                        {factor.description}
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}

          {currentAssessment.recommendations &&
            currentAssessment.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>ข้อแนะนำในการจัดการ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentAssessment.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold">{rec.title}</h3>
                        <Badge
                          variant={
                            rec.priority === "high"
                              ? "destructive"
                              : rec.priority === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {rec.priority === "high" ? "ด่วนมาก" : rec.priority === "medium" ? "ปานกลาง" : "ปกติ"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                      <p className="text-sm font-medium text-primary">
                        สิ่งที่ควรทำ: {rec.action}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          {currentAssessment.complianceChecklist &&
            currentAssessment.complianceChecklist.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>รายการตรวจสอบความถูกต้อง (Compliance Checklist)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentAssessment.complianceChecklist.map(
                    (item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            item.completed
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {item.completed && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <span
                          className={
                            item.completed
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          {item.item}
                        </span>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              ยังไม่มีการประเมิน คลิกปุ่ม &quot;เริ่มการประเมินภาษี&quot; เพื่อวิเคราะห์ข้อมูลของคุณ
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legal Disclaimer */}
      <div className="text-center pt-8 pb-4">
        <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed max-w-3xl mx-auto">
          *การวิเคราะห์และการประเมินภาษีนี้จัดทำขึ้นบนข้อมูลเบื้องต้นเพื่ออำนวยความสะดวกเท่านั้น ไม่ถือเป็นคำปรึกษาทางกฎหมาย ข้อเสนอแนะ หรือการให้บริการทางวิชาชีพด้านบัญชีและภาษีอย่างเป็นทางการ โปรดตรวจสอบและยืนยันข้อมูลกับเจ้าหน้าที่สรรพากรหรือผู้เชี่ยวชาญก่อนดำเนินธุรกรรมใดๆ
        </p>
      </div>
    </div>
  );
}
