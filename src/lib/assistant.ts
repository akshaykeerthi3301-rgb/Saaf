/**
 * "Ask Jobinko" — a plain assistant over the candidate's OWN data (TASK-166 decision,
 * TASK-186, TASK-187; F-407, F-408, F-409, F-411). Pure: what a question is asking,
 * the typed cards an answer is made of, the missions checklist and the proactive notes.
 *
 * ⚠️ NO CHARACTER, NO MODEL. The persona was removed 2026-09-14 (it was a fourth name
 * for one product), and a model-backed chat cannot serve a free product: the shared
 * Groq key allows ~8,000 tokens a MINUTE across every user (src/lib/parse/llm.ts), so a
 * chat would be down within a handful of conversations. So this answers a fixed set of
 * questions from rows the candidate already owns — their scores, their tracker — and
 * when it does not understand it SAYS so and lists what it can answer. A confident
 * answer to a question it did not understand would be the failure this product exists
 * to argue against. Writing tools that do call a model (cover letter, tailoring) keep
 * their own grounding checks and are unchanged.
 */
export type Intent = 'new' | 'best' | 'strong' | 'improve' | 'followups' | 'applied' | 'remote' | 'pay' | 'queue' | 'progress' | 'help'

export type RoleItem = { id: string; title: string; company: string; score: number; /** One short fact under the title, e.g. the stated pay. */ note?: string }
/** A role the agent proposes to put on the Apply-for-me queue — everything needed to queue it and nothing more. */
export type QueueItem = { roleId: string; title: string; company: string; score: number; url: string }
export type Card =
  | { type: 'text'; text: string }
  /** The weekly objective (F-707): applications in the last 7 days against the candidate's own target. */
  | { type: 'progress'; done: number; target: number; line: string }
  /** A batch the agent proposes to queue (F-708). Nothing is queued until the candidate presses the button; nothing is submitted until they press Start in the extension. */
  | { type: 'queue'; title: string; items: QueueItem[]; note?: string }
  | { type: 'stat'; label: string; value: string; note?: string }
  | { type: 'roles'; title: string; items: RoleItem[]; more?: string; href: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'help'; prompts: string[] }
export type Answer = { intent: Intent; cards: Card[] }

export const PROMPTS: { label: string; q: string }[] = [
  { label: 'What’s new this week?', q: 'what is new this week' },
  { label: 'My best matches', q: 'show my best matches' },
  { label: 'How do I improve my scores?', q: 'how can I improve my scores' },
  { label: 'What needs a follow-up?', q: 'what needs a follow up' },
  { label: 'How many have I applied to?', q: 'how many applications do I have' },
  { label: 'Remote roles', q: 'show remote roles' },
  { label: 'Roles that state pay', q: 'which roles state pay' },
  { label: 'Queue my best Easy-apply roles', q: 'queue my best easy apply roles' },
  { label: 'How is my week going?', q: 'how am i doing against my weekly goal' },
]

const RULES: [Intent, RegExp][] = [
  // The agent's two: first, so "queue my best" is not read as "best" and "weekly goal" not as "new".
  ['progress', /\b(weekly (goal|target|objective)|my (goal|target|objective)|how am i doing|how is my week|progress)\b/],
  ['queue', /\b(queue|apply for me|auto[- ]?apply|line up|lined up)\b/],
  // Order matters: "strong" and "pay" must not be swallowed by "best" or "new".
  ['followups', /\b(follow[- ]?ups?|pending|due|overdue|reminders?|chase|nudge)\b/],
  ['applied', /\b(applied|applications?|how many (have i|did i)|my tracker|in my pipeline|interviews?|offers?)\b/],
  ['pay', /\b(pay|paying|salary|salaries|ctc|lpa|lakhs?|compensation|stated pay)\b/],
  ['remote', /\b(remote|work from home|wfh|anywhere)\b/],
  ['improve', /\b(improve|better|fix|low scores?|why (is|are)|weak(est)?|raise|increase|lift|boost|advice|tips?|what should i)\b/],
  ['strong', /\b(strong|high[- ]precision|how many (are )?(good|great|80)|above 75)\b/],
  ['new', /\b(new|today|this week|latest|recent|just (posted|added)|fresh|since)\b/],
  ['best', /\b(best|top|highest|good matches|matches?|recommend|suggest|show me|which roles)\b/],
]

/** What the question is asking. Anything it cannot place is `help` — never a guess. */
export function classify(question: string): Intent {
  const q = question.toLowerCase().replace(/[^a-z0-9 +'’-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (q.length < 2) return 'help'
  for (const [intent, re] of RULES) if (re.test(q)) return intent
  return 'help'
}

/** The card an unplaced question gets: what Jobinko CAN answer, as questions to tap. */
export const helpCard = (): Card => ({ type: 'help', prompts: PROMPTS.map((p) => p.label) })

// ---------------------------------------------------------------------- missions

export type MissionFacts = {
  hasSavedResume: boolean
  profileHealth: number
  tracked: number
  applied: number
  connections: number | null
  alertsSet: boolean | null
}

export type Mission = { key: string; label: string; why: string; href: string; cta: string; done: boolean }

/** The getting-started checklist, from state the candidate can see. `null` fact = cannot be known yet (its update is missing), so the mission is left out rather than shown as failed. */
export function missions(f: MissionFacts): Mission[] {
  const list: Mission[] = [
    { key: 'resume', label: 'Save a résumé you have checked', why: 'Check it for what an ATS reads, fix what it finds, and keep the version you end up with.', href: '/tools/ats-checker', cta: 'Open the checker', done: f.hasSavedResume },
    { key: 'profile', label: 'Bring your profile to 80%', why: 'Every missing field is a component of your score working with less.', href: '/profile', cta: 'Open your profile', done: f.profileHealth >= 80 },
    { key: 'track', label: 'Track your first role', why: 'A role on your tracker gets follow-up reminders and shows its stage on the feed.', href: '/today', cta: 'See your feed', done: f.tracked >= 1 },
    { key: 'apply', label: 'Apply to your first role', why: 'Applied is set when you say so — or when the employer confirms it, through the extension.', href: '/today', cta: 'Find a role', done: f.applied >= 1 },
  ]
  if (f.connections !== null) list.push({ key: 'network', label: 'Add your LinkedIn connections', why: 'Every role then shows who you already know at the company.', href: '/profile', cta: 'Upload them', done: f.connections > 0 })
  if (f.alertsSet !== null) list.push({ key: 'alerts', label: 'Choose how you hear about new roles', why: 'Daily, weekly or never, and the lowest score worth an email.', href: '/profile', cta: 'Set alerts', done: f.alertsSet })
  return list
}

export const missionProgress = (list: Mission[]) => ({ done: list.filter((m) => m.done).length, total: list.length })

// ---------------------------------------------------------------------- proactive

export type ProactiveFacts = { newStrong: number; followupsDue: number; closedTracked: number | null }
export type Note = { key: string; text: string; href: string; cta: string }

/** Things worth saying before being asked — only where the number is above zero, never padded. */
export function proactive(f: ProactiveFacts): Note[] {
  const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`
  const out: Note[] = []
  if (f.newStrong > 0) out.push({ key: 'new', text: `${plural(f.newStrong, 'new role', 'new roles')} this week scoring 75 or above.`, href: '/today?tab=new', cta: 'See them' })
  if (f.followupsDue > 0) out.push({ key: 'follow', text: `${plural(f.followupsDue, 'application is', 'applications are')} due a follow-up.`, href: '/applications', cta: 'Open the tracker' })
  if (f.closedTracked !== null && f.closedTracked > 0) out.push({ key: 'closed', text: `${plural(f.closedTracked, 'role you track has', 'roles you track have')} come down from the employer’s board.`, href: '/applications', cta: 'Check them' })
  return out
}
