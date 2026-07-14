import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---- Mocks ----------------------------------------------------------------

const USER_ID = "user-1";
const CLIENT_ID = "client-1";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: USER_ID } }),
}));

vi.mock("@/hooks/useDemoWorkspace", () => ({
  useDemoMode: () => ({ isDemoMode: false }),
  useDemoWriteGuard: () => () => {},
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

// Supabase mock — chainable query builder that records calls and returns
// deterministic data for each table.
type Result = { data: any; error: any };
const tableResponses: Record<string, Result | Result[]> = {};
const inserts: any[] = [];
const updates: any[] = [];

function chain(table: string) {
  let response: Result = { data: null, error: null };
  const consume = () => {
    const entry = tableResponses[table];
    if (Array.isArray(entry)) {
      response = entry.shift() || { data: null, error: null };
    } else if (entry) {
      response = entry;
    }
  };

  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(async () => {
      consume();
      return response;
    }),
    insert: vi.fn((payload: any) => {
      inserts.push({ table, payload });
      consume();
      return builder;
    }),
    update: vi.fn((payload: any) => {
      updates.push({ table, payload });
      consume();
      return builder;
    }),
    delete: vi.fn(() => builder),
    then: (resolve: any) => {
      consume();
      return Promise.resolve(response).then(resolve);
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn((t: string) => chain(t)) },
}));

// ---- Helpers --------------------------------------------------------------

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  for (const k of Object.keys(tableResponses)) delete tableResponses[k];
  inserts.length = 0;
  updates.length = 0;
});

// ---- Tests ----------------------------------------------------------------

describe("Supervision — create from client notes", () => {
  it("merges client_notes, session_notes and appointment notes; dedupes appointment when a session_note exists for the same appointment", async () => {
    tableResponses.client_notes = {
      data: [
        { id: "cn-1", client_id: CLIENT_ID, content: "General note", created_at: "2026-07-01T10:00:00Z", included_in_supervision: false },
      ],
      error: null,
    };
    tableResponses.appointments = {
      data: [
        { id: "appt-1", notes: "Legacy note A", scheduled_at: "2026-07-02T10:00:00Z", status: "completed", services: { name: "Therapy" } },
        { id: "appt-2", notes: "Legacy note B", scheduled_at: "2026-07-03T10:00:00Z", status: "completed", services: { name: "Therapy" } },
      ],
      error: null,
    };
    tableResponses.session_notes = {
      data: [
        {
          id: "sn-1",
          appointment_id: "appt-2",
          session_summary: "Structured summary",
          homework_text: "Practice grounding",
          has_homework: true,
          transference: "Positive",
          created_at: "2026-07-03T11:00:00Z",
          appointments: { scheduled_at: "2026-07-03T10:00:00Z", status: "completed", services: { name: "Therapy" } },
        },
      ],
      error: null,
    };
    tableResponses.supervisions = { data: [], error: null };

    const { useUnusedClientNotes } = await import("../useSupervisions");
    const { result } = renderHook(() => useUnusedClientNotes(CLIENT_ID), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const notes = result.current.data as any[];
    // client_note + appt-1 legacy + session_note for appt-2  (appt-2 legacy deduped)
    expect(notes).toHaveLength(3);
    const sources = notes.map(n => n.source).sort();
    expect(sources).toEqual(["appointment", "client_note", "session_note"]);
    const sessionNote = notes.find(n => n.source === "session_note");
    expect(sessionNote.session_summary).toBe("Structured summary");
    expect(sessionNote.homework_text).toBe("Practice grounding");
    // Appointment-source note for appt-2 must be excluded (session_note wins)
    expect(notes.find(n => n.source === "appointment" && n.appointment_id === "appt-2")).toBeUndefined();
  });

  it("filters out notes already imported into a previous supervision", async () => {
    tableResponses.client_notes = { data: [], error: null };
    tableResponses.appointments = {
      data: [
        { id: "appt-9", notes: "Old note", scheduled_at: "2026-06-01T10:00:00Z", status: "completed", services: null },
      ],
      error: null,
    };
    tableResponses.session_notes = { data: [], error: null };
    tableResponses.supervisions = {
      data: [{ imported_notes_snapshot: [{ appointment_id: "appt-9", source: "appointment" }] }],
      error: null,
    };

    const { useUnusedClientNotes } = await import("../useSupervisions");
    const { result } = renderHook(() => useUnusedClientNotes(CLIENT_ID), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("creates supervision: inserts expense + supervision and marks only client_note ids as included", async () => {
    tableResponses.expenses = { data: { id: "exp-1" }, error: null };
    tableResponses.supervisions = { data: { id: "sup-1" }, error: null };
    tableResponses.client_notes = { data: null, error: null };

    const { useCreateSupervision } = await import("../useSupervisions");
    const { result } = renderHook(() => useCreateSupervision(), { wrapper: wrapper() });

    await result.current.mutateAsync({
      client_id: CLIENT_ID,
      supervision_date: "2026-07-14",
      paid_amount: 80,
      imported_notes_snapshot: [
        { id: "cn-1", source: "client_note", content: "x" },
        { id: "sn-1", source: "session_note", session_summary: "y" },
        { id: "appt-appt-3", source: "appointment", appointment_id: "appt-3" },
      ],
      note_ids: ["cn-1"],
    });

    const expenseInsert = inserts.find(i => i.table === "expenses");
    const supInsert = inserts.find(i => i.table === "supervisions");
    expect(expenseInsert).toBeDefined();
    expect(expenseInsert!.payload.category).toBe("Supervision");
    expect(expenseInsert!.payload.amount).toBe(80);
    expect(supInsert).toBeDefined();
    expect(supInsert!.payload.expense_id).toBe("exp-1");
    expect(supInsert!.payload.imported_notes_snapshot).toHaveLength(3);

    const noteUpdate = updates.find(u => u.table === "client_notes");
    expect(noteUpdate).toBeDefined();
    expect(noteUpdate!.payload.included_in_supervision).toBe(true);
    expect(noteUpdate!.payload.supervision_id).toBe("sup-1");
  });
});
