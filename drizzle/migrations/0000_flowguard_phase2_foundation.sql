-- Roles
create type public.app_role as enum ('owner','admin','analyst','viewer');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  email text,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  risk_score int not null default 0,
  description text,
  created_at timestamptz not null default now()
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'healthy',
  description text,
  created_at timestamptz not null default now()
);

create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  workflow_id uuid references public.workflows(id) on delete set null,
  action text not null,
  risk_score int not null default 0,
  status text not null default 'allowed',
  created_at timestamptz not null default now()
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  rule text not null,
  effect text not null default 'review',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  workflow_id uuid references public.workflows(id) on delete set null,
  title text not null,
  category text not null default 'policy_violation',
  severity text not null default 'medium',
  status text not null default 'open',
  summary text,
  created_at timestamptz not null default now()
);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  source text not null,
  evidence_type text not null default 'log',
  confidence int not null default 80,
  captured_at timestamptz not null default now()
);

create table public.recovery_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete cascade,
  action text not null,
  state text not null default 'recommended',
  note text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- Grants
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.agents to authenticated;
grant select, insert, update, delete on public.workflows to authenticated;
grant select, insert, update, delete on public.agent_events to authenticated;
grant select, insert, update, delete on public.policies to authenticated;
grant select, insert, update, delete on public.incidents to authenticated;
grant select, insert, update, delete on public.evidence_items to authenticated;
grant select, insert, update, delete on public.recovery_actions to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant all on public.organizations, public.organization_members, public.agents, public.workflows,
  public.agent_events, public.policies, public.incidents, public.evidence_items,
  public.recovery_actions, public.audit_logs to service_role;

-- Helpers
create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m
    where m.org_id = _org and m.user_id = auth.uid())
$$;

create or replace function public.has_org_role(_org uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m
    where m.org_id = _org and m.user_id = auth.uid() and m.role = any(_roles))
$$;

-- RLS
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.agents enable row level security;
alter table public.workflows enable row level security;
alter table public.agent_events enable row level security;
alter table public.policies enable row level security;
alter table public.incidents enable row level security;
alter table public.evidence_items enable row level security;
alter table public.recovery_actions enable row level security;
alter table public.audit_logs enable row level security;

create policy "members read org" on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy "users create org" on public.organizations for insert to authenticated
  with check (created_by = auth.uid());
create policy "owners update org" on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner','admin']::public.app_role[]));

create policy "members read membership" on public.organization_members for select to authenticated
  using (public.is_org_member(org_id));
create policy "self or admin insert membership" on public.organization_members for insert to authenticated
  with check (user_id = auth.uid() or public.has_org_role(org_id, array['owner','admin']::public.app_role[]));
create policy "admins update membership" on public.organization_members for update to authenticated
  using (public.has_org_role(org_id, array['owner','admin']::public.app_role[]));
create policy "admins delete membership" on public.organization_members for delete to authenticated
  using (public.has_org_role(org_id, array['owner','admin']::public.app_role[]));

do $$
declare t text;
begin
  foreach t in array array['agents','workflows','agent_events','policies','incidents','evidence_items','recovery_actions']
  loop
    execute format('create policy "members read %1$s" on public.%1$I for select to authenticated using (public.is_org_member(org_id));', t);
    execute format('create policy "editors write %1$s" on public.%1$I for insert to authenticated with check (public.has_org_role(org_id, array[''owner'',''admin'',''analyst'']::public.app_role[]));', t);
    execute format('create policy "editors update %1$s" on public.%1$I for update to authenticated using (public.has_org_role(org_id, array[''owner'',''admin'',''analyst'']::public.app_role[]));', t);
    execute format('create policy "admins delete %1$s" on public.%1$I for delete to authenticated using (public.has_org_role(org_id, array[''owner'',''admin'']::public.app_role[]));', t);
  end loop;
end $$;

create policy "members read audit" on public.audit_logs for select to authenticated
  using (public.is_org_member(org_id));
create policy "members write audit" on public.audit_logs for insert to authenticated
  with check (public.is_org_member(org_id) and actor_id = auth.uid());

-- Seed owner membership + demo data on org creation
create or replace function public.bootstrap_organization()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a_support uuid; a_finance uuid; a_ops uuid;
  w_order uuid; w_refund uuid; w_report uuid;
  i_refund uuid; i_fail uuid;
begin
  insert into public.organization_members (org_id, user_id, email, role)
  values (new.id, new.created_by, (select email from auth.users where id = new.created_by), 'owner');

  insert into public.agents (org_id, name, status, risk_score, description) values
    (new.id,'Support Agent','active',18,'DEMO DATA - handles customer support actions') returning id into a_support;
  insert into public.agents (org_id, name, status, risk_score, description) values
    (new.id,'Finance Agent','review',72,'DEMO DATA - refunds and payment actions') returning id into a_finance;
  insert into public.agents (org_id, name, status, risk_score, description) values
    (new.id,'Operations Agent','active',34,'DEMO DATA - workflow orchestration') returning id into a_ops;

  insert into public.workflows (org_id, name, status, description) values
    (new.id,'Order Processing','failed','DEMO DATA - external API schema changed') returning id into w_order;
  insert into public.workflows (org_id, name, status, description) values
    (new.id,'Refund Approval','healthy','DEMO DATA - refund review pipeline') returning id into w_refund;
  insert into public.workflows (org_id, name, status, description) values
    (new.id,'Daily Reporting','healthy','DEMO DATA - scheduled reporting') returning id into w_report;

  insert into public.agent_events (org_id, agent_id, workflow_id, action, risk_score, status) values
    (new.id,a_finance,w_refund,'Attempted $1,240 refund',92,'blocked'),
    (new.id,a_support,w_refund,'Sent customer resolution email',12,'allowed'),
    (new.id,a_ops,w_order,'Called external fulfilment API',48,'review'),
    (new.id,a_ops,w_order,'Retried failed order step',30,'allowed'),
    (new.id,a_support,w_report,'Generated daily summary',8,'allowed');

  insert into public.policies (org_id, name, rule, effect) values
    (new.id,'Refund threshold','Refunds above $300 require human approval','review'),
    (new.id,'Customer data protection','Agents cannot delete customer records','block'),
    (new.id,'External communication','External emails require approval','review');

  insert into public.incidents (org_id, agent_id, workflow_id, title, category, severity, status, summary) values
    (new.id,a_finance,w_refund,'Unauthorized refund attempt','policy_violation','critical','open','DEMO DATA - refund of $1,240 exceeded approval threshold') returning id into i_refund;
  insert into public.incidents (org_id, agent_id, workflow_id, title, category, severity, status, summary) values
    (new.id,a_ops,w_order,'Order processing workflow failure','workflow_failure','high','investigating','DEMO DATA - external API schema changed') returning id into i_fail;

  insert into public.evidence_items (org_id, incident_id, agent_id, source, evidence_type, confidence) values
    (new.id,i_refund,a_finance,'Policy engine','policy_decision',98),
    (new.id,i_refund,a_finance,'Payment system log','log',94),
    (new.id,i_fail,a_ops,'API response capture','payload',88);

  insert into public.recovery_actions (org_id, incident_id, action, state, note) values
    (new.id,i_refund,'Human review','recommended','Recommendation only - no automatic execution'),
    (new.id,i_fail,'Retry with updated schema','recommended','Recommendation only - no automatic execution');

  insert into public.audit_logs (org_id, actor_id, action, detail) values
    (new.id,new.created_by,'organization.created','Organization created with demo data');
  return new;
end $$;

create trigger on_organization_created
after insert on public.organizations
for each row execute function public.bootstrap_organization();