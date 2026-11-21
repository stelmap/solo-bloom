import { describe, expect, it } from 'vitest'
import { SETUP_GUIDE_URL, setupGuideUrl, welcomeLanguage } from '../../supabase/functions/_shared/email-templates/welcome-content'

describe('welcome email instruction destination', () => {
  it('has no invented instruction destination before the owner supplies it', () => {
    expect(SETUP_GUIDE_URL).toBeUndefined()
    expect(setupGuideUrl(SETUP_GUIDE_URL)).toBeUndefined()
  })
  it('activates the exact configured HTTPS instruction URL', () => {
    expect(setupGuideUrl('https://solo-bizz.com/help/video')).toBe('https://solo-bizz.com/help/video')
  })
  it('rejects unsafe and relative destinations', () => {
    for (const value of ['javascript:alert(1)', '/help', 'http://solo-bizz.com', 'https://user:pass@solo-bizz.com']) expect(setupGuideUrl(value)).toBeUndefined()
  })
})

describe('welcome recipient language', () => {
  it('preserves each of the six selected languages', () => {
    for (const code of ['uk', 'en', 'pl', 'de', 'fr', 'ru']) expect(welcomeLanguage(code)).toBe(code)
    expect(welcomeLanguage('de-DE')).toBe('de')
  })
})