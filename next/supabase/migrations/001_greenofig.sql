-- ============================================================================
-- Greenofig — Initial Schema (001)
-- Run this in the Supabase SQL editor as a privileged role.
-- ============================================================================

-- Required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
do $$ begin
  create type user_role as enum ('admin', 'nutritionist', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_tier as enum ('free', 'basic', 'premium', 'vip');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'pending', 'processing', 'shipped',
    'delivered', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum (
    'pending', 'confirmed', 'cancelled', 'completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_type as enum ('article', 'tip', 'recipe', 'announcement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type milestone_type as enum (
    'weight_loss', 'weight_gain', 'energy',
    'goal_reached', 'streak', 'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('sent', 'delivered', 'read');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum (
    'booking', 'order', 'message', 'community',
    'reminder', 'system'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type api_provider as enum (
    'anthropic', 'supabase', 'stripe', 'google', 'custom'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- PROFILES (extends auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role user_role not null default 'user',
  tier user_tier not null default 'free',
  full_name text,
  avatar_url text,
  phone text,
  date_of_birth date,
  gender text,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  dietary_preferences text[] default '{}',
  allergies text[] default '{}',
  health_conditions text[] default '{}',
  activity_level text,
  primary_goal text,
  medical_notes text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'ar')),
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ============================================================================
-- HELPER FUNCTIONS  (security definer — used by RLS policies)
-- Defined AFTER profiles so the SQL bodies bind cleanly.
-- ============================================================================
create or replace function public.get_my_role()
returns user_role
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.get_my_tier()
returns user_tier
language sql
security definer
set search_path = public
as $$
  select tier from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (
    auth.uid() = id
    or get_my_role() in ('admin', 'nutritionist')
  );

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (auth.uid() = id or get_my_role() = 'admin')
  with check (auth.uid() = id or get_my_role() = 'admin');

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row when a new auth.user is added
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier user_tier not null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "subs_select_own_or_admin" on public.subscriptions;
create policy "subs_select_own_or_admin"
  on public.subscriptions for select
  using (auth.uid() = user_id or get_my_role() = 'admin');
drop policy if exists "subs_admin_write" on public.subscriptions;
create policy "subs_admin_write"
  on public.subscriptions for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- ============================================================================
-- NUTRITION LOGS
-- ============================================================================
create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type text,
  food_name text not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  serving_size text,
  source text,
  scanner_image_url text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.nutrition_logs enable row level security;
drop policy if exists "nl_select_own_or_staff" on public.nutrition_logs;
create policy "nl_select_own_or_staff"
  on public.nutrition_logs for select
  using (auth.uid() = user_id or get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "nl_write_own" on public.nutrition_logs;
create policy "nl_write_own"
  on public.nutrition_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- PROGRESS ENTRIES
-- ============================================================================
create table if not exists public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  weight_kg numeric,
  body_fat_percent numeric,
  muscle_mass_kg numeric,
  waist_cm numeric,
  water_intake_ml numeric,
  sleep_hours numeric,
  energy_level smallint check (energy_level between 1 and 10),
  mood smallint check (mood between 1 and 10),
  steps integer,
  notes text,
  photo_urls text[] default '{}',
  created_at timestamptz not null default now()
);
alter table public.progress_entries enable row level security;
drop policy if exists "pe_select_own_or_staff" on public.progress_entries;
create policy "pe_select_own_or_staff"
  on public.progress_entries for select
  using (auth.uid() = user_id or get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "pe_write_own" on public.progress_entries;
create policy "pe_write_own"
  on public.progress_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- HABIT LOGS
-- ============================================================================
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_type text not null,
  habit_name text,
  value numeric,
  unit text,
  logged_at timestamptz not null default now(),
  notes text
);
alter table public.habit_logs enable row level security;
drop policy if exists "hl_select_own_or_staff" on public.habit_logs;
create policy "hl_select_own_or_staff"
  on public.habit_logs for select
  using (auth.uid() = user_id or get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "hl_write_own" on public.habit_logs;
create policy "hl_write_own"
  on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- MEAL PLANS
-- ============================================================================
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id),
  title text not null,
  description text,
  week_start date,
  week_end date,
  target_calories numeric,
  target_protein_g numeric,
  target_carbs_g numeric,
  target_fat_g numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.meal_plans enable row level security;
drop policy if exists "mp_select" on public.meal_plans;
create policy "mp_select"
  on public.meal_plans for select
  using (auth.uid() = user_id or get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "mp_staff_write" on public.meal_plans;
create policy "mp_staff_write"
  on public.meal_plans for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));

create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  meal_type text,
  recipe_id uuid,
  food_name text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  serving_size text,
  notes text,
  sort_order int default 0
);
alter table public.meal_plan_items enable row level security;
drop policy if exists "mpi_select" on public.meal_plan_items;
create policy "mpi_select"
  on public.meal_plan_items for select
  using (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_id
        and (mp.user_id = auth.uid() or get_my_role() in ('admin', 'nutritionist'))
    )
  );
drop policy if exists "mpi_staff_write" on public.meal_plan_items;
create policy "mpi_staff_write"
  on public.meal_plan_items for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));

-- ============================================================================
-- RECIPES
-- ============================================================================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id),
  title text not null,
  title_ar text,
  description text,
  description_ar text,
  image_url text,
  prep_time_minutes int,
  cook_time_minutes int,
  servings int,
  difficulty text,
  calories_per_serving numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  ingredients jsonb default '[]'::jsonb,
  instructions jsonb default '[]'::jsonb,
  tags text[] default '{}',
  dietary_tags text[] default '{}',
  is_published boolean not null default false,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.recipes enable row level security;
drop policy if exists "rec_select_published_or_staff" on public.recipes;
create policy "rec_select_published_or_staff"
  on public.recipes for select
  using (is_published or get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "rec_staff_write" on public.recipes;
create policy "rec_staff_write"
  on public.recipes for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));

-- ============================================================================
-- MILESTONES
-- ============================================================================
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type milestone_type not null,
  title text,
  description text,
  value_before numeric,
  value_after numeric,
  unit text,
  photo_url text,
  is_shared boolean not null default false,
  is_approved boolean not null default true,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.milestones enable row level security;
drop policy if exists "ms_select_shared_or_own_or_staff" on public.milestones;
create policy "ms_select_shared_or_own_or_staff"
  on public.milestones for select
  using (
    (is_shared and is_approved)
    or auth.uid() = user_id
    or get_my_role() in ('admin', 'nutritionist')
  );
drop policy if exists "ms_write_own" on public.milestones;
create policy "ms_write_own"
  on public.milestones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- POSTS
-- ============================================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id),
  type post_type not null default 'article',
  title text not null,
  title_ar text,
  content text,
  content_ar text,
  image_url text,
  tags text[] default '{}',
  is_published boolean not null default false,
  scheduled_at timestamptz,
  published_at timestamptz,
  views int not null default 0,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.posts enable row level security;
drop policy if exists "posts_select_published_or_staff" on public.posts;
create policy "posts_select_published_or_staff"
  on public.posts for select
  using (is_published or get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "posts_staff_write" on public.posts;
create policy "posts_staff_write"
  on public.posts for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));

-- ============================================================================
-- BOOKINGS
-- ============================================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nutritionist_id uuid references public.profiles(id),
  status appointment_status not null default 'pending',
  scheduled_at timestamptz not null,
  duration_minutes int not null default 30,
  type text,
  meeting_url text,
  notes text,
  client_notes text,
  nutritionist_notes text,
  stripe_payment_intent_id text,
  amount_cents int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
drop policy if exists "bk_select_party_or_admin" on public.bookings;
create policy "bk_select_party_or_admin"
  on public.bookings for select
  using (
    auth.uid() = user_id
    or auth.uid() = nutritionist_id
    or get_my_role() = 'admin'
  );
drop policy if exists "bk_user_insert" on public.bookings;
create policy "bk_user_insert"
  on public.bookings for insert
  with check (auth.uid() = user_id);
drop policy if exists "bk_party_update" on public.bookings;
create policy "bk_party_update"
  on public.bookings for update
  using (auth.uid() = user_id or auth.uid() = nutritionist_id or get_my_role() = 'admin')
  with check (auth.uid() = user_id or auth.uid() = nutritionist_id or get_my_role() = 'admin');

-- ============================================================================
-- CONVERSATIONS + MESSAGES
-- ============================================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nutritionist_id uuid references public.profiles(id),
  last_message_at timestamptz default now(),
  user_unread int not null default 0,
  nutritionist_unread int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.conversations enable row level security;
drop policy if exists "conv_select_party_or_admin" on public.conversations;
create policy "conv_select_party_or_admin"
  on public.conversations for select
  using (
    auth.uid() = user_id
    or auth.uid() = nutritionist_id
    or get_my_role() = 'admin'
  );
drop policy if exists "conv_party_write" on public.conversations;
create policy "conv_party_write"
  on public.conversations for all
  using (auth.uid() = user_id or auth.uid() = nutritionist_id or get_my_role() = 'admin')
  with check (auth.uid() = user_id or auth.uid() = nutritionist_id or get_my_role() = 'admin');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  content text not null,
  status message_status not null default 'sent',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
drop policy if exists "msg_select_party_or_admin" on public.messages;
create policy "msg_select_party_or_admin"
  on public.messages for select
  using (
    auth.uid() = sender_id
    or auth.uid() = recipient_id
    or get_my_role() = 'admin'
  );
drop policy if exists "msg_sender_insert" on public.messages;
create policy "msg_sender_insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);
drop policy if exists "msg_recipient_update" on public.messages;
create policy "msg_recipient_update"
  on public.messages for update
  using (auth.uid() = recipient_id);

-- ============================================================================
-- CLIENT NOTES (private — never to client)
-- ============================================================================
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_notes enable row level security;
-- IMPORTANT: client_id is NEVER allowed to read these.
drop policy if exists "cn_staff_only_select" on public.client_notes;
create policy "cn_staff_only_select"
  on public.client_notes for select
  using (get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "cn_staff_only_write" on public.client_notes;
create policy "cn_staff_only_write"
  on public.client_notes for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));

-- ============================================================================
-- PRODUCTS + ORDERS + COUPONS
-- ============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  slug text unique not null,
  description text,
  description_ar text,
  short_description text,
  short_description_ar text,
  image_url text,
  gallery_urls text[] default '{}',
  price_cents int not null default 0,
  compare_price_cents int,
  category text,
  tags text[] default '{}',
  nutritionist_note text,
  nutritionist_note_ar text,
  is_nutritionist_pick boolean not null default false,
  is_bestseller boolean not null default false,
  is_new boolean not null default false,
  stock_quantity int not null default 0,
  is_active boolean not null default true,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "prod_select_active_or_staff" on public.products;
create policy "prod_select_active_or_staff"
  on public.products for select
  using (is_active or get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "prod_staff_write" on public.products;
create policy "prod_staff_write"
  on public.products for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status order_status not null default 'pending',
  items jsonb not null default '[]'::jsonb,
  subtotal_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null default 0,
  stripe_payment_intent_id text,
  stripe_session_id text,
  coupon_code text,
  shipping_address jsonb,
  tracking_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists "ord_select_own_or_admin" on public.orders;
create policy "ord_select_own_or_admin"
  on public.orders for select
  using (auth.uid() = user_id or get_my_role() = 'admin');
drop policy if exists "ord_user_insert" on public.orders;
create policy "ord_user_insert"
  on public.orders for insert
  with check (auth.uid() = user_id);
drop policy if exists "ord_admin_update" on public.orders;
create policy "ord_admin_update"
  on public.orders for update
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text,
  value numeric,
  min_order_cents int,
  max_uses int,
  times_used int not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  applicable_tiers user_tier[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
drop policy if exists "coup_select_active_or_admin" on public.coupons;
create policy "coup_select_active_or_admin"
  on public.coupons for select
  using (is_active or get_my_role() = 'admin');
drop policy if exists "coup_admin_write" on public.coupons;
create policy "coup_admin_write"
  on public.coupons for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- ============================================================================
-- AI CONVERSATIONS + RESEARCH DESK
-- ============================================================================
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ai_conversations enable row level security;
drop policy if exists "aic_select_own_or_admin" on public.ai_conversations;
create policy "aic_select_own_or_admin"
  on public.ai_conversations for select
  using (auth.uid() = user_id or get_my_role() = 'admin');
drop policy if exists "aic_user_write" on public.ai_conversations;
create policy "aic_user_write"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.research_documents (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.profiles(id),
  filename text not null,
  file_url text not null,
  file_size_bytes bigint,
  content_summary text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.research_documents enable row level security;
drop policy if exists "rd_staff_only" on public.research_documents;
create policy "rd_staff_only"
  on public.research_documents for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));

create table if not exists public.research_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  document_ids uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.research_conversations enable row level security;
drop policy if exists "rc_staff_only" on public.research_conversations;
create policy "rc_staff_only"
  on public.research_conversations for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null default 'system',
  title text not null,
  title_ar text,
  body text,
  body_ar text,
  data jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "notif_select_own_or_admin" on public.notifications;
create policy "notif_select_own_or_admin"
  on public.notifications for select
  using (auth.uid() = user_id or get_my_role() = 'admin');
drop policy if exists "notif_user_update" on public.notifications;
create policy "notif_user_update"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "notif_admin_insert" on public.notifications;
create policy "notif_admin_insert"
  on public.notifications for insert
  with check (get_my_role() in ('admin', 'nutritionist'));

-- ============================================================================
-- PLATFORM SETTINGS
-- ============================================================================
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  value_ar jsonb,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
drop policy if exists "ps_read_all_authenticated" on public.platform_settings;
create policy "ps_read_all_authenticated"
  on public.platform_settings for select
  using (auth.role() = 'authenticated');
drop policy if exists "ps_admin_write" on public.platform_settings;
create policy "ps_admin_write"
  on public.platform_settings for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

insert into public.platform_settings(key, value, description) values
  ('store_enabled', 'true'::jsonb, 'Global store on/off'),
  ('store_enabled_tiers', '["free","basic","premium","vip"]'::jsonb, 'Tiers with store access'),
  ('booking_enabled', 'true'::jsonb, 'Booking system on/off'),
  ('scanner_enabled', 'true'::jsonb, 'Food scanner on/off'),
  ('community_enabled', 'true'::jsonb, 'Community on/off'),
  ('ai_chat_enabled', 'true'::jsonb, 'AI chatbot on/off'),
  ('research_desk_enabled', 'true'::jsonb, 'Research desk on/off'),
  ('maintenance_mode', 'false'::jsonb, 'Maintenance mode'),
  ('free_tier_scanner_limit', '3'::jsonb, 'Free daily scans'),
  ('booking_price_cents', '5000'::jsonb, 'Default consult price'),
  ('site_announcement', 'null'::jsonb, 'Global announcement'),
  ('currency', '"SAR"'::jsonb, 'Store currency'),
  ('member_discount_percent', '10'::jsonb, 'Premium+ discount')
on conflict (key) do nothing;

-- ============================================================================
-- API KEYS (admin only — never display full key)
-- ============================================================================
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  provider api_provider not null,
  name text,
  key_preview text,                  -- last 4 chars only
  encrypted_key text not null,       -- encrypted via pgcrypto / KMS
  is_active boolean not null default true,
  environment text default 'production',
  last_tested_at timestamptz,
  last_test_status text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.api_keys enable row level security;
drop policy if exists "ak_admin_only" on public.api_keys;
create policy "ak_admin_only"
  on public.api_keys for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- ============================================================================
-- AUDIT LOG (admin only)
-- ============================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_role user_role,
  action text not null,
  resource_type text,
  resource_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
drop policy if exists "al_admin_only" on public.audit_log;
create policy "al_admin_only"
  on public.audit_log for select
  using (get_my_role() = 'admin');
drop policy if exists "al_authenticated_insert" on public.audit_log;
create policy "al_authenticated_insert"
  on public.audit_log for insert
  with check (auth.role() = 'authenticated');

-- ============================================================================
-- MODERATION FLAGS
-- ============================================================================
create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  flagged_by uuid references public.profiles(id),
  reason text,
  status text default 'open',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.moderation_flags enable row level security;
drop policy if exists "mf_staff_only" on public.moderation_flags;
create policy "mf_staff_only"
  on public.moderation_flags for all
  using (get_my_role() in ('admin', 'nutritionist'))
  with check (get_my_role() in ('admin', 'nutritionist'));
drop policy if exists "mf_user_insert" on public.moderation_flags;
create policy "mf_user_insert"
  on public.moderation_flags for insert
  with check (auth.role() = 'authenticated');

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature text unique not null,
  enabled_for_tiers user_tier[] not null default '{}',
  is_globally_enabled boolean not null default true,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
drop policy if exists "ff_read_all_authenticated" on public.feature_flags;
create policy "ff_read_all_authenticated"
  on public.feature_flags for select
  using (auth.role() = 'authenticated');
drop policy if exists "ff_admin_write" on public.feature_flags;
create policy "ff_admin_write"
  on public.feature_flags for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

insert into public.feature_flags(feature, enabled_for_tiers, is_globally_enabled, description) values
  ('food_scanner',         array['basic','premium','vip']::user_tier[], true, 'AI food scanner'),
  ('food_scanner_free',    array['free']::user_tier[], true, 'Limited free scanner 3/day'),
  ('meal_plans',           array['premium','vip']::user_tier[], true, 'Personalized meal plans'),
  ('nutrition_tracking',   array['basic','premium','vip']::user_tier[], true, 'Daily logging'),
  ('progress_charts',      array['basic','premium','vip']::user_tier[], true, 'Progress tracking'),
  ('milestone_sharing',    array['basic','premium','vip']::user_tier[], true, 'Share milestones'),
  ('community_feed',       array['free','basic','premium','vip']::user_tier[], true, 'Community feed'),
  ('direct_messaging',     array['vip']::user_tier[], true, 'Message nutritionist'),
  ('ai_chatbot',           array['premium','vip']::user_tier[], true, 'AI nutrition chatbot'),
  ('ai_chatbot_priority',  array['vip']::user_tier[], true, 'Priority AI'),
  ('store_access',         array['free','basic','premium','vip']::user_tier[], true, 'Store'),
  ('store_discount',       array['premium','vip']::user_tier[], true, 'Member discounts'),
  ('bookings',             array['free','basic','premium','vip']::user_tier[], true, 'Consultations'),
  ('recipe_library',       array['basic','premium','vip']::user_tier[], true, 'Recipes'),
  ('educational_content',  array['free','basic','premium','vip']::user_tier[], true, 'Articles'),
  ('advanced_analytics',   array['premium','vip']::user_tier[], true, 'Analytics'),
  ('supplement_tracking',  array['basic','premium','vip']::user_tier[], true, 'Supplements'),
  ('water_tracking',       array['basic','premium','vip']::user_tier[], true, 'Water'),
  ('sleep_tracking',       array['premium','vip']::user_tier[], true, 'Sleep'),
  ('shopping_list',        array['premium','vip']::user_tier[], true, 'Shopping list')
on conflict (feature) do nothing;

-- ============================================================================
-- INDEXES
-- ============================================================================
create index if not exists idx_nutrition_logs_user_logged on public.nutrition_logs(user_id, logged_at desc);
create index if not exists idx_progress_user_recorded on public.progress_entries(user_id, recorded_at desc);
create index if not exists idx_bookings_user on public.bookings(user_id, scheduled_at desc);
create index if not exists idx_bookings_nutritionist on public.bookings(nutritionist_id, scheduled_at desc);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at desc);
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_milestones_shared on public.milestones(is_shared, is_approved, created_at desc);
create index if not exists idx_posts_published on public.posts(is_published, published_at desc);
create index if not exists idx_audit_actor on public.audit_log(actor_id, created_at desc);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);
