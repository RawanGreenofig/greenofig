-- Make meal-plan saving actually work. The builder, the API route, AND the
-- client viewer all consistently use these column names:
--   meal_plans:      client_id, nutritionist_id, start_date, weeks
--   meal_plan_items: plan_id, week_idx, day_idx, custom_name
-- ...but the base schema (migration 001) created different names
-- (user_id/created_by/week_start/week_end and meal_plan_id/day_of_week/
-- food_name), so EVERY meal-plan save failed with "column does not exist"
-- and the tables are empty platform-wide. This adds the columns the code
-- expects. Additive + tables empty → zero risk. The route also keeps
-- populating the legacy NOT-NULL columns (user_id, meal_plan_id) so the
-- existing RLS (which reads via user_id) still authorizes client reads.

alter table public.meal_plans
  add column if not exists client_id uuid references public.profiles(id) on delete cascade,
  add column if not exists nutritionist_id uuid references public.profiles(id) on delete set null,
  add column if not exists start_date date,
  add column if not exists weeks integer;

create index if not exists meal_plans_client_active on public.meal_plans (client_id, is_active);

alter table public.meal_plan_items
  add column if not exists plan_id uuid references public.meal_plans(id) on delete cascade,
  add column if not exists week_idx integer,
  add column if not exists day_idx integer,
  add column if not exists custom_name text;

create index if not exists meal_plan_items_plan on public.meal_plan_items (plan_id);
