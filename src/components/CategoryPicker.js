/**
 * CategoryPicker – Grille de sélection de catégorie.
 *
 * Props :
 *  - categories  : tableau d'objets { id, name, icon, color }
 *  - selectedId  : id de la catégorie sélectionnée
 *  - onSelect    : callback(id)
 */
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CategoryPicker({ categories, selectedId, onSelect }) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={{ paddingHorizontal: 12 }}
			className="py-2"
		>
			{categories.map((cat, index) => {
				const categoryValue = cat.id ?? `${cat.name}-${index}`;
				const isSelected = categoryValue === selectedId;
				const safeKey = `${cat.name}-${index}`;
				return (
					<TouchableOpacity
						key={safeKey}
						onPress={() => onSelect(categoryValue)}
						className={`items-center mx-1.5 px-3 py-3 rounded-2xl border-2 ${
							isSelected ? "border-primary bg-primary/10" : "border-gray-200 bg-white"
						}`}
						style={{ minWidth: 80 }}
					>
						<View
							className="w-10 h-10 rounded-full items-center justify-center mb-1"
							style={{
								backgroundColor: isSelected ? cat.color : cat.color + "20",
							}}
						>
							<Ionicons name={cat.icon} size={20} color={isSelected ? "#FFF" : cat.color} />
						</View>
						<Text
							className={`text-xs text-center ${
								isSelected ? "text-primary font-semibold" : "text-gray-500"
							}`}
							numberOfLines={2}
						>
							{cat.name}
						</Text>
					</TouchableOpacity>
				);
			})}
		</ScrollView>
	);
}
