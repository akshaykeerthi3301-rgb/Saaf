-- Saaf — a "Rejected" tracker column (2026-09-25, Jobright parity; their
-- tracker has Applied → Interviewing → Offer Received → Rejected → Archived).
--
-- WHY A NEW VALUE AND NOT A RELABEL. 'closed' stays "Archived" for the reason
-- src/components/features/application-board.tsx gives: a candidate closes an
-- application for their own reasons as often as an employer does, and the
-- catch-all must not name a verdict we do not know. 'rejected' is different in
-- kind — the candidate sets it themselves, because they were told. No row moves.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED. Until then a move into Rejected fails,
-- the card rolls back, and the board says this update is missing. Nothing else
-- depends on the value. No new policy: the "own applications" policy (0015)
-- already covers every status.
--
-- `add value` cannot run inside a transaction block on older Postgres; paste
-- this file on its own in the Supabase SQL editor.

alter type application_status add value if not exists 'rejected' after 'offer';
