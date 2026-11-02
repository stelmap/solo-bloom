ALTER TABLE public.client_import_batches DROP CONSTRAINT client_import_batches_user_id_fkey;
ALTER TABLE public.client_opening_debts DROP CONSTRAINT client_opening_debts_user_id_fkey;
ALTER TABLE public.client_opening_debt_payments DROP CONSTRAINT client_opening_debt_payments_user_id_fkey;
COMMENT ON COLUMN public.client_import_batches.user_id IS 'Auth owner UUID; profiles are optional in existing/demo workspaces.';
COMMENT ON COLUMN public.client_opening_debts.user_id IS 'Auth owner UUID; client foreign key provides cascade cleanup.';