#!/usr/bin/env bash
# Security audit against docs/PRD.md §2 and §7.
# Strips comments before grepping — an earlier version flagged four issues that
# were all comments DESCRIBING the correct behaviour, which is worse than no
# audit: it trains you to ignore the output.
cd "$(dirname "$0")/.." || exit 1
fails=0
pass(){ printf "  \342\234\223 %s\n" "$1"; }
fail(){ printf "  \342\234\227 %s\n" "$1"; fails=$((fails+1)); }
# strip // line comments and /* */ blocks
code(){ find "$@" -name '*.ts' -o -name '*.tsx' 2>/dev/null | xargs cat 2>/dev/null \
        | perl -0777 -pe 's{/\*.*?\*/}{}gs; s{//.*$}{}gm'; }

echo "=== secrets ==="
git ls-files | grep -q "^\.env\.local$" && fail ".env.local is tracked" || pass ".env.local not tracked"
git grep -qE "eyJhbGciOi|re_[A-Za-z0-9]{20}|sb_secret_" -- . 2>/dev/null && fail "key material in tracked files" || pass "no key material in tracked files"
code src | grep -qE "NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET|RESEND)[A-Z_]*\s*=" && fail "secret behind a public prefix" || pass "no secret behind NEXT_PUBLIC_"

echo "=== service-role reachability ==="
code src/app src/components | grep -q "lib/supabase/service" && fail "app or components import the service client" || pass "service client unreachable from app/components"
grep -q "SUPABASE_SERVICE_ROLE_KEY" vercel.json 2>/dev/null && fail "service key in vercel.json" || pass "service key absent from vercel.json"

echo "=== gate module isolation ==="
code src/gates | grep -qE "from '(\.\./)*(registry|ingest)/|lib/supabase" && fail "src/gates imports registry/ingest/db" || pass "src/gates stays extractable"

echo "=== input validation on actions that take input ==="
for f in src/app/actions/*.ts; do
  b=$(basename "$f")
  # an action with no parameters has no input to validate
  if grep -qE "export async function [a-zA-Z]+\(\s*\)" "$f"; then pass "no input surface: $b"
  elif grep -q "safeParse\|z\.object" "$f"; then pass "validated: $b"
  else fail "NO validation: $b"; fi
done

echo "=== résumé handling ==="
code src | grep -qE "storage\.from|\.upload\(" && fail "résumé written to storage" || pass "résumé never written to storage"

echo "=== auth ==="
code src/proxy.ts | grep -q "getSession()" && fail "proxy uses spoofable getSession()" || pass "proxy uses getUser()"

echo "=== third-party collection ==="
grep -q "disable_session_recording: true" src/lib/analytics.ts && pass "PostHog replay disabled" || fail "PostHog may record sessions"
grep -q "advanced_disable_decide: true" src/lib/analytics.ts && pass "PostHog remote config disabled" || fail "vendor can enable capture remotely"
grep -q "replaysSessionSampleRate: 0" sentry.client.config.ts && pass "Sentry replay disabled" || fail "Sentry may record sessions"
grep -q "delete event.request.data" sentry.server.config.ts && pass "Sentry strips request bodies" || fail "request bodies may reach Sentry"

echo "=== untrusted third-party content ==="
code src | grep -q "dangerouslySetInnerHTML" && fail "dangerouslySetInnerHTML present" || pass "no dangerouslySetInnerHTML"

echo
[ "$fails" -eq 0 ] && echo "  Security audit passed." || echo "  $fails CHECK(S) FAILED"
exit "$fails"
