alter table if exists users enable row level security;
alter table if exists user_profiles enable row level security;
alter table if exists macro_targets enable row level security;
alter table if exists daily_logs enable row level security;
alter table if exists meal_entries enable row level security;
alter table if exists meal_entry_items enable row level security;
alter table if exists daily_summaries enable row level security;
alter table if exists weights enable row level security;
alter table if exists foods enable row level security;

create unique index if not exists idx_macro_targets_user_effective_from
  on macro_targets(user_id, effective_from);

drop policy if exists "users select own" on users;
create policy "users select own"
  on users for select
  using (auth.uid() = id);

drop policy if exists "users insert own" on users;
create policy "users insert own"
  on users for insert
  with check (auth.uid() = id);

drop policy if exists "users update own" on users;
create policy "users update own"
  on users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles manage own" on user_profiles;
create policy "profiles manage own"
  on user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "macro targets manage own" on macro_targets;
create policy "macro targets manage own"
  on macro_targets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily logs manage own" on daily_logs;
create policy "daily logs manage own"
  on daily_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "meal entries manage through owned logs" on meal_entries;
create policy "meal entries manage through owned logs"
  on meal_entries for all
  using (
    exists (
      select 1
      from daily_logs
      where daily_logs.id = meal_entries.daily_log_id
        and daily_logs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from daily_logs
      where daily_logs.id = meal_entries.daily_log_id
        and daily_logs.user_id = auth.uid()
    )
  );

drop policy if exists "meal entry items manage through owned entries" on meal_entry_items;
create policy "meal entry items manage through owned entries"
  on meal_entry_items for all
  using (
    exists (
      select 1
      from meal_entries
      join daily_logs on daily_logs.id = meal_entries.daily_log_id
      where meal_entries.id = meal_entry_items.meal_entry_id
        and daily_logs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from meal_entries
      join daily_logs on daily_logs.id = meal_entries.daily_log_id
      where meal_entries.id = meal_entry_items.meal_entry_id
        and daily_logs.user_id = auth.uid()
    )
  );

drop policy if exists "daily summaries manage own" on daily_summaries;
create policy "daily summaries manage own"
  on daily_summaries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weights manage own" on weights;
create policy "weights manage own"
  on weights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "foods read all" on foods;
create policy "foods read all"
  on foods for select
  using (true);
