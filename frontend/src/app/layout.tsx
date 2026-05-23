import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "Fillax - Tax & Accounting Assistant",
  description:
    "ระบบผู้ช่วยด้านภาษีและการบัญชี จัดการรายรับรายจ่าย ใบเสร็จ และประเมินความเสี่ยงภาษี",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/fillax-mascot.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
