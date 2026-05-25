import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget read audit. Records that the current user viewed an entity.
 * Silent on failure — must never block UI.
 */
export function auditRead(
  entity_type: "clients" | "client_notes" | "appointments" | "supervisions" | "client_attachments" | "payment_corrections",
  entity_id: string,
) {
  try {
    void supabase.rpc("audit_read", { p_entity_type: entity_type, p_entity_id: entity_id });
  } catch {
    /* ignore */
  }
}
