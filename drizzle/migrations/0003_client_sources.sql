CREATE TABLE public.client_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  source_type text NOT NULL DEFAULT 'other' CHECK (source_type IN ('referral','social','paid_ads','organic_search','website','event','partnership','directory','other')),
  description text CHECK (description IS NULL OR char_length(description) <= 1000),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_sources TO authenticated;
GRANT ALL ON public.client_sources TO service_role;
ALTER TABLE public.client_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own client sources" ON public.client_sources FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX client_sources_user_idx ON public.client_sources(user_id);

CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.client_sources(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','finished')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own campaigns" ON public.marketing_campaigns FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.client_sources s WHERE s.id = source_id AND s.user_id = auth.uid()));
CREATE INDEX marketing_campaigns_source_idx ON public.marketing_campaigns(source_id);

ALTER TABLE public.clients
  ADD COLUMN source_id uuid REFERENCES public.client_sources(id) ON DELETE SET NULL,
  ADD COLUMN campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN referred_by_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN referred_by_name text CHECK (referred_by_name IS NULL OR char_length(referred_by_name) <= 200);
ALTER TABLE public.expenses
  ADD COLUMN source_id uuid REFERENCES public.client_sources(id) ON DELETE SET NULL,
  ADD COLUMN campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;

CREATE TRIGGER client_sources_updated BEFORE UPDATE ON public.client_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER marketing_campaigns_updated BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();