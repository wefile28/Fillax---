import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fillax — ระบบวิเคราะห์รายจ่ายและภาษีแม่ค้าออนไลน์อัจฉริยะ",
  description: "ที่ปรึกษาภาษีส่วนตัวอัจฉริยะแม่ค้าออนไลน์ไทย สแกนสลิปรายจ่ายผ่านไลน์ อุ่นใจสรรพากรไม่เรียกเก็บย้อนหลัง",
  icons: {
    icon: "/fillax-mascot-v4.png",
    shortcut: "/fillax-mascot-v4.png",
    apple: "/fillax-mascot-v4.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
