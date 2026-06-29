/**
 * Catégories par défaut pour les transactions.
 * Chaque catégorie a un nom, une icône (Ionicons), une couleur et un type.
 * Ces données sont également insérées dans Supabase via le script SQL.
 */
export const DEFAULT_CATEGORIES = {
  income: [
    { id: null, name: 'Salaire',       icon: 'briefcase-outline',    color: '#4CAF50' },
    { id: null, name: 'Freelance',     icon: 'laptop-outline',       color: '#66BB6A' },
    { id: null, name: 'Investissements', icon: 'trending-up-outline', color: '#81C784' },
    { id: null, name: 'Cadeaux',       icon: 'gift-outline',         color: '#A5D6A7' },
    { id: null, name: 'Autre revenu',  icon: 'add-circle-outline',   color: '#C8E6C9' },
  ],
  expense: [
    { id: null, name: 'Alimentation',  icon: 'cart-outline',         color: '#FF7043' },
    { id: null, name: 'Transport',     icon: 'bus-outline',          color: '#FF8A65' },
    { id: null, name: 'Logement',      icon: 'home-outline',         color: '#FFAB91' },
    { id: null, name: 'Loisirs',       icon: 'film-outline',         color: '#EF5350' },
    { id: null, name: 'Santé',         icon: 'fitness-outline',      color: '#E57373' },
    { id: null, name: 'Éducation',     icon: 'book-outline',         color: '#F44336' },
    { id: null, name: 'Shopping',      icon: 'bag-handle-outline',   color: '#D32F2F' },
    { id: null, name: 'Factures',      icon: 'flash-outline',        color: '#FF5252' },
    { id: null, name: 'Autre dépense', icon: 'remove-circle-outline', color: '#FF8A80' },
  ],
};

/** Formatte un montant en euros */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(num);
};

/** Calcule le total d'un tableau de transactions */
export const calculateTotal = (transactions, type) => {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + Number(t.amount), 0);
};
