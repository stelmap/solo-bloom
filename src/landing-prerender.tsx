import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import RedesignedLanding from './components/landing/RedesignedLanding';
import { PUBLIC_LANGUAGES } from './lib/publicLanguage';
import { MAX_PRERENDER_PAGES } from './lib/landingRoutes';

/** Build-time rendering only: no effects, sessions, private reads or profile snapshots. */
export function renderLanding(url: string) {
  const context: { helmet?: HelmetServerState } = {};
  const body = renderToString(<HelmetProvider context={context}><MemoryRouter initialEntries={[url]}><RedesignedLanding /></MemoryRouter></HelmetProvider>);
  const helmet = context.helmet;
  if (!helmet) throw new Error('Landing metadata was not rendered');
  return { body, head: helmet.title.toString() + helmet.meta.toString() + helmet.link.toString() + helmet.script.toString(), htmlAttributes: helmet.htmlAttributes.toString() };
}

export const prerenderPaths = ['/', ...PUBLIC_LANGUAGES.map(lang => `/${lang}/`)];
if (prerenderPaths.length > MAX_PRERENDER_PAGES) throw new Error('Landing prerender page cap exceeded');