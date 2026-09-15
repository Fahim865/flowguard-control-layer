export type CapabilityId =
  | "monitor"
  | "evaluate"
  | "policy"
  | "evidence"
  | "recovery"
  | "self-repair"
  | "arbitration"
  | "compliance";

export interface Capability {
  id: CapabilityId;
  name: string;
  line: string;
  detail: string;
}

export const CAPABILITIES: Capability[] = [
  {
    id: "monitor",
    name: "Monitor",
    line: "See every important agent action.",
    detail:
      "Continuous visibility into what autonomous agents attempt, across workflows, systems and external calls.",
  },
  {
    id: "evaluate",
    name: "Evaluate",
    line: "Measure whether an action achieved the intended business outcome.",
    detail:
      "Outcome scoring for every executed step, so success is judged by business result, not by model confidence.",
  },
  {
    id: "policy",
    name: "Policy",
    line: "Enforce business rules before risky actions execute.",
    detail:
      "Deterministic rules evaluated ahead of execution. Every decision returns allow, review or block with a matched rule.",
  },
  {
    id: "evidence",
    name: "Evidence",
    line: "Create a traceable evidence chain for important decisions.",
    detail:
      "Inputs, policy results, approvals and artifacts linked into one chain that can be replayed after the fact.",
  },
  {
    id: "recovery",
    name: "Recovery",
    line: "Respond safely when autonomous workflows fail.",
    detail:
      "Retry, rollback, escalate or request information — proposed as recommendations, executed only with authority.",
  },
  {
    id: "self-repair",
    name: "Self-Repair",
    line: "Diagnose broken workflows and restore execution.",
    detail:
      "Detect the failure, isolate the cause, generate a candidate fix, test it in isolation and verify the restart.",
  },
  {
    id: "arbitration",
    name: "Arbitration",
    line: "Resolve conflicts between multiple AI agents.",
    detail:
      "When agents disagree, authority, policy, evidence and risk decide which recommendation is allowed to act.",
  },
  {
    id: "compliance",
    name: "Compliance",
    line: "Turn changing rules into enforceable workflows.",
    detail:
      "New requirement in, affected workflows identified, policy drafted, change verified before it goes live.",
  },
];

export const RISK_STEPS = [
  { label: "Agent Action", note: "Refund Agent attempted a $1,240 refund." },
  { label: "Policy Check", note: "Matched rule: refunds above $300 require human approval." },
  { label: "Risk Evaluation", note: "Amount, account age and recent disputes raise the score." },
  { label: "Evidence Inspection", note: "No supporting return record or approval artifact found." },
  { label: "Action Blocked", note: "Execution intercepted before the payment call." },
  { label: "Human Review", note: "Routed to finance reviewer with full evidence chain." },
];

export const TIMELINE = [
  { time: "10:41:22", event: "Agent initiated refund", tone: "neutral" },
  { time: "10:41:23", event: "Policy evaluated", tone: "neutral" },
  { time: "10:41:23", event: "Critical risk detected", tone: "danger" },
  { time: "10:41:24", event: "Evidence collected", tone: "neutral" },
  { time: "10:41:25", event: "Action blocked", tone: "danger" },
  { time: "10:41:26", event: "Human review requested", tone: "good" },
] as const;

export const REPAIR_STEPS = [
  { label: "DETECT", note: "Order Processing failed at step 4 of 7." },
  { label: "DIAGNOSE", note: "External API schema changed: `total_amount` renamed." },
  { label: "GENERATE FIX", note: "Field mapping patch drafted for the transform step." },
  { label: "TEST", note: "Patch replayed against the last 25 failed payloads." },
  { label: "RETRY", note: "Queued executions resumed from the failed step." },
  { label: "VERIFY", note: "Outputs match expected schema and business result." },
];

export const ARBITRATION_AGENTS = [
  { name: "Sales Agent", claim: "Approve discount.", weight: "Revenue authority" },
  { name: "Finance Agent", claim: "Outside budget.", weight: "Budget authority" },
  { name: "Risk Agent", claim: "High risk.", weight: "Risk authority" },
];

export const COMPLIANCE_STEPS = [
  "New Regulation Detected",
  "Affected Workflow Identified",
  "Policy Generated",
  "Workflow Updated",
  "Verification Passed",
];

export const VERIFICATION_STEPS = [
  { label: "AI CLAIM", note: "Equipment maintenance completed." },
  { label: "PHOTO / VIDEO", note: "2 site images attached to the work order." },
  { label: "SENSOR DATA", note: "Vibration profile returned to normal range." },
  { label: "LOCATION / TIMESTAMP", note: "On-site, 14:06 local, within the service window." },
  { label: "CROSS-CHECK", note: "Signals compared against the claimed work." },
  { label: "REALITY CONFIDENCE", note: "Evidence confidence: 94%" },
];

export const NETWORK_AGENTS = [
  { name: "Support Agent", status: "Healthy", events: 4218, risk: "Low" },
  { name: "Finance Agent", status: "Under review", events: 1342, risk: "Critical" },
  { name: "Sales Agent", status: "Healthy", events: 2765, risk: "Moderate" },
  { name: "Research Agent", status: "Healthy", events: 908, risk: "Low" },
  { name: "Operations Agent", status: "Degraded", events: 1877, risk: "High" },
];

export const NETWORK_SYSTEMS = ["CRM", "ERP", "Database", "Payments", "Email", "Cloud", "External APIs"];

export const DASHBOARD_METRICS = [
  { label: "Active Agents", value: "5" },
  { label: "Active Workflows", value: "18" },
  { label: "Events Today", value: "11,110" },
  { label: "High Risk Events", value: "34" },
  { label: "Policy Violations", value: "12" },
  { label: "Open Incidents", value: "3" },
  { label: "Recovery Queue", value: "7" },
];

export const PRICING = [
  { tier: "Free", blurb: "For exploration", points: ["1 workspace", "Demo agents & workflows", "Core monitoring"] },
  { tier: "Pro", blurb: "For growing AI workflows", points: ["Policy engine", "Evidence chains", "Risk scoring"] },
  { tier: "Team", blurb: "For production teams", points: ["Roles & approvals", "Recovery queue", "Arbitration center"] },
  {
    tier: "Enterprise",
    blurb: "For larger organizations",
    points: ["Organization isolation", "Audit trails", "Dedicated controls"],
  },
];
