CREATE OR REPLACE FUNCTION public.actor_label()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(u.raw_user_meta_data->>'full_name',''), nullif(u.raw_user_meta_data->>'name',''), u.email, 'system')
  FROM auth.users u WHERE u.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.audit_incident_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs (org_id, actor_id, action, detail)
    VALUES (NEW.org_id, auth.uid(), 'incident.status_changed',
      'Incident ' || NEW.id || ' · status ' || OLD.status || ' → ' || NEW.status || ' by ' || coalesce(public.actor_label(), 'system') || ' at ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_incident_status_change AFTER UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.audit_incident_status();

CREATE OR REPLACE FUNCTION public.audit_evidence_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.evidence_items%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF r.incident_id IS NULL OR auth.uid() IS NULL THEN RETURN r; END IF;
  INSERT INTO public.audit_logs (org_id, actor_id, action, detail)
  VALUES (r.org_id, auth.uid(), 'evidence.' || lower(TG_OP),
    'Incident ' || r.incident_id || ' · evidence "' || r.source || '" (' || r.evidence_type || ', ' || r.confidence || '%) ' || lower(TG_OP) || 'd by ' || coalesce(public.actor_label(), 'system') || ' at ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  RETURN r;
END $$;

CREATE TRIGGER on_evidence_change AFTER INSERT OR UPDATE OR DELETE ON public.evidence_items
FOR EACH ROW EXECUTE FUNCTION public.audit_evidence_change();

REVOKE EXECUTE ON FUNCTION public.actor_label() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.actor_label() TO authenticated;