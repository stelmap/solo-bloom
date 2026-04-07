ALTER TABLE public.profiles 
ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false,
ADD COLUMN working_days_per_week integer NOT NULL DEFAULT 5,
ADD COLUMN sessions_per_day integer NOT NULL DEFAULT 6;