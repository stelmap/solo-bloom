import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LifeBuoy, X, Send, Loader2, ThumbsUp, ThumbsDown, Flag, ArrowLeft, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { useOverlayOpen } from "@/hooks/useOverlayOpen";
import {
  SUPPORT_OPEN_EVENT, SupportAction, SupportContext, getSupportAnonId, moduleFromPath,
} from "@/lib/support";

type Msg = {
  role: "user" | "assistant";
  content: string;
  actions?: SupportAction[];
  resolved?: boolean;
};

type PastConversation = {
  id: string;
  created_at: string;
  category: string | null;
  first_question: string | null;
};

const STORE_KEY = "support_session";

/**
 * Single support surface for the whole product: the floating button, the chat
 * panel, feedback and problem reporting. Mounted once in App, so it works on
 * the landing page, inside the product and for error-triggered help.
 */
export function SupportWidget() {
  const { t } = useLanguage();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const overlayOpen = useOverlayOpen();
  const [view, setView] = useState<"chat" | "history">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportText, setReportText] = useState("");
  const [past, setPast] = useState<PastConversation[]>([]);
  const ctxRef = useRef<SupportContext>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const insideApp = useMemo(
    () => Boolean(user) && !["/", "/auth"].includes(location.pathname),
    [user, location.pathname],
  );

  /* ---------- session persistence (per browser session) ---------- */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id: string | null; messages: Msg[] };
      setConversationId(parsed.id ?? null);
      setMessages(parsed.messages ?? []);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ id: conversationId, messages }));
    } catch { /* noop */ }
  }, [conversationId, messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  /* ---------- opening (button or error-triggered) ---------- */
  const openWith = useCallback((context: SupportContext, prefill?: string) => {
    ctxRef.current = { ...context };
    setView("chat");
    setOpen(true);
    if (prefill) setInput(prefill);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      openWith(detail.context ?? {}, detail.prefill);
      track("support_opened", { source: "error", module: detail.context?.module ?? null });
    };
    window.addEventListener(SUPPORT_OPEN_EVENT, handler);
    return () => window.removeEventListener(SUPPORT_OPEN_EVENT, handler);
  }, [openWith]);

  const currentContext = useCallback((): SupportContext => ({
    module: ctxRef.current.module ?? moduleFromPath(location.pathname),
    pagePath: location.pathname,
    action: ctxRef.current.action ?? null,
    errorCode: ctxRef.current.errorCode ?? null,
    errorMessage: ctxRef.current.errorMessage ?? null,
    appVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : null,
  }), [location.pathname]);

  /* ---------- sending ---------- */
  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setSending(true);
    setFeedbackGiven(false);
    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: {
          action: "chat",
          conversationId,
          message: question,
          language: lang,
          surface: insideApp ? "app" : "public",
          anonId: user ? null : getSupportAnonId(),
          context: currentContext(),
        },
      });
      if (error || !data || (data as any).error) throw error ?? new Error((data as any)?.error);
      const payload = data as { conversationId: string; answer: string; actions: SupportAction[]; resolved: boolean };
      setConversationId(payload.conversationId);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: payload.answer,
        actions: payload.actions ?? [],
        resolved: payload.resolved,
      }]);
      track("support_message_sent", { module: currentContext().module ?? null });
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("support.failed") }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [conversationId, currentContext, insideApp, lang, sending, t, user]);

  /* ---------- feedback & report ---------- */
  const sendFeedback = useCallback(async (helpful: boolean) => {
    if (!conversationId) return;
    setFeedbackGiven(true);
    await supabase.functions.invoke("support-chat", {
      body: { action: "feedback", conversationId, helpful },
    });
    if (!helpful) setReporting(true);
  }, [conversationId]);

  const submitReport = useCallback(async () => {
    if (!conversationId) return;
    const { data, error } = await supabase.functions.invoke("support-chat", {
      body: { action: "report", conversationId, description: reportText },
    });
    if (error || (data as any)?.error) {
      toast({ title: t("support.reportFailed"), variant: "destructive" });
      return;
    }
    setReporting(false);
    setReportText("");
    toast({ title: t("support.reportSent"), description: t("support.reportSentBody") });
  }, [conversationId, reportText, t]);

  /* ---------- past conversations ---------- */
  const loadHistory = useCallback(async () => {
    setView("history");
    const { data } = await supabase
      .from("support_conversations")
      .select("id, created_at, category, first_question")
      .order("created_at", { ascending: false })
      .limit(20);
    setPast((data as PastConversation[]) ?? []);
  }, []);

  const openPast = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setConversationId(id);
    setMessages(((data ?? []) as { role: string; content: string }[]).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })));
    setView("chat");
  }, []);

  const startNew = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setFeedbackGiven(false);
    ctxRef.current = {};
  }, []);

  const quickActions = useMemo(() => [
    t("support.quick.session"),
    t("support.quick.payments"),
    t("support.quick.booking"),
    t("support.quick.error"),
  ], [t]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  /* ---------- render ---------- */
  if (!open) {
    // Never sit on top of a drawer/modal: its actions must stay clickable.
    if (overlayOpen) return null;
    return (
      <button
        type="button"
        onClick={() => { openWith({}); track("support_opened", { source: "button" }); }}
        aria-label={t("support.button")}
        className={cn(
          "fixed right-4 z-[55] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-90",
          insideApp ? "bottom-20 lg:bottom-4 lg:right-[calc(1rem+15rem)]" : "bottom-4",
        )}
      >
        <LifeBuoy className="h-4 w-4" />
        <span className="hidden sm:inline">{t("support.button")}</span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t("support.title")}
      className="fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] max-h-[min(38rem,calc(100dvh-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        {view === "history" && (
          <button type="button" onClick={() => setView("chat")} aria-label={t("support.back")}>
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <LifeBuoy className="h-4 w-4 text-primary" />
        <span className="flex-1 text-sm font-semibold text-foreground">{t("support.title")}</span>
        {user && view === "chat" && (
          <button type="button" onClick={loadHistory} aria-label={t("support.myConversations")}>
            <History className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        <button type="button" onClick={() => setOpen(false)} aria-label={t("support.close")}>
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      </header>

      {view === "history" ? (
        <div className="flex-1 overflow-y-auto p-3 text-sm">
          {past.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">{t("support.noHistory")}</p>
          )}
          {past.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openPast(c.id)}
              className="mb-2 w-full rounded-lg border border-border p-3 text-left hover:bg-accent"
            >
              <span className="block text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString()} · {c.category ?? "—"}
              </span>
              <span className="line-clamp-2 text-foreground">{c.first_question ?? "—"}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <>
                <p className="rounded-xl bg-muted p-3 text-foreground">{t("support.greeting")}</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-accent"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.actions.map((a) => (
                        <button
                          key={a.route + a.label}
                          type="button"
                          onClick={() => { navigate(a.route); setOpen(false); }}
                          className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground hover:bg-accent"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("support.thinking")}
              </div>
            )}

            {lastAssistant && !sending && !feedbackGiven && conversationId && (
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <span>{t("support.helpful")}</span>
                <button type="button" onClick={() => sendFeedback(true)} aria-label={t("support.yes")}>
                  <ThumbsUp className="h-4 w-4 hover:text-foreground" />
                </button>
                <button type="button" onClick={() => sendFeedback(false)} aria-label={t("support.no")}>
                  <ThumbsDown className="h-4 w-4 hover:text-foreground" />
                </button>
              </div>
            )}

            {reporting && (
              <div className="rounded-xl border border-border p-3">
                <p className="mb-2 text-xs text-muted-foreground">{t("support.reportPrompt")}</p>
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={3}
                  placeholder={t("support.reportPlaceholder")}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setReporting(false)}>
                    {t("support.cancel")}
                  </Button>
                  <Button size="sm" onClick={submitReport}>{t("support.reportSubmit")}</Button>
                </div>
              </div>
            )}
          </div>

          <footer className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                rows={1}
                placeholder={t("support.placeholder")}
                className="min-h-[2.5rem] resize-none"
              />
              <Button size="icon" onClick={() => send(input)} disabled={sending || !input.trim()} aria-label={t("support.send")}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <button type="button" onClick={startNew} className="hover:text-foreground">
                {t("support.newConversation")}
              </button>
              {conversationId && (
                <button
                  type="button"
                  onClick={() => setReporting(true)}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Flag className="h-3 w-3" />
                  {t("support.report")}
                </button>
              )}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

declare const __APP_VERSION__: string | undefined;
