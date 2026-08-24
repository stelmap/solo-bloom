ALTER TABLE public.booking_links ALTER COLUMN is_active SET DEFAULT true;

DELETE FROM public.booking_availability a
USING public.booking_availability b
WHERE a.user_id = b.user_id
  AND a.weekday = b.weekday
  AND a.sort_order = b.sort_order
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS booking_availability_user_weekday_sort_key
  ON public.booking_availability (user_id, weekday, sort_order);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.booking_links (user_id, is_active)
  VALUES (NEW.id, true)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.booking_availability
    (user_id, weekday, is_enabled, start_time, end_time, sort_order)
  SELECT NEW.id, wd, wd BETWEEN 1 AND 5, '09:00:00'::time, '18:00:00'::time, 0
  FROM generate_series(0, 6) AS wd
  ON CONFLICT (user_id, weekday, sort_order) DO NOTHING;

  RETURN NEW;
END;
$$;