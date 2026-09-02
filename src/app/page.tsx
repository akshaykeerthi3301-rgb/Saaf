import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleRow } from '@/components/ui/row'
import { Arithmetic } from '@/components/ui/arithmetic'

/**
 * Placeholder home page — a smoke test for the design primitives while the
 * real landing page is built in Phase 4 (TASK-040).
 */
export default function Home() {
  return (
    <main className="measure" style={{ paddingTop: 48, paddingBottom: 64 }}>
      <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
        Design system smoke test
      </p>
      <h1 style={{ fontSize: 'var(--type-display-lg-size)', fontWeight: 300, lineHeight: 1.3, letterSpacing: '-0.02em', margin: '8px 0 32px' }}>
        Saaf
      </h1>

      <Arithmetic indexed={3200} inFunction={47} cleared={3} withheld={44} />

      <RoleRow
        outcome="cleared"
        title="Associate Product Manager"
        company="Razorpay"
        city="Bengaluru"
        score={72}
        reason="go-to-market and stakeholder management match; the job description's three-year floor is your one gap."
      />
      <RoleRow
        outcome="stretch"
        title="Growth Marketing Lead"
        company="slice"
        city="Bengaluru"
        score={64}
        gapYears={1}
        reason="channel mix matches; the posting's three-year floor is one year above you."
      />
      <RoleRow
        outcome="withheld"
        title="Manager, Financial Planning"
        company="Meesho"
        city="Bengaluru"
        reason="Withheld — asks for a chartered accountant; your profile doesn't carry one. A credential can't be stretched."
      />

      <div style={{ marginTop: 32 }}>
        <Input label="Years of experience" provenance="read from your résumé" defaultValue="2" />
        <Input label="Employer" error="We need this to run the experience gate." defaultValue="" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button>Confirm and run my first match</Button>
        <Button variant="ghost">Save and finish later</Button>
      </div>
    </main>
  )
}
