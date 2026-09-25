import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Quote } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { getCookieContext, listScoredRoles } from '@/lib/services/cookie'
import { buildPrepPlan, type PrepQuestion } from '@/lib/interview-prep'
import { displayEmployer } from '@/lib/display-names'
import { PracticeBox } from '@/components/features/practice-box'
import { QuestionBank } from '@/components/features/question-bank'
import { listCompanyQuestions } from '@/lib/services/question-bank'

/**
 * Interview prep.
 *
 * ⚠️ NOTHING HERE IS GENERATED, AND THAT WAS NOT SUFFICIENT ON ITS OWN.
 * `buildPrepPlan()` is deterministic — it reads the posting's own extracted
 * requirements and the confirmed profile and assembles questions from the gap.
 * Its header said "nothing is generated, so nothing can be invented", which was
 * true and did not stop it asking candidates "How much have you worked with
 * Poland?" in 78% of its questions on 2026-09-15. Deterministic nonsense is
 * still nonsense. The skill terms now come from a vocabulary mined out of the
 * index by employer-dispersion (scripts/build-skill-vocabulary.ts), measured at
 * 4.1% noise against 60 live postings. See PROJECT-STATE Stage U and TASK-080.
 *
 * It also costs zero tokens, which matters: Groq's free tier is 8,000 tokens a
 * MINUTE shared across every environment on the key (src/lib/parse/llm.ts), so
 * a generated version of this page would serve about three candidates a minute.
 *
 * ⚠️ THE ROLE COMES FROM `gate_results`, NEVER THE WHOLE INDEX — see listScoredRoles().
 */
export const metadata = { title: 'Interview prep — Saaf' }

/**
 * Behavioural questions asked in almost every interview, added to the
 * posting-specific ones so a practice session reaches the brief's 5–10.
 * Generic by design and labelled so: they carry no claim about this posting.
 */
const BEHAVIOURAL: { id: string; question: string; because: string; answerWith: string }[] = [
  {
    id: 'b-conflict',
    question: 'Tell me about a time you disagreed with a colleague or stakeholder. What did you do?',
    because: 'Asked in most interviews, to see how you handle friction without damaging the work.',
    answerWith: 'The disagreement in one line, how you understood their view, what you proposed, and how it ended.',
  },
  {
    id: 'b-failure',
    question: 'Describe something that did not go to plan. What did you learn?',
    because: 'Interviewers use it to test ownership and honesty.',
    answerWith: 'A real miss that was yours, what you changed straight away, and what you do differently now.',
  },
  {
    id: 'b-priorities',
    question: 'How do you decide what to work on when everything is urgent?',
    because: 'A standard check on judgement and communication under pressure.',
    answerWith: 'Your rule of thumb, one example of applying it, and how you told people what would wait.',
  },
]

const KIND_LABEL: Record<PrepQuestion['kind'], string> = {
  experience: 'Experience', 'skill-gap': 'Gap', 'skill-strength': 'Strength',
  credential: 'Credential', motivation: 'Motivation',
}

export default async function InterviewPrepPage({
  searchParams,
}: { searchParams: Promise<{ role?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { role: roleParam } = await searchParams
  const options = await listScoredRoles(user.id)
  const initials = (user.email ?? '?').slice(0, 2).toUpperCase()

  if (options.length === 0) {
    return (
      <AppShell title="Interview prep" initials={initials}>
        <div className="mx-auto max-w-3xl p-5 sm:p-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-primary">Nothing scored yet</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Preparation is built from the gap between your profile and a specific posting, so
              there has to be a scored role first.
            </p>
            <Link href="/today" className="mt-4 inline-block text-sm font-semibold text-primary hover:text-accent">
              See your matches →
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  // The best-scoring role rather than the newest: the one they are most likely
  // to actually interview for.
  const selected = options.find((o) => o.id === roleParam) ?? options[0]
  const [ctx, bank] = await Promise.all([
    getCookieContext(user.id, selected.id),
    selected.company ? listCompanyQuestions(user.id, displayEmployer(selected.company)) : Promise.resolve({ questions: [], stored: true }),
  ])

  return (
    <AppShell title="Interview prep" initials={initials}>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <div className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <MessageCircle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">
              {selected.title}
              {selected.company ? (
                <span className="font-normal text-muted-foreground"> · {displayEmployer(selected.company)}</span>
              ) : null}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Questions are built from this posting&apos;s own words and your confirmed profile —
              nothing in them is generated. Practise any answer below for a score and feedback.
            </p>
          </div>
        </div>

        {options.length > 1 ? (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Prepare for another role</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {options.slice(0, 8).map((o) => (
                <Link
                  key={o.id}
                  href={`/interview-prep?role=${o.id}`}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    o.id === selected.id
                      ? 'border-accent bg-accent/5 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-primary'
                  }`}
                >
                  {o.title}
                  {/* The company tells three "Customer Success Manager 81" chips
                      apart — without it the picker offered identical choices (QA-20). */}
                  {o.company ? <span className="text-muted-foreground"> · {displayEmployer(o.company)}</span> : null}
                  {o.score != null ? <span className="ml-1.5 font-mono tabular-nums">{o.score}</span> : null}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {!ctx.ok ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm leading-6 text-muted-foreground">{ctx.error}</p>
          </div>
        ) : (
          <PrepBody me={ctx.context.me} role={ctx.context.role} roleId={selected.id} />
        )}
        {selected.company ? (
          <QuestionBank company={displayEmployer(selected.company)} roleTitle={selected.title} questions={bank.questions} stored={bank.stored} />
        ) : null}
      </div>
    </AppShell>
  )
}

function PrepBody({
  me, role, roleId,
}: {
  me: Parameters<typeof buildPrepPlan>[0]
  role: Parameters<typeof buildPrepPlan>[1]
  roleId: string
}) {
  const plan = buildPrepPlan(me, role)

  if (plan.questions.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm leading-6 text-muted-foreground">
          This posting carries too little detail to build questions from. That is a fact about the
          posting, not about you — we only ask what its own text supports.
        </p>
      </div>
    )
  }

  return (
    <>
      <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-primary">
        What they are likely to ask
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {plan.questions.length} question{plan.questions.length === 1 ? '' : 's'}, each with the
        reason it will come up and — where the posting gave one — the line it came from.
      </p>

      <div className="mt-4 space-y-3">
        {plan.questions.map((q) => (
          <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-primary">{q.question}</p>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {KIND_LABEL[q.kind]}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{q.because}</p>
            {/* The evidence line is the argument for this page existing. Without
                it these are plausible questions; with it they are read off the
                posting and the candidate can check that. */}
            {q.evidence ? (
              <div className="mt-3 flex gap-2 rounded-lg border border-border bg-secondary/50 p-3">
                <Quote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-5 text-muted-foreground">{q.evidence}</p>
              </div>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-primary">
              <span className="font-semibold">Answer with: </span>{q.answerWith}
            </p>
            <PracticeBox roleId={roleId} question={q.question} />
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-primary">
        Behavioural — asked almost everywhere
      </h2>
      <div className="mt-4 space-y-3">
        {BEHAVIOURAL.map((q) => (
          <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-primary">{q.question}</p>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Behavioural
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{q.because}</p>
            <p className="mt-3 text-sm leading-6 text-primary">
              <span className="font-semibold">Answer with: </span>{q.answerWith}
            </p>
            <PracticeBox roleId={roleId} question={q.question} />
          </div>
        ))}
      </div>

      {plan.strengths.length || plan.gaps.length ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {plan.strengths.length ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Lead with these</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                On your profile and named in the posting: {plan.strengths.join(', ')}.
              </p>
            </div>
          ) : null}
          {plan.gaps.length ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Be ready for these</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Named in the posting, not on your profile: {plan.gaps.join(', ')}.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-5">
        <p className="text-xs leading-5 text-muted-foreground">
          These are read off the posting and your profile, not predicted. A real interview will go
          somewhere else too — this is what the document supports, which is the part we can show you
          the working for.
        </p>
      </div>
    </>
  )
}
