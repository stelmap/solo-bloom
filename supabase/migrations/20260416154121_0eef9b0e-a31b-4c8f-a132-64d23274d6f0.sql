ALTER TABLE public.profiles DROP CONSTRAINT profiles_language_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_language_check CHECK (language IN ('en', 'uk', 'fr'));