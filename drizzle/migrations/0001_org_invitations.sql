CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE UNIQUE INDEX organization_invitations_token_key ON public.organization_invitations(token);
CREATE INDEX organization_invitations_org_idx ON public.organization_invitations(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read invitations" ON public.organization_invitations
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));

CREATE POLICY "admins create invitations" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner'::app_role,'admin'::app_role]) AND invited_by = auth.uid());

CREATE POLICY "admins update invitations" ON public.organization_invitations
  FOR UPDATE TO authenticated USING (public.has_org_role(org_id, ARRAY['owner'::app_role,'admin'::app_role]));

CREATE POLICY "admins delete invitations" ON public.organization_invitations
  FOR DELETE TO authenticated USING (public.has_org_role(org_id, ARRAY['owner'::app_role,'admin'::app_role]));

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.organization_invitations%ROWTYPE;
  user_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthenticated'; END IF;
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO inv FROM public.organization_invitations
   WHERE token = _token AND status = 'pending';
  IF NOT FOUND THEN RETURN 'invalid'; END IF;

  IF lower(inv.email) <> lower(coalesce(user_email, '')) THEN RETURN 'email_mismatch'; END IF;

  INSERT INTO public.organization_members (org_id, user_id, email, role)
  VALUES (inv.org_id, auth.uid(), user_email, inv.role)
  ON CONFLICT (org_id, user_id) DO NOTHING;

  UPDATE public.organization_invitations
     SET status = 'accepted', accepted_at = now()
   WHERE id = inv.id;

  INSERT INTO public.audit_logs (org_id, actor_id, action, detail)
  VALUES (inv.org_id, auth.uid(), 'invitation.accepted', user_email || ' joined as ' || inv.role);

  RETURN 'accepted';
END $$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;