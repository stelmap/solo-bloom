
CREATE TABLE public.support_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id TEXT,
  surface TEXT NOT NULL DEFAULT 'app',
  language TEXT NOT NULL DEFAULT 'en',
  module TEXT,
  category TEXT,
  page_path TEXT,
  error_code TEXT,
  error_connected BOOLEAN NOT NULL DEFAULT false,
  resolved_by_bot BOOLEAN,
  escalated BOOLEAN NOT NULL DEFAULT false,
  feedback TEXT,
  feedback_comment TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  first_question TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_conversation_idx ON public.support_messages (conversation_id, created_at);

CREATE TABLE public.support_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','known_issue','resolved','closed')),
  description TEXT,
  question TEXT,
  bot_answer TEXT,
  category TEXT,
  module TEXT,
  page_path TEXT,
  error_code TEXT,
  language TEXT,
  user_agent TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.support_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
GRANT SELECT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
GRANT SELECT ON public.support_issues TO authenticated;
GRANT UPDATE ON public.support_issues TO authenticated;
GRANT ALL ON public.support_issues TO service_role;
GRANT SELECT ON public.support_articles TO authenticated;
GRANT SELECT ON public.support_articles TO anon;
GRANT INSERT, UPDATE, DELETE ON public.support_articles TO authenticated;
GRANT ALL ON public.support_articles TO service_role;

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own or admin conversations" ON public.support_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Own or admin messages" ON public.support_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_conversations c
    WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Own or admin issues" ON public.support_issues
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update issues" ON public.support_issues
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Published articles readable" ON public.support_articles
  FOR SELECT
  USING (is_published OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage articles" ON public.support_articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER support_conversations_updated_at BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER support_issues_updated_at BEFORE UPDATE ON public.support_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER support_articles_updated_at BEFORE UPDATE ON public.support_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
