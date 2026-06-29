/**
 * Service Supabase – client unique et fonctions d'API.
 *
 * Adapté à la nouvelle architecture de la base :
 *  - `users` (table liée à auth.users)
 *  - `categorie_expenses` (catégories par utilisateur)
 *  - `expenses` (transactions / dépenses)
 *  - `incomes`, `savings`, `saving_goals` (à ajouter au besoin)
 *
 * Le service expose des fonctions compatibles avec l'UI existante en effectuant
 * des mappings (ex: `expense_id` → `id`, `created_at` → `date`).
 */
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_CATEGORIES, getCurrentMonth, monthToDate, dateToMonth } from "../constants/categories";

const SUPABASE_URL = "https://dsiuunddjtbyquftozpn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__wcFTzvxeRWMasVMUTxRVw_ueDgKbf4";

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
	console.log("[supabase] Client créé avec succès");
} catch (e) {
	console.error("[supabase] Échec création client :", e.message);
}

export const supabase = _supabase;
const requireClient = () => {
	if (!_supabase) throw new Error("Client Supabase non initialisé. Vérifiez vos clés API.");
	return _supabase;
};

// ------------------ AUTH -------------------------------------------------
export const signUp = async (email, password, name) => {
	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: { data: { nom: name } },
	});
	if (error) throw error;
	// Le trigger SQL fourni crée déjà une ligne dans `public.users`.
	return data;
};

export const signIn = async (email, password) => {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) throw error;
	return data;
};

export const signOut = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
};

export const resetPassword = async (email) => {
	const { error } = await supabase.auth.resetPasswordForEmail(email);
	if (error) throw error;
};

/** Met à jour le mot de passe de l'utilisateur connecté */
export const changePassword = async (newPassword) => {
	if (!newPassword || newPassword.length < 6) {
		throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
	}
	const { error } = await supabase.auth.updateUser({ password: newPassword });
	if (error) throw error;
};

// ------------------ PROFILE (table `users`) -------------------------------
export const getProfile = async (userId) => {
	const { data, error } = await supabase
		.from("users")
		.select("user_id, nom, email, created_at")
		.eq("user_id", userId)
		.single();
	if (error) throw error;
	// Mapper sur l'objet attendu par l'UI
	return { id: data.user_id, name: data.nom, email: data.email, created_at: data.created_at };
};

export const updateProfile = async (userId, updates) => {
	const payload = {};
	if (updates.name || updates.nom) payload.nom = updates.name || updates.nom;
	if (updates.email) payload.email = updates.email;
	const { data, error } = await supabase.from("users").update(payload).eq("user_id", userId).select().single();
	if (error) throw error;
	return { id: data.user_id, name: data.nom, email: data.email };
};

// ------------------ CATÉGORIES (table `categorie_expenses`) --------------
export const ensureCategory = async (userId, category) => {
	const normalizedName = category?.name?.trim();
	if (!userId || !normalizedName) return null;

	const { data: existing, error: existingError } = await supabase
		.from("categorie_expenses")
		.select("categorie_expense_id, name")
		.eq("user_id", userId)
		.ilike("name", normalizedName)
		.maybeSingle();
	if (existingError) throw existingError;
	if (existing) return existing;

	const { data, error } = await supabase
		.from("categorie_expenses")
		.insert({
			user_id: userId,
			name: normalizedName,
			target_monthly_budget: 0,
		})
		.select("categorie_expense_id, name")
		.single();
	if (error) throw error;
	return data;
};

export const getCategories = async () => {
	// Récupère l'utilisateur courant via l'auth (RLS autorise la lecture)
	const user = (await supabase.auth.getUser()).data?.user;
	const q = supabase.from("categorie_expenses").select("*").order("name");
	if (user) q.eq("user_id", user.id);
	const { data, error } = await q;
	if (error) throw error;

	// Si l'utilisateur n'a pas encore de catégories en base, retourner les defaults
	if (!data || data.length === 0) {
		const defaults = [];
		DEFAULT_CATEGORIES.income.forEach((d) =>
			defaults.push({
				id: null,
				name: d.name,
				type: "income",
				icon: d.icon,
				color: d.color,
				target_monthly_budget: 0,
			}),
		);
		DEFAULT_CATEGORIES.expense.forEach((d) =>
			defaults.push({
				id: null,
				name: d.name,
				type: "expense",
				icon: d.icon,
				color: d.color,
				target_monthly_budget: 0,
			}),
		);
		return defaults;
	}

	// On merge avec DEFAULT_CATEGORIES pour ajouter couleurs/icônes et type
	const merged = data.map((c) => {
		const name = c.name;
		const findDefault = (arr) => arr.find((d) => d.name === name || d.name?.toLowerCase() === name?.toLowerCase());
		const defIncome = findDefault(DEFAULT_CATEGORIES.income);
		const defExpense = findDefault(DEFAULT_CATEGORIES.expense);
		const def = defIncome || defExpense || {};
		const inferredType = defIncome ? "income" : defExpense ? "expense" : "expense";

		return {
			id: c.categorie_expense_id,
			name: c.name,
			type: inferredType,
			target_monthly_budget: c.target_monthly_budget,
			created_at: c.created_at,
			icon: def.icon || null,
			color: def.color || "#999",
		};
	});

	return merged;
};

// ------------------ TRANSACTIONS / EXPENSES / INCOMES -------------------
export const getTransactions = async (userId, monthFilter = null) => {
	let incomeQuery = supabase
		.from("incomes")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });
	let expenseQuery = supabase
		.from("expenses")
		.select("*, categorie:categorie_expenses(*)")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	if (monthFilter) {
		const monthDate = monthToDate(monthFilter);
		incomeQuery = incomeQuery.eq("transaction_month", monthDate);
		expenseQuery = expenseQuery.eq("transaction_month", monthDate);
	}

	const [{ data: incomesData, error: incomesError }, { data: expensesData, error: expensesError }] =
		await Promise.all([incomeQuery, expenseQuery]);
	if (incomesError) throw incomesError;
	if (expensesError) throw expensesError;

	const mappedIncomes = (incomesData || []).map((item) => ({
		id: item.income_id,
		user_id: item.user_id,
		amount: item.amount,
		description: item.description,
		type: "income",
		date: item.created_at,
		month: dateToMonth(item.transaction_month || item.created_at),
		category: { id: null, name: item.source || "Revenu", icon: "cash-outline", color: "#4CAF50" },
	}));

	const mappedExpenses = (expensesData || []).map((item) => ({
		id: item.expense_id,
		user_id: item.user_id,
		amount: item.amount,
		description: item.description,
		type: "expense",
		date: item.created_at,
		month: dateToMonth(item.transaction_month || item.created_at),
		category: item.categorie
			? {
					id: item.categorie.categorie_expense_id,
					name: item.categorie.name,
					icon: null,
					color: "#EF4444",
				}
			: null,
	}));

	return [...mappedIncomes, ...mappedExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const addTransaction = async (userId, transaction) => {
	const monthKey = transaction.month || dateToMonth(transaction.date) || getCurrentMonth();
	const transactionMonth = monthToDate(monthKey);

	if (transaction.type === "income") {
		const payload = {
			user_id: userId,
			source: transaction.category?.name || transaction.source || "Autre revenu",
			description: transaction.description || "",
			amount: transaction.amount,
			transaction_month: transactionMonth,
		};
		if (transaction.date) payload.created_at = transaction.date;

		const { data, error } = await supabase.from("incomes").insert(payload).select("*").single();
		if (error) throw error;
		return {
			id: data.income_id,
			user_id: data.user_id,
			amount: data.amount,
			description: data.description,
			type: "income",
			date: data.created_at,
			month: dateToMonth(data.transaction_month),
			category: { id: null, name: data.source || "Revenu", icon: "cash-outline", color: "#4CAF50" },
		};
	}

	let categoryId = transaction.category_id || transaction.category?.id || null;
	if (!categoryId && transaction.category?.name) {
		const createdCategory = await ensureCategory(userId, transaction.category);
		categoryId = createdCategory?.categorie_expense_id || null;
	}

	const payload = {
		user_id: userId,
		categorie_expense_id: categoryId,
		amount: transaction.amount,
		description: transaction.description || "",
		type: transaction.expenseType || "variable",
		transaction_month: transactionMonth,
	};
	if (transaction.date) payload.created_at = transaction.date;

	const { data, error } = await supabase
		.from("expenses")
		.insert(payload)
		.select("*, categorie:categorie_expenses(*)")
		.single();
	if (error) throw error;

	return {
		id: data.expense_id,
		user_id: data.user_id,
		amount: data.amount,
		description: data.description,
		type: "expense",
		date: data.created_at,
		month: dateToMonth(data.transaction_month),
		category: data.categorie
			? {
					id: data.categorie.categorie_expense_id,
					name: data.categorie.name,
					icon: null,
					color: "#EF4444",
				}
			: null,
	};
};

export const deleteTransaction = async (transactionId, type = null) => {
	if (type === "income") {
		const { error } = await supabase.from("incomes").delete().eq("income_id", transactionId);
		if (error) throw error;
		return;
	}
	if (type === "expense") {
		const { error } = await supabase.from("expenses").delete().eq("expense_id", transactionId);
		if (error) throw error;
		return;
	}

	const { error: incomeError } = await supabase.from("incomes").delete().eq("income_id", transactionId);
	if (!incomeError) return;

	const { error: expenseError } = await supabase.from("expenses").delete().eq("expense_id", transactionId);
	if (expenseError) throw expenseError;
};

export const addIncome = async (userId, income) => {
	const monthKey = income.month || dateToMonth(income.date) || getCurrentMonth();
	const payload = {
		user_id: userId,
		source: income.source || "Autre revenu",
		description: income.description || "",
		amount: income.amount,
		transaction_month: monthToDate(monthKey),
	};
	if (income.date) payload.created_at = income.date;

	const { data, error } = await supabase.from("incomes").insert(payload).select("*").single();
	if (error) throw error;
	return data;
};

export const addSavingGoal = async (userId, goal) => {
	const payload = {
		user_id: userId,
		nom: goal.nom || "Nouvel objectif",
		target_amount: goal.target_amount,
		target_date: goal.target_date || null,
	};
	const { data, error } = await supabase.from("saving_goals").insert(payload).select("*").single();
	if (error) throw error;
	return data;
};

const sumAmounts = (rows) => (rows || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

const mapSavingRow = (item) => ({
	id: item.saving_id,
	amount: Number(item.amount),
	month: dateToMonth(item.transaction_month || item.created_at),
	description: item.description || "",
	date: item.created_at,
});

/** Résumé financier d'un mois (revenus, dépenses, solde, épargne) */
export const getMonthlySummary = async (userId, monthFilter) => {
	const monthDate = monthToDate(monthFilter || getCurrentMonth());

	const [{ data: incomes }, { data: expenses }, { data: savings }] = await Promise.all([
		supabase.from("incomes").select("amount").eq("user_id", userId).eq("transaction_month", monthDate),
		supabase.from("expenses").select("amount").eq("user_id", userId).eq("transaction_month", monthDate),
		supabase.from("savings").select("amount").eq("user_id", userId).eq("transaction_month", monthDate),
	]);

	const income = sumAmounts(incomes);
	const expense = sumAmounts(expenses);
	const saved = sumAmounts(savings);
	const balance = income - expense;
	const available = Math.max(0, balance - saved);

	return { income, expense, balance, saved, available, month: monthFilter || getCurrentMonth() };
};

/** Épargne cumulée (tous les mois confondus) */
export const getTotalSavings = async (userId) => {
	const { data, error } = await supabase.from("savings").select("amount").eq("user_id", userId);
	if (error) throw error;
	return sumAmounts(data);
};

/** Liste des versements d'épargne (optionnellement filtrés par mois) */
export const getSavings = async (userId, monthFilter = null) => {
	let query = supabase
		.from("savings")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	if (monthFilter) {
		query = query.eq("transaction_month", monthToDate(monthFilter));
	}

	const { data, error } = await query;
	if (error) throw error;
	return (data || []).map(mapSavingRow);
};

/** Virer un montant vers l'épargne (validé côté app + trigger SQL) */
export const addSaving = async (userId, saving) => {
	const monthKey = saving.month || getCurrentMonth();
	const amount = Number(saving.amount);

	if (!amount || amount <= 0) {
		throw new Error("Le montant doit être supérieur à 0.");
	}

	const summary = await getMonthlySummary(userId, monthKey);
	if (summary.balance <= 0) {
		throw new Error("Solde mensuel insuffisant pour épargner.");
	}
	if (amount > summary.available) {
		throw new Error(`Maximum épargnable ce mois : ${summary.available}`);
	}

	const payload = {
		user_id: userId,
		amount,
		transaction_month: monthToDate(monthKey),
		description: saving.description?.trim() || null,
		saving_goal_id: saving.saving_goal_id || null,
	};
	if (saving.date) payload.created_at = saving.date;

	const { data, error } = await supabase.from("savings").insert(payload).select("*").single();
	if (error) throw error;
	return mapSavingRow(data);
};

/** Supprimer un versement d'épargne */
export const deleteSaving = async (savingId) => {
	const { error } = await supabase.from("savings").delete().eq("saving_id", savingId);
	if (error) throw error;
};

// ------------------ DÉPENSES FIXES / PROGRAMMÉES ----------------------------

const mapScheduledRow = (item) => ({
	id: item.scheduled_expense_id,
	user_id: item.user_id,
	name: item.name,
	amount: Number(item.amount),
	due_day: item.due_day,
	is_active: item.is_active,
	categorie_expense_id: item.categorie_expense_id,
	category: item.categorie
		? {
				id: item.categorie.categorie_expense_id,
				name: item.categorie.name,
				icon: item.categorie.icon || null,
				color: item.categorie.color || "#6C5CE7",
			}
		: null,
	created_at: item.created_at,
});

/** Liste toutes les dépenses fixes actives d'un utilisateur */
export const getScheduledExpenses = async (userId) => {
	const { data, error } = await supabase
		.from("scheduled_expenses")
		.select("*, categorie:categorie_expenses(*)")
		.eq("user_id", userId)
		.eq("is_active", true)
		.order("due_day", { ascending: true });
	if (error) throw error;
	return (data || []).map(mapScheduledRow);
};

/** Créer une dépense fixe programmée */
export const addScheduledExpense = async (userId, expense) => {
	const amount = Number(expense.amount);
	if (!amount || amount <= 0) throw new Error("Le montant doit être supérieur à 0.");
	if (!expense.name?.trim()) throw new Error("Le nom est obligatoire.");
	if (!expense.due_day || expense.due_day < 1 || expense.due_day > 28) {
		throw new Error("Le jour d'échéance doit être entre 1 et 28.");
	}

	const payload = {
		user_id: userId,
		name: expense.name.trim(),
		amount,
		due_day: expense.due_day,
		categorie_expense_id: expense.categorie_expense_id || null,
	};

	const { data, error } = await supabase
		.from("scheduled_expenses")
		.insert(payload)
		.select("*, categorie:categorie_expenses(*)")
		.single();
	if (error) throw error;
	return mapScheduledRow(data);
};

/** Modifier une dépense fixe */
export const updateScheduledExpense = async (id, updates) => {
	const payload = {};
	if (updates.name !== undefined) payload.name = updates.name.trim();
	if (updates.amount !== undefined) payload.amount = Number(updates.amount);
	if (updates.due_day !== undefined) payload.due_day = updates.due_day;
	if (updates.categorie_expense_id !== undefined) payload.categorie_expense_id = updates.categorie_expense_id;
	if (updates.is_active !== undefined) payload.is_active = updates.is_active;

	const { data, error } = await supabase
		.from("scheduled_expenses")
		.update(payload)
		.eq("scheduled_expense_id", id)
		.select("*, categorie:categorie_expenses(*)")
		.single();
	if (error) throw error;
	return mapScheduledRow(data);
};

/** Supprimer (désactiver) une dépense fixe */
export const deleteScheduledExpense = async (id) => {
	const { error } = await supabase.from("scheduled_expenses").delete().eq("scheduled_expense_id", id);
	if (error) throw error;
};

/**
 * Marquer une dépense fixe comme payée pour un mois donné.
 * Crée une vraie dépense dans la table `expenses` et retourne la transaction mappée.
 */
export const markScheduledAsPaid = async (userId, scheduled, monthKey) => {
	const transactionMonth = monthToDate(monthKey || getCurrentMonth());

	const payload = {
		user_id: userId,
		categorie_expense_id: scheduled.categorie_expense_id || scheduled.category?.id || null,
		amount: scheduled.amount,
		description: `[Fixe] ${scheduled.name}`,
		type: "fix",
		transaction_month: transactionMonth,
	};

	const { data, error } = await supabase
		.from("expenses")
		.insert(payload)
		.select("*, categorie:categorie_expenses(*)")
		.single();
	if (error) throw error;

	return {
		id: data.expense_id,
		user_id: data.user_id,
		amount: data.amount,
		description: data.description,
		type: "expense",
		date: data.created_at,
		month: dateToMonth(data.transaction_month),
		category: data.categorie
			? {
					id: data.categorie.categorie_expense_id,
					name: data.categorie.name,
					icon: data.categorie.icon || null,
					color: data.categorie.color || "#EF4444",
				}
			: null,
	};
};
