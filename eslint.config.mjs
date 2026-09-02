import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    // The service-role client bypasses RLS entirely. It belongs to the ingest
    // job only — a reachable path to it from the web app is a security defect,
    // not a style problem. See docs/PRD.md § 2. Security Considerations.
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/proxy.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/lib/supabase/service", "@/lib/supabase/service"],
          message:
            "The service-role client bypasses RLS and is for the ingest job only. Use @/lib/supabase/server instead.",
        }],
      }],
    },
  },

  {
    // src/gates/ is the open-source half of the moat. Keeping it free of
    // registry, ingest and database imports means publishing it later is a
    // directory move rather than an untangling job. See docs/PRD.md § 2.
    files: ["src/gates/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/registry/**", "**/ingest/**", "@/lib/supabase/**"],
          message:
            "src/gates/ must stay a pure, extractable module — no registry, ingest or database imports.",
        }],
      }],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
