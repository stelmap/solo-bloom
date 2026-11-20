import { Link } from 'react-router-dom';
import { ArrowRight, Search, GraduationCap, Share2, CalendarCheck, MapPin, Award, CircleUserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppLanguage } from '@/i18n/translations';
import { PublishedProfilePreview } from './PublishedProfilePreview';

type T = Record<'tag'|'title'|'sub'|'b1t'|'b1'|'b2t'|'b2'|'b3t'|'b3'|'b4t'|'b4'|'cta'|'example'|'note'|'pName'|'pTitle'|'pCity'|'pEdu'|'pEduText'|'pCerts'|'pBook'|'pAbout', string>;
const COPY: Record<AppLanguage, T> = {
  uk: { tag: 'Новинка · Профіль спеціаліста', title: 'Нарешті ваші клієнти зможуть вас знайти!', sub: 'Створіть власну професійну сторінку в інтернеті. Розкажіть про себе, покажіть освіту, дипломи та сертифікати — і дозвольте новим клієнтам знайти вас та записатися на консультацію.',
    b1t: 'Вас знаходять у Google та AI-пошуку', b1: 'Ваша професійна сторінка може з’являтися в результатах Google, ChatGPT та інших пошукових сервісів.', b2t: 'Покажіть свою експертність', b2: 'Розкажіть про освіту, досвід, спеціалізацію, додайте дипломи та сертифікати.', b3t: 'Діліться своєю сторінкою', b3: 'Розміщуйте персональне посилання в Instagram, Facebook, LinkedIn та інших соціальних мережах.', b4t: 'Отримуйте нові записи', b4: 'Клієнти можуть одразу забронювати консультацію через вашу сторінку.',
    cta: 'Створити свою сторінку', example: 'Переглянути приклад', note: 'Поява в пошуку залежить від Google, ChatGPT та інших сервісів і не гарантується.', pName: 'Анна Коваль', pTitle: 'Психотерапевтка, КПТ', pCity: 'Львів · онлайн', pAbout: 'Працюю з тривогою, вигоранням і стосунками. Понад 8 років практики.', pEdu: 'Освіта', pEduText: 'ЛНУ ім. Франка, клінічна психологія', pCerts: 'Дипломи та сертифікати', pBook: 'Записатися на зустріч' },
  en: { tag: 'New · Specialist profile', title: 'Finally, your clients can find you!', sub: 'Create your own professional page online. Tell people about yourself, show your education, diplomas and certificates — and let new clients find you and book a consultation.',
    b1t: 'Get found in Google and AI search', b1: 'Your professional page can appear in results from Google, ChatGPT and other search services.', b2t: 'Show your expertise', b2: 'Share your education, experience and specialisation, and add diplomas and certificates.', b3t: 'Share your page', b3: 'Put your personal link on Instagram, Facebook, LinkedIn and other social networks.', b4t: 'Get new bookings', b4: 'Clients can book a consultation straight from your page.',
    cta: 'Create your page', example: 'See an example', note: 'Search visibility depends on Google, ChatGPT and other services and is not guaranteed.', pName: 'Anna Koval', pTitle: 'Psychotherapist, CBT', pCity: 'Lviv · online', pAbout: 'I work with anxiety, burnout and relationships. 8+ years of practice.', pEdu: 'Education', pEduText: 'Lviv University, clinical psychology', pCerts: 'Diplomas & certificates', pBook: 'Book a meeting' },
  pl: { tag: 'Nowość · Profil specjalisty', title: 'Wreszcie klienci mogą Cię znaleźć!', sub: 'Stwórz własną profesjonalną stronę w internecie. Opowiedz o sobie, pokaż wykształcenie, dyplomy i certyfikaty — i pozwól nowym klientom znaleźć Cię i umówić konsultację.',
    b1t: 'Znajdą Cię w Google i wyszukiwarkach AI', b1: 'Twoja strona może pojawiać się w wynikach Google, ChatGPT i innych wyszukiwarek.', b2t: 'Pokaż swoją wiedzę', b2: 'Opisz wykształcenie, doświadczenie i specjalizację, dodaj dyplomy i certyfikaty.', b3t: 'Udostępniaj swoją stronę', b3: 'Umieść osobisty link na Instagramie, Facebooku, LinkedIn i w innych sieciach.', b4t: 'Zdobywaj nowe rezerwacje', b4: 'Klienci mogą od razu umówić konsultację przez Twoją stronę.',
    cta: 'Stwórz swoją stronę', example: 'Zobacz przykład', note: 'Widoczność w wyszukiwarkach zależy od Google, ChatGPT i innych usług i nie jest gwarantowana.', pName: 'Anna Kowal', pTitle: 'Psychoterapeutka, CBT', pCity: 'Kraków · online', pAbout: 'Pracuję z lękiem, wypaleniem i relacjami. Ponad 8 lat praktyki.', pEdu: 'Wykształcenie', pEduText: 'UJ, psychologia kliniczna', pCerts: 'Dyplomy i certyfikaty', pBook: 'Umów spotkanie' },
  de: { tag: 'Neu · Fachprofil', title: 'Endlich können Ihre Klienten Sie finden!', sub: 'Erstellen Sie Ihre eigene professionelle Seite im Internet. Erzählen Sie von sich, zeigen Sie Ausbildung, Diplome und Zertifikate — und lassen Sie neue Klienten Sie finden und eine Beratung buchen.',
    b1t: 'Gefunden werden in Google und KI-Suche', b1: 'Ihre Seite kann in Ergebnissen von Google, ChatGPT und anderen Suchdiensten erscheinen.', b2t: 'Zeigen Sie Ihre Expertise', b2: 'Beschreiben Sie Ausbildung, Erfahrung und Schwerpunkte, fügen Sie Diplome und Zertifikate hinzu.', b3t: 'Teilen Sie Ihre Seite', b3: 'Platzieren Sie Ihren persönlichen Link auf Instagram, Facebook, LinkedIn und anderen Netzwerken.', b4t: 'Neue Buchungen erhalten', b4: 'Klienten können direkt über Ihre Seite einen Termin buchen.',
    cta: 'Eigene Seite erstellen', example: 'Beispiel ansehen', note: 'Die Sichtbarkeit in Suchdiensten hängt von Google, ChatGPT und anderen ab und ist nicht garantiert.', pName: 'Anna Koval', pTitle: 'Psychotherapeutin, KVT', pCity: 'Berlin · online', pAbout: 'Ich arbeite mit Angst, Burnout und Beziehungen. Über 8 Jahre Praxis.', pEdu: 'Ausbildung', pEduText: 'Universität Lwiw, klinische Psychologie', pCerts: 'Diplome & Zertifikate', pBook: 'Termin buchen' },
  fr: { tag: 'Nouveau · Profil professionnel', title: 'Enfin, vos clients peuvent vous trouver !', sub: 'Créez votre propre page professionnelle en ligne. Présentez-vous, montrez votre formation, vos diplômes et certificats — et laissez de nouveaux clients vous trouver et réserver une consultation.',
    b1t: 'Trouvé·e sur Google et la recherche IA', b1: 'Votre page peut apparaître dans les résultats de Google, ChatGPT et d’autres services de recherche.', b2t: 'Montrez votre expertise', b2: 'Présentez formation, expérience et spécialités, ajoutez diplômes et certificats.', b3t: 'Partagez votre page', b3: 'Publiez votre lien personnel sur Instagram, Facebook, LinkedIn et d’autres réseaux.', b4t: 'Recevez de nouvelles réservations', b4: 'Les clients peuvent réserver une consultation directement depuis votre page.',
    cta: 'Créer ma page', example: 'Voir un exemple', note: 'La visibilité dans les moteurs dépend de Google, ChatGPT et d’autres services et n’est pas garantie.', pName: 'Anna Koval', pTitle: 'Psychothérapeute, TCC', pCity: 'Lyon · en ligne', pAbout: 'J’accompagne l’anxiété, l’épuisement et les relations. Plus de 8 ans de pratique.', pEdu: 'Formation', pEduText: 'Université de Lviv, psychologie clinique', pCerts: 'Diplômes et certificats', pBook: 'Réserver un rendez-vous' },
  ru: { tag: 'Новинка · Профиль специалиста', title: 'Наконец ваши клиенты смогут вас найти!', sub: 'Создайте собственную профессиональную страницу в интернете. Расскажите о себе, покажите образование, дипломы и сертификаты — и позвольте новым клиентам найти вас и записаться на консультацию.',
    b1t: 'Вас находят в Google и AI-поиске', b1: 'Ваша страница может появляться в результатах Google, ChatGPT и других поисковых сервисов.', b2t: 'Покажите свою экспертность', b2: 'Расскажите об образовании, опыте, специализации, добавьте дипломы и сертификаты.', b3t: 'Делитесь своей страницей', b3: 'Размещайте персональную ссылку в Instagram, Facebook, LinkedIn и других соцсетях.', b4t: 'Получайте новые записи', b4: 'Клиенты могут сразу забронировать консультацию через вашу страницу.',
    cta: 'Создать свою страницу', example: 'Посмотреть пример', note: 'Появление в поиске зависит от Google, ChatGPT и других сервисов и не гарантируется.', pName: 'Анна Коваль', pTitle: 'Психотерапевт, КПТ', pCity: 'Львов · онлайн', pAbout: 'Работаю с тревогой, выгоранием и отношениями. Более 8 лет практики.', pEdu: 'Образование', pEduText: 'ЛНУ им. Франко, клиническая психология', pCerts: 'Дипломы и сертификаты', pBook: 'Записаться на встречу' },
};

export const EXAMPLE_PROFILE_URL = '/therapist/olga-stelmakh';

export function ProfilePromoSection({ lang, onCta }: { lang: AppLanguage; onCta?: (cta: string) => void }) {
  const t = COPY[lang] ?? COPY.en;
  const items = [[Search, t.b1t, t.b1], [GraduationCap, t.b2t, t.b2], [Share2, t.b3t, t.b3], [CalendarCheck, t.b4t, t.b4]] as const;
  return (
    <section id="profile" className="scroll-mt-24 bg-muted/40 py-12 md:py-16">
      <div className="offer-container grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase text-primary">{t.tag}</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">{t.title}</h2>
          <p className="mt-4 text-muted-foreground">{t.sub}</p>
          <ul className="mt-8 space-y-5">
            {items.map(([Icon, h, b]) => (
              <li key={h} className="flex gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span><div><h3 className="font-semibold">{h}</h3><p className="mt-1 text-sm text-muted-foreground">{b}</p></div></li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-lg"><Link to="/auth?mode=signup&trial=1" onClick={() => onCta?.('profile_create')}>{t.cta}<ArrowRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-lg"><a href={`${EXAMPLE_PROFILE_URL}?lang=${lang}`} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.('profile_example')}>{t.example}</a></Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t.note}</p>
        </div>
        <PublishedProfilePreview lang={lang} />
      </div>
    </section>
  );
}
