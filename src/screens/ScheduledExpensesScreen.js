/**
 * ScheduledExpensesScreen – Dépenses fixes avec vue calendrier.
 *
 * Affiche un calendrier mensuel avec les échéances, le statut de paiement
 * (payé, en retard, à venir) et permet de marquer une dépense comme payée.
 */
import React, { useCallback, useEffect, useState, useMemo } from "react";
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
	getScheduledExpenses,
	deleteScheduledExpense,
	markScheduledAsPaid,
	getTransactions,
} from "../services/supabase";
import { formatCurrency, getCurrentMonth, formatMonthLabel } from "../constants/categories";
import ScheduledExpenseModal from "../components/ScheduledExpenseModal";
import { rescheduleAllReminders, scheduleReminder, cancelReminder } from "../services/notifications";

// ── Helpers calendrier ──────────────────────────────────────────────────────

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

const getCalendarDays = (year, month) => {
	const firstDay = new Date(year, month, 1);
	let startDay = firstDay.getDay() - 1;
	if (startDay < 0) startDay = 6;
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const days = [];
	for (let i = 0; i < startDay; i++) days.push(null);
	for (let i = 1; i <= daysInMonth; i++) days.push(i);
	return days;
};

// ── Composant carte dépense ─────────────────────────────────────────────────

function ScheduledCard({ expense, status, onPay, onDelete }) {
	const color = expense.category?.color || "#6C5CE7";
	const icon = expense.category?.icon || "receipt-outline";

	const statusConfig = {
		paid: { label: "Payé ✓", bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
		today: { label: "Aujourd'hui !", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
		overdue: { label: "En retard", bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
		upcoming: { label: `Le ${expense.due_day}`, bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
	};
	const s = statusConfig[status] || statusConfig.upcoming;

	return (
		<View className="bg-white mx-4 mb-3 p-4 rounded-2xl border border-gray-100 shadow-sm">
			<View className="flex-row items-center">
				{/* Icône catégorie */}
				<View
					className="w-11 h-11 rounded-2xl items-center justify-center"
					style={{ backgroundColor: color + "20" }}
				>
					<Ionicons name={icon} size={20} color={color} />
				</View>

				{/* Infos */}
				<View className="flex-1 ml-3">
					<Text className="text-gray-900 font-semibold text-base" numberOfLines={1}>
						{expense.name}
					</Text>
					<Text className="text-gray-400 text-xs mt-0.5">
						{formatCurrency(expense.amount)} • Le {expense.due_day} du mois
					</Text>
				</View>

				{/* Badge statut */}
				<View className={`px-2.5 py-1 rounded-full border ${s.bg} ${s.border}`}>
					<Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
				</View>
			</View>

			{/* Actions */}
			{status !== "paid" && (
				<View className="flex-row mt-3 pt-3 border-t border-gray-50">
					<TouchableOpacity
						onPress={() => onPay(expense)}
						className="flex-1 flex-row items-center justify-center py-2 rounded-xl bg-green-50 mr-2"
						activeOpacity={0.7}
					>
						<Ionicons name="checkmark-circle-outline" size={16} color="#00B894" />
						<Text className="text-green-600 font-semibold text-sm ml-1.5">Payer</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => onDelete(expense.id)}
						className="flex-row items-center justify-center py-2 px-4 rounded-xl bg-red-50"
						activeOpacity={0.7}
					>
						<Ionicons name="trash-outline" size={16} color="#EF4444" />
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}

// ── Écran principal ─────────────────────────────────────────────────────────

export default function ScheduledExpensesScreen() {
	const user = useStore((s) => s.user);
	const scheduledExpenses = useStore((s) => s.scheduledExpenses);
	const setScheduledExpenses = useStore((s) => s.setScheduledExpenses);
	const addScheduledExpenseStore = useStore((s) => s.addScheduledExpense);
	const removeScheduledExpenseStore = useStore((s) => s.removeScheduledExpense);
	const selectedMonth = useStore((s) => s.selectedMonth);
	const categories = useStore((s) => s.categories);
	const prependTransaction = useStore((s) => s.prependTransaction);

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [modalLoading, setModalLoading] = useState(false);
	const [selectedDay, setSelectedDay] = useState(null);
	const [paidIds, setPaidIds] = useState(new Set());

	// Parse le mois sélectionné
	const [viewYear, viewMonth] = useMemo(() => {
		const [y, m] = (selectedMonth || getCurrentMonth()).split("-").map(Number);
		return [y, m - 1]; // JS months are 0-indexed
	}, [selectedMonth]);

	const today = new Date();
	const isCurrentMonth =
		today.getFullYear() === viewYear && today.getMonth() === viewMonth;
	const todayDay = isCurrentMonth ? today.getDate() : -1;

	const calendarDays = useMemo(
		() => getCalendarDays(viewYear, viewMonth),
		[viewYear, viewMonth]
	);

	// Jours avec des échéances
	const dueDaysSet = useMemo(() => {
		const set = new Set();
		scheduledExpenses.forEach((e) => set.add(e.due_day));
		return set;
	}, [scheduledExpenses]);

	// Couleurs par jour
	const dayColorMap = useMemo(() => {
		const map = {};
		scheduledExpenses.forEach((e) => {
			if (!map[e.due_day]) map[e.due_day] = e.category?.color || "#6C5CE7";
		});
		return map;
	}, [scheduledExpenses]);

	// Charger les données
	const loadData = useCallback(async () => {
		if (!user) return;
		try {
			const [scheduled, txs] = await Promise.all([
				getScheduledExpenses(user.id),
				getTransactions(user.id, selectedMonth),
			]);
			setScheduledExpenses(scheduled);

			// Reconstruire les IDs payés depuis les transactions du mois
			const paid = new Set();
			txs
				.filter((tx) => tx.type === "expense" && tx.description?.startsWith("[Fixe]"))
				.forEach((tx) => {
					const match = scheduled.find((s) => tx.description.includes(s.name));
					if (match) paid.add(match.id);
				});
			setPaidIds(paid);

			// Replanifier les notifications
			rescheduleAllReminders(scheduled).catch(console.warn);
		} catch (error) {
			console.error("Erreur chargement dépenses fixes :", error.message);
		}
	}, [user, selectedMonth, setScheduledExpenses]);

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

	// Statut d'une dépense
	const getStatus = (expense) => {
		if (paidIds.has(expense.id)) return "paid";
		if (expense.due_day === todayDay) return "today";
		if (isCurrentMonth && expense.due_day < todayDay) return "overdue";
		return "upcoming";
	};

	// Marquer comme payé
	const handlePay = async (expense) => {
		try {
			const newTx = await markScheduledAsPaid(user.id, expense, selectedMonth);
			prependTransaction(newTx);
			setPaidIds((prev) => new Set([...prev, expense.id]));
			Alert.alert("Payé ✓", `${expense.name} marqué comme payé pour ce mois.`);
		} catch (error) {
			Alert.alert("Erreur", error.message || "Impossible de marquer comme payé.");
		}
	};

	// Ajouter une dépense fixe
	const handleAddExpense = async (formData) => {
		setModalLoading(true);
		try {
			const { addScheduledExpense } = await import("../services/supabase");
			const newExpense = await addScheduledExpense(user.id, formData);
			addScheduledExpenseStore(newExpense);
			scheduleReminder(newExpense).catch(console.warn);
			setModalVisible(false);
			Alert.alert("Ajouté ✓", `${newExpense.name} programmé le ${newExpense.due_day} de chaque mois.`);
		} catch (error) {
			Alert.alert("Erreur", error.message || "Impossible d'ajouter.");
		} finally {
			setModalLoading(false);
		}
	};

	// Supprimer
	const handleDelete = (id) => {
		Alert.alert("Supprimer ?", "Cette dépense fixe sera définitivement supprimée.", [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Supprimer",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteScheduledExpense(id);
						removeScheduledExpenseStore(id);
						cancelReminder(id).catch(console.warn);
					} catch (error) {
						Alert.alert("Erreur", error.message);
					}
				},
			},
		]);
	};

	// Stats
	const totalFixed = scheduledExpenses.reduce((sum, e) => sum + e.amount, 0);
	const totalPaid = scheduledExpenses
		.filter((e) => paidIds.has(e.id))
		.reduce((sum, e) => sum + e.amount, 0);
	const totalRemaining = totalFixed - totalPaid;

	// Filtrer par jour sélectionné
	const filteredExpenses = selectedDay
		? scheduledExpenses.filter((e) => e.due_day === selectedDay)
		: scheduledExpenses;

	if (loading) {
		return (
			<View className="flex-1 bg-surface-light items-center justify-center">
				<ActivityIndicator size="large" color="#6C5CE7" />
				<Text className="text-gray-400 mt-4">Chargement des dépenses fixes...</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-surface-light pt-12">
			<ScrollView
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						colors={["#6C5CE7"]}
						tintColor="#6C5CE7"
					/>
				}
				contentContainerStyle={{ paddingBottom: 100 }}
			>
				{/* En-tête */}
				<View className="px-4 mb-4">
					<Text className="text-gray-900 text-2xl font-bold">Dépenses fixes</Text>
					<Text className="text-gray-400 text-sm mt-1">Planification et suivi mensuel</Text>
				</View>

				{/* Carte stats */}
				<LinearGradient
					colors={["#6C5CE7", "#4834D4"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={{ marginHorizontal: 16, borderRadius: 28, padding: 24 }}
				>
					<View className="flex-row items-center justify-between">
						<View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
							<Ionicons name="calendar" size={24} color="#FFF" />
						</View>
						<View className="bg-white/20 px-3 py-1 rounded-full">
							<Text className="text-white/90 text-xs font-medium">Charges fixes</Text>
						</View>
					</View>

					<Text className="text-white/70 text-sm mt-6">Total mensuel</Text>
					<Text className="text-white text-4xl font-bold mt-1">
						{formatCurrency(totalFixed)}
					</Text>

					<View className="flex-row mt-5">
						<View className="flex-1">
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={14} color="#55EFC4" />
								<Text className="text-white/70 text-xs ml-1">Payé</Text>
							</View>
							<Text className="text-white font-semibold mt-0.5">
								{formatCurrency(totalPaid)}
							</Text>
						</View>
						<View className="flex-1">
							<View className="flex-row items-center">
								<Ionicons name="time-outline" size={14} color="#FDCB6E" />
								<Text className="text-white/70 text-xs ml-1">Reste</Text>
							</View>
							<Text className="text-white font-semibold mt-0.5">
								{formatCurrency(totalRemaining)}
							</Text>
						</View>
						<View className="flex-1">
							<View className="flex-row items-center">
								<Ionicons name="list-outline" size={14} color="#81ECEC" />
								<Text className="text-white/70 text-xs ml-1">Nombre</Text>
							</View>
							<Text className="text-white font-semibold mt-0.5">
								{scheduledExpenses.length}
							</Text>
						</View>
					</View>
				</LinearGradient>

				{/* Mois affiché */}
				<View className="mx-4 mt-5 mb-2">
					<Text className="text-gray-600 font-semibold text-base">
						📅 {formatMonthLabel(selectedMonth || getCurrentMonth())}
					</Text>
				</View>

				{/* Calendrier */}
				<View className="bg-white mx-4 rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
					{/* Labels jours */}
					<View className="flex-row mb-2">
						{DAY_LABELS.map((label, i) => (
							<View key={i} className="flex-1 items-center">
								<Text className="text-gray-400 text-xs font-medium">{label}</Text>
							</View>
						))}
					</View>

					{/* Grille jours */}
					<View className="flex-row flex-wrap">
						{calendarDays.map((day, index) => {
							if (day === null) {
								return <View key={`empty-${index}`} style={{ width: "14.28%" }} className="h-11" />;
							}

							const hasDue = dueDaysSet.has(day);
							const isToday = day === todayDay;
							const isSelected = selectedDay === day;
							const isPast = isCurrentMonth && day < todayDay;
							const dotColor = dayColorMap[day] || "#6C5CE7";

							return (
								<TouchableOpacity
									key={day}
									onPress={() => setSelectedDay(isSelected ? null : day)}
									style={{ width: "14.28%" }}
									className="h-11 items-center justify-center"
									activeOpacity={0.6}
								>
									<View
										className={`w-8 h-8 rounded-full items-center justify-center ${
											isSelected
												? "bg-primary"
												: isToday
													? "bg-primary/10"
													: ""
										}`}
									>
										<Text
											className={`text-sm font-medium ${
												isSelected
													? "text-white"
													: isToday
														? "text-primary font-bold"
														: isPast
															? "text-gray-300"
															: "text-gray-700"
											}`}
										>
											{day}
										</Text>
									</View>
									{hasDue && (
										<View
											className="w-1.5 h-1.5 rounded-full mt-0.5"
											style={{ backgroundColor: isSelected ? "#6C5CE7" : dotColor }}
										/>
									)}
								</TouchableOpacity>
							);
						})}
					</View>

					{/* Légende filtre actif */}
					{selectedDay && (
						<TouchableOpacity
							onPress={() => setSelectedDay(null)}
							className="flex-row items-center justify-center mt-3 py-2 bg-primary/5 rounded-xl"
						>
							<Ionicons name="funnel-outline" size={14} color="#6C5CE7" />
							<Text className="text-primary text-xs font-medium ml-1.5">
								Jour {selectedDay} sélectionné — Tout afficher
							</Text>
						</TouchableOpacity>
					)}
				</View>

				{/* Liste des échéances */}
				<View className="mt-2">
					<View className="flex-row items-center justify-between px-4 mb-3">
						<Text className="text-gray-800 font-semibold text-lg">
							{selectedDay ? `Échéances du ${selectedDay}` : "Toutes les échéances"}
						</Text>
						{filteredExpenses.length > 0 && (
							<Text className="text-gray-400 text-xs">
								{filteredExpenses.length} fixe(s)
							</Text>
						)}
					</View>

					{filteredExpenses.length === 0 ? (
						<View className="items-center py-10 mx-4 bg-white rounded-2xl border border-dashed border-gray-200">
							<Ionicons name="calendar-outline" size={44} color="#DDD" />
							<Text className="text-gray-400 mt-3 text-center px-6 text-sm">
								{selectedDay
									? `Aucune dépense fixe prévue le ${selectedDay}.`
									: "Aucune dépense fixe programmée.\nAjoutez votre loyer, électricité…"}
							</Text>
							{!selectedDay && (
								<TouchableOpacity
									onPress={() => setModalVisible(true)}
									className="mt-4 px-5 py-2.5 bg-primary/10 rounded-full"
								>
									<Text className="text-primary font-semibold text-sm">+ Ajouter</Text>
								</TouchableOpacity>
							)}
						</View>
					) : (
						filteredExpenses.map((expense) => (
							<ScheduledCard
								key={expense.id}
								expense={expense}
								status={getStatus(expense)}
								onPay={handlePay}
								onDelete={handleDelete}
							/>
						))
					)}
				</View>
			</ScrollView>

			{/* FAB */}
			<TouchableOpacity
				onPress={() => setModalVisible(true)}
				activeOpacity={0.85}
				style={{
					position: "absolute",
					bottom: 24,
					right: 24,
					width: 56,
					height: 56,
					borderRadius: 28,
					overflow: "hidden",
					elevation: 8,
					shadowColor: "#6C5CE7",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.3,
					shadowRadius: 8,
				}}
			>
				<LinearGradient
					colors={["#6C5CE7", "#4834D4"]}
					style={{
						flex: 1,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Ionicons name="add" size={28} color="#FFF" />
				</LinearGradient>
			</TouchableOpacity>

			{/* Modal ajout */}
			<ScheduledExpenseModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSubmit={handleAddExpense}
				categories={categories}
				loading={modalLoading}
			/>
		</View>
	);
}
