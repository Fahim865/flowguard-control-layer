# FlowGuard — AI Workflow Control Platform

Building the whole spec at once would be very expensive. This plan delivers it in phases, each one usable on its own, starting with the cinematic landing page and a working demo product shell.

## Phase 1 — Cinematic landing page (first build)

- Dark premium design system: near-black surfaces, one restrained cool accent, strong typography, subtle borders and depth.
- Full-screen hero with a real 3D scene (Three.js / React Three Fiber): the FlowGuard Control Core surrounded by 8 nodes (Monitor, Evaluate, Policy, Evidence, Recovery, Self-Repair, Arbitration, Compliance), curved animated connections, flowing particles, slow orbit, mouse parallax, hover labels, click-to-focus with an info panel.
- Scroll story ("AI is becoming autonomous" → risk → control core → interception → recovery → "From autonomous action to accountable execution") with scroll-linked camera movement.
- Sections: why control is needed, 8 capabilities, risk-detection demo (refund $1,240, risk 92/100, replay), evidence timeline, self-repair sequence, arbitration demo, physical reality verification, compliance pipeline, control architecture diagram, security, pricing (marked Coming soon), final CTA, footer.
- Performance: WebGL lazy-loaded, scene paused off-screen, reduced particle counts on mobile, reduced-motion mode, and a 2.5D fallback when WebGL is unavailable.
- No fake logos, testimonials, certifications, or statistics. All simulated data clearly labelled DEMO DATA.

## Phase 2 — Product shell with demo data

- Sign up, log in, forgot password, Google sign-in, organizations with roles (Owner, Admin, Analyst, Viewer).
- Dashboard: active agents, workflows, events today, high-risk events, policy violations, open incidents, recovery queue, plus charts.
- Agents, Workflows, Incidents, Policies, Evidence Vault, Recovery Center (recommendation-only), Arbitration Center, Compliance Center, Integrations, Developer portal, Settings.
- Runs on demo data first so the whole product is explorable immediately.

## Phase 3 — Real backend and AI

- Database with organization isolation for agents, workflows, events, policies, incidents, evidence, recovery actions, arbitration cases, compliance rules, integrations, audit logs, usage.
- AI features: event classification, risk explanation, incident summaries, root-cause hypotheses, recovery recommendations, arbitration and compliance explanations. No autonomous destructive actions.

## Technical notes

- TanStack Start + React Three Fiber / Drei + Framer Motion; GSAP-style scroll driven via scroll progress hooks.
- One shared WebGL canvas per page section group, instanced geometry, capped device pixel ratio, disposal on unmount.
- Auth, database and server logic on Lovable Cloud; AI calls go through a server-side provider abstraction (model/base URL configurable), never from the browser.

## What I need from you

Confirm we start with Phase 1 only, or tell me to go further in the first pass (higher cost).
