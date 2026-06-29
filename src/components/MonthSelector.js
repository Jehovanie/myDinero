/**
 * MonthSelector – Navigation entre les mois (précédent / suivant).
 */
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatMonthLabel, shiftMonth, getCurrentMonth, isFutureMonth } from "../constants/categories";

export default function MonthSelector({
	selectedMonth,
	onMonthChange,
	className = "",
	allowFuture = true,
	maxFutureMonths = 12,
}) {
	const currentMonth = getCurrentMonth();
	const maxMonth = allowFuture ? shiftMonth(currentMonth, maxFutureMonths) : currentMonth;
	const canGoNext = selectedMonth < maxMonth;
	const isCurrent = selectedMonth === currentMonth;
	const isFuture = isFutureMonth(selectedMonth);

	return (
		<View className={`flex-row items-center justify-between bg-white rounded-2xl px-3 py-2 shadow-sm border border-gray-100 ${className}`}>
			<TouchableOpacity
				onPress={() => onMonthChange(shiftMonth(selectedMonth, -1))}
				className="w-10 h-10 items-center justify-center rounded-xl bg-gray-50"
				activeOpacity={0.7}
			>
				<Ionicons name="chevron-back" size={22} color="#6C5CE7" />
			</TouchableOpacity>

			<View className="items-center px-2">
				<Text className="text-gray-800 font-semibold text-base">{formatMonthLabel(selectedMonth)}</Text>
				{isCurrent && <Text className="text-primary text-xs mt-0.5">Mois en cours</Text>}
				{isFuture && <Text className="text-blue-500 text-xs mt-0.5">Planification</Text>}
			</View>

			<TouchableOpacity
				onPress={() => canGoNext && onMonthChange(shiftMonth(selectedMonth, 1))}
				disabled={!canGoNext}
				className="w-10 h-10 items-center justify-center rounded-xl bg-gray-50"
				style={{ opacity: canGoNext ? 1 : 0.35 }}
				activeOpacity={0.7}
			>
				<Ionicons name="chevron-forward" size={22} color="#6C5CE7" />
			</TouchableOpacity>
		</View>
	);
}
