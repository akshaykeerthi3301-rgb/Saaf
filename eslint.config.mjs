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

  // .vercel/output is Vercel's generated build artifact — machine-written CJS
  // launchers that fail every rule and are not ours to fix.
  //
  // saaf-ai/ is the v0-exported front end, staged in the repo root and not yet
  // integrated. It is a separate project with its own dependency tree that is
  // not installed here, so linting it reports failures about code we are about
  // to move rather than about this app. It is excluded from tsconfig for the
  // same reason. Both exclusions come OUT when the port lands and its screens
  // live under src/ — at which point its real defects (bare <a> to a route,
  // unused imports) get fixed rather than ignored.
  globalIgnores([".next/**", ".vercel/**", "out/**", "build/**", "next-env.d.ts", "saaf-ai/**"]),
]);

export default eslintConfig;
