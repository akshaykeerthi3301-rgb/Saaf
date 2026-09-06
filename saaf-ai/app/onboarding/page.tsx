'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronDown,
  FileText,
  MapPin,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

const taxonomy = {
  'Marketing & Communications': ['Brand Manager', 'Growth Marketer', 'Digital Marketing Manager', 'SEO Specialist', 'Performance Marketer', 'Content Strategist', 'Public Relations'],
  'Human Resources & Admin': ['HR Business Partner (HRBP)', 'Talent Acquisition Specialist', 'Recruitment Manager', 'Compensation & Benefits', 'Employee Relations', 'L&D Manager'],
  'Finance & Banking': ['Relationship Manager', 'Investment Banker', 'Wealth Advisor', 'Financial Analyst', 'Private Equity Associate', 'Credit Risk Analyst', 'Options Trader', 'Quantitative Analyst'],
  Product: ['Product Manager', 'Technical Product Manager', 'AI Product Manager', 'Growth Product Manager', 'Product Analyst', 'UI/UX Designer'],
  'Corporate Strategy & Consulting': ['Management Consultant', 'Strategy Manager', 'Chief of Staff', 'Business Operations (BizOps)', 'M&A Analyst'],
  'Software/Internet/AI': ['Frontend Engineer', 'Backend Engineer', 'Full Stack Developer', 'Data Scientist', 'Machine Learning Engineer', 'DevOps', 'Solutions Architect'],
  'Sales & Business Development': ['Account Executive', 'B2B Enterprise Sales', 'Sales Engineer', 'SDR/BDR', 'Partnerships Manager'],
  'Supply Chain & Operations': ['Supply Chain Manager', 'Logistics Coordinator', 'Procurement Specialist', 'Operations Manager'],
} as const

const jobTypes = ['Full-time', 'Contract', 'Part-time', 'Internship']
type Domain = keyof typeof taxonomy

export default function OnboardingPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeDomain, setActiveDomain] = useState<Domain>('Marketing & Communications')
  const [jobFunction, setJobFunction] = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['Full-time'])
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function acceptFile(nextFile?: File) {
    if (!nextFile) return
    const valid = nextFile.type === 'application/pdf' || nextFile.name.toLowerCase().endsWith('.docx')
    if (valid) setFile(nextFile)
  }

  function toggleType(type: string) {
    setSelectedTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])
  }

  return (
    <main className="min-h-screen bg-card text-foreground lg:grid lg:grid-cols-[minmax(360px,0.85fr)_minmax(600px,1.15fr)]">
      <section className="relative flex min-h-[390px] flex-col overflow-hidden bg-[linear-gradient(145deg,oklch(0.95_0.02_170),oklch(0.92_0.018_230))] px-6 py-7 sm:px-10 lg:min-h-screen lg:px-14 lg:py-10">
        <div className="absolute -right-24 top-36 size-72 rounded-full border border-accent/15" aria-hidden="true" />
        <div className="absolute -right-10 top-50 size-44 rounded-full border border-accent/10" aria-hidden="true" />
        <a href="/" className="relative flex w-fit items-center gap-2 text-sm font-semibold tracking-[-0.03em] text-primary" aria-label="Saaf AI home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"><Sparkles className="size-4" /></span>
          Saaf AI
        </a>
        <div className="relative mt-auto max-w-md pb-2 pt-20 lg:pb-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-card/65 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm"><span className="size-1.5 rounded-full bg-accent" /> Copilot Diagnostic</div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.055em] text-primary sm:text-5xl">To get started, tell us about your target role.</h1>
          <p className="mt-5 max-w-sm text-pretty text-sm leading-6 text-muted-foreground sm:text-base">We use this to establish your baseline True-Fit score before tailoring your applications.</p>
          <div className="mt-10 hidden items-center gap-2 text-xs font-medium text-primary/60 lg:flex"><ShieldCheck className="size-4 text-accent" /> Your profile stays yours, always.</div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-14 xl:px-24">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-9 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Step 1 of 2</p><p className="mt-2 text-sm text-muted-foreground">Build your career baseline</p></div><span className="text-xs font-medium text-muted-foreground">About 2 min</span></div>

          <div className="space-y-9">
            <div>
              <label className="mb-3 block text-sm font-semibold text-primary">Resume</label>
              <button type="button" className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition-colors ${isDragging ? 'border-accent bg-accent/5' : 'border-border bg-secondary/25 hover:border-accent/60 hover:bg-accent/5'}`} onClick={() => fileInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files[0]) }}>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => acceptFile(event.target.files?.[0])} />
                {file ? <><span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent"><FileText className="size-5" /></span><span className="text-sm font-semibold text-primary">{file.name}</span><span className="mt-1 text-xs text-muted-foreground">Ready to parse · Click to replace</span></> : <><span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Upload className="size-5" /></span><span className="text-sm font-semibold text-primary">Upload your master resume (PDF or DOCX)</span><span className="mt-1 text-xs text-muted-foreground">Our AI will automatically parse your experience.</span></>}
              </button>
            </div>

            <div className="relative">
              <label className="mb-3 block text-sm font-semibold text-primary" htmlFor="job-function">* Job Function</label>
              <button id="job-function" type="button" aria-haspopup="listbox" aria-expanded={isMenuOpen} className={`flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3.5 text-left text-sm shadow-sm transition-colors ${isMenuOpen ? 'border-accent ring-2 ring-accent/10' : 'border-input hover:border-foreground/30'}`} onClick={() => setIsMenuOpen((open) => !open)}><span className={jobFunction ? 'text-primary' : 'text-muted-foreground'}>{jobFunction || 'Select your target job function...'}</span><ChevronDown className={`size-4 text-muted-foreground transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} /></button>
              {isMenuOpen && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 grid max-h-[min(430px,70vh)] grid-cols-[minmax(170px,0.9fr)_minmax(210px,1.1fr)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10" role="listbox"><div className="overflow-y-auto border-r border-border bg-secondary/35 p-2">{(Object.keys(taxonomy) as Domain[]).map((domain) => <button key={domain} type="button" className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors ${activeDomain === domain ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/70 hover:text-primary'}`} onMouseEnter={() => setActiveDomain(domain)} onFocus={() => setActiveDomain(domain)} onClick={() => setActiveDomain(domain)}>{domain}</button>)}</div><div className="overflow-y-auto p-2"><p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{activeDomain}</p>{taxonomy[activeDomain].map((role) => <button key={role} type="button" role="option" aria-selected={jobFunction === role} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${jobFunction === role ? 'bg-accent/10 font-semibold text-accent' : 'text-primary hover:bg-secondary'}`} onClick={() => { setJobFunction(role); setIsMenuOpen(false) }}>{role}{jobFunction === role && <Check className="size-4" />}</button>)}</div></div>}
            </div>

            <fieldset><legend className="mb-3 text-sm font-semibold text-primary">* Job Type</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{jobTypes.map((type) => <label key={type} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${selectedTypes.includes(type) ? 'border-accent bg-accent/5 text-primary' : 'border-input text-muted-foreground hover:border-foreground/30'}`}><input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} className="size-4 accent-[oklch(0.54_0.12_163)]" />{type}</label>)}</div></fieldset>

            <div><label className="mb-3 block text-sm font-semibold text-primary" htmlFor="location">* Location</label><div className="relative"><MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input id="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Anywhere in India (e.g., Bengaluru, Mumbai, NCR)" className="w-full rounded-xl border border-input bg-card py-3.5 pl-11 pr-4 text-sm text-primary outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/10" /></div><label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={remote} onChange={(event) => setRemote(event.target.checked)} className="size-4 accent-[oklch(0.54_0.12_163)]" />Open to Remote</label></div>
          </div>

          <div className="mt-10 border-t border-border pt-6"><button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:-translate-y-0.5 hover:bg-primary/90" onClick={() => { setSubmitted(true); router.push('/dashboard') }}>{submitted ? <><Check className="size-4" /> Baseline saved</> : <>Next step <MousePointer2 className="size-4" /></>}</button><p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />Your data is secured under the DPDP Act 2023. We never share your profile without permission.</p>{submitted && <p className="mt-4 rounded-xl bg-accent/10 px-4 py-3 text-center text-sm font-medium text-accent">Your diagnostic is ready. We&apos;ll use these preferences to find better-fit roles.</p>}</div>
        </div>
      </section>
    </main>
  )
}
