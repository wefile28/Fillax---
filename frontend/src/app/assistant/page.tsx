"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { 
  Bot, 
  Send, 
  Sparkles, 
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  User,
  Crown
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import UpgradeDialog from "@/components/UpgradeDialog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Upgrade Modal triggers
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [plan, setPlan] = useState("free");
  const [aiCount, setAiCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const samplePrompts = [
    "บุคคลธรรมดาและนิติบุคคล แตกต่างกันอย่างไรในการเสียภาษีคะ?",
    "ช่วยแนะนำรายการลดหย่อนภาษีบุคคลธรรมดาล่าสุดปี 2026 หน่อยค่ะ",
    "รายรับพ่อค้าออนไลน์รวม 1.5 ล้านบาทต่อปี ต้องเสียภาษีเรทไหนและคุ้มไหมคะ?"
  ];

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Fetch profile plan details on mount
    const checkQuota = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (data) {
          setPlan(data.plan || "free");
          setAiCount(data.ai_count || 0);
        }
      }
    };
    checkQuota();
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message locally
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setInputValue("");
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // API post
      const response = await fetch(`${apiUrl}/api/v1/ai/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text }),
      });

      if (response.status === 403) {
        // Quota exceeded
        setMessages([...newMessages, { 
          role: "assistant", 
          content: "⚠️ ขออภัยด้วยนะคะ โควตาคุยถามผู้ช่วยภาษี AI ฟรี 5 ครั้งของคุณในเดือนนี้เต็มหมดแล้วค่ะ! โปรดทำการยกระดับบัญชีเป็น PRO เพื่อเพลิดเพลินกับคำถามปรึกษาทางภาษีที่รวดเร็วและไม่จำกัดได้ทันทีค่ะ 👑" 
        }]);
        setIsUpgradeOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const resData = await response.json();
      
      setMessages([...newMessages, { role: "assistant", content: resData.reply }]);
      setAiCount(resData.ai_count || aiCount + 1);
    } catch (e) {
      console.error(e);
      // Mock simulation fallback if backend isn't loaded cleanly
      setTimeout(() => {
        setMessages([...newMessages, { 
          role: "assistant", 
          content: "ขออภัยด้วยค่ะ ระบบผู้ช่วยประมวลผลหลังบ้านขัดข้องชั่วคราว ดิกุลากรุณาตรวจสอบการต่ออินเทอร์เน็ตหรือติดต่อผู้ดูแลระบบเพื่อแก้ไขค่ะ" 
        }]);
      }, 1000);
    } finally {
      setIsSending(false);
    }
  };

  const triggerSamplePrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6 h-[82vh] relative">
        
        {/* Header Area */}
        <header className="flex justify-between items-center border-b border-[#B08CFF]/15 pb-4 shrink-0">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#5A4A68] flex items-center gap-2">
              <Bot className="w-6 h-6 text-[#B08CFF]" />
              ผู้ช่วยภาษีส่วนตัวอัจฉริยะ AI 🔮
            </h1>
            <p className="text-xs text-[#5A4A68]/60 font-semibold mt-1">
              {plan === "pro" ? "สิทธิ์การใช้งานของระดับ PRO MEMBER: สอบถามได้ไม่จำกัดจำนวนครั้ง 🟢" : `โหมดการใช้งานฟรี: ถามผู้ช่วยภาษี AI ได้อีก ${Math.max(5 - aiCount, 0)}/5 ครั้งในเดือนนี้`}
            </p>
          </div>
          {plan !== "pro" && (
            <button 
              onClick={() => setIsUpgradeOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#B08CFF] text-white text-xs font-black shadow-md hover:scale-102 transition-transform flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              Upgrade Pro
            </button>
          )}
        </header>

        {/* Chat Feed Workspace viewport */}
        <div className="flex-1 overflow-y-auto glass rounded-2xl p-4 md:p-6 flex flex-col gap-5 border border-[#B08CFF]/15 min-h-0 bg-white/30 shadow-inner">
          {messages.length === 0 ? (
            /* Winking Mascot Intro layout */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-6 max-w-lg mx-auto">
              <div className="relative w-28 h-28 hover:scale-105 transition-transform duration-300">
                <Image 
                  src="/fillax-mascot-v4.png" 
                  alt="Fillax winking mascot" 
                  width={112} 
                  height={112} 
                  className="object-contain animate-float"
                  priority
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-[#5A4A68]">
                  สวัสดีค่ะ! ดิฉันคือ <span className="text-[#B08CFF] italic">ผู้ช่วยภาษีอัจฉริยะ Fillax</span> 💜
                </h3>
                <p className="text-xs text-[#5A4A68]/60 font-semibold leading-relaxed">
                  ยินดีรับฟังปัญหาด้านบัญชีและภาษีของพ่อค้าแม่ค้าออนไลน์ไทย ไม่ว่าจะเป็นขั้นตอนการหักค่าลดหย่อน การวิเคราะห์รายจ่ายบริษัท หรือประเด็นความปลอดภัยจากการประเมินย้อนหลังค่ะ ลองคลิกหัวข้อตัวอย่างเพื่อเริ่มคุยกับดิฉันได้เลยนะคะ
                </p>
              </div>

              {/* Sample prompt cards */}
              <div className="flex flex-col gap-2.5 w-full mt-2">
                {samplePrompts.map((prompt, idx) => (
                  <button 
                    key={idx}
                    onClick={() => triggerSamplePrompt(prompt)}
                    className="p-3.5 rounded-xl bg-white/60 border border-[#B08CFF]/15 text-left text-xs font-bold text-[#5A4A68] hover:bg-white hover:border-[#B08CFF] hover:translate-x-1 transition-all flex justify-between items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span className="truncate">{prompt}</span>
                    <ChevronRight className="w-4 h-4 text-[#B08CFF] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messaging List */
            <div className="flex flex-col gap-4">
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-3 max-w-[85%] ${isUser ? "self-end flex-row-reverse" : "self-start"}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border shadow-sm ${
                      isUser 
                        ? "bg-[#5A4A68] border-[#5A4A68]/20" 
                        : "bg-[#E9DDFF] border-[#B08CFF]/20"
                    }`}>
                      {isUser ? (
                        <User className="w-4.5 h-4.5 text-white" />
                      ) : (
                        <Image 
                          src="/fillax-mascot-v4.png" 
                          alt="Mascot Avatar" 
                          width={24} 
                          height={24} 
                          className="object-contain"
                        />
                      )}
                    </div>

                    {/* Chat Bubble bubble text */}
                    <div className={`p-3.5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm ${
                      isUser 
                        ? "bg-[#B08CFF] text-white rounded-tr-none" 
                        : "bg-white border border-[#B08CFF]/15 text-[#5A4A68] rounded-tl-none"
                    }`}>
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              
              {/* Sending status loader bubble */}
              {isSending && (
                <div className="flex items-start gap-3 self-start max-w-[85%]">
                  <div className="w-8 h-8 rounded-full shrink-0 bg-[#E9DDFF] border border-[#B08CFF]/20 flex items-center justify-center">
                    <Image 
                      src="/fillax-mascot-v4.png" 
                      alt="Mascot Avatar" 
                      width={24} 
                      height={24} 
                      className="object-contain animate-spin"
                    />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-[#B08CFF]/15 text-[#5A4A68] rounded-tl-none text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="animate-pulse">ผู้ช่วย Fillax กำลังประมวลผลข้อมูลภาษี...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Message Panel bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="flex gap-3 bg-[#FAF9F6]/40 p-2 border border-[#B08CFF]/15 rounded-2xl backdrop-blur-sm shrink-0"
        >
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending}
            placeholder="พิมพ์คำถามด้านภาษีหรือค่าใช้จ่ายร้านค้าของคุณตรงนี้..."
            className="flex-1 h-12 px-4 rounded-xl bg-white/80 border border-[#B08CFF]/10 text-xs font-bold text-[#5A4A68] focus:outline-none focus:border-[#B08CFF]"
          />
          <button 
            type="submit"
            disabled={isSending || !inputValue.trim()}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all shadow ${
              isSending || !inputValue.trim()
                ? 'bg-[#B08CFF]/50 cursor-not-allowed'
                : 'bg-[#B08CFF] shadow-[#B08CFF]/20 hover:scale-105 active:scale-95 cursor-pointer'
            }`}
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>

        {/* Golden Legal Warning Box disclaimer */}
        <footer className="p-3.5 rounded-2xl border bg-[#F59E0B]/5 border-[#FAF9F6]/25 flex gap-3 items-start shadow-sm shrink-0">
          <AlertTriangle className="text-[#F59E0B] w-4.5 h-4.5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black text-[#5A4A68] uppercase tracking-wide">⚠️ ข้อแจ้งความคุ้มครองทางกฎหมายของปัญญาประดิษฐ์</h4>
            <p className="text-[8.5px] text-[#5A4A68]/70 leading-relaxed font-semibold">
              ผู้ช่วยภาษี Fillax ขับเคลื่อนด้วย AI อัจฉริยะเพื่อให้คำแนะนำด้านโครงสร้างเบื้องต้นแก่ผู้ใช้เท่านั้น <strong>ไม่ใช่คำปรึกษาทางกฎหมายหรือบัญชีอย่างเป็นทางการ</strong> สรรพากรมีข้อกำหนดพิเศษตามลักษณะเฉพาะตัวของแต่ละธุรกิจ ผู้ใช้งานควรปรึกษาสำนักงานบัญชีก่อนยื่นภาษีจริงเสมอ
            </p>
          </div>
        </footer>

        {/* Upgrade Dialog elevation portal */}
        <UpgradeDialog isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
      </div>
    </DashboardShell>
  );
}
