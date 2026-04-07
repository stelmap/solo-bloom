
-- Working schedule: per-weekday configuration
CREATE TABLE public.working_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL, -- 1=Mon, 2=Tue, ..., 7=Sun
  is_working BOOLEAN NOT NULL DEFAULT true,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

ALTER TABLE public.working_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own working_schedule" ON public.working_schedule
  FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Days off: vacation, holidays, sick days
CREATE TABLE public.days_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'day_off', -- day_off, vacation, holiday, sick
  label TEXT,
  custom_start_time TEXT, -- if not null, override working hours for this day
  custom_end_time TEXT,
  is_non_working BOOLEAN NOT NULL DEFAULT true, -- true = full day off, false = custom hours
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.days_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own days_off" ON public.days_off
  FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
