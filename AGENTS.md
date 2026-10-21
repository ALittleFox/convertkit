# AGENTS.md

ConvertKit：纯浏览器端媒体处理工具（Next.js 16 App Router）。
所有处理在本地完成，**任何功能都不得上传用户文件**。

## 命令

```bash
pnpm dev         # 开发（Turbopack OK）
pnpm build       # 生产构建（必须走 webpack，见下）
pnpm typecheck   # tsc（会先清 .next/types 缓存）
pnpm lint        # eslint，必须 0 error 0 warning
pnpm test:e2e    # Playwright，必须全绿
```

改完代码至少跑：`pnpm typecheck && pnpm lint && pnpm test:e2e && pnpm build`。

## 不可违反的约束

1. **构建必须用 webpack**
   `next build`（Turbopack，Next 16 默认）在本仓库会永久挂起
   （`.next/build/postcss.js` 子进程不返回）。始终用 `pnpm build`；
   `scripts/build.mjs` 会在缺 `--webpack` 时直接报错。

2. **`i18n/request.ts` 不得调用 `headers()` 等动态 API**
   一旦调用，全站退化为动态渲染，所有页面的 `revalidate` 失效。
   语言只来自 `app/[locale]` 的路由段。

3. **URL 必须带语言前缀** `/<locale>/<page>`
   静态生成依赖于此。不带前缀的路径由 `proxy.ts` 按 `Accept-Language`
   做 **307** 跳转（不能用 301：同 URL 对不同访客解析到不同语言）。
   **不使用语言 cookie**（这是既定设计，不要加回来）。

4. **`<html>` 只能由 `app/layout.tsx` 拥有**
   移到 `[locale]/layout.tsx` 会让所有路由变动态。
   因此 `lang`/`dir` 由 `components/html-lang-sync.tsx` 在客户端校正。

5. **FFmpeg core 是构建产物**
   `public/ffmpeg/` 被 gitignore，由 `scripts/copy-ffmpeg.mjs` 拷贝。
   不要提交这些文件，也不要把拷贝逻辑依赖 npm 的 `prebuild` 钩子。

## 代码约定

- **路径别名** `@/*`（指向仓库根）。ESLint 严格要求 0 warning，新增
  `any` / 未使用变量 / `setState` in effect 都会失败。
- **React 反模式**：不要在渲染期间写 ref；用 `useEffect` 同步。
  需要「客户端才知道的值」时用 `useSyncExternalStore`，不要 `setState` in effect。
- **i18n**：所有面向用户的文案走 `messages/*.json`（7 种语言，缺一不可）。
  新增文案需同时补齐 7 个文件；`lib/` 层返回**错误码**而非文案，由 UI 翻译。
- **Worker**：`lib/worker-transport.ts` 提供 `createPooledTransport`（图片，
  多 worker）与 `createSingleTransport`（音视频，单 worker）。新引擎复用它，
  不要另起一套。
- **图片预览**用 `blob:` URL + 原生 `<img>`（`next/image` 无法优化 blob）；
  替换或删除时记得 `URL.revokeObjectURL`。
- 新增页面放在 `app/[locale]/<name>/`，并用 `lib/create-layout.tsx`
  的 `createPageMetadata` 生成 metadata。

## 结构化数据（SEO / GEO）

- 站点常量只在 `lib/site.ts`（`SITE_URL` / `OG_LOCALE`），**不要新增硬编码域名**。
- 功能页的 JSON-LD 由 `lib/create-layout.tsx` 的 `createPageLayout(ns)` 生成，
  页面 layout 只需 `export default createPageLayout("compress")`。
- FAQ 的可见文案与 JSON-LD 读的是**同一个** `faqItems`，改文案不会产生不一致。
- `inLanguage` / `og:locale` 用 `zh_CN` 形式（`zh-Hans` 不是合法值），
  映射在 `OG_LOCALE`；新增语言必须补这张表。
- JSON-LD 里的 `<` 已转义为 `\u003c`，否则翻译文案中的 `</script>` 会截断标签。

## 修改后的自查

- [ ] 新增页面是否已加入 `app/sitemap.ts` 的 `PAGES`？
- [ ] 新增页面是否接入了 `createPageLayout`（JSON-LD）与 canonical/hreflang？
- [ ] 新增文案是否 7 种语言齐全？
- [ ] 是否引入了动态 API（`headers()`/`cookies()`）破坏静态化？
- [ ] 构建产物仍是 `●`（SSG）而非 `ƒ`（Dynamic）？
- [ ] **本次改动是否影响了 `README.md` / `AGENTS.md`？** 有则同步更新：
      新增/删除文件 → README 结构树；新增功能 → README 功能章节；
      新增约束或踩过的坑 → AGENTS.md 对应小节。没有实质影响才可跳过。

## 参考

- `README.md` —— 功能、结构、部署说明
