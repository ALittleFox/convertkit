import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "批量图片压缩",
  description:
    "免费在线批量图片压缩工具，支持 JPEG、PNG、WebP、AVIF 格式。可调节压缩质量，支持无损压缩，所有处理在浏览器本地完成。",
  keywords: [
    "图片压缩",
    "批量压缩",
    "JPEG压缩",
    "PNG压缩",
    "WebP压缩",
    "AVIF压缩",
    "无损压缩",
    "在线压缩",
  ],
};

export default function CompressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
