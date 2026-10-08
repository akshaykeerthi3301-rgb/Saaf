/**
 * Which industries a text names — for the "Industry experience" row of the tailor drawer's first step, which sets the
 * posting's industry against the résumé's.
 *
 * ⚠️ A WORD LIST, NOT A CLASSIFIER, AND IT SAYS SO IN THE ROW. The index holds no industry field for a posting, so this
 * reads the posting's own words. It names an industry only when the text uses one of its terms; it never guesses one
 * from the company name. A posting that names none reads "Not stated", exactly as the years row does.
 */
const INDUSTRIES: { name: string; re: RegExp }[] = [
  { name: 'SaaS', re: /\bsaas\b|software as a service/i },
  { name: 'Fintech', re: /\bfintech\b|financial technology|\bpayments?\b|\blending\b/i },
  { name: 'Banking', re: /\bbank(?:s|ing)?\b|wealth management|capital markets|\bNBFC\b/i },
  { name: 'Insurance', re: /\binsur(?:ance|tech)\b/i },
  { name: 'Healthcare', re: /health ?care|\bclinical\b|\bhospital|\bmedtech\b|\bdigital health\b/i },
  { name: 'Pharma', re: /\bpharma(?:ceutical)?s?\b|\blife sciences?\b|\bbiotech\b/i },
  { name: 'E-commerce', re: /e-?commerce|\bmarketplace\b|\bD2C\b|\bquick commerce\b/i },
  { name: 'Retail', re: /\bretail\b|\bFMCG\b|\bCPG\b/i },
  { name: 'Edtech', re: /\bedtech\b|education technology|\be-?learning\b/i },
  { name: 'Logistics', re: /\blogistics\b|supply chain|\bfreight\b|\bfleet\b/i },
  { name: 'Telecom', re: /\btelecom|\bTelco\b/i },
  { name: 'Consulting', re: /\bconsulting\b|\badvisory\b/i },
  { name: 'Manufacturing', re: /\bmanufacturing\b|\bindustrial\b/i },
  { name: 'Automotive', re: /\bautomotive\b|\bEV\b|\belectric vehicles?\b/i },
  { name: 'Media', re: /\bmedia\b|\bentertainment\b|\bOTT\b|\bpublishing\b/i },
  { name: 'Gaming', re: /\bgaming\b|\bvideo games?\b/i },
  { name: 'Real estate', re: /\breal estate\b|\bproptech\b/i },
  { name: 'Energy', re: /\bclimate\b|\brenewable|\bsolar\b|\boil and gas\b/i },
  { name: 'Travel', re: /\btravel\b|\bhospitality\b|\bairline/i },
  { name: 'Cybersecurity', re: /\bcyber ?security\b|\binfosec\b/i },
  { name: 'HR tech', re: /\bhr ?tech\b|\brecruit(?:ing|ment) (?:platform|software)\b|\btalent acquisition\b/i },
  { name: 'AI / ML', re: /\bmachine learning\b|\bartificial intelligence\b|\bAI\b|\bLLMs?\b/ },
]

/** The industries `text` names, the most-mentioned first, at most `limit`. */
export function industriesIn(text: string, limit = 3): string[] {
  const counts = INDUSTRIES.map(({ name, re }) => ({ name, n: (text.match(new RegExp(re.source, re.flags.includes('i') ? 'gi' : 'g')) ?? []).length }))
  return counts.filter((c) => c.n > 0).sort((a, b) => b.n - a.n).slice(0, limit).map((c) => c.name)
}
