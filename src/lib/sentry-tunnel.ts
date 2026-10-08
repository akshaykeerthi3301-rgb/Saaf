/**
 * Where a browser error report may be forwarded to — and nowhere else.
 *
 * Why a tunnel at all (Sentry docs, "Troubleshooting → ad blockers": endpoint blocking "can only be
 * resolved by using a tunnel", config key `tunnel`): browsers' content blockers drop requests to
 * *.ingest.sentry.io, so the errors a candidate hits most are the ones Saaf never hears about. The
 * report goes to Saaf's own origin instead and this route passes it on.
 *
 * Why it is picky: an open forwarder would let anyone push traffic through Saaf at any host. The
 * envelope's first line names the DSN it was written for; it is forwarded only if that DSN is Saaf's
 * own project (same host, same project id) and the URL is rebuilt from OUR configured DSN, never from
 * the caller's text.
 */
export function sentryTunnelTarget(envelope: string, ownDsn: string | undefined): string | null {
  if (!ownDsn) return null
  let own: URL
  try { own = new URL(ownDsn) } catch { return null }
  const ownProject = own.pathname.replace(/^\//, '')
  if (!own.host || !/^\d+$/.test(ownProject)) return null

  const firstLine = envelope.slice(0, envelope.indexOf('\n') === -1 ? envelope.length : envelope.indexOf('\n'))
  let header: { dsn?: unknown }
  try { header = JSON.parse(firstLine) as { dsn?: unknown } } catch { return null }
  if (typeof header.dsn !== 'string') return null

  let theirs: URL
  try { theirs = new URL(header.dsn) } catch { return null }
  if (theirs.host !== own.host || theirs.pathname.replace(/^\//, '') !== ownProject) return null

  return `https://${own.host}/api/${ownProject}/envelope/`
}
