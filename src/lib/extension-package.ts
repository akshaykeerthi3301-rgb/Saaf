/**
 * The downloadable test build of the browser extension (public/downloads/jobinko-extension.zip, made by
 * scripts/pack-extension.sh). The deploy leaves extension/ out, so this file — not the manifest — is what the profile
 * page can read at runtime. src/lib/__tests__/extension-package.test.ts fails if it drifts from the manifest or the zip.
 */
export const EXTENSION_VERSION = '0.7.0'
export const EXTENSION_ZIP = '/downloads/jobinko-extension.zip'
export const EXTENSION_FILE_NAME = 'jobinko-extension.zip'
