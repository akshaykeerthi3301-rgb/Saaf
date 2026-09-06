'use client'

import { useState } from 'react'
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  FileText,
  Gauge,
  Grid2X2,
  Heart,
  LockKeyhole,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PanelRight,
  PencilLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  X,
} from 'lucide-react'

const navItems = [
  { label: 'Jobs', icon: BriefcaseBusiness },
  { label: 'Kanban Board', icon: Grid2X2 },
  { label: 'Résumé', icon: FileText },
  { label: 'Copilot Diagnostic', icon: Gauge },
  { label: 'Interview Prep', icon: MessageCircle },
]

const filters = ['India', 'Strategy & Marketing', '1–3 Years Experience', 'Hybrid/Remote']

function FitScore({ score, low = false }: { score: string; low?: boolean }) {
  return (
    <div className={`flex min-h-[190px] flex-col items-center justify-center rounded-2xl px-5 py-6 text-center ${low ? 'bg-secondary text-primary' : 'bg-primary text-primary-foreground'}`}>
      <div className={`flex size-28 items-center justify-center rounded-full border-[7px] ${low ? 'border-muted-foreground/30' : 'border-accent'} ${low ? 'bg-card' : 'bg-primary/70'}`}>
        <span className="text-4xl font-semibold tracking-[-0.08em]">{score}</span>
      </div>
      <p className={`mt-4 text-[10px] font-bold uppercase tracking-[0.18em] ${low ? 'text-muted-foreground' : 'text-accent'}`}>{low ? 'Low fit' : 'True-fit match'}</p>
      {!low && <div className="mt-4 flex w-full justify-center gap-4 border-t border-primary-foreground/10 pt-3 text-[10px] text-primary-foreground/65"><span>Industry Context <strong className="text-primary-foreground">9/10</strong></span><span>Trajectory <strong className="text-primary-foreground">8/10</strong></span></div>}
    </div>
  )
}

function ReviewDrawer({ onClose, onApprove }: { onClose: () => void; onApprove: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button className="absolute inset-0 bg-primary/25 backdrop-blur-sm" onClick={onClose} aria-label="Close review drawer" />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-card shadow-2xl">
        <header className="flex items-start justify-between border-b border-border px-6 py-5 sm:px-8">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Application review</p><h2 id="review-title" className="mt-2 max-w-lg text-xl font-semibold leading-tight tracking-[-0.04em] text-primary sm:text-2xl">Review Application: Wealth Strategy Manager at Kotak Wealth Management</h2></div>
          <button onClick={onClose} className="ml-4 shrink-0 rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="Close review"><X className="size-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <section><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">01 / Tailored profile</p><h3 className="mt-2 text-lg font-semibold text-primary">AI-Optimized Resume Bullets</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground"><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />Directed acquisition and relationship strategy for <mark className="rounded bg-accent/15 px-1 font-semibold text-accent">HNI clients</mark>, translating complex wealth needs into high-conviction advisory conversations.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />Managed and reviewed diversified portfolios across <mark className="rounded bg-accent/15 px-1 font-semibold text-accent">₹480Cr AUM</mark>, improving client visibility and strengthening long-term portfolio outcomes.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />Led cross-functional strategy with product, investment, and operations teams to improve service delivery and increase relationship <mark className="rounded bg-accent/15 px-1 font-semibold text-accent">retention</mark>.</li></ul></section>
          <section className="mt-8"><label htmlFor="cover-note" className="text-xs font-bold uppercase tracking-[0.16em] text-accent">02 / Cover note</label><textarea id="cover-note" defaultValue="I am excited to bring my experience in wealth strategy and client advisory to Kotak Wealth Management. My background managing HNI relationships, portfolio priorities, and cross-functional growth initiatives aligns closely with this role. I would welcome the opportunity to discuss how I can help deepen client trust and deliver thoughtful outcomes." className="mt-3 min-h-40 w-full resize-y rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" /></section>
          <section className="mt-8 flex gap-3 rounded-2xl border border-border bg-secondary/60 p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" /><p className="text-xs leading-5 text-muted-foreground"><strong className="font-semibold text-primary">Verified: Zero Fabricated Claims.</strong> All points are grounded in your master profile.</p></section>
        </div>
        <footer className="border-t border-border bg-card px-6 py-4 sm:px-8"><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={onClose} className="rounded-xl border border-border bg-secondary px-5 py-3 text-sm font-semibold text-primary hover:bg-muted">Cancel</button><button onClick={onApprove} className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-accent/90">Approve &amp; Stage Application</button></div></footer>
      </aside>
    </div>
  )
}

function JobCard({ low = false, reviewed, onReview }: { low?: boolean; reviewed: boolean; onReview: () => void }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_230px]">
        <div className="flex min-h-[190px] flex-col">
          <div className="flex items-start justify-between gap-3"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">{low ? 'Guardrail' : 'High-precision match'}</span>{!low && <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">Early applicant</span>}</div><h2 className="text-xl font-semibold tracking-[-0.045em] text-primary sm:text-2xl">{low ? 'Senior Backend Engineer' : 'Wealth Strategy Manager'}</h2><p className="mt-1 text-sm font-medium text-muted-foreground">{low ? 'Razorpay' : 'Kotak Wealth Management'}</p></div><button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="More job options"><MoreHorizontal className="size-5" /></button></div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground"><span className="rounded-lg border border-border px-2.5 py-1.5">{low ? 'Remote' : 'Bengaluru / Hybrid'}</span><span className="rounded-lg border border-border px-2.5 py-1.5">Full-time</span><span className="rounded-lg border border-border px-2.5 py-1.5">{low ? '5+ years exp' : '₹18L – ₹24L/yr'}</span></div>
          <div className="mt-auto flex items-center gap-3 pt-6"><button className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary"><MessageCircle className="size-4" />{low ? 'Assistance Locked' : 'Ask Copilot'}</button>{low ? <p className="max-w-xs text-[11px] leading-4 text-muted-foreground"><span className="font-semibold text-primary">Assistance withheld:</span> Profile missing core technical requirements. You can still apply externally.</p> : <button onClick={onReview} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-accent/90">{reviewed ? <Check className="size-4" /> : <ShieldCheck className="size-4" />}{reviewed ? 'Approved for review' : 'Review & Approve'}</button>}</div>
        </div>
        <FitScore score={low ? '42%' : '88%'} low={low} />
      </div>
    </article>
  )
}

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Recommended')
  const [activeFilter, setActiveFilter] = useState('Active Filters')
  const [discoverable, setDiscoverable] = useState(true)
  const [reviewed, setReviewed] = useState(false)
  const [sortBy, setSortBy] = useState('Most relevant')
  const [sortOpen, setSortOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card px-4 py-5 transition-transform lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-3"><a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.05em] text-primary"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>Saaf AI</a><button className="rounded-lg p-2 text-muted-foreground lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></button></div>
          <nav className="mt-10 space-y-1" aria-label="Primary navigation">{navItems.map(({ label, icon: Icon }) => <a key={label} href={label === 'Kanban Board' ? '/kanban' : label === 'Copilot Diagnostic' ? '/onboarding' : '#'} onClick={() => setMobileOpen(false)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${label === 'Jobs' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-primary'}`}><Icon className="size-[18px]" />{label}</a>)}</nav>
          <div className="mt-auto border-t border-border pt-4"><div className="flex items-center gap-3 px-3 py-3"><div className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">AK</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-primary">Aarav Kapoor</p><p className="text-xs text-muted-foreground">Candidate profile</p></div></div><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary"><Settings className="size-[18px]" />Settings</button></div>
        </aside>
        {mobileOpen && <button className="fixed inset-0 z-30 bg-primary/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

        <div className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-border bg-card px-5 sm:px-8"><div className="flex items-center gap-3"><button className="rounded-xl border border-border p-2 text-primary lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></button><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Your workspace</p><h1 className="text-2xl font-semibold tracking-[-0.06em] text-primary">Jobs</h1></div></div><div className="flex items-center gap-2"><button className="rounded-xl p-2.5 text-muted-foreground hover:bg-secondary" aria-label="Search"><Search className="size-5" /></button><button className="rounded-xl p-2.5 text-muted-foreground hover:bg-secondary" aria-label="Notifications"><Bell className="size-5" /></button><div className="ml-1 flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">AK</div></div></header>
          <div className="mx-auto grid max-w-[1500px] gap-6 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="min-w-0"><div className="flex items-center gap-6 border-b border-border"><div className="flex gap-6">{['Recommended', 'Applied', 'Saved'].map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-1 pb-4 text-sm font-semibold ${activeTab === tab ? 'border-accent text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}>{tab}</button>)}</div><span className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Target className="size-3.5 text-accent" /> Sorted by True-Fit</span></div>
              <div className="flex flex-wrap gap-2 py-5"><span className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">Active Filters</span>{filters.map((filter) => <button key={filter} onClick={() => setActiveFilter(filter)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === filter ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'}`}>{filter}</button>)}<button className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary"><PencilLine className="mr-1 inline size-3" />Edit</button></div>
              <div className="mb-4 flex items-center justify-between"><p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-primary">12 roles</span> matched to your baseline</p><div className="relative"><button type="button" onClick={() => setSortOpen(!sortOpen)} aria-haspopup="menu" aria-expanded={sortOpen} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"><span>{sortBy}</span> <ChevronDown className={`pointer-events-none size-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} /></button>{sortOpen && <div role="menu" aria-label="Sort jobs" className="absolute right-0 top-8 z-50 min-w-40 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg sm:right-0"><button type="button" role="menuitem" onClick={() => { setSortBy('Most recent'); setSortOpen(false) }} className={`flex w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-secondary ${sortBy === 'Most recent' ? 'text-primary' : 'text-muted-foreground'}`}>Most recent</button><button type="button" role="menuitem" onClick={() => { setSortBy('Most relevant'); setSortOpen(false) }} className={`flex w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-secondary ${sortBy === 'Most relevant' ? 'text-primary' : 'text-muted-foreground'}`}>Most relevant</button><button type="button" role="menuitem" onClick={() => { setSortBy('Top score'); setSortOpen(false) }} className={`flex w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-secondary ${sortBy === 'Top score' ? 'text-primary' : 'text-muted-foreground'}`}>Top score</button></div>}</div></div>
              <div className="space-y-4"><JobCard reviewed={reviewed} onReview={() => setReviewOpen(true)} /><JobCard low reviewed={false} onReview={() => undefined} /></div></section>
            <aside className="space-y-4"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Profile strength</p><p className="mt-2 text-3xl font-semibold tracking-[-0.08em] text-primary">92%</p></div><div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><BarChart3 className="size-5" /></div></div><div className="mt-4 h-2 rounded-full bg-secondary"><div className="h-2 w-[92%] rounded-full bg-accent" /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">Strong baseline. Add a portfolio link to reach 100%.</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><PanelRight className="size-4" /></div><div><p className="text-sm font-semibold text-primary">B2B Discoverability</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{discoverable ? 'Active: Top employers can invite you.' : 'Paused: employers cannot invite you.'}</p></div></div><button onClick={() => setDiscoverable(!discoverable)} className={`mt-5 flex h-7 w-12 rounded-full p-1 transition-colors ${discoverable ? 'justify-end bg-accent' : 'justify-start bg-secondary'}`} aria-label="Toggle B2B Discoverability"><span className="size-5 rounded-full bg-card shadow-sm" /></button></div><div className="rounded-2xl border border-border bg-primary p-5 text-primary-foreground shadow-sm"><div className="flex items-start gap-3"><Heart className="mt-0.5 size-4 text-accent" /><div><p className="text-sm font-semibold">Weekly Application Limit</p><p className="mt-2 text-2xl font-semibold tracking-[-0.06em]">4<span className="text-primary-foreground/50">/10</span> used</p><p className="mt-2 text-xs leading-5 text-primary-foreground/60">Quality over quantity. Your copilot protects your signal.</p></div></div></div><div className="flex items-center gap-2 px-1 text-xs text-muted-foreground"><CircleHelp className="size-3.5" /> Need help? Ask your copilot.</div></aside>
          </div>
        </div>
      </div>
      {reviewOpen && <ReviewDrawer onClose={() => setReviewOpen(false)} onApprove={() => { setReviewed(true); setReviewOpen(false) }} />}
    </main>
  )
}
