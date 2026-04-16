-- Add client_id column to income table for linking manual payments to clients
ALTER TABLE public.income ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for efficient lookups by client
CREATE INDEX idx_income_client_id ON public.income(client_id);