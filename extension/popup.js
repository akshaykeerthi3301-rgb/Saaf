/** The résumé lives in chrome.storage.local and nowhere else. */
const t = document.getElementById('t')
chrome.storage.local.get('resumeText').then(({ resumeText }) => { if (resumeText) t.value = resumeText })
document.getElementById('s').addEventListener('click', async () => {
  await chrome.storage.local.set({ resumeText: t.value.trim() })
  document.getElementById('m').textContent = 'Saved'
})
