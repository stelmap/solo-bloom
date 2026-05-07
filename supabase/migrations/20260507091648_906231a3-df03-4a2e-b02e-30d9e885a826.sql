
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS telegram_link_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS telegram_link_status text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS telegram_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS telegram_last_notification_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clients_telegram_chat_id ON public.clients(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_telegram_link_token ON public.clients(telegram_link_token) WHERE telegram_link_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.telegram_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  client_id uuid,
  appointment_id uuid,
  chat_id text,
  template_name text NOT NULL,
  status text NOT NULL,
  message_id text,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages telegram log"
  ON public.telegram_send_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can read own telegram log"
  ON public.telegram_send_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_log_user_created ON public.telegram_send_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_log_appointment ON public.telegram_send_log(appointment_id);
