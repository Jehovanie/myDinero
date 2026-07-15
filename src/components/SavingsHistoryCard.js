/**
 * SavingsHistoryCard – Ligne d'historique d'un versement d'épargne.
 */
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../constants/categories";

export default function SavingsHistoryCard({ saving, onDelete }) {
	const isWithdrawal = Number(saving.amount) < 0;
	const absAmount = Math.abs(Number(saving.amount));

	return (
		<View className="bg-white mx-4 mb-3 p-4 rounded-2xl flex-row items-center shadow-sm border border-gray-100">
			<View
				className={`w-11 h-11 rounded-2xl items-center justify-center ${
					isWithdrawal ? "bg-amber-100" : "bg-success/10"
				}`}
			>
				<Ionicons
					name={isWithdrawal ? "arrow-up" : "arrow-down"}
					size={20}
					color={isWithdrawal ? "#D97706" : "#00B894"}
				/>
			</View>

			<View className="flex-1 ml-3">
				<Text className="text-sm font-semibold text-gray-800">
					{isWithdrawal ? "Retrait épargne" : "Versement épargne"}
				</Text>
				{saving.description ? (
					<Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
						{saving.description}
					</Text>
				) : null}
				<Text className="text-xs text-gray-400 mt-0.5">
					{saving.date ? new Date(saving.date).toLocaleDateString("fr-FR") : "—"}
				</Text>
			</View>

			<Text className={`text-base font-bold ${isWithdrawal ? "text-amber-600" : "text-success"}`}>
				{isWithdrawal ? "− " : "+ "}
				{formatCurrency(absAmount)}
			</Text>

			{onDelete && (
				<TouchableOpacity
					onPress={() => onDelete(saving.id)}
					className="ml-3 p-1"
					hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				>
					<Ionicons name="trash-outline" size={18} color="#CCC" />
				</TouchableOpacity>
			)}
		</View>
	);
}
