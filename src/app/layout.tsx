import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Online Judge",
  description: "Hệ thống chấm bài tự động",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-gray-100 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
