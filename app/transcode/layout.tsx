import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "视频转码",
  description:
    "免费在线视频转码工具，支持 MP4、WebM、MOV、GIF 格式转换。可调节编码和质量，所有处理在浏览器本地完成。",
  keywords: [
    "视频转码",
    "格式转换",
    "MP4转换",
    "WebM转换",
    "视频压缩",
    "在线转码",
    "GIF制作",
  ],
};

export default function TranscodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
