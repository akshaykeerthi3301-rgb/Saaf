/**
 * Everything the extension knows, and it lives in chrome.storage.local only.
 *
 * ⚠️ NOTHING HERE IS SENT ANYWHERE EXCEPT THE RÉSUMÉ, AND ONLY TO BE SCORED.
 * The form fields never leave the machine at all — the content script reads
 * them from local storage and writes them into the page in front of the user.
 * That is why the extension needs no account: there is no server-side profile.
 */
const FIELDS = [
  'fullName', 'email', 'phone', 'city', 'currentTitle',
  'currentEmployer', 'yearsExperience', 'noticePeriod', 'linkedin', 'portfolio',
]

chrome.storage.local.get(['resumeText', 'profile']).then(({ resumeText, profile }) => {
  if (resumeText) document.getElementById('resume').value = resumeText
  for (const f of FIELDS) {
    if (profile?.[f]) document.getElementById(f).value = profile[f]
  }
})

document.getElementById('save').addEventListener('click', async () => {
  const profile = {}
  for (const f of FIELDS) profile[f] = document.getElementById(f).value.trim()
  await chrome.storage.local.set({
    resumeText: document.getElementById('resume').value.trim(),
    profile,
  })
  document.getElementById('msg').textContent = 'Saved'
})
