# Known Risks and Limitations

## High Priority

### 1. No Billing/Subscription System
- **Risk:** Users can access all features without paying
- **Impact:** No revenue collection
- **Mitigation:** Implement Stripe integration before public launch
- **Status:** Skipped for now

### 2. No Rate Limiting on Auth Endpoints
- **Risk:** Brute-force login attempts
- **Impact:** Account security
- **Mitigation:** Supabase has built-in rate limiting on auth endpoints (default). Monitor for abuse.

### 3. Large Data Hook File
- **Risk:** `src/hooks/useData.ts` (929 lines) is a maintenance burden
- **Impact:** Developer experience, merge conflicts
- **Mitigation:** Split into domain-specific hook files (useClients.ts, useAppointments.ts, etc.)

## Medium Priority

### 4. Client-Side Dashboard Aggregation
- **Risk:** Performance degrades with large datasets
- **Impact:** Slow dashboard for power users
- **Mitigation:** Move aggregation to database views or RPC functions

### 5. No Offline Support
- **Risk:** App unusable without internet
- **Impact:** Mobile users in poor connectivity areas
- **Mitigation:** Service worker + local-first architecture (future)

### 6. Single Translation File
- **Risk:** `translations.ts` (610 lines) grows unwieldy
- **Impact:** Maintenance difficulty
- **Mitigation:** Split by feature/page

### 7. No Automated E2E Tests
- **Risk:** Regressions go undetected
- **Impact:** Quality
- **Mitigation:** Playwright test suite (framework configured, tests needed)

## Low Priority

### 8. No Email Bounce Handling
- **Risk:** Sending to invalid addresses wastes quota
- **Impact:** Email deliverability reputation
- **Mitigation:** Process bounce webhooks from email provider

### 9. No Data Export
- **Risk:** Users can't export their data
- **Impact:** User trust, GDPR compliance
- **Mitigation:** CSV export exists for some views; expand to full data export

### 10. No Audit Log
- **Risk:** No trail of changes
- **Impact:** Debugging, compliance
- **Mitigation:** Add audit logging table with triggers
