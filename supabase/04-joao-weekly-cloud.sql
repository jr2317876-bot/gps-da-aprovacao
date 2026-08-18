-- Permite persistir o motor semanal exclusivo do perfil João em instalações
-- que já criaram profile_states com a restrição antiga de escopo.
alter table public.profile_states
  drop constraint if exists profile_states_scope_check;

alter table public.profile_states
  add constraint profile_states_scope_check
  check (scope in ('main', 'agenda', 'flashcards', 'joao_weekly_v1'));

-- Reaplica a proteção por usuário/perfil de forma idempotente.
alter table public.profile_states enable row level security;

drop policy if exists "Estado pertence ao usuário" on public.profile_states;
create policy "Estado pertence ao usuário"
on public.profile_states
for all
to authenticated
using (public.owns_profile(profile_id))
with check (public.owns_profile(profile_id));
