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
import useStore from "../store/useStore";
import { getTransactions, getCategories, deleteTransaction } from "../services/supabase";
import { formatCurrency } from "../constants/categories";
import TransactionCard from "../components/TransactionCard";
import ChartView from "../components/ChartView";

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

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Charger les données depuis Supabase
	const loadData = useCallback(async () => {
		if (!user) return;
		try {
			const [txs, cats] = await Promise.all([getTransactions(user.id), getCategories()]);
			setTransactions(txs);
			setCategories(cats);
		} catch (error) {
			console.error("Erreur chargement données :", error.message);
		}
	}, [user, setTransactions, setCategories]);

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
	const recentTransactions = transactions.slice(0, 10); // 10 plus récentes

	// Chargement initial
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
				{/* ── Carte Solde ─────────────────────────────── */}
				<View className="bg-primary mx-4 mt-8 p-5 rounded-3xl shadow-lg">
					<Text className="text-primary-light text-sm">Solde actuel</Text>
					<Text className={`text-white text-4xl font-bold mt-1 ${balance >= 0 ? "" : "text-danger-light"}`}>
						{formatCurrency(balance)}
					</Text>

					{/* Résumé revenus / dépenses */}
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
					</View>
				</View>

				{/* ── Graphique dépenses par catégorie ────────── */}
				{expenseBreakdown.length > 0 && (
					<View className="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-sm border border-gray-100">
						<Text className="text-gray-800 font-semibold mb-3">Dépenses par catégorie</Text>
						<ChartView data={expenseBreakdown} />
					</View>
				)}

				{/* ── Transactions récentes ───────────────────── */}
				<View className="mt-4 pb-4">
					<View className="flex-row items-center justify-between px-4 mb-3">
						<Text className="text-gray-800 font-semibold text-lg">Transactions récentes</Text>
						{transactions.length > 10 && (
							<Text className="text-gray-400 text-xs">{transactions.length} transactions</Text>
						)}
					</View>

					{recentTransactions.length === 0 ? (
						<View className="items-center py-10">
							<Ionicons name="receipt-outline" size={48} color="#DDD" />
							<Text className="text-gray-400 mt-3 text-center px-8">
								Aucune transaction pour le moment.{"\n"}
								Commencez par ajouter une dépense ou un revenu !
							</Text>
						</View>
					) : (
						recentTransactions.map((tx) => (
							<TransactionCard
								key={tx.id}
								transaction={tx}
								onDelete={(id) => {
									removeTransaction(id);
									deleteTransaction(id).catch(console.error);
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
