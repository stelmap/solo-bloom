import { describe, expect, it } from 'vitest';
import { translatedTestimonial } from '../lib/testimonialTranslations';

describe('testimonial source protection', () => {
  it('preserves a changed user review instead of showing a stale translation', () => {
    const review = { id: 'f79bd406-ff23-4dfc-97b6-4541e6ee53fa', body: 'Updated genuine feedback', profession: 'Teacher' };
    expect(translatedTestimonial(review, 'de')).toEqual({ body: 'Updated genuine feedback', profession: 'Teacher' });
  });
  it('does not replace other reviews with the known testimonial', () => {
    const review = { id: 'another-user', body: 'A different real experience', profession: 'Consultant' };
    expect(translatedTestimonial(review, 'pl')).toEqual({ body: 'A different real experience', profession: 'Consultant' });
  });
});