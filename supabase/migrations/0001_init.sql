-- UX Recall — schéma (§4 spec). Postgres / Supabase.
-- Enumy odpovídají doménovým typům (src/domain/types.ts).

create type tracker_status      as enum ('navrženo', 'schváleno', 'účinné', 'vymáháno');
create type remediation_weight  as enum ('lehká', 'těžká');
create type source_group        as enum ('A', 'B');
create type source_category     as enum ('regulatorni', 'platformni', 'checkout-duvera', 'ux-vyzkum', 'trzni-kontext');
create type source_type         as enum ('rss', 'html');
create type candidate_type      as enum ('nová', 'update');
create type candidate_status    as enum ('pending', 'approved', 'rejected');
create type digest_status       as enum ('draft', 'sent');

-- Tracker — stavová legislativa (§3). `id` je stabilní doménová kotva, ne uuid.
create table tracker (
  id                        text primary key,
  title                     text not null,
  effective_date            date,
  status                    tracker_status not null default 'navrženo',
  last_material_change_date date,
  last_material_change_note text,
  remediation_weight        remediation_weight not null default 'lehká',
  fired_flags               jsonb not null default '[]'::jsonb,
  confirmed                 boolean not null default false,
  segment                   text[] not null default '{}',
  source_url                text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Candidates — neblokující fronta mutací trackeru (§2, §4).
create table candidates (
  id          uuid primary key default gen_random_uuid(),
  type        candidate_type not null,
  proposed    jsonb not null default '{}'::jsonb,
  diff        text,
  tracker_id  text references tracker(id) on delete set null,
  source_url  text,
  status      candidate_status not null default 'pending',
  created_at  timestamptz not null default now()
);
create index candidates_status_idx on candidates(status);

-- Recipients — příjemci týmového newsletteru.
create table recipients (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sources — allowlist (§5). Konfigurace, ne hardcode.
create table sources (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  url        text not null,
  "group"    source_group not null,
  category   source_category not null,
  type       source_type not null default 'rss',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Digests — drafty + log odeslání (buffer Ne→Po).
create table digests (
  id            uuid primary key default gen_random_uuid(),
  week_of       date not null,
  status        digest_status not null default 'draft',
  html          text,
  body_text     text,
  items_summary text,
  empty         boolean not null default false,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index digests_status_created_idx on digests(status, created_at desc);

-- RLS: agent jezdí přes service-role klíč (obchází RLS).
-- Admin UI jezdí pod přihlášeným uživatelem → plný přístup jen pro authenticated.
alter table tracker     enable row level security;
alter table candidates  enable row level security;
alter table recipients  enable row level security;
alter table sources     enable row level security;
alter table digests     enable row level security;

create policy "authenticated full access" on tracker
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on candidates
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on recipients
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on sources
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on digests
  for all to authenticated using (true) with check (true);
