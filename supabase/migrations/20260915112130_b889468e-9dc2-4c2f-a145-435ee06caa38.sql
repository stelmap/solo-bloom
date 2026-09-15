ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_source_type_check;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_source_type_check
  CHECK (source_type IN ('legacy','plan','promotion','manual','baseline','stripe','paddle'));