
-- Create supervisions table
CREATE TABLE public.supervisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  supervision_date date NOT NULL DEFAULT CURRENT_DATE,
  paid_amount numeric NOT NULL DEFAULT 0,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  imported_notes_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  supervision_outcome text,
  supervisor_feedback text,
  next_steps text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supervisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own supervisions"
  ON public.supervisions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_supervisions_updated_at
  BEFORE UPDATE ON public.supervisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add supervision tracking to client_notes
ALTER TABLE public.client_notes
  ADD COLUMN IF NOT EXISTS included_in_supervision boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervision_id uuid REFERENCES public.supervisions(id) ON DELETE SET NULL;

-- Index for fast lookup of unused notes per client
CREATE INDEX idx_client_notes_supervision ON public.client_notes (client_id, included_in_supervision);

-- Index for supervisions per client
CREATE INDEX idx_supervisions_client ON public.supervisions (client_id, supervision_date);
