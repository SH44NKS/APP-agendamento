-- Foco & Escudo | banco completo do app de agendamentos
create extension if not exists pgcrypto;

do $$ begin create type tipo_servico as enum ('instalacao','retirada','manutencao'); exception when duplicate_object then null; end $$;
do $$ begin create type status_os as enum ('pendente','agendado','concluido','cancelado'); exception when duplicate_object then null; end $$;
do $$ begin create type papel_usuario as enum ('admin','tecnico'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel papel_usuario not null default 'tecnico',
  google_refresh_token text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Migração segura para bancos que já usavam a primeira versão do projeto.
-- CREATE TABLE IF NOT EXISTS preserva a tabela antiga, mas não cria colunas novas.
alter table public.profiles add column if not exists ativo boolean;
update public.profiles set ativo = true where ativo is null;
alter table public.profiles alter column ativo set default true;
alter table public.profiles alter column ativo set not null;

create table if not exists public.configuracoes (
  id boolean primary key default true check (id),
  alerta_amarelo_dias integer not null default 3 check (alerta_amarelo_dias >= 0),
  alerta_vermelho_dias integer not null default 7 check (alerta_vermelho_dias > alerta_amarelo_dias),
  duracao_servico_minutos integer not null default 60 check (duracao_servico_minutos between 15 and 480),
  atualizado_em timestamptz not null default now()
);
insert into public.configuracoes(id) values(true) on conflict do nothing;

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_servico not null,
  status status_os not null default 'pendente',
  cliente_nome text not null,
  veiculo_modelo text not null,
  veiculo_identificador text not null,
  telefone text,
  local text not null,
  tecnico_id uuid references public.profiles(id),
  consultor_nome text not null,
  observacoes text,
  data_hora_agendada timestamptz,
  google_event_id text,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em timestamptz,
  cancelado_em timestamptz
);
alter table public.ordens_servico add column if not exists observacoes text;
alter table public.ordens_servico add column if not exists criado_por uuid references public.profiles(id);
alter table public.ordens_servico add column if not exists cancelado_em timestamptz;
create index if not exists idx_os_tecnico on public.ordens_servico(tecnico_id);
create index if not exists idx_os_status on public.ordens_servico(status);
create index if not exists idx_os_criado on public.ordens_servico(criado_em desc);
create index if not exists idx_os_veiculo on public.ordens_servico(veiculo_identificador);

create table if not exists public.historico_os (
  id bigint generated always as identity primary key,
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  usuario_id uuid references public.profiles(id),
  acao text not null,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_historico_os on public.historico_os(os_id, criado_em desc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and papel = 'admin' and ativo);
$$;
create or replace function public.set_atualizado_em() returns trigger language plpgsql as $$ begin new.atualizado_em=now(); return new; end $$;
drop trigger if exists trg_os_atualizado on public.ordens_servico;
create trigger trg_os_atualizado before update on public.ordens_servico for each row execute function public.set_atualizado_em();

create or replace function public.registrar_historico_os() returns trigger language plpgsql security definer set search_path=public as $$
declare detalhes jsonb;
begin
  if tg_op='INSERT' then detalhes=jsonb_build_object('status_novo',new.status,'tecnico_novo',new.tecnico_id);
  else detalhes=jsonb_strip_nulls(jsonb_build_object('status_anterior',old.status,'status_novo',new.status,'tecnico_anterior',old.tecnico_id,'tecnico_novo',new.tecnico_id,'data_hora_agendada',new.data_hora_agendada)); end if;
  insert into public.historico_os(os_id,usuario_id,acao,detalhes) values(new.id,auth.uid(),lower(tg_op),detalhes);
  return new;
end $$;
drop trigger if exists trg_historico_os on public.ordens_servico;
create trigger trg_historico_os after insert or update on public.ordens_servico for each row execute function public.registrar_historico_os();

alter table public.profiles enable row level security;
alter table public.configuracoes enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.historico_os enable row level security;
-- Remove também as políticas da primeira versão para evitar duplicidade e
-- recursão na leitura de profiles.
drop policy if exists "usuario ve o proprio perfil ou admin ve todos" on public.profiles;
drop policy if exists "tecnico ve suas OS, admin ve todas" on public.ordens_servico;
drop policy if exists "tecnico atualiza suas OS, admin atualiza todas" on public.ordens_servico;
drop policy if exists "somente admin cria OS" on public.ordens_servico;
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using(id=auth.uid() or public.is_admin());
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update using(public.is_admin()) with check(public.is_admin());
drop policy if exists "config_select" on public.configuracoes;
create policy "config_select" on public.configuracoes for select to authenticated using(true);
drop policy if exists "config_admin" on public.configuracoes;
create policy "config_admin" on public.configuracoes for update using(public.is_admin()) with check(public.is_admin());
drop policy if exists "os_select" on public.ordens_servico;
create policy "os_select" on public.ordens_servico for select using(public.is_admin() or tecnico_id=auth.uid());
drop policy if exists "os_insert" on public.ordens_servico;
create policy "os_insert" on public.ordens_servico for insert with check(public.is_admin());
drop policy if exists "os_update" on public.ordens_servico;
create policy "os_update" on public.ordens_servico for update using(public.is_admin() or tecnico_id=auth.uid()) with check(public.is_admin() or tecnico_id=auth.uid());
drop policy if exists "historico_select" on public.historico_os;
create policy "historico_select" on public.historico_os for select using(public.is_admin() or exists(select 1 from public.ordens_servico o where o.id=os_id and o.tecnico_id=auth.uid()));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,nome,email) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email),new.email) on conflict(id) do update set nome=excluded.nome,email=excluded.email; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update on auth.users for each row execute function public.handle_new_user();

grant execute on function public.is_admin() to authenticated;
create or replace function public.salvar_google_refresh_token(token text) returns void language sql security definer set search_path=public as $$
  update public.profiles set google_refresh_token=token where id=auth.uid();
$$;
grant execute on function public.salvar_google_refresh_token(text) to authenticated;
