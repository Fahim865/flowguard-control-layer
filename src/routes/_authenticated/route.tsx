import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/team", label: "Team" },
  { to: "/settings", label: "Settings" },
] as const;

function AppShell() {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen grid-bg">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <nav className="mx-auto max-w-6xl px-5 min-h-14 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
          <Link to="/" className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground hover:text-foreground">
            FLOWGUARD
          </Link>
          <ul className="order-3 flex w-full items-center gap-1 text-sm sm:order-none sm:w-auto">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:text-foreground hover:bg-foreground/5"
                  activeProps={{ className: "rounded-md px-3 py-1.5 bg-foreground/10 text-foreground" }}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <button onClick={signOut} className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
