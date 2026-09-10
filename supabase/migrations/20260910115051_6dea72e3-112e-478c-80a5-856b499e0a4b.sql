CREATE TYPE public.review_moderation_status AS ENUM ('pending','approved','rejected','hidden','deleted','spam');
CREATE TYPE public.review_verification_status AS ENUM ('verified','not_verified','verification_failed');

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  display_name text NOT NULL,
  email text NOT NULL,
  profession text NOT NULL,
  plan text,
  rating smallint NOT NULL,
  body text NOT NULL,
  consent boolean NOT NULL DEFAULT false,
  language text,
  verification_status public.review_verification_status NOT NULL DEFAULT 'not_verified',
  verified_user_id uuid,
  verified_records_count integer NOT NULL DEFAULT 0,
  verification_checked_at timestamptz,
  moderation_status public.review_moderation_status NOT NULL DEFAULT 'pending',
  published_at timestamptz,
  admin_reply text,
  admin_reply_at timestamptz,
  ip_hash text,
  body_hash text
);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_body_len CHECK (char_length(body) BETWEEN 30 AND 1000);

CREATE INDEX reviews_moderation_idx ON public.reviews (moderation_status, published_at DESC);
CREATE INDEX reviews_email_idx ON public.reviews (lower(email), created_at DESC);
CREATE INDEX reviews_ip_idx ON public.reviews (ip_hash, created_at DESC);

CREATE TABLE public.review_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  actor_id uuid,
  from_status public.review_moderation_status,
  to_status public.review_moderation_status,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX review_status_history_review_idx ON public.review_status_history (review_id, created_at DESC);

GRANT SELECT (id, created_at, display_name, profession, plan, rating, body, language, verification_status, published_at, admin_reply, admin_reply_at) ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.review_status_history TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved reviews"
ON public.reviews FOR SELECT
TO anon, authenticated
USING (moderation_status = 'approved');

CREATE TRIGGER reviews_set_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_list_reviews()
RETURNS SETOF public.reviews
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.reviews
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_list_review_history(p_review_id uuid)
RETURNS SETOF public.review_status_history
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.review_status_history
  WHERE review_id = p_review_id AND public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_update_review(p_review_id uuid, p_action text, p_note text DEFAULT NULL)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.reviews;
  v_new public.reviews;
  v_target public.review_moderation_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_old FROM public.reviews WHERE id = p_review_id;
  IF v_old.id IS NULL THEN
    RAISE EXCEPTION 'review_not_found';
  END IF;

  v_target := CASE p_action
    WHEN 'approve' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    WHEN 'hide' THEN 'hidden'
    WHEN 'restore' THEN 'approved'
    WHEN 'spam' THEN 'spam'
    WHEN 'delete' THEN 'deleted'
    WHEN 'pending' THEN 'pending'
    ELSE NULL
  END;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'unknown_action';
  END IF;

  UPDATE public.reviews
  SET moderation_status = v_target,
      published_at = CASE
        WHEN v_target = 'approved' THEN COALESCE(published_at, now())
        ELSE published_at
      END
  WHERE id = p_review_id
  RETURNING * INTO v_new;

  INSERT INTO public.review_status_history (review_id, actor_id, from_status, to_status, action, note)
  VALUES (p_review_id, auth.uid(), v_old.moderation_status, v_target, p_action, p_note);

  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_review_reply(p_review_id uuid, p_reply text)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new public.reviews;
  v_clean text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_clean := NULLIF(btrim(COALESCE(p_reply, '')), '');

  UPDATE public.reviews
  SET admin_reply = v_clean,
      admin_reply_at = CASE WHEN v_clean IS NULL THEN NULL ELSE now() END
  WHERE id = p_review_id
  RETURNING * INTO v_new;

  IF v_new.id IS NULL THEN
    RAISE EXCEPTION 'review_not_found';
  END IF;

  INSERT INTO public.review_status_history (review_id, actor_id, from_status, to_status, action, note)
  VALUES (p_review_id, auth.uid(), v_new.moderation_status, v_new.moderation_status,
          CASE WHEN v_clean IS NULL THEN 'reply_removed' ELSE 'reply_saved' END, NULL);

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_reviews() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_review_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_review(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_review_reply(uuid, text) TO authenticated;