import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ConvertKit - 免费在线图片压缩、格式转换与视频转码工具",
    template: "%s | ConvertKit",
  },
  description:
    "纯浏览器端的免费媒体处理工具，支持图片压缩、格式转换和视频转码。所有处理在本地完成，文件不会上传到服务器，保护您的隐私。",
  keywords: [
    "图片压缩",
    "批量压缩",
    "格式转换",
    "图片转换",
    "视频转码",
    "WebP转换",
    "AVIF转换",
    "PNG压缩",
    "JPEG压缩",
    "在线图片工具",
    "免费图片压缩",
    "图片优化",
    "无损压缩",
    "视频压缩",
    "MP4转换",
  ],
  authors: [{ name: "ConvertKit" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "ConvertKit - 免费在线图片压缩、格式转换与视频转码工具",
    description:
      "纯浏览器端的免费媒体处理工具，支持图片压缩、格式转换和视频转码，所有处理在本地完成。",
    siteName: "ConvertKit",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
