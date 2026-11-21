-- Run ONLY in a disposable PostgreSQL database, never in the live practice.
-- psql -v ON_ERROR_STOP=1 -f tests/security/session-confirmation.sql
BEGIN;
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE TABLE public.clients (id uuid PRIMARY KEY, name text);
CREATE TABLE public.services (id uuid PRIMARY KEY, name text);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY, status text, confirmation_status text,
  confirmation_timestamp timestamptz, scheduled_at timestamptz,
  client_id uuid, service_id uuid
);
CREATE TABLE public.session_confirmations (
  id uuid PRIMARY KEY, appointment_id uuid, token text UNIQUE, confirmed_at timestamptz
);
\ir ../../drizzle/migrations/0031_revoke_confirmation_for_terminal_meetings.sql

DO $$
DECLARE
  apt uuid := '00000000-0000-0000-0000-000000000001';
  result record;
  terminal text;
  used_at timestamptz;
BEGIN
  SELECT * INTO result FROM public.confirm_session_by_token('missing');
  ASSERT NOT result.success AND NOT result.already_confirmed, 'unknown token rejected';
  INSERT INTO public.appointments(id,status) VALUES (apt,'scheduled');
  INSERT INTO public.session_confirmations(id,appointment_id,token)
  VALUES ('00000000-0000-0000-0000-000000000002',apt,'test-link');

  ASSERT (SELECT count(*)=1 FROM public.get_session_confirmation('test-link')), 'scheduled lookup';
  SELECT * INTO result FROM public.confirm_session_by_token('test-link');
  ASSERT result.success AND NOT result.already_confirmed, 'scheduled confirmation';
  ASSERT (SELECT status='confirmed' AND confirmation_status='confirmed' FROM public.appointments WHERE id=apt), 'meeting confirmed';
  SELECT confirmed_at INTO used_at FROM public.session_confirmations WHERE token='test-link';
  ASSERT used_at IS NOT NULL, 'token marked used';
  SELECT * INTO result FROM public.confirm_session_by_token('test-link');
  ASSERT NOT result.success AND result.already_confirmed, 'repeat is idempotent';

  -- Cancellation must revoke both unused and already-used links. Also ensure
  -- unrelated final states cannot be reopened by token confirmation.
  FOREACH terminal IN ARRAY ARRAY['cancelled','canceled','completed','no-show'] LOOP
    UPDATE public.appointments SET status=terminal WHERE id=apt;
    SELECT * INTO result FROM public.confirm_session_by_token('test-link');
    ASSERT NOT result.success AND NOT result.already_confirmed, 'used terminal token rejected';
    ASSERT (SELECT confirmed_at=used_at FROM public.session_confirmations WHERE token='test-link'), 'used token unchanged';
    UPDATE public.session_confirmations SET confirmed_at=NULL WHERE token='test-link';
    SELECT * INTO result FROM public.confirm_session_by_token('test-link');
    ASSERT NOT result.success AND NOT result.already_confirmed, 'unused terminal token rejected';
    ASSERT (SELECT status=terminal FROM public.appointments WHERE id=apt), 'terminal status unchanged';
    ASSERT (SELECT confirmed_at IS NULL FROM public.session_confirmations WHERE token='test-link'), 'unused token unchanged';
    ASSERT (SELECT count(*)=0 FROM public.get_session_confirmation('test-link')), 'terminal lookup hidden';
    UPDATE public.session_confirmations SET confirmed_at=used_at WHERE token='test-link';
  END LOOP;

  UPDATE public.appointments SET status=NULL WHERE id=apt;
  SELECT * INTO result FROM public.confirm_session_by_token('test-link');
  ASSERT NOT result.success AND NOT result.already_confirmed, 'null state denied';

  UPDATE public.appointments SET status='confirmed' WHERE id=apt;
  UPDATE public.session_confirmations SET confirmed_at=NULL WHERE token='test-link';
  SELECT * INTO result FROM public.confirm_session_by_token('test-link');
  ASSERT result.success, 'existing confirmed meeting accepts unused link';
END;
$$;
ROLLBACK;