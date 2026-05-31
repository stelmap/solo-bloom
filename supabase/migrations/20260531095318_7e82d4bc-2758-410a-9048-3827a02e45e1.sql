-- Baseline entitlements: Finance, Supervision, Reports accessible to all users.

ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_source_type_check;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_source_type_check
  CHECK (source_type IN ('legacy','plan','promotion','manual','baseline','stripe'));

INSERT INTO public.entitlements
  (user_id, feature_code, source_type, active_from, active_until, is_active)
SELECT u.id, fc.code, 'baseline', now(), NULL, true
FROM auth.users u
CROSS JOIN (VALUES ('operational_access'), ('financial_access')) AS fc(code)
ON CONFLICT (user_id, feature_code, source_type) WHERE is_active = true
DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.entitlements
    (user_id, feature_code, source_type, active_from, active_until, is_active)
  VALUES
    (NEW.id, 'operational_access', 'baseline', now(), NULL, true),
    (NEW.id, 'financial_access',   'baseline', now(), NULL, true)
  ON CONFLICT (user_id, feature_code, source_type) WHERE is_active = true
  DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;