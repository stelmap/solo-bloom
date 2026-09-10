GRANT SELECT (id, display_name, profession, plan, rating, body, verification_status, moderation_status, published_at, created_at, admin_reply, admin_reply_at, language) ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.review_status_history TO service_role;