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
import { create } from "zustand";
import { calculateTotal, getCurrentMonth } from "../constants/categories";

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
			selectedMonth: getCurrentMonth(),
			savings: [],
			totalSavings: 0,
			monthlySaved: 0,
			monthlySummary: { income: 0, expense: 0, balance: 0, saved: 0, available: 0 },
			scheduledExpenses: [],
		}),

	// ─── MOIS SÉLECTIONNÉ ─────────────────────────────────────
	selectedMonth: getCurrentMonth(),
	setSelectedMonth: (selectedMonth) => set({ selectedMonth }),

	// ─── PROFIL ───────────────────────────────────────────────
	profile: null,
	setProfile: (profile) => set({ profile }),

	// ─── CATÉGORIES ───────────────────────────────────────────
	categories: [],
	setCategories: (categories) => set({ categories }),

	// ─── TRANSACTIONS ─────────────────────────────────────────
	transactions: [],
	setTransactions: (transactions) =>
		set({
			transactions: (transactions || [])
				.map((tx) => get().normalizeTransaction(tx))
				.sort((a, b) => new Date(b.date) - new Date(a.date)),
		}),

	prependTransaction: (tx) =>
		set((state) => ({
			transactions: [get().normalizeTransaction(tx), ...state.transactions]
				.map((item) => get().normalizeTransaction(item))
				.sort((a, b) => new Date(b.date) - new Date(a.date)),
		})),

	removeTransaction: (id) =>
		set((state) => ({
			transactions: state.transactions.filter((t) => t.id !== id),
		})),

	normalizeTransaction: (tx) => {
		const normalizedType = tx?.type === "income" ? "income" : "expense";
		return {
			...tx,
			type: normalizedType,
			category: tx?.category || null,
			amount: Number(tx?.amount) || 0,
			date: tx?.date || new Date().toISOString(),
			month: tx?.month || getCurrentMonth(),
		};
	},

	// ─── ÉPARGNE ──────────────────────────────────────────────
	savings: [],
	totalSavings: 0,
	monthlySaved: 0,
	monthlySummary: { income: 0, expense: 0, balance: 0, saved: 0, available: 0 },

	setSavingsData: ({ savings, totalSavings, monthlySummary }) =>
		set({
			savings: savings || [],
			totalSavings: Number(totalSavings) || 0,
			monthlySummary: monthlySummary || get().monthlySummary,
		}),

	setTotalSavings: (totalSavings) => set({ totalSavings: Number(totalSavings) || 0 }),
	setMonthlySaved: (monthlySaved) => set({ monthlySaved: Number(monthlySaved) || 0 }),

	prependSaving: (saving, monthlySummary, totalSavings) =>
		set((state) => ({
			savings: [saving, ...state.savings],
			totalSavings: totalSavings ?? state.totalSavings + Number(saving.amount),
			monthlySummary: monthlySummary ?? state.monthlySummary,
		})),

	removeSaving: (id, monthlySummary, totalSavings) =>
		set((state) => ({
			savings: state.savings.filter((s) => s.id !== id),
			totalSavings: totalSavings ?? state.totalSavings,
			monthlySummary: monthlySummary ?? state.monthlySummary,
		})),

	// ─── DÉPENSES FIXES ──────────────────────────────────────────
	scheduledExpenses: [],
	setScheduledExpenses: (scheduledExpenses) => set({ scheduledExpenses: scheduledExpenses || [] }),

	addScheduledExpense: (expense) =>
		set((state) => ({
			scheduledExpenses: [...state.scheduledExpenses, expense].sort((a, b) => a.due_day - b.due_day),
		})),

	removeScheduledExpense: (id) =>
		set((state) => ({
			scheduledExpenses: state.scheduledExpenses.filter((s) => s.id !== id),
		})),

	updateScheduledExpense: (id, updates) =>
		set((state) => ({
			scheduledExpenses: state.scheduledExpenses
				.map((s) => (s.id === id ? { ...s, ...updates } : s))
				.sort((a, b) => a.due_day - b.due_day),
		})),

	// ─── SOLDES CALCULÉS (getters) ────────────────────────────
	getBalance: () => {
		const txs = get().transactions.map((tx) => get().normalizeTransaction(tx));
		const saved = Number(get().monthlySaved) || 0;
		return calculateTotal(txs, "income") - calculateTotal(txs, "expense") - saved;
	},

	getMonthlyIncome: () =>
		calculateTotal(
			get().transactions.map((tx) => get().normalizeTransaction(tx)),
			"income",
		),

	getMonthlyExpenses: () =>
		calculateTotal(
			get().transactions.map((tx) => get().normalizeTransaction(tx)),
			"expense",
		),

	getCategoryBreakdown: (type = "expense") => {
		const txs = get()
			.transactions.map((tx) => get().normalizeTransaction(tx))
			.filter((t) => t.type === type);
		const breakdown = {};

		txs.forEach((t) => {
			const catName = t.category?.name || "Sans catégorie";
			const catColor = t.category?.color || "#999";
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
