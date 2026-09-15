import { createFileRoute } from "@tanstack/react-router";

import {
  ArbitrationDemo,
  ComplianceDemo,
  EvidenceTimeline,
  RealityVerification,
  RiskDemo,
  SelfRepairDemo,
} from "@/components/fg/Demos";
import { Hero } from "@/components/fg/Hero";
import {
  AgentNetwork,
  Capabilities,
  ControlLayer,
  DashboardPreview,
  FinalCta,
  Footer,
  Nav,
  Pricing,
  Security,
} from "@/components/fg/Sections";
import { Story } from "@/components/fg/Story";

const TITLE = "FlowGuard — Make Autonomous AI Safe to Run";
const DESCRIPTION =
  "FlowGuard is the control layer for autonomous AI: monitor, evaluate, verify and recover AI workflows before autonomous actions become business incidents.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div id="top" className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <Story />
        <AgentNetwork />
        <ControlLayer />
        <Capabilities />
        <RiskDemo />
        <EvidenceTimeline />
        <SelfRepairDemo />
        <ArbitrationDemo />
        <RealityVerification />
        <ComplianceDemo />
        <DashboardPreview />
        <Security />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
