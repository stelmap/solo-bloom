import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { canTriggerBookingConfirmation } from '../../../supabase/functions/send-booking-confirmation-email/trigger-access';

// Execute the actual handler with isolated Auth/database/email adapters. No
// production records are created and no email is delivered by these tests.
function setup(userId?: string, status = 'confirmed') {
  const requestRow = {
    id: '12345678-1234-1234-1234-123456789012', user_id: 'owner',
    email: 'client@example.test', first_name: 'Test', last_name: 'Client',
    status, created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    requested_slot_at: '2026-11-20T10:00:00Z',
  };
  const sendEmail = vi.fn().mockResolvedValue({ sent: true });
  const getUser = vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null }, error: userId ? null : new Error('invalid token') });
  const createClient = () => ({
    auth: { getUser },
    from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: table === 'session_booking_requests' ? requestRow : { full_name: 'Specialist', language: 'en' }, error: null,
    }) }) }) }),
  });
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const deno = { env: { get: () => 'test' }, serve: (fn: typeof handler) => { handler = fn; } };
  const source = readFileSync('supabase/functions/send-booking-confirmation-email/index.ts', 'utf8').replace(/^import .*\n/gm, '');
  // Strip TypeScript using the same transpiler used by the test runner.
  return { requestRow, sendEmail, getUser, createClient, deno, source, getHandler: () => handler };
}

async function run(userId?: string, status?: string) {
  const fixture = setup(userId, status);
  const { transpileModule, ScriptTarget, ModuleKind } = await import('typescript');
  const { outputText: code } = transpileModule(fixture.source, { compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.None } });
  new Function('Deno', 'createClient', 'corsHeaders', 'sendAppEmail', 'canTriggerBookingConfirmation', code)(
    fixture.deno, fixture.createClient, {}, fixture.sendEmail, canTriggerBookingConfirmation,
  );
  const handler = fixture.getHandler();
  if (!handler) throw new Error('Handler was not registered');
  const response = await handler(new Request('https://example.test/confirmation', {
    method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: fixture.requestRow.id, email: 'attacker@example.test' }),
  }));
  return { ...fixture, response };
}

describe('booking confirmation handler', () => {
  it('sends a delayed owner approval to the stored recipient with the same idempotency key', async () => {
    const { response, sendEmail, requestRow, getUser } = await run('owner');
    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith('test-token');
    expect(sendEmail).toHaveBeenCalledWith('booking-confirmation', 'client@example.test', expect.objectContaining({ idempotencyKey: `booking-confirm-${requestRow.id}` }));
  });
  it('blocks a different authenticated therapist without sending', async () => {
    const { response, sendEmail } = await run('other-owner');
    expect(response.status).toBe(409);
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('blocks an expired request with invalid authentication', async () => {
    const { response, sendEmail } = await run();
    expect(response.status).toBe(409);
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('still skips cancelled requests even for the owner', async () => {
    const { response, sendEmail } = await run('owner', 'cancelled_therapist');
    expect(await response.json()).toEqual({ skipped: 'status' });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});