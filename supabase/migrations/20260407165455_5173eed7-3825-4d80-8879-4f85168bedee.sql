
-- Add calendar configuration columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_hours_start text NOT NULL DEFAULT '09:00';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_hours_end text NOT NULL DEFAULT '18:00';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS time_format text NOT NULL DEFAULT '24h';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_duration integer NOT NULL DEFAULT 60;

-- Create breakeven_goals table
CREATE TABLE public.breakeven_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  goal_number integer NOT NULL DEFAULT 1,
  label text NOT NULL DEFAULT '',
  description text DEFAULT '',
  fixed_expenses numeric NOT NULL DEFAULT 0,
  desired_income numeric NOT NULL DEFAULT 0,
  buffer numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_number)
);

ALTER TABLE public.breakeven_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own breakeven_goals" ON public.breakeven_goals
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create recurring_rules table
CREATE TABLE public.recurring_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  service_id uuid NOT NULL,
  time text NOT NULL DEFAULT '09:00',
  duration_minutes integer NOT NULL DEFAULT 60,
  price numeric NOT NULL DEFAULT 0,
  notes text,
  recurrence_type text NOT NULL DEFAULT 'weekly',
  interval_weeks integer NOT NULL DEFAULT 1,
  days_of_week integer[] NOT NULL DEFAULT '{1}',
  start_date date NOT NULL,
  end_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring_rules" ON public.recurring_rules
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add recurring_rule_id to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS recurring_rule_id uuid;
