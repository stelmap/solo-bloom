-- Restrict realtime.messages so authenticated users can only subscribe to /
-- publish on topics that belong to their own auth.uid().
--
-- Topic naming convention enforced across the app:
--   "<prefix>:<user_id>"   e.g. "calendar-live:<uid>", "pm:<uid>"
--
-- The policy accepts any topic whose suffix after the last ':' equals the
-- caller's uid. Service role bypasses RLS as usual.

DROP POLICY IF EXISTS "Authenticated users can read all messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can read messages" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can insert messages" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated read" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated insert" ON realtime.messages;
DROP POLICY IF EXISTS "Users read own topic messages" ON realtime.messages;
DROP POLICY IF EXISTS "Users write own topic messages" ON realtime.messages;

CREATE POLICY "Users read own topic messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND realtime.topic() LIKE '%:' || auth.uid()::text
);

CREATE POLICY "Users write own topic messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND realtime.topic() LIKE '%:' || auth.uid()::text
);
