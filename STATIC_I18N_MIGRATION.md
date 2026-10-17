# 静态化改造（P1-4）：如何继续自动适配访问者语言

> 关联文档：`OPTIMIZATION_REPORT.md` 的 P1-4 条目、`todo.md`（原始改造步骤）
> 结论：静态化与「按浏览器语言自动适配」**不能同时作用于同一个 URL**，
> 必须用「URL 携带语言 + 根路径协商重定向」的方式实现。

---

## 1. 当前为什么能做到"自动适配"

当前所有页面是**动态渲染**的，链路如下：

```
用户访问 /compress
  │
  ├─ proxy.ts           无 locale 前缀 → 放行（NextResponse.next()）
  ├─ i18n/request.ts    headers() 读取 Accept-Language
  │                      "zh-CN,zh;q=0.9" → "zh-Hans"
  └─ 每次请求都重新渲染成对应语言的 HTML
```

关键点：`i18n/request.ts` 里的 `await headers()` 是 **Next.js 的动态 API**。
一旦调用它，整条渲染链路就被标记为动态——这正是各页面 `export const revalidate = 31536000`
完全不起作用的原因（这也是 P1-4 要解决的核心问题）。

```ts
// i18n/request.ts（现状）
export default getRequestConfig(async () => {
  const headerStore = await headers();          // ← 强制动态渲染
  const overrideLocale = headerStore.get("x-locale");
  const locale = overrideLocale ?? parseAcceptLanguage(headerStore.get("accept-language") || "");
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
```

---

## 2. 静态化后的根本矛盾

静态化的本质是 **构建时生成 HTML，之后不再变化**。
而 `Accept-Language` 是 **运行时、每个访客各不相同的请求头**。

**静态 HTML 无法在响应时按访客决定语言。** 这是规范层面的限制，
不是实现技巧问题——同一个静态文件不可能对 A 用户输出中文、对 B 用户输出英文。

因此必须把「语言」放进 **URL**，让不同语言成为不同的静态资源：

```
/zh-Hans/compress   → 静态 HTML（中文）
/en/compress        → 静态 HTML（英文）
/es/compress        → 静态 HTML（西班牙语）
```

---

## 3. 方案 A：URL 强制带语言 + 根路径 302 协商（推荐）

```
/[locale]/compress   → 静态页面（6 个功能页 + 首页，共 7 个 × 7 语言 = 49 个 HTML）
/compress            → 302 重定向到 /<协商出的语言>/compress
/                    → 302 重定向到 /<协商出的语言>
```

### 关键点一：3xx 用 302/307，绝不能用 301

同一个 `/compress` 对不同用户会跳到不同语言。301 会被浏览器和 CDN
**永久缓存**——一旦某个用户访问后被缓存成中文，之后所有访问者（包括英文用户）
都会被带到中文页面。这是这类方案最典型的翻车点。

### 关键点二：语言完全由浏览器/系统设置决定，不使用 cookie

按本方案的设计决定，**不读取、也不写入任何语言 cookie**。语言来源
只有一处——请求的 `Accept-Language` 头，也就是浏览器的语言设置
（多数浏览器默认跟随操作系统语言）：

```ts
const locale = negotiate(req.headers.get("accept-language") ?? "");
```

这样做的好处：

- **行为可预期**：用户在浏览器里改语言设置，网站立刻跟随，不会出现
  "网站记着旧选择、和系统设置打架"的情况。
- **对 CDN 友好**：没有 cookie 参与协商，缓存键更简单（配合下文 `Vary`）。
- **无需首屏脚本**：不必在客户端写/读 cookie，减少一次阻塞逻辑。

代价与应对：

- 用户在站内通过语言切换器选了非首选语言，**下次从根路径进入时会被
  带回浏览器语言**。这不是 bug，而是"根路径 = 按浏览器语言推荐"的既定语义。
  切换器本身仍然工作——它直接把用户带到 `/<locale>/...`；只有在用户
  访问**不带语言前缀**的 URL 时，才会重新按浏览器语言协商。
- 因此建议：站内所有链接一律指向 `/<locale>/...`（见改造清单），
  让用户只在首次进入或手动输入裸 URL 时才触发协商。

### 关键点三：给协商重定向加 `Vary: Accept-Language`

否则 CDN 可能把「某语言的跳转结果」缓存并返回给所有用户。

### 参考实现（proxy.ts）

```ts
import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["zh-Hans", "zh-Hant", "en", "es", "fr", "pt", "ar"] as const;
const DEFAULT_LOCALE = "en";

/** 复用现有 i18n/request.ts 的匹配逻辑（含 zh-TW→zh-Hant、zh-*→zh-Hans 等） */
function negotiate(acceptLanguage: string): string {
  const languages = acceptLanguage
    .split(",")
    .map((part) => {
      const [code, q] = part.trim().split(";q=");
      return { code: code.trim(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  // 与现有 i18n/request.ts 的 parseAcceptLanguage 保持一致
  for (const { code } of languages) {
    if (LOCALES.includes(code as never)) return code;
    if (code === "zh-TW" || code === "zh-Hant" || code === "zh-Hant-TW") return "zh-Hant";
    if (code === "zh-CN" || code === "zh-Hans" || code === "zh-Hans-CN") return "zh-Hans";
    if (code.startsWith("zh")) return "zh-Hans";
    if (code.startsWith("es")) return "es";
    if (code.startsWith("fr")) return "fr";
    if (code.startsWith("pt")) return "pt";
    if (code.startsWith("ar")) return "ar";
    if (code.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  // 1) 已带语言前缀 → 直接放行，命中静态 HTML，零运行时成本
  if (LOCALES.includes(first as never)) return NextResponse.next();

  // 2) 旧 URL 兼容：/compress/zh-Hans → /zh-Hans/compress
  //    旧格式的语言是【路径第二段】，可确定语言，因此可用 301（利于 SEO）
  if (segments.length >= 2 && LOCALES.includes(segments[1] as never)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${segments[1]}/${segments[0]}`;
    return NextResponse.redirect(url, 301);
  }
  //    /zh-Hans → /zh-Hans（首页，已带前缀，不会走到这里）

  // 3) 未带语言 → 按浏览器语言协商后 302 跳转（不可用 301，见上文）
  //    不读 cookie：语言完全由浏览器/系统设置决定
  const locale = negotiate(req.headers.get("accept-language") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  const res = NextResponse.redirect(url, 302);
  res.headers.set("Vary", "Accept-Language");
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

### 参考实现（i18n/request.ts 改造后）

```ts
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  // 不再调用 headers()：locale 来自 URL 段，页面因此可以静态化
  const locale = (await requestLocale) ?? "en";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

---

## 4. 备选方案（均不推荐，说明原因）

### 方案 B：保留一个动态入口页

只静态化 `/[locale]/...`，根路径 `/` 保持动态做重定向。

**问题**：Next.js 的 layout 是共享的。只要根 layout（或任何上层）仍调用
`headers()`，其下所有页面都会被拖成动态渲染，静态化收益归零。
要真正做到必须把动态入口拆成独立路由段，复杂度显著上升。
**收益不足以覆盖成本。**

### 方案 C：纯客户端探测（`navigator.language`）

先输出默认语言静态页，客户端 JS 读取 `navigator.language` 后再跳转。

**问题**：
- 明显闪烁（先看到英文再跳到中文）
- SEO 不友好（爬虫只看得到默认语言版本）
- 首屏浪费一次渲染与跳转

本项目多语言是核心能力，不适合这种做法。

---

## 5. 改造清单

| 文件 / 目录 | 改动 |
|---|---|
| `i18n/request.ts` | 移除 `headers()`，改用 `requestLocale` |
| `app/[locale]/layout.tsx` | 新增；`generateStaticParams()` 返回 7 个语言 |
| `app/[locale]/{page,compress,convert,favicon,transcode,audio,privacy}/page.tsx` | 现有 7 个页面（首页 + 6 个功能页）迁入 |
| `proxy.ts` | 改为「根路径 302 协商 + 旧格式 301 兼容」 |
| `components/language-switcher.tsx` | 链接改为 `/{locale}/xxx`；**不写 cookie**，切换仅凭 URL 生效 |
| `components/header.tsx` | 导航链接带 locale 前缀（或改用 next-intl 的 `Link`） |
| `app/page.tsx`（首页功能卡） | 同上 |
| `app/sitemap.ts` | 由代码生成 49 条 URL（顺带解决 P2-12） |
| `public/sitemap.xml` | 删除静态文件，改由 `sitemap.ts` 生成 |
| 各页面 | 可加 `export const dynamic = "force-static"` |
| SEO | 新 URL 需配 `hreflang` 互链；旧格式走 301 |

---

## 6. 收益与成本

| 项目 | 改造前（现状） | 改造后 |
|---|---|---|
| HTML 生成时机 | 每次请求动态渲染 | 构建时生成 49 个静态页 |
| `revalidate = 31536000` | **无效**（被 `headers()` 拖成动态） | 真正生效 |
| 首字节（TTFB） | 依赖服务端渲染 | CDN 直出 |
| 服务器计算开销 | 每次请求都跑 React 渲染 | 构建时一次 |
| URL 结构 | `/compress/zh-Hans` | `/zh-Hans/compress` |
| 迁移成本 | — | 中等：需 301、hreflang、更新所有内部链接 |

---

## 7. 建议的推进顺序（风险最小）

1. **双轨并存**：新增 `app/[locale]/...`，同时用 `proxy.ts` 把旧路径
   rewrite 到新路由（对外 URL 不变，SEO 无损失）
2. **观察**：确认静态化生效（构建产物为 `● (SSG)`）、监控无异常
3. **正式切换**：旧路径 301 → 新路径，删除旧目录
4. **补 SEO**：`sitemap.ts` 生成新 URL 列表、加 `hreflang`、向搜索引擎提交

> 第 1 步即可随时回滚（删掉新目录 + 还原 proxy），建议先做到这一步再评估。

---

## 8. 一句话总结

**语言的"自动适配"从"渲染期"迁移到了"重定向期"**：
静态 HTML 只负责「某种语言的内容」，`proxy.ts` 负责「把用户带到合适的语言」。
只要记住 **302 而非 301**、**语言只取浏览器 `Accept-Language`（不用 cookie）**、
**加 `Vary`**，就能在完全静态化的同时保留原有的自动语言体验。
