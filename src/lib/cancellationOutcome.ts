/**
 * Pure decision function describing the result of cancelling a session.
 *
 * Mirrors the runtime behaviour of `useCancelAppointment` + the
 * `withdraw_from_prepayment_for_appointment` RPC so we can regression-test
 * the whole cancellation matrix (TC-01…TC-18) without hitting the DB.
 *
 * Inputs describe the state of the session *before* the therapist confirms
 * cancellation. Output describes every observable side-effect: new statuses,
 * balance movement, audit rows, income rows, debt rows and counter deltas.
 */
export type PriorPaymentStatus =
  | "unpaid"
  | "waiting_for_payment"
  | "paid_now"
  | "paid_in_advance"
  | "paid_from_prepayment"
  | "partially_paid"
  | "not_applicable";

export type PriorAppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "reminder_sent"
  | "completed"
  | "cancelled"
  | "no-show";

export interface CancellationInput {
  status: "cancelled" | "no-show";
  chargeFee: boolean;
  priorAppointmentStatus: PriorAppointmentStatus;
  priorPaymentStatus: PriorPaymentStatus;
  price: number;
  /** Client's available prepayment balance BEFORE this operation. */
  clientBalance: number;
}

export type OperationError =
  | "already_cancelled"
  | "financial_choice_required"
  | "insufficient_balance"
  | "invalid_state";

export interface CancellationOutcome {
  ok: boolean;
  error?: OperationError;
  /** Resulting appointment.status. */
  appointmentStatus?: "cancelled" | "no-show";
  /** Resulting appointment.payment_status. */
  paymentStatus?: PriorPaymentStatus;
  /** Prepayment balance after the operation. */
  balanceAfter: number;
  /** Amount deducted from the prepayment balance (>= 0). */
  balanceDelta: number;
  /** True iff a "Prepayment balance withdrawal" audit row was created. */
  createdPrepaymentWithdrawal: boolean;
  /** True iff a "Prepayment allocation released" audit row was created. */
  createdAllocationReleased: boolean;
  /** True iff a NEW income row was created (must be false for prepaid path). */
  createdNewIncome: boolean;
  /** True iff a new expected_payments (debt) row was created. */
  createdExpectedPayment: boolean;
  /** Delta applied to Total Paid metric. */
  totalPaidDelta: number;
  /** Delta counters on the client card. */
  counters: {
    prepaid: number;
    paid: number;
    cancelled: number;
    awaiting: number;
  };
}

const wasPrepaidStatus = (s: PriorPaymentStatus) =>
  s === "paid_in_advance" || s === "paid_from_prepayment";

/**
 * TC-05: chargeFee is not a boolean choice yet.
 * The caller signals "user did not pick" by passing `chargeFee: undefined`.
 */
export function validateCancellationChoice(
  chargeFee: boolean | undefined,
): OperationError | null {
  if (chargeFee === undefined || chargeFee === null) return "financial_choice_required";
  return null;
}

export function computeCancellationOutcome(
  input: CancellationInput,
): CancellationOutcome {
  const empty: CancellationOutcome = {
    ok: false,
    balanceAfter: input.clientBalance,
    balanceDelta: 0,
    createdPrepaymentWithdrawal: false,
    createdAllocationReleased: false,
    createdNewIncome: false,
    createdExpectedPayment: false,
    totalPaidDelta: 0,
    counters: { prepaid: 0, paid: 0, cancelled: 0, awaiting: 0 },
  };

  // TC-16: cancelling an already cancelled session is a no-op.
  if (input.priorAppointmentStatus === "cancelled" || input.priorAppointmentStatus === "no-show") {
    return { ...empty, error: "already_cancelled" };
  }

  const wasPrepaid = wasPrepaidStatus(input.priorPaymentStatus);

  // TC-15: paid_in_advance with zero/short balance is an invalid state.
  if (input.chargeFee && wasPrepaid) {
    if (input.clientBalance <= 0) {
      return { ...empty, error: "invalid_state" };
    }
    // TC-14: refuse to overdraw.
    if (input.clientBalance < input.price) {
      return { ...empty, error: "insufficient_balance" };
    }
  }

  // -------- Payable path --------
  if (input.chargeFee) {
    if (wasPrepaid && input.price > 0) {
      // TC-01 / TC-08 / TC-11 / TC-12: consume prepayment, no new income.
      return {
        ok: true,
        appointmentStatus: input.status,
        paymentStatus: "paid_from_prepayment",
        balanceAfter: input.clientBalance - input.price,
        balanceDelta: input.price,
        createdPrepaymentWithdrawal: true,
        createdAllocationReleased: false,
        createdNewIncome: false,
        createdExpectedPayment: false,
        totalPaidDelta: 0,
        counters: { prepaid: -1, paid: +1, cancelled: +1, awaiting: 0 },
      };
    }
    // TC-02: unpaid + payable => create debt.
    return {
      ok: true,
      appointmentStatus: input.status,
      paymentStatus: "waiting_for_payment",
      balanceAfter: input.clientBalance,
      balanceDelta: 0,
      createdPrepaymentWithdrawal: false,
      createdAllocationReleased: false,
      createdNewIncome: false,
      createdExpectedPayment: input.price > 0,
      totalPaidDelta: 0,
      counters: { prepaid: 0, paid: 0, cancelled: +1, awaiting: +1 },
    };
  }

  // -------- Non-payable path --------
  if (wasPrepaid) {
    // TC-03 / TC-09 / TC-13: release allocation, keep balance.
    return {
      ok: true,
      appointmentStatus: input.status,
      paymentStatus: "not_applicable",
      balanceAfter: input.clientBalance,
      balanceDelta: 0,
      createdPrepaymentWithdrawal: false,
      createdAllocationReleased: true,
      createdNewIncome: false,
      createdExpectedPayment: false,
      totalPaidDelta: 0,
      counters: { prepaid: -1, paid: 0, cancelled: +1, awaiting: 0 },
    };
  }
  // TC-04: unpaid + non-payable => clean cancel.
  return {
    ok: true,
    appointmentStatus: input.status,
    paymentStatus: "not_applicable",
    balanceAfter: input.clientBalance,
    balanceDelta: 0,
    createdPrepaymentWithdrawal: false,
    createdAllocationReleased: false,
    createdNewIncome: false,
    createdExpectedPayment: false,
    totalPaidDelta: 0,
    counters: { prepaid: 0, paid: 0, cancelled: +1, awaiting: 0 },
  };
}
