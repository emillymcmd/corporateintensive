-- Execute uma única vez no SQL Editor do projeto EXCLUSIVO deste treinamento.
-- Contas usam Supabase Auth (senha com hash gerenciado pela plataforma).
create table if not exists public.training_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null, full_name text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.training_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.training_answers (
 user_id uuid not null references auth.users(id) on delete cascade,
 activity_id integer not null check (activity_id between 1 and 62),
 response jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(user_id,activity_id)
);
create table if not exists public.training_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 slide_id text not null,
 first_visited_at timestamptz not null default now(),
 primary key(user_id,slide_id)
);
-- Cadastro automático do perfil pelo registro de Auth.
create or replace function public.training_create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.training_profiles(id,email,full_name) values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''))
 on conflict(id) do update set email=excluded.email;
 return new;
end;$$;
drop trigger if exists on_training_user_created on auth.users;
create trigger on_training_user_created after insert on auth.users for each row execute function public.training_create_profile();
revoke all on function public.training_create_profile() from public,anon,authenticated;
-- Restringe a função administrativa a leitura autenticada do próprio papel.
create or replace function public.training_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.training_admins where user_id=(select auth.uid()));
$$;
revoke all on function public.training_is_admin() from public,anon;
grant execute on function public.training_is_admin() to authenticated;
alter table public.training_profiles enable row level security;
alter table public.training_admins enable row level security;
alter table public.training_answers enable row level security;
alter table public.training_progress enable row level security;
create policy "Profile owner or admin reads" on public.training_profiles for select to authenticated using (id=(select auth.uid()) or (select public.training_is_admin()));
create policy "Admin role self read" on public.training_admins for select to authenticated using (user_id=(select auth.uid()));
create policy "Answer owner or admin reads" on public.training_answers for select to authenticated using (user_id=(select auth.uid()) or (select public.training_is_admin()));
create policy "Answer owner writes" on public.training_answers for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Answer owner updates" on public.training_answers for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Progress owner or admin reads" on public.training_progress for select to authenticated using(user_id=(select auth.uid()) or (select public.training_is_admin()));
create policy "Progress owner writes" on public.training_progress for insert to authenticated with check(user_id=(select auth.uid()));
grant select on public.training_profiles,public.training_admins to authenticated;
grant select,insert,update on public.training_answers to authenticated;
grant select,insert on public.training_progress to authenticated;
-- DEPOIS de criar e verificar o login do administrador, executar à parte,
-- substituindo o e-mail abaixo pelo e-mail REAL do administrador:
-- insert into public.training_admins(user_id)
-- select id from auth.users where email = 'ADMIN@EXEMPLO.COM'
-- on conflict do nothing;
