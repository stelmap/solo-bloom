import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClients from "./tools/list-clients";
import listAppointments from "./tools/list-appointments";
import financeSummary from "./tools/finance-summary";
import createClientTool from "./tools/create-client";

// Direct Supabase host built from the project ref (Vite inlines this literal
// at build time; the fallback keeps issuer well-formed during manifest extract).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "solo-bizz-mcp",
  title: "Solo Bizz",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in Solo Bizz user. Use these to look up clients, upcoming or past appointments, income/expense totals, and to create new client records. All data is scoped to the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClients, listAppointments, financeSummary, createClientTool],
});
