create extension if not exists pgcrypto;

create table if not exists public.study_profiles (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, color text not null default '#0f8f77', current_topic text,
  target_score numeric(5,2) default 0, safety_margin numeric(5,2) default 0, daily_hours numeric(4,1) default 0,
  exam_date date, rotation_area text, rotation_start date, rotation_end date,
  rotation_boost integer default 40 check (rotation_boost between 0 and 100), created_at timestamptz not null default now()
);

create table if not exists public.bank_weights (
  profile_id uuid not null references public.study_profiles(id) on delete cascade,
  bank text not null check (bank in ('SES-PE','ENARE','SUS-SP','PSU-MG','USP-SP','USP-RP','UNICAMP','UNIFESP','IAMSPE')),
  weight integer not null default 0 check (weight between 0 and 100), primary key (profile_id, bank)
);

create table if not exists public.studied_topics (
  profile_id uuid not null references public.study_profiles(id) on delete cascade,
  topic_id text not null, studied_at timestamptz not null default now(), primary key (profile_id, topic_id)
);

create table if not exists public.question_logs (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.study_profiles(id) on delete cascade,
  topic_id text not null, area text not null, questions integer not null check (questions > 0),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100), performed_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.agenda_events (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.study_profiles(id) on delete cascade,
  topic_id text not null, event_date date not null, event_type text not null check (event_type in ('theory','questions','review','cards','rotation')),
  duration_minutes integer, question_count integer, position integer default 0, completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.study_profiles(id) on delete cascade,
  card_id text not null, rating text not null check (rating in ('dificil','medio','facil')),
  reviewed_at timestamptz not null default now(), next_review_at timestamptz not null, interval_days integer not null default 1
);

create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.study_profiles(id) on delete cascade,
  bank text not null, exam_year integer, performed_at date not null, correct_answers integer not null,
  total_questions integer not null check (total_questions > 0), raw_score numeric(5,2), adjusted_score numeric(5,2),
  created_at timestamptz not null default now(),
  constraint valid_exam_answers check (correct_answers >= 0 and correct_answers <= total_questions)
);
