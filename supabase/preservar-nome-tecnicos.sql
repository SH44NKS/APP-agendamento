-- Impede que novos logins com o Google sobrescrevam nomes editados pelo administrador.
-- O nome vindo do Google é usado somente na criação inicial do perfil.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, nome, email, papel)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    case
      when lower(new.email) = 'alissons.silva25@gmail.com'
        then 'admin'::papel_usuario
      else 'tecnico'::papel_usuario
    end
  )
  on conflict (id) do update
  set
    -- Mantém public.profiles.nome como foi definido pela administração.
    email = excluded.email,
    papel = case
      when lower(excluded.email) = 'alissons.silva25@gmail.com'
        then 'admin'::papel_usuario
      else public.profiles.papel
    end;

  return new;
end;
$$;

commit;
