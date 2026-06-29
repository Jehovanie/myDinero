/**
 * SavingsScreen – Compte épargne cumulatif.
 *
 * L'épargne s'accumule mois après mois. Chaque versement est plafonné
 * au solde restant du mois (revenus − dépenses − déjà épargné).
 */
import React, { useCallback, useEffect, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../store/useStore";
import {
	getSavings,
	getTotalSavings,
	getMonthlySummary,
	addSaving,
	deleteSaving,
} from "../services/supabase";
import { formatCurrency, formatMonthLabel, getCurrentMonth } from "../constants/categories";
import MonthSelector from "../components/MonthSelector";
import SavingsHistoryCard from "../components/SavingsHistoryCard";
import SavingsTransferModal from "../components/SavingsTransferModal";

function StatPill({ label, value, accent, icon }) {
	return (
		<View className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
			<View className="flex-row items-center mb-1">
				<Ionicons name={icon} size={14} color={accent} />
				<Text className="text-gray-400 text-[10px] ml-1 uppercase tracking-wide">{label}</Text>
			</View>
			<Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>
				{formatCurrency(value)}
			</Text>
		</View>
	);
}

export default function SavingsScreen() {
	const user = useStore((s) => s.user);
	const selectedMonth = useStore((s) => s.selectedMonth);
	const setSelectedMonth = useStore((s) => s.setSelectedMonth);
	const savings = useStore((s) => s.savings);
	const totalSavings = useStore((s) => s.totalSavings);
	const monthlySummary = useStore((s) => s.monthlySummary);
	const setSavingsData = useStore((s) => s.setSavingsData);
	const prependSaving = useStore((s) => s.prependSaving);
	const removeSaving = useStore((s) => s.removeSaving);
	const setMonthlySaved = useStore((s) => s.setMonthlySaved);

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [transferVisible, setTransferVisible] = useState(false);
	const [transferLoading, setTransferLoading] = useState(false);

	const loadData = useCallback(async () => {
		if (!user) return;
		try {
			const [savingsList, total, summary] = await Promise.all([
				getSavings(user.id, selectedMonth),
				getTotalSavings(user.id),
				getMonthlySummary(user.id, selectedMonth),
			]);
			setSavingsData({ savings: savingsList, totalSavings: total, monthlySummary: summary });
			setMonthlySaved(summary.saved);
		} catch (error) {
			console.error("Erreur chargement épargne :", error.message);
		}
	}, [user, selectedMonth, setSavingsData, setMonthlySaved]);

	useEffect(() => {
		(async () => {
			setLoading(true);
			await loadData();
			setLoading(false);
		})();
	}, [loadData]);

	const handleRefresh = async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	};

	const handleTransfer = async ({ amount, description }) => {
		setTransferLoading(true);
		try {
			const newSaving = await addSaving(user.id, {
				amount,
				description,
				month: selectedMonth,
			});
			const [total, summary] = await Promise.all([
				getTotalSavings(user.id),
				getMonthlySummary(user.id, selectedMonth),
			]);
			prependSaving(newSaving, summary, total);
			setMonthlySaved(summary.saved);
			setTransferVisible(false);
			Alert.alert("Succès", `${formatCurrency(amount)} ajouté à votre épargne.`);
		} catch (error) {
			Alert.alert("Impossible de virer", error.message || "Réessayez plus tard.");
		} finally {
			setTransferLoading(false);
		}
	};

	const handleDelete = (id) => {
		Alert.alert("Supprimer ce versement ?", "Le montant sera retiré de votre épargne cumulée.", [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Supprimer",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteSaving(id);
						const [total, summary, savingsList] = await Promise.all([
							getTotalSavings(user.id),
							getMonthlySummary(user.id, selectedMonth),
							getSavings(user.id, selectedMonth),
						]);
						removeSaving(id, summary, total);
						setSavingsData({ savings: savingsList, totalSavings: total, monthlySummary: summary });
						setMonthlySaved(summary.saved);
					} catch (error) {
						Alert.alert("Erreur", error.message);
					}
				},
			},
		]);
	};

	const { balance, saved, available, income, expense } = monthlySummary;
	const saveProgress = balance > 0 ? Math.min(100, Math.round((saved / balance) * 100)) : saved > 0 ? 100 : 0;
	const isCurrentMonth = selectedMonth === getCurrentMonth();
	const canTransfer = available > 0;

	if (loading) {
		return (
			<View className="flex-1 bg-surface-light items-center justify-center">
				<ActivityIndicator size="large" color="#00B894" />
				<Text className="text-gray-400 mt-4">Chargement de l'épargne...</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-surface-light pt-20">
			<ScrollView
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#00B894"]} tintColor="#00B894" />
				}
				contentContainerStyle={{ paddingBottom: 100 }}
			>
				{/* En-tête */}
				<View className="px-4 mb-4">
					<Text className="text-gray-900 text-2xl font-bold">Mon épargne</Text>
					<Text className="text-gray-400 text-sm mt-1">Cumulée mois après mois</Text>
				</View>

				{/* Carte épargne totale */}
				<LinearGradient
					colors={["#00B894", "#006266"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={{ marginHorizontal: 16, borderRadius: 28, padding: 24 }}
				>
					<View className="flex-row items-center justify-between">
						<View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
							<Ionicons name="wallet" size={24} color="#FFF" />
						</View>
						<View className="bg-white/20 px-3 py-1 rounded-full">
							<Text className="text-white/90 text-xs font-medium">Compte épargne</Text>
						</View>
					</View>
					<Text className="text-white/70 text-sm mt-6">Épargne cumulée</Text>
					<Text className="text-white text-4xl font-bold mt-1">{formatCurrency(totalSavings)}</Text>
					<Text className="text-white/60 text-xs mt-3">Tous vos versements mensuels s'additionnent ici</Text>
				</LinearGradient>

				{/* Sélecteur de mois */}
				<MonthSelector
					selectedMonth={selectedMonth}
					onMonthChange={setSelectedMonth}
					className="mx-4 mt-5"
				/>

				{/* Stats du mois */}
				<View className="flex-row mx-4 mt-4">
					<View className="flex-1 mr-1">
						<StatPill label="Solde" value={balance} accent="#6C5CE7" icon="swap-horizontal-outline" />
					</View>
					<View className="flex-1 mx-1">
						<StatPill label="Épargné" value={saved} accent="#00B894" icon="checkmark-circle-outline" />
					</View>
					<View className="flex-1 ml-1">
						<StatPill label="Dispo." value={available} accent="#FDCB6E" icon="flash-outline" />
					</View>
				</View>

				{/* Barre de progression */}
				<View className="bg-white mx-4 mt-4 p-4 rounded-2xl border border-gray-100 shadow-sm">
					<View className="flex-row justify-between mb-2">
						<Text className="text-gray-600 text-sm font-medium">
							{isCurrentMonth ? "Épargne du mois" : formatMonthLabel(selectedMonth)}
						</Text>
						<Text className="text-success text-sm font-bold">{saveProgress}%</Text>
					</View>
					<View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
						<View
							className="h-full rounded-full bg-success"
							style={{ width: `${saveProgress}%` }}
						/>
					</View>
					<Text className="text-gray-400 text-xs mt-2">
						Revenus {formatCurrency(income)} − Dépenses {formatCurrency(expense)} = Solde{" "}
						{formatCurrency(balance)}
					</Text>
				</View>

				{/* CTA virement */}
				<TouchableOpacity
					onPress={() => (canTransfer ? setTransferVisible(true) : null)}
					disabled={!canTransfer}
					activeOpacity={0.85}
					className="mx-4 mt-5"
				>
					<LinearGradient
						colors={canTransfer ? ["#6C5CE7", "#4834D4"] : ["#CCC", "#AAA"]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={{ borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" }}
					>
						<Ionicons name="arrow-forward-circle" size={22} color="#FFF" />
						<Text className="text-white font-semibold text-base ml-2">
							{canTransfer ? "Virer vers l'épargne" : "Rien à épargner ce mois"}
						</Text>
					</LinearGradient>
				</TouchableOpacity>

				{!canTransfer && balance <= 0 && (
					<Text className="text-gray-400 text-xs text-center mx-8 mt-3">
						Ajoutez des revenus ou réduisez vos dépenses pour libérer du solde épargnable.
					</Text>
				)}

				{/* Historique du mois */}
				<View className="mt-8">
					<View className="flex-row items-center justify-between px-4 mb-3">
						<Text className="text-gray-800 font-semibold text-lg">Versements du mois</Text>
						{savings.length > 0 && (
							<Text className="text-gray-400 text-xs">{savings.length} virement(s)</Text>
						)}
					</View>

					{savings.length === 0 ? (
						<View className="items-center py-10 mx-4 bg-white rounded-2xl border border-dashed border-gray-200">
							<Ionicons name="leaf-outline" size={40} color="#DDD" />
							<Text className="text-gray-400 mt-3 text-center px-6 text-sm">
								Aucun versement pour {formatMonthLabel(selectedMonth).toLowerCase()}.
							</Text>
						</View>
					) : (
						savings.map((item) => (
							<SavingsHistoryCard key={item.id} saving={item} onDelete={handleDelete} />
						))
					)}
				</View>
			</ScrollView>

			<SavingsTransferModal
				visible={transferVisible}
				onClose={() => setTransferVisible(false)}
				onSubmit={handleTransfer}
				available={available}
				monthLabel={formatMonthLabel(selectedMonth)}
				loading={transferLoading}
			/>
		</View>
	);
}
