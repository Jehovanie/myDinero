/**
 * ScheduledExpenseModal – Modal pour ajouter / modifier une dépense fixe.
 */
import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Modal,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../constants/categories";

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export default function ScheduledExpenseModal({
	visible,
	onClose,
	onSubmit,
	categories = [],
	loading,
	editingExpense = null,
}) {
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [dueDay, setDueDay] = useState(1);
	const [categoryId, setCategoryId] = useState(null);

	useEffect(() => {
		if (visible) {
			if (editingExpense) {
				setName(editingExpense.name || "");
				setAmount(String(editingExpense.amount || ""));
				setDueDay(editingExpense.due_day || 1);
				setCategoryId(editingExpense.categorie_expense_id || editingExpense.category?.id || null);
			} else {
				setName("");
				setAmount("");
				setDueDay(1);
				setCategoryId(null);
			}
		}
	}, [visible, editingExpense]);

	const parsedAmount = parseFloat(String(amount).replace(",", "."));
	const isValid = name.trim().length > 0 && !isNaN(parsedAmount) && parsedAmount > 0 && dueDay >= 1 && dueDay <= 28;

	const handleSubmit = () => {
		if (!isValid || loading) return;
		onSubmit({
			name: name.trim(),
			amount: parsedAmount,
			due_day: dueDay,
			categorie_expense_id: categoryId,
		});
	};

	const isEditing = !!editingExpense;
	const expenseCategories = categories.filter((c) => c.type === "expense");

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1 justify-end bg-black/40"
			>
				<View className="bg-white rounded-t-[32px] px-6 pt-6 pb-10 max-h-[92%]">
					{/* En-tête */}
					<View className="flex-row items-center justify-between mb-1">
						<Text className="text-gray-900 text-xl font-bold">
							{isEditing ? "Modifier la dépense fixe" : "Nouvelle dépense fixe"}
						</Text>
						<TouchableOpacity
							onPress={onClose}
							className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
						>
							<Ionicons name="close" size={20} color="#666" />
						</TouchableOpacity>
					</View>
					<Text className="text-gray-400 text-sm mb-5">
						{isEditing ? "Modifiez les détails ci-dessous" : "Loyer, électricité, abonnements…"}
					</Text>

					<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
						{/* Nom */}
						<Text className="text-gray-600 text-sm mb-2">Nom de la dépense</Text>
						<View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 h-14 mb-4">
							<Ionicons name="receipt-outline" size={18} color="#999" />
							<TextInput
								className="flex-1 text-gray-800 text-base ml-3"
								placeholder="ex: Loyer, Électricité..."
								placeholderTextColor="#CCC"
								value={name}
								onChangeText={setName}
								autoFocus={!isEditing}
							/>
						</View>

						{/* Montant */}
						<Text className="text-gray-600 text-sm mb-2">Montant</Text>
						<View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 h-16 mb-4">
							<Text className="text-gray-400 text-xl mr-2">Ar</Text>
							<TextInput
								className="flex-1 text-gray-900 text-2xl font-bold"
								placeholder="0"
								placeholderTextColor="#DDD"
								keyboardType="decimal-pad"
								value={amount}
								onChangeText={setAmount}
							/>
						</View>

						{/* Jour d'échéance */}
						<Text className="text-gray-600 text-sm mb-2">Jour d'échéance (1 – 28)</Text>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							className="mb-4"
							contentContainerStyle={{ paddingRight: 8 }}
						>
							{DAYS.map((day) => {
								const selected = dueDay === day;
								return (
									<TouchableOpacity
										key={day}
										onPress={() => setDueDay(day)}
										className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
											selected ? "bg-primary" : "bg-gray-100"
										}`}
									>
										<Text
											className={`text-sm font-semibold ${selected ? "text-white" : "text-gray-500"}`}
										>
											{day}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>

						{/* Catégorie */}
						{expenseCategories.length > 0 && (
							<>
								<Text className="text-gray-600 text-sm mb-2">Catégorie</Text>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									className="mb-5"
									contentContainerStyle={{ paddingRight: 8 }}
								>
									{/* Option sans catégorie */}
									<TouchableOpacity
										onPress={() => setCategoryId(null)}
										className={`flex-row items-center px-3 py-2 rounded-full mr-2 border ${
											categoryId === null ? "border-primary bg-primary/10" : "border-gray-200 bg-gray-50"
										}`}
									>
										<Ionicons name="ellipse-outline" size={14} color={categoryId === null ? "#6C5CE7" : "#999"} />
										<Text
											className={`text-xs font-medium ml-1.5 ${
												categoryId === null ? "text-primary" : "text-gray-500"
											}`}
										>
											Aucune
										</Text>
									</TouchableOpacity>
									{expenseCategories.map((cat) => {
										const catId = cat.id ?? `${cat.name}-${cat.type}`;
										const selected = categoryId === catId;
										return (
											<TouchableOpacity
												key={catId}
												onPress={() => setCategoryId(catId)}
												className={`flex-row items-center px-3 py-2 rounded-full mr-2 border ${
													selected ? "border-primary bg-primary/10" : "border-gray-200 bg-gray-50"
												}`}
											>
												<View
													className="w-5 h-5 rounded-full items-center justify-center"
													style={{ backgroundColor: cat.color || "#999" }}
												>
													{cat.icon && <Ionicons name={cat.icon} size={10} color="#FFF" />}
												</View>
												<Text
													className={`text-xs font-medium ml-1.5 ${
														selected ? "text-primary" : "text-gray-500"
													}`}
												>
													{cat.name}
												</Text>
											</TouchableOpacity>
										);
									})}
								</ScrollView>
							</>
						)}

						{/* Aperçu */}
						{isValid && (
							<View className="bg-primary/5 border border-primary/15 rounded-2xl p-4 mb-5">
								<Text className="text-gray-500 text-xs mb-1">Aperçu</Text>
								<Text className="text-gray-900 font-bold text-base">
									{name.trim()} — {formatCurrency(parsedAmount)}
								</Text>
								<Text className="text-gray-400 text-xs mt-1">
									Prélevé le {dueDay} de chaque mois • Rappel la veille
								</Text>
							</View>
						)}

						{/* Bouton */}
						<TouchableOpacity
							onPress={handleSubmit}
							disabled={!isValid || loading}
							className="h-14 rounded-2xl items-center justify-center bg-primary mb-4"
							style={{ opacity: !isValid || loading ? 0.5 : 1 }}
						>
							{loading ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<Text className="text-white font-semibold text-lg">
									{isEditing ? "Enregistrer" : "Ajouter la dépense fixe"}
								</Text>
							)}
						</TouchableOpacity>
					</ScrollView>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
