DROP POLICY IF EXISTS "Anyone reads referral settings" ON public.referral_program_settings;
REVOKE ALL PRIVILEGES ON TABLE public.referral_program_settings FROM anon;
GRANT SELECT, UPDATE ON TABLE public.referral_program_settings TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.referral_program_settings TO service_role;
COMMENT ON TABLE public.referral_program_settings IS 'Referral configuration: direct access is restricted to administrators by RLS; authenticated participants receive program terms through get_my_referral_dashboard.';