ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_setup_completed boolean NOT NULL DEFAULT false;
-- Existing accounts already use the app: do not force the initial setup on them.
UPDATE public.profiles SET profile_setup_completed = true WHERE profile_setup_completed = false;

CREATE OR REPLACE FUNCTION public.validate_profile_setup()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Optional fields: may be empty, but must be well-formed when filled.
  IF NEW.phone IS NOT NULL AND btrim(NEW.phone) <> ''
     AND (TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone)
     AND NEW.phone !~ '^\+?[0-9 ()\-.]{6,25}$' THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;
  IF NEW.business_id IS NOT NULL AND btrim(NEW.business_id) <> ''
     AND (TG_OP = 'INSERT' OR NEW.business_id IS DISTINCT FROM OLD.business_id)
     AND NEW.business_id !~ '^[A-Za-z0-9 /\-.]{2,40}$' THEN
    RAISE EXCEPTION 'invalid_business_id' USING ERRCODE = '22023';
  END IF;
  -- Completing the initial setup requires the mandatory fields.
  IF NEW.profile_setup_completed AND (TG_OP = 'INSERT' OR OLD.profile_setup_completed IS DISTINCT FROM true) THEN
    IF coalesce(btrim(NEW.business_name),'') = '' OR coalesce(btrim(NEW.full_name),'') = ''
       OR coalesce(btrim(NEW.public_email),'') = '' OR coalesce(btrim(NEW.currency),'') = ''
       OR coalesce(btrim(NEW.language),'') = '' OR coalesce(btrim(NEW.timezone),'') = '' THEN
      RAISE EXCEPTION 'profile_setup_incomplete' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_profile_setup ON public.profiles;
CREATE TRIGGER trg_validate_profile_setup BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_setup();