# ConvertKit

纯浏览器端的媒体处理工具：图片压缩 / 格式转换 / Favicon 生成 / 视频转码 / 音频转码。
所有处理都在本地完成，**文件不会上传到任何服务器**。

## 功能

所有页面均为静态生成（7 种语言 × 7 个页面 = 49 个预渲染页面），URL 形如
`/zh-Hans/compress`。访问不带语言前缀的路径（如 `/compress`）会按浏览器语言自动跳转。

### 批量压缩 — `/compress`

- JPEG、PNG、WebP、AVIF
- 可调质量（1–100）
- WebP 无损压缩、AVIF 压缩力度（effort）
- 压缩前后预览对比
- 单文件下载 / ZIP 打包下载

### 批量转换 — `/convert`

- JPEG、PNG、WebP、AVIF 互相转换
- 可调输出质量、AVIF effort
- 自动跳过已是目标格式的文件
- 单文件下载 / ZIP 打包下载

### Favicon 生成器 — `/favicon`

- 单图生成 `favicon.ico` 及多种尺寸 PNG（默认全选 7 种尺寸）
- 覆盖浏览器标签页、Apple Touch Icon、PWA 常用尺寸

### 视频转码 — `/transcode`

- 输出 MP4 / MOV
- 视频编码 H.264 / H.265（CRF 质量调节）
- 分辨率缩放（支持等比锁定）
- 可移除音频轨
- **仅桌面端**（需较大内存与算力）

### 音频转码 — `/audio`

- MP3、AAC、M4A、OGG、FLAC、WAV 互转
- 可调比特率与采样率
- 支持从 MP4 / WebM / MOV / AVI 视频中提取音频

### 各页面通用

- **自动处理**（默认开启）：添加文件后立即开始，可在设置面板关闭改为手动确认
- **常见问题**：每个页面底部附 5 条 FAQ
- **结构化数据**：每页输出 JSON-LD（`WebApplication` / `FAQPage` / `BreadcrumbList`），
  利于搜索富结果与 AI 助手理解页面用途

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router，全站静态生成 ISR） |
| UI | React 19 + Base UI + Tailwind CSS v4 + shadcn/ui |
| 主题 | next-themes（跟随系统 / 手动切换） |
| 国际化 | next-intl（7 语言，含 RTL 阿拉伯语） |
| 图片 WASM | @jsquash/jpeg · webp · avif · png · oxipng |
| 音视频 | @ffmpeg/ffmpeg + @ffmpeg/core（WebAssembly） |
| 并发 | Web Worker：图片走多 worker 池，音视频单 worker |
| ZIP 打包 | fflate |
| 测试 | Playwright E2E |

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 http://localhost:3000 。访问 `/compress` 会自动跳转到
`/<浏览器语言>/compress`。

## 项目结构

```
pic-html/
├── app/
│   ├── layout.tsx              # 根布局：<html> 壳 + 字体 + 全局 metadata
│   ├── [locale]/               # 所有本地化页面（generateStaticParams 预渲染）
│   │   ├── layout.tsx          # Providers / Header / Footer / Toaster
│   │   ├── page.tsx            # 首页
│   │   ├── compress/           # 图片压缩
│   │   ├── convert/            # 格式转换
│   │   ├── favicon/            # Favicon 生成
│   │   ├── transcode/          # 视频转码
│   │   ├── audio/              # 音频转码
│   │   └── privacy/            # 隐私声明
│   ├── globals.css             # Tailwind v4 + 主题变量 + 字体栈
│   ├── robots.ts               # robots.txt（静态生成）
│   ├── sitemap.ts              # sitemap.xml（含 hreflang 互链）
│   ├── error.tsx / not-found.tsx
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   ├── header.tsx              # 导航栏
│   ├── footer.tsx
│   ├── drop-zone.tsx           # 拖拽上传区
│   ├── file-card/              # 文件卡片（含进度/状态）
│   ├── preview-modal/          # 预览对比弹窗
│   ├── settings-panel.tsx      # 图片设置面板
│   ├── video-settings-panel.tsx
│   ├── audio-settings-panel.tsx
│   ├── summary-bar.tsx         # 统计摘要
│   ├── faq.tsx                 # 常见问题（原生 <details>，无额外依赖）
│   ├── json-ld.tsx             # 结构化数据（服务端渲染）
│   ├── language-switcher.tsx   # 语言切换（纯 URL，无 cookie）
│   ├── html-lang-sync.tsx      # 同步 <html lang/dir> 与当前语言
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── hooks/
│   └── use-batch-process.ts    # 通用批处理 Hook（三个引擎共用）
├── i18n/
│   ├── routing.ts              # 语言列表与 URL 策略（单一来源）
│   ├── request.ts              # 按路由段加载 messages（不读 headers）
│   └── navigation.ts           # locale 感知的 Link / usePathname
├── lib/
│   ├── worker-transport.ts     # Worker 传输层（池化 / 单例两种策略）
│   ├── worker-batch-engine.ts  # 通用批处理引擎（依赖 transport）
│   ├── batch-engine.ts         # 图片引擎（池化 transport）
│   ├── audio-batch-engine.ts   # 音频引擎（单 worker transport）
│   ├── video-batch-engine.ts   # 视频引擎（单 worker transport）
│   ├── file-utils.ts           # 文件校验（返回结构化错误码）
│   ├── video-utils.ts / audio-utils.ts / favicon-utils.ts
│   ├── create-layout.tsx       # 页面 metadata + JSON-LD 工厂
│   ├── site.ts                 # 站点常量（SITE_URL / OG_LOCALE）
│   ├── structured-data.ts      # JSON-LD 图构建
│   ├── task-types.ts / utils.ts / zip-stream.ts
├── workers/
│   ├── codec.worker.ts         # 图片 WASM 编解码
│   └── media-transcode.worker.ts # FFmpeg 音视频（音视频共用，含加载进度）
├── scripts/
│   ├── copy-ffmpeg.mjs         # 拷贝 FFmpeg WASM core 到 public/
│   ├── build.mjs               # 构建守门（强制 --webpack）
│   └── typecheck.mjs           # 清理 .next 类型缓存后跑 tsc
├── messages/                   # 7 种语言的翻译文件
├── proxy.ts                    # 语言协商与旧 URL 重定向
└── e2e/                        # Playwright 测试
```

## 脚本

```bash
pnpm dev        # 开发服务器
pnpm build      # 生产构建（先拷贝 FFmpeg core，再以 webpack 构建）
pnpm start      # 启动生产服务器
pnpm lint       # ESLint
pnpm typecheck  # 类型检查（先清理 .next/types 与 .next/dev/types）
pnpm test:e2e   # Playwright E2E
```

## 国际化与路由

- **语言**：`zh-Hans`、`zh-Hant`、`en`、`es`、`fr`、`pt`、`ar`（默认 `en`）
- **URL 始终带语言前缀**：`/<locale>/<page>`，这样才能把每种语言预渲染成
  独立静态页面。
- **不带前缀的路径**由 `proxy.ts` 按 `Accept-Language` 做 **307** 跳转。
  用 307 而非 301 是因为同一 URL 对不同访客会解析到不同语言，301 会被
  浏览器/CDN 永久缓存。
- **不使用 cookie**：语言完全由浏览器/系统设置决定。站内切换语言只改变 URL。
- **旧格式兼容**：`/compress/zh-Hans` → **301** `/zh-Hans/compress`
  （该格式的语言是显式的，可以安全地永久重定向）。

## 部署

**生产环境为 Vercel**，由 `.github/workflows/deploy.yml` 在推送到 `main` 时执行
`vercel build` + `vercel deploy --prebuilt`。

几个关键约束（都已在代码中固化，避免回归）：

1. **必须用 webpack 构建，不能用 Turbopack**
   `next build`（Next 16 默认的 Turbopack）在本项目会**永久挂起**：它启动的
   `.next/build/postcss.js` 子进程始终不返回，构建停在
   "Creating an optimized production build ..."。`next dev`（同为 Turbopack）
   正常，`next build --webpack` 正常，问题只存在于 Turbopack 的生产链路。
   `scripts/build.mjs` 在缺少 `--webpack` 时会直接报错退出。

2. **FFmpeg WASM core 是构建产物**
   `public/ffmpeg/` 被 `.gitignore` 忽略，由 `scripts/copy-ffmpeg.mjs` 在构建时
   从 `node_modules/@ffmpeg/core` 拷贝。`build` 脚本内联了这一步，不依赖 npm 的
   `prebuild` 钩子（`next build` 不会触发它）。

3. **安全响应头统一在 `next.config.ts`**
   COOP/COEP（FFmpeg 所需）、CSP、X-Frame-Options 等全部在 `headers()` 中声明，
   与平台无关；`vercel.json` 只保留构建命令，不重复配置头部。

4. **`<html lang>` 在客户端校正**
   Next 要求根布局拥有 `<html>`，而根布局在 `[locale]` 之上、拿不到语言，
   因此静态 HTML 的 `lang` 是默认值，由 `components/html-lang-sync.tsx` 在
   hydration 后修正（阿拉伯语同时设 `dir="rtl"`）。

> 注：仓库曾保留过一套未完成的 Cloudflare Workers 配置
> （`wrangler.jsonc` / `open-next.config.ts`），因缺少构建脚本从未可用，已移除。

## License

MIT
