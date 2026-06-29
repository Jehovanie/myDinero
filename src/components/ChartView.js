/**
 * ChartView – Répartition des dépenses par catégorie.
 *
 * Deux vues au choix :
 *  - Disque : proportions en un coup d'œil
 *  - Barres : comparaison des montants
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCurrency, assignDistinctChartColors } from "../constants/categories";

const STORAGE_KEY = "@mydinero/expense_chart_type";

const OTHERS_COLOR = "#B2BEC3";
const DONUT_SIZE = 180;
const DONUT_THICKNESS = 26;

function polar(cx, cy, r, deg) {
	const rad = ((deg - 90) * Math.PI) / 180;
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlice(cx, cy, outerR, innerR, start, end) {
	const sweep = Math.min(end - start, 359.99);
	if (sweep <= 0) return "";

	const p1 = polar(cx, cy, outerR, start);
	const p2 = polar(cx, cy, outerR, start + sweep);
	const p3 = polar(cx, cy, innerR, start + sweep);
	const p4 = polar(cx, cy, innerR, start);
	const large = sweep > 180 ? 1 : 0;

	return [
		`M ${p1.x} ${p1.y}`,
		`A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y}`,
		`L ${p3.x} ${p3.y}`,
		`A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y}`,
		"Z",
	].join(" ");
}

function buildChartData(data, maxItems = 6) {
	const sorted = [...(data || [])].sort((a, b) => Number(b.total) - Number(a.total));
	let result = sorted;

	if (sorted.length > maxItems) {
		const top = sorted.slice(0, maxItems - 1);
		const rest = sorted.slice(maxItems - 1).reduce((s, d) => s + Number(d.total), 0);
		result = rest > 0 ? [...top, { name: "Autres", total: rest, color: OTHERS_COLOR }] : top;
	}

	return assignDistinctChartColors(result, OTHERS_COLOR);
}

function ChartToggle({ value, onChange }) {
	const options = [
		{ id: "donut", label: "Disque", icon: "pie-chart-outline" },
		{ id: "bars", label: "Barres", icon: "bar-chart-outline" },
	];

	return (
		<View className="flex-row bg-gray-100 rounded-xl p-1">
			{options.map((opt) => {
				const active = value === opt.id;
				return (
					<Pressable
						key={opt.id}
						onPress={() => onChange(opt.id)}
						style={{
							flex: 1,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							paddingVertical: 10,
							borderRadius: 10,
							backgroundColor: active ? "#FFFFFF" : "transparent",
							borderWidth: active ? 1 : 0,
							borderColor: active ? "#E8E4FF" : "transparent",
						}}
					>
						<Ionicons name={opt.icon} size={16} color={active ? "#6C5CE7" : "#999"} />
						<Text
							style={{
								marginLeft: 6,
								fontSize: 12,
								fontWeight: "600",
								color: active ? "#6C5CE7" : "#999",
							}}
						>
							{opt.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

function DonutView({ items, total }) {
	const cx = DONUT_SIZE / 2;
	const cy = DONUT_SIZE / 2;
	const outerR = (DONUT_SIZE - 6) / 2;
	const innerR = outerR - DONUT_THICKNESS;

	const slices = useMemo(() => {
		let angle = 0;
		return items.map((item) => {
			const sweep = total > 0 ? (Number(item.total) / total) * 360 : 0;
			const slice = { ...item, start: angle, end: angle + sweep };
			angle += sweep;
			return slice;
		});
	}, [items, total]);

	return (
		<View className="items-center py-3">
			<View style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
				<Svg width={DONUT_SIZE} height={DONUT_SIZE}>
					<G>
						{slices.map((s, i) => {
							const d = donutSlice(cx, cy, outerR, innerR, s.start, s.end);
							if (!d) return null;
							return <Path key={`${s.name}-${i}`} d={d} fill={s.color} />;
						})}
					</G>
				</Svg>
				<View className="absolute inset-0 items-center justify-center" pointerEvents="none">
					<Text className="text-gray-400 text-[10px] uppercase">Total</Text>
					<Text className="text-gray-900 font-bold text-sm mt-0.5">{formatCurrency(total)}</Text>
				</View>
			</View>
		</View>
	);
}

function BarsView({ items, total }) {
	return (
		<View className="pt-1">
			{items.map((item, i) => {
				const amount = Number(item.total) || 0;
				const pct = total > 0 ? (amount / total) * 100 : 0;
				return (
					<View key={`${item.name}-${i}`} className="mb-4">
						<View className="flex-row items-center justify-between mb-1.5">
							<View className="flex-row items-center flex-1 mr-2">
								<View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: item.color }} />
								<Text className="text-sm text-gray-700 font-medium flex-1" numberOfLines={1}>
									{item.name}
								</Text>
							</View>
							<Text className="text-xs text-gray-400">{Math.round(pct)}%</Text>
						</View>
						<View className="h-3 bg-gray-100 rounded-full overflow-hidden">
							<View
								style={{
									height: "100%",
									width: `${pct}%`,
									backgroundColor: item.color,
									borderRadius: 999,
									minWidth: pct > 0 ? 4 : 0,
								}}
							/>
						</View>
						<Text className="text-xs text-gray-500 mt-1 text-right">{formatCurrency(amount)}</Text>
					</View>
				);
			})}
		</View>
	);
}

function Legend({ items, total }) {
	return (
		<View className="mt-2">
			{items.map((item, i) => {
				const pct = total > 0 ? Math.round((Number(item.total) / total) * 100) : 0;
				return (
					<View key={`${item.name}-${i}`} className="flex-row items-center mb-2">
						<View className="w-3 h-3 rounded-full mr-2.5" style={{ backgroundColor: item.color }} />
						<Text className="flex-1 text-sm text-gray-700" numberOfLines={1}>
							{item.name}
						</Text>
						<Text className="text-xs text-gray-400 w-8 text-right">{pct}%</Text>
						<Text className="text-xs text-gray-600 font-semibold w-24 text-right ml-1">
							{formatCurrency(item.total)}
						</Text>
					</View>
				);
			})}
		</View>
	);
}

export default function ChartView({ data }) {
	const [chartType, setChartType] = useState("donut");

	useEffect(() => {
		AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
			if (saved === "donut" || saved === "bars") setChartType(saved);
		});
	}, []);

	const items = useMemo(() => buildChartData(data), [data]);
	const total = useMemo(() => items.reduce((s, d) => s + (Number(d.total) || 0), 0), [items]);

	const pickType = (type) => {
		setChartType(type);
		AsyncStorage.setItem(STORAGE_KEY, type).catch(() => {});
	};

	if (!items.length) {
		return (
			<View className="items-center py-8">
				<Ionicons name="pie-chart-outline" size={36} color="#DDD" />
				<Text className="text-gray-400 text-sm mt-2">Aucune dépense à afficher</Text>
			</View>
		);
	}

	return (
		<View>
			<Text className="text-gray-800 font-semibold text-base">Dépenses par catégorie</Text>
			<Text className="text-gray-400 text-xs mt-0.5 mb-3">
				{items.length} catégorie{items.length > 1 ? "s" : ""} · {formatCurrency(total)}
			</Text>

			<ChartToggle value={chartType} onChange={pickType} />

			<View className="mt-4">
				{chartType === "donut" ? (
					<>
						<DonutView items={items} total={total} />
						<Legend items={items} total={total} />
					</>
				) : (
					<BarsView items={items} total={total} />
				)}
			</View>
		</View>
	);
}
