# Launch Checklist

## Pre-Launch Verification

### ✅ Authentication
- [x] Email/password signup works
- [x] Email verification sent
- [x] Login with correct credentials works
- [x] Wrong password rejected
- [x] Google OAuth login works
- [x] Password reset flow works
- [x] Auth state persists across refresh
- [x] Sign out clears session

### ✅ User Profile
- [x] Onboarding flow completes
- [x] Profile settings save correctly
- [x] Language switching works (EN/UK)
- [x] Work hours configuration saves

### ✅ Clients
- [x] Create client
- [x] Edit client
- [x] Delete client
- [x] Client detail page loads
- [x] Client notes CRUD
- [x] Client file attachments upload/view

### ✅ Services
- [x] Create service with name, price, duration
- [x] Edit service
- [x] Delete service

### ✅ Appointments
- [x] Create appointment from calendar
- [x] Edit appointment
- [x] Delete appointment
- [x] Complete as paid → generates income
- [x] Complete as unpaid → generates expected payment
- [x] Cancel appointment
- [x] Reschedule appointment
- [x] Session notes

### ✅ Recurring Appointments
- [x] Create recurring rule
- [x] Generate individual occurrences
- [x] Edit single occurrence independently
- [x] Delete recurring rule

### ✅ Finance
- [x] Income list displays correctly
- [x] Expected payments list correct
- [x] Mark expected payment as paid
- [x] Expenses CRUD
- [x] Tax settings configuration
- [x] Dashboard totals accurate
- [x] Financial overview page

### ✅ Break-even
- [x] Configure break-even goals
- [x] Progress calculation correct
- [x] Multiple goals supported

### ✅ File Storage
- [x] Upload files to client/session
- [x] Files accessible only by owner
- [x] File metadata stored

### ✅ Email
- [x] Custom branded auth emails
- [x] Email queue processing works
- [x] Rate limiting and retry logic
- [x] Dead-letter queue for failed emails

### ✅ Security
- [x] RLS on all tables
- [x] User data isolation
- [x] Authenticated-only file access
- [x] JWT validation on edge functions
- [x] No hardcoded secrets

### ⬜ Not Yet Implemented
- [ ] Stripe billing integration
- [ ] Google Calendar sync
- [ ] Scheduled email reminders
- [ ] Forecasting page
- [ ] Push notifications (for mobile)

## Post-Launch Monitoring

- [ ] Monitor `email_send_log` for delivery failures
- [ ] Check for auth errors in logs
- [ ] Verify RLS policies block cross-user access
- [ ] Test on mobile/tablet devices
- [ ] Set up error tracking (e.g., Sentry)
