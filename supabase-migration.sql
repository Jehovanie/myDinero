-- ============================================================================
-- SCHÉMA SUPABASE — Application de gestion de budget (basé sur ton diagramme)
-- ============================================================================
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Remplace entièrement le script précédent (supabase_schema.sql)
-- ============================================================================

create extension if not exists "pgcrypto"; -- pour gen_random_uuid()

-- ============================================================================
-- 1. USERS — infos complémentaires liées à auth.users
-- ============================================================================
-- ⚠️ Le mot de passe N'EST PAS stocké ici : Supabase Auth le gère déjà de
-- façon sécurisée (hashé) dans auth.users. On ne duplique jamais ça.

create table if not exists public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  email text,
  created_at timestamptz not null default now()
);

-- Création automatique de la ligne "users" à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (user_id, nom, email)
  values (new.id, new.raw_user_meta_data->>'nom', new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. INCOMES — revenus
-- ============================================================================

create table if not exists public.incomes (
  income_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  source text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  transaction_month date not null default (date_trunc('month', now())::date),
  created_at timestamptz not null default now(),
  check (transaction_month = date_trunc('month', transaction_month)::date)
);

create index if not exists idx_incomes_user_id on public.incomes(user_id);
create index if not exists idx_incomes_transaction_month on public.incomes(user_id, transaction_month);

-- ============================================================================
-- 3. CATEGORIE_EXPENSES — catégories de dépenses + budget cible mensuel
-- ============================================================================
-- (user_id ajouté pour que chacun ait ses propres catégories/budgets)

create table if not exists public.categorie_expenses (
  categorie_expense_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  name text not null,
  target_monthly_budget numeric(12,2) not null default 0 check (target_monthly_budget >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_categorie_expenses_user_id on public.categorie_expenses(user_id);

-- ============================================================================
-- 4. SAVING_GOALS — objectifs d'épargne
-- ============================================================================
-- (créée avant "savings" car savings y fait référence)

create table if not exists public.saving_goals (
  saving_goal_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  nom text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  target_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_saving_goals_user_id on public.saving_goals(user_id);

-- ============================================================================
-- 5. EXPENSES — dépenses
-- ============================================================================

create table if not exists public.expenses (
  expense_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  categorie_expense_id uuid references public.categorie_expenses(categorie_expense_id) on delete set null,
  type text not null check (type in ('fix', 'variable')),
  description text,
  amount numeric(12,2) not null check (amount > 0),
  transaction_month date not null default (date_trunc('month', now())::date),
  created_at timestamptz not null default now(),
  check (transaction_month = date_trunc('month', transaction_month)::date)
);

create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_categorie_id on public.expenses(categorie_expense_id);
create index if not exists idx_expenses_transaction_month on public.expenses(user_id, transaction_month);

-- ============================================================================
-- 6. SAVINGS — versements d'épargne (liés ou non à un objectif)
-- ============================================================================

create table if not exists public.savings (
  saving_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  saving_goal_id uuid references public.saving_goals(saving_goal_id) on delete set null,
  transaction_month date not null default (date_trunc('month', now())::date),
  description text,
  created_at timestamptz not null default now(),
  check (transaction_month = date_trunc('month', transaction_month)::date)
);

create index if not exists idx_savings_user_id on public.savings(user_id);
create index if not exists idx_savings_goal_id on public.savings(saving_goal_id);
create index if not exists idx_savings_transaction_month on public.savings(user_id, transaction_month);

-- ============================================================================
-- 7. ROW LEVEL SECURITY — chacun ne voit / modifie que ses propres données
-- ============================================================================

alter table public.users enable row level security;
alter table public.incomes enable row level security;
alter table public.categorie_expenses enable row level security;
alter table public.saving_goals enable row level security;
alter table public.expenses enable row level security;
alter table public.savings enable row level security;

-- users
create policy "users_select_own" on public.users
  for select using (auth.uid() = user_id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = user_id);

-- incomes
create policy "incomes_all_own" on public.incomes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- categorie_expenses
create policy "categorie_expenses_all_own" on public.categorie_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saving_goals
create policy "saving_goals_all_own" on public.saving_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- expenses
create policy "expenses_all_own" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- savings
create policy "savings_all_own" on public.savings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 8. VUES PRATIQUES POUR L'APP
-- ============================================================================

-- Budget vs dépenses réelles, par catégorie et par mois
create or replace view public.expense_budget_vs_actual
  with (security_invoker = true) as
select
  ce.categorie_expense_id,
  ce.user_id,
  ce.name as category_name,
  ce.target_monthly_budget,
  coalesce(e.transaction_month, date_trunc('month', e.created_at)::date) as month,
  coalesce(sum(e.amount), 0) as spent_amount,
  ce.target_monthly_budget - coalesce(sum(e.amount), 0) as remaining_amount
from public.categorie_expenses ce
left join public.expenses e
  on e.categorie_expense_id = ce.categorie_expense_id
  and e.user_id = ce.user_id
group by ce.categorie_expense_id, ce.user_id, ce.name, ce.target_monthly_budget,
         coalesce(e.transaction_month, date_trunc('month', e.created_at)::date);

-- Progression de chaque objectif d'épargne
create or replace view public.saving_goals_progress
  with (security_invoker = true) as
select
  sg.saving_goal_id,
  sg.user_id,
  sg.nom,
  sg.target_amount,
  sg.target_date,
  coalesce(sum(s.amount), 0) as saved_amount,
  sg.target_amount - coalesce(sum(s.amount), 0) as remaining_amount,
  round(100.0 * coalesce(sum(s.amount), 0) / sg.target_amount, 1) as progress_percent
from public.saving_goals sg
left join public.savings s on s.saving_goal_id = sg.saving_goal_id
group by sg.saving_goal_id, sg.user_id, sg.nom, sg.target_amount, sg.target_date;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

-- ============================================================================
-- MIGRATION — Catégories par défaut (revenus + dépenses) avec icônes/couleurs
-- ============================================================================
-- À exécuter APRÈS supabase_schema_final.sql, dans Supabase Dashboard > SQL Editor.
--
-- Pourquoi cette migration :
--   1. categorie_expenses n'avait pas de colonnes icon/color -> on les ajoute.
--   2. Il n'existait pas de catégories pour les revenus (incomes n'a qu'un
--      champ "source" en texte libre) -> on crée categorie_incomes et on relie
--      incomes à cette table, SANS toucher au champ "source" existant.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ajout des colonnes icon / color sur categorie_expenses
-- ----------------------------------------------------------------------------

alter table public.categorie_expenses
  add column if not exists icon text,
  add column if not exists color text;

-- ----------------------------------------------------------------------------
-- 2. Nouvelle table categorie_incomes (même esprit que categorie_expenses)
-- ----------------------------------------------------------------------------

create table if not exists public.categorie_incomes (
  categorie_income_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  name text not null,
  icon text,
  color text,
  created_at timestamptz not null default now()
);

create index if not exists idx_categorie_incomes_user_id on public.categorie_incomes(user_id);

alter table public.categorie_incomes enable row level security;

create policy "categorie_incomes_all_own" on public.categorie_incomes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Lien entre incomes et categorie_incomes (en plus du champ "source")
-- ----------------------------------------------------------------------------

alter table public.incomes
  add column if not exists categorie_income_id uuid
    references public.categorie_incomes(categorie_income_id) on delete set null;

create index if not exists idx_incomes_categorie_id on public.incomes(categorie_income_id);

-- ----------------------------------------------------------------------------
-- 4. Fonction réutilisable : crée les catégories par défaut pour UN user_id
-- ----------------------------------------------------------------------------

create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.categorie_incomes (user_id, name, icon, color) values
    (p_user_id, 'Salaire',         'briefcase-outline',     '#4CAF50'),
    (p_user_id, 'Freelance',       'laptop-outline',        '#66BB6A'),
    (p_user_id, 'Investissements', 'trending-up-outline',   '#81C784'),
    (p_user_id, 'Cadeaux',         'gift-outline',          '#A5D6A7'),
    (p_user_id, 'Autre revenu',    'add-circle-outline',    '#C8E6C9');

  insert into public.categorie_expenses (user_id, name, icon, color) values
    (p_user_id, 'Alimentation',  'cart-outline',          '#FF7043'),
    (p_user_id, 'Transport',     'bus-outline',           '#FF8A65'),
    (p_user_id, 'Logement',      'home-outline',          '#FFAB91'),
    (p_user_id, 'Loisirs',       'film-outline',          '#EF5350'),
    (p_user_id, 'Santé',         'fitness-outline',       '#E57373'),
    (p_user_id, 'Éducation',     'book-outline',          '#F44336'),
    (p_user_id, 'Shopping',      'bag-handle-outline',    '#D32F2F'),
    (p_user_id, 'Factures',      'flash-outline',         '#FF5252'),
    (p_user_id, 'Autre dépense', 'remove-circle-outline', '#FF8A80');
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Le trigger d'inscription appelle maintenant ce seed automatiquement
-- ----------------------------------------------------------------------------
-- (on redéfinit handle_new_user ; le trigger on_auth_user_created existant
-- pointe déjà vers cette fonction, pas besoin de le recréer)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (user_id, nom, email)
  values (new.id, new.raw_user_meta_data->>'nom', new.email);

  perform public.seed_default_categories(new.id);

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Rattrapage pour les comptes déjà existants (avant cette migration)
-- ----------------------------------------------------------------------------
-- Ne seede que les users qui n'ont encore AUCUNE catégorie, pour éviter les
-- doublons si tu relances ce script par erreur.

do $$
declare
  u record;
begin
  for u in
    select user_id from public.users
    where user_id not in (select distinct user_id from public.categorie_expenses)
      and user_id not in (select distinct user_id from public.categorie_incomes)
  loop
    perform public.seed_default_categories(u.user_id);
  end loop;
end;
$$;

-- ============================================================================
-- MIGRATION — Liaison revenus / dépenses à un mois (transaction_month)
-- ============================================================================
-- Chaque revenu et chaque dépense est rattaché au 1er jour du mois concerné
-- (ex. 2025-06-01 pour juin 2025). Permet le filtrage et l'historique mensuel.

alter table public.incomes
  add column if not exists transaction_month date;

alter table public.expenses
  add column if not exists transaction_month date;

update public.incomes
set transaction_month = date_trunc('month', created_at)::date
where transaction_month is null;

update public.expenses
set transaction_month = date_trunc('month', created_at)::date
where transaction_month is null;

alter table public.incomes
  alter column transaction_month set default (date_trunc('month', now())::date),
  alter column transaction_month set not null;

alter table public.expenses
  alter column transaction_month set default (date_trunc('month', now())::date),
  alter column transaction_month set not null;

alter table public.incomes
  drop constraint if exists incomes_transaction_month_first_day;
alter table public.incomes
  add constraint incomes_transaction_month_first_day
  check (transaction_month = date_trunc('month', transaction_month)::date);

alter table public.expenses
  drop constraint if exists expenses_transaction_month_first_day;
alter table public.expenses
  add constraint expenses_transaction_month_first_day
  check (transaction_month = date_trunc('month', transaction_month)::date);

create index if not exists idx_incomes_transaction_month
  on public.incomes(user_id, transaction_month);
create index if not exists idx_expenses_transaction_month
  on public.expenses(user_id, transaction_month);

create or replace view public.expense_budget_vs_actual
  with (security_invoker = true) as
select
  ce.categorie_expense_id,
  ce.user_id,
  ce.name as category_name,
  ce.target_monthly_budget,
  e.transaction_month as month,
  coalesce(sum(e.amount), 0) as spent_amount,
  ce.target_monthly_budget - coalesce(sum(e.amount), 0) as remaining_amount
from public.categorie_expenses ce
left join public.expenses e
  on e.categorie_expense_id = ce.categorie_expense_id
  and e.user_id = ce.user_id
group by ce.categorie_expense_id, ce.user_id, ce.name, ce.target_monthly_budget,
         e.transaction_month;

-- ============================================================================
-- MIGRATION — Épargne cumulative liée au mois + validation du solde
-- ============================================================================
-- Chaque versement d'épargne est rattaché à un mois. Le cumul de tous les
-- versements = épargne totale. Un versement ne peut pas dépasser le solde
-- mensuel restant (revenus - dépenses - déjà épargné ce mois-là).

alter table public.savings
  add column if not exists transaction_month date,
  add column if not exists description text;

update public.savings
set transaction_month = date_trunc('month', created_at)::date
where transaction_month is null;

alter table public.savings
  alter column transaction_month set default (date_trunc('month', now())::date),
  alter column transaction_month set not null;

alter table public.savings
  drop constraint if exists savings_transaction_month_first_day;
alter table public.savings
  add constraint savings_transaction_month_first_day
  check (transaction_month = date_trunc('month', transaction_month)::date);

create index if not exists idx_savings_transaction_month
  on public.savings(user_id, transaction_month);

-- Solde mensuel = revenus - dépenses pour un mois donné
create or replace function public.get_monthly_balance(p_user_id uuid, p_month date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(amount) from public.incomes
      where user_id = p_user_id and transaction_month = p_month
    ), 0)
    - coalesce((
      select sum(amount) from public.expenses
      where user_id = p_user_id and transaction_month = p_month
    ), 0);
$$;

-- Total déjà épargné sur un mois (hors ligne en cours d'insertion)
create or replace function public.get_monthly_saved(p_user_id uuid, p_month date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.savings
  where user_id = p_user_id and transaction_month = p_month;
$$;

-- Vérifie qu'un versement ne dépasse pas le solde disponible du mois
create or replace function public.check_saving_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_saved numeric;
  v_available numeric;
begin
  v_balance := public.get_monthly_balance(new.user_id, new.transaction_month);
  v_saved := public.get_monthly_saved(new.user_id, new.transaction_month);

  if v_balance <= 0 then
    raise exception 'Solde mensuel insuffisant pour épargner (solde : %)', v_balance;
  end if;

  v_available := v_balance - v_saved;

  if new.amount > v_available then
    raise exception 'Montant supérieur au solde disponible (max : %)', v_available;
  end if;

  return new;
end;
$$;

drop trigger if exists savings_check_amount on public.savings;
create trigger savings_check_amount
  before insert on public.savings
  for each row execute function public.check_saving_amount();

-- Vue : épargne cumulée par utilisateur
create or replace view public.savings_total
  with (security_invoker = true) as
select
  user_id,
  coalesce(sum(amount), 0) as total_saved,
  count(*) as transfer_count
from public.savings
group by user_id;

-- ============================================================================
-- MIGRATION — Dépenses fixes programmées (loyer, électricité, abonnements…)
-- ============================================================================
-- Chaque utilisateur peut définir des dépenses récurrentes avec un jour
-- d'échéance mensuel (1-28). L'app affiche un calendrier et envoie des
-- notifications locales J-1.
-- ============================================================================

create table if not exists public.scheduled_expenses (
  scheduled_expense_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  categorie_expense_id uuid references public.categorie_expenses(categorie_expense_id) on delete set null,
  due_day integer not null check (due_day >= 1 and due_day <= 28),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_scheduled_expenses_user_id
  on public.scheduled_expenses(user_id);

alter table public.scheduled_expenses enable row level security;

create policy "scheduled_expenses_all_own" on public.scheduled_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================