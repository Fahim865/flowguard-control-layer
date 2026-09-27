import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  orgId: z.string().uuid(),
  incidentId: z.string().uuid(),
  eventIds: z.array(z.string().uuid()).max(20),
  evidenceIds: z.array(z.string().uuid()).max(20),
  notes: z.string().max(2000),
});

export const diagnoseIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) => input.parse(value))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (membershipError || !membership || membership.role === "viewer") {
      throw new Error("You do not have permission to analyze incidents in this organization.");
    }

    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select("id,title,category,severity,status,summary,agent_id,workflow_id")
      .eq("org_id", data.orgId)
      .eq("id", data.incidentId)
      .maybeSingle();
    if (incidentError || !incident) throw new Error("Incident not found in this organization.");

    if (data.eventIds.length === 0 && data.evidenceIds.length === 0) {
      throw new Error("Select at least one event or evidence item.");
    }

    const [eventResult, evidenceResult] = await Promise.all([
      data.eventIds.length
        ? supabase.from("agent_events")
            .select("id,action,risk_score,status,created_at,agent_id,workflow_id")
            .eq("org_id", data.orgId).in("id", data.eventIds)
        : Promise.resolve({ data: [], error: null }),
      data.evidenceIds.length
        ? supabase.from("evidence_items")
            .select("id,source,evidence_type,confidence,captured_at,incident_id")
            .eq("org_id", data.orgId).eq("incident_id", incident.id).in("id", data.evidenceIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (eventResult.error || evidenceResult.error) throw new Error("Could not read incident material.");
    const events = (eventResult.data ?? []).filter((event) =>
      (incident.agent_id && event.agent_id === incident.agent_id) ||
      (incident.workflow_id && event.workflow_id === incident.workflow_id),
    );
    const evidence = evidenceResult.data ?? [];
    if (events.length !== new Set(data.eventIds).size || evidence.length !== new Set(data.evidenceIds).size) {
      throw new Error("Some selected material does not belong to this incident.");
    }

    // Import the server-only AI client after authorization and data isolation have succeeded.
    const { generateIncidentDiagnosis } = await import("./incident-diagnosis.server");
    return generateIncidentDiagnosis({
      incident: {
        title: incident.title,
        category: incident.category,
        severity: incident.severity,
        status: incident.status,
        summary: incident.summary,
      },
      events: events.map(({ action, risk_score, status, created_at }) => ({ action, risk_score, status, created_at })),
      evidence: evidence.map(({ source, evidence_type, confidence, captured_at }) => ({ source, evidence_type, confidence, captured_at })),
      operatorNotes: data.notes.trim(),
    });
  });