-- Saaf — track whether a profile's email was actually confirmed.
--
-- Instant sign-in (src/lib/instant-signin.ts) establishes a real session
-- without an inbox round-trip, so anyone can type any address. Google sign-in
-- does confirm ownership. This column is the only thing standing between the
-- daily digest and mailing a stranger who never asked for it — see
-- ingest/digest.ts and src/app/actions/confirm-profile.ts.

alter table profiles add column email_verified boolean not null default false;

comment on column profiles.email_verified is
  'True only when the sign-in method actually confirmed ownership of the
  address (Google today). Instant sign-in never sets this. Gates the daily
  digest so an unverified/typed-by-someone-else address never gets enrolled
  in a recurring email — see ingest/digest.ts.';
