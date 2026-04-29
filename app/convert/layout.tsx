import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "批量格式转换",
  description:
    "免费在线批量图片格式转换工具，支持 JPEG、PNG、WebP、AVIF 互相转换。可调节输出质量，所有处理在浏览器本地完成。",
  keywords: [
    "格式转换",
    "图片转换",
    "WebP转换",
    "AVIF转换",
    "PNG转JPEG",
    "JPEG转PNG",
    "在线转换",
    "批量转换",
  ],
};

export default function ConvertLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
