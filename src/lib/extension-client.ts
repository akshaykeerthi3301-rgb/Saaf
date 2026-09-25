/**
 * Talking to the Saaf browser extension from a Saaf page (browser only).
 *
 * ⚠️ THE EXTENSION ID IS PUBLIC, NOT A SECRET. It is derived from the `key` in
 * extension/manifest.json, which pins the same ID for the unpacked build and
 * the store build. The extension checks the sender's origin itself
 * (service-worker.js `isSaaf`).
 */
export const EXTENSION_ID = 'idbookligbjgjhnohmgpklloakhoecpd'

type Runtime = {
  sendMessage: (id: string, msg: unknown, cb: (res: unknown) => void) => void
  lastError?: { message?: string }
}

function runtime(): Runtime | null {
  const rt = (globalThis as unknown as { chrome?: { runtime?: Partial<Runtime> } }).chrome?.runtime
  return rt && typeof rt.sendMessage === 'function' ? (rt as Runtime) : null
}

/** One message to the extension; null when it is not installed or does not answer. */
export function askExtension<T>(msg: unknown): Promise<T | null> {
  const rt = runtime()
  if (!rt) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      rt.sendMessage(EXTENSION_ID, msg, (res) => {
        // Reading lastError is what stops Chrome logging "Unchecked runtime.lastError"
        // on every page for candidates without the extension.
        resolve(rt.lastError ? null : ((res as T) ?? null))
      })
    } catch {
      resolve(null)
    }
  })
}
