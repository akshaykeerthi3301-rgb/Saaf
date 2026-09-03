'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/features/progress'
import { parseResume, MAX_RESUME_BYTES } from '@/app/actions/parse-resume'
import { writeDraft } from '@/lib/onboarding-store'
import { track } from '@/lib/analytics'

/** Screen 2 — the deletion promise sits beside the ask, not behind a link. */
export default function UploadPage() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function onFile(file: File) {
    setError(undefined)
    if (file.size > MAX_RESUME_BYTES) {
      setError('That file is over 5 MB. You can type your details in instead.')
      return
    }
    setBusy(true)
    track('resume_uploaded', { bytes: file.size, type: file.type })
    const fd = new FormData()
    fd.set('file', file)
    const res = await parseResume(fd)
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    writeDraft({ fields: res.fields, warnings: res.warnings })
    router.push('/start/reading')
  }

  return (
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 560 }}>
      <Progress pct={25} />
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 16px' }}>
        Upload your résumé
      </h1>

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        style={{
          width: '100%', minHeight: 140, cursor: busy ? 'wait' : 'pointer',
          border: '1px dashed var(--color-outline)', background: 'transparent',
          color: 'var(--color-on-surface-variant)', font: 'inherit',
          fontSize: 'var(--type-body-md-size)', borderRadius: 'var(--rounded-none)',
        }}
      >
        {busy ? 'Reading…' : 'Choose a PDF or .docx'}
      </button>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />

      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)' }}>
        We read it once to fill in your profile, then delete the file. Only the fields you confirm are stored.
      </p>

      {error ? (
        <p style={{ color: 'var(--color-error)', fontSize: 'var(--type-body-sm-size)' }}>{error}</p>
      ) : null}

      {/* Never a dead end: manual entry is a full alternative, not a fallback. */}
      <Button variant="ghost" onClick={() => { writeDraft({ fields: {}, warnings: [] }); router.push('/start/confirm') }}>
        Type it in instead
      </Button>
    </main>
  )
}
