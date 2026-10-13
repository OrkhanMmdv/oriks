-- Oriks database. Paste into Supabase → SQL Editor → Run.
-- Every table has user_id + Row Level Security, so each user can only see their own rows.

create table if not exists settings (
  user_id      uuid primary key default auth.uid() references auth.users on delete cascade,
  cal_goal     int  not null default 2200,
  study_goal   int  not null default 90,
  db_min       int  not null default 45,
  study_plan   jsonb,              -- [{ m: 30, t: 'SQL practice' }, ...]
  workout_plan jsonb,              -- 7 items, index 0 = Sunday: [{ n: 'Full Body A', ex: '...' }, ...]
  plan_v       int  not null default 2
);

create table if not exists work_days (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day     date not null,
  primary key (user_id, day)
);

create table if not exists weights (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day     date not null,
  kg      numeric(5,1) not null check (kg > 20 and kg < 400),
  primary key (user_id, day)
);

create table if not exists meals (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day     date not null,
  name    text not null,
  kcal    int  not null check (kcal > 0)
);
create index if not exists meals_user_day on meals (user_id, day);

create table if not exists workouts (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day     date not null,
  primary key (user_id, day)
);

create table if not exists study_tasks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day     date not null,
  task    text not null,             -- 'db' = Databases course
  minutes int  not null,
  primary key (user_id, day, task)
);

create table if not exists study_days (
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  day       date not null,
  extra_min int  not null default 0,
  note      text not null default '',
  primary key (user_id, day)
);

create table if not exists photos (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day     date not null,
  path    text not null              -- file path in the 'photos' storage bucket
);

-- Row Level Security: only the owner can read / write their rows
do $$
declare t text;
begin
  foreach t in array array['settings','work_days','weights','meals','workouts','study_tasks','study_days','photos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own_rows on %I', t);
    execute format('create policy own_rows on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Private bucket for progress photos; files live under <user_id>/...
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists own_photos on storage.objects;
create policy own_photos on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Handy queries for your Databases course practice:
--   select date_trunc('month', day) as month, count(*) from work_days group by 1 order by 1;
--   select day, sum(kcal) from meals group by day order by day desc limit 7;
--   select day, sum(minutes) from study_tasks group by day having sum(minutes) >= 90;
