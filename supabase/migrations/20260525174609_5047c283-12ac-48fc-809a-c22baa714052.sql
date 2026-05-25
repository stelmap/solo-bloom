
-- Phase 1: GDPR deletion executor cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add mfa_required column to profiles (used in phase 3, added here to avoid extra migration)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT false;

-- Deletion executor
CREATE OR REPLACE FUNCTION public.process_gdpr_deletions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  req record;
  deleted_count integer := 0;
BEGIN
  FOR req IN
    SELECT id, user_id
    FROM public.gdpr_deletion_requests
    WHERE scheduled_for <= now()
      AND executed_at IS NULL
      AND cancelled_at IS NULL
  LOOP
    -- Delete all user-owned data. Order matters where FKs exist (none declared here, but kept logical).
    DELETE FROM public.client_attachments        WHERE user_id = req.user_id;
    DELETE FROM public.client_notes              WHERE user_id = req.user_id;
    DELETE FROM public.client_price_changes      WHERE user_id = req.user_id;
    DELETE FROM public.client_status_audit       WHERE user_id = req.user_id;
    DELETE FROM public.client_credits            WHERE user_id = req.user_id;
    DELETE FROM public.payment_corrections       WHERE user_id = req.user_id;
    DELETE FROM public.income_session_allocations WHERE user_id = req.user_id;
    DELETE FROM public.income_audit              WHERE user_id = req.user_id;
    DELETE FROM public.income                    WHERE user_id = req.user_id;
    DELETE FROM public.invoices                  WHERE user_id = req.user_id;
    DELETE FROM public.expected_payments         WHERE user_id = req.user_id;
    DELETE FROM public.group_session_payments    WHERE user_id = req.user_id;
    DELETE FROM public.group_attendance          WHERE user_id = req.user_id;
    DELETE FROM public.group_sessions            WHERE user_id = req.user_id;
    DELETE FROM public.group_members             WHERE user_id = req.user_id;
    DELETE FROM public.groups                    WHERE user_id = req.user_id;
    DELETE FROM public.appointments              WHERE user_id = req.user_id;
    DELETE FROM public.recurring_rules           WHERE user_id = req.user_id;
    DELETE FROM public.services                  WHERE user_id = req.user_id;
    DELETE FROM public.clients                   WHERE user_id = req.user_id;
    DELETE FROM public.expenses                  WHERE user_id = req.user_id;
    DELETE FROM public.breakeven_goals           WHERE user_id = req.user_id;
    DELETE FROM public.days_off                  WHERE user_id = req.user_id;
    DELETE FROM public.booking_availability      WHERE user_id = req.user_id;
    DELETE FROM public.booking_links             WHERE user_id = req.user_id;
    DELETE FROM public.session_booking_requests  WHERE user_id = req.user_id;
    DELETE FROM public.payment_methods           WHERE user_id = req.user_id;
    DELETE FROM public.entitlements              WHERE user_id = req.user_id;
    DELETE FROM public.profiles                  WHERE user_id = req.user_id;

    -- Audit BEFORE removing the auth row (FK-free, so fine either way).
    INSERT INTO public.data_access_audit(user_id, action, entity_type, entity_id, metadata)
    VALUES (req.user_id, 'gdpr_deletion_executed', 'account', req.user_id,
            jsonb_build_object('request_id', req.id, 'executed_at', now()));

    UPDATE public.gdpr_deletion_requests
       SET executed_at = now()
     WHERE id = req.id;

    -- Finally remove the login account itself.
    DELETE FROM auth.users WHERE id = req.user_id;

    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_gdpr_deletions() FROM public, anon, authenticated;

-- Schedule daily at 03:00 UTC
SELECT cron.unschedule('process-gdpr-deletions-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-gdpr-deletions-daily');

SELECT cron.schedule(
  'process-gdpr-deletions-daily',
  '0 3 * * *',
  $cron$ SELECT public.process_gdpr_deletions(); $cron$
);
