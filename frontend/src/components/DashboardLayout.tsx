"use client";

import { cn } from "@/lib/utils";
import {
  LogOut,
  PanelLeft,
  LayoutDashboard,
  FileText,
  Receipt,
  Download,
  Calendar as CalendarIcon,
  Sparkles,
  Calculator,
  Settings,
  MessageSquare,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
 
const menuItems = [
  { label: "แดชบอร์ด", path: "/dashboard", icon: LayoutDashboard },
  { label: "รายการธุรกรรม", path: "/transactions", icon: FileText },
  { label: "ใบเสร็จและเอกสาร", path: "/receipts", icon: Receipt },
  { label: "ผู้ช่วยภาษี AI", path: "/tax-assistant", icon: MessageSquare },
  { label: "ปฏิทินภาษี", path: "/calendar", icon: CalendarIcon },
  { label: "ประเมินความเสี่ยง", path: "/tax-risk-assessment", icon: Sparkles },
  { label: "วางแผนภาษี", path: "/tax-planning", icon: Calculator },
  { label: "ส่งออกข้อมูล", path: "/export", icon: Download },
  { label: "ตั้งค่า", path: "/settings", icon: Settings },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 450;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

interface DashboardLayoutContentProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === pathname);
  const isMobile = useIsMobile();

  const [user, setUser] = useState<{ email?: string; name?: string; avatar?: string } | null>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const getSessionUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0],
          avatar: session.user.user_metadata?.avatar_url,
        });
        
        // Fetch plan level from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", session.user.id)
          .single();

        const isUserPro = profile && (profile.plan === "pro" || profile.plan === "agency");
        setIsPro(!!isUserPro);
        localStorage.setItem("fillax_is_pro", isUserPro ? "true" : "false");
      } else if (localStorage.getItem("fillax_guest_mode") === "true") {
        setUser({
          name: "ผู้ทดสอบออฟไลน์ (Guest)",
          email: "wefile28@gmail.com",
        });
        setIsPro(localStorage.getItem("fillax_is_pro") === "true");
      }
    };

    getSessionUser();

    // Sync pro tier if changed in local storage
    const handleStorageChange = () => {
      setIsPro(localStorage.getItem("fillax_is_pro") === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("fillax_guest_mode");
    localStorage.removeItem("fillax_synced");
    toast.success("ออกจากระบบเรียบร้อยแล้ว");
    router.push("/");
  };

  useEffect(() => {
    if (isCollapsed) {
      const timer = setTimeout(() => setIsResizing(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        document.documentElement.style.setProperty(
          "--sidebar-width",
          `${newWidth}px`
        );
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-transparent"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center border-b bg-sidebar/40 backdrop-blur-xl sticky top-0 z-10 px-4">
            <div className="flex items-center gap-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded-2xl transition-all active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 shadow-sm border border-border/50"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/fillax-mascot.png"
                    alt="Fillax Logo"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-2xl object-contain border-2 border-primary/15 shadow-sm hover:scale-110 transition-transform duration-300 hover:border-primary/30"
                  />
                  <span className="font-extrabold tracking-tight truncate text-base bg-linear-to-r from-primary via-primary/80 to-primary/40 bg-clip-text text-transparent uppercase">
                    Fillax
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-2 px-2 py-4">
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => router.push(item.path)}
                      tooltip={item.label}
                      className={cn(
                        "h-12 transition-all font-medium rounded-xl px-4",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                          : "hover:bg-accent/80 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-transform",
                          isActive ? "scale-110" : "group-hover:scale-110"
                        )}
                      />
                      <span className="ml-2">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t bg-sidebar/20 backdrop-blur-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-accent/80 transition-all w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-border/50">
                  <Avatar className="h-10 w-10 border-2 border-primary/20 shrink-0 shadow-sm">
                    {user?.avatar && (
                      <AvatarImage src={user.avatar} alt={user.name || "User Avatar"} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-bold truncate leading-none text-foreground">
                      {user?.name || "บัญชีผู้ใช้"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-1 uppercase tracking-wider font-semibold flex items-center gap-1">
                      สมาชิก {isPro ? <span className="text-primary font-black">PRO 👑</span> : "FREE"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl glass animate-in fade-in slide-in-from-bottom-2 duration-200">
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive rounded-xl h-11">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="font-medium">ออกจากระบบ</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-transparent overflow-hidden">
        {isMobile && (
          <div className="flex border-b h-16 items-center justify-between bg-background/60 px-4 backdrop-blur-xl sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-2xl bg-background shadow-sm border border-border/50" />
              <span className="font-bold tracking-tight text-foreground">
                {activeMenuItem?.label ?? "เมนู"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="container py-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
