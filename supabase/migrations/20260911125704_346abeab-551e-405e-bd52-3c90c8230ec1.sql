CREATE OR REPLACE FUNCTION public.admin_set_review_verification(p_review_id uuid, p_verified boolean, p_note text DEFAULT NULL)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.reviews;
  v_new public.reviews;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_old FROM public.reviews WHERE id = p_review_id;
  IF v_old.id IS NULL THEN
    RAISE EXCEPTION 'review_not_found';
  END IF;

  UPDATE public.reviews
  SET verification_status = CASE WHEN p_verified THEN 'verified_user'::public.review_verification_status
                                 ELSE 'not_verified'::public.review_verification_status END,
      verification_checked_at = now()
  WHERE id = p_review_id
  RETURNING * INTO v_new;

  INSERT INTO public.review_status_history (review_id, actor_id, from_status, to_status, action, note)
  VALUES (p_review_id, auth.uid(), v_old.moderation_status::text, v_new.moderation_status::text,
          CASE WHEN p_verified THEN 'verify' ELSE 'unverify' END, p_note);

  RETURN v_new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_review(p_review_id uuid, p_action text, p_note text DEFAULT NULL::text)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        ELSE NULL
      END
  WHERE id = p_review_id
  RETURNING * INTO v_new;

  INSERT INTO public.review_status_history (review_id, actor_id, from_status, to_status, action, note)
  VALUES (p_review_id, auth.uid(), v_old.moderation_status, v_target, p_action, p_note);

  RETURN v_new;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_set_review_verification(uuid, boolean, text) TO authenticated;