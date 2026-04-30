import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favicon 生成器",
  description:
    "免费在线 Favicon 生成工具，上传图片自动生成多种尺寸的 favicon.ico 和 PNG 图标。支持常见尺寸，纯浏览器端处理。",
  keywords: [
    "favicon",
    "favicon生成",
    "ico生成",
    "网站图标",
    "favicon.ico",
    "在线工具",
  ],
};

export default function FaviconLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
