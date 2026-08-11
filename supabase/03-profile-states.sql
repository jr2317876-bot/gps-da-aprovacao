create table if not exists public.profile_states (
  profile_id uuid not null references public.study_profiles(id) on delete cascade,
  scope text not null check (scope in ('main', 'agenda', 'flashcards')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (profile_id, scope)
);

alter table public.profile_states enable row level security;

create policy "Estado pertence ao usuário"
on public.profile_states
for all
to authenticated
using (public.owns_profile(profile_id))
with check (public.owns_profile(profile_id));
