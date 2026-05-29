-- Lock down Supabase Realtime so only signed-in users can subscribe to
-- channels. Row-level events for public tables (appointments,
-- session_booking_requests, etc.) are still filtered per-user by the
-- RLS policies on those source tables, so authenticated subscribers only
-- receive changes for rows they can already SELECT.

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior version of our policy so this migration is re-runnable.
DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;

-- Allow only authenticated users to receive realtime broadcasts /
-- postgres_changes. Anonymous (anon) clients are blocked entirely.
CREATE POLICY "Authenticated users can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

-- Allow only authenticated users to send broadcast/presence messages.
CREATE POLICY "Authenticated users can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);