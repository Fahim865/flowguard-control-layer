ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'assistant';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS workflow_ids uuid[] NOT NULL DEFAULT '{}';

-- Runs an agent's action through its assigned workflows. Security invoker: RLS applies (owner/admin/analyst).
CREATE OR REPLACE FUNCTION public.run_agent(_agent uuid, _action text, _detail text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  a public.agents%ROWTYPE; wf uuid; kw text; st text; risk int; pol text; inc uuid;
  results jsonb := '[]'::jsonb; wfs uuid[];
BEGIN
  SELECT * INTO a FROM public.agents WHERE id = _agent;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agent not found'; END IF;
  IF _action NOT IN ('read_data','send_email','issue_refund','modify_records','call_external_api') THEN RAISE EXCEPTION 'Unknown action'; END IF;
  kw := CASE _action WHEN 'read_data' THEN 'read' WHEN 'send_email' THEN 'email' WHEN 'issue_refund' THEN 'refund' WHEN 'modify_records' THEN 'record' ELSE 'external' END;
  wfs := CASE WHEN cardinality(a.workflow_ids) = 0 THEN ARRAY[NULL::uuid] ELSE a.workflow_ids END;
  FOREACH wf IN ARRAY wfs LOOP
    pol := NULL;
    IF NOT (_action = ANY(a.permissions)) THEN
      st := 'blocked'; risk := 90; pol := 'Agent lacks permission ' || _action;
    ELSE
      SELECT p.name, CASE p.effect WHEN 'block' THEN 'blocked' WHEN 'review' THEN 'review' ELSE 'allowed' END
        INTO pol, st FROM public.policies p
       WHERE p.org_id = a.org_id AND p.enabled AND p.rule ILIKE '%' || kw || '%'
       ORDER BY CASE p.effect WHEN 'block' THEN 0 WHEN 'review' THEN 1 ELSE 2 END LIMIT 1;
      IF pol IS NULL THEN st := 'allowed'; END IF;
      risk := CASE st WHEN 'blocked' THEN 85 WHEN 'review' THEN 60 ELSE 15 END;
    END IF;
    INSERT INTO public.agent_events (org_id, agent_id, workflow_id, action, risk_score, status)
    VALUES (a.org_id, a.id, wf, left(_action || CASE WHEN _detail <> '' THEN ': ' || _detail ELSE '' END, 300), risk, st);
    inc := NULL;
    IF st = 'blocked' THEN
      INSERT INTO public.incidents (org_id, agent_id, workflow_id, title, category, severity, status, summary)
      VALUES (a.org_id, a.id, wf, a.name || ' blocked: ' || _action, 'policy_violation', 'high', 'open', coalesce(pol, 'Blocked by policy'))
      RETURNING id INTO inc;
    END IF;
    results := results || jsonb_build_object('workflow_id', wf, 'status', st, 'risk', risk, 'policy', pol, 'incident_id', inc);
  END LOOP;
  INSERT INTO public.audit_logs (org_id, actor_id, action, detail)
  VALUES (a.org_id, auth.uid(), 'agent.run', a.name || ' ran ' || _action);
  RETURN results;
END $$;
REVOKE EXECUTE ON FUNCTION public.run_agent(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.run_agent(uuid, text, text) TO authenticated;