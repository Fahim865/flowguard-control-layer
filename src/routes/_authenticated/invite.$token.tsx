import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AmbientField } from "@/components/fg/AmbientField";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  head: () => ({
    meta: [
      { title: "Accept invitation — FlowGuard" },
      { name: "description", content: "Accept your FlowGuard organization invitation and join the control console." },
      { property: "og:title", content: "Accept invitation — FlowGuard" },
      { property: "og:description", content: "Join a FlowGuard organization." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcceptInvite,
});

const MESSAGES: Record<string, string> = {
  accepted: "Invitation accepted. You now have access to this organization.",
  invalid: "This invitation link is invalid, already used, or revoked.",
  email_mismatch: "This invitation was issued to a different email address. Sign in with that address to accept it.",
  unauthenticated: "Please sign in to accept this invitation.",
};

function AcceptInvite() {
  const { token } = useParams({ from: "/_authenticated/invite/$token" });
  const [state, setState] = useState<string>("working");

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
      setState(error ? "invalid" : ((data as string) ?? "invalid"));
    })();
  }, [token]);

  return (
    <div className="relative mx-auto max-w-md overflow-hidden glass-panel rounded-xl p-6">
      <AmbientField variant="pulse" />
      <div className="relative">
        <h1 className="text-xl font-semibold tracking-tight">Organization invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state === "working" ? "Verifying your invitation…" : (MESSAGES[state] ?? MESSAGES["invalid"])}
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
