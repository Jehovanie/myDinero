/**
 * Catégories par défaut pour les transactions.
 * Chaque catégorie a un nom, une icône (Ionicons), une couleur et un type.
 * Ces données sont également insérées dans Supabase via le script SQL.
 */
export const DEFAULT_CATEGORIES = {
	income: [
		{ id: null, name: "Salaire", icon: "briefcase-outline", color: "#4CAF50" },
		{ id: null, name: "Freelance", icon: "laptop-outline", color: "#66BB6A" },
		{ id: null, name: "Investissements", icon: "trending-up-outline", color: "#81C784" },
		{ id: null, name: "Cadeaux", icon: "gift-outline", color: "#A5D6A7" },
		{ id: null, name: "Autre revenu", icon: "add-circle-outline", color: "#C8E6C9" },
	],
	expense: [
		{ id: null, name: "Alimentation", icon: "cart-outline", color: "#FF7043" },
		{ id: null, name: "Transport", icon: "bus-outline", color: "#FF8A65" },
		{ id: null, name: "Logement", icon: "home-outline", color: "#FFAB91" },
		{ id: null, name: "Loisirs", icon: "film-outline", color: "#EF5350" },
		{ id: null, name: "Santé", icon: "fitness-outline", color: "#E57373" },
		{ id: null, name: "Éducation", icon: "book-outline", color: "#F44336" },
		{ id: null, name: "Shopping", icon: "bag-handle-outline", color: "#D32F2F" },
		{ id: null, name: "Factures", icon: "flash-outline", color: "#FF5252" },
		{ id: null, name: "Autre dépense", icon: "remove-circle-outline", color: "#FF8A80" },
	],
};

/** Formatte un montant en Ariary (MGA) */
export const formatCurrency = (amount) => {
	const num = Number(amount) || 0;
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "MGA",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(num);
};

/** Calcule le total d'un tableau de transactions */
export const calculateTotal = (transactions, type) => {
	return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + Number(t.amount), 0);
};

/** Retourne le mois courant au format YYYY-MM */
export const getCurrentMonth = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/** Convertit YYYY-MM en date SQL (1er jour du mois) */
export const monthToDate = (monthKey) => `${monthKey}-01`;

/** Extrait YYYY-MM depuis une date ISO ou une colonne date */
export const dateToMonth = (value) => {
	if (!value) return getCurrentMonth();
	const str = String(value);
	if (/^\d{4}-\d{2}/.test(str)) return str.slice(0, 7);
	const date = new Date(str);
	if (Number.isNaN(date.getTime())) return getCurrentMonth();
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

/** Affiche un mois en français (ex. "juin 2025") */
export const formatMonthLabel = (monthKey) => {
	const [year, month] = monthKey.split("-").map(Number);
	const date = new Date(year, month - 1, 1);
	const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
	return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Décale un mois de delta positions (ex. -1 = mois précédent) */
export const shiftMonth = (monthKey, delta) => {
	const [year, month] = monthKey.split("-").map(Number);
	const date = new Date(year, month - 1 + delta, 1);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

/** true si monthKey est strictement après le mois courant */
export const isFutureMonth = (monthKey) => monthKey > getCurrentMonth();
