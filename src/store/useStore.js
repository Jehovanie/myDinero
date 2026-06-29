/**
 * Store global Zustand.
 *
 * 🧠 Gère deux domaines :
 *  1. Authentification (user, session, chargement initial)
 *  2. Données métier (transactions, catégories, soldes)
 *
 * Avantages de Zustand :
 *  - Minimaliste (pas de Provider nécessaire)
 *  - Performant (re-renders uniquement sur les slices utilisés)
 *  - Compatible React Native sans configuration
 */
import { create } from 'zustand';
import { calculateTotal } from '../constants/categories';

const useStore = create((set, get) => ({
  // ─── AUTH ─────────────────────────────────────────────────
  user: null,
  session: null,
  isLoading: true,
  authError: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setAuthError: (authError) => set({ authError }),

  resetAll: () =>
    set({
      user: null,
      session: null,
      isLoading: false,
      authError: null,
      transactions: [],
      categories: [],
      profile: null,
    }),

  // ─── PROFIL ───────────────────────────────────────────────
  profile: null,
  setProfile: (profile) => set({ profile }),

  // ─── CATÉGORIES ───────────────────────────────────────────
  categories: [],
  setCategories: (categories) => set({ categories }),

  // ─── TRANSACTIONS ─────────────────────────────────────────
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),

  prependTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions] })),

  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  // ─── SOLDES CALCULÉS (getters) ────────────────────────────
  getBalance: () => {
    const txs = get().transactions;
    return calculateTotal(txs, 'income') - calculateTotal(txs, 'expense');
  },

  getMonthlyIncome: () => calculateTotal(get().transactions, 'income'),

  getMonthlyExpenses: () => calculateTotal(get().transactions, 'expense'),

  getCategoryBreakdown: (type = 'expense') => {
    const txs = get().transactions.filter((t) => t.type === type);
    const breakdown = {};

    txs.forEach((t) => {
      const catName = t.category?.name || 'Sans catégorie';
      const catColor = t.category?.color || '#999';
      if (!breakdown[catName]) {
        breakdown[catName] = { total: 0, color: catColor };
      }
      breakdown[catName].total += Number(t.amount);
    });

    return Object.entries(breakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  },
}));

export default useStore;
