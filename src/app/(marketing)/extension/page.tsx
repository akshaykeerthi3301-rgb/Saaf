import { DocPage } from '@/components/features/doc-page'
import caps from '@/lib/taxonomy/ats-capabilities.json'

export const metadata = {
  title: 'The Jobinko browser extension — what it does on each site',
  description: 'Which application sites the Jobinko extension reads, fills and applies on, and how well each has been checked — written down, including what is not verified.',
  alternates: { canonical: '/extension' },
}

/**
 * F-711 (TASK-192). The list is DATA — src/lib/taxonomy/ats-capabilities.json — and a test fails if it
 * drifts from the extension's own site list. It says what has been checked and what has not;
 * a row is "verified" only with its evidence next to it.
 */
const TIER: Record<string, string> = { verified: 'Checked on a real form', recognised: 'Recognised — not checked on a live form' }
const FLOW: Record<string, string> = { 'one-page': 'One page', 'multi-step': 'Several pages', 'account-first': 'Account first' }

export default function ExtensionPage() {
  return (
    <DocPage eyebrow="Browser extension" title="What the extension does on each site">
      <div className="mt-8 max-w-[65ch] space-y-4 text-sm leading-6 text-muted-foreground">
        <p>
          On a job posting it scores the posting against your résumé and shows the keywords you are missing. On the application
          form it can fill what you have told it. If you switch it on, it can also press Submit for you — never past a CAPTCHA,
          never with a guessed answer, and only when the employer’s own page confirms the application.
        </p>
        <p>
          It does not run on LinkedIn or Naukri, on purpose: both prohibit the kind of overlay an extension draws, and the
          consequence would land on your account, not ours.
        </p>
      </div>

      {process.env.NEXT_PUBLIC_EXTENSION_URL ? (
        <p className="mt-6"><a href={process.env.NEXT_PUBLIC_EXTENSION_URL} className="bg-brand-gradient inline-flex rounded-xl px-4 py-2 text-sm font-semibold">Add to Chrome</a></p>
      ) : (
        <p role="note" className="mt-6 max-w-[65ch] rounded-xl border border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
          The extension is not in the Chrome Web Store yet, so there is nothing to install from this page today. What follows describes it as it is built.
        </p>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold tracking-[-0.03em] text-primary">Site by site</h2>
      <p className="mb-4 max-w-[65ch] text-sm leading-6 text-muted-foreground">
        The same code runs on every site below, so what differs is how well it has been checked and the shape of the employer’s
        form. The “checked” column is measured; the “form” column is our reading of how each vendor’s application usually works
        and has not been verified site by site. As of {caps.asOf}: {caps.platforms.filter((p) => p.tier === 'verified').length} of {caps.platforms.length} checked on a real form.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Application sites the extension recognises</caption>
          <thead className="bg-secondary/50 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <tr><th scope="col" className="px-3 py-2">Site</th><th scope="col" className="px-3 py-2">Checked</th><th scope="col" className="px-3 py-2">Form</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {caps.platforms.map((p) => (
              <tr key={p.name}>
                <th scope="row" className="px-3 py-2 font-semibold text-primary">{p.name}</th>
                <td className="px-3 py-2 text-muted-foreground">{TIER[p.tier]}{'evidence' in p ? <span className="block text-xs">{p.evidence}</span> : null}</td>
                <td className="px-3 py-2 text-muted-foreground">{FLOW[p.flow]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-4 max-w-[65ch] space-y-2 text-xs leading-5 text-muted-foreground">
        {Object.entries(caps.flows).map(([k, v]) => (<div key={k}><dt className="inline font-semibold text-primary">{FLOW[k]}: </dt><dd className="inline">{v}</dd></div>))}
      </dl>

      <h2 className="mb-3 mt-10 text-lg font-semibold tracking-[-0.03em] text-primary">A site that is not here</h2>
      <p className="max-w-[65ch] text-sm leading-6 text-muted-foreground">
        Open the extension on that site and press “Ask Jobinko to support this site”. Only the site’s address is sent — never the page —
        and only when you next open Jobinko signed in. Nothing is promised; the requests tell us which sites to check next.
      </p>
    </DocPage>
  )
}
