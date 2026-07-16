create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  timezone text not null default 'America/Moncton',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  sex text,
  birth_year int,
  height_cm numeric(5,2),
  activity_level text,
  goal_type text not null default 'fat_loss',
  goal_rate_per_week numeric(5,2),
  start_weight_kg numeric(6,2),
  goal_weight_kg numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists macro_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  effective_from date not null,
  effective_to date,
  calories int not null,
  protein_g int not null,
  carbs_g int not null,
  fat_g int not null,
  fiber_g int,
  created_at timestamptz not null default now()
);

create table if not exists foods (
  id text primary key,
  name text not null,
  brand text,
  serving_label text not null,
  serving_size_g numeric(8,2),
  calories int not null,
  protein_g numeric(8,2) not null,
  carbs_g numeric(8,2) not null,
  fat_g numeric(8,2) not null,
  fiber_g numeric(8,2),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  logged_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, logged_on)
);

create table if not exists meal_entries (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  meal_slot text not null,
  logged_at timestamptz not null default now(),
  title text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists meal_entry_items (
  id uuid primary key default gen_random_uuid(),
  meal_entry_id uuid not null references meal_entries(id) on delete cascade,
  food_source text not null default 'foods',
  food_id text not null,
  quantity numeric(8,2) not null,
  unit text not null default 'serving',
  sort_order int not null default 0
);

create table if not exists daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  logged_on date not null,
  calories int not null default 0,
  protein_g numeric(8,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  fiber_g numeric(8,2) not null default 0,
  calorie_target int,
  protein_target_g int,
  carb_target_g int,
  fat_target_g int,
  adherence_score numeric(5,2),
  computed_at timestamptz not null default now(),
  unique(user_id, logged_on)
);

create table if not exists weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  logged_on date not null,
  weight_kg numeric(6,2) not null,
  source text not null default 'manual',
  note text,
  created_at timestamptz not null default now(),
  unique(user_id, logged_on)
);

create index if not exists idx_macro_targets_user_id on macro_targets(user_id);
create index if not exists idx_daily_logs_user_id on daily_logs(user_id);
create index if not exists idx_meal_entries_daily_log_id on meal_entries(daily_log_id);
create index if not exists idx_meal_entry_items_meal_entry_id on meal_entry_items(meal_entry_id);
create index if not exists idx_daily_summaries_user_id on daily_summaries(user_id);
create index if not exists idx_weights_user_id on weights(user_id);
