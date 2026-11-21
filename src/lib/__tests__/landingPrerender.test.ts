// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { landingPrerenderPlugin } from '../../../scripts/landing-prerender-plugin';

describe('production landing emission', () => {
  it('emits only the root plus six public languages and keeps application scripts', async () => {
    const plugin = landingPrerenderPlugin();
    const entry = { type: 'asset', source: '<html lang="en"><head><meta charset="UTF-8"><title>fallback</title><meta data-rh="true" name="description" content="fallback"></head><body><div id="root"></div><script type="module" src="/assets/application.js"></script></body></html>' };
    const emitted: {fileName: string; source: string}[] = [];
    const generate = plugin.generateBundle;
    if (typeof generate !== 'function') throw new Error('Missing production generator');
    await generate.call({ emitFile: (file: {fileName: string; source: string}) => { emitted.push(file); return file.fileName; } } as never, {} as never, { 'index.html': entry } as never, false);
    expect(emitted.map(x => x.fileName)).toEqual(['uk/index.html', 'en/index.html', 'pl/index.html', 'de/index.html', 'fr/index.html', 'ru/index.html']);
    for (const file of emitted) {
      const lang = file.fileName.split('/')[0];
      expect(file.source).toContain(`lang="${lang}"`);
      expect(file.source).toContain(`https://solo-bizz.com/${lang}/`);
      expect(file.source).toContain('id="landing-prerender"');
      expect(file.source).toContain('/assets/application.js');
      expect((file.source.match(/<h1\b/g) ?? []).length).toBe(1);
      expect((file.source.match(/<title\b/g) ?? []).length).toBe(1);
    }
    expect(entry.source).toContain('https://solo-bizz.com/en/');
    expect(emitted.some(x => x.fileName.includes('calendar'))).toBe(false);
  }, 60000);
});