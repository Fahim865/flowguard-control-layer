import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "owner" | "admin" | "analyst" | "viewer";

export type Membership = {
  org_id: string;
  role: Role;
  organizations: { id: string; name: string } | null;
};

/** Capability matrix — least privilege across dashboard and settings. */
export const can = {
  manageMembers: (r: Role) => r === "owner" || r === "admin",
  managePolicies: (r: Role) => r === "owner" || r === "admin",
  manageKeys: (r: Role) => r === "owner" || r === "admin",
  actOnIncidents: (r: Role) => r !== "viewer",
  viewAudit: (r: Role) => r === "owner" || r === "admin" || r === "analyst",
};

export function useOrg() {
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id ?? null);
    const { data } = await supabase
      .from("organization_members")
      .select("org_id, role, organizations(id, name)")
      .limit(1)
      .maybeSingle();
    setMembership((data as unknown as Membership) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, membership, userId, reload: load };
}
