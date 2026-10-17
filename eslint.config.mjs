import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated / vendored assets that are not our source.
    "public/ffmpeg/**",
  ]),
  {
    // These pages render local `blob:` URLs (uploaded-file thumbnails and
    // before/after previews). next/image cannot optimise blob URLs, so plain
    // <img> is the correct choice here.
    files: [
      "app/[[]locale]/compress/**/*.tsx",
      "app/[[]locale]/convert/**/*.tsx",
      "app/[[]locale]/favicon/**/*.tsx",
      "app/[[]locale]/transcode/**/*.tsx",
    ],
    rules: { "@next/next/no-img-element": "off" },
  },
]);

export default eslintConfig;
