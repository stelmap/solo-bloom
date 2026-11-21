# Solo .Bizz — мовні сторінки, SEO та прев’ю

## Статус
Реалізація перевірена у прев’ю; не опублікована. Завершення на виробничому домені не підтверджено.

## Спосіб відображення
Під час публікації Vite формує 7 HTML-файлів із наявного RedesignedLanding: кореневу англійську сторінку й шість мовних сторінок. Текст, заголовки, canonical, hreflang, Open Graph, Twitter та JSON-LD містяться в початковому HTML. Після завантаження програми статичний знімок замінюється тією самою інтерактивною сторінкою. Немає дублювання дизайну, приватних знімків або змін оплат. Публічні відгуки й приклад профілю, як раніше, завантажуються браузером через дозволені публічні запити.

Коренева / — фіксована англійська версія з canonical /en/; x-default — /. Юридичні сторінки та їх переклади не змінювалися.

## Мови, адреси й метадані

### uk
- Адреса після публікації: https://solo-bizz.com/uk/
- Title: Solo .Bizz — Усе необхідне для вашої приватної практики — в одній системі.
- Description: Календар, клієнти, онлайн-запис, оплати та публічний профіль для приватної практики. Solo від €12/місяць, Pro €24/місяць. 14 днів безплатно без картки.
- Прев’ю: https://solo-bizz.com/__l5e/assets-v1/e26a653a-2f4c-4a5c-88a0-45273e858583/brand-share-uk.jpg
- Зображення: 1200 × 630; 64,502 байт; HTTPS 200.

### en
- Адреса після публікації: https://solo-bizz.com/en/
- Title: Solo .Bizz — Everything you need for your private practice — in one system.
- Description: Calendar, clients, online booking, payments and a public profile for your private practice. Solo €12/month, Pro €24/month. Try 14 days free without a card.
- Прев’ю: https://solo-bizz.com/__l5e/assets-v1/a694aa13-6421-4492-a6e8-c480588e6b1f/brand-share-en.jpg
- Зображення: 1200 × 630; 60,833 байт; HTTPS 200.

### pl
- Адреса після публікації: https://solo-bizz.com/pl/
- Title: Solo .Bizz — Wszystko, czego potrzebujesz w prywatnej praktyce — w jednym systemie.
- Description: Kalendarz, klienci, rezerwacje online, płatności i profil publiczny dla prywatnej praktyki. Solo 12 €/mies., Pro 24 €/mies. 14 dni bezpłatnie bez karty.
- Прев’ю: https://solo-bizz.com/__l5e/assets-v1/6f62236f-ff33-4481-aad9-65e0b8ed79c6/brand-share-pl.jpg
- Зображення: 1200 × 630; 65,911 байт; HTTPS 200.

### de
- Адреса після публікації: https://solo-bizz.com/de/
- Title: Solo .Bizz — Alles, was Sie für Ihre Privatpraxis brauchen – in einem System.
- Description: Kalender, Klienten, Online-Buchung, Zahlungen und ein öffentliches Profil für Ihre Praxis. Solo 12 €/Monat, Pro 24 €/Monat. 14 Tage kostenlos ohne Karte.
- Прев’ю: https://solo-bizz.com/__l5e/assets-v1/11bf5b0a-efb9-4874-8a70-1ebf29335164/brand-share-de.jpg
- Зображення: 1200 × 630; 59,420 байт; HTTPS 200.

### fr
- Адреса після публікації: https://solo-bizz.com/fr/
- Title: Solo .Bizz — Tout le nécessaire pour votre pratique privée — dans un seul système.
- Description: Agenda, clients, réservation en ligne, paiements et profil public pour votre cabinet. Solo 12 €/mois, Pro 24 €/mois. 14 jours gratuits sans carte.
- Прев’ю: https://solo-bizz.com/__l5e/assets-v1/c00b3029-56a7-4b1a-b664-fe370d574284/brand-share-fr.jpg
- Зображення: 1200 × 630; 65,459 байт; HTTPS 200.

### ru
- Адреса після публікації: https://solo-bizz.com/ru/
- Title: Solo .Bizz — Всё необходимое для вашей частной практики — в одной системе.
- Description: Календарь, клиенты, онлайн-запись, оплаты и публичный профиль для частной практики. Solo €12/месяц, Pro €24/месяц. 14 дней бесплатно без карты.
- Прев’ю: https://solo-bizz.com/__l5e/assets-v1/cd96dbb9-c0b2-4b50-a35f-fbf6b3d0acf2/brand-share-ru.jpg
- Зображення: 1200 × 630; 65,293 байт; HTTPS 200.

## Перевірки TC-01–TC-09
| Тест | Результат |
|---|---|
| TC-01 однаковий дизайн | Шість мов у браузері перевірено; використовується одна сторінка. Порівняння з поточною опублікованою версією не повністю виконано. |
| TC-02 початкові метадані | Пройдено для шести мов без JavaScript у прев’ю; тест формування всіх 7 production-файлів пройдено. Перевірка live після публікації очікується. |
| TC-03 соціальні прев’ю | Шість нових зображень доступні через production HTTPS, 1200×630; правильні OG/Twitter у готовому HTML. Facebook/LinkedIn/Telegram повторні scrape не виконано до публікації. |
| TC-04 доступність роботам | Шість URL HTTP 200 у прев’ю, текст доступний без JavaScript, немає noindex. Опубліковані мовні URL ще віддають стару SPA; це не підтверджує завершення. |
| TC-05 старі URL | Браузер /?lang=de&utm_campaign=test#how переходить на /de/?utm_campaign=test#how. HTTP 301/308 НЕ реалізовано: Lovable static hosting не підтримує query-aware redirect правила. Без JavaScript старий query URL віддаватиме English fallback. |
| TC-06 sitemap/hreflang | Усі шість мов, взаємні альтернативи, x-default; збережені legal/public therapist URLs; внутрішні URL відсутні. robots дозволяє маркетингові сторінки й містить production Sitemap. |
| TC-07 перемикач | UK → PL збережено utm_source і #pricing, переклад та URL оновлюються. |
| TC-08 мобільність | Українська 390×844 і 768×1024; усі шість мов desktop 1280×1800; без горизонтального переповнення в перевірених мобільних розмірах. |
| TC-09 регресії | 24 автоматичні тести: URL, OAuth виключення, ціни, формування HTML; auth сторінка відкривається без статичного дубля; помилок виконання немає. Реальна реєстрація, підтвердження, платіж і signed-in навігація не виконувалися. |

## Залишилося
1. Потрібен дозвіл на публікацію й перевірка реальних HTML-відповідей /uk/ тощо на solo-bizz.com, зокрема чи directory index обирається hosting layer перед SPA fallback.
2. Для строгих HTTP 301/308 зі старих query URL потрібна query-aware серверна маршрутизація (не Netlify _redirects). До її налаштування старі query social links не мають повністю локалізованої initial response. Використовуйте нові мовні адреси після публікації.
3. Після публікації повторно запросити scrape у Facebook Sharing Debugger/LinkedIn Post Inspector; фактичне кешування не перевірене.
4. Search Console: повторне зчитування sitemap та URL inspection після публікації не виконано. Індексація не гарантується.
5. Німецькі юридичні документи залишаються погодженим English fallback; робочі сторінки й дані не змінювалися.

Завдання не позначене повністю завершеним: production-перевірка й HTTP permanent redirects залишаються відкритими.
