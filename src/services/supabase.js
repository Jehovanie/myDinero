/**
 * Service Supabase – client unique et fonctions d'API.
 *
 * 🔐 Sécurité :
 *  - Toutes les requêtes passent par Row Level Security (RLS) côté Supabase.
 *  - Le token JWT est automatiquement attaché via le client Supabase.
 *  - Les mots de passe ne sont jamais stockés dans le store local.
 *
 * 📦 Bonnes pratiques :
 *  - Un seul client partagé (singleton).
 *  - AsyncStorage pour persister la session entre les lancements.
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Remplace ces valeurs par les tiennes depuis le dashboard Supabase
//    (Settings > API > Project URL / anon public key)
const SUPABASE_URL = 'https://jjynxcqqvnqliubfqvsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MFySzvh9YgHHZlplgPizIQ_JbVYiMIO';

// Création du client Supabase avec persistance de session via AsyncStorage
// Wrappé dans un try/catch pour éviter que l'app ne crash si la création
// échoue (ex: erreur Hermes sur Android avec les propriétés URL getter-only)
let _supabase = null;
try {
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  console.log('[supabase] Client créé avec succès');
} catch (e) {
  console.error('[supabase] Échec création client :', e.message);
  // On exporte un client null : les fonctions d'API renverront des erreurs
  // explicites au lieu de crasher.
}

export const supabase = _supabase;

/** Vérifie que le client Supabase est disponible */
const requireClient = () => {
  if (!_supabase) throw new Error('Client Supabase non initialisé. Vérifiez vos clés API.');
  return _supabase;
};

// ─── AUTHENTIFICATION ──────────────────────────────────────────────────────

/** Inscription avec email + mot de passe + métadonnées (nom) */
export const signUp = async (email, password, name) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // stocké dans user_metadata
    },
  });
  if (error) throw error;

  // Crée automatiquement une entrée dans la table profiles via un trigger
  // (ou on peut le faire ici manuellement)
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      name,
    });
  }
  return data;
};

/** Connexion avec email + mot de passe */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/** Déconnexion */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/** Envoie un email de réinitialisation de mot de passe */
export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

// ─── PROFIL ────────────────────────────────────────────────────────────────

/** Récupère le profil de l'utilisateur connecté */
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

/** Met à jour le profil (nom, budget mensuel...) */
export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ─── CATÉGORIES ────────────────────────────────────────────────────────────

/** Récupère toutes les catégories (visibles par tout utilisateur authentifié) */
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
};

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────

/** Récupère les transactions de l'utilisateur (optionnellement filtrées par mois) */
export const getTransactions = async (userId, monthFilter = null) => {
  let query = supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  // Filtre par mois si fourni (format 'YYYY-MM')
  if (monthFilter) {
    query = query
      .gte('date', `${monthFilter}-01`)
      .lt('date', `${monthFilter}-31`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/** Ajoute une transaction */
export const addTransaction = async (userId, transaction) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      category_id: transaction.category_id,
      amount: transaction.amount,
      description: transaction.description || '',
      type: transaction.type,
      date: transaction.date || new Date().toISOString().split('T')[0],
    })
    .select('*, category:categories(*)')
    .single();
  if (error) throw error;
  return data;
};

/** Supprime une transaction */
export const deleteTransaction = async (transactionId) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);
  if (error) throw error;
};
