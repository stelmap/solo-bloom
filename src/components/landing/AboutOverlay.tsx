import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BrandName } from "@/components/BrandName";

/**
 * Full-screen editorial "About / Founder story" overlay rendered above the
 * landing page. The page underneath keeps its scroll position: we only lock
 * body scrolling while the overlay is open.
 */
export function AboutOverlay({
  open,
  onClose,
  scrollY = 0,
}: {
  open: boolean;
  onClose: () => void;
  scrollY?: number;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Freeze the page behind the overlay and restore the exact scroll on close.
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      document.body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open, onClose, scrollY]);



  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="About Solo .Bizz"
      className="fixed inset-0 z-[100] min-h-[100dvh] overflow-y-auto bg-background motion-safe:animate-fade-in"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto w-full max-w-[1100px] px-5 py-10 sm:px-8 sm:py-14">
        {/* Hero banner */}
        <section className="relative overflow-hidden rounded-3xl bg-secondary px-6 py-12 text-secondary-foreground sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10" aria-hidden />
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">ПРО МЕНЕ</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Мій шлях до <BrandName accentClassName="text-primary" />
            </h1>
            <p className="mt-5 text-base leading-relaxed text-secondary-foreground/80 sm:text-lg">
              Це історія про те, як досвід в IT, любов до людей і реальність приватної практики привели до створення{" "}
              <BrandName />.
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Як це було</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Від IT до психології. Від хаосу в записах до власного продукту.
          </p>

          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <li key={step.title}>
                <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-primary">
                    <step.icon className="h-6 w-6" />
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground lg:mt-4">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{step.title}</h3>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{step.body}</div>
              </li>
            ))}
          </ol>
        </section>

        {/* Today */}
        <section className="mt-14 rounded-2xl border border-border bg-muted/40 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card text-primary">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground sm:text-xl">
                Сьогодні <BrandName /> — це вже не тільки система для психологів.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Це система для спеціалістів, які працюють із клієнтами, своїм часом і власними фінансами та хочуть
                ставитися до своєї практики як до справжнього бізнесу — але без зайвої складності.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & vision */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Sprout className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">НАША МІСІЯ</p>
                <p className="mt-3 text-xl font-bold leading-snug text-foreground sm:text-2xl">
                  «Зробити малий бізнес зрозумілим, стабільним і прогнозованим».
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Ми хочемо, щоб спеціалісту не потрібно було бути бухгалтером, фінансистом чи проходити десятки
              бізнес-курсів, щоб просто розуміти, що відбувається з його практикою.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                <Eye className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">НАША ВІЗІЯ</p>
                <p className="mt-3 text-xl font-bold leading-snug text-foreground sm:text-2xl">
                  «Приватна практика — це не просто календар із клієнтами. Це маленький бізнес». І ним можна управляти
                  легко.
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Наша візія — створити продукт, у якому будь-який спеціаліст зможе відкрити <BrandName /> і одразу
              зрозуміти: що відбувається з моїм бізнесом, скільки я заробляю, де втрачаю гроші, наскільки я завантажена
              і що мені робити далі.
            </p>
          </section>
        </div>

        {/* Quote */}
        <figure className="mt-14 border-l-2 border-primary pl-6">
          <Quote className="h-8 w-8 text-primary/40" aria-hidden />
          <blockquote className="mt-3 text-xl font-medium leading-snug text-foreground sm:text-2xl">
            Ми хочемо, щоб управління власною практикою перестало бути ще однією складною професією і стало природною
            частиною роботи.
          </blockquote>
          <figcaption className="mt-5 text-sm text-muted-foreground">— Ольга Стельмах</figcaption>
        </figure>

        {/* CTA */}
        <section className="mt-14 rounded-3xl bg-muted/50 p-6 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-md">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Хочете спробувати?</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Приєднуйтесь до <BrandName /> і відчуйте, як може виглядати проста і зрозуміла система для вашої
                практики.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Link
                to="/auth?mode=signup"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-md transition-colors hover:bg-[hsl(var(--primary-hover))]"
              >
                Спробувати безкоштовно <ArrowRight className="h-4 w-4" />
              </Link>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {["Без банківської картки", "Пару хвилин на реєстрацію", "Підтримка на email"].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

    </div>,
    document.body,
  );
}

export default AboutOverlay;
