/**
 * The downloadable test build of the browser extension (public/downloads/jobinko-extension.zip, made by
 * scripts/pack-extension.sh). The deploy leaves extension/ out, so this file — not the manifest — is what the profile
 * page can read at runtime. src/lib/__tests__/extension-package.test.ts fails if it drifts from the manifest or the zip.
 */
export const EXTENSION_VERSION = '0.8.1'
export const EXTENSION_ZIP = '/downloads/jobinko-extension.zip'
export const EXTENSION_FILE_NAME = 'jobinko-extension.zip'

/** "0.8.0" vs "0.7.0": negative when `a` is older than `b`. Missing or non-numeric parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d < 0 ? -1 : 1
  }
  return 0
}
