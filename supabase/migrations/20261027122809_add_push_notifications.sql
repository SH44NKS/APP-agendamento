create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "Usuário consulta as próprias inscrições push"
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "Usuário cria a própria inscrição push"
  on public.push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuário atualiza a própria inscrição push"
  on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuário remove a própria inscrição push"
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create table public.notificacoes_internas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  os_id uuid references public.ordens_servico(id) on delete set null,
  titulo text not null check (char_length(titulo) between 1 and 160),
  mensagem text not null check (char_length(mensagem) between 1 and 500),
  href text not null default '/tecnico',
  criado_em timestamptz not null default now(),
  lido_em timestamptz
);

create index notificacoes_internas_usuario_leitura_idx
  on public.notificacoes_internas(user_id, lido_em, criado_em desc);

alter table public.notificacoes_internas enable row level security;

create policy "Usuário consulta os próprios avisos"
  on public.notificacoes_internas for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "Administrador cria avisos internos"
  on public.notificacoes_internas for insert to authenticated
  with check (public.is_admin());

create policy "Usuário marca os próprios avisos como lidos"
  on public.notificacoes_internas for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Administrador remove avisos internos"
  on public.notificacoes_internas for delete to authenticated
  using (public.is_admin());
