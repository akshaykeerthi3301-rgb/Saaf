'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/features/progress'
import { parseResume } from '@/app/actions/parse-resume'
import { MAX_RESUME_BYTES } from '@/lib/parse/constants'
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
    // parseResume() can reject outside its own internal try/catch — a
    // network failure or a platform-level timeout — and without this,
    // busy never clears: the button is stuck on "Reading…" forever with
    // no error shown. That silent-hang shape is exactly what got reported
    // live, distinct from the 12 error messages parseResume itself returns.
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await parseResume(fd)
      if (!res.ok) { setError(res.error); return }
      writeDraft({ fields: res.fields, warnings: res.warnings })
      router.push('/start/reading')
    } catch {
      setError('Something went wrong reading that file. You can type your details in instead.')
    } finally {
      setBusy(false)
    }
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
        We read it once to fill in your profile, then delete the file. Only the fields
        you confirm are stored. To read your skills we send the text — with your email,
        phone and profile links removed — to Google&apos;s Gemini API, which does not
        train on it. Everything it returns is shown to you before anything is saved.
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
