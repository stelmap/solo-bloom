# API Overview

## Architecture

This application uses **Supabase client SDK** for direct database access with Row-Level Security (RLS). There is no traditional REST API layer — the Supabase JS client communicates directly with the PostgREST API.

## Data Access Pattern

All data operations are in `src/hooks/useData.ts` using TanStack React Query.

```typescript
import { supabase } from "@/integrations/supabase/client";

// Read
const { data } = await supabase.from("table").select("*");

// Create
const { data } = await supabase.from("table").insert({ ... }).select().single();

// Update
const { data } = await supabase.from("table").update({ ... }).eq("id", id);

// Delete
await supabase.from("table").delete().eq("id", id);
```

## Available Operations by Domain

### Authentication
| Operation | Method |
|-----------|--------|
| Sign up (email) | `supabase.auth.signUp()` |
| Sign in (email) | `supabase.auth.signInWithPassword()` |
| Sign in (Google) | `supabase.auth.signInWithOAuth()` |
| Sign out | `supabase.auth.signOut()` |
| Reset password | `supabase.auth.resetPasswordForEmail()` |
| Update password | `supabase.auth.updateUser()` |
| Get session | `supabase.auth.getSession()` |

### Clients
| Operation | Hook |
|-----------|------|
| List all | `useClients()` |
| Get one | `useClient(id)` |
| Create | `useCreateClient()` |
| Update | `useUpdateClient()` |
| Delete | `useDeleteClient()` |

### Services
| Operation | Hook |
|-----------|------|
| List all | `useServices()` |
| Create | `useCreateService()` |
| Update | `useUpdateService()` |
| Delete | `useDeleteService()` |

### Appointments
| Operation | Hook |
|-----------|------|
| List all | `useAppointments()` |
| Create | `useCreateAppointment()` |
| Update | `useUpdateAppointment()` |
| Delete | `useDeleteAppointment()` |

### Income
| Operation | Hook |
|-----------|------|
| List all | `useIncome()` |
| Create | `useCreateIncome()` |
| Delete | `useDeleteIncome()` |

### Expected Payments
| Operation | Hook |
|-----------|------|
| List all | `useExpectedPayments()` |
| Create | `useCreateExpectedPayment()` |
| Mark as paid | `useMarkExpectedPaymentPaid()` |

### Expenses
| Operation | Hook |
|-----------|------|
| List all | `useExpenses()` |
| Create | `useCreateExpense()` |
| Update | `useUpdateExpense()` |
| Delete | `useDeleteExpense()` |

### Profile
| Operation | Hook |
|-----------|------|
| Get profile | `useProfile()` |
| Update | `useUpdateProfile()` |

### Other
| Domain | Hooks |
|--------|-------|
| Break-even goals | `useBreakevenGoals()`, `useCreateBreakevenGoal()`, etc. |
| Working schedule | `useWorkingSchedule()`, `useUpsertWorkingSchedule()` |
| Days off | `useDaysOff()`, `useCreateDayOff()`, etc. |
| Tax settings | `useTaxSettings()`, `useCreateTaxSetting()`, etc. |
| Recurring rules | `useRecurringRules()`, `useCreateRecurringRule()`, etc. |
| Client notes | `useClientNotes()`, `useCreateClientNote()` |
| Client attachments | `useClientAttachments()`, `useUploadAttachment()` |
| Dashboard stats | `useDashboardStats()` |

## Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `auth-email-hook` | Custom branded auth emails | No JWT (webhook) |
| `process-email-queue` | Processes queued emails with retry | Service role JWT |

## Database Functions (RPC)

| Function | Purpose |
|----------|---------|
| `enqueue_email` | Add email to processing queue |
| `read_email_batch` | Read batch from email queue |
| `delete_email` | Remove processed email from queue |
| `move_to_dlq` | Move failed email to dead-letter queue |
