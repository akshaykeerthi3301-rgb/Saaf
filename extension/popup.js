/**
 * Everything the extension knows, and it lives in chrome.storage.local only.
 *
 * ⚠️ NOTHING HERE IS SENT ANYWHERE EXCEPT THE RÉSUMÉ TEXT, AND ONLY TO BE
 * SCORED. The form fields, salary figures, yes/no answers and the résumé file
 * never leave the machine — the content script reads them from local storage
 * and writes them into the page in front of the user. The web app can PUSH
 * profile fields in (service-worker.js, saaf:sync); nothing is pulled out.
 */
const FIELDS = [
  'fullName', 'email', 'phone', 'city', 'preferredLocations', 'currentTitle',
  'currentEmployer', 'yearsExperience', 'noticePeriod', 'workAuth', 'linkedin', 'portfolio',
  'currentCtcLakhs', 'expectedCtcLakhs', 'authorisedToWork', 'needsSponsorship', 'willingToRelocate',
]
const MAX_FILE_BYTES = 4 * 1024 * 1024
const $ = (id) => document.getElementById(id)

chrome.storage.local.get(['resumeText', 'profile', 'resumeFile', 'syncedAt']).then(({ resumeText, profile, resumeFile, syncedAt }) => {
  if (resumeText) $('resume').value = resumeText
  for (const f of FIELDS) {
    const el = $(f)
    const v = profile?.[f]
    if (!v) continue
    // A synced notice period may not be one of the menu's words; keep it.
    if (el.tagName === 'SELECT' && ![...el.options].some((o) => o.value === v || o.text === v)) el.add(new Option(v, v))
    el.value = v
  }
  if (resumeFile) $('fileName').textContent = `Stored: ${resumeFile.name}`
  if (syncedAt) $('sync').textContent = `Synced from Saaf ${new Date(syncedAt).toLocaleString()}`
})

/** The file as base64, so it can live in chrome.storage and be rebuilt as a File. */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

$('save').addEventListener('click', async () => {
  const profile = {}
  for (const f of FIELDS) profile[f] = $(f).value.trim()
  const lakhs = (v) => v === '' || /^\d+(\.\d+)?$/.test(v)
  if (!lakhs(profile.currentCtcLakhs) || !lakhs(profile.expectedCtcLakhs)) {
    $('msg').textContent = 'CTC must be a number of lakhs, like 18 or 12.5'
    return
  }
  const patch = { resumeText: $('resume').value.trim(), profile }

  const file = $('resumeFile').files?.[0]
  if (file) {
    if (file.size > MAX_FILE_BYTES) { $('msg').textContent = 'That file is over 4 MB'; return }
    patch.resumeFile = { name: file.name, type: file.type || 'application/pdf', base64: await readFile(file) }
    $('fileName').textContent = `Stored: ${file.name}`
  }
  await chrome.storage.local.set(patch)
  $('msg').textContent = 'Saved'
})
