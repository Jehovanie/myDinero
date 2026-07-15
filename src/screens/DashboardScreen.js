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
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useStore from "../store/useStore";
import { getTransactions, getCategories, deleteTransaction, getTotalSavings, getMonthlySummary, getScheduledExpenses } from "../services/supabase";
import { formatCurrency, getCurrentMonth, formatMonthLabel } from "../constants/categories";
import TransactionCard from "../components/TransactionCard";
import TransactionDetailModal from "../components/TransactionDetailModal";
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
	const [savingsVisible, setSavingsVisible] = useState(false);
	const [txFilter, setTxFilter] = useState("all"); // "all" | "income" | "expense"
	const [selectedTx, setSelectedTx] = useState(null);

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

	// Supprimer une transaction (depuis la carte ou le modal de détail)
	const handleDeleteTransaction = (id) => {
		const txToDelete = transactions.find((item) => item.id === id);
		removeTransaction(id);
		deleteTransaction(id, txToDelete?.type).catch(console.error);
		setSelectedTx(null);
	};

	// Données calculées depuis le store
	const balance = getBalance();
	const monthlyIncome = getMonthlyIncome();
	const monthlyExpenses = getMonthlyExpenses();
	const expenseBreakdown = getCategoryBreakdown("expense");
	const isCurrentMonth = selectedMonth === getCurrentMonth();

	// Onglets Transactions : compteurs + liste filtrée
	const incomeCount = transactions.filter((tx) => tx.type === "income").length;
	const expenseCount = transactions.filter((tx) => tx.type === "expense").length;
	const txTabs = [
		{ key: "all", label: "Toutes", count: transactions.length },
		{ key: "income", label: "Revenus", count: incomeCount },
		{ key: "expense", label: "Dépenses", count: expenseCount },
	];
	const filteredTransactions =
		txFilter === "all" ? transactions : transactions.filter((tx) => tx.type === txFilter);

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
							<Text className="text-white text-xl font-bold">
								{savingsVisible ? formatCurrency(totalSavings) : "••••••"}
							</Text>
						</View>
						<TouchableOpacity
							onPress={() => setSavingsVisible((v) => !v)}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							className="w-9 h-9 rounded-full bg-white/20 items-center justify-center mr-1"
							activeOpacity={0.7}
						>
							<Ionicons
								name={savingsVisible ? "eye-outline" : "eye-off-outline"}
								size={18}
								color="#FFF"
							/>
						</TouchableOpacity>
						<Ionicons name="chevron-forward" size={20} color="#FFF" />
					</LinearGradient>
				</TouchableOpacity>

				{/* ── Teaser dépenses fixes ───────────────────── */}
				{scheduledExpenses.length > 0 && (() => {
					const todayDate = new Date().getDate();

					// Dépenses fixes déjà payées ce mois (transaction "[Fixe]" correspondante)
					const paidIds = new Set(
						transactions
							.filter((tx) => tx.type === "expense" && tx.description?.startsWith("[Fixe]"))
							.map((tx) => scheduledExpenses.find((e) => tx.description.includes(e.name))?.id)
							.filter(Boolean)
					);

					// On ne garde que les échéances non payées
					const unpaid = scheduledExpenses.filter((e) => !paidIds.has(e.id));

					// Si tout est payé ce mois-ci, on n'affiche pas les échéances des mois suivants
					if (unpaid.length === 0) return null;

					const upcoming = unpaid
						.filter((e) => e.due_day >= todayDate)
						.sort((a, b) => a.due_day - b.due_day);
					const next = upcoming[0] || unpaid[0];
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
					<View className="bg-white mx-4 mt-4 p-4 rounded-2xl border border-gray-100">
						<ChartView data={expenseBreakdown} />
					</View>
				)}

				{/* ── Historique du mois ──────────────────────── */}
				<View className="mt-4 pb-4">
					<View className="px-4 mb-3">
						<Text className="text-gray-800 font-semibold text-lg">
							{isCurrentMonth ? "Transactions du mois" : `Historique — ${formatMonthLabel(selectedMonth)}`}
						</Text>
					</View>

					{/* Onglets Toutes / Revenus / Dépenses */}
					<View
						style={{
							flexDirection: "row",
							backgroundColor: "#F1F1F4",
							borderRadius: 16,
							padding: 4,
							marginHorizontal: 16,
							marginBottom: 16,
						}}
					>
						{txTabs.map((tab) => {
							const active = txFilter === tab.key;
							return (
								<Pressable
									key={tab.key}
									onPress={() => setTxFilter(tab.key)}
									style={{
										flex: 1,
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "center",
										paddingVertical: 8,
										borderRadius: 12,
										backgroundColor: active ? "#FFFFFF" : "transparent",
									}}
								>
									<Text
										style={{
											fontSize: 13,
											fontWeight: "600",
											color: active ? "#6C5CE7" : "#999",
										}}
									>
										{tab.label}
									</Text>
									<View
										style={{
											marginLeft: 6,
											paddingHorizontal: 6,
											paddingVertical: 1,
											borderRadius: 999,
											backgroundColor: active ? "#E8E4FF" : "#E2E2E6",
										}}
									>
										<Text
											style={{
												fontSize: 10,
												fontWeight: "700",
												color: active ? "#6C5CE7" : "#999",
											}}
										>
											{tab.count}
										</Text>
									</View>
								</Pressable>
							);
						})}
					</View>

					{filteredTransactions.length === 0 ? (
						<View className="items-center py-10">
							<Ionicons name="receipt-outline" size={48} color="#DDD" />
							<Text className="text-gray-400 mt-3 text-center px-8">
								{transactions.length === 0
									? `Aucune transaction pour ${formatMonthLabel(selectedMonth).toLowerCase()}.\nUtilisez les flèches pour consulter un autre mois.`
									: txFilter === "income"
										? "Aucun revenu ce mois-ci."
										: "Aucune dépense ce mois-ci."}
							</Text>
						</View>
					) : (
						filteredTransactions.map((tx) => (
							<TransactionCard
								key={tx.id}
								transaction={tx}
								onPress={setSelectedTx}
								onDelete={handleDeleteTransaction}
							/>
						))
					)}
				</View>
			</ScrollView>

			{/* ── Modal détail transaction ──────────────────── */}
			<TransactionDetailModal
				visible={!!selectedTx}
				transaction={selectedTx}
				onClose={() => setSelectedTx(null)}
				onDelete={handleDeleteTransaction}
			/>

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
