import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BrandName } from "@/components/BrandName";

/**
 * Full-screen editorial "About / Founder story" overlay rendered above the
 * landing page. The page underneath keeps its scroll position: we only lock
 * body scrolling while the overlay is open.
 */
export function AboutOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

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

      <div className="mx-auto w-full max-w-[900px] px-5 py-14 sm:px-8 sm:py-20">
        <BrandName className="text-2xl font-bold text-foreground sm:text-3xl" />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          ABOUT SOLO .BIZZ
        </p>

        <h1 className="mt-10 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Про мене</h1>
        <div className="mt-6 space-y-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          <p className="text-foreground">
            Привіт! Мене звати Ольга Стельмах, я засновниця <BrandName className="font-semibold" />.
          </p>
          <p>
            Майже 15 років я працювала в IT. Але в якийсь момент зрозуміла, що є інша частина мене — та, яка хоче
            працювати з людьми й допомагати їм. Так у моєму житті з’явилася психологія і власна приватна практика.
          </p>
          <p>
            І разом із практикою дуже швидко з’явилася реальність малого бізнесу: записи клієнтів, календар, оплати,
            фінанси, переноси, борги, нотатки. Я плутала записи, могла щось забути, губила частину доходу і постійно
            тримала занадто багато інформації в голові.
          </p>
          <p>В якийсь момент я сказала собі:</p>
          <blockquote className="border-l-2 border-primary pl-5 text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            «Досить, так більше не може працювати».
          </blockquote>
          <p>І тоді моя перша професія допомогла моїй другій.</p>
          <p>
            Так з’явився перший прототип <BrandName className="font-semibold" />.
          </p>
          <p>
            Після цього я почала багато говорити з колегами та іншими спеціалістами, які ведуть приватну практику:
            слухала, як вони працюють, що їм заважає, де вони втрачають час і гроші, чого їм не вистачає.
          </p>
          <p>
            На основі цих розмов, ідей і десятків фідбеків <BrandName className="font-semibold" /> поступово став
            продуктом, яким він є сьогодні.
          </p>
          <p>
            Сьогодні <BrandName className="font-semibold" /> — це вже не тільки система для психологів.
          </p>
          <p>
            Це система для спеціалістів, які працюють із клієнтами, своїм часом і власними фінансами та хочуть
            ставитися до своєї практики як до справжнього бізнесу — але без зайвої складності.
          </p>
        </div>

        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Наша місія</h2>
          <p className="mt-5 text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
            «Зробити малий бізнес зрозумілим, стабільним і прогнозованим».
          </p>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            <p>
              Ми хочемо, щоб спеціалісту не потрібно було бути бухгалтером, фінансистом чи проходити десятки
              бізнес-курсів, щоб просто розуміти, що відбувається з його практикою.
            </p>
            <p>
              <BrandName className="font-semibold" /> має допомагати керувати клієнтами, часом і грошима просто — в
              одному місці, зрозумілою мовою.
            </p>
          </div>
        </section>

        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Наша візія</h2>
          <blockquote className="mt-5 border-l-2 border-primary pl-5 text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            «Приватна практика — це не просто календар із клієнтами. Це маленький бізнес». І ним можна управляти легко.
          </blockquote>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            <p>
              Для цього не потрібно ставати експертом у фінансах, будувати складні Excel-таблиці або вчитися
              користуватися десятьма різними системами.
            </p>
            <p>
              Наша візія — створити продукт, у якому будь-який спеціаліст зможе відкрити{" "}
              <BrandName className="font-semibold" /> і одразу зрозуміти: що відбувається з моїм бізнесом, скільки я
              заробляю, де втрачаю гроші, наскільки я завантажена і що мені робити далі.
            </p>
            <p>
              Ми хочемо, щоб управління власною практикою перестало бути ще однією складною професією і стало
              природною частиною роботи.
            </p>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}

export default AboutOverlay;
