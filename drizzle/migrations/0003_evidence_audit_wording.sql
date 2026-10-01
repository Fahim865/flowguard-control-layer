CREATE OR REPLACE FUNCTION public.audit_evidence_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.evidence_items%ROWTYPE; verb text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF r.incident_id IS NULL OR auth.uid() IS NULL THEN RETURN r; END IF;
  verb := CASE TG_OP WHEN 'INSERT' THEN 'added' WHEN 'UPDATE' THEN 'updated' ELSE 'removed' END;
  INSERT INTO public.audit_logs (org_id, actor_id, action, detail)
  VALUES (r.org_id, auth.uid(), 'evidence.' || verb,
    'Incident ' || r.incident_id || ' · evidence "' || r.source || '" (' || r.evidence_type || ', ' || r.confidence || '%) ' || verb || ' by ' || coalesce(public.actor_label(), 'system') || ' at ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  RETURN r;
END $$;