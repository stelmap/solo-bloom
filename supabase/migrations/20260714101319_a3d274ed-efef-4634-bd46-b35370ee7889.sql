
CREATE TABLE public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  appointment_id uuid NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  session_summary text,
  has_homework boolean NOT NULL DEFAULT false,
  homework_text text,
  transference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_notes TO authenticated;
GRANT ALL ON public.session_notes TO service_role;

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own session notes"
  ON public.session_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_session_notes_client ON public.session_notes(user_id, client_id, created_at DESC);

CREATE TRIGGER update_session_notes_updated_at
  BEFORE UPDATE ON public.session_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
