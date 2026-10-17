# ConvertKit 项目优化报告

> 生成日期：2026-10-17
> 分析范围：`app/`、`components/`、`lib/`、`hooks/`、`workers/`、`i18n/`、配置文件、E2E 测试
> 代码规模：约 5,300 行 TypeScript/TSX

---

## 一、总体评估

这是一个架构清晰的纯前端媒体处理工具，**核心设计合理**：

| 优点 | 说明 |
|---|---|
| 隐私优先 | 所有处理在浏览器完成，无上传，符合当前定位 |
| WASM 选型得当 | 图片用 `@jsquash/*`（轻量），音视频用 `@ffmpeg`（能力全） |
| Worker 隔离 | CPU 密集任务不阻塞主线程，避免 UI 卡死 |
| i18n 完整 | 7 种语言，含 RTL（ar） |
| 引擎抽象 | `createWorkerBatchEngine` 泛型工厂，音视频共用一套逻辑 |

但存在**若干影响可维护性和可靠性的问题**，按优先级列出如下。

---

## 二、P0 — 必须修复（可靠性问题）

### 1. E2E 测试套件已完全失效（26 个测试中 19 个失败）

**现状**：`pnpm test:e2e` 通过率仅 27%（7/26）。

**根因**：
- `navigation.spec.ts` 断言 `page.goto("/")` 会重定向到 `/compress`，但项目早已改成有独立首页 `app/page.tsx`，不再重定向。
- 断言文本使用旧文案，例如 `拖拽图片到此处`，而当前 `DropZone` 在桌面端渲染的是 `dropzone.dragImage`（"拖拽图片到此处"在移动端才显示），且 locale 解析依赖 `Accept-Language`，测试未固定 locale。

**影响**：CI 中 `test` 形同虚设，任何回归都无法被发现。

**建议**：
1. 删除或重写 `navigation.spec.ts` 中"根路径重定向"的用例。
2. 所有测试固定 locale（`page.goto("/compress/zh-Hans")`），避免依赖 `Accept-Language` 导致的不确定性。
3. 断言改用 `getByRole`/`data-testid`，而非硬编码中文文案（文案会随 i18n 变化）。
4. 在 CI 中加入 `test:e2e`（当前 `.github/workflows/deploy.yml` 只跑构建+部署，不跑测试）。

```ts
// 建议在 playwright.config.ts 中统一注入
use: {
  baseURL: "http://localhost:3000",
  locale: "zh-CN",
  extraHTTPHeaders: { "Accept-Language": "zh-Hans,zh;q=0.9" },
}
```

### 2. 源码中存在 10 个 ESLint error（会阻断严格 CI）

| 文件 | 问题 |
|---|---|
| `hooks/use-batch-process.ts:49,51,53` | **渲染期间更新 ref**（`tasksRef.current = tasks`）→ React 并发模式下的常见反模式 |
| `app/compress/page.tsx:197` | 2 处 `as any` |
| `app/convert/page.tsx:193` | 2 处 `as any` |
| `lib/worker-batch-engine.ts:20` | `data: any` |
| `app/transcode/page.tsx:28`、`components/theme-toggle.tsx:15` | effect 内同步 `setState`（级联渲染） |

**重点修复 `use-batch-process.ts`**（真正的逻辑隐患）：

```ts
// 现状：渲染期间写 ref
const tasksRef = useRef<T[]>([]);
tasksRef.current = tasks;              // ❌ 渲染期间副作用

// 建议：改为 effect 同步
useEffect(() => {
  tasksRef.current = tasks;
}, [tasks]);
```

> 注：`use-batch-process` 用 3 个 ref 镜像 state，说明 `processBatch` 回调闭包存在**陈旧值风险**。更彻底的方案是让 `config.processBatch` 的回调通过 `setTasks(prev => ...)` 函数式更新，从而完全去掉 ref 镜像。

### 3. `.next/types` 残留导致 `tsc` 报错

**现状**：直接运行 `npx tsc --noEmit` 会报 6 个错误，全部指向 `.next/types/app/lyrics/*`——这是**已删除的歌词功能**遗留的生成类型。

**根因**：`.next/` 缓存陈旧，且 `tsconfig.json` 的 `include` 里包含 `.next/types/**/*.ts`。

**修复**：`rm -rf .next && npx tsc --noEmit`（已经验证清除后无错误）。加上 `prebuild` 清理或改用 `next build` 自带的类型检查即可。

---

## 三、P1 — 强烈建议优化

### 4. 静态化与 i18n 的根本矛盾（架构级）

**现状**：`i18n/request.ts` 调用 `headers()` 读取 `x-locale`：

```ts
const headerStore = await headers();        // ← 强制所有页面动态渲染
const locale = headerStore.get("x-locale") ?? parseAcceptLanguage(...);
```

**后果**：尽管各 `layout.tsx` 都写了 `export const revalidate = 31536000`，**所有页面实际仍是动态渲染（ƒ）**，无法真正静态化，Cloudflare/Vercel 上白白消耗计算资源。

**项目里已经有一份现成的方案文档**（`todo.md`），核心是改为 `app/[locale]/...` + `generateStaticParams`：

```
app/
  [locale]/
    compress/page.tsx
    convert/page.tsx
    ...
```

**收益**：
- 7 种语言 × 6 个页面 = 42 个静态页，全部 CDN 直出，TTFB 显著降低
- 去除 middleware 的 rewrite 开销
- 更好的 SEO（URL 语义化 `/zh-Hans/compress`）

**风险**：URL 结构变更会破坏现有索引，需要 301 重定向。建议**分阶段**：先加 `[locale]` 路由并保留旧路径 rewrite，观察后再移除。

> 如果短期不想动路由结构，至少可以把 `revalidate` 相关的误解清理掉，避免误导后续维护者。

### 5. 依赖冗余与命名问题

| 问题 | 详情 |
|---|---|
| `shadcn` 是 devDependency | 它是 CLI 工具，不该出现在 `dependencies`，且**代码中 0 引用** |
| `@ffmpeg/core` 在 dependencies | 只由 `scripts/copy-ffmpeg.mjs` 在构建时拷贝到 `public/`，运行时不用，应移到 `devDependencies` |
| `package.json` name | 仍叫 `pic-html-temp`，与产品名 ConvertKit 不符 |
| `@radix-ui/react-switch` | 只 1 处引用，而 `@base-ui/react` 已是 UI 基座——存在**两套 UI 原语**并存 |

**建议**：
```jsonc
// 清理
"dependencies": {
  // 移除 shadcn（CI 工具，代码无引用）
},
"devDependencies": {
  "@ffmpeg/core": "^0.12.10",   // 从 dependencies 移过来
  "shadcn": "^4.5.0"            // 若仍需 CLI 则放这里
}
```

统一 UI 原语到 `@base-ui/react`，移除 `@radix-ui/react-switch`。

### 6. 死代码

| 文件 | 问题 |
|---|---|
| `hooks/use-worker-pool.ts` | **全项目 0 引用**，可删除 |
| `lib/batch-engine.ts:42` | `blob` 变量赋值后未使用 |
| `components/language-switcher.tsx:8` | `Link` 导入未使用（改用 `<a>`） |
| `components/summary-bar.tsx:3` | `Loader2` 导入未使用 |
| `app/convert/page.tsx:15` | `mimeToExt` 导入未使用 |
| `public/*.svg` | `file.svg`/`globe.svg`/`next.svg`/`vercel.svg`/`window.svg` 是 create-next-app 模板残留 |

### 7. 硬编码中文未走 i18n

错误与 toast 文案写死中文，导致**非中文用户看到中文报错**：

```ts
// lib/file-utils.ts:18
error: `不支持的格式: ${file.type || "未知"}`

// lib/worker-batch-engine.ts:80
err instanceof Error ? err.message : "处理失败"

// hooks/use-batch-process.ts:88-105
toast.error(`${task?.file.name || "文件"} 处理失败`, { description: error || "未知错误" })
toast.success("处理完成")
`${n} 个成功，${m} 个失败`
```

**建议**：`lib/` 层返回**错误码**（如 `{ code: "UNSUPPORTED_FORMAT", detail: mime }`），由 UI 层用 `t()` 翻译。

```ts
// lib/file-utils.ts
return { valid: false, code: "UNSUPPORTED_FORMAT", detail: file.type };

// hooks/use-batch-process.ts
toast.error(t("toast.failed", { name: file.name }));
```

### 8. `img` 标签使用（6 处 ESLint warning）

`app/compress`、`app/convert`、`app/favicon` 用原生 `<img>` 展示预览缩略图。

**说明**：这些是 **blob URL 本地预览**，用 `next/image` 反而会走图片优化管线（无意义且可能报错）。**建议保留 `<img>`**，但为消除告警可加行内注释说明理由，或配置 ESLint 对这几行豁免：

```tsx
{/* eslint-disable-next-line @next/next/no-img-element -- blob URL 本地预览，无需优化 */}
<img src={task.originalUrl} alt={task.file.name} />
```

另外 `components/header.tsx:31` 的 `Image`（lucide 图标）缺少 `aria-hidden`，属于 a11y warning，加 `aria-hidden="true"` 即可。

---

## 四、P2 — 可选优化（性能与体验）

### 9. FFmpeg core（31MB）按需加载

`public/ffmpeg/ffmpeg-core.wasm` 有 **31MB**。虽然 `media-transcode.worker.ts` 是懒加载（只有进入音频/视频页才 `new Worker`），但仍可优化：

- **音频页面**其实只需要解码器 + 编码器，不需要 H.265/VP9 等视频编码器。可考虑用自定义裁剪的 core，或
- 首次加载时显示明确的进度条（31MB 下载在慢网下体验很差）
- 建议在 `ffmpeg.load()` 上加 `progress` 回调（`@ffmpeg/util` 支持），展示下载进度

```ts
await ffmpeg.load({
  coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
  wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
});
// 建议：先 fetch + 读 Content-Length，再报告进度
```

### 10. 三个 batch engine 抽象不一致

```
lib/batch-engine.ts          ← 图片，走 WorkerPool（多 worker 池）
lib/worker-batch-engine.ts   ← 泛型工厂，供音视频用（单 worker）
lib/audio-batch-engine.ts    ← 用上面
lib/video-batch-engine.ts    ← 用上面
```

图片走**池化**（`WorkerPool`，最多 4 个并发），音视频走**串行单 worker**。这个差异是合理的（FFmpeg 单实例内存占用大），但**两套 API 形状不同**（`processFile` vs `processBatch`），调用侧无法统一。

**建议**：把 `WorkerPool` 也包装成 `createWorkerBatchEngine` 的一个实现，让三个页面共享同一套 `useBatchProcess` 调用形态。

### 11. 图片预览用 blob URL 未及时释放

`app/compress/page.tsx` 等页面用 `URL.createObjectURL(file)` 生成预览，但**移除任务/清空列表时未调用 `URL.revokeObjectURL`**，大批量文件下会累积内存泄漏。

**建议**：在 `removeTask` / `clearTasks` 中释放：

```ts
const removeTask = (id: string) => {
  const t = tasks.find(x => x.id === id);
  if (t?.originalUrl) URL.revokeObjectURL(t.originalUrl);
  // ...
};
```

### 12. `sitemap.xml` 是手写静态文件

`public/sitemap.xml` 手写了所有 URL，新增页面需手动同步，容易遗漏。且当前包含 `/zh-Hans` 等路径，与 middleware 的 rewrite 逻辑耦合。

**建议**：改用 `app/sitemap.ts`（Next.js 原生 API），由代码生成。注意：之前 `todo.md` 提到曾移除动态 sitemap，若为纯静态部署需要，可保留静态文件但加一个生成脚本，避免手写。

### 13. 字体加载

`app/layout.tsx` 用 `next/font/google` 加载 Geist + Geist Mono（两套），但项目中文为主，Geist **不含中文字形**，中文实际回退到系统字体。可考虑：

- 只保留 Geist Sans（等宽字体 `Geist_Mono` 似乎并未在代码中作为 `font-mono` 使用，可确认后删除）
- 或显式声明中文回退栈，避免不同系统渲染差异

### 14. 缺少 CSP / 安全响应头

`next.config.ts` 设置了 COOP/COEP（FFmpeg 多线程所需，动机正确），但缺少：

```
Content-Security-Policy
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: SAMEORIGIN
```

纯前端应用风险较低，但 COEP `credentialless` + 无 CSP 的组合建议补齐基础头。

### 15. `Cache-Control` 头在 dev 环境产生警告

`next.config.ts` 对 `/_next/static/:path*` 设 `immutable`，Next.js 16 dev 启动时警告：

> Setting a custom Cache-Control header can break Next.js development behavior.

**建议**：仅在生产环境设置：

```ts
async headers() {
  if (process.env.NODE_ENV !== "production") return [];
  // ...
}
```

### 16. 双部署配置并存

项目同时存在：
- `vercel.json`（Vercel 部署）
- `wrangler.jsonc` + `open-next.config.ts`（Cloudflare Workers）

`README` 的分支与部署目标不明确，容易出现"改了 vercel 忘了 wrangler"。**建议**明确主部署目标，删除未用的那份，或至少在 README 写清两者用途。

### 17. `middleware.ts` 已废弃

Next.js 16 启动警告：

> The "middleware" file convention is deprecated. Please use "proxy" instead.

建议迁移到 `proxy.ts`（Next.js 16 新约定），消除警告并为未来升级铺路。

---

## 五、优先级建议执行顺序

| 阶段 | 任务 | 预估工作量 |
|---|---|---|
| **第 1 周** | 修 E2E（重写断言 + 固定 locale）、清 `.next` 修 tsc、修 `use-batch-process` ref 反模式、消除 10 个 ESLint error | 1–2 天 |
| **第 2 周** | 删除死代码/依赖、i18n 化错误文案、释放 blob URL、CI 加 `lint`+`test` | 1–2 天 |
| **第 3 周** | 依赖归位（`@ffmpeg/core`→dev、删 `shadcn`）、统一 UI 原语、生产环境才设 Cache-Control | 1 天 |
| **后续** | `[locale]` 静态化改造（按 `todo.md`）、FFmpeg 加载进度、CSP | 3–5 天 |

---

## 六、附：检查命令备忘

```bash
# 类型检查（先清 .next 缓存）
rm -rf .next && npx tsc --noEmit

# 仅检查源码（排除 public 下的 FFmpeg 产物）
npx eslint app components lib hooks workers i18n --ext .ts,.tsx

# E2E（当前 19/26 失败，需先修复）
pnpm test:e2e

# 查找死代码
grep -rn "use-worker-pool" app components lib hooks

# 查找硬编码中文
grep -rn "[一-龥]" lib hooks --include="*.ts" | grep -v "^Binary"
```

---

## 七、结论

项目**核心功能与架构没有问题**，主要短板集中在：

1. **测试失效**（P0）——最该优先修，否则任何改动都是盲改
2. **若干 ESLint error 与 React 反模式**（P0）——`use-batch-process` 的 ref 镜像值得重构
3. **静态化名不副实**（P1）——`headers()` 让 `revalidate` 形同虚设，是最大的性能优化空间
4. **依赖/死代码/i18n 债务**（P1–P2）——清理成本低、收益明确

建议先做「第 1 周」的三件事，项目即可恢复到**可信赖的工程状态**；静态化改造收益最大但需谨慎处理 URL 兼容。

---

## 附：修复进展（2026-10-17）

以下条目已按本报告逐条修复，每项一次独立提交：

| # | 项目 | 状态 | Commit |
|---|---|---|---|
| 1 | E2E 测试套件失效（7/26 → 26/26） | ✅ 完成 | `5f2ecc1` |
| 2 | 源码 ESLint error（10 个） | ✅ 完成 | `cc2ffcf` |
| 3 | `.next` 类型残留导致 tsc 报错 | ✅ 完成（新增 `pnpm typecheck`） | `808997a` |
| 5 | 依赖冗余（name / @ffmpeg/core） | ✅ 部分完成（见注 1） | `4f2c74c` |
| 6 | 死代码清理 | ✅ 完成 | `c0341a3` |
| 7 | 硬编码中文 → i18n | ✅ 完成（7 语言 + 结构化错误码） | `19a1a94` |
| 8 | `<img>` / a11y warning | ✅ 完成（全项目 0 warning） | `682b353` |
| 11 | blob URL 释放（favicon 页） | ✅ 完成 | `20ea887` |
| 15 | dev 环境 Cache-Control 警告 + 安全头 | ✅ 完成 | `1299ded` |
| 17 | middleware.ts → proxy.ts | ✅ 完成 | `415c1f7` |

**注 1**：报告原判「`shadcn` 零引用可删除」是**错误**的——它被 `app/globals.css`
的 `@import "shadcn/tailwind.css"` 引用，删除会导致构建失败。已保留。

### 当前基线

```
pnpm typecheck  → 0 errors
eslint .        → 0 errors, 0 warnings
pnpm test:e2e   → 26/26 passed
pnpm build      → success
```

### 仍未处理（需产品/架构决策）

| # | 项目 | 说明 |
|---|---|---|
| 4 | `[locale]` 静态化改造 | 收益最大但会变更 URL 结构、影响 SEO，需要单独规划迁移与 301 策略 |
| 9 | FFmpeg 31MB 加载进度 | 体验优化，需设计加载 UI |
| 10 | batch engine 抽象统一 | 中等重构，收益偏内部一致性 |
| 12 | sitemap 生成方式 | 与静态化方案耦合，建议一并处理 |
| 13 | 字体（Geist 无中文字形） | 需确认设计意图 |
| 14 | CSP | 需逐项梳理内联脚本/样式来源，风险较高 |
| 16 | Vercel + Cloudflare 双配置 | 需明确主部署目标 |

