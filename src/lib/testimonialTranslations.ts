import type { AppLanguage } from '@/i18n/translations';

const original = `Я дуже задоволена SoloBizz, хоча, чесно кажучи, спочатку мені було трохи страшно переходити на онлайн-запис клієнтів.

Я звикла, що клієнти пишуть мені особисто, ми узгоджуємо час, переносимо зустрічі, домовляємося. І мені здавалося, що якщо дати людям можливість записуватися самостійно, то я втрачу контроль над своїм графіком. Дуже переживала, що будуть якісь накладки, що я не зможу нормально організувати свій час.

Але коли спробувала, виявилося, що це неймовірно зручно. Ще одна річ, яка мені дуже подобається, — це організація самої практики. Мені більше не потрібно по кілька разів вносити ту саму інформацію в різні місця. Провела сесію, закрила її в календарі — і вже бачу, скільки заробила, які оплати отримала, а які ще очікую.

Щоправда, був і один не дуже приємний момент 😅 Коли я вперше побачила загальну суму заборгованостей клієнтів, то була, м'яко кажучи, здивована. Коли все це десь у переписках чи в голові, воно не виглядає настільки серйозно.`;

const bodies: Record<AppLanguage, string> = {
  uk: original,
  en: `I'm very happy with Solo .Bizz, although, to be honest, I was a little nervous at first about switching to online client bookings.

I was used to clients messaging me personally: we would agree on a time, reschedule meetings and make arrangements. I felt that letting people book for themselves would mean losing control of my schedule. I really worried about scheduling conflicts and not being able to organize my time properly.

But when I tried it, I found it incredibly convenient. Another thing I really like is how it organizes my practice. I no longer need to enter the same information several times in different places. I hold a meeting, close it in the calendar, and can already see how much I've earned, which payments I've received and which I'm still waiting for.

There was one not-so-pleasant moment, though 😅 When I first saw the total amount clients owed, I was, to put it mildly, surprised. When it's all scattered across messages or in your head, it doesn't seem quite so serious.`,
  de: `Ich bin sehr zufrieden mit Solo .Bizz, obwohl ich ehrlich gesagt anfangs etwas Angst hatte, auf die Online-Terminbuchung für Klienten umzusteigen.

Ich war es gewohnt, dass Klienten mir persönlich schreiben: Wir vereinbaren eine Uhrzeit, verschieben Termine und sprechen uns ab. Ich dachte, wenn ich Menschen selbst buchen lasse, verliere ich die Kontrolle über meinen Kalender. Ich hatte große Sorge vor Überschneidungen und davor, meine Zeit nicht mehr richtig organisieren zu können.

Als ich es ausprobiert habe, stellte sich jedoch heraus, dass es unglaublich praktisch ist. Was mir außerdem sehr gefällt, ist die Organisation meiner Praxis. Ich muss dieselben Informationen nicht mehr mehrmals an verschiedenen Stellen eintragen. Ich halte einen Termin ab, schließe ihn im Kalender ab und sehe sofort, wie viel ich verdient habe, welche Zahlungen eingegangen sind und auf welche ich noch warte.

Einen weniger angenehmen Moment gab es allerdings auch 😅 Als ich zum ersten Mal die Gesamtsumme der offenen Beträge meiner Klienten sah, war ich, gelinde gesagt, überrascht. Wenn das alles irgendwo in Nachrichten oder im Kopf steckt, wirkt es nicht ganz so ernst.`,
  pl: `Jestem bardzo zadowolona z Solo .Bizz, choć szczerze mówiąc, na początku trochę bałam się przejścia na rezerwacje klientów online.

Przywykłam do tego, że klienci piszą do mnie osobiście: ustalamy godzinę, przekładamy spotkania i uzgadniamy szczegóły. Wydawało mi się, że jeśli pozwolę ludziom samodzielnie rezerwować terminy, stracę kontrolę nad swoim grafikiem. Bardzo obawiałam się nakładających się terminów i tego, że nie będę mogła dobrze zorganizować swojego czasu.

Ale kiedy spróbowałam, okazało się, że to niesamowicie wygodne. Bardzo podoba mi się również organizacja samej praktyki. Nie muszę już kilka razy wpisywać tych samych informacji w różnych miejscach. Prowadzę spotkanie, zamykam je w kalendarzu i od razu widzę, ile zarobiłam, które płatności otrzymałam, a na które jeszcze czekam.

Był jednak też jeden mniej przyjemny moment 😅 Kiedy po raz pierwszy zobaczyłam łączną kwotę zaległości klientów, byłam, delikatnie mówiąc, zaskoczona. Gdy wszystko jest gdzieś w wiadomościach albo w głowie, nie wygląda to aż tak poważnie.`,
  fr: `Je suis très satisfaite de Solo .Bizz, même si, honnêtement, j'avais un peu peur au début de passer à la réservation en ligne pour mes clients.

J'avais l'habitude que les clients m'écrivent personnellement : nous convenions d'une heure, déplacions les rendez-vous et nous organisions ensemble. J'avais l'impression qu'en laissant les gens réserver eux-mêmes, je perdrais le contrôle de mon agenda. Je craignais vraiment les chevauchements de rendez-vous et de ne plus pouvoir bien organiser mon temps.

Mais lorsque j'ai essayé, j'ai découvert que c'était incroyablement pratique. Une autre chose que j'apprécie beaucoup, c'est l'organisation de mon activité. Je n'ai plus besoin de saisir plusieurs fois les mêmes informations à différents endroits. Je termine un rendez-vous, je le clôture dans le calendrier et je vois immédiatement combien j'ai gagné, quels paiements j'ai reçus et lesquels j'attends encore.

Il y a tout de même eu un moment moins agréable 😅 Lorsque j'ai vu pour la première fois le montant total des impayés de mes clients, j'ai été, c'est le moins qu'on puisse dire, surprise. Quand tout cela est dispersé dans des messages ou dans sa tête, cela ne paraît pas aussi sérieux.`,
  ru: `Я очень довольна Solo .Bizz, хотя, честно говоря, сначала мне было немного страшно переходить на онлайн-запись клиентов.

Я привыкла, что клиенты пишут мне лично: мы согласовываем время, переносим встречи, договариваемся. И мне казалось, что если дать людям возможность записываться самостоятельно, то я потеряю контроль над своим расписанием. Очень переживала, что будут какие-то накладки, что я не смогу нормально организовать своё время.

Но когда попробовала, оказалось, что это невероятно удобно. Ещё одна вещь, которая мне очень нравится, — это организация самой практики. Мне больше не нужно по несколько раз вносить одну и ту же информацию в разные места. Провела встречу, закрыла её в календаре — и уже вижу, сколько заработала, какие оплаты получила, а какие ещё ожидаю.

Правда, был и один не очень приятный момент 😅 Когда я впервые увидела общую сумму задолженностей клиентов, то была, мягко говоря, удивлена. Когда всё это где-то в переписках или в голове, оно не выглядит настолько серьёзно.`,
};

const professions: Record<AppLanguage, string> = {
  uk: 'Психолог', en: 'Psychologist', de: 'Psychologin', pl: 'Psycholożka', fr: 'Psychologue', ru: 'Психолог',
};

/** Only localize a known published review while its source text remains unchanged. */
export function translatedTestimonial(review: { id: string; body: string; profession: string }, language: string) {
  if (review.id !== 'f79bd406-ff23-4dfc-97b6-4541e6ee53fa' || review.body !== original || !(language in bodies)) {
    return { body: review.body, profession: review.profession };
  }
  const lang = language as AppLanguage;
  return { body: bodies[lang], profession: review.profession === 'Психолог' ? professions[lang] : review.profession };
}