-- Denormalise the company name onto roles.
--
-- The shortlist showed "Unknown" for every company because `boards` has RLS
-- enabled with zero policies — the registry is the moat and no user may read
-- it, so the join returned nothing. That is the policy working correctly.
--
-- The distinction that resolves it: the SECRET is which boards we track. The
-- company attached to a role the candidate is already being shown is not
-- secret — it is on the public posting they can click through to. So the name
-- is copied onto the role, and the registry stays unreadable.

alter table roles add column company_name text;

comment on column roles.company_name is
  'Denormalised from boards. Roles are readable by authenticated users; boards are not, because the registry is the moat. The company on a shown role is public information.';
