# Résumé parsing — evaluation and blueprint

**Written 2026-10-14. Status 2026-10-15: PLAN, with the engine core built (`src/lib/parse/engine.ts`, `experience.ts`, `ocr.ts`, `src/lib/types/parsed-resume.ts`; `npm run audit:parse`) but NOT wired into the upload action. Founder decided OCR option A and internships excluded. Round 2 (same day): cross-checked, mutation-tested and hardened — DOCX XML reader, file sniffing, 120-document stress corpus with declared answers. See PROJECT-STATE Stage BN (incl. Round 2) for what is built, measured and NOT yet true.** Tasks are TASK-255 to TASK-272 in `docs/ROADMAP.md` (Phase 20).
Evidence tags used throughout: **MEASURED** (I ran it today), **OBSERVED** (read in this repo), **CLAIMED** (from memory or a vendor — verify before relying), **INFERRED** (reasoned, not tested), **TARGET** (a goal, not a result).

---

## 0. Read this first — four things I disagree with in the brief

| # | The brief says | What I recommend | Why (the trade-off accepted) |
|---|---|---|---|
| 1 | "Complete accuracy" on the critical fields | **Zero *wrong* values, with the right to say "I don't know"** | No parser reads every document on earth correctly. What a candidate cannot forgive is a confident wrong employer. So the system *abstains* (leaves the field empty and flagged) rather than guesses. We pay in recall (some boxes stay empty); we buy precision. |
| 2 | Python stack: `pdfplumber`, Docling, Unstructured, Marker, Pydantic | **Stay in TypeScript for the request path; Zod is the schema, Pydantic only on an optional OCR sidecar** | This app runs on Vercel serverless (`CLAUDE.md` invariant 1). Docling and Unstructured pull in PyTorch and model files of gigabytes (CLAIMED); a Vercel function is capped near 250 MB. We already have a working layout reader (`src/lib/parse/layout.ts`, 277 lines, built on `pdfjs-dist`). Python is for one thing only: scanned files, off the hot path. |
| 3 | "Don't build rule engines from scratch" | **Agreed — and we are not starting from scratch; we already have one.** | 2,580 lines of parser exist (`src/lib/parse/`). The plan is to *demote* it from "the answer" to "the first witness", and let an LLM read what rules cannot, with code verifying every word. |
| 4 | Sprint 3 = evaluation | **Evaluation starts on day 1 of Sprint 1** (labelling the 26 résumés we already hold) | If the scorer comes last, Sprints 1–2 are unmeasured. The full 100-résumé set still lands in Sprint 3. |

---

## 1. What exists today (audit of the current parser)

**OBSERVED — files:** `src/app/actions/parse-resume.ts` (onboarding), `src/lib/parse/{pdf,layout,docx,sections,extract,facts,dates,llm}.ts`, `src/lib/first-run.ts` (`profileFromRead`), `scripts/bench-parse.ts`, `bench/corpus/` + `bench/manifest.json`.

**How a résumé flows now**

```
file ─► pdfjs-dist (layout.ts clusters lines/columns)  or  mammoth (docx → raw text)
     ─► parseSections()  — heading regexes → contact / summary / experience[] / education[] / skills[]
     ─► extractFields()  — regex: city (15-city whitelist), title@company in first 25 lines, years, credential
     ─► resumeFacts()    — picks structured vs regex answer (facts.ts precedence)
     ─► readResumeWithModel() — Groq gpt-oss-20b → Gemini fallback; reads ONLY title, employer, city, domain, skills
     ─► mergeModelRead() — model fills gaps, never overrides a deterministic fact
     ─► profileFromRead() — saves a profile only if title+employer+city+years+target role all present
```

**MEASURED 2026-10-14** — current deterministic reader (`resumeFacts`) over the 26 documents in `bench/corpus/` (6 synthetic, 11 public samples, 9 the founder's own). These are *coverage* numbers, not accuracy: no document has field-level ground truth yet (`bench/manifest.json` holds counts and names only, not values).

| Probe | Result | Reading |
|---|---|---|
| Documents with < 50 characters of text | **2 of 26** | Either scans or font failures. Cause not diagnosed — first task of Sprint 1. pdfjs also logged `TT: undefined function: 32` six times (a font-hinting warning). |
| Current title found | 17 of 26 (65%) | |
| Current employer found | 17 of 26 (65%) | |
| Years found | 22 of 26 (85%) | Whole years only; see gap G4. |
| Experience entries found, total | 82 across 24 readable docs | |
| …of those with **no dates** | **11 of 82 (13%)** | Total-experience cannot be computed for these. |
| …of those missing title **or** employer | **12 of 82 (15%)** | |
| Documents with zero skills | 5 of 26 | The model fills skills; this is the deterministic reader alone. |
| Documents with no summary | 7 of 26 | May be correct (none written) — needs gold to tell. |

### Gap register (each is a defect to close, with where it lives)

| ID | Gap | Evidence | Closed by |
|---|---|---|---|
| G1 | **No OCR.** A scan gets "we couldn't find any text" and a manual form. | `parse-resume.ts:85`; `layout.ts:17` lists OCR as a "deliberate non-goal" | TASK-258 |
| G2 | **DOCX read by `mammoth` raw text.** Text boxes, headers/footers and some table layouts are not guaranteed to survive (mammoth's `extractRawText` is documented to skip text boxes — CLAIMED). Two-column Word templates are usually tables or text boxes. | `docx.ts` is 7 lines | TASK-257 |
| G3 | **Only 5 fields reach the model**; experience entries, education, summary and certifications are read by heading-regex alone. These are exactly the "fill the profile for me" fields. | `llm.ts` PROMPT | TASK-261 |
| G4 | **Experience = this year − earliest start year**, whole years. Counts gaps, counts overlaps once-per-calendar-year-of-span, over-counts up to 11 months (start Dec 2020 → "6 years" in Oct 2026; true figure 5.9). No months. | `extract.ts` `readYears()` | TASK-263 |
| G5 | **City from a 15-name whitelist.** Pune/Gurugram/Noida pass; Coimbatore, Vadodara, Kochi etc. don't. | `extract.ts:47` `CITIES` | TASK-264 (use `src/lib/taxonomy/locations.ts`) |
| G6 | **No certifications field.** The section is recognised (`sections.ts:129`) but only as lines in `other`. | `ResumeSections` type has no `certifications` | TASK-259 |
| G7 | **Real résumés expose layout defects** the synthetic ones never did: company-first two-line role headers, project headers read as jobs, dropped education bullets. | PROJECT-STATE TASK-221 | TASK-261/262 |
| G8 | **Nothing proves a model-read value is in the document.** The fabrication guard (`groundingFailure`) protects *rewrites*, not *reads*. A hallucinated skill is contained only because the candidate may notice it on screen. | `optimise-resume.ts`, `tailor-jd.ts` use it; `llm.ts` does not | TASK-262 |
| G9 | **No field-level benchmark.** `bench:parse` measures one thing (a non-job title must never be suggested). | `scripts/bench-parse.ts` header | TASK-267–270 |

---

## 2. Target architecture

**Principle in one line: rules find, the model reads, code verifies, code computes.** The model never does arithmetic, never normalises, never decides which job is current, and never writes a word that is not in the document.

```
                    ┌──────────────────────────────────────────────────────────────────┐
  PDF / DOCX ─►  S0 │ Sniff by magic bytes (not the browser's MIME); size ≤ 4 MB; ≤ 15 pp│
                    └───────────────┬──────────────────────────────────────────────────┘
                                    ▼
                    ┌────────────────────────────────────┐   quality gate:
                 S1 │ Text + layout, every line gets an ID│   chars/page, garbled ratio,
                    │ PDF: pdfjs-dist + layout.ts          │──► icon-font glyphs ───┐
                    │ DOCX: direct XML (body, text boxes,  │   fails ─────────────► S2 OCR
                    │       headers, tables)               │                        (scans only)
                    └───────────────┬────────────────────┘                          │
                                    ▼◄───────────────────────────────────────────────┘
                 S3 │ Sections (existing parseSections) — a HINT and the fallback
                                    ▼
                 S4 │ LLM structured read: numbered lines in → JSON out, every value cites line IDs
                                    ▼
                 S5 │ VERIFIER (code): is each value really in the lines it cites? else → abstain
                                    ▼
                 S6 │ RECONCILER (code): rules vs model, precedence as in facts.ts; disagreements logged
                                    ▼
                 S7 │ NORMALISER (code): company id, role family, seniority, skill canonical + hard/soft
                                    ▼
                 S8 │ ENGINE (code): current role, intervals, total months, gaps, flags
                                    ▼
                 S9 │ Zod validate → profile columns + `resume_parses` row (provenance kept)
```

### 2.1 Ingestion and layout-aware extraction (S0–S2)

**Tool comparison.** Licence and size claims are **CLAIMED** from memory — verify each before adopting.

| Tool | Layout / columns | Runs in our stack? | Licence (CLAIMED) | Verdict |
|---|---|---|---|---|
| **`pdfjs-dist` + our `layout.ts`** | Gives x/y/size/font per text item; we cluster lines and detect columns | ✅ already in | Apache-2.0 | **KEEP — primary PDF text reader** |
| `pdfplumber` | Same idea as pdfjs (positioned characters) | ❌ Python | MIT | Nothing it gives that `layout.ts` doesn't. Skip. |
| **PyMuPDF** | Fast, good blocks | ❌ Python | **AGPL-3.0 or paid** | **Avoid** — AGPL on a hosted product obliges publishing our source. |
| IBM **Docling** | Best-in-class layout/table model | ❌ needs PyTorch + model weights; slow on CPU | MIT | Candidate for the *sidecar* only, if OCR needs layout too. |
| **Unstructured** (open source) | Partitioner; `hi_res` uses vision models | ❌ heavy | Apache-2.0 | Skip — same weight as Docling, less accurate on résumés in published comparisons (CLAIMED). |
| **Marker** | Good Markdown from PDFs | ❌ heavy | Code GPL-3.0; model weights have a commercial-use condition | **Avoid** — licence risk. |
| Apache **Tika** | Text only, no positions | ❌ Java server | Apache-2.0 | Skip — no layout = worse than what we have. |
| **`mammoth`** | Flattens to text; skips text boxes (CLAIMED) | ✅ already in | BSD-2 | Demote to fallback. |
| **JSZip + direct DOCX XML** | Reads `word/document.xml`, `header*.xml`, and `w:txbxContent` text boxes in order | ✅ JSZip arrives with mammoth | MIT | **ADD — primary DOCX reader** (TASK-257) |
| **Tesseract / `tesseract.js`** | OCR, English + Hindi packs | ✅ WASM, runs in Node | Apache-2.0 | **OCR option A** |
| **PaddleOCR** | Stronger OCR, handles rotated/dense text | ❌ Python (ONNX build exists) | Apache-2.0 | **OCR option B** (sidecar) |
| Gemini / vision LLM | Reads a PDF natively, OCR + layout | ✅ API | Free tier exists | **OCR option C — but sends the whole file, phone number and photo included, to a third party.** Today we strip contacts before any model call (`llm.ts` `stripContactDetails`). Option C breaks that promise. |

**Multi-column without merging across columns** (already partly solved — extend, don't rewrite):
1. `layout.ts` clusters text items into lines by y, then detects column gutters by a vertical band with no text across ≥ N lines. Output is **column-major** (finish the left column, then the right), never line-by-line across the page.
2. Sidebar résumés (narrow left rail: contact, skills; wide right: experience) are treated as two columns; the **narrow column is emitted second** so "Experience" is not interrupted by "Skills".
3. Every line gets `{id, page, col, bbox}`; the id is what S4 cites and S5 checks.
4. **Proof gate (not a belief):** the benchmark's *layout-invariance group* — the same content rendered as single-column, two-column and sidebar — must parse to **identical JSON**. `bench/make-fixtures.ts` already builds `group: "priya"` for exactly this; extend it from 3 to ≥ 10 layouts (TASK-256).
5. Header/footer lines repeated on every page (page numbers, "Confidential") are removed by the same "same text at same y on ≥ 2 pages" rule.
6. Icon-font contact details (envelope/phone glyphs as private-use characters U+E000–U+F8FF) are stripped; the *text beside* them is kept. The garbled-glyph ratio is also a signal to route to OCR.

**Format handling matrix**

| Input | Primary | Fallback | When fallback triggers |
|---|---|---|---|
| PDF with a text layer | pdfjs + `layout.ts` | OCR (S2) | `< 120 chars/page` average, or garbled ratio `> 15%` |
| Scanned / image PDF | OCR (S2) | Manual form with the message "that's our limitation" (existing copy) | OCR confidence `< 60%` |
| `.docx` | Direct XML reader | `mammoth` | XML read throws |
| `.doc` (old binary Word) | **Not accepted today** (only PDF + docx — `parse-resume.ts` `ACCEPTED`) | If wanted: LibreOffice headless → docx, in the sidecar | **TBD: measure how many uploads are `.doc` before building** |
| Image (JPG/PNG of a CV) | Not accepted today | OCR (S2) | **TBD: same measure** |

**OCR decision (founder's — the one real trade-off in this plan):**

| Option | Privacy promise kept? | Cost | Quality on clean scans | Speed | Build effort |
|---|---|---|---|---|---|
| A. `tesseract.js` in the app | ✅ nothing leaves | ₹0 | Fair | ~5–15 s/page, cold start heavy (INFERRED) | Small |
| B. Python sidecar (PaddleOCR/Docling) on a free container host | ✅ our own server | ₹0 up to host limits | Good | 3–8 s/page (INFERRED) | Medium; a second thing to run and monitor |
| C. Gemini reads the file | ❌ contact details + photo go out | ₹0 free tier | Best | ~3 s | Smallest |

**Recommendation: A first**, measure the scan rate in Sprint 1 (the 2 of 26 above). If scans are < 3% of uploads, A is enough and B is never built. C only as an explicit opt-in "read my scan better" button with its own consent line.

### 2.2 Ecosystem and taxonomies (S7)

| Need | Source | How we use it | Notes |
|---|---|---|---|
| **Skills** | **ESCO** skills pillar (CSV download; free reuse with attribution — CLAIMED) | Import `label` + `altLabels` + `conceptUri` + skill-type into a slim `src/lib/taxonomy/esco-skills.json`; match résumé skills by normalised label/alt-label | ESCO is European and thin on tools (Terraform, dbt, Figma). Hence the next row. |
| Skills (tools, as jobs ask for them) | **Our own `src/lib/taxonomy/skills.json`** — terms mined from **13,919** live descriptions (`builtAt 2026-09-15`) | Primary dictionary for tools/methods; ESCO adds hard/soft typing and canonical URIs | OBSERVED. This is the best in-repo asset: it is what Indian postings actually say. |
| **Hard vs soft** | ESCO's transversal-skills collection → soft; everything else → hard | A **lookup, not a model opinion** | A skill in neither list is kept as `hard`, `esco_uri: null`, and counted in the miss report |
| Roles | **ESCO occupations** (Indian titles don't map well — CLAIMED) + our `roles.ts` / `role-keywords.json` | Role *family* (engineering, product, sales…) not exact title | **O\*NET** (US, CC-BY — CLAIMED) is a second opinion for role families only; its titles are American. Skip unless ESCO leaves holes. |
| **Companies** | **Wikidata** (CC0): English + alias labels for ~2,000 Indian employers via one SPARQL pull; plus a hand-kept alias file for Indian short names (TCS, HDFC, "L&T") | Alias → canonical id (Wikidata QID). Extends the existing `normaliseCompany()` key (`company-name.ts`) rather than replacing it | **OpenCorporates: skip** — free tier is non-commercial/limited (CLAIMED) and it holds legal entity names ("Tata Consultancy Services Limited"), which are the *wrong* granularity for "TCS". |
| **Institutions** | Wikidata (IITs, NITs, IIMs, universities) + AISHE / UGC lists from data.gov.in (CLAIMED — verify licence) | Alias → id ("IIT Bombay" = "Indian Institute of Technology, Bombay") | Needed for education precision. |
| **Locations** | `src/lib/taxonomy/locations.ts` (exists; maps Bangalore/Bengaluru/BLR) | Replaces the 15-city whitelist (G5) | OBSERVED. |
| **Seniority** | Our own ladder — below | Regex on the title; existing `Seniority` type in `first-run.ts` stays the storage type | |

**Seniority ladder** (extends `first-run.ts` `entry|mid|senior|lead|executive`; the 11 rungs collapse onto those 5 for storage so nothing downstream breaks):

| Rung | Title tokens (India-aware) | → stored as |
|---|---|---|
| 1 Intern | intern, trainee, apprentice, "graduate engineer trainee", GET | entry |
| 2 Junior | junior, associate, analyst, SDE-1, "engineer I", executive* | entry |
| 3 Mid | engineer, developer, consultant, SDE-2, manager-less IC | mid |
| 4 Senior | senior, sr., SDE-3, "engineer III", specialist | senior |
| 5 Lead | lead, staff, principal, architect, "team lead" | lead |
| 6 Manager | manager, M1/M2 (bank grades) | lead |
| 7 Senior manager | senior manager, AVP, M3 | lead |
| 8 Director | director, head of, VP, associate director | executive |
| 9 Senior exec | SVP, EVP, GM, "country head" | executive |
| 10 CXO | CEO, CTO, CFO, COO, CPO, founder, MD | executive |

\* **"Executive" is a junior word in Indian hiring** ("Sales Executive", "Customer Support Executive"), not senior. The ladder must read it as rung 2 unless it is "Chief/Senior/Executive Director". The founder's own title "Private Banking Manager (M1)" shows why bank grade codes are in the table.

### 2.3 Entity extraction and normalisation

#### Current-role logic (S8 — pure code; the model only supplies dates and titles)

```
INPUT  entries[] (non-project, non-education, non-volunteer), each {title, company_id, start, end|null, end_token, employment_type}
STEP 1  Open-ended?   end_token ∈ {present, current, currently, till date, to date, till now, ongoing, now, today, "–"+nothing at line end}
                      → is_open = true.  A bare "Jan 2021 –" with no token = open ONLY if it is the first-listed entry; else flag `end_missing`.
STEP 2  Group entries by company_id (promotions): one company stint = union of its entries; its latest-starting entry carries the title.
STEP 3  Candidates = open entries.
          • none open → no `current_role`; `latest_role` = entry with latest end;  if that end is within 90 days of today → also flag `recently_ended`.
          • one open  → it.
          • several   → drop employment_type ∈ {freelance, consulting, contract (< 6 mo), advisor, board, part-time, volunteer} IF a full-time open one remains;
                         then pick the latest start; tie → the one listed first in the document.
                         Always emit flag `concurrent_roles` listing the others — never silently discard.
STEP 4  `current_role` and `latest_role` are two separate fields.
          Brief says "Current/Latest Job Title": the profile box is filled from latest_role, the badge "currently working" from is_open.
STEP 5  Sanity flags (never auto-fix): end < start (`dates_reversed`), start in the future > 6 months (`future_start`),
          "Present" on a PDF whose creation date is > 12 months old (`stale_document`).
```

**LLM prompt contract** (the model's job is *reading*, so the prompt forbids everything else):

```
You are reading a résumé. Lines are numbered [L12]. Report only what the text states.
RULES
1. Copy, do not paraphrase: every string value must be a contiguous span of the line(s) you cite.
2. Every item carries "lines": [the line numbers it came from].  No lines → omit the item.
3. Dates: copy the date text exactly as written ("Jan 2021 – Present"); do not convert, do not complete a year.
4. If a field is not stated, return null. Never infer a title from skills, an employer from an email domain, or a summary from the experience.
5. Do NOT decide which job is current, do NOT compute durations, do NOT list a skill the text does not contain.
6. List every role, including internships, freelance and projects, in document order. Mark employment_type only when the text says it.
OUTPUT: JSON matching the schema; nothing else.
```
The prompt is stored in one file with a `PROMPT_VERSION` constant; a test asserts the file's hash matches it, so a prompt cannot change without the version (and the benchmark baseline) changing in the same commit.

**Verifier (S5) — what makes it "zero-hallucination" in practice**

| Value kind | Check | On failure |
|---|---|---|
| Title, company, institution, certification name, summary | Normalised (case/whitespace/punctuation-folded) substring of the cited lines | `status: 'abstained'`, value null |
| Dates | The cited line contains a date token that parses to the same `{y,m}` | abstain that date; keep the entry |
| Numbers (CGPA, %) | Digits present in the cited line | abstain |
| Skills | Normalised skill appears in the document text (or an ESCO/own-dictionary alias of it does) | drop the skill |
| Summary | ≥ 95% of its words in the cited lines, in order | null (**never authored**) |
| Any value citing a line number that does not exist | — | abstain |

Failures are counted per document; a rising abstain rate after a prompt change is itself a regression signal.

#### Total work-experience engine (S8)

**Date grammar** (all produce `{y, m|null, precision}`; `m = null` means year only):

| Written | Parsed | Note |
|---|---|---|
| `Jan 2021`, `January 2021`, `Jan'21`, `Jan-21`, `Jan. 2021` | 2021-01 | month-name forms (already in `dates.ts`) |
| `01/2021`, `1/21`, `2021-01`, `2021/01` | 2021-01 | numeric (`dates.ts` handles `07/2023`) |
| **`03/19`** | **2019-03** | **Ambiguity rule below** |
| `2021` | y=2021, m=null | year-only |
| `Q1 2021`, `Spring 2021`, `Summer '21` | quarter/season → first month of it, `precision: 'approx'` | |
| `Present`, `Current`, `Till date`, `To date`, `Ongoing`, `Now` | open-ended | see current-role logic |
| `2019 – 21`, `2019–2021` | years, m=null | en dash, em dash, hyphen, "to", "–" all normalised |

**Ambiguity resolution for `NN/NN`** (the user's example `03/19 - 08/22`), in this order — first rule that decides wins:
1. If the first number is > 12 it cannot be a month → read as `YY/MM` (rare) or reject (`unparseable`).
2. If the second number > 31 it is a 2-digit year → `MM/YY`. If it is a 4-digit year → `MM/YYYY`.
3. If both ≤ 12 (e.g. `03/09`) → **document-wide vote**: count the unambiguous dates; the majority format wins for the whole résumé. A résumé does not mix formats.
4. Still tied → choose the reading that keeps `start ≤ end` and the timeline in order; if both do, mark `precision: 'ambiguous'` and widen the range (below).
5. **Two-digit years**: `00–29 → 20xx`; `30–99 → 19xx`; then clamp: no start in the future, no start before age 16 if a birth year is stated.

**Counting rules**

| Rule | Decision | Why |
|---|---|---|
| Month arithmetic | **Inclusive of both end months.** `Jan 2021 – Mar 2021` = 3 months. `Jan 2021 – Present` on 2026-10-14 = **70** months. | Matches how a recruiter reads "Jan to Mar". Documented so the number is explainable. |
| Year-only dates | Compute **both bounds**: `months_low` (start Dec, end Jan) and `months_high` (start Jan, end Dec); `months` = midpoint; `precision: 'year'`. | One false-precision number is worse than an honest range. |
| Overlaps | **Sweep-line union** of all intervals: sort by start, merge when `next.start ≤ current.end + 1 month`. Total = sum of merged lengths. | No double count when two jobs overlap; a gap of exactly 0 months merges. |
| Gaps | Gaps > 3 months listed in `gaps[]`; **never counted as experience, never hidden.** | Voice rule (PROJECT-STATE): describe, never accuse. |
| What counts toward the headline | **Paid professional roles.** `total_experience_months` = union of full-time + contract + freelance + part-time. **Excluded from the headline, reported separately:** internships/trainee (`internship_months`), projects, volunteer, education. | Indian recruiters usually exclude internships from "years of experience". **TBD — founder confirms this definition.** |
| Stated vs computed | If the résumé says "8+ years" and the computed figure differs by > 12 months → flag `stated_vs_computed`, **show the computed**, never silently use the stated number. | The current reader prefers the stated figure (`extract.ts` `readYears`); that is the one place a candidate's typo propagates. |
| As-of date | Today (UTC). A "Present" on a résumé whose PDF creation date is > 12 months old gets `stale_document`. | |
| Internship vs trainee | Interns, apprentices, fellows, articleship and projects are excluded. **"Trainee" alone is NOT** (a Graduate Engineer Trainee is salaried in India) and is flagged `trainee_role_counted`. | Founder directive 2026-10-15 names internships, fellowships and short academic projects only. |
| Output | `{months, months_low, months_high, fulltime_months, internship_months, as_of, method_version}`; `years = months / 12` rounded to 0.1 for display only. | |

**Worked check (will become unit tests):** entries `Jan 2019–Dec 2020`, `Jun 2020–Present` (as of 2026-10), → union `Jan 2019–Oct 2026` = **94 months**, not 24 + 77 = 101.

### 2.4 Strict schema (authoritative copy — Zod; TypeScript types derive from it)

Zod 4 can emit JSON Schema (`z.toJSONSchema`), which is what we hand to the model as its output contract — **one definition, three uses** (validation, model contract, Supabase column check). Proposed file: `src/lib/types/parsed-resume.ts` (this is the first genuinely cross-cutting type, which is what `CLAUDE.md` invariant 5 reserves `src/lib/types/` for).

```ts
import { z } from 'zod'

const Ym = z.object({ y: z.number().int().min(1960).max(2100), m: z.number().int().min(1).max(12).nullable() })
const Evidence = z.object({ lines: z.array(z.number().int().nonnegative()).min(1).max(12), quote: z.string().max(300) })

/** Every extracted value carries how sure we are and where it came from. */
const Field = <T extends z.ZodTypeAny>(v: T) =>
  z.object({
    value: v.nullable(),
    status: z.enum(['verified', 'unverified', 'abstained']),   // verified = passed S5; abstained = value is null on purpose
    confidence: z.number().min(0).max(1),
    source: z.enum(['rule', 'model', 'user']),
    evidence: Evidence.nullable(),
  })

const EmploymentType = z.enum(['full_time', 'part_time', 'contract', 'internship', 'freelance', 'volunteer', 'unknown'])

export const ExperienceSchema = z.object({
  id: z.string(),                                   // stable within one parse: "exp-0", "exp-1"…
  title: Field(z.string().max(200)),
  company: Field(z.string().max(200)),
  company_id: z.string().nullable(),                // Wikidata QID, or null if unmatched
  role_family: z.string().nullable(),
  seniority_rung: z.number().int().min(1).max(10).nullable(),
  employment_type: EmploymentType,
  start: Field(Ym),
  end: Field(Ym),                                   // value null + end_token set  ⇒ open-ended
  end_token: z.string().max(30).nullable(),         // "Present", "Till date"… verbatim
  is_open: z.boolean(),
  location: z.string().max(120).nullable(),
  bullets: z.array(z.string().max(600)).max(20),    // copied verbatim
  is_project: z.boolean(),
  months: z.object({ low: z.number().int(), high: z.number().int(), mid: z.number().int() }).nullable(), // derived by code
  date_precision: z.enum(['month', 'year', 'approx', 'ambiguous']),
})

export const EducationSchema = z.object({
  id: z.string(),
  institution: Field(z.string().max(200)),
  institution_id: z.string().nullable(),
  degree: Field(z.string().max(200)),
  degree_level: z.enum(['school', 'diploma', 'bachelor', 'master', 'doctorate', 'other']).nullable(),
  field_of_study: Field(z.string().max(120)),
  start_year: z.number().int().nullable(),
  end_year: z.number().int().nullable(),
  grade: z.string().max(40).nullable(),             // as written: "8.4", "78%", "3.7/4.0"
})

export const SkillSchema = z.object({
  name: z.string().max(80),                         // as written
  canonical: z.string().max(80).nullable(),
  esco_uri: z.string().nullable(),
  category: z.enum(['hard', 'soft']),               // lookup, not an opinion
  mentioned_in: z.array(z.enum(['skills_section', 'experience', 'summary', 'projects'])).min(1), // ≥1 ⇒ it is in the text
})

export const CertificationSchema = z.object({
  name: Field(z.string().max(200)),
  issuer: z.string().max(120).nullable(),
  issued: Ym.nullable(),
  expires: Ym.nullable(),
  credential_id: z.string().max(80).nullable(),
})

export const ParsedResumeSchema = z.object({
  schema_version: z.literal(1),
  meta: z.object({
    parser_version: z.string(),
    prompt_version: z.string(),
    text_source: z.enum(['pdf_text', 'docx_xml', 'docx_mammoth', 'ocr']),
    pages: z.number().int(), columns: z.number().int().min(1).max(4),
    ocr_confidence: z.number().min(0).max(1).nullable(),
    model: z.object({ provider: z.enum(['groq', 'gemini']), name: z.string() }).nullable(), // null ⇒ rules only
    warnings: z.array(z.string()).max(30),
  }),
  contact: z.object({ name: Field(z.string()), email: z.string().nullable(), phone: z.string().nullable(), links: z.array(z.string()).max(8), city: Field(z.string()) }),
  summary: Field(z.string().max(2000)),             // copied from the résumé or null — never authored
  experience: z.array(ExperienceSchema).max(30),
  education: z.array(EducationSchema).max(10),
  skills: z.array(SkillSchema).max(120),
  certifications: z.array(CertificationSchema).max(30),
  languages: z.array(z.string().max(40)).max(12),
  derived: z.object({                               // everything here is computed by code, never by the model
    current_role_id: z.string().nullable(),
    latest_role_id: z.string().nullable(),
    total_experience: z.object({ months: z.number().int(), months_low: z.number().int(), months_high: z.number().int(),
      fulltime_months: z.number().int(), internship_months: z.number().int(), as_of: z.string(), method_version: z.string() }).nullable(),
    gaps: z.array(z.object({ from: Ym, to: Ym, months: z.number().int() })).max(15),
    flags: z.array(z.enum(['concurrent_roles','dates_reversed','future_start','end_missing','stale_document','stated_vs_computed','recently_ended','ambiguous_dates'])),
  }),
})
export type ParsedResume = z.infer<typeof ParsedResumeSchema>
```

*Pydantic mirror — needed only if the OCR sidecar exists.* The sidecar returns text, not résumé fields, so its contract is tiny:
```python
class OcrPage(BaseModel): page: int; text: str; mean_confidence: float = Field(ge=0, le=1)
class OcrResult(BaseModel): pages: list[OcrPage]; engine: Literal["tesseract", "paddleocr"]; language: list[str]
```

**Storage (Supabase).** New table `resume_parses` (one row per parse, so a re-upload never destroys evidence): `id uuid pk`, `user_id uuid references auth.users on delete cascade`, `resume_id uuid null`, `schema_version int`, `parser_version text`, `parsed jsonb not null`, `created_at timestamptz`. **RLS on from day one** (`CLAUDE.md` §6): `select/insert/delete` policies `using (auth.uid() = user_id)`, `to authenticated` stated explicitly (the existing `resume_documents` policies omit it — see the Phase 11 note in `docs/ROADMAP.md`). Migration number is TBD at build time (last applied is 0052). The existing profile columns keep being filled from `parsed` through `profileFromRead` — this table adds provenance, it does not replace the profile.
The source **file** is still deleted after parsing; the parsed JSON is kept, as today.

---

## 3. Benchmark and evaluation framework

### 3.1 The golden set (100 résumés)

**Today:** 26 documents, no value-level labels. **Target:** 100, each with a `bench/golden/<id>.json` that follows `ParsedResumeSchema` minus provenance.

**Where the 100 come from** (PII rule: nothing personal is committed; `bench/corpus/real/` is already git-ignored):

| Source | n | Lawful because | Committed to git? |
|---|---|---|---|
| Founder's own résumés + per-employer variants (`Akshay_Keerthi_Resume_*`) | 9 → 12 | Founder's own data | ❌ local only |
| Synthetic — one fictional career rendered into ≥ 10 layouts via `bench/make-fixtures.ts` | 30 | No real person | ✅ |
| Public samples already in `bench/corpus/samples` + new public sets | 25 | Licence checked per set — **names below are from memory; confirm each exists and its licence before download**: Kaggle "Resume Dataset" (LiveCareer text), Hugging Face synthetic résumé sets | ✅ if licence allows |
| **Consented volunteers** — friends/colleagues, India-heavy, with a one-line consent and contact details redacted before labelling | 33 | DPDP Act consent; deleted on request | ❌ local only |

**Stratification — five axes, each summing to exactly 100 (MECE within an axis; one résumé sits in one cell per axis):**

| Axis | Cells |
|---|---|
| A. Format | PDF with text layer **60** · DOCX **25** · scanned/image PDF **8** · PDF with icon-font/graphic contact block **7** |
| B. Layout | single column **45** · two-column **25** · table-built **10** · sidebar **10** · creative/Canva-style **10** |
| C. Career stage | fresher / < 2 y **20** · 2–7 y **40** · 8–15 y **25** · 15 y+ **15** |
| D. Origin | Indian (Naukri-style, bank/IT-services, startup) **70** · global **30** |
| E. Date style | month-name **50** · numeric (`03/19`) **20** · year-only **15** · "Present"/"Till date"/"Ongoing" heavy **15** |

**Hard-case quotas (overlay, may overlap the axes):** ≥ 15 with concurrent roles · ≥ 10 with a career gap > 6 months · ≥ 10 with promotions inside one company · ≥ 10 using "Till date"/"Ongoing" · ≥ 5 with ≥ 12 roles · ≥ 5 with a projects section that looks like jobs · ≥ 5 with company-first two-line role headers (the TASK-221 defect).

**Split:** **70 development / 30 held-out.** Prompts and rules may be tuned against the 70. The 30 are **opened only at release gates**; touching them to debug turns them into development data and the number stops meaning anything.

**Labelling.** Pre-fill by running the pipeline, then a human corrects every field (≈ 15 minutes per résumé, ≈ **25 hours total**; INFERRED). Anchoring risk — an annotator tends to accept the pre-fill — is contained by **double-labelling 20%** blind (no pre-fill) and reviewing disagreements. `npm run bench:validate` rejects any golden file that fails the Zod schema.

### 3.2 Metrics

**Counting with abstention.** For a scalar field on one document: prediction equals gold → **TP**; prediction ≠ gold, non-null → **FP and FN**; prediction null, gold present → **FN**; both null → **TN**.
`Precision = TP/(TP+FP)` · `Recall = TP/(TP+FN)` · `F1 = 2PR/(P+R)`. **Wrong-answer rate = FP / documents** — this is the zero-hallucination number; abstaining raises recall's gap but never touches it.

| Field | Match rule | Reported |
|---|---|---|
| `current_title` | Normalised exact; lenient pass = token-F1 ≥ 0.8 (so "Sr. PM" ≈ "Senior Product Manager") | P / R / F1 strict + lenient |
| `current_company` | Same `company_id`, else normalised string equal (`normaliseCompany`) | P / R / F1 |
| `total_experience_months` | **Absolute error in months** vs gold | MAE; % within ±3 mo; % within ±12 mo |
| `experience[]` (all work history) | Greedy match gold↔predicted on (company similarity + date overlap), then score | Entity P / R / F1 **strict** (title+company+start+end all right) and **lenient** (company + date overlap); per-subfield accuracy; bullet recall (verbatim containment) |
| `education[]` | Match on institution (id or normalised) then check degree + year | Entity P / R / F1; institution accuracy alone |
| `skills[]` | Set match on canonical skill | P / R / F1 · **hard/soft category accuracy** on matched skills |
| `certifications[]` | Normalised name | P / R / F1 |
| `summary` | **Containment**: share of predicted words found in the gold summary, in order; plus "absent in gold ⇒ must be null" | Containment ≥ 0.95; false-summary rate (must be 0) |
| `city` | `locations.ts` canonical | P / R |

**Label-free invariants — run on every document, including unlabelled ones (so they also run on live uploads in shadow mode):**

| ID | Invariant | Hard fail? |
|---|---|---|
| I1 | **Grounding:** every title/company/institution/skill/summary string passes the S5 check against the source text | **Yes — zero tolerance** |
| I2 | Intervals valid: `start ≤ end`, not in the future, inside working age | Yes |
| I3 | **Layout invariance:** a group's single-/two-column/sidebar renderings produce identical JSON | Yes |
| I4 | **Idempotence:** same file twice → same JSON (rules path; model path within tolerance) | Yes |
| I5 | `Σ merged intervals ≤ Σ individual intervals` (no double counting) | Yes |
| I6 | Summary is null when the document has no summary heading and no free-standing paragraph before the first section | Yes |

### 3.3 Release gates (**TARGET** — not yet measured; to be revised with the first real run)

| Metric | Gate |
|---|---|
| Ungrounded values (I1) | **0** |
| Wrong-answer rate, `current_title` and `current_company` | **≤ 2%** of documents |
| `current_title` / `current_company` precision · recall | ≥ 98% · ≥ 92% |
| `total_experience_months` within ±3 months · within ±12 months | ≥ 85% · ≥ 95% |
| Experience entries, lenient F1 · strict F1 | ≥ 90% · ≥ 80% |
| Education institution precision · recall | ≥ 97% · ≥ 92% |
| Skills precision · recall | ≥ 95% · ≥ 85% |
| Certifications F1 | ≥ 85% |
| Summary containment | ≥ 95% |
| Crashes / unreadable-without-message | 0 |
| p95 parse time, text PDF | ≤ 12 s (the existing model timeout, `llm.ts` `TIMEOUT_MS`) |

Gates apply to the **30 held-out** documents; the 70 are tracked for trend.

### 3.4 Automated regression (prompt-degradation guard)

| Layer | Runs | What it protects | Calls a model? |
|---|---|---|---|
| **L1 — unit** | every `npm test` / CI | Date grammar, interval union, current-role rules, verifier, reconciler, seniority ladder, taxonomy lookups. Includes the worked example above (94, not 101). | ❌ |
| **L2 — replay** | every CI run | The whole pipeline on all **committable** golden docs, with **recorded model responses** stored in `bench/recorded/` keyed by `hash(PROMPT_VERSION + text)`. Compares to `bench/baseline.json`. | ❌ (replays) |
| **L3 — live** | `npm run bench:parse:live`; before any change to the prompt, model name or provider; and a **weekly canary** | The real model against all 100 (local, so the private ones are included). Run 3×; use the **worst** run, so noise cannot hide a drop. | ✅ |
| **Ratchet** | — | `bench/baseline.json` only moves **up**, and only in a commit that says why. A drop of > 1 point on any gated metric fails the run. | — |
| **Prompt pin** | CI | A test hashes the prompt file and asserts it equals the recorded `PROMPT_VERSION`; editing the prompt without bumping it fails the build. | ❌ |

**Why the weekly canary exists — OBSERVED precedent:** on 2026-09-08 Google retired `gemini-2.0-flash`; every fallback call returned HTTP 404 and the chain swallowed it as "one more null", so the fallback was dead for days with nothing logged (`llm.ts` header comment). A model change you did not make is a regression source; the canary catches it before a user does.

**Constraint to plan around — INFERRED, check before Sprint 2:** the free Groq tier was measured at **8,000 tokens per minute shared** (PROJECT-STATE, Stage Z). One structured read of a two-page résumé is roughly 1.8k tokens in plus 2–3k out ≈ 4–5k, i.e. **about 1–2 résumés per minute across all users**. Mitigations, in order: (1) rules answer first and the model is skipped when the verifier would not need it (rare); (2) existing Groq→Gemini failover; (3) a small queue with "reading your résumé…" copy; (4) a paid tier — a founder decision, and `docs/PAID-PLAN.md` already allows one.

**Rollout safety:** new pipeline behind a flag; **shadow mode** first (runs beside the old path on real uploads, results compared and logged, nothing shown); then flip for the founder's account; then everyone. The old path stays until two weekly canaries pass.

---

## 4. Three sprints

Effort is **INFERRED** engineer-days of focused work, not calendar time. "Founder" lines are things only the founder can do.

### Sprint 1 — Document processing pipeline (≈ 6–8 days)

| # | Step → verify | Task |
|---|---|---|
| 1.1 | Label the **26 existing** documents' values; build the scorer skeleton and run it on the current parser → *a baseline.json exists and `npm run bench:parse` prints P/R/F1 for title and company* | 255 |
| 1.2 | Extend `make-fixtures.ts` to ≥ 10 layouts of one career; add the invariance gate → *gate fails today on the layouts that break, passes after 1.4* | 256 |
| 1.3 | Direct DOCX XML reader (body, text boxes, headers/footers, tables) with `mammoth` as fallback → *a DOCX fixture with a text-box sidebar yields the sidebar text; mammoth alone does not* | 257 |
| 1.4 | Diagnose the **2 of 26** no-text documents; add the quality gate (chars/page, garbled ratio, icon-glyph strip) and magic-byte sniffing → *both documents explained; garbled fixture routes to OCR* | 258 |
| 1.5 | OCR fallback — **option A (`tesseract.js`)** unless the founder picks otherwise → *a scanned fixture returns text; the privacy page names no new third party* | 258 |
| 1.6 | Carry line IDs end to end (`SourceDoc.lines[{id,page,col,bbox,text}]`) → *a test cites line N and gets the exact original text* | 259 |
| 1.7 | Multi-column proof on sidebar + two-column + table fixtures → *the invariance gate passes* | 256 |

**Exit:** the same career in 10 layouts yields identical text order; DOCX text boxes read; scans read or fail with the honest message; baseline recorded. **Founder:** choose the OCR option; supply 3–5 real scanned or odd-layout résumés if any exist.

### Sprint 2 — LLM structuring and external taxonomies (≈ 8–10 days)

| # | Step → verify | Task |
|---|---|---|
| 2.1 | `ParsedResumeSchema` + migration for `resume_parses` with RLS → *`npm run verify:rls` passes with the new table; anon read refused* | 259, 260 |
| 2.2 | Numbered-line prompt + JSON-schema output through the existing `callJsonModel`; `PROMPT_VERSION` + hash test → *schema-valid output on all 26; malformed JSON → null, not a crash (existing contract)* | 261 |
| 2.3 | **Verifier** (S5) → *planted fabrications (an invented employer, an invented skill, a summary the résumé lacks) are all abstained; zero ungrounded values across the 26* | 262 |
| 2.4 | **Date + experience engine** → *the unit table in §2.3 passes, including `03/19`, year-only ranges and the 94-month overlap case* | 263 |
| 2.5 | Current/latest-role rules and flags → *every hard-case fixture (concurrent, gap, promotion, "Till date") picks the documented answer* | 263 |
| 2.6 | Taxonomy import scripts → `esco-skills.json`, company/institution alias tables, seniority ladder; replace the 15-city list with `locations.ts` → *"TCS" = "Tata Consultancy Services"; "IIT Bombay" = its long form; Coimbatore resolves* | 264 |
| 2.7 | Reconciler (rules vs model, `facts.ts` precedence extended to entries) → *disagreements land in `meta.warnings`; a model value never overrides a verified rule value* | 261 |
| 2.8 | Fill the profile: map `ParsedResume` onto the existing profile screen (title, employer, years, city, skills, education, experience, certifications, summary) with a **"read from your résumé — check"** chip on `unverified` fields; abstained fields stay empty, never block → *browser walk: upload → profile shows each field filled or flagged; screenshot* | 265 |
| 2.9 | Shadow mode behind a flag → *a live upload logs old-vs-new differences, user sees only the old result* | 266 |

**Exit:** all 26 parse through the new path with zero ungrounded values; shadow mode running. **Founder:** apply the new migration (like 0029–0052) when asked; nothing else.

### Sprint 3 — Evaluation suite and benchmark scoring (≈ 8–10 days, plus labelling time)

| # | Step → verify | Task |
|---|---|---|
| 3.1 | Collect to 100 along the quotas; consent text for volunteers → *a coverage table printed by `npm run bench:coverage` matches §3.1* | 267 |
| 3.2 | Label (pre-fill + human), double-label 20% → *`bench:validate` clean; disagreement list reviewed* | 268 |
| 3.3 | Full metric suite (§3.2) + invariants I1–I6 + report writer → *`npm run bench:parse` prints the table; deterministic* | 269 |
| 3.4 | L1/L2/L3 + ratchet + prompt pin wired into CI → *a deliberately weakened prompt fails the build* | 270 |
| 3.5 | Tune on the 70; **single** held-out run against the §3.3 gates → *gates met or the shortfall named* | 271 |
| 3.6 | Weekly canary; flip the flag founder-first, then all; record results in PROJECT-STATE → *two green canaries before the old path is deleted* | 272 |

**Exit:** gates met on the 30 held-out documents, or an honest table of which are not and why. **Founder:** label review (the 9 real résumés, ≈ 2–3 h), recruit volunteers and collect consent, decide the experience-definition TBD, decide on paid LLM if the token ceiling bites.

---

## 5. Risks

| Risk | Likelihood | Containment |
|---|---|---|
| Free LLM tier too slow for concurrent uploads | High at launch scale | Queue + failover + rules-first; paid tier is allowed (`docs/PAID-PLAN.md`) |
| Labels contain errors → metrics lie | Medium | Double-label 20%; review disagreements; fixtures with *known* answers (synthetic) anchor the scale |
| Tuning on the 30 held-out | Medium | The 30 are opened at release gates only; the run is logged |
| ESCO / alias tables miss Indian terms | High | Miss report per run; the model's raw skill string is kept (`name`) beside the canonical one |
| OCR option A too slow on Vercel | Medium | Measure in 1.5; fall back to option B only if scans > 3% of uploads |
| Founder's and volunteers' résumés leak through the benchmark | Low, severe | `bench/corpus/real/` and `bench/golden/private/` stay git-ignored; reports print aggregates, never contents |
| `Experience` definition disagrees with Jobright/Naukri | Medium | One documented definition + the breakdown always shown (`fulltime_months`, `internship_months`) |

## 6. Open decisions (founder)

1. **OCR route** — A (in-app, private, slower) / B (sidecar) / C (vision model, breaks the "contacts stripped" promise). **Recommended: A.**
2. **Headline experience excludes internships** — yes/no. **Recommended: yes**, with the breakdown shown.
3. **Volunteer résumés** — are you willing to ask ~30 people for a redacted copy? Without them the set leans synthetic and public (US-heavy).
4. **Paid LLM** — only if the token ceiling in §3.4 actually bites after Sprint 2.
5. **`.doc` and image uploads** — build only if the count of rejected uploads says people try them (there is no such counter today; add one in TASK-258).
