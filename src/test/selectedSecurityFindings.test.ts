import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('selected security fixes', () => {
  const preview = readFileSync('supabase/functions/share-preview/index.ts', 'utf8');
  const migration = readFileSync('drizzle/migrations/0031_revoke_confirmation_for_terminal_meetings.sql', 'utf8');

  it('signs preview photos under public storage permissions only', () => {
    expect(preview).toContain('await anon.storage.from("therapist-profile-files").createSignedUrl');
    expect(preview).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(preview).not.toContain('admin.storage');
  });

  it('checks meeting eligibility before marking a token used', () => {
    expect(migration.indexOf("v_status NOT IN ('scheduled', 'confirmed')"))
      .toBeLessThan(migration.indexOf('UPDATE public.session_confirmations'));
    expect(migration).toContain("WHERE id = v_apt_id AND status IN ('scheduled', 'confirmed')");
  });

  it('locks the meeting before the confirmation row', () => {
    expect(migration.indexOf('WHERE a.id = v_apt_id FOR UPDATE'))
      .toBeLessThan(migration.indexOf('LIMIT 1 FOR UPDATE'));
  });

  it('uses the same eligibility gate for link lookup', () => {
    expect(migration).toContain("WHERE sc.token = p_token AND a.status IN ('scheduled', 'confirmed')");
  });
});