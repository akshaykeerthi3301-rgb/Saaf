# Customer Persona Set — Five Functions

_Drafted: September 2026. Companion to `2-Customer-Persona.md`, which holds Persona 1 (Rohan) at full framework depth. This file covers all five at consistent, shallower depth so the product is designed for a general matcher rather than a niche engineering tool._

_Based on: 10 web research passes across compensation data, community mapping and career-switch literature; 0 customer interviews. **Every persona here is research-backed and interview-unvalidated.** Re-run after the first 10 interviews (2 per persona)._

---

## Why five, and how to use them

The engine matches on skills, experience, qualification and location — it is role-agnostic by design. But a single engineering persona would silently skew every downstream decision: onboarding copy, empty states, which functions the registry expands into first. Five personas keep the product honest about its own generality.

**They are ranked, not equal.** Five personas with equal weight is the same as none — you cannot design one onboarding screen for five people. The ranking below is *design priority*, not importance.

| # | Persona | Function | ATS supply | Pain | Reachable at ₹0 | Role |
|---|---|---|---|---|---|---|
| 1 | **Rohan** | Engineering | Highest | Very high | Excellent | **Design for** |
| 2 | **Priya** | Business / Consulting | High | High | Medium | Design for |
| 3 | **Karthik** | Marketing / Growth | High | High | Good | Must not break |
| 4 | **Meera** | HR / People | Medium | High | Medium | Must not break |
| 5 | **Arjun** | Finance / CA | Medium* | High | Low | Must not break |

\* Finance carries a structural coverage problem — see Persona 5.

Ranking inputs: measured ATS supply mix (live probe, 2026-09-02), documented pain intensity, and reachability without a marketing budget.

---

## Persona 1 — Rohan · Engineering

**Full depth in [`2-Customer-Persona.md`](2-Customer-Persona.md). Summary only here.**

**Tagline:** Two years at an IT services firm he has outgrown, hunting at 10pm on his phone because the work laptop is monitored — while the portals call him a "Top Applicant" for roles needing fifteen years.

| | |
|---|---|
| **Now → next** | Systems Engineer at Infosys/TCS/Wipro, ₹7.5 LPA → product company SDE, ₹12–17 LPA |
| **Trigger** | The appraisal letter. 2026 was the leanest cycle since 2020 — TCS 4.5–7%, Infosys 6–8%. A 6% hike on ₹7.5 LPA is ~₹3,750/month before tax |
| **Gap** | ₹5–8 lakh/year |
| **Doing today** | Naukri + LinkedIn Easy Apply in Sunday bursts; WhatsApp referral asks to batchmates; LeetCode as insurance. **3/10** |
| **Hard gate in his function** | Years of experience, and increasingly a DSA screen |
| **Watering holes** | **r/developersIndia** — whose wiki has a canonical page titled *"Service Based to Product Based"* — plus Blind India, r/bangalore, college WhatsApp groups |
| **Anchors** | Scaler ₹2.5–4.5L · Coding Ninjas ₹50k–1.5L · Naukri FastForward ₹4,200 · LeetCode Premium ~₹2,800/yr |

---

## Persona 2 — Priya · Business / Consulting

**Tagline:** Two years into a Big-4 or services consulting seat, competent at decks and starved of ownership, trying to get into a product company's strategy or BizOps team before the "consultant" label sets.

| | |
|---|---|
| **Identity** | Business Analyst / Associate Consultant at Accenture, Deloitte, Capgemini or a mid-tier firm. MBA or a strong undergrad. Staffed on a long client engagement in Bengaluru, Gurgaon or Mumbai |
| **Now → next** | ₹9–12 LPA early-career consulting → Product / Strategy / BizOps / Founder's-Office-adjacent at a funded startup, ₹12–18 LPA plus ESOPs |
| **Context** | Weeknights after a client call that ran to 9pm; hotel room during travel weeks. Laptop, not phone — she has more privacy than Rohan but less time |
| **Trigger** | Watching a batchmate move in-house and start *owning* something, while she is on her fourth deck for the same client. Also the staffing conversation that puts her on another year of the same engagement |
| **Top pain** | Her experience reads as generic on paper. Every JD wants "ownership of a business metric" and her résumé says "supported the workstream." She cannot tell which roles will read her consulting background as an asset versus a liability — and no portal tells her |
| **Doing today** | LinkedIn (primary), Instahyre, Naukri, IIMJobs; referral asks to alumni. **4/10** |
| **Hard gate in her function** | Years of experience, and often an institute-tier filter that is stated openly ("Tier-1 MBA preferred") — a gate she frequently fails invisibly |
| **Decision criteria** | (1) Does it read consulting experience correctly rather than penalising it; (2) confidentiality — her firm is small enough that word travels; (3) free |
| **Watering holes** | LinkedIn (heaviest of the five), IIMJobs, alumni WhatsApp groups, r/india careers threads, Blind India `[named communities thin — validate]` |
| **Anchors** | IIMJobs paid visibility · Naukri FastForward ₹4,200 · GMAT/exec-ed prep as the "real" alternative investment |
| **Product note** | The **institute-tier gate is the one that most needs surfacing**. Right now she fails it silently and blames herself. Stating *"this JD asks for a Tier-1 MBA — that's your gap"* is the single most valuable thing the product can tell her |

---

## Persona 3 — Karthik · Marketing / Growth

**Tagline:** Two years running paid campaigns at an agency or a small brand, wants to own growth at a SaaS product — but every posting asks for a channel he has never been given budget for.

| | |
|---|---|
| **Identity** | Digital / performance marketing executive at an agency or a D2C brand, or an inside-sales rep at a mid-size SaaS. Bengaluru, Mumbai, Gurgaon |
| **Now → next** | ₹4–8 LPA agency/brand → Growth or Performance Marketing at a funded SaaS, ₹8–15 LPA |
| **Context** | Late evening on his own laptop; he is the most comfortable of the five job-hunting semi-openly, because marketing people are expected to be visible on LinkedIn |
| **Trigger** | A campaign result he is proud of that nobody senior noticed, plus the realisation that agency work caps out. Monthly, sharpened at appraisal |
| **Top pain** | JDs list channel requirements as binary — "must have run ₹50L+ in paid spend", "must have owned SEO end to end" — and he has run three of the five channels asked for. No portal tells him which of the missing two are actually disqualifying and which are learnable on the job |
| **Doing today** | LinkedIn, Naukri, Instahyre, Cutshort, Wellfound; agency-network WhatsApp groups. **4/10** |
| **Hard gate in his function** | Rarely years — usually **portfolio and channel-specific budget scale**. A genuinely different gate shape from engineering |
| **Decision criteria** | (1) Tells him which missing channel is fatal vs learnable; (2) surfaces early-stage roles before 200 applicants; (3) free |
| **Watering holes** | LinkedIn, Superpath and Online Geniuses (Slack, US-skewed), agency alumni WhatsApp groups, r/DigitalMarketing, Growth Hackers `[India-specific marketing communities are the weakest-mapped of the five — validate]` |
| **Anchors** | Google/Meta certifications (free) · CXL ~$300/mo (aspirational, rarely bought) · Growth School / Kraftshala ₹30k–1L |
| **Product note** | His hard requirements are **not** years-based. The gate engine cannot assume experience is the universal disqualifier |

---

## Persona 4 — Meera · HR / People

**Tagline:** Two years as a recruiter or HR generalist who spends her day inside an ATS filtering other people's résumés, and cannot get her own past the same filter.

| | |
|---|---|
| **Identity** | HR Generalist or Talent Acquisition executive at a services company, staffing firm or mid-size Indian business. Often an MBA-HR from a tier-2 institute |
| **Now → next** | HR Generalist ~₹5.5 LPA (range ₹3.8–8 LPA) → HRBP or People Ops at a product company, ~₹9.5 LPA |
| **Context** | Weeknights, and stolen minutes during the workday — she is *already* in a hiring tool all day, so the tab is less conspicuous. But she is the most exposed of the five: her own HR team would know immediately |
| **Trigger** | Running requisitions for roles that pay double her own. Also the pivot from recruiter to HRBP being blocked because every HRBP posting asks for HRBP experience |
| **Top pain** | **She knows exactly why she is being filtered and can do nothing about it.** She operates the ATS; she has seen the keyword screens reject good candidates. That makes her the most cynical user of the five about any tool claiming to "match" her |
| **Doing today** | LinkedIn (heaviest — HR lives there professionally), Naukri, referral asks inside the HR community. **3/10** |
| **Hard gate in her function** | Years, plus a frequent hard split between *recruitment* and *generalist/HRBP* experience that JDs treat as non-transferable |
| **Decision criteria** | (1) Confidentiality above all — highest of the five; (2) does it understand the recruiter→HRBP transition is a real gap and say so; (3) free |
| **Watering holes** | LinkedIn HR communities, **SHRM India**, **NHRD Network** chapters, HR Slack/WhatsApp groups, PeopleMatters `[validate which are actually used vs merely exist]` |
| **Anchors** | SHRM-CP certification ₹25–40k · NHRD membership · MBA-HR already sunk |
| **Product note** | **Strategically the most valuable early user despite ranking 4th.** She understands ATS filtering from the inside, so if the product's gating logic convinces her it will convince anyone — and she is professionally networked to hundreds of other job seekers. Treat her as a distribution asset, not just a user |

---

## Persona 5 — Arjun · Finance / CA

**Tagline:** A chartered accountant two years past qualification, doing audit or controllership work, trying to move into business finance at a startup — in a function where most of the good roles never reach a job board at all.

| | |
|---|---|
| **Identity** | CA (or CA-Inter / MBA-Finance) two years post-qualification, in audit at a Big-4 or in controllership at a mid-size company. Mumbai, Bengaluru, Gurgaon |
| **Now → next** | ₹7–10 LPA audit/controllership → FP&A or Business Finance at a funded startup, ₹10–17 LPA plus ESOPs |
| **Context** | Weeknights and weekends outside of the closing cycle — his search stops dead for two weeks every month-end and every quarter-end |
| **Trigger** | The end of a brutal audit season, and watching a batchmate join a startup finance team with real ownership. Seasonal rather than continuous — a materially different rhythm from the other four |
| **Top pain** | **Roughly 40–60% of mid-level finance roles in India are filled through referrals before they are ever posted.** He knows the job board is showing him a fraction of the market, so he distrusts every list he is given — including, on day one, yours |
| **Doing today** | Naukri, LinkedIn, ICAI job portal, CA-network WhatsApp groups (the highest-yield channel by far). **3/10** |
| **Hard gate in his function** | **A literal credential** — CA / CFA / CS is a binary requirement in a way that years of experience is not. The cleanest hard gate of any of the five |
| **Decision criteria** | (1) Does it show roles he cannot reach through his own network — otherwise the product is redundant; (2) credential handled correctly; (3) free |
| **Watering holes** | **ICAI** and its regional chapters, CFA Society India, CA-batch WhatsApp groups, r/IndiaInvestments, LinkedIn `[offline/professional-body networks dominate — the least online-reachable of the five]` |
| **Anchors** | CFA ~$1,000+/level · ICAI membership fees · already-sunk CA articleship years |
| **Product note** | **Rank him last honestly.** The referral-first hiring pattern means the product can only ever serve part of his market, and being upfront about that is better than overselling. His credential gate, though, is the clearest possible demonstration of gates-not-weights |

---

## What the set tells us that one persona could not

**1 · Hard requirements are function-typed, not universal.** Engineering gates on years. Finance gates on a credential. Marketing gates on channel and budget scale. Consulting gates on institute tier. HR gates on a recruitment-versus-generalist split. **The gating engine cannot treat "years of experience" as the universal disqualifier** — it needs a typed requirement model per function. This is the single most important product finding in this document, and it only surfaced by doing five.

**2 · The silent gate is often not experience.** Priya fails institute-tier filters invisibly and blames herself. Karthik fails channel-scale requirements. Naming the *actual* disqualifier is more valuable than naming any score.

**3 · There is no single channel that reaches all five.** r/developersIndia reaches only Rohan. ICAI reaches only Arjun. LinkedIn is the sole overlap, and it is the most crowded surface there is. For a ₹0 product with no ad budget this is a genuine launch constraint — **plan five small channel entries, not one big one.**

**4 · Everything else is shared, and that is the product.** All five are employed, 1–4 years in, searching at night on a personal device, receiving confidently-wrong match signals and unattributable silence, at ₹0 willingness to pay, with a ₹4–8 lakh comp gap as the trigger. The core loop — gate, score, explain, keep private — is identical for all of them. **The engine generalises; only the gate types and the watering holes differ.**

**5 · Meera is worth more than her rank.** An HR professional who operates an ATS daily is the harshest possible critic of a matching claim and the best-networked evangelist if convinced. Consider seeding beta deliberately with a few.

---

## Sources

**Compensation**
- Engineering: [Instahyre software engineer salary India 2026](https://resources.instahyre.com/blog/software-engineer-salary-in-india/) · [services vs product comparison](https://www.guvi.in/blog/service-based-vs-product-based-company-salaries/) · [2026 IT appraisal cycle](https://www.ownyourcareer.in/blog/india-it-salary-hike-2026-tcs-infosys-wipro-accenture-cognizant)
- Consulting: [Business Consultant salary India — PayScale](https://www.payscale.com/research/IN/Job=Business_Consultant/Salary) — ₹9.0L average at 1–4 years, 128 reported salaries
- Marketing: [Digital marketing salary India 2026](https://www.youngurbanproject.com/digital-marketing-salary-in-india/) · [SaaS marketing hiring data — Wellfound](https://wellfound.com/hiring-data/r/marketing-manager-2/i/saas)
- HR: [HR Generalist salary India — Glassdoor](https://www.glassdoor.co.in/Salaries/hr-generalist-salary-SRCH_KO0,13.htm) ₹5.5L avg · [HRBP salary](https://www.glassdoor.com/Salaries/hyderabad-hr-business-partner-salary-SRCH_IL.0,9_IM1076_KO10,29.htm) ₹9.5L avg
- Finance: [FP&A salary India 2026](https://mastermindsindia.com/fpa-salary-in-india/) · [FP&A for CA freshers](https://blog.camonk.com/what-is-the-salary-in-fpa-for-ca-freshers/)

**Communities and hiring patterns**
- [r/developersIndia wiki — Service Based to Product Based](https://wiki.developersindia.in/faqs/switching-jobs/service-based-to-product-based)
- [Top HR communities in India 2026](https://www.zimyo.com/insights/top-hr-communities-in-india/) · [best HR online communities](https://www.hibob.com/blog/best-hr-online-communities/)
- [Finance networking India 2026 — CorpReady](https://corpready.in/resources/articles/282-networking-events-finance.html) — **40–60% of mid-to-senior finance roles filled via referral before posting**
- [Best marketing communities 2026](https://thecmo.com/career/best-marketing-communities/)

**Supply**
- Live ATS probe, 2026-09-02, six Indian company boards: 233 roles → 137 India → 66 India + junior + non-engineering. Function mix observed: Product/Program, GTM/Sales/BD, Marketing, Finance, HR, Legal, Design, Data Science. Full method in `1-Product-Offer.md`.

---

## Validation plan

Ten interviews, two per persona, before this file is trusted. Priority questions:

1. **All five —** is the night-time, personal-device, employed-and-hiding pattern real, or is it an artefact of designing from one case?
2. **Priya —** does the institute-tier gate actually operate the way this assumes, and would naming it help or wound?
3. **Karthik —** which channel gaps are genuinely disqualifying versus learnable on the job? This determines whether his gate can be typed at all.
4. **Meera —** does an ATS operator trust a matching product more or less than a layperson?
5. **Arjun —** what fraction of his real opportunities ever appeared on a job board? If it is under half, say so in the product.
