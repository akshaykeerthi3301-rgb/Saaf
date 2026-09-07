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
        patterns: [
          {
            group: ["**/lib/supabase/service", "@/lib/supabase/service"],
            message:
              "The service-role client bypasses RLS and is for the ingest job only. Use @/lib/supabase/server instead.",
          },
          {
            // ⚠️ THIS PATTERN CLOSES THE ROUTE AROUND THE ONE ABOVE.
            //
            // The rule above is pattern-based, so it only sees the local
            // wrapper. src/app/api/dev-signin/route.ts reached the identical
            // privilege by importing the UPSTREAM package instead —
            // `await import('@supabase/supabase-js')` with
            // SUPABASE_SERVICE_ROLE_KEY — and lint reported clean on the one
            // file doing exactly what the rule forbids. The guarantee had
            // become procedural (a runtime check inside one file) rather than
            // structural. Added 2026-09-08.
            //
            // Building a client by hand also skipped the three audited ones in
            // @/lib/supabase/, which is how the same audit_daily query ended
            // up written three times with three different column lists.
            //
            // @supabase/ssr is deliberately NOT restricted: createServerClient
            // takes the anon key and is how src/proxy.ts and the auth routes
            // must work. Type-only imports of @supabase/supabase-js are also
            // fine and live in src/lib/, which this rule does not cover.
            group: ["@supabase/supabase-js"],
            message:
              "Build no Supabase client here. Use @/lib/supabase/server (or /browser), and put privileged operations behind a named function in @/lib/services/ — never an admin client in src/app/.",
          },
        ],
      }],
    },
  },

  {
    // ─── THE DATA BOUNDARY ────────────────────────────────────────────────
    //
    // Every database query routes through src/lib/services/. The view layer
    // asks a named question ("give me this candidate's shortlist") and renders
    // the answer; it never writes a query.
    //
    // Three concrete defects in this repo's own history motivated it, all
    // recorded in docs/ARCHITECTURE-AUDIT.md:
    //   · the same audit_daily query written in three files with three
    //     different column lists, already drifted;
    //   · one component (audit-strip) holding a database client, which made it
    //     impossible to render or test without a live database;
    //   · the shortlist's bucketing logic sealed inside a 606-line page, so
    //     src/match/ has three test files and the page that consumes it has
    //     none.
    //
    // ⚠️ THIS BANS THE CALL, NOT ONLY THE IMPORT. Restricting imports alone is
    // not enough: a page can import the blessed @/lib/supabase/server and
    // still hand-write a query, which is exactly what 24 call sites in
    // src/app/ do today. The `.from(` selector is what makes the boundary
    // real rather than advisory.
    // ⚠️ TWO SEVERITIES ON PURPOSE, AND THE SPLIT IS TEMPORARY.
    //
    // src/components/ is CLEAN today (0 violations) — since audit-strip moved
    // to @/lib/services/audit on 2026-09-08, no component holds a query. So it
    // is an ERROR: the boundary is already true there and must stay true.
    //
    // src/app/ has 24 live violations — 10 in server components, 13 in server
    // actions, 1 in the auth callback. Every one predates this rule and every
    // one is authorised (each calls getUser() first and runs under RLS), so
    // none is a security defect. Making them errors today would simply break
    // `npm run lint` for the whole repo, which trains everyone to ignore it.
    // They are WARNINGS: visible on every run, non-blocking, and an accurate
    // live checklist of what src/lib/services/ still has to absorb.
    //
    // ⚠️ A WARNING THAT NOBODY ESCALATES IS A COMMENT. The point of the split
    // is to raise src/app/ to "error" once the migration lands — see
    // docs/ARCHITECTURE-AUDIT.md §4.6 step 6. Until then `npm run lint` must
    // keep reporting a shrinking number, and the day it reaches 0 this block
    // collapses back into one.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", {
        // Matches `db.from('roles')` and `supabase.from('profiles')` while
        // leaving the JavaScript builtins alone — Array.from and Buffer.from
        // are legitimate and appear in this directory and in src/app/. The
        // negated-name list is what separates them; a bare
        // [callee.property.name='from'] selector flags all three.
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.property.name='from']:not([callee.object.name=/^(Array|Buffer|Object|Date|Set|Map|URLSearchParams|Promise|String|Number|Uint8Array|Int8Array|Float32Array|Float64Array|BigInt64Array|Response|Headers|FormData)$/])",
        message:
          "Database queries belong in src/lib/services/. Export a named function there (e.g. getLatestAudit()) and call it, or take the data as a prop — a component must render without a database.",
      }],
    },
  },

  {
    // The same data boundary, over src/app/ — see the block above for why this
    // one warns instead of erroring, and what has to happen for it to change.
    //
    // Migration order, cheapest first (docs/ARCHITECTURE-AUDIT.md §4.6):
    //   1. auth/callback + instant-signin  — one `confirmed_at` read, twice
    //   2. profile / resume / copilot      — one profile read each
    //   3. applications page + actions     — one lib/services/applications.ts
    //   4. today/page.tsx                  — 4 queries; DO THIS WITH TESTS,
    //      it is the core surface and currently has none of its own
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["warn", {
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.property.name='from']:not([callee.object.name=/^(Array|Buffer|Object|Date|Set|Map|URLSearchParams|Promise|String|Number|Uint8Array|Int8Array|Float32Array|Float64Array|BigInt64Array|Response|Headers|FormData)$/])",
        message:
          "Database queries belong in src/lib/services/. This is a warning only because 24 call sites predate the rule — do not add a 25th. Export a named function from src/lib/services/ and call it.",
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
