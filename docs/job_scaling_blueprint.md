# Job scaling blueprint — from 28,751 roles to the lawful ceiling

**Status:** DRAFT for the founder · written 2026-10-15 · ROADMAP Phase 21 (TASK-273…) · **a document only — no pipeline, migration or database was touched.**
**Origin:** founder directive to reach "5 million active jobs". This document answers it, and where the answer is "not possible", says so and gives the nearest lawful target.

Tags on every number: **MEASURED** = counted by this project · **OBSERVED** = read from the vendor's own page on the date shown · **CLAIMED** = a third party's statement, not verified here · **INFERRED** = arithmetic from tagged inputs · **ESTIMATED** = a guess with stated assumptions · **TBD** = not yet read or measured.

---

## 0. Verdict and the decisions that are yours

**5,000,000 is not reachable lawfully, and would not improve the product.** The sites that advertise millions of jobs are fed by LinkedIn, Indeed and ZipRecruiter, which this project locked off on terms-of-service grounds (PROJECT-STATE line 91 and ~730: "not available to this product and never will be"). The public hiring systems we *can* read hold about 1M listings in total (CLAIMED).

**The lawful ladder** (chosen by the founder, 2026-10-15):

| Rung | What it needs | Jobs we could hold | Tag |
|---|---|---|---|
| R0. Today, free setup | nothing | 28,751 now; ceiling ~40–50k before the 500 MB database limit | MEASURED / ESTIMATED |
| R1. Same 1,398 boards, all countries | Supabase Pro | ~156k (155,737 listed on 2026-09-07; we store only India) | MEASURED |
| R2. All public-ATS companies (~20k) | Pro + long-running runner + board discovery | ~1M worldwide; India perhaps 100–150k | CLAIMED / INFERRED |
| R3. Public APIs and licensed feeds | each source's terms read | + a few hundred thousand, mostly overlapping R2 | TBD |
| R4. 5M | LinkedIn / Naukri / Indeed | unavailable | OBSERVED |

**Where the directive collides with locked decisions** (each is a disagreement stated up front, per the working agreement):

| # | Directive said | This blueprint does | Why |
|---|---|---|---|
| 1 | 5M active jobs | Ladder to ~1M; 5M sized in §1 as a "why not" | Supply, not storage, is the wall |
| 2 | Tier 3: scrape LinkedIn, Naukri, Instahyre, Wellfound | **Held.** LinkedIn/Naukri stay locked (*hiQ v. LinkedIn*). Instahyre and Wellfound ToS are **unread → TBD**; none is assumed lawful | Locked decision; counsel review needed to reverse |
| 3 | Proxy rotation and CAPTCHA handling to beat blocks | **Not designed.** Polite-client rules in §2.3 instead | Evading a site's access controls is the thing the ToS lock exists to avoid; ATS public APIs need no evasion |
| 4 | GitHub Actions → self-hosted n8n | **Neither.** A long-running runner executing the existing TypeScript ingest | GitHub Actions is **disabled on this account** (HTTP 422, `.github/workflows/daily-ingest.yml`); n8n would duplicate `ingest/classify.ts` and `ingest/dedupe.ts` in a second runtime |
| 5 | `MD5(company + title + state)` | Key on **city**, not state | `ingest/dedupe.ts` — "location is part of the key, deliberately": Bengaluru and Pune are two real choices to a candidate |
| 6 | 1536-d vectors for all 5M | Sized honestly (§1.3); **deferred** | Scoring is deterministic by locked decision; pgvector is admissible only as one component that must improve `npm run bench:match` |
| 7 | Partition the table | **Not yet** (§3.4) | Row count is not the problem; partitioning forces key changes on 5 dependent tables |

**Decisions only you can make:**

1. Accept the ladder (R0→R2) instead of 5M.
2. Tier 3 stays locked — or commission a counsel review before any reversal.
3. Pay for Supabase Pro ($25/mo) — **everything past ~50k jobs needs it**. Vercel Pro ($20/mo) is a **separate** decision: it is needed only if you charge users (Vercel Hobby is non-commercial), not for job volume, and the sweep moves off Vercel anyway. Both together ≈ $45/mo (`docs/PAID-PLAN.md`).
4. Allow non-India roles. This changes the India-first positioning in PRODUCT.md; it is TASK-209 ("Abroad mode") and was held for exactly this decision.
5. Which long-running runner to use (§2.2) — a Sprint 0 finding, then your call.

---

## 1. Gap analysis — today vs the ladder vs 5M

### 1.1 Capacity table

| Dimension | Today (R0) | R1: ~156k | R2: ~1M | 5M (not reachable) | Tag |
|---|---|---|---|---|---|
| Roles stored | 28,751 | ~156k | ~1M | 5M | MEASURED |
| Boards | 1,398 | 1,398 | ~20k | ~45k at 111 roles/board (the registry's own average) | MEASURED / INFERRED |
| Database, text + metadata + indexes | 217 MB total (≈7.5 KB per role incl. matches) | ~1.2 GB | ~7.5 GB | ~38 GB | INFERRED (7.5 KB × rows; upper bound) |
| Fits Supabase 8 GB included disk? | yes (free: 500 MB) | yes | borderline → raise disk (~$0.125/GB) | no | OBSERVED 2026-10-15 |
| Compute class | Nano (free, ≤0.5 GB RAM) | Micro/Small | Small–Medium | Large–XL for text alone | OBSERVED table below |
| Daily churn at 30-day TTL | ~1k/day | ~5k/day | ~33k inserts + 33k deletes/day | ~167k + 167k/day | INFERRED (rows ÷ 30) |
| One full board sweep | ~8 days (52 s windows) | ~8 days | **~2 h on a long runner**; ~115 days on Vercel cron | — | MEASURED rate 0.35 s/board; INFERRED |
| Nightly recompute | 115 s for 9 profiles | re-measure | re-measure; relies on FTS top-500 narrowing | — | MEASURED / TBD |

Supabase compute and disk (**OBSERVED**, supabase.com/docs/guides/platform/compute-and-disk, 2026-10-15):

| Size | RAM | $/mo | Baseline IOPS | Recommended max DB |
|---|---|---|---|---|
| Nano (free) | ≤0.5 GB | 0 | 250 | 500 MB |
| Micro | 1 GB | ~10 | 500 | 10 GB |
| Small | 2 GB | ~15 | 1,000 | 50 GB |
| Medium | 4 GB | ~60 | 2,000 | 100 GB |
| Large | 8 GB | ~110 | 3,600 | 200 GB |
| XL | 16 GB | ~210 | 6,000 | 500 GB |
| 2XL | 32 GB | ~410 | 12,000 | 1 TB |
| 4XL | 64 GB | ~960 | 20,000 | 2 TB |

Sizes up to 2XL burst above baseline from an IO budget and fall back to baseline when it is spent (OBSERVED). Pro plan: $25/mo, 8 GB disk included.

### 1.2 What actually breaks first (in order)

| Rank | Bottleneck | Evidence | First fix |
|---|---|---|---|
| 1 | **The 60-second ingest window.** 1,396 boards take ~8 days per sweep; 20k boards would take months | `src/app/api/cron/ingest/route.ts` `maxDuration = 60`; PROJECT-STATE ~1154 | Long-running runner (§2.2) |
| 2 | **The 500 MB free database.** 217 MB used; 20 users at 5,000 matches ≈ 380 MB total | HANDOFF 2026-10-09 | Supabase Pro |
| 3 | **Nightly per-candidate recompute.** 115 s for 9 profiles at 28.7k roles; three heavy profiles at once hit the statement timeout | PROJECT-STATE Stage (TASK-222) | Keep the full-text top-500 narrowing (`supabase/migrations/0020_roles_for_candidate.sql`); re-measure at each rung; budget per profile |
| 4 | **Disk IO on ≤2XL.** Burst budget is spent by bulk upserts plus recompute | OBSERVED above | Batch writes off-peak; watch "Disk IO % consumed" |
| 5 | **Vectors** — only if built | §1.3 | Defer |

### 1.3 Vector sizing (why it is deferred, and the cheapest way if it is ever built)

`pgvector` stores `vector(n)` as 4 bytes per dimension plus an 8-byte header; `halfvec` as 2 bytes per dimension (INFERRED from the type definitions).

| Representation | Bytes/row | 1M rows | 5M rows | HNSW index (≈1.1–1.3× heap, ESTIMATED) at 5M | RAM class needed to keep the index hot at 5M |
|---|---|---|---|---|---|
| `vector(1536)` | 6,152 | 6.2 GB | 30.8 GB | ~35–40 GB | 4XL (64 GB, $960/mo) |
| `halfvec(1536)` | 3,080 | 3.1 GB | 15.4 GB | ~18 GB | 2XL (32 GB, $410/mo) |
| `halfvec(384)` | 776 | 0.8 GB | 3.9 GB | ~4.7 GB | Large (8 GB, $110/mo) |
| `bit(1536)` + re-rank | 200 | 0.2 GB | 1.0 GB | ~1.2 GB | Medium |

- **IVFFlat is the wrong index here.** Its cluster centres go stale as 30 days of churn replaces the corpus, so it needs periodic rebuilds. HNSW updates incrementally but builds slowly on large sets and wants `maintenance_work_mem` ≥ the index size at build time (ESTIMATED; verify on a 100k sample before committing).
- **Embedding cost at 5M** (ESTIMATED: ~500 tokens × 5M = 2.5B tokens): a hosted small embedding model is on the order of $50 one-off (price recalled, **verify before relying**); a local 384-d model on CPU is roughly 28 hours one-off and ~1 hour a day to keep up with churn (assumes ~50 docs/s, **unmeasured**).
- **Product reason to defer:** the feed ranks by a deterministic score that states a reason for every number (PROJECT-STATE ~1866). A cosine similarity cannot. Vectors would serve a "similar jobs" feature, which is not in the roadmap. If built: `halfvec(384)`, only for postings seen in the last 30 days, in a separate table, behind a `bench:match` improvement.

### 1.4 Cost scenarios

| Scenario | Stack | Approx. monthly | Tag |
|---|---|---|---|
| A. Stay free | Supabase Free + Vercel Hobby | $0 (and no paid plan may be advertised) | OBSERVED |
| B. R1 (~156k) | Supabase Pro (Vercel stays free unless you charge users; +$20 if you do) | ~$25 | OBSERVED |
| C. R2 (~1M), text only | Supabase Pro + Small/Medium compute + ~10 GB disk | ~$25 + $5–50 | ESTIMATED |
| D. R2 + `halfvec(384)` | as C; ~1 GB extra | ≈ C | INFERRED |
| E. Literal 5M | XL–4XL compute | $210–960 + disk, for supply that does not exist | OBSERVED / INFERRED |

---

## 2. Pipeline topology

### 2.1 Flow

```
 SOURCES (lawful only)
 ├─ T1  ATS public JSON APIs ── greenhouse · lever · ashby · workable · recruitee · smartrecruiters · workday
 ├─ T2  Public job APIs / licensed feeds ── terms read per source (TBD)
 └─ T3' Company career pages exposing JobPosting JSON-LD, robots.txt respected
        (Tier 3 portals: HELD, see §0 row 2)
            │
            ▼
 LONG-RUNNING RUNNER  (not Vercel cron; not n8n)   ── candidates in §2.2
   1. polite fetch ── conditional GET, per-host token bucket, change-hash skip   (§2.3)
   2. normalise + classify ── reuse ingest/classify.ts, ingest/providers/fields.ts
   3. canonical key ── company|title|city      (§4)
   4. collapse repeats ── reuse ingest/dedupe.ts collapseRepeats / repostHistory
   5. bulk upsert ── 1,000-row INSERT … ON CONFLICT (board_id, external_id)
   6. retire ── delete only on COMPLETE fetches (existing rule in ingest/run.ts)
            │
            ▼
 SUPABASE (service role from the runner only)
   roles · role_sources · role_requirements · boards
   (optional, deferred) role_embeddings
            │
            ▼
 Vercel app: recompute cron (60 s windows, unchanged) · public job pages · feed
```

The pipeline stays **one TypeScript codebase**. `ingest/` already runs under the service role outside the web app's import graph (CLAUDE.md invariant 1); the runner is a different *place to execute* `npx tsx ingest/run.ts`, not a second implementation.

### 2.2 Choosing the runner (Sprint 0 spike)

| Option | Cost | Cap | Unknown that decides it |
|---|---|---|---|
| GitLab CI scheduled pipeline (private GitLab remote already exists) | $0 free tier | free compute-minute quota | **TBD** — read the quota; may require account verification |
| Oracle Cloud Always Free VM + system cron | $0 | none | **TBD** — capacity availability and idle-reclaim policy |
| The founder's own machine, `launchd` | $0 | sleeps when the laptop does | unreliable for a daily job |
| Supabase Edge Function + `pg_cron` | within plan | per-invocation time cap (TBD) | cannot hold the TypeScript ingest unmodified |
| GitHub Actions | — | — | **Unavailable** (HTTP 422, this account) |

A 2-hour sweep at 20k boards fits any of the first two. Recommended order of trial: GitLab CI → Oracle VM.

### 2.3 Polite-client rules (replaces "proxy rotation")

ATS public job-board endpoints are published for consumption; the aim is to be a well-behaved client, not an invisible one.

| Rule | Mechanism |
|---|---|
| Don't refetch unchanged boards | Send `If-None-Match` / `If-Modified-Since` where the provider returns `ETag`/`Last-Modified`; otherwise hash the response body and skip processing when equal |
| Cap per-host pressure | Token bucket per provider host (start 5 req/s, tune from `429` rate) |
| Obey the server | Honour `Retry-After`; exponential backoff with jitter; a board that fails 3 sweeps is marked `last_error` and retried weekly (existing retry/rotation in `ingest/run.ts`) |
| Be identifiable | User-Agent with product name and a contact address |
| Respect robots.txt for any non-API page | Fetch and cache per host; skip disallowed paths |
| Stop where a site says no | A host that returns `403` or a block page is **dropped from the registry**, not worked around |

---

## 3. Schema and partitioning

All changes are additive migrations, applied by hand in the Supabase SQL editor (project convention), safe to deploy before applying (ingest probes for columns, as migration `0032` established).

### 3.1 New columns and tables

```sql
-- 00NN_canonical_key.sql  (sketch — not applied)
alter table roles add column if not exists canonical_key text;          -- sha1 hex of company|title|city
create index concurrently if not exists roles_canonical_key_idx on roles (canonical_key);

create table if not exists role_sources (                               -- one row per place a job is listed
  role_id     uuid not null references roles(id) on delete cascade,
  source      text not null,                                           -- 'greenhouse', 'adzuna', 'career-page'…
  apply_url   text not null,
  priority    smallint not null default 0,                             -- ATS-direct = highest
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (role_id, source, apply_url)
);
-- RLS: same stance as roles — authenticated read, service-role write.
alter table role_sources enable row level security;
```

`canonical_key` is deliberately **not unique**: merging is application logic (§4), and a unique index would turn a fuzzy near-miss into an insert error.

### 3.2 Keep the hot table narrow

- `roles.description` is capped at 6,000 characters (PROJECT-STATE F8) and Postgres moves large values out of line automatically (TOAST), so list queries that do not select it do not read it. **Rule:** list/feed queries must never `select *` from `roles`.
- Embeddings (if ever built) live in `role_embeddings(role_id uuid primary key references roles(id) on delete cascade, embedding halfvec(384))` — a separate table, so the 30-day delete and the text indexes never touch vector pages.

### 3.3 Retention and write load

- Keep the 30-day prune (`PRUNE_DAYS` in `ingest/run.ts`) and the "complete fetches only" rule — partial fetches deleted ~97% of a large Workday board once (`ingest/run.ts` comment).
- At R2 the daily churn is ~33k rows: delete in batches of ≤5,000 ids, then let autovacuum run; for the large tables set `autovacuum_vacuum_scale_factor = 0.02` (ESTIMATED starting point; confirm from `pg_stat_user_tables.n_dead_tup` after one week).
- If vectors are built: `create index … using hnsw (embedding halfvec_cosine_ops) with (m = 16, ef_construction = 64)`; query with `set hnsw.ef_search = 40` and tune to recall on a labelled sample.

### 3.4 Partitioning — recommendation: not yet

| Question | Answer |
|---|---|
| Does Postgres handle 5M rows? | Yes; row count alone is not a problem (INFERRED from general Postgres practice; confirm on the real table) |
| Where would partitioning help? | Cheap TTL (drop a partition instead of batched deletes) and smaller per-partition indexes |
| Why not by date | Our upsert key is `unique (board_id, external_id)`; a unique constraint on a partitioned table must include every partition column, so date partitioning would break the upsert |
| Why not even by `board_id` hash | It keeps the unique key legal, but a primary key must then include `board_id`, and **five tables reference `roles(id)`** (`role_requirements`, `gate_results`, `role_first_shown`, `applications`, `job_reports`) — each would need a second key column and a rewrite |
| **Trigger to revisit** | > ~20M rows, **or** measured delete bloat that autovacuum cannot clear inside a day, **or** index builds exceeding the maintenance window |

---

## 4. Deduplication and canonicalisation

### 4.1 What the measurements say

- With ATS-only sources, cross-source duplicates are near zero: the 26 duplicate title+company groups found in 2026-09 were the same title in different cities with different apply URLs — five real jobs, not one (PROJECT-STATE ~172).
- **Dedupe becomes load-bearing only when a second source lands** (R3), because aggregators re-list jobs that ATS boards already carry.
- Existing per-board collapse (`collapseRepeats`, `repostHistory` in `ingest/dedupe.ts`) stays. The sort-before-pick rule stays: without a deterministic survivor, deduplicating once produced *more* duplicates (195 → 660).

### 4.2 Algorithm

1. **Normalise** company, title, city (below).
2. **Key** = `sha1(company_norm | title_norm | city_key)`. (SHA-1 is only a compact label here, not a security control; MD5 would do equally.)
3. **Exact merge** — same key → one master role, many `role_sources`.
4. **Fuzzy merge** — only *inside* a (company, city) bucket, so the comparison is never global. Merge when trigram similarity of titles ≥ 0.92 **and** the seniority token is equal ("Senior" ≠ "Junior"; "Engineer II" ≠ "Engineer III").
5. **Survivor** = highest source priority (ATS-direct beats aggregator), ties broken by sorted `external_id`.
6. **Keep evidence** — earliest `first_posted_at`, summed repost evidence, union of apply links.

### 4.3 Pseudocode (Python; ports to `ingest/canonical.ts`)

The block below is runnable as written and ends with the self-check.

```python
import hashlib, re, unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher   # stand-in for pg_trgm similarity()

COMPANY_SUFFIX = re.compile(
    r"\b(pvt|private|ltd|limited|inc|incorporated|llc|llp|corp|corporation|co|gmbh|plc|technologies|technology|solutions)\b\.?")
SENIORITY = re.compile(r"\b(intern|junior|jr|associate|senior|sr|staff|principal|lead|manager|director|head|vp|ii|iii|iv)\b")
REQ_CODE  = re.compile(r"[\(\[\-–—]?\s*(req|job|id|ref)[\s#:\-]*[a-z0-9\-]{3,}\s*[\)\]]?", re.I)
CITY_ALIAS = {"bangalore": "bengaluru", "bombay": "mumbai", "gurgaon": "gurugram", "madras": "chennai"}
PRIORITY = {"ats": 2, "career_page": 1, "aggregator": 0}

def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s.lower())).strip()

def company_norm(name: str, aliases: dict[str, str] | None = None) -> str:
    c = COMPANY_SUFFIX.sub(" ", fold(name))
    c = re.sub(r"\s+", " ", c).strip()
    return (aliases or {}).get(c, c)

def title_norm(title: str) -> str:
    return fold(REQ_CODE.sub(" ", title))                 # seniority words are KEPT on purpose

def seniority_of(title: str) -> str:
    m = SENIORITY.findall(title_norm(title))
    return " ".join(sorted(m))

def city_key(city: str | None, remote: bool) -> str:
    if remote or not city:
        return "remote" if remote else "unknown"
    c = fold(city)
    return CITY_ALIAS.get(c, c)                            # city, NOT state: Bengaluru != Mysuru

def canonical_key(company, title, city, remote=False, aliases=None) -> str:
    raw = f"{company_norm(company, aliases)}|{title_norm(title)}|{city_key(city, remote)}"
    return hashlib.sha1(raw.encode()).hexdigest()

@dataclass
class Listing:
    company: str; title: str; city: str | None
    source: str; kind: str; external_id: str; apply_url: str
    remote: bool = False
    posted_at: str | None = None                          # ISO date
    key: str = field(init=False)
    def __post_init__(self):
        self.key = canonical_key(self.company, self.title, self.city, self.remote)

def survivor_order(l: Listing):
    # source priority first; then sorted external_id so the pick never depends on fetch order
    return (-PRIORITY[l.kind], l.external_id)

def merge(listings: list[Listing], fuzzy: float = 0.92) -> list[dict]:
    # 1. exact buckets
    exact: dict[str, list[Listing]] = {}
    for l in listings:
        exact.setdefault(l.key, []).append(l)

    # 2. fuzzy pass, ONLY inside (company, city) so comparisons stay small
    by_bucket: dict[tuple[str, str], list[str]] = {}
    for key, group in exact.items():
        g = group[0]
        by_bucket.setdefault((company_norm(g.company), city_key(g.city, g.remote)), []).append(key)

    parent = {k: k for k in exact}
    def find(k):
        while parent[k] != k:
            parent[k] = parent[parent[k]]; k = parent[k]
        return k
    for keys in by_bucket.values():
        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                a, b = exact[keys[i]][0], exact[keys[j]][0]
                if seniority_of(a.title) != seniority_of(b.title):
                    continue
                if SequenceMatcher(None, title_norm(a.title), title_norm(b.title)).ratio() >= fuzzy:
                    parent[find(keys[j])] = find(keys[i])

    merged: dict[str, list[Listing]] = {}
    for key, group in exact.items():
        merged.setdefault(find(key), []).extend(group)

    # 3. one master per cluster, every apply link kept
    out = []
    for group in merged.values():
        group.sort(key=survivor_order)
        master = group[0]
        dated = [g.posted_at for g in group if g.posted_at]
        out.append({
            "canonical_key": master.key,
            "master": master,
            "first_posted_at": min(dated) if dated else None,
            "sources": [(g.source, g.apply_url) for g in group],
        })
    return out

def demo():
    L = lambda **k: Listing(**{"company": "Acme Pvt Ltd", "city": "Bangalore", "kind": "ats", **k})
    a = L(title="Senior Backend Engineer", source="greenhouse", external_id="g-9",  apply_url="https://gh/9", posted_at="2026-10-01")
    b = L(title="Senior Backend Engineer (REQ-4411)", source="adzuna", kind="aggregator", external_id="z-1", apply_url="https://az/1", posted_at="2026-09-28")
    c = L(title="Senior Backend Engineer", city="Pune", source="greenhouse", external_id="g-10", apply_url="https://gh/10")
    d = L(title="Junior Backend Engineer", source="greenhouse", external_id="g-11", apply_url="https://gh/11")
    out = merge([b, a, c, d])
    assert len(out) == 3, "Bengaluru dup merges; Pune and Junior stay separate"
    both = next(o for o in out if len(o["sources"]) == 2)
    assert both["master"].source == "greenhouse", "ATS-direct beats the aggregator"
    assert both["first_posted_at"] == "2026-09-28", "earliest date kept"
    # determinism: shuffling the input must not change which row survives
    assert {o["master"].external_id for o in merge([a, b, c, d])} == {o["master"].external_id for o in merge([d, c, b, a])}

if __name__ == "__main__":
    demo(); print("ok")
```

Production notes: the fuzzy comparison runs in Postgres with `pg_trgm` (`create extension pg_trgm; similarity(a, b) >= 0.92`, GIN trigram index on the normalised title) rather than in application memory; the alias table (`company_aliases`) is hand-curated and starts empty (TBD).

---

## 5. Implementation sprints

Each exit gate is a binary check. "Founder-only" lists what cannot be done without you.

### Sprint 0 — measure and decide (no code shipped) · ROADMAP TASK-273–277

| Task | Exit gate |
|---|---|
| Measure per-table and per-index size on the live database (`pg_total_relation_size`) and bytes per role | Numbers replace every ESTIMATED storage figure in §1 |
| Time one nightly recompute at current scale; record per-profile cost | Baseline recorded for each later rung |
| Spike the runner (§2.2): run the existing ingest once on GitLab CI, then if needed an Oracle VM | One runner completes `npx tsx ingest/run.ts` end to end |
| Read the terms of every R3 candidate source and Instahyre/Wellfound; record allowed / forbidden / unclear | A table, one row per source, with the clause quoted by location |
| Founder decisions 1–5 (§0) | Written into PROJECT-STATE |
| **Founder-only** | The five decisions; the Supabase and Vercel upgrades; any account sign-up |

### Sprint 1 — ATS harvesters · TASK-278–282

| Task | Exit gate |
|---|---|
| Behind a flag, store non-India roles (TASK-209); India filter stays the default for the app | A flag-off run leaves row counts unchanged |
| Board discovery at scale with the existing `scripts/harvest-common-crawl.ts` → `scripts/qualify-boards.ts` | Registry grows; each new board passes the qualifier |
| Conditional GET + per-host buckets + change-hash skip (§2.3) | A second sweep of unchanged boards processes < 10% of bodies |
| New ATS providers only where the endpoint is public JSON and its terms allow it | Each provider has fixtures and a test in `ingest/__tests__` |
| **Founder-only** | Approve non-India storage; decide the four held SmartRecruiters staffing boards (~14.4k jobs; recommended: no by default) |

### Sprint 2 — deduplication engine · TASK-283–286

| Task | Exit gate |
|---|---|
| Migration `canonical_key` + `role_sources` (additive, applied by hand) | `npm run verify:rls` passes with the new table |
| `ingest/canonical.ts` ported from §4.3 with the same `demo()` as a unit test | Test fails if city is replaced by state, or the survivor sort is removed |
| Backfill existing roles in batches of 5,000 | 0 rows with null key after backfill |
| Fuzzy lane in Postgres via `pg_trgm` | On a hand-labelled sample of 200 pairs: zero wrong merges |
| **Founder-only** | Apply the migration in the Supabase SQL editor |

### Sprint 3 — daily ingest on a long runner · TASK-287–291

| Task | Exit gate |
|---|---|
| Move the sweep off Vercel cron to the Sprint 0 runner; keep the Vercel recompute/audit/digest crons | One scheduled run completes unattended and writes a run report |
| Resumable rotation (least-recently-ingested first — already how `ingest/run.ts` orders boards) | Killing a run mid-sweep and restarting loses no more than one batch |
| Failure alert (the existing `audit` / Sentry path) | A forced failure produces an alert |
| Re-measure recompute at the new row count | Per-profile time within budget, or narrowing tightened |
| **Founder-only** | Provide the runner's secrets (service-role key) to it yourself; never paste them into chat |

### Sprint 4 — vectors (optional, gated) · TASK-292

Only if a feature needs it. Gate: `halfvec(384)` embeddings improve `npm run bench:match` over the deterministic score alone, and an HNSW build on a 100k sample meets recall ≥ 0.95 at the chosen `ef_search`. Otherwise this sprint is deleted.

---

## 6. Risks and kill-criteria

| Risk | Signal | Response |
|---|---|---|
| Registry growth adds staffing-firm bulk, not real vacancies | Board with > 250 roles and few distinct companies | Hold it (the existing > 250-India-roles rule; `docs/CONFLICTS.md`) |
| Non-India roles dilute an India-first product | Feed shows foreign roles by default | Flag defaults off; India filter stays on |
| Database passes the plan's disk | Disk > 80% | Raise disk (cannot shrink later — OBSERVED); tighten TTL |
| IO budget exhausted during bulk writes | "Disk IO % consumed" > 1% daily | Smaller batches off-peak; next compute size |
| A source's terms forbid storage or redistribution | Clause read in Sprint 0 | Drop the source |
| Recompute outgrows its window | > 60 s per profile | Tighten FTS narrowing; precompute by function and city |
| **Kill-criterion** | Any rung's measured cost per useful match rises while match quality (`bench:match`) does not | Stop climbing; the next rung is not worth it |

---

## 7. Open items (`TBD`)

- Per-table storage actuals (Sprint 0).
- GitLab CI free-minute quota; Oracle Always Free availability.
- Terms of Adzuna-type APIs, TheirStack/JobDataLake licences, Instahyre, Wellfound.
- Whether any Indian government portal exposes a lawful public feed (not checked).
- India share of the ~20k-company universe — the 11.7% figure comes from a registry qualified *for* India presence and probably overstates the share across new companies (INFERRED).
- Embedding throughput on the chosen runner (unmeasured).
- `company_aliases` seed list.
