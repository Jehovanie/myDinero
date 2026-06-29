/**
 * ProfileScreen – Profil utilisateur et paramètres.
 *
 * Fonctionnalités :
 *  - Affichage des infos du compte
 *  - Modification du nom
 *  - Changement de mot de passe
 *  - Réinitialisation par email
 *  - Déconnexion
 */
import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Modal,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../store/useStore";
import { getProfile, updateProfile, signOut, changePassword, resetPassword } from "../services/supabase";
import { formatCurrency, formatMonthLabel } from "../constants/categories";

function SettingRow({ icon, iconColor = "#6C5CE7", title, subtitle, onPress, danger = false, showChevron = true, disabled = false }) {
	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled || !onPress}
			activeOpacity={0.7}
			className="flex-row items-center px-4 py-4 border-b border-gray-50"
			style={{ opacity: disabled ? 0.5 : 1 }}
		>
			<View
				className={`w-10 h-10 rounded-xl items-center justify-center ${danger ? "bg-red-50" : "bg-primary/10"}`}
			>
				<Ionicons name={icon} size={20} color={danger ? "#E17055" : iconColor} />
			</View>
			<View className="flex-1 ml-3">
				<Text className={`font-semibold text-base ${danger ? "text-danger" : "text-gray-800"}`}>{title}</Text>
				{subtitle ? <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text> : null}
			</View>
			{showChevron && <Ionicons name="chevron-forward" size={18} color="#CCC" />}
		</TouchableOpacity>
	);
}

function SettingsModal({ visible, title, onClose, children }) {
	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1 justify-end bg-black/40"
			>
				<View className="bg-white rounded-t-[32px] px-6 pt-6 pb-10">
					<View className="flex-row items-center justify-between mb-5">
						<Text className="text-gray-900 text-xl font-bold">{title}</Text>
						<TouchableOpacity
							onPress={onClose}
							className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
						>
							<Ionicons name="close" size={20} color="#666" />
						</TouchableOpacity>
					</View>
					{children}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

export default function ProfileScreen() {
	const user = useStore((s) => s.user);
	const profile = useStore((s) => s.profile);
	const setProfile = useStore((s) => s.setProfile);
	const resetAll = useStore((s) => s.resetAll);
	const transactions = useStore((s) => s.transactions);
	const selectedMonth = useStore((s) => s.selectedMonth);

	const [loading, setLoading] = useState(true);
	const [nameModalVisible, setNameModalVisible] = useState(false);
	const [passwordModalVisible, setPasswordModalVisible] = useState(false);
	const [nameInput, setNameInput] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [savingName, setSavingName] = useState(false);
	const [savingPassword, setSavingPassword] = useState(false);
	const [sendingReset, setSendingReset] = useState(false);

	useEffect(() => {
		(async () => {
			if (!user) return;
			try {
				const p = await getProfile(user.id);
				setProfile(p);
			} catch (error) {
				console.error("Erreur chargement profil :", error.message);
			} finally {
				setLoading(false);
			}
		})();
	}, [user, setProfile]);

	const openNameModal = () => {
		setNameInput(profile?.name || "");
		setNameModalVisible(true);
	};

	const openPasswordModal = () => {
		setNewPassword("");
		setConfirmPassword("");
		setPasswordModalVisible(true);
	};

	const handleSaveName = async () => {
		const trimmed = nameInput.trim();
		if (!trimmed) {
			Alert.alert("Erreur", "Le nom ne peut pas être vide.");
			return;
		}

		setSavingName(true);
		try {
			const updated = await updateProfile(user.id, { name: trimmed });
			setProfile({ ...profile, ...updated, name: updated.name });
			setNameModalVisible(false);
			Alert.alert("Succès", "Votre nom a été mis à jour.");
		} catch (error) {
			Alert.alert("Erreur", error.message || "Impossible de mettre à jour le nom.");
		} finally {
			setSavingName(false);
		}
	};

	const handleChangePassword = async () => {
		if (newPassword.length < 6) {
			Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
			return;
		}
		if (newPassword !== confirmPassword) {
			Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
			return;
		}

		setSavingPassword(true);
		try {
			await changePassword(newPassword);
			setPasswordModalVisible(false);
			Alert.alert("Succès", "Votre mot de passe a été modifié.");
		} catch (error) {
			Alert.alert("Erreur", error.message || "Impossible de modifier le mot de passe.");
		} finally {
			setSavingPassword(false);
		}
	};

	const handleSendResetEmail = () => {
		const email = user?.email;
		if (!email) {
			Alert.alert("Erreur", "Aucune adresse email associée à ce compte.");
			return;
		}

		Alert.alert(
			"Réinitialiser par email",
			`Un lien de réinitialisation sera envoyé à ${email}.`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Envoyer",
					onPress: async () => {
						setSendingReset(true);
						try {
							await resetPassword(email);
							Alert.alert(
								"Email envoyé",
								"Consultez votre boîte mail pour définir un nouveau mot de passe.",
							);
						} catch (error) {
							Alert.alert("Erreur", error.message || "Impossible d'envoyer l'email.");
						} finally {
							setSendingReset(false);
						}
					},
				},
			],
		);
	};

	const handleLogout = () => {
		Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Déconnexion",
				style: "destructive",
				onPress: async () => {
					try {
						await signOut();
					} catch (error) {
						console.error("Erreur déconnexion :", error.message);
					}
					resetAll();
				},
			},
		]);
	};

	const totalTransactions = transactions.length;
	const totalExpenses = transactions
		.filter((t) => t.type === "expense")
		.reduce((sum, t) => sum + Number(t.amount), 0);

	const memberSince = profile?.created_at
		? new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
		: null;

	if (loading) {
		return (
			<View className="flex-1 bg-surface-light items-center justify-center">
				<ActivityIndicator size="large" color="#6C5CE7" />
			</View>
		);
	}

	return (
		<ScrollView className="flex-1 bg-surface-light" contentContainerStyle={{ paddingBottom: 40 }}>
			{/* En-tête Profil */}
			<View className="bg-primary pt-24 pb-8 px-6 rounded-b-[40px] items-center">
				<View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-3">
					<Text className="text-white text-2xl font-bold">
						{(profile?.name || user?.email || "?")[0].toUpperCase()}
					</Text>
				</View>
				<Text className="text-white text-xl font-bold">{profile?.name || "Utilisateur"}</Text>
				<Text className="text-primary-light text-sm">{user?.email}</Text>
				{memberSince && (
					<Text className="text-white/60 text-xs mt-2">Membre depuis {memberSince}</Text>
				)}
			</View>

			{/* Statistiques */}
			<View className="flex-row mx-4 -mt-6">
				<View className="flex-1 bg-white mx-1 rounded-2xl p-4 items-center shadow-sm border border-gray-100">
					<Ionicons name="receipt-outline" size={22} color="#6C5CE7" />
					<Text className="text-gray-800 text-lg font-bold mt-1">{totalTransactions}</Text>
					<Text className="text-gray-400 text-xs">transactions</Text>
				</View>
				<View className="flex-1 bg-white mx-1 rounded-2xl p-4 items-center shadow-sm border border-gray-100">
					<Ionicons name="trending-down-outline" size={22} color="#E17055" />
					<Text className="text-gray-800 text-lg font-bold mt-1">{formatCurrency(totalExpenses)}</Text>
					<Text className="text-gray-400 text-xs">dépenses — {formatMonthLabel(selectedMonth)}</Text>
				</View>
			</View>

			{/* Paramètres du compte */}
			<Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mx-4 mt-6 mb-2">
				Paramètres du compte
			</Text>
			<View className="bg-white mx-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<SettingRow
					icon="person-outline"
					title="Modifier le nom"
					subtitle={profile?.name || "Non renseigné"}
					onPress={openNameModal}
				/>
				<SettingRow
					icon="mail-outline"
					title="Adresse email"
					subtitle={user?.email}
					showChevron={false}
					onPress={() => Alert.alert("Email", "L'adresse email ne peut pas être modifiée depuis l'application.")}
				/>
			</View>

			{/* Sécurité */}
			<Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mx-4 mt-6 mb-2">
				Sécurité
			</Text>
			<View className="bg-white mx-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<SettingRow
					icon="lock-closed-outline"
					title="Changer le mot de passe"
					subtitle="Mettre à jour votre mot de passe"
					onPress={openPasswordModal}
				/>
				<SettingRow
					icon="key-outline"
					title="Réinitialiser par email"
					subtitle={sendingReset ? "Envoi en cours…" : "Recevoir un lien de réinitialisation"}
					onPress={handleSendResetEmail}
					disabled={sendingReset}
				/>
			</View>

			{/* Application */}
			<Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mx-4 mt-6 mb-2">
				Application
			</Text>
			<View className="bg-white mx-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<SettingRow
					icon="information-circle-outline"
					iconColor="#00B894"
					title="myDinero"
					subtitle="Version 1.0.0"
					showChevron={false}
					onPress={() => {}}
				/>
			</View>

			{/* Déconnexion */}
			<TouchableOpacity
				onPress={handleLogout}
				className="flex-row items-center justify-center mx-4 mt-8 bg-white border border-red-200 h-12 rounded-xl"
			>
				<Ionicons name="log-out-outline" size={18} color="#E17055" />
				<Text className="text-danger font-semibold ml-2">Se déconnecter</Text>
			</TouchableOpacity>

			{/* Modal — Modifier le nom */}
			<SettingsModal
				visible={nameModalVisible}
				title="Modifier le nom"
				onClose={() => setNameModalVisible(false)}
			>
				<Text className="text-gray-600 text-sm mb-2">Nom affiché sur votre profil</Text>
				<View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 h-14 mb-5">
					<Ionicons name="person-outline" size={18} color="#999" />
					<TextInput
						className="flex-1 text-gray-800 text-base ml-3"
						placeholder="Votre nom"
						placeholderTextColor="#CCC"
						value={nameInput}
						onChangeText={setNameInput}
						autoFocus
					/>
				</View>
				<TouchableOpacity
					onPress={handleSaveName}
					disabled={savingName}
					className="h-14 rounded-2xl items-center justify-center bg-primary"
					style={{ opacity: savingName ? 0.6 : 1 }}
				>
					{savingName ? (
						<ActivityIndicator color="#FFF" />
					) : (
						<Text className="text-white font-semibold text-lg">Enregistrer</Text>
					)}
				</TouchableOpacity>
			</SettingsModal>

			{/* Modal — Changer le mot de passe */}
			<SettingsModal
				visible={passwordModalVisible}
				title="Changer le mot de passe"
				onClose={() => setPasswordModalVisible(false)}
			>
				<Text className="text-gray-600 text-sm mb-2">Nouveau mot de passe</Text>
				<View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 h-14 mb-3">
					<Ionicons name="lock-closed-outline" size={18} color="#999" />
					<TextInput
						className="flex-1 text-gray-800 text-base ml-3"
						placeholder="Minimum 6 caractères"
						placeholderTextColor="#CCC"
						secureTextEntry
						value={newPassword}
						onChangeText={setNewPassword}
						autoFocus
					/>
				</View>
				<Text className="text-gray-600 text-sm mb-2">Confirmer le mot de passe</Text>
				<View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 h-14 mb-5">
					<Ionicons name="lock-closed-outline" size={18} color="#999" />
					<TextInput
						className="flex-1 text-gray-800 text-base ml-3"
						placeholder="Retapez le mot de passe"
						placeholderTextColor="#CCC"
						secureTextEntry
						value={confirmPassword}
						onChangeText={setConfirmPassword}
					/>
				</View>
				<TouchableOpacity
					onPress={handleChangePassword}
					disabled={savingPassword}
					className="h-14 rounded-2xl items-center justify-center bg-primary"
					style={{ opacity: savingPassword ? 0.6 : 1 }}
				>
					{savingPassword ? (
						<ActivityIndicator color="#FFF" />
					) : (
						<Text className="text-white font-semibold text-lg">Mettre à jour</Text>
					)}
				</TouchableOpacity>
			</SettingsModal>
		</ScrollView>
	);
}
