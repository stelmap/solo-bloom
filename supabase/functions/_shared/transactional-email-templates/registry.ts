/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as sessionReminder } from './session-reminder.tsx'
import { template as sessionCancellation } from './session-cancellation.tsx'
import { template as bookingRequestNotification } from './booking-request-notification.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as domainStatusAlert } from './domain-status-alert.tsx'
import { template as accountDeactivationWarning } from './account-deactivation-warning.tsx'
import { template as accountDeletedFinal } from './account-deleted-final.tsx'
import { template as agreementInvitation } from './agreement-invitation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'session-reminder': sessionReminder,
  'session-cancellation': sessionCancellation,
  'booking-request-notification': bookingRequestNotification,
  'booking-confirmation': bookingConfirmation,
  'domain-status-alert': domainStatusAlert,
  'account-deactivation-warning': accountDeactivationWarning,
  'account-deleted-final': accountDeletedFinal,
  'agreement-invitation': agreementInvitation,
}
