/**
 * Service de notifications locales.
 *
 * Planifie un rappel la veille de chaque dépense fixe (à 09h00).
 * Utilise expo-notifications — fonctionne hors-ligne, sans serveur push.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ── Configuration ────────────────────────────────────────────────────────────

/** Demande les permissions et configure le handler */
export const setupNotifications = async () => {
	if (Platform.OS === "web") return false;

	try {
		Notifications.setNotificationHandler({
			handleNotification: async () => ({
				shouldShowAlert: true,
				shouldPlaySound: true,
				shouldSetBadge: false,
			}),
		});

		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("rappels", {
				name: "Rappels de paiement",
				importance: Notifications.AndroidImportance.HIGH,
				sound: "default",
			});
		}

		const { status: existing } = await Notifications.getPermissionsAsync();
		let finalStatus = existing;

		if (existing !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}

		return finalStatus === "granted";
	} catch (error) {
		console.warn("[notifications] Erreur setup :", error.message);
		return false;
	}
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Formate un montant pour le texte de notification */
const formatAmount = (amount) => {
	return Number(amount || 0).toLocaleString("fr-FR");
};

/**
 * Calcule la prochaine date de rappel (veille du due_day, à 09h00).
 * Si cette date est déjà passée ce mois-ci, on prend le mois suivant.
 */
export const getNextReminderDate = (dueDay) => {
	const now = new Date();
	const reminderDay = dueDay <= 1 ? 28 : dueDay - 1;

	// Essayer ce mois-ci
	const thisMonth = new Date(now.getFullYear(), now.getMonth(), reminderDay, 9, 0, 0);

	if (thisMonth > now) return thisMonth;

	// Sinon mois suivant
	return new Date(now.getFullYear(), now.getMonth() + 1, reminderDay, 9, 0, 0);
};

// ── Planification ────────────────────────────────────────────────────────────

/**
 * Planifie une notification locale pour une dépense fixe.
 * Le rappel est envoyé la veille du jour d'échéance à 09h00.
 */
export const scheduleReminder = async (expense) => {
	if (Platform.OS === "web") return;

	try {
		const triggerDate = getNextReminderDate(expense.due_day);
		const secondsUntil = Math.max(1, Math.floor((triggerDate - new Date()) / 1000));

		await Notifications.scheduleNotificationAsync({
			identifier: String(expense.id),
			content: {
				title: "💰 Paiement demain",
				body: `N'oubliez pas : ${expense.name} (${formatAmount(expense.amount)} Ar) est dû demain.`,
				sound: "default",
				data: { scheduledExpenseId: expense.id },
				...(Platform.OS === "android" ? { channelId: "rappels" } : {}),
			},
			trigger: {
				type: "timeInterval",
				seconds: secondsUntil,
				repeats: false,
			},
		});
	} catch (error) {
		console.warn("[notifications] Erreur planification :", error.message);
	}
};

/** Annule la notification d'une dépense fixe */
export const cancelReminder = async (expenseId) => {
	if (Platform.OS === "web") return;

	try {
		await Notifications.cancelScheduledNotificationAsync(String(expenseId));
	} catch (error) {
		console.warn("[notifications] Erreur annulation :", error.message);
	}
};

/**
 * Replanifie toutes les notifications.
 * Appelée au lancement de l'app et quand les dépenses fixes changent.
 */
export const rescheduleAllReminders = async (expenses) => {
	if (Platform.OS === "web") return;

	try {
		await Notifications.cancelAllScheduledNotificationsAsync();

		const active = (expenses || []).filter((e) => e.is_active !== false);
		for (const expense of active) {
			await scheduleReminder(expense);
		}
	} catch (error) {
		console.warn("[notifications] Erreur replanification :", error.message);
	}
};
