"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Crown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import UpgradeDialog from "@/components/upgrade-dialog";
import { supabase, API_URL } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Simple markdown-like renderer for assistant messages
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="text-sm space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="font-bold">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={i} className="pl-2">
              {line}
            </p>
          );
        }
        if (line.trim() === "") {
          return <br key={i} />;
        }
        // Handle inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={j}>{part.replace(/\*\*/g, "")}</strong>
                );
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function TaxAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        'สวัสดีค่ะ! ยินดีต้อนรับสู่ Tax Assistant 🎉\n\nผมพร้อมช่วยเหลือคุณเกี่ยวกับ:\n\n**ภาษีเงินได้บุคคลธรรมดา (Personal Income Tax)**\n- การคำนวณภาษีเงินได้\n- การหักลดหย่อนภาษี\n- การยื่นแบบปกติ\n- ข้อมูลการหักที่ต้นทาง\n\n**ภาษีนิติบุคคล (Corporate Income Tax)**\n- การคำนวณภาษีกำไร\n- การหักค่าใช้จ่าย\n- การยื่นแบบรายงานภาษี\n- การเก็บรักษาบัญชี\n\nคุณสามารถถามคำถามใดๆ เกี่ยวกับภาษี การบัญชี หรือการจัดการการเงิน\n\nเริ่มต้นด้วยการบอกผมเกี่ยวกับสถานการณ์ของคุณ!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fillax_is_pro") === "true";
    }
    return false;
  });

  // Securely verify plan level against Supabase profile on mount
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
  }, []);

  const [messageCount, setMessageCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // e.g., "2026-05" (local time)
      const savedMonth = localStorage.getItem("fillax_ai_month");
      if (savedMonth !== currentMonth) {
        localStorage.setItem("fillax_ai_month", currentMonth);
        localStorage.setItem("fillax_ai_count", "0");
        return 0;
      }
      const savedCount = localStorage.getItem("fillax_ai_count");
      return savedCount ? parseInt(savedCount) : 0;
    }
    return 0;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    if (!isPro && messageCount >= 5) {
      toast.info("โควตาแชทฟรี 5 ครั้งของคุณหมดแล้วในเดือนนี้ อัปเกรดเพื่อคุยต่อได้ไม่จำกัด! 👑");
      setIsUpgradeOpen(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Increment and save count if Free user
    if (!isPro) {
      const newCount = messageCount + 1;
      setMessageCount(newCount);
      localStorage.setItem("fillax_ai_count", String(newCount));
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนทำการปรึกษา AI");
      }

      const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with AI Chat backend.");
      }

      const chatData = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: chatData.reply || "ขออภัยด้วยค่ะ ระบบผู้ช่วยภาษีขัดข้องชั่วคราว",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `🚨 ขออภัยด้วยค่ะ: ${error.message || "ขณะนี้ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ AI ของผู้ช่วยภาษีได้ โปรดตรวจสอบว่ารันเซิร์ฟเวอร์ Backend (FastAPI) เรียบร้อยแล้วที่ http://localhost:8000"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">ผู้ช่วยส่วนตัวด้านภาษี</h1>
        <p className="text-muted-foreground">
          รับคำปรึกษาจากผู้เชี่ยวชาญด้านภาษีเงินได้บุคคลธรรมดาและนิติบุคคล
        </p>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              แชทปรึกษาภาษี
            </CardTitle>
            <CardDescription>
              สอบถามคำถามเกี่ยวกับภาษีเงินได้บุคคลธรรมดา ภาษีนิติบุคคล และการบัญชี
            </CardDescription>
          </div>
          <div className="text-right shrink-0">
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20 animate-pulse">
                <Crown className="w-3.5 h-3.5" />
                Pro อัจฉริยะ (ไม่จำกัด)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
                โควตาแชทฟรี: {Math.max(0, 5 - messageCount)} / 5
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                   key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-muted-foreground rounded-bl-none"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownContent content={message.content} />
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg rounded-bl-none px-4 py-3">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder={!isPro && messageCount >= 5 ? "โควตาแชทฟรีของคุณหมดแล้ว โปรดอัปเกรดเป็น Pro" : "สอบถามเกี่ยวกับภาษี การบัญชี หรือการจัดการทางการเงิน..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || (!isPro && messageCount >= 5)}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || (!isPro && messageCount >= 5)}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">คำแนะนำเพิ่มเติม</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>
              • สอบถามเกี่ยวกับอัตราภาษี การลดหย่อน และการยื่นแบบภาษี
            </li>
            <li>
              • รับคำแนะนำในการจัดการใบเสร็จและการจัดทำเอกสาร
            </li>
            <li>
              • ข้อมูลเกี่ยวกับภาษีเงินได้บุคคลธรรมดา
            </li>
            <li>
              • ข้อมูลเกี่ยวกับภาษีนิติบุคคล
            </li>
            <li>
              • คำแนะนำในการวางแผนภาษีและความถูกต้องตามกฎหมาย
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Central Premium Stripe & Omise Payment Gateway Upgrade Portal */}
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        onSuccess={() => setIsPro(true)}
      />

      {/* Legal Disclaimer */}
      <div className="text-center pt-8 pb-4">
        <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed max-w-3xl mx-auto">
          *การวิเคราะห์และการประเมินภาษีนี้จัดทำขึ้นบนข้อมูลเบื้องต้นเพื่ออำนวยความสะดวกเท่านั้น ไม่ถือเป็นคำปรึกษาทางกฎหมาย ข้อเสนอแนะ หรือการให้บริการทางวิชาชีพด้านบัญชีและภาษีอย่างเป็นทางการ โปรดตรวจสอบและยืนยันข้อมูลกับเจ้าหน้าที่สรรพากรหรือผู้เชี่ยวชาญก่อนดำเนินธุรกรรมใดๆ
        </p>
      </div>
    </div>
  );
}
