REVOKE EXECUTE ON FUNCTION public.admin_list_reviews() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_review_history(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_review(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_review_reply(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_reviews() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_review_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_review(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_review_reply(uuid, text) TO authenticated;