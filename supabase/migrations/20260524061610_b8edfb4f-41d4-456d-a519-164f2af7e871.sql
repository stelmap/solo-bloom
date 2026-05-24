
-- ============================================================
-- Public Booking: tables
-- ============================================================

CREATE TABLE public.booking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  is_active boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'manual',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_links_mode_check CHECK (mode IN ('manual','auto'))
);

ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own booking_links"
  ON public.booking_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER booking_links_updated_at
  BEFORE UPDATE ON public.booking_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------

CREATE TABLE public.booking_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weekday smallint NOT NULL,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  session_duration_minutes int NOT NULL DEFAULT 60,
  buffer_minutes int NOT NULL DEFAULT 10,
  min_notice_hours int NOT NULL DEFAULT 24,
  max_horizon_days int NOT NULL DEFAULT 30,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_availability_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT booking_availability_user_weekday_unique UNIQUE (user_id, weekday)
);

ALTER TABLE public.booking_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own booking_availability"
  ON public.booking_availability FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER booking_availability_updated_at
  BEFORE UPDATE ON public.booking_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------

CREATE TABLE public.session_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  link_id uuid REFERENCES public.booking_links(id) ON DELETE SET NULL,
  appointment_id uuid,
  client_id uuid,
  first_name text NOT NULL,
  last_name text,
  email text NOT NULL,
  phone text,
  comment text,
  consent_at timestamptz NOT NULL,
  requested_slot_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending',
  ip_hash text,
  match_hint jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sbr_status_check CHECK (status IN ('pending','confirmed','cancelled_client','cancelled_therapist','needs_linking','spam','expired'))
);

ALTER TABLE public.session_booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own session_booking_requests"
  ON public.session_booking_requests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER session_booking_requests_updated_at
  BEFORE UPDATE ON public.session_booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sbr_user_status ON public.session_booking_requests (user_id, status, created_at DESC);
CREATE INDEX idx_sbr_iphash_time ON public.session_booking_requests (ip_hash, created_at DESC);
CREATE INDEX idx_sbr_slot ON public.session_booking_requests (user_id, requested_slot_at);

-- ============================================================
-- Helper: regenerate booking link token
-- ============================================================

CREATE OR REPLACE FUNCTION public.regenerate_booking_link_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_new := encode(extensions.gen_random_bytes(32), 'hex');
  UPDATE public.booking_links SET token = v_new WHERE user_id = v_uid;
  RETURN v_new;
END $$;

-- ============================================================
-- PUBLIC RPC #1: Get booking page (display only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.public_get_booking_page(p_token text)
RETURNS TABLE (
  display_name text,
  session_duration_minutes int,
  mode text,
  is_active boolean,
  language text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
BEGIN
  SELECT bl.user_id, bl.is_active, bl.mode, bl.display_name
    INTO v_link
    FROM public.booking_links bl
   WHERE bl.token = p_token
   LIMIT 1;

  IF v_link.user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      COALESCE(v_link.display_name, p.business_name, p.full_name, 'Therapist'),
      COALESCE((SELECT ba.session_duration_minutes FROM public.booking_availability ba WHERE ba.user_id = v_link.user_id LIMIT 1), 60),
      v_link.mode,
      v_link.is_active,
      COALESCE(p.language, 'en')
    FROM public.profiles p
    WHERE p.user_id = v_link.user_id;
END $$;

-- ============================================================
-- PUBLIC RPC #2: Get available slots
-- ============================================================

CREATE OR REPLACE FUNCTION public.public_get_available_slots(
  p_token text,
  p_from_date date,
  p_to_date date
)
RETURNS TABLE (slot_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_active boolean;
  v_rule record;
  v_day date;
  v_dow smallint;
  v_dur int;
  v_buffer int;
  v_min_notice int;
  v_max_horizon int;
  v_slot timestamptz;
  v_slot_end timestamptz;
  v_min_from timestamptz := now() + interval '1 hour';
  v_max_to date;
BEGIN
  SELECT bl.user_id, bl.is_active INTO v_user, v_active
  FROM public.booking_links bl WHERE bl.token = p_token LIMIT 1;

  IF v_user IS NULL OR v_active IS NOT TRUE THEN RETURN; END IF;

  -- pick global defaults from first availability row
  SELECT session_duration_minutes, buffer_minutes, min_notice_hours, max_horizon_days
    INTO v_dur, v_buffer, v_min_notice, v_max_horizon
    FROM public.booking_availability WHERE user_id = v_user LIMIT 1;
  IF v_dur IS NULL THEN
    v_dur := 60; v_buffer := 10; v_min_notice := 24; v_max_horizon := 30;
  END IF;

  v_min_from := now() + (v_min_notice || ' hours')::interval;
  v_max_to := LEAST(p_to_date, (now() + (v_max_horizon || ' days')::interval)::date);

  v_day := GREATEST(p_from_date, current_date);
  WHILE v_day <= v_max_to LOOP
    v_dow := EXTRACT(DOW FROM v_day)::smallint;

    FOR v_rule IN
      SELECT start_time, end_time, session_duration_minutes, buffer_minutes
        FROM public.booking_availability
       WHERE user_id = v_user AND weekday = v_dow AND is_enabled = true
    LOOP
      v_slot := (v_day::text || ' ' || v_rule.start_time::text)::timestamptz;
      LOOP
        v_slot_end := v_slot + (v_rule.session_duration_minutes || ' minutes')::interval;
        EXIT WHEN v_slot_end::time > v_rule.end_time;

        IF v_slot >= v_min_from
           AND NOT EXISTS (
             SELECT 1 FROM public.appointments a
              WHERE a.user_id = v_user
                AND a.status NOT IN ('cancelled','no-show')
                AND tstzrange(a.scheduled_at, a.scheduled_at + (a.duration_minutes || ' minutes')::interval, '[)')
                    && tstzrange(v_slot - (v_rule.buffer_minutes || ' minutes')::interval,
                                 v_slot_end + (v_rule.buffer_minutes || ' minutes')::interval, '[)')
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.days_off d
              WHERE d.user_id = v_user AND d.date = v_day AND d.is_non_working = true
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.session_booking_requests sbr
              WHERE sbr.user_id = v_user
                AND sbr.status IN ('pending','confirmed')
                AND sbr.requested_slot_at = v_slot
           )
        THEN
          slot_at := v_slot;
          RETURN NEXT;
        END IF;

        v_slot := v_slot_end + (v_rule.buffer_minutes || ' minutes')::interval;
      END LOOP;
    END LOOP;

    v_day := v_day + 1;
  END LOOP;
END $$;

-- ============================================================
-- PUBLIC RPC #3: Create booking
-- ============================================================

CREATE OR REPLACE FUNCTION public.public_create_booking(
  p_token text,
  p_slot_at timestamptz,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_comment text,
  p_consent boolean,
  p_ip_hash text
)
RETURNS TABLE (request_id uuid, status text, requires_approval boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
  v_dur int;
  v_recent_count int;
  v_matched_client uuid;
  v_status text;
  v_new_id uuid;
  v_appointment_id uuid;
BEGIN
  -- input validation
  IF NOT COALESCE(p_consent, false) THEN RAISE EXCEPTION 'Consent required'; END IF;
  IF length(trim(coalesce(p_first_name,''))) < 1 OR length(trim(coalesce(p_first_name,''))) > 120 THEN
    RAISE EXCEPTION 'Invalid first_name'; END IF;
  IF length(trim(coalesce(p_email,''))) < 3 OR length(trim(coalesce(p_email,''))) > 254
     OR p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email'; END IF;
  IF p_phone IS NOT NULL AND length(p_phone) > 40 THEN RAISE EXCEPTION 'Invalid phone'; END IF;
  IF p_comment IS NOT NULL AND length(p_comment) > 2000 THEN RAISE EXCEPTION 'Invalid comment'; END IF;

  SELECT bl.id, bl.user_id, bl.is_active, bl.mode
    INTO v_link
    FROM public.booking_links bl
   WHERE bl.token = p_token
   LIMIT 1;

  IF v_link.user_id IS NULL OR v_link.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Booking link is not active';
  END IF;

  -- rate limit per ip_hash
  IF p_ip_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent_count
      FROM public.session_booking_requests
     WHERE ip_hash = p_ip_hash AND created_at > now() - interval '1 hour';
    IF v_recent_count >= 5 THEN
      RAISE EXCEPTION 'Too many requests, please try again later';
    END IF;
  END IF;

  -- session duration
  SELECT session_duration_minutes INTO v_dur
    FROM public.booking_availability WHERE user_id = v_link.user_id LIMIT 1;
  v_dur := COALESCE(v_dur, 60);

  -- prevent double-booking
  IF EXISTS (
    SELECT 1 FROM public.appointments a
     WHERE a.user_id = v_link.user_id
       AND a.status NOT IN ('cancelled','no-show')
       AND tstzrange(a.scheduled_at, a.scheduled_at + (a.duration_minutes||' minutes')::interval,'[)')
           && tstzrange(p_slot_at, p_slot_at + (v_dur||' minutes')::interval,'[)')
  ) OR EXISTS (
    SELECT 1 FROM public.session_booking_requests sbr
     WHERE sbr.user_id = v_link.user_id
       AND sbr.status IN ('pending','confirmed')
       AND sbr.requested_slot_at = p_slot_at
  ) THEN
    RAISE EXCEPTION 'Slot no longer available';
  END IF;

  -- client matching
  SELECT id INTO v_matched_client
    FROM public.clients
   WHERE user_id = v_link.user_id
     AND status = 'active'
     AND (lower(email) = lower(p_email) OR (p_phone IS NOT NULL AND phone = p_phone))
   LIMIT 1;

  v_status := CASE
    WHEN v_link.mode = 'auto' AND v_matched_client IS NOT NULL THEN 'confirmed'
    WHEN v_matched_client IS NULL THEN 'needs_linking'
    ELSE 'pending'
  END;

  -- insert request
  INSERT INTO public.session_booking_requests (
    user_id, link_id, client_id, first_name, last_name, email, phone, comment,
    consent_at, requested_slot_at, duration_minutes, status, ip_hash
  ) VALUES (
    v_link.user_id, v_link.id, v_matched_client, trim(p_first_name), nullif(trim(coalesce(p_last_name,'')),''),
    lower(trim(p_email)), nullif(trim(coalesce(p_phone,'')),''), nullif(trim(coalesce(p_comment,'')),''),
    now(), p_slot_at, v_dur, v_status, p_ip_hash
  ) RETURNING id INTO v_new_id;

  -- auto-confirm: create appointment if matched
  IF v_status = 'confirmed' AND v_matched_client IS NOT NULL THEN
    INSERT INTO public.appointments (
      user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, notes
    )
    SELECT v_link.user_id, v_matched_client, s.id, p_slot_at, v_dur, COALESCE(s.price, 0), 'scheduled',
           'Booked via public link' || CASE WHEN p_comment IS NOT NULL THEN E'\n\n' || p_comment ELSE '' END
    FROM public.services s
    WHERE s.user_id = v_link.user_id
    ORDER BY s.created_at ASC
    LIMIT 1
    RETURNING id INTO v_appointment_id;

    UPDATE public.session_booking_requests
       SET appointment_id = v_appointment_id
     WHERE id = v_new_id;
  END IF;

  RETURN QUERY SELECT v_new_id, v_status, (v_link.mode = 'manual');
END $$;

-- Allow anon + authenticated to call public RPCs
GRANT EXECUTE ON FUNCTION public.public_get_booking_page(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_available_slots(text, date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_create_booking(text, timestamptz, text, text, text, text, text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_booking_link_token() TO authenticated;
