import type { CandidateFacts, RoleFacts } from '@/lib/tailor'
import type { Provider } from '@/lib/parse/llm'

/**
 * The Co-Pilot's no-model writing: templates, variable tags, the follow-up
 * email, and the answer heuristic. No imports beyond types, so client
 * components (the tracker, the studios) can use it without pulling a model
 * client into the browser. The model-backed drafts are in copilot-writer.ts
 * and fall back to these.
 */

// ---------------------------------------------------------------- variables

/** The tags a draft may carry. Filled from the variables panel, live. */
export const VARIABLES = ['Company', 'Role', 'Name', 'Hiring Manager', 'Key Project', 'Target Skill', 'Your Name'] as const
export type Variable = (typeof VARIABLES)[number]

const TAG = () => new RegExp(`\\[(${VARIABLES.join('|')})\\]`, 'g')

export function fillVariables(text: string, values: Partial<Record<Variable, string>>): string {
  return text.replace(TAG(), (tag, name: Variable) => {
    const v = values[name]?.trim()
    return v ? v : tag
  })
}

/**
 * The text with every [Tag] removed, for groundingFailure().
 *
 * ⚠️ WITHOUT THIS THE GROUNDING FILTER REJECTS EVERY DRAFT. It reads a
 * capitalised run like "Hiring Manager" or "Key Project" as an employer the
 * profile does not list — found by this file's own test on 2026-09-23. A tag
 * is a blank for the candidate to fill, never a claim, so it is not checked.
 */
export function forGrounding(text: string): string {
  return text.replace(/\[[^\]\n]{1,40}\]/g, ' ')
}

/** Tags still unfilled in a text — the studio warns before copying them. */
export function unfilledTags(text: string): string[] {
  return [...new Set([...text.matchAll(TAG())].map((m) => m[1]))]
}

// ------------------------------------------------------------- cover letter

export const TONES = ['Professional', 'Direct', 'Consultative', 'High-Impact'] as const
export type Tone = (typeof TONES)[number]

function years(me: CandidateFacts): string {
  return me.yearsExperience ? `${me.yearsExperience} years` : 'my experience'
}

/** The no-model letter. Tags stand in for everything we do not know. */
export function coverLetterTemplate(me: CandidateFacts, tone: Tone): string {
  const current = me.currentTitle ? `${me.currentTitle}${me.employer ? ` at ${me.employer}` : ''}` : 'my current role'
  const open: Record<Tone, string> = {
    Professional: `I am writing to apply for the [Role] position at [Company]. As ${current}, I have spent ${years(me)} building the kind of work this role describes.`,
    Direct: `I'd like to be considered for [Role] at [Company]. Short version: I work as ${current}, and [Target Skill] is where I do my best work.`,
    Consultative: `Teams hiring a [Role] are usually trying to move faster on a few specific problems. From ${years(me)} as ${current}, I have a clear view of how I would help [Company] with them.`,
    'High-Impact': `[Company] is building something I want to be part of, and the [Role] opening is exactly where I can contribute from day one.`,
  }
  const body: Record<Tone, string> = {
    Professional: `In my recent work on [Key Project], I relied on [Target Skill] to deliver results the team depended on. I would bring the same care and consistency to [Company].`,
    Direct: `Most relevant: [Key Project], where [Target Skill] was central. I can do the same at [Company].`,
    Consultative: `On [Key Project], I approached the problem by first understanding what the business needed, then applying [Target Skill] to it. I would start at [Company] the same way — listening first, then building.`,
    'High-Impact': `On [Key Project] I took ownership, used [Target Skill] to move it forward, and saw it through. That is the energy I would bring to [Company].`,
  }
  const close: Record<Tone, string> = {
    Professional: `Thank you for your time and consideration. I would welcome the chance to discuss how I can contribute.\n\nKind regards,\n[Your Name]`,
    Direct: `Happy to talk whenever suits you.\n\n[Your Name]`,
    Consultative: `I would value a conversation about where the team is headed and where I could help most.\n\nBest regards,\n[Your Name]`,
    'High-Impact': `I would love to talk about what we could build together.\n\nBest,\n[Your Name]`,
  }
  const skills = me.skills.length ? `\n\nSkills I would bring: ${me.skills.slice(0, 6).join(', ')}.` : ''
  return `Dear [Hiring Manager],\n\n${open[tone]}\n\n${body[tone]}${skills}\n\n${close[tone]}`
}

export const CONTACTS = [
  { key: 'recruiter', label: 'Recruiter / Talent partner', why: 'Owns the pipeline for this role and can move you into it.' },
  { key: 'manager', label: 'Hiring manager', why: 'Decides. Usually the head of the team this role sits in.' },
  { key: 'peer', label: 'Team member / Team lead', why: 'Can tell you what the work is really like, and refer you.' },
] as const
export type ContactKey = (typeof CONTACTS)[number]['key']

export type OutreachMessage = {
  contact: ContactKey
  /** A LinkedIn connection note. LinkedIn caps these at 300 characters. */
  note: string
  subject: string
  email: string
}

export const LINKEDIN_NOTE_MAX = 300

/** The no-model messages, one set per contact. */
export function outreachTemplates(me: CandidateFacts, role: RoleFacts): OutreachMessage[] {
  const who = me.currentTitle ? `a ${me.currentTitle}${me.employer ? ` at ${me.employer}` : ''}` : 'a candidate'
  const skill = me.skills[0] ? me.skills[0] : '[Target Skill]'
  return [
    {
      contact: 'recruiter',
      note: `Hi [Name], I'm ${who} and just applied for ${role.title} at ${role.company}. My background in ${skill} lines up closely with the role — happy to share more if useful. Thanks!`,
      subject: `${role.title} — application from [Your Name]`,
      email: `Hi [Name],\n\nI recently applied for the ${role.title} role at ${role.company} and wanted to introduce myself directly. I'm ${who}, and the posting's focus on ${skill} is exactly the work I do day to day.\n\nMost relevant: [Key Project], where ${skill} was central.\n\nIf it would help, I'm happy to share more detail or a tailored résumé. Thank you for your time.\n\nBest,\n[Your Name]`,
    },
    {
      contact: 'manager',
      note: `Hi [Name], I saw ${role.company} is hiring a ${role.title} on your team. I'm ${who} with hands-on ${skill} experience — would value 10 minutes to learn what you're solving for.`,
      subject: `Your ${role.title} opening — a quick note`,
      email: `Hi [Name],\n\nI noticed ${role.company} is hiring a ${role.title}, and I believe it sits on your team. I'm ${who}; the problems in the posting are close to what I worked on in [Key Project].\n\nI've applied through the careers page, but wanted to reach out directly: if you have ten minutes, I'd value hearing what the team most needs from this hire.\n\nThank you,\n[Your Name]`,
    },
    {
      contact: 'peer',
      note: `Hi [Name], I'm exploring the ${role.title} role at ${role.company} and would love your perspective on the team. I work in ${skill} as ${who}. Open to a short chat?`,
      subject: `Curious about the ${role.title} team at ${role.company}`,
      email: `Hi [Name],\n\nI'm considering the ${role.title} role at ${role.company} and, since you're on the team, I'd really value your honest take on what the work is like.\n\nA bit about me: I'm ${who}, mostly working with ${skill}. If a 15-minute call suits you any time this week, I'd be grateful.\n\nThanks,\n[Your Name]`,
    },
  ]
}

// ---------------------------------------------------------------- follow-up

export type FollowUpStage = 'saved' | 'applying' | 'applied' | 'interviewing' | 'offer' | 'closed'

/**
 * A follow-up email worded by stage and by days in that stage.
 *
 * Deterministic on purpose: this runs for every card on the tracker, and a
 * follow-up is formulaic enough that a model would only add cost and risk.
 * The day thresholds are the conventional ones — a week before chasing an
 * application, two to three days after an interview.
 */
export function followUpEmail(input: {
  stage: FollowUpStage
  days: number
  title: string
  company: string
}): { subject: string; body: string; advice: string } | null {
  const { stage, days, title, company } = input
  const d = Math.max(0, Math.floor(days))
  const since = d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`

  switch (stage) {
    case 'applied':
      return {
        subject: `Following up — ${title} application`,
        body: `Hi [Name],\n\nI applied for the ${title} role at ${company} ${since} and wanted to follow up. I remain very interested, and I'm happy to share anything that would help the team's review.\n\nThank you for your time,\n[Your Name]`,
        advice: d < 7 ? `It has been ${d} day${d === 1 ? '' : 's'}. Most recruiters suggest waiting a week before the first follow-up.` : `It has been ${d} days — a polite follow-up now is normal and expected.`,
      }
    case 'interviewing':
      return {
        subject: `Thank you — ${title} conversation`,
        body: `Hi [Name],\n\nThank you for the conversation about the ${title} role${d > 0 ? ` ${since}` : ''}. I enjoyed learning about the team's priorities, and it strengthened my interest in joining ${company}.\n\nIf anything would help your decision, I'd be glad to provide it. I look forward to hearing about next steps.\n\nBest regards,\n[Your Name]`,
        advice: d <= 1 ? 'Send the thank-you within a day of the interview.' : d < 5 ? 'A thank-you is still welcome; ask about timelines in the same note.' : `It has been ${d} days since this moved to interviewing — ask about next steps.`,
      }
    case 'offer':
      return {
        subject: `${title} offer — next steps`,
        body: `Hi [Name],\n\nThank you so much for the offer for the ${title} role at ${company}. I'm excited about it and am reviewing the details now. Could we find a time to talk through a couple of questions before I confirm?\n\nThank you again,\n[Your Name]`,
        advice: 'Acknowledge an offer within a day, even if you need time to decide.',
      }
    case 'applying':
      return {
        subject: `Question about the ${title} role`,
        body: `Hi [Name],\n\nI'm preparing my application for the ${title} role at ${company} and had one quick question before I submit: [Your question].\n\nThank you,\n[Your Name]`,
        advice: d >= 5 ? `This has sat in Applying for ${d} days. Postings close — submit soon.` : 'Only send this if you genuinely have a question; otherwise, just apply.',
      }
    default:
      return null
  }
}

// ----------------------------------------------------------- mock interview

export type AnswerFeedback = {
  score: number
  strengths: string[]
  improvements: string[]
  modelAnswer: string | null
  provider: Provider | null
}

/**
 * The no-model scorer: structure, specificity and relevance, each observable
 * in the answer itself. A 10 needs all of them; nothing here pretends to judge
 * whether the answer is TRUE.
 */
export function scoreAnswerHeuristic(question: string, answer: string, keywords: string[]): AnswerFeedback {
  const text = answer.trim()
  const words = text.split(/\s+/).filter(Boolean).length
  const strengths: string[] = []
  const improvements: string[] = []
  let score = 0

  if (words >= 60 && words <= 300) { score += 3; strengths.push(`A workable length (${words} words).`) }
  else if (words < 60) improvements.push(`Too short to show your thinking (${words} words) — aim for 90–200.`)
  else { score += 1; improvements.push(`Long (${words} words) — interviewers lose the thread past ~250.`) }

  const star = [
    /\b(when|at my|in my|while|during|situation|context)\b/i,
    /\b(task|goal|needed to|had to|responsible)\b/i,
    /\b(i (built|led|created|designed|wrote|ran|owned|decided|analysed|analyzed|reduced|improved|launched|set up))\b/i,
    /\b(result|outcome|as a result|which led|so that|this meant|impact)\b/i,
  ]
  const starHits = star.filter((re) => re.test(text)).length
  score += starHits
  if (starHits >= 3) strengths.push('Clear structure — situation, what you did, and what came of it.')
  else improvements.push('Use STAR: the Situation, your Task, the Action YOU took, and the Result.')

  if (/\d/.test(text)) { score += 2; strengths.push('Concrete — you gave a number. Make sure you can back it up.') }
  else improvements.push('Add one concrete measure you can stand behind (time saved, volume, users).')

  const hits = keywords.filter((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text))
  if (hits.length) { score += 1; strengths.push(`Ties back to the role: ${hits.slice(0, 3).join(', ')}.`) }
  else if (keywords.length) improvements.push(`Connect it to what this role asks for (${keywords.slice(0, 3).join(', ')}).`)

  void question
  return { score: Math.min(10, score), strengths, improvements, modelAnswer: null, provider: null }
}

