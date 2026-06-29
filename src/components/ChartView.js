/**
 * ChartView – Graphique en barres horizontales simple.
 *
 * Affiche la répartition par catégorie sous forme de barres colorées.
 * Entièrement construit avec des View React Native, sans dépendance externe.
 *
 * Props :
 *  - data        : [{ name, total, color }] trié par total décroissant
 *  - maxWidth    : largeur max des barres (défaut 100%)
 */
import React from "react";
import { View, Text } from "react-native";
import { formatCurrency } from "../constants/categories";

export default function ChartView({ data, maxWidth = 280 }) {
	if (!data || data.length === 0) {
		return (
			<View className="items-center py-8">
				<Text className="text-gray-400 text-sm">Aucune donnée à afficher</Text>
			</View>
		);
	}

	const maxTotal = Math.max(...data.map((d) => Number(d.total) || 0), 1);

	return (
		<View className="px-1">
			{data.map((item, index) => {
				const barWidth = (item.total / maxTotal) * maxWidth;

				return (
					<View key={index} className="flex-row items-center mb-3">
						{/* Nom de la catégorie */}
						<View className="w-24 mr-2">
							<Text className="text-xs text-gray-600 font-medium" numberOfLines={1}>
								{item.name}
							</Text>
						</View>

						{/* Barre */}
						<View className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
							<View
								className="h-full rounded-full"
								style={{
									width: barWidth,
									backgroundColor: item.color,
								}}
							/>
						</View>

						{/* Montant */}
						<Text className="ml-2 text-xs text-gray-500 w-16 text-right">{formatCurrency(item.total)}</Text>
					</View>
				);
			})}
		</View>
	);
}
