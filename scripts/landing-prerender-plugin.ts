import { createServer, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import path from 'node:path';

type RenderedLanding = { body: string; head: string; htmlAttributes: string };
type LandingRenderer = { renderLanding(url: string): RenderedLanding; prerenderPaths: string[] };

export function landingDocument(template: string, rendered: RenderedLanding): string {
  // Replace route-owned metadata, preserving charset, verification, favicons and built scripts/styles.
  return template
    .replace(/<html\b[^>]*>/i, `<html ${rendered.htmlAttributes}>`)
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*data-rh="true"[^>]*>/gi, '')
    .replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/gi, '')
    .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace('</head>', `${rendered.head}<style>body:has(#landing-prerender) #root{display:none}</style></head>`)
    .replace('<div id="root"></div>', `<div id="landing-prerender">${rendered.body}</div><div id="root"></div>`);
}

/** Emit seven actual HTML files; Lovable's file-first hosting serves these before SPA fallback. */
export function landingPrerenderPlugin(): Plugin {
  let dev: ViteDevServer | undefined;
  let root = process.cwd();
  let mode = 'production';
  return {
    name: 'solo-landing-prerender',
    enforce: 'post',
    configResolved(config) { root = config.root; mode = config.mode; },
    configureServer(server) { dev = server; },
    transformIndexHtml: {
      order: 'post',
      async handler(html, ctx) {
        if (!dev) return html;
        const url = new URL(ctx.originalUrl ?? ctx.path, 'http://localhost');
        if (!/^\/(?:uk\/?|en\/?|pl\/?|de\/?|fr\/?|ru\/?)?$/.test(url.pathname)) return html;
        const renderer = await dev.ssrLoadModule('/src/landing-prerender.tsx') as LandingRenderer;
        return landingDocument(html, renderer.renderLanding(url.pathname + url.search));
      },
    },
    async generateBundle(_, bundle) {
      const entry = bundle['index.html'];
      if (!entry || entry.type !== 'asset') throw new Error('Missing landing HTML build template');
      const template = String(entry.source);
      const server = await createServer({
        configFile: false, root, mode,
        // SSR can run with NODE_ENV=production during a development-mode build.
        // Always emit production-compatible JSX, never React's dev-only jsxDEV.
        esbuild: { jsx: 'automatic', jsxDev: false },
        server: { middlewareMode: true, hmr: false }, appType: 'custom',
        resolve: { alias: { '@': path.resolve(root, 'src') }, dedupe: ['react', 'react-dom', 'react/jsx-runtime'] },
        define: Object.fromEntries(Object.entries(loadEnv(mode, root, 'VITE_')).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
      });
      try {
        const renderer = await server.ssrLoadModule('/src/landing-prerender.tsx') as LandingRenderer;
        for (const url of renderer.prerenderPaths) {
          const source = landingDocument(template, renderer.renderLanding(url));
          if (url === '/') entry.source = source;
          else this.emitFile({ type: 'asset', fileName: `${url.slice(1)}index.html`, source });
        }
      } finally { await server.close(); }
    },
  };
}