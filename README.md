# ConvertKit

纯浏览器端的媒体处理工具，支持图片压缩、格式转换和视频转码。所有处理在本地完成，文件不会上传到任何服务器。

## 功能

### 批量压缩 (`/compress`)

- 支持 JPEG、PNG、WebP、AVIF 四种格式
- 可调节压缩质量 (1-100)
- WebP 无损压缩选项
- AVIF 压缩力度调节（速度/质量平衡）
- 压缩前后图片预览对比
- 单文件下载 / ZIP 打包下载

### 批量转换 (`/convert`)

- JPEG、PNG、WebP、AVIF 互相转换
- 可调节输出质量
- AVIF 压缩力度调节
- 自动跳过已匹配目标格式的文件
- 单文件下载 / ZIP 打包下载

### 视频转码 (`/transcode`)

- 支持 MP4、WebM、MOV、GIF 格式
- 可选视频编码：H.264、H.265、VP9
- CRF 质量调节
- 分辨率缩放（支持等比锁定）
- 可移除音频轨道
- 单文件下载 / ZIP 打包下载

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, 静态导出) |
| UI | React 19 + shadcn/ui + Tailwind CSS v4 |
| 主题 | next-themes (跟随系统 / 手动切换) |
| 图片 WASM | @jsquash/jpeg, @jsquash/webp, @jsquash/avif, @jsquash/png |
| 视频转码 | @ffmpeg/ffmpeg + @ffmpeg/core |
| 并发处理 | Web Worker 池 (自动匹配 CPU 核心数, 最多 4 个) |
| ZIP 打包 | fflate |
| 测试 | Playwright E2E |

## 快速开始

```bash
pnpm install
pnpm dev
```

浏览器打开 http://localhost:3000

## 项目结构

```
pic-html/
├── app/
│   ├── layout.tsx              # 根布局 (ThemeProvider + Header + Toaster)
│   ├── page.tsx                # 首页重定向到 /compress
│   ├── globals.css             # Tailwind CSS v4 + 主题变量
│   ├── compress/page.tsx       # 压缩页面
│   ├── convert/page.tsx        # 转换页面
│   └── transcode/page.tsx      # 转码页面
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   ├── header.tsx              # 导航栏
│   ├── drop-zone.tsx           # 拖拽上传区
│   ├── file-card.tsx           # 图片文件卡片
│   ├── settings-panel.tsx      # 图片设置面板
│   ├── video-file-card.tsx     # 视频文件卡片
│   ├── video-settings-panel.tsx # 视频设置面板
│   ├── video-preview-modal.tsx # 视频预览弹窗
│   ├── summary-bar.tsx         # 统计摘要栏
│   ├── preview-modal.tsx       # 图片预览对比弹窗
│   ├── theme-provider.tsx      # next-themes Provider
│   └── theme-toggle.tsx        # 主题切换按钮
├── hooks/
│   ├── use-batch-process.ts    # 图片批处理 Hook
│   └── use-video-batch-process.ts # 视频批处理 Hook
├── lib/
│   ├── utils.ts                # 工具函数
│   ├── file-utils.ts           # 图片文件验证
│   ├── video-utils.ts          # 视频文件验证
│   ├── zip-stream.ts           # ZIP 打包下载
│   ├── worker-manager.ts       # WorkerPool 类
│   ├── batch-engine.ts         # 图片批处理引擎
│   ├── audio-batch-engine.ts   # 音频批处理引擎
│   └── video-batch-engine.ts   # 视频批处理引擎
├── workers/
│   ├── codec.worker.ts         # 图片 WASM 编解码 Worker
│   └── media-transcode.worker.ts  # FFmpeg 音视频转码 Worker（音视频共用）
└── e2e/                        # Playwright E2E 测试
```

## 脚本

```bash
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产版本
pnpm start      # 启动生产服务器
pnpm lint       # ESLint 检查
pnpm test:e2e   # 运行 E2E 测试
```

## License

MIT
