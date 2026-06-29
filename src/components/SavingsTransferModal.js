/**
 * SavingsTransferModal – Modal pour virer un montant vers l'épargne.
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
import { formatCurrency, formatMonthLabel } from "../constants/categories";

const QUICK_PRESETS = [
	{ label: "25%", ratio: 0.25 },
	{ label: "50%", ratio: 0.5 },
	{ label: "Max", ratio: 1 },
];

export default function SavingsTransferModal({
	visible,
	onClose,
	onSubmit,
	available,
	monthLabel,
	loading,
}) {
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");

	useEffect(() => {
		if (visible) {
			setAmount("");
			setNote("");
		}
	}, [visible]);

	const parsedAmount = parseFloat(String(amount).replace(",", "."));
	const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= available;

	const applyPreset = (ratio) => {
		const value = Math.floor(available * ratio);
		if (value > 0) setAmount(String(value));
	};

	const handleSubmit = () => {
		if (!isValid || loading) return;
		onSubmit({ amount: parsedAmount, description: note.trim() });
	};

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1 justify-end bg-black/40"
			>
				<View className="bg-white rounded-t-[32px] px-6 pt-6 pb-10 max-h-[90%]">
					<View className="flex-row items-center justify-between mb-1">
						<Text className="text-gray-900 text-xl font-bold">Virer vers l'épargne</Text>
						<TouchableOpacity onPress={onClose} className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
							<Ionicons name="close" size={20} color="#666" />
						</TouchableOpacity>
					</View>
					<Text className="text-gray-400 text-sm mb-6">{monthLabel}</Text>

					<View className="bg-success/5 border border-success/20 rounded-2xl p-4 mb-6">
						<Text className="text-gray-500 text-xs">Disponible à épargner</Text>
						<Text className="text-success text-2xl font-bold mt-1">{formatCurrency(available)}</Text>
						<Text className="text-gray-400 text-xs mt-2">
							Plafond = solde du mois (revenus − dépenses) moins l'épargne déjà versée.
						</Text>
					</View>

					<Text className="text-gray-600 text-sm mb-2">Montant</Text>
					<View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 h-16 mb-3">
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

					<ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
						{QUICK_PRESETS.map((preset) => (
							<TouchableOpacity
								key={preset.label}
								onPress={() => applyPreset(preset.ratio)}
								disabled={available <= 0}
								className="mr-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
								style={{ opacity: available <= 0 ? 0.4 : 1 }}
							>
								<Text className="text-primary font-semibold text-sm">{preset.label}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>

					<Text className="text-gray-600 text-sm mb-2">Note (optionnelle)</Text>
					<View className="bg-gray-50 rounded-2xl border border-gray-200 px-4 h-12 mb-6 justify-center">
						<TextInput
							className="text-gray-800 text-base"
							placeholder="ex: Vacances d'été"
							placeholderTextColor="#BBB"
							value={note}
							onChangeText={setNote}
						/>
					</View>

					{parsedAmount > available && amount.length > 0 && (
						<Text className="text-danger text-sm mb-3 text-center">
							Le montant dépasse le solde disponible ({formatCurrency(available)} max).
						</Text>
					)}

					<TouchableOpacity
						onPress={handleSubmit}
						disabled={!isValid || loading || available <= 0}
						className="h-14 rounded-2xl items-center justify-center bg-success"
						style={{ opacity: !isValid || loading || available <= 0 ? 0.5 : 1 }}
					>
						{loading ? (
							<ActivityIndicator color="#FFF" />
						) : (
							<Text className="text-white font-semibold text-lg">Confirmer le virement</Text>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
