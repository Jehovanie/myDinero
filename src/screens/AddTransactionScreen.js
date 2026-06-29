/**
 * AddTransactionScreen – Formulaire d'ajout d'une transaction.
 *
 * Permet de choisir :
 *  - Type (revenu ou dépense)
 *  - Catégorie
 *  - Montant
 *  - Description (optionnelle)
 *  - Date (par défaut aujourd'hui)
 */
import React, { useState, useMemo } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../store/useStore";
import { addTransaction } from "../services/supabase";
import CategoryPicker from "../components/CategoryPicker";
import { DEFAULT_CATEGORIES } from "../constants/categories";

export default function AddTransactionScreen({ navigation }) {
	const user = useStore((s) => s.user);
	const categories = useStore((s) => s.categories);
	const prependTransaction = useStore((s) => s.prependTransaction);

	const [type, setType] = useState("expense");
	const [categoryId, setCategoryId] = useState(null);
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [loading, setLoading] = useState(false);

	// Filtrer les catégories selon le type sélectionné, avec fallback sur les catégories par défaut
	const filteredCategories = useMemo(() => {
		const typedCategories = categories.filter((c) => c.type === type);
		const defaultCategories = (DEFAULT_CATEGORIES[type] || []).map((cat) => ({
			...cat,
			id: cat.id ?? `${cat.name}-${type}`,
			type,
		}));

		const merged = [...typedCategories];
		defaultCategories.forEach((defaultCat) => {
			if (!merged.some((cat) => cat.name === defaultCat.name)) {
				merged.push(defaultCat);
			}
		});

		return merged;
	}, [categories, type]);

	const selectedCategory = useMemo(() => {
		if (!categoryId) return null;
		return filteredCategories.find((c) => (c.id ?? `${c.name}-${c.type}`) === categoryId) || null;
	}, [categoryId, filteredCategories]);

	// Réinitialiser la catégorie quand on change de type
	const resetForm = () => {
		setAmount("");
		setDescription("");
		setCategoryId(null);
	};

	const handleTypeChange = (newType) => {
		setType(newType);
		setCategoryId(null);
	};

	const handleSubmit = async () => {
		if (!user?.id) {
			Alert.alert("Erreur", "Veuillez vous reconnecter pour ajouter une transaction.");
			return;
		}

		const parsedAmount = parseFloat(amount.replace(",", "."));
		if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
			Alert.alert("Erreur", "Veuillez entrer un montant valide (supérieur à 0).");
			return;
		}
		if (type === "expense" && !selectedCategory) {
			Alert.alert("Erreur", "Veuillez sélectionner une catégorie.");
			return;
		}

		setLoading(true);
		try {
			const newTx = await addTransaction(user.id, {
				type,
				category_id: selectedCategory?.id || null,
				category: selectedCategory
					? {
							id: selectedCategory?.id || null,
							name: selectedCategory.name,
							icon: selectedCategory.icon,
							color: selectedCategory.color,
						}
					: null,
				source: type === "income" ? description.trim() || "Autre revenu" : undefined,
				amount: parsedAmount,
				description: description.trim(),
				date: new Date().toISOString(),
			});
			prependTransaction(newTx);
			resetForm();

			Alert.alert("Succès", "Transaction ajoutée avec succès !", [
				{ text: "OK", onPress: () => navigation.goBack() },
			]);
		} catch (error) {
			Alert.alert("Erreur", "Impossible d'ajouter la transaction. Réessayez.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-surface-light pt-12"
		>
			<ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
				{/* ── Toggle Type ─────────────────────────────── */}
				<View className="flex-row mx-4 mt-8 bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
					<TouchableOpacity
						onPress={() => handleTypeChange("expense")}
						className={`flex-1 py-3 rounded-xl items-center ${type === "expense" ? "bg-danger" : ""}`}
					>
						<Text className={`font-semibold ${type === "expense" ? "text-white" : "text-gray-500"}`}>
							Dépense
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => handleTypeChange("income")}
						className={`flex-1 py-3 rounded-xl items-center ${type === "income" ? "bg-success" : ""}`}
					>
						<Text className={`font-semibold ${type === "income" ? "text-white" : "text-gray-500"}`}>
							Revenu
						</Text>
					</TouchableOpacity>
				</View>

				{/* ── Montant ─────────────────────────────────── */}
				<View className="mx-4 mt-6">
					<Text className="text-gray-600 text-sm mb-1.5 ml-1">Montant</Text>
					<View className="flex-row items-center bg-white rounded-2xl border border-gray-200 px-4 h-16">
						<Text className="text-gray-400 text-xl mr-2">Ar</Text>
						<TextInput
							className="flex-1 text-gray-800 text-2xl font-bold"
							placeholder="0,00"
							placeholderTextColor="#DDD"
							keyboardType="decimal-pad"
							value={amount}
							onChangeText={setAmount}
							autoFocus
						/>
					</View>
				</View>

				{/* ── Catégorie ───────────────────────────────── */}
				<View className="mt-6">
					<Text className="text-gray-600 text-sm mb-2 ml-5">Catégorie</Text>
					{filteredCategories.length > 0 ? (
						<CategoryPicker
							categories={filteredCategories}
							selectedId={
								selectedCategory
									? (selectedCategory.id ?? `${selectedCategory.name}-${selectedCategory.type}`)
									: null
							}
							onSelect={setCategoryId}
						/>
					) : (
						<Text className="text-gray-400 text-sm text-center py-4">
							Aucune catégorie disponible. Vérifiez votre connexion.
						</Text>
					)}
				</View>

				{/* ── Description ─────────────────────────────── */}
				<View className="mx-4 mt-6">
					<Text className="text-gray-600 text-sm mb-1.5 ml-1">Description (optionnelle)</Text>
					<View className="bg-white rounded-2xl border border-gray-200 px-4 h-12">
						<TextInput
							className="flex-1 text-gray-800 text-base"
							placeholder="ex: Courses au supermarché"
							placeholderTextColor="#BBB"
							value={description}
							onChangeText={setDescription}
						/>
					</View>
				</View>

				{/* ── Date ────────────────────────────────────── */}
				<View className="mx-4 mt-6">
					<Text className="text-gray-600 text-sm mb-1.5 ml-1">Date</Text>
					<View className="flex-row items-center bg-white rounded-2xl border border-gray-200 px-4 h-12">
						<Ionicons name="calendar-outline" size={18} color="#999" />
						<Text className="ml-2 text-gray-800">
							{new Date().toLocaleDateString("fr-FR", {
								weekday: "long",
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</Text>
					</View>
				</View>

				{/* ── Bouton Ajouter ──────────────────────────── */}
				<TouchableOpacity
					onPress={handleSubmit}
					disabled={loading}
					className={`mx-4 mt-8 h-14 rounded-2xl items-center justify-center shadow-md ${
						type === "income" ? "bg-success" : "bg-primary"
					}`}
					style={{ opacity: loading ? 0.7 : 1 }}
				>
					{loading ? (
						<ActivityIndicator color="#FFF" />
					) : (
						<Text className="text-white font-semibold text-lg">
							{type === "income" ? "Ajouter un revenu" : "Ajouter une dépense"}
						</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
