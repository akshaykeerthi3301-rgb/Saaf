import { createClient } from '@/lib/supabase/server'
import { upcoming, type OfficeHour } from '@/lib/office-hours'

/**
 * Career coaches (migration 0031). Jobright runs a marketplace of rated human
 * coaches (OBSERVED 2026-09-25). Jobinko lists coaches the founder has vetted and
 * links to each coach's own booking page: no payment, no calendar, no ratings
 * until there are real sessions to rate. Coaches are added in the Supabase
 * dashboard; people can apply to be listed.
 */

export type Coach = {
  id: string; name: string; headline: string; bio: string | null
  expertise: string[]; languages: string[]; priceNote: string | null
  bookingUrl: string; profileUrl: string | null
}

export async function listCoaches(): Promise<{ coaches: Coach[]; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coaches')
    .select('id, name, headline, bio, expertise, languages, price_note, booking_url, profile_url')
    .eq('active', true)
    .order('created_at')
  if (error) return { coaches: [], stored: false }
  type Row = { id: string; name: string; headline: string; bio: string | null; expertise: string[]; languages: string[]; price_note: string | null; booking_url: string; profile_url: string | null }
  return {
    stored: true,
    coaches: ((data ?? []) as Row[]).map((r) => ({
      id: r.id, name: r.name, headline: r.headline, bio: r.bio, expertise: r.expertise ?? [], languages: r.languages ?? [],
      priceNote: r.price_note, bookingUrl: r.booking_url, profileUrl: r.profile_url,
    })),
  }
}

export async function applyAsCoach(userId: string, a: { name: string; headline: string; experience: string; bookingUrl: string | null }): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('coach_applications').insert({
    user_id: userId, name: a.name, headline: a.headline, experience: a.experience, booking_url: a.bookingUrl,
  })
  return !error
}

/**
 * The free live sessions the founder has scheduled (migration 0049). `stored:false` means the update is not
 * applied yet. Read as the caller; the table's own rule hides sessions that ended more than three hours ago.
 */
export async function listOfficeHours(): Promise<{ sessions: OfficeHour[]; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('office_hours').select('id, title, host_name, starts_at, duration_min, join_url, description').eq('active', true).order('starts_at').limit(20)
  if (error) return { sessions: [], stored: false }
  type Row = { id: string; title: string; host_name: string; starts_at: string; duration_min: number; join_url: string; description: string | null }
  const sessions = ((data ?? []) as Row[]).map((r) => ({ id: r.id, title: r.title, hostName: r.host_name, startsAt: r.starts_at, durationMin: r.duration_min, joinUrl: r.join_url, description: r.description }))
  return { sessions: upcoming(sessions), stored: true }
}
