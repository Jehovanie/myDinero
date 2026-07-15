/**
 * TransactionDetailModal – Fiche détaillée d'une transaction.
 *
 * S'ouvre en bottom sheet (bas vers le haut) et affiche toutes les
 * informations pertinentes : type, montant, catégorie, note, date.
 */
import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../constants/categories";

const formatFullDate = (value) => {
	if (!value) return "Date inconnue";
	try {
		return new Date(value).toLocaleDateString("fr-FR", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	} catch {
		return "Date inconnue";
	}
};

const formatTime = (value) => {
	if (!value) return null;
	try {
		return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
	} catch {
		return null;
	}
};

function DetailRow({ icon, label, value, color = "#6C5CE7" }) {
	if (!value) return null;
	return (
		<View className="flex-row items-center py-3 border-b border-gray-50">
			<View
				className="w-9 h-9 rounded-xl items-center justify-center"
				style={{ backgroundColor: color + "18" }}
			>
				<Ionicons name={icon} size={17} color={color} />
			</View>
			<Text className="text-gray-400 text-sm ml-3 flex-1">{label}</Text>
			<Text className="text-gray-800 text-sm font-semibold text-right flex-1" numberOfLines={2}>
				{value}
			</Text>
		</View>
	);
}

export default function TransactionDetailModal({ visible, transaction, onClose, onDelete }) {
	if (!transaction) return null;

	const isIncome = transaction.type === "income";
	const accent = isIncome ? "#00B894" : "#EF4444";
	const categoryColor = transaction.category?.color || accent;
	const categoryIcon = transaction.category?.icon || (isIncome ? "cash-outline" : "wallet-outline");
	const categoryName = transaction.category?.name || "Sans catégorie";
	const time = formatTime(transaction.date);

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			{/* Fond : un appui en dehors de la feuille ferme le modal */}
			<Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
				{/* Feuille : capture l'appui pour ne pas fermer le modal */}
				<Pressable
					onPress={() => {}}
					className="bg-white rounded-t-[32px] px-6 pt-4 pb-10 max-h-[90%]"
				>
					{/* Poignée */}
					<View className="items-center mb-4">
						<View className="w-10 h-1.5 rounded-full bg-gray-200" />
					</View>

					{/* En-tête : type + fermer */}
					<View className="flex-row items-center justify-between mb-6">
						<View
							className="flex-row items-center px-3 py-1.5 rounded-full"
							style={{ backgroundColor: accent + "18" }}
						>
							<Ionicons
								name={isIncome ? "arrow-down-circle" : "arrow-up-circle"}
								size={16}
								color={accent}
							/>
							<Text className="text-sm font-semibold ml-1.5" style={{ color: accent }}>
								{isIncome ? "Revenu" : "Dépense"}
							</Text>
						</View>
						<TouchableOpacity
							onPress={onClose}
							className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
						>
							<Ionicons name="close" size={20} color="#666" />
						</TouchableOpacity>
					</View>

					{/* Montant */}
					<View className="items-center mb-6">
						<View
							className="w-16 h-16 rounded-3xl items-center justify-center mb-3"
							style={{ backgroundColor: categoryColor + "20" }}
						>
							<Ionicons name={categoryIcon} size={30} color={categoryColor} />
						</View>
						<Text className="text-4xl font-bold" style={{ color: accent }}>
							{isIncome ? "+" : "−"} {formatCurrency(Math.abs(Number(transaction.amount)))}
						</Text>
						<Text className="text-gray-400 text-sm mt-1">{categoryName}</Text>
					</View>

					{/* Détails */}
					<View className="bg-gray-50 rounded-2xl px-4 py-1 mb-6">
						<DetailRow icon={categoryIcon} label="Catégorie" value={categoryName} color={categoryColor} />
						<DetailRow
							icon="chatbubble-ellipses-outline"
							label="Note"
							value={transaction.description || "—"}
						/>
						<DetailRow icon="calendar-outline" label="Date" value={formatFullDate(transaction.date)} />
						<DetailRow icon="time-outline" label="Heure" value={time} />
					</View>

					{/* Action : supprimer */}
					{onDelete && (
						<TouchableOpacity
							onPress={() => onDelete(transaction.id)}
							activeOpacity={0.85}
							className="h-14 rounded-2xl items-center justify-center flex-row bg-red-50 border border-red-100"
						>
							<Ionicons name="trash-outline" size={18} color="#EF4444" />
							<Text className="text-danger font-semibold text-base ml-2">Supprimer la transaction</Text>
						</TouchableOpacity>
					)}
				</Pressable>
			</Pressable>
		</Modal>
	);
}
