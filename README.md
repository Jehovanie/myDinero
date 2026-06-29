# 💰 myDinero – Gestion de budget personnel

Application mobile **React Native / Expo** de gestion de budget, connectée à **Supabase** comme backend.

![Tech stack](https://img.shields.io/badge/Expo-SDK_52-000?logo=expo)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Tailwind](https://img.shields.io/badge/TailwindCSS-NativeWind-06B6D4?logo=tailwindcss)

---

## ✨ Fonctionnalités

- 🔐 **Authentification** – Inscription, connexion, réinitialisation de mot de passe (via Supabase Auth)
- 💸 **Transactions** – Ajout de revenus et dépenses avec catégorisation
- 📊 **Dashboard** – Solde en temps réel, graphique de répartition par catégorie
- 👤 **Profil** – Budget mensuel personnalisé avec barre de progression
- 🔒 **Sécurité** – Row Level Security (RLS) côté Supabase, JWT automatique
- 🎨 **UI moderne** – Design soigné avec NativeWind (TailwindCSS pour React Native)

---

## 📦 Stack technique

| Couche          | Technologie                              |
|-----------------|------------------------------------------|
| Frontend        | React Native, Expo SDK 52, NativeWind v4 |
| Navigation      | React Navigation v6 (Stack + Bottom Tab) |
| État global     | Zustand v5                               |
| Backend / DB    | Supabase (PostgreSQL + Auth)             |
| Icones          | @expo/vector-icons (Ionicons)            |

---

## 🚀 Installation et lancement

### 1. Prérequis

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Expo Go** installé sur votre téléphone (iOS/Android)
- Un compte [Supabase](https://supabase.com) (gratuit)

### 2. Cloner le projet

```bash
git clone <url-du-repo> myDinero
cd myDinero
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Configurer Supabase

1. Crée un projet sur [app.supabase.com](https://app.supabase.com)
2. Va dans **Settings → API** et copie :
   - `Project URL` (ex: `https://xxxxx.supabase.co`)
   - `anon public key` (clé anonyme, pas la `service_role` !)
3. Ouvre le fichier **`src/services/supabase.js`** et remplace les valeurs :

```js
const SUPABASE_URL = 'https://ton-projet.supabase.co';
const SUPABASE_ANON_KEY = 'ta-clé-anon-publique';
```

4. Dans le dashboard Supabase, va dans **SQL Editor** et exécute **tout le contenu** du fichier `supabase-migration.sql` fourni dans ce projet.

> Ce script crée les tables (`profiles`, `categories`, `transactions`), configure la sécurité RLS, et insère les catégories par défaut.

### 5. Lancer l'application

```bash
npx expo start
```

Puis scanne le QR code avec l'app **Expo Go** sur ton téléphone.

---

## 📁 Structure du projet

```
myDinero/
├── App.js                          # Point d'entrée, écoute auth Supabase
├── global.css                      # Styles Tailwind globaux
├── tailwind.config.js              # Thème personnalisé (couleurs, polices)
├── metro.config.js                 # Configuration Metro + NativeWind
├── babel.config.js                 # Babel + NativeWind
├── supabase-migration.sql          # Script SQL à exécuter sur Supabase
├── package.json
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js         # Navigation (Auth stack / App tabs)
│   ├── screens/
│   │   ├── LoginScreen.js          # Connexion
│   │   ├── RegisterScreen.js       # Inscription
│   │   ├── ForgotPasswordScreen.js # Réinitialisation mot de passe
│   │   ├── DashboardScreen.js      # Tableau de bord principal
│   │   ├── AddTransactionScreen.js # Formulaire d'ajout
│   │   └── ProfileScreen.js        # Profil et paramètres
│   ├── components/
│   │   ├── TransactionCard.js      # Carte d'une transaction
│   │   ├── CategoryPicker.js       # Sélecteur de catégorie horizontal
│   │   └── ChartView.js            # Graphique en barres horizontales
│   ├── services/
│   │   └── supabase.js             # Client Supabase + fonctions API
│   ├── store/
│   │   └── useStore.js             # Store Zustand (auth, transactions...)
│   └── constants/
│       └── categories.js           # Catégories par défaut, formatage devise
└── assets/                         # Images et ressources
```

---

## 🧠 Architecture et bonnes pratiques

### Sécurité

- **Row Level Security (RLS)** activé sur toutes les tables. Chaque utilisateur ne peut voir/modifier que ses propres données.
- Le token JWT Supabase est géré automatiquement et stocké dans `AsyncStorage`.
- Les mots de passe ne sont **jamais** enregistrés dans le store Zustand.
- Les clés API sont des clés **anon** (publiques), limitées par les politiques RLS.

### Performance

- `zustand` est utilisé pour l'état global car il est léger (~1 Ko) et ne nécessite pas de Provider React.
- Les composants utilisent `useStore` avec des **sélecteurs atomiques** (`useStore(s => s.user)`) pour éviter les re-renders inutiles.
- La navigation conditionnelle (`user ? AppStack : AuthStack`) est gérée sans flash grâce à l'état `isLoading`.
- `Pull-to-refresh` et chargement optimiste pour une expérience fluide.

### Design

- **NativeWind v4** permet d'utiliser la syntaxe TailwindCSS directement dans React Native.
- Le thème est défini dans `tailwind.config.js` avec des couleurs personnalisées (`primary`, `success`, `danger`).
- Les composants utilisent des `rounded-2xl`, `shadow-*` et des espacements cohérents pour un rendu professionnel.

---

## 🗄️ Schéma de base de données

```
┌─────────────────────────────────┐
│         auth.users              │
│  (géré par Supabase Auth)       │
│  id, email, password_hash...    │
└──────────┬──────────────────────┘
           │ 1:1
┌──────────▼──────────────────────┐
│         profiles                │
│  id (FK→auth.users)             │
│  name, monthly_budget           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│         categories              │
│  id, name, icon, color, type    │
│  (type = 'income'|'expense')    │
└──────────┬──────────────────────┘
           │ 1:N
┌──────────▼──────────────────────┐
│        transactions             │
│  id, user_id, category_id       │
│  amount, description, type, date│
└─────────────────────────────────┘
```

---

## 🧪 Débogage

- Les erreurs Supabase sont loguées dans la console avec `console.error`.
- Active le **Network Inspector** dans Expo Go pour voir les requêtes HTTP.
- Dans le dashboard Supabase, l'onglet **Table Editor** permet de vérifier les données directement.

---

## 📝 Licence

Projet personnel – libre de droits pour apprentissage et usage personnel.
