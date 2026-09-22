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

const ACTIVE_KEY = "fg.active_org";

export function useOrg() {
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrg, setActive] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id ?? null);
    const { data } = await supabase
      .from("organization_members")
      .select("org_id, role, organizations(id, name)")
      .order("created_at");
    const list = (data as unknown as Membership[]) ?? [];
    setMemberships(list);
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_KEY) : null;
    const next = list.find((x) => x.org_id === stored)?.org_id ?? list[0]?.org_id ?? null;
    setActive(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setActiveOrg = useCallback((org_id: string) => {
    window.localStorage.setItem(ACTIVE_KEY, org_id);
    setActive(org_id);
  }, []);

  const membership = memberships.find((x) => x.org_id === activeOrg) ?? null;

  return { loading, memberships, membership, activeOrg, setActiveOrg, userId, reload: load };
}
