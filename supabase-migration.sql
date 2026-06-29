-- =============================================================
-- myDinero – Script de migration Supabase
-- =============================================================
-- À exécuter dans l'éditeur SQL du dashboard Supabase :
--   https://app.supabase.com → Projet → SQL Editor
-- =============================================================

-- 1. TABLE : profiles (étend auth.users)
--    Contient les infos supplémentaires de l'utilisateur.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  monthly_budget DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE : categories
--    Liste des catégories disponibles (revenus et dépenses).
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE : transactions
--    Chaque transaction est liée à un utilisateur et une catégorie.
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- INDEX (performance)
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles : chaque utilisateur voit son propre profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Categories : visibles par tous les utilisateurs authentifiés
CREATE POLICY "Categories visible by authenticated users"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Transactions : chaque utilisateur gère uniquement les siennes
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================
-- TRIGGER : création automatique du profil à l'inscription
-- =============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================
-- SEED : catégories par défaut
-- =============================================================
INSERT INTO categories (name, icon, color, type) VALUES
  -- Revenus
  ('Salaire',        'briefcase-outline',     '#4CAF50', 'income'),
  ('Freelance',      'laptop-outline',        '#66BB6A', 'income'),
  ('Investissements','trending-up-outline',   '#81C784', 'income'),
  ('Cadeaux',        'gift-outline',          '#A5D6A7', 'income'),
  ('Autre revenu',   'add-circle-outline',    '#C8E6C9', 'income'),
  -- Dépenses
  ('Alimentation',   'cart-outline',          '#FF7043', 'expense'),
  ('Transport',      'bus-outline',           '#FF8A65', 'expense'),
  ('Logement',       'home-outline',          '#FFAB91', 'expense'),
  ('Loisirs',        'film-outline',          '#EF5350', 'expense'),
  ('Santé',          'fitness-outline',       '#E57373', 'expense'),
  ('Éducation',      'book-outline',          '#F44336', 'expense'),
  ('Shopping',       'bag-handle-outline',    '#D32F2F', 'expense'),
  ('Factures',       'flash-outline',         '#FF5252', 'expense'),
  ('Autre dépense',  'remove-circle-outline', '#FF8A80', 'expense');
