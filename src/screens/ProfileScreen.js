/**
 * ProfileScreen – Profil utilisateur et paramètres.
 *
 * Fonctionnalités :
 *  - Affichage des infos du compte
 *  - Définition du budget mensuel
 *  - Déconnexion
 */
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../store/useStore";
import { getProfile, updateProfile, signOut } from "../services/supabase";
import { formatCurrency } from "../constants/categories";

export default function ProfileScreen({ navigation }) {
	const user = useStore((s) => s.user);
	const profile = useStore((s) => s.profile);
	const setProfile = useStore((s) => s.setProfile);
	const resetAll = useStore((s) => s.resetAll);
	const transactions = useStore((s) => s.transactions);

	const [loading, setLoading] = useState(true);
	const [budget, setBudget] = useState("");
	const [savingBudget, setSavingBudget] = useState(false);

	// Charger le profil
	useEffect(() => {
		(async () => {
			if (!user) return;
			try {
				const p = await getProfile(user.id);
				setProfile(p);
				setBudget(p?.monthly_budget?.toString() || "");
			} catch (error) {
				console.error("Erreur chargement profil :", error.message);
			} finally {
				setLoading(false);
			}
		})();
	}, [user, setProfile]);

	// Sauvegarder le budget mensuel
	const handleSaveBudget = async () => {
		const parsedBudget = parseFloat(budget.replace(",", "."));
		if (isNaN(parsedBudget) || parsedBudget < 0) {
			Alert.alert("Erreur", "Veuillez entrer un budget valide.");
			return;
		}

		setSavingBudget(true);
		try {
			const updated = await updateProfile(user.id, {
				monthly_budget: parsedBudget,
			});
			setProfile(updated);
			Alert.alert("Succès", "Budget mensuel mis à jour.");
		} catch (error) {
			Alert.alert("Erreur", "Impossible de mettre à jour le budget.");
		} finally {
			setSavingBudget(false);
		}
	};

	// Déconnexion
	const handleLogout = () => {
		Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Déconnexion",
				style: "destructive",
				onPress: async () => {
					try {
						await signOut();
					} catch (error) {
						console.error("Erreur déconnexion :", error.message);
					}
					resetAll();
				},
			},
		]);
	};

	// Stats basiques
	const totalTransactions = transactions.length;
	const totalExpenses = transactions
		.filter((t) => t.type === "expense")
		.reduce((sum, t) => sum + Number(t.amount), 0);

	const budgetValue = parseFloat(budget) || 0;
	const budgetPercentage = budgetValue > 0 ? Math.min(100, Math.round((totalExpenses / budgetValue) * 100)) : 0;

	if (loading) {
		return (
			<View className="flex-1 bg-surface-light items-center justify-center">
				<ActivityIndicator size="large" color="#6C5CE7" />
			</View>
		);
	}

	return (
		<ScrollView className="flex-1 bg-surface-light">
			{/* ── En-tête Profil ────────────────────────────── */}
			<View className="bg-primary pt-24 pb-8 px-6 rounded-b-[40px] items-center">
				<View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-3">
					<Text className="text-white text-2xl font-bold">
						{(profile?.name || user?.email || "?")[0].toUpperCase()}
					</Text>
				</View>
				<Text className="text-white text-xl font-bold">{profile?.name || "Utilisateur"}</Text>
				<Text className="text-primary-light text-sm">{user?.email}</Text>
			</View>

			{/* ── Statistiques ──────────────────────────────── */}
			<View className="flex-row mx-4 -mt-6">
				<View className="flex-1 bg-white mx-1 rounded-2xl p-4 items-center shadow-sm border border-gray-100">
					<Ionicons name="receipt-outline" size={22} color="#6C5CE7" />
					<Text className="text-gray-800 text-lg font-bold mt-1">{totalTransactions}</Text>
					<Text className="text-gray-400 text-xs">transactions</Text>
				</View>
				<View className="flex-1 bg-white mx-1 rounded-2xl p-4 items-center shadow-sm border border-gray-100">
					<Ionicons name="trending-down-outline" size={22} color="#E17055" />
					<Text className="text-gray-800 text-lg font-bold mt-1">{formatCurrency(totalExpenses)}</Text>
					<Text className="text-gray-400 text-xs">dépenses ce mois</Text>
				</View>
			</View>

			{/* ── Budget mensuel ────────────────────────────── */}
			<View className="bg-white mx-4 mt-4 p-5 rounded-2xl shadow-sm border border-gray-100">
				<Text className="text-gray-800 font-semibold mb-3">Budget mensuel</Text>
				<View className="flex-row items-center">
					<TextInput
						className="flex-1 bg-gray-50 rounded-xl px-4 h-12 text-gray-800 text-base"
						placeholder="0,00"
						placeholderTextColor="#BBB"
						keyboardType="decimal-pad"
						value={budget}
						onChangeText={setBudget}
					/>
					<Text className="text-gray-400 mx-2">€</Text>
					<TouchableOpacity
						onPress={handleSaveBudget}
						disabled={savingBudget}
						className="bg-primary h-12 px-5 rounded-xl items-center justify-center"
					>
						{savingBudget ? (
							<ActivityIndicator color="#FFF" size="small" />
						) : (
							<Text className="text-white font-semibold">Enregistrer</Text>
						)}
					</TouchableOpacity>
				</View>

				{/* Barre de progression du budget */}
				{budgetValue > 0 && (
					<View className="mt-4">
						<View className="flex-row justify-between mb-1">
							<Text className="text-gray-500 text-xs">Progression</Text>
							<Text
								className={`text-xs font-semibold ${
									budgetPercentage > 80 ? "text-danger" : "text-primary"
								}`}
							>
								{budgetPercentage}%
							</Text>
						</View>
						<View className="h-2 bg-gray-100 rounded-full overflow-hidden">
							<View
								className="h-full rounded-full"
								style={{
									width: `${budgetPercentage}%`,
									backgroundColor:
										budgetPercentage > 80
											? "#E17055"
											: budgetPercentage > 50
												? "#FAB1A0"
												: "#6C5CE7",
								}}
							/>
						</View>
						<Text className="text-gray-400 text-xs mt-1">
							{formatCurrency(totalExpenses)} / {formatCurrency(budgetValue)}
						</Text>
					</View>
				)}
			</View>

			{/* ── Bouton Déconnexion ────────────────────────── */}
			<TouchableOpacity
				onPress={handleLogout}
				className="flex-row items-center justify-center mx-4 mt-6 mb-10 bg-white border border-red-200 h-12 rounded-xl"
			>
				<Ionicons name="log-out-outline" size={18} color="#E17055" />
				<Text className="text-danger font-semibold ml-2">Se déconnecter</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}
