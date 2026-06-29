/**
 * DashboardScreen – Écran d'accueil principal.
 *
 * Affiche :
 *  - Le solde actuel
 *  - Résumé revenus / dépenses du mois
 *  - Graphique de répartition par catégorie
 *  - Liste des transactions récentes
 *  - Bouton pour ajouter une transaction
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useStore from "../store/useStore";
import { getTransactions, getCategories, deleteTransaction, getTotalSavings, getMonthlySummary, getScheduledExpenses } from "../services/supabase";
import { formatCurrency, getCurrentMonth, formatMonthLabel } from "../constants/categories";
import TransactionCard from "../components/TransactionCard";
import ChartView from "../components/ChartView";
import MonthSelector from "../components/MonthSelector";

export default function DashboardScreen({ navigation }) {
	const user = useStore((s) => s.user);
	const transactions = useStore((s) => s.transactions);
	const setTransactions = useStore((s) => s.setTransactions);
	const setCategories = useStore((s) => s.setCategories);
	const getBalance = useStore((s) => s.getBalance);
	const getMonthlyIncome = useStore((s) => s.getMonthlyIncome);
	const getMonthlyExpenses = useStore((s) => s.getMonthlyExpenses);
	const getCategoryBreakdown = useStore((s) => s.getCategoryBreakdown);
	const removeTransaction = useStore((s) => s.removeTransaction);
	const selectedMonth = useStore((s) => s.selectedMonth);
	const setSelectedMonth = useStore((s) => s.setSelectedMonth);
	const totalSavings = useStore((s) => s.totalSavings);
	const setTotalSavings = useStore((s) => s.setTotalSavings);
	const monthlySaved = useStore((s) => s.monthlySaved);
	const setMonthlySaved = useStore((s) => s.setMonthlySaved);
	const scheduledExpenses = useStore((s) => s.scheduledExpenses);
	const setScheduledExpenses = useStore((s) => s.setScheduledExpenses);

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Charger les données depuis Supabase pour le mois sélectionné
	const loadData = useCallback(async () => {
		if (!user) return;
		try {
			const [txs, cats, total, summary, scheduled] = await Promise.all([
				getTransactions(user.id, selectedMonth),
				getCategories(),
				getTotalSavings(user.id),
				getMonthlySummary(user.id, selectedMonth),
				getScheduledExpenses(user.id),
			]);
			setTransactions(txs);
			setCategories(cats);
			setTotalSavings(total);
			setMonthlySaved(summary.saved);
			setScheduledExpenses(scheduled);
		} catch (error) {
			console.error("Erreur chargement données :", error.message);
		}
	}, [user, selectedMonth, setTransactions, setCategories, setTotalSavings, setMonthlySaved, setScheduledExpenses]);

	useEffect(() => {
		(async () => {
			setLoading(true);
			await loadData();
			setLoading(false);
		})();
	}, [loadData]);

	// Rafraîchir via "pull-to-refresh"
	const handleRefresh = async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	};

	// Données calculées depuis le store
	const balance = getBalance();
	const monthlyIncome = getMonthlyIncome();
	const monthlyExpenses = getMonthlyExpenses();
	const expenseBreakdown = getCategoryBreakdown("expense");
	const isCurrentMonth = selectedMonth === getCurrentMonth();

	if (loading) {
		return (
			<View className="flex-1 bg-surface-light items-center justify-center">
				<ActivityIndicator size="large" color="#6C5CE7" />
				<Text className="text-gray-400 mt-4">Chargement...</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-surface-light pt-12">
			<ScrollView
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						colors={["#6C5CE7"]}
						tintColor="#6C5CE7"
					/>
				}
				showsVerticalScrollIndicator={false}
			>
				{/* ── Sélecteur de mois ───────────────────────── */}
				<MonthSelector
					selectedMonth={selectedMonth}
					onMonthChange={setSelectedMonth}
					className="mx-4 mt-8"
				/>

				{/* ── Carte Solde ─────────────────────────────── */}
				<View className="bg-primary mx-4 mt-4 p-5 rounded-3xl shadow-lg">
					<Text className="text-primary-light text-sm">
						{isCurrentMonth ? "Solde du mois" : `Solde — ${formatMonthLabel(selectedMonth)}`}
					</Text>
					<Text className={`text-white text-4xl font-bold mt-1 ${balance >= 0 ? "" : "text-danger-light"}`}>
						{formatCurrency(balance)}
					</Text>

					{/* Résumé revenus / dépenses / épargne */}
					<View className="flex-row mt-5">
						<View className="flex-1">
							<View className="flex-row items-center">
								<Ionicons name="arrow-down-circle" size={16} color="#55EFC4" />
								<Text className="text-success-light text-xs ml-1">Revenus</Text>
							</View>
							<Text className="text-white font-semibold mt-0.5">{formatCurrency(monthlyIncome)}</Text>
						</View>
						<View className="flex-1">
							<View className="flex-row items-center">
								<Ionicons name="arrow-up-circle" size={16} color="#FAB1A0" />
								<Text className="text-danger-light text-xs ml-1">Dépenses</Text>
							</View>
							<Text className="text-white font-semibold mt-0.5">{formatCurrency(monthlyExpenses)}</Text>
						</View>
						{monthlySaved > 0 && (
							<View className="flex-1">
								<View className="flex-row items-center">
									<Ionicons name="wallet-outline" size={16} color="#81ECEC" />
									<Text className="text-white/70 text-xs ml-1">Épargne</Text>
								</View>
								<Text className="text-white font-semibold mt-0.5">{formatCurrency(monthlySaved)}</Text>
							</View>
						)}
					</View>
				</View>

				{/* ── Teaser épargne ──────────────────────────── */}
				<TouchableOpacity
					onPress={() => navigation.navigate("Savings")}
					activeOpacity={0.9}
					className="mx-4 mt-4"
				>
					<LinearGradient
						colors={["#00B894", "#00907A"]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={{ borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center" }}
					>
						<View className="w-11 h-11 rounded-2xl bg-white/20 items-center justify-center">
							<Ionicons name="wallet-outline" size={22} color="#FFF" />
						</View>
						<View className="flex-1 ml-3">
							<Text className="text-white/80 text-xs">Épargne cumulée</Text>
							<Text className="text-white text-xl font-bold">{formatCurrency(totalSavings)}</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="#FFF" />
					</LinearGradient>
				</TouchableOpacity>

				{/* ── Teaser dépenses fixes ───────────────────── */}
				{scheduledExpenses.length > 0 && (() => {
					const todayDate = new Date().getDate();
					const upcoming = scheduledExpenses
						.filter((e) => e.due_day >= todayDate)
						.sort((a, b) => a.due_day - b.due_day);
					const next = upcoming[0] || scheduledExpenses[0];
					if (!next) return null;
					const daysLeft = next.due_day >= todayDate
						? next.due_day - todayDate
						: null;

					return (
						<TouchableOpacity
							onPress={() => navigation.navigate("Scheduled")}
							activeOpacity={0.9}
							className="mx-4 mt-3"
						>
							<View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center">
								<View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center">
									<Ionicons name="calendar-outline" size={22} color="#6C5CE7" />
								</View>
								<View className="flex-1 ml-3">
									<Text className="text-gray-500 text-xs">Prochaine échéance</Text>
									<Text className="text-gray-900 font-semibold text-sm" numberOfLines={1}>
										{next.name} — {formatCurrency(next.amount)}
									</Text>
								</View>
								{daysLeft !== null && (
									<View className="bg-primary/10 px-2.5 py-1 rounded-full">
										<Text className="text-primary text-xs font-bold">
											{daysLeft === 0 ? "Aujourd'hui" : `J-${daysLeft}`}
										</Text>
									</View>
								)}
								<Ionicons name="chevron-forward" size={18} color="#999" style={{ marginLeft: 8 }} />
							</View>
						</TouchableOpacity>
					);
				})()}

				{/* ── Graphique dépenses par catégorie ────────── */}
				{expenseBreakdown.length > 0 && (
					<View className="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-sm border border-gray-100">
						<Text className="text-gray-800 font-semibold mb-3">Dépenses par catégorie</Text>
						<ChartView data={expenseBreakdown} />
					</View>
				)}

				{/* ── Historique du mois ──────────────────────── */}
				<View className="mt-4 pb-4">
					<View className="flex-row items-center justify-between px-4 mb-3">
						<Text className="text-gray-800 font-semibold text-lg">
							{isCurrentMonth ? "Transactions du mois" : `Historique — ${formatMonthLabel(selectedMonth)}`}
						</Text>
						{transactions.length > 0 && (
							<Text className="text-gray-400 text-xs">{transactions.length} transaction(s)</Text>
						)}
					</View>

					{transactions.length === 0 ? (
						<View className="items-center py-10">
							<Ionicons name="receipt-outline" size={48} color="#DDD" />
							<Text className="text-gray-400 mt-3 text-center px-8">
								Aucune transaction pour {formatMonthLabel(selectedMonth).toLowerCase()}.{"\n"}
								Utilisez les flèches pour consulter un autre mois.
							</Text>
						</View>
					) : (
						transactions.map((tx) => (
							<TransactionCard
								key={tx.id}
								transaction={tx}
								onDelete={(id) => {
									const selectedTx = transactions.find((item) => item.id === id);
									removeTransaction(id);
									deleteTransaction(id, selectedTx?.type).catch(console.error);
								}}
							/>
						))
					)}
				</View>
			</ScrollView>

			{/* ── FAB : Ajouter une transaction ─────────────── */}
			<TouchableOpacity
				onPress={() => navigation.navigate("AddTransaction")}
				className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
				activeOpacity={0.8}
			>
				<Ionicons name="add" size={28} color="#FFF" />
			</TouchableOpacity>
		</View>
	);
}
