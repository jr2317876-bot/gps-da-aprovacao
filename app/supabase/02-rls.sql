alter table public.study_profiles enable row level security;
alter table public.bank_weights enable row level security;
alter table public.studied_topics enable row level security;
alter table public.question_logs enable row level security;
alter table public.agenda_events enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.mock_exams enable row level security;

create policy "Usuário administra os próprios perfis" on public.study_profiles for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.owns_profile(target_profile uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.study_profiles where id = target_profile and owner_id = auth.uid());
$$;
grant execute on function public.owns_profile(uuid) to authenticated;

create policy "Peso pertence ao usuário" on public.bank_weights for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "Assunto pertence ao usuário" on public.studied_topics for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "Questão pertence ao usuário" on public.question_logs for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "Agenda pertence ao usuário" on public.agenda_events for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "Revisão pertence ao usuário" on public.flashcard_reviews for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "Simulado pertence ao usuário" on public.mock_exams for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
