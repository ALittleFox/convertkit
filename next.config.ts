import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Content-Security-Policy.
 *
 * `script-src 'unsafe-inline'` is required and cannot be avoided here:
 * Next.js App Router streams ~14 inline scripts per page (the RSC payload
 * and next-themes' pre-hydration theme script), and their contents differ
 * per request so hashes are not viable. A nonce would force every page to
 * render dynamically, which conflicts with the app's static/ISR strategy.
 *
 * Everything else is locked down:
 *   - blob: is allowed for scripts/workers because FFmpeg loads its core via
 *     toBlobURL(), and for img/media because previews use createObjectURL.
 *   - 'wasm-unsafe-eval' is required to instantiate the codec/FFmpeg WASM.
 *   - 'unsafe-eval' is only added in development (React Refresh needs it).
 *   - No third-party origins are allowed: fonts are self-hosted and all
 *     processing is local.
 */
function contentSecurityPolicy(isProd: boolean): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    "blob:",
    ...(isProd ? [] : ["'unsafe-eval'"]),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Tailwind/shadcn inject inline styles; next-themes toggles inline styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "connect-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Only meaningful over HTTPS; harmless-but-noisy in local dev.
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const nextConfig: NextConfig = {
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const csp = contentSecurityPolicy(isProd);

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Enforcing in production; report-only in dev so a strict policy
          // cannot mask HMR/dev-only tooling issues.
          {
            key: isProd
              ? "Content-Security-Policy"
              : "Content-Security-Policy-Report-Only",
            value: csp,
          },
        ],
      },
      // `immutable` on Next's own chunks breaks the dev server's cache
      // invalidation (Next logs a warning), so only apply it in production.
      ...(isProd
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : []),
      {
        // The FFmpeg WASM bundle is versioned by the copy script and safe to
        // cache aggressively in every environment.
        source: "/ffmpeg/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
