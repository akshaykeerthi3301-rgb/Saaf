/**
 * One company name → one comparable key. Shared by open company data
 * (services/company-facts.ts), the candidate's connections and the interview
 * question bank, so "Groww India Pvt Ltd" on a LinkedIn profile, "Groww" on a
 * posting and "GROWW" typed into a question all meet.
 */
export function normaliseCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(inc|incorporated|ltd|limited|pvt|private|plc|llc|llp|corp|corporation|co|company|gmbh|bv|sa|ag|technologies|technology|india)\b/g, ' ')
    .replace(/\s+/g, '')
}
