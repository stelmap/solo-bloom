import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { withCanonicalGroup } from "./groupSessionSync";

describe("canonical group meeting links", () => {
  it("recognizes existing group meetings even when their reverse link is missing", () => {
    const group = { id: "gs1", group_id: "g1", groups: { name: "Group" } };
    expect(withCanonicalGroup({ id: "a1", group_session_id: null, group_sessions: null, canonical_group_sessions: [group] })).toEqual({ id: "a1", group_session_id: "gs1", group_sessions: group });
  });
  it("does not change individual appointments", () => {
    expect(withCanonicalGroup({ id: "a2", group_session_id: null, group_sessions: null, canonical_group_sessions: [] })).toEqual({ id: "a2", group_session_id: null, group_sessions: null });
  });
  it("accepts the unique forward relationship returned as an object", () => {
    const group = { id: "gs2", group_id: "g2" };
    expect(withCanonicalGroup({ group_session_id: null, canonical_group_sessions: group }).group_session_id).toBe("gs2");
  });
});