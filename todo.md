# 实现完全静态化 (force-static) 改造步骤

## 问题

当前 `i18n/request.ts` 调用 `headers()` 获取 locale，导致所有使用 `next-intl` 服务端函数的组件被迫动态渲染，无法使用 `force-static`。

## 方案

将 locale 从请求头获取改为从 URL 路径参数获取（`/[locale]/compress`），配合 `generateStaticParams` 实现真正的静态生成。

## 步骤

### 1. 调整目录结构

将所有页面从 `app/xxx/` 移到 `app/[locale]/xxx/`：

```
app/
  [locale]/
    compress/page.tsx, layout.tsx
    convert/page.tsx, layout.tsx
    transcode/page.tsx, layout.tsx
    audio/page.tsx, layout.tsx
    favicon/page.tsx, layout.tsx
    privacy/page.tsx
    layout.tsx          # 子 layout（原 root layout 内容移入）
  layout.tsx            # 精简 root layout（仅 html/body 壳）
  page.tsx              # 根路由重定向
  not-found.tsx
  error.tsx
  sitemap.ts
  robots.ts
```

### 2. 修改 `i18n/request.ts`

移除 `headers()` 调用，改为从外部传入 locale：

```ts
export default getRequestConfig(async ({ locale }) => ({
  locale,
  messages: (await import(`../messages/${locale}.json`)).default,
}));
```

### 3. 在 `[locale]/layout.tsx` 中获取 locale

```tsx
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  // ...
}
```

### 4. 修改 middleware.ts

- 移除 locale 路径改写逻辑（不再需要 `/compress/zh-Hans` → `/compress`）
- 保留非 locale 路径的重定向（如 `/compress` → `/compress/en`）
- 或直接移除 middleware，让 Next.js 自动处理 `[locale]` 路由

### 5. 修改所有页面和组件的链接

- `language-switcher.tsx`：链接改为 `/[locale]/xxx` 格式
- `header.tsx`：导航链接加上 locale 前缀
- 所有 `<Link>` 和 `router.push` 调用更新路径

### 6. 添加 `force-static` 到所有页面和 layout

```tsx
export const dynamic = "force-static";
```

### 7. 修改 sitemap.ts

URL 格式从 `/compress/zh-Hans` 改为 `/zh-Hans/compress`。

### 8. 处理根路径 `/`

`app/page.tsx` 根据 Accept-Language 或默认 locale 重定向到 `/en/compress`。

## 影响范围

- 所有页面文件位置变更
- 所有内部链接需要更新
- middleware 逻辑重写
- i18n 配置简化
- URL 结构变更（SEO 影响：旧链接需要 301 重定向）

## 风险

- URL 结构变更影响已有搜索引擎索引
- 需要处理旧 URL 格式的兼容重定向
- 改动范围较大，需充分测试
