-- Saaf — strict role scoping by default, widened only on request.
--
-- Free-text matching answers "which roles match what I asked for", and the
-- founder's rule is that it must stay strict: a candidate who says "Product
-- Manager" is not shown a credit analyst role unless they say they are open to
-- it. Default false is the strict reading.
--
-- Mechanically this selects the tsquery shape in src/lib/evaluate-user.ts:
-- false -> websearch_to_tsquery, which ANDs the terms, so every word must
-- appear; true -> an OR of the same stems, which widens to adjacent titles at
-- the cost of precision. Both are honest, and the candidate chooses which.

alter table profiles
  add column open_to_adjacent boolean not null default false;

comment on column profiles.open_to_adjacent is
  'False (default): the preferred role must match every term — strict scoping.
  True: match any term, surfacing adjacent roles. Chosen by the candidate on
  the confirm screen and editable on /profile.';
